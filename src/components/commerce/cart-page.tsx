"use client";

import { emitCommerceEvent, commerceMoneyValue } from "@ominity/next/commerce";
import { useAuth, useCart } from "@ominity/next/react";
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAmount } from "@/lib/format";

import { CartSummary } from "./cart-summary";

export interface CommerceCartPageProps {
  readonly paths: { readonly home: string; readonly checkout: string; readonly login: string };
  readonly guestCheckout: boolean;
}

export function CommerceCartPage({ paths, guestCheckout }: CommerceCartPageProps) {
  const cart = useCart();
  const auth = useAuth();
  const viewed = useRef(false);

  useEffect(() => {
    if (!cart.ready || viewed.current) return;
    viewed.current = true;
    emitCommerceEvent("cart_viewed", {
      cartCount: cart.count,
      cartSubtotal: commerceMoneyValue(cart.cart?.subtotalAmount),
      ...(cart.cart ? { currency: cart.cart.currency } : {}),
      ...(cart.promotionCodes.length > 0 ? { promotionCodes: cart.promotionCodes } : {}),
    });
  }, [cart.cart, cart.count, cart.promotionCodes, cart.ready]);

  if (!cart.ready) {
    return <Card><CardContent className="pt-6 text-sm text-muted-foreground">Loading cart…</CardContent></Card>;
  }

  const loginFirst = !guestCheckout && !auth.user;
  const checkoutPath = loginFirst ? `${paths.login}?returnTo=${encodeURIComponent(paths.checkout)}` : paths.checkout;

  if (cart.items.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-2xl">Cart</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Your cart is empty.</p>
          <Link href={paths.home as Route} className="text-sm font-medium text-primary hover:underline">Continue shopping</Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Cart · {cart.count} item(s)</h1>
        {cart.items.map((item) => (
          <Card key={item.id}>
            <CardHeader>
              <CardTitle className="text-lg">{item.product?.title ?? `Product ${item.productId}`}</CardTitle>
              <CardDescription>
                {item.product?.sku ? `SKU ${item.product.sku} · ` : ""}{formatAmount(item.unitAmount)} each
                {commerceMoneyValue(item.discountAmount) !== 0 && ` · −${formatAmount(item.discountAmount)} discount`}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="secondary" disabled={cart.pending} onClick={() => { void cart.setQuantity(item.id, item.quantity - 1); }}>−</Button>
              <span className="text-sm">Qty {item.quantity}</span>
              <Button size="sm" variant="secondary" disabled={cart.pending} onClick={() => { void cart.setQuantity(item.id, item.quantity + 1); }}>+</Button>
              <Button size="sm" variant="outline" disabled={cart.pending} onClick={() => { void cart.remove(item.id); }}>Remove</Button>
              <span className="ml-auto text-sm font-medium">{formatAmount(item.totalAmount)}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <CartSummary />
          <div className="flex flex-wrap gap-2">
            <Link href={checkoutPath as Route} className={buttonVariants()}>
              {loginFirst ? "Login to checkout" : "Proceed to checkout"}
            </Link>
            <Button variant="outline" onClick={() => { void cart.clear(); }}>Clear cart</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
