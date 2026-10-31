"use client";

import type { Product } from "@ominity/api-typescript/models";
import { commerceMoneyValue, emitCommerceEvent, resolveCommerceProductPrice } from "@ominity/next/commerce";
import { useAuth, useCart, useWishlist } from "@ominity/next/react";
import type { Route } from "next";
import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";

import { CartError } from "./cart-error";

export interface CommerceProductActionsProps {
  readonly product: Product;
  readonly canonicalPath: string;
  readonly paths: { readonly cart: string; readonly wishlist: string; readonly checkout: string; readonly login: string };
  readonly guestCheckout: boolean;
}

export function CommerceProductActions({ product, canonicalPath, paths, guestCheckout }: CommerceProductActionsProps) {
  const cart = useCart();
  const wishlist = useWishlist();
  const auth = useAuth();

  useEffect(() => {
    const price = resolveCommerceProductPrice({ offers: product.offers ?? [] });
    emitCommerceEvent("product_viewed", {
      productId: String(product.id),
      sku: product.sku,
      title: product.title,
      canonicalPath,
      ...(price ? { unitPrice: commerceMoneyValue(price), currency: price.currency } : {}),
    });
  }, [canonicalPath, product]);

  const loginFirst = !guestCheckout && !auth.user;
  const checkoutPath = loginFirst ? `${paths.login}?returnTo=${encodeURIComponent(paths.checkout)}` : paths.checkout;

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-muted/40 p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Price</div>
        <div className="text-2xl font-semibold">{formatPrice(product.offers)}</div>
      </div>
      <div className="grid gap-2">
        <Button disabled={cart.pending} onClick={() => { void cart.add(product).catch(() => undefined); }}>Add to cart</Button>
        <Button variant="secondary" onClick={() => wishlist.toggle(product)}>
          {wishlist.has(product.id) ? "Remove from wishlist" : "Add to wishlist"}
        </Button>
        <CartError />
        <Link className="text-sm font-medium text-primary hover:underline" href={paths.cart as Route}>View cart ({cart.count})</Link>
        <Link className="text-sm font-medium text-primary hover:underline" href={paths.wishlist as Route}>View wishlist ({wishlist.items.length})</Link>
        <Link className="text-sm font-medium text-primary hover:underline" href={checkoutPath as Route}>
          {loginFirst ? "Login to checkout" : "Go to checkout"}
        </Link>
      </div>
    </div>
  );
}
