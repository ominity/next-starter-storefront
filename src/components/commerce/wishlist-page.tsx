"use client";

import type { CmsRoutingConfig } from "@ominity/next/cms";
import { useCart, useWishlist } from "@ominity/next/react";
import type { Route } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/format";
import { productPath } from "@/lib/ominity/routes";

import { CartError } from "./cart-error";

export interface CommerceWishlistPageProps {
  readonly paths: { readonly home: string; readonly cart: string };
  readonly locale: string;
  readonly routing: CmsRoutingConfig;
}

export function CommerceWishlistPage({ paths, locale, routing }: CommerceWishlistPageProps) {
  const wishlist = useWishlist();
  const cart = useCart();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Wishlist</CardTitle>
          <CardDescription>{wishlist.items.length} saved item(s)</CardDescription>
        </CardHeader>
      </Card>

      <CartError />

      {wishlist.items.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <p className="text-sm text-muted-foreground">Nothing saved yet.</p>
            <Link href={paths.home as Route} className="text-sm font-medium text-primary hover:underline">Continue shopping</Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {wishlist.items.map((product) => {
            const path = productPath(product, locale, routing);
            return (
              <Card key={product.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{product.title}</CardTitle>
                  <CardDescription>SKU {product.sku}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm font-medium">{formatPrice(product.offers)}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" disabled={cart.pending} onClick={() => { void cart.add(product).catch(() => undefined); }}>Add to cart</Button>
                    <Button size="sm" variant="outline" onClick={() => wishlist.remove(product.id)}>Remove</Button>
                    {path && <Link href={path as Route} className="text-sm font-medium text-primary hover:underline">View product</Link>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Link href={paths.cart as Route} className="text-sm font-medium text-primary hover:underline">Open cart</Link>
    </div>
  );
}
