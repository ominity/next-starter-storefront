"use client";

import Link from "next/link";
import type { Route } from "next";

import { Button } from "@/components/ui/button";
import { useCommerce, type CommerceCatalogProduct } from "@/components/commerce/commerce-provider";
import { formatMoney } from "@/lib/ominity/commerce";
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
  };
}

export function CommerceProductActions(props: CommerceProductActionsProps) {
  const commerce = useCommerce();
  const auth = useAuth();
  const wished = commerce.isWishlisted(props.product.id);

  const hasAuthSession = auth.session !== null;
  const checkoutPath = props.features.auth && !hasAuthSession
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
            {props.features.auth && !hasAuthSession ? "Login to checkout" : "Go to checkout"}
          </Link>
        )}
      </div>
    </div>
  );
}
