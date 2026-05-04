"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route } from "next";

import { useCommerce } from "@/components/commerce/commerce-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/ominity/commerce";
import { useAuth } from "@/components/auth";

interface CheckoutAddressDraft {
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string;
}

type CheckoutStep = 1 | 2 | 3;
type CheckoutMode = "guest" | "authenticated";

export interface CommerceCheckoutPageProps {
  readonly paths: {
    readonly checkout: string;
    readonly cart: string;
    readonly payment: string;
    readonly login: string;
    readonly account: string;
  };
  readonly features: {
    readonly payment: boolean;
    readonly auth: boolean;
    readonly guestCheckout: boolean;
  };
}

export function CommerceCheckoutPage(props: CommerceCheckoutPageProps) {
  const router = useRouter();
  const commerce = useCommerce();
  const auth = useAuth();

  const [step, setStep] = useState<CheckoutStep>(1);
  const [mode, setMode] = useState<CheckoutMode>("guest");
  const [email, setEmail] = useState("");
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState<string | "new">("new");
  const [address, setAddress] = useState<CheckoutAddressDraft>({
    firstName: "",
    lastName: "",
    street: "",
    city: "",
    postalCode: "",
    country: "",
    phone: "",
  });
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const hasSession = auth.session !== null;
  const checkoutBlockedByAuth = props.features.auth && !props.features.guestCheckout && !hasSession;

  const cartCurrency = useMemo(
    () => commerce.cart[0]?.currency ?? "EUR",
    [commerce.cart],
  );

  const resolvedEmail = useMemo(() => {
    if (mode === "authenticated" && hasSession) {
      return auth.session?.email ?? email.trim();
    }
    return email.trim();
  }, [auth.session?.email, email, hasSession, mode]);

  useEffect(() => {
    if (hasSession && props.features.auth) {
      setMode("authenticated");
    }
  }, [hasSession, props.features.auth]);

  if (!commerce.ready || !auth.ready) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">Loading checkout…</CardContent>
      </Card>
    );
  }

  if (checkoutBlockedByAuth) {
    const loginPath = `${props.paths.login}?returnTo=${encodeURIComponent(props.paths.checkout ?? "/checkout")}`;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Checkout requires sign in</CardTitle>
          <CardDescription>Guest checkout is disabled in this project configuration.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href={loginPath as Route} className="text-sm font-medium text-primary hover:underline">
            Login to continue
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (commerce.cart.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Checkout</CardTitle>
          <CardDescription>Your cart is empty.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href={props.paths.cart as Route} className="text-sm font-medium text-primary hover:underline">
            Open cart
          </Link>
        </CardContent>
      </Card>
    );
  }

  const normalizedMode: CheckoutMode = hasSession && mode === "authenticated"
    ? "authenticated"
    : "guest";

  const applySavedAddress = (addressId: string) => {
    const selected = auth.savedAddresses.find((entry) => entry.id === addressId);
    if (!selected) {
      return;
    }

    setAddress({
      firstName: selected.firstName,
      lastName: selected.lastName,
      street: selected.street,
      city: selected.city,
      postalCode: selected.postalCode,
      country: selected.country,
      phone: selected.phone ?? "",
    });
  };

  const nextStep = () => {
    if (step === 1) {
      if (resolvedEmail.length < 3 || !resolvedEmail.includes("@")) {
        setMessage("A valid email address is required.");
        return;
      }

      setMessage(null);
      setStep(2);
      return;
    }

    if (step === 2) {
      if (
        address.firstName.trim().length < 2
        || address.lastName.trim().length < 2
        || address.street.trim().length < 4
        || address.city.trim().length < 2
        || address.postalCode.trim().length < 2
        || address.country.trim().length < 2
      ) {
        setMessage("Please complete all required address fields.");
        return;
      }

      setMessage(null);
      setStep(3);
    }
  };

  const onSubmit = async () => {
    const finalEmail = resolvedEmail;
    if (finalEmail.length < 3 || !finalEmail.includes("@")) {
      setMessage("A valid email address is required.");
      return;
    }

    setSubmitting(true);
    try {
      const order = await commerce.createOrder({
        email: finalEmail,
        fullName: `${address.firstName} ${address.lastName}`.trim(),
        address: `${address.street}, ${address.postalCode} ${address.city}, ${address.country}`,
        shippingAddress: {
          firstName: address.firstName.trim(),
          lastName: address.lastName.trim(),
          street: address.street.trim(),
          city: address.city.trim(),
          postalCode: address.postalCode.trim(),
          country: address.country.trim(),
          ...(address.phone.trim().length > 0 ? { phone: address.phone.trim() } : {}),
        },
        billingAddress: {
          firstName: address.firstName.trim(),
          lastName: address.lastName.trim(),
          street: address.street.trim(),
          city: address.city.trim(),
          postalCode: address.postalCode.trim(),
          country: address.country.trim(),
          ...(address.phone.trim().length > 0 ? { phone: address.phone.trim() } : {}),
        },
        ...(notes.trim().length > 0 ? { notes: notes.trim() } : {}),
      });

      if (!order) {
        setMessage("Could not create order from current cart.");
        return;
      }

      if (normalizedMode === "authenticated" && hasSession) {
        auth.saveAddress({
          label: `${address.street.trim()}, ${address.city.trim()}`,
          firstName: address.firstName.trim(),
          lastName: address.lastName.trim(),
          street: address.street.trim(),
          city: address.city.trim(),
          postalCode: address.postalCode.trim(),
          country: address.country.trim(),
          ...(address.phone.trim().length > 0 ? { phone: address.phone.trim() } : {}),
        });
      }

      if (props.features.payment) {
        router.push(`${props.paths.payment}?order=${encodeURIComponent(order.id)}` as Route);
        return;
      }

      setMessage(`Order placed: ${order.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create order.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Checkout</CardTitle>
          <CardDescription>
            Step {step} of 3 · {normalizedMode === "authenticated" ? "Authenticated checkout" : "Guest checkout"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {props.features.auth && (
            <div className="flex flex-wrap gap-2">
              {hasSession && (
                <Button
                  size="sm"
                  variant={normalizedMode === "authenticated" ? "default" : "outline"}
                  onClick={() => setMode("authenticated")}
                >
                  Authenticated
                </Button>
              )}
              {(props.features.guestCheckout || !hasSession) && (
                <Button
                  size="sm"
                  variant={normalizedMode === "guest" ? "default" : "outline"}
                  onClick={() => setMode("guest")}
                >
                  Guest
                </Button>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              {normalizedMode === "authenticated" && hasSession ? (
                <p className="text-sm text-muted-foreground">
                  Logged in as {auth.session?.email}
                </p>
              ) : (
                <Input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email"
                  type="email"
                />
              )}
              <Button onClick={nextStep}>Continue to shipping</Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              {normalizedMode === "authenticated" && auth.savedAddresses.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Saved addresses</p>
                  <div className="flex flex-wrap gap-2">
                    {auth.savedAddresses.map((entry) => (
                      <Button
                        key={entry.id}
                        size="sm"
                        variant={selectedSavedAddressId === entry.id ? "default" : "outline"}
                        onClick={() => {
                          setSelectedSavedAddressId(entry.id);
                          applySavedAddress(entry.id);
                        }}
                      >
                        {entry.label}
                      </Button>
                    ))}
                    <Button
                      size="sm"
                      variant={selectedSavedAddressId === "new" ? "default" : "outline"}
                      onClick={() => setSelectedSavedAddressId("new")}
                    >
                      New address
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  value={address.firstName}
                  onChange={(event) => setAddress((previous) => ({ ...previous, firstName: event.target.value }))}
                  placeholder="First name"
                />
                <Input
                  value={address.lastName}
                  onChange={(event) => setAddress((previous) => ({ ...previous, lastName: event.target.value }))}
                  placeholder="Last name"
                />
              </div>
              <Input
                value={address.street}
                onChange={(event) => setAddress((previous) => ({ ...previous, street: event.target.value }))}
                placeholder="Street and house number"
              />
              <div className="grid gap-3 md:grid-cols-3">
                <Input
                  value={address.postalCode}
                  onChange={(event) => setAddress((previous) => ({ ...previous, postalCode: event.target.value }))}
                  placeholder="Postal code"
                />
                <Input
                  value={address.city}
                  onChange={(event) => setAddress((previous) => ({ ...previous, city: event.target.value }))}
                  placeholder="City"
                />
                <Input
                  value={address.country}
                  onChange={(event) => setAddress((previous) => ({ ...previous, country: event.target.value }))}
                  placeholder="Country code"
                />
              </div>
              <Input
                value={address.phone}
                onChange={(event) => setAddress((previous) => ({ ...previous, phone: event.target.value }))}
                placeholder="Phone (optional)"
              />
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button onClick={nextStep}>Continue to review</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="rounded-md border p-3 text-sm">
                <p className="font-medium">{address.firstName} {address.lastName}</p>
                <p>{address.street}</p>
                <p>{address.postalCode} {address.city}</p>
                <p>{address.country}</p>
                {address.phone.trim().length > 0 && <p>{address.phone.trim()}</p>}
                <p className="pt-2 text-muted-foreground">{resolvedEmail}</p>
              </div>
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Order notes (optional)"
              />
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button disabled={submitting} onClick={() => { void onSubmit(); }}>
                  {submitting
                    ? "Submitting…"
                    : props.features.payment
                      ? "Continue to payment"
                      : "Place order"}
                </Button>
              </div>
            </div>
          )}

          {message && <p className="text-sm text-muted-foreground">{message}</p>}

          <Link href={props.paths.cart as Route} className="text-sm font-medium text-primary hover:underline">
            Back to cart
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Order summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {commerce.cart.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <span>{item.title ?? item.sku ?? item.id} × {item.quantity}</span>
              <span>{formatMoney(item.totalPrice, item.currency)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold">
            <span>Total</span>
            <span>{formatMoney(commerce.cartSubtotal, cartCurrency)}</span>
          </div>
          {props.features.auth && hasSession && (
            <Link href={props.paths.account as Route} className="text-xs text-muted-foreground hover:underline">
              Logged in as {auth.session?.email}
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
