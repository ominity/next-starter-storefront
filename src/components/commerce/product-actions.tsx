"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { useCommerce, type CommerceCatalogProduct } from "@/components/commerce/commerce-provider";
import { formatMoney } from "@/lib/ominity/commerce";
import { emitCommerceEvent } from "@/lib/ominity/commerce/events";
import { useAuth } from "@/components/auth";

export interface CommerceProductActionsProps {
  readonly product: CommerceCatalogProduct;
  readonly paths: {
    readonly cart: string;
    readonly wishlist: string;
    readonly checkout: string;
    readonly login: string;
  };
  readonly features: {
    readonly cart: boolean;
    readonly wishlist: boolean;
    readonly checkout: boolean;
    readonly auth: boolean;
    readonly guestCheckout: boolean;
  };
}

export function CommerceProductActions(props: CommerceProductActionsProps) {
  const commerce = useCommerce();
  const auth = useAuth();
  const wished = commerce.isWishlisted(props.product.id);
  const hasEmittedProductView = useRef(false);

  useEffect(() => {
    if (hasEmittedProductView.current) {
      return;
    }

    hasEmittedProductView.current = true;
    emitCommerceEvent("product_viewed", {
      productId: props.product.id,
      ...(props.product.sku ? { sku: props.product.sku } : {}),
      ...(props.product.title ? { title: props.product.title } : {}),
      ...(typeof props.product.unitPrice === "number" ? { unitPrice: props.product.unitPrice } : {}),
      ...(props.product.currency ? { currency: props.product.currency } : {}),
      ...(props.product.canonicalPath ? { canonicalPath: props.product.canonicalPath } : {}),
    });
  }, [props.product]);

  const hasAuthSession = auth.session !== null;
  const requiresLoginForCheckout = props.features.auth && !props.features.guestCheckout && !hasAuthSession;
  const checkoutPath = requiresLoginForCheckout
    ? `${props.paths.login}?returnTo=${encodeURIComponent(props.paths.checkout)}`
    : props.paths.checkout;

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-muted/40 p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Price</div>
        <div className="text-2xl font-semibold">
          {formatMoney(props.product.unitPrice, props.product.currency)}
        </div>
      </div>

      <div className="grid gap-2">
        <Button
          onClick={() => { void commerce.addToCart(props.product); }}
          disabled={!props.features.cart}
        >
          {props.features.cart ? "Add to cart" : "Cart disabled"}
        </Button>

        <Button
          variant="secondary"
          onClick={() => commerce.toggleWishlist(props.product)}
          disabled={!props.features.wishlist}
        >
          {!props.features.wishlist ? "Wishlist disabled" : wished ? "Remove from wishlist" : "Add to wishlist"}
        </Button>

        <Link className="text-sm font-medium text-primary hover:underline" href={props.paths.cart as Route}>
          View cart ({commerce.cartCount})
        </Link>

        {props.features.wishlist && (
          <Link
            className="text-sm font-medium text-primary hover:underline"
            href={props.paths.wishlist as Route}
          >
            View wishlist ({commerce.wishlist.length})
          </Link>
        )}

        {props.features.checkout && (
          <Link
            className="text-sm font-medium text-primary hover:underline"
            href={checkoutPath as Route}
          >
            {requiresLoginForCheckout ? "Login to checkout" : "Go to checkout"}
          </Link>
        )}
      </div>
    </div>
  );
}
