"use client";

import Link from "next/link";
import type { Route } from "next";

import { useCommerce } from "@/components/commerce/commerce-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/ominity/commerce";
import { useAuth } from "@/components/auth";

export interface CommerceCartPageProps {
  readonly paths: {
    readonly home: string;
    readonly checkout: string;
    readonly login: string;
  };
  readonly features: {
    readonly checkout: boolean;
    readonly auth: boolean;
  };
}

export function CommerceCartPage(props: CommerceCartPageProps) {
  const commerce = useCommerce();
  const auth = useAuth();

  if (!commerce.ready) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">Loading cart…</CardContent>
      </Card>
    );
  }

  const hasSession = auth.session !== null;
  const checkoutPath = props.features.auth && !hasSession
    ? `${props.paths.login}?returnTo=${encodeURIComponent(props.paths.checkout)}`
    : props.paths.checkout;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Cart</CardTitle>
          <CardDescription>{commerce.cartCount} item(s)</CardDescription>
        </CardHeader>
      </Card>

      {commerce.cart.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <p className="text-sm text-muted-foreground">Your cart is currently empty.</p>
            <Link href={props.paths.home as Route} className="text-sm font-medium text-primary hover:underline">
              Continue shopping
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            {commerce.cart.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <CardDescription>SKU {item.sku}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {formatMoney(item.unitPrice, item.currency)} each
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => { void commerce.setCartQuantity(item.id, item.quantity - 1); }}
                    >
                      -1
                    </Button>
                    <span className="text-sm">Qty {item.quantity}</span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => { void commerce.setCartQuantity(item.id, item.quantity + 1); }}
                    >
                      +1
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { void commerce.removeFromCart(item.id); }}
                    >
                      Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatMoney(commerce.cartSubtotal, commerce.cart[0]?.currency ?? "EUR")}</span>
              </div>
              {props.features.checkout ? (
                <Link href={checkoutPath as Route} className="inline-block text-sm font-medium text-primary hover:underline">
                  {props.features.auth && !hasSession ? "Login to checkout" : "Proceed to checkout"}
                </Link>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Checkout is disabled. Enable `OMINITY_FEATURE_CHECKOUT=true`.
                </p>
              )}
              <Button variant="outline" onClick={() => { void commerce.clearCart(); }}>
                Clear cart
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
