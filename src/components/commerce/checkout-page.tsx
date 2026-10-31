"use client";

import type { Address, Cart } from "@ominity/api-typescript/models";
import { commerceMoneyValue, emitCommerceEvent } from "@ominity/next/commerce";
import { useAddresses, useAuth, useCheckout } from "@ominity/next/react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatAmount } from "@/lib/format";

import { CartSummary } from "./cart-summary";

type AddressDraft = Omit<Address, "resource" | "id" | "customerId" | "updatedAt" | "createdAt" | "links">;
type Step = "details" | "address" | "shipping" | "review";

const REQUIRED: ReadonlyArray<keyof AddressDraft> = ["firstName", "lastName", "street", "number", "postalCode", "city", "country"];

function draft(address: Partial<Address> | undefined, country: string): AddressDraft {
  return {
    firstName: address?.firstName ?? "",
    lastName: address?.lastName ?? "",
    street: address?.street ?? "",
    number: address?.number ?? "",
    additional: address?.additional ?? "",
    postalCode: address?.postalCode ?? "",
    city: address?.city ?? "",
    region: address?.region ?? "",
    country: address?.country || country,
  };
}

function complete(address: AddressDraft): boolean {
  return REQUIRED.every((field) => String(address[field] ?? "").trim().length > 0);
}

function AddressFields({ id, value, countries, onChange }: {
  readonly id: string;
  readonly value: AddressDraft;
  readonly countries: ReadonlyArray<string>;
  readonly onChange: (value: AddressDraft) => void;
}) {
  const field = (name: keyof AddressDraft, label: string) => (
    <div className="space-y-1">
      <Label htmlFor={`${id}-${name}`}>{label}</Label>
      <Input id={`${id}-${name}`} value={String(value[name] ?? "")} onChange={(event) => onChange({ ...value, [name]: event.target.value })} />
    </div>
  );
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {field("firstName", "First name")}
      {field("lastName", "Last name")}
      {field("street", "Street")}
      {field("number", "Number")}
      {field("additional", "Additional")}
      {field("postalCode", "Postal code")}
      {field("city", "City")}
      {field("region", "Region")}
      <div className="space-y-1">
        <Label htmlFor={`${id}-country`}>Country</Label>
        <select
          id={`${id}-country`}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          value={value.country}
          onChange={(event) => onChange({ ...value, country: event.target.value })}
        >
          {countries.map((country) => <option key={country} value={country}>{country}</option>)}
        </select>
      </div>
    </div>
  );
}

export interface CommerceCheckoutPageProps {
  readonly countries: ReadonlyArray<string>;
  readonly defaultCountry?: string;
  readonly paths: { readonly checkout: string; readonly cart: string; readonly payment: string; readonly login: string; readonly account: string };
  readonly guestCheckout: boolean;
}

export function CommerceCheckoutPage(props: CommerceCheckoutPageProps) {
  const auth = useAuth();
  const checkout = useCheckout({ loadMethods: false });
  const { paths, guestCheckout } = props;

  if (!checkout.ready || !auth.ready) {
    return <Card><CardContent className="pt-6 text-sm text-muted-foreground">Loading checkout…</CardContent></Card>;
  }

  if (!guestCheckout && !auth.user) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-2xl">Sign in to check out</CardTitle></CardHeader>
        <CardContent>
          <Link href={`${paths.login}?returnTo=${encodeURIComponent(paths.checkout)}` as Route} className="text-sm font-medium text-primary hover:underline">Login to continue</Link>
        </CardContent>
      </Card>
    );
  }

  if (!checkout.cart || checkout.items.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-2xl">Checkout</CardTitle><CardDescription>Your cart is empty.</CardDescription></CardHeader>
        <CardContent><Link href={paths.cart as Route} className="text-sm font-medium text-primary hover:underline">Back to cart</Link></CardContent>
      </Card>
    );
  }

  return <CheckoutSteps {...props} cart={checkout.cart} />;
}

/** The checkout steps; the form starts from what the cart already holds, so a shopper continues where they left off. */
function CheckoutSteps({ countries, defaultCountry, paths, cart }: CommerceCheckoutPageProps & { readonly cart: Cart }) {
  const router = useRouter();
  const auth = useAuth();
  const checkout = useCheckout();
  const book = useAddresses();
  const country = defaultCountry ?? countries[0] ?? "BE";
  const [step, setStep] = useState<Step>("details");
  const [email, setEmail] = useState(cart.email || auth.user?.email || "");
  const [companyName, setCompanyName] = useState(cart.companyName ?? "");
  const [companyVat, setCompanyVat] = useState(cart.companyVat ?? "");
  const [billing, setBilling] = useState<AddressDraft>(() => draft(cart.billingAddress?.street ? cart.billingAddress : undefined, country));
  const [separateShipping, setSeparateShipping] = useState(false);
  const [shipping, setShipping] = useState<AddressDraft>(() => draft(undefined, country));
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !checkout.cart || checkout.items.length === 0) return;
    started.current = true;
    emitCommerceEvent("checkout_started", {
      mode: auth.user ? "authenticated" : "guest",
      cartCount: checkout.count,
      cartSubtotal: commerceMoneyValue(checkout.cart.subtotalAmount),
      currency: checkout.cart.currency,
      ...(checkout.promotionCodes.length > 0 ? { promotionCodes: checkout.promotionCodes } : {}),
    });
  }, [auth.user, checkout.cart, checkout.count, checkout.items.length, checkout.promotionCodes]);

  /** Saves this step's fields on the cart (Ominity validates them) and moves on. */
  const next = async (save: () => Promise<void>, to: Step) => {
    setMessage(null);
    try {
      await save();
      setStep(to);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Please check the details.");
    }
  };

  const submitDetails = () => {
    if (!email.includes("@")) return setMessage("Enter a valid email address.");
    void next(() => checkout.update({ email: email.trim(), companyName: companyName.trim(), companyVat: companyVat.trim() }), "address");
  };
  const submitAddress = () => {
    if (!complete(billing) || (separateShipping && !complete(shipping))) return setMessage("Complete the required address fields.");
    void next(
      () => checkout.update({ billingAddress: billing, shippingAddress: separateShipping ? shipping : billing }),
      checkout.shippingRequired ? "shipping" : "review",
    );
  };
  const placeOrder = async () => {
    setMessage(null);
    try {
      const order = await checkout.placeOrder(notes.trim() ? { notes: notes.trim() } : {});
      router.push(`${paths.payment}?order=${order.id}` as Route);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not place the order.");
    }
  };

  const busy = checkout.pending || checkout.checkoutPending;

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Checkout</CardTitle>
          <CardDescription>{auth.user ? `Signed in as ${auth.user.email}` : "Guest checkout"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === "details" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="checkout-email">Email</Label>
                <Input id="checkout-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="checkout-company">Company (optional)</Label>
                  <Input id="checkout-company" value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="checkout-vat">VAT number (optional)</Label>
                  <Input id="checkout-vat" value={companyVat} onChange={(event) => setCompanyVat(event.target.value)} />
                </div>
              </div>
              <Button disabled={busy} onClick={submitDetails}>Continue</Button>
            </div>
          )}

          {step === "address" && (
            <div className="space-y-4">
              {book.addresses.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {book.addresses.map((address) => (
                    <Button key={address.id} size="sm" variant="outline" onClick={() => setBilling(draft(address, country))}>
                      {address.street} {address.number}, {address.city}
                    </Button>
                  ))}
                </div>
              )}
              <AddressFields id="billing" value={billing} countries={countries} onChange={setBilling} />
              {checkout.shippingRequired && (
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={separateShipping} onCheckedChange={setSeparateShipping} />
                  Ship to a different address
                </label>
              )}
              {separateShipping && <AddressFields id="shipping" value={shipping} countries={countries} onChange={setShipping} />}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("details")}>Back</Button>
                <Button disabled={busy} onClick={submitAddress}>Continue</Button>
              </div>
            </div>
          )}

          {step === "shipping" && (
            <div className="space-y-3">
              {checkout.methodsLoading && <p className="text-sm text-muted-foreground">Loading shipping methods…</p>}
              {checkout.shippingMethods.map((method) => (
                <label key={method.id} className="flex items-start gap-3 rounded-md border p-3 text-sm">
                  <input
                    type="radio"
                    name="shipping-method"
                    checked={checkout.cart?.shippingMethodId === String(method.id)}
                    onChange={() => {
                      void checkout.selectShippingMethod(String(method.id))
                        .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Could not select this shipping method."));
                    }}
                  />
                  <span>
                    <span className="font-medium">{method.name}</span>
                    {method.description && <span className="block text-muted-foreground">{method.description}</span>}
                  </span>
                </label>
              ))}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("address")}>Back</Button>
                <Button disabled={busy || !checkout.cart?.shippingMethodId} onClick={() => setStep("review")}>Continue</Button>
              </div>
            </div>
          )}

          {step === "review" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {email} · {billing.street} {billing.number}, {billing.postalCode} {billing.city}
              </p>
              <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Order notes (optional)" />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(checkout.shippingRequired ? "shipping" : "address")}>Back</Button>
                <Button disabled={busy} onClick={() => { void placeOrder(); }}>{busy ? "Placing order…" : "Continue to payment"}</Button>
              </div>
            </div>
          )}

          {message && <p className="text-sm text-destructive">{message}</p>}
          <Link href={paths.cart as Route} className="text-sm font-medium text-primary hover:underline">Back to cart</Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Order summary</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {checkout.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <span>{item.product?.title ?? `Product ${item.productId}`} × {item.quantity}</span>
              <span>{formatAmount(item.totalAmount)}</span>
            </div>
          ))}
          <CartSummary />
        </CardContent>
      </Card>
    </div>
  );
}
