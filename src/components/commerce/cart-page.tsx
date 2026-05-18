"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useRef, useState } from "react";

import { useCommerce } from "@/components/commerce/commerce-provider";
import {
  commerceCartItemCurrency,
  commerceCartItemId,
  commerceCartItemProductId,
  commerceCartItemQuantity,
  commerceCartItemSku,
  commerceCartItemTitle,
  commerceCartItemUnitPrice,
} from "@ominity/next/commerce";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/ominity/commerce";
import { emitCommerceEvent } from "@/lib/ominity/commerce/events";
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
    readonly guestCheckout: boolean;
  };
}

export function CommerceCartPage(props: CommerceCartPageProps) {
  const commerce = useCommerce();
  const auth = useAuth();
  const [promotionCodeInput, setPromotionCodeInput] = useState("");
  const hasEmittedCartViewed = useRef(false);

  useEffect(() => {
    if (!commerce.ready || hasEmittedCartViewed.current) {
      return;
    }

    hasEmittedCartViewed.current = true;
    emitCommerceEvent("cart_viewed", {
      cartCount: commerce.cartCount,
      cartSubtotal: commerce.cartSubtotal,
      ...(commerce.cart[0] ? { currency: commerceCartItemCurrency(commerce.cart[0]) } : {}),
      ...(commerce.promotionCodes.length > 0 ? { promotionCodes: commerce.promotionCodes } : {}),
    });
  }, [commerce.cart, commerce.cartCount, commerce.cartSubtotal, commerce.promotionCodes, commerce.ready]);

  if (!commerce.ready) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">Loading cart…</CardContent>
      </Card>
    );
  }

  const hasSession = auth.session !== null;
  const requiresLoginForCheckout = props.features.auth && !props.features.guestCheckout && !hasSession;
  const checkoutPath = requiresLoginForCheckout
    ? `${props.paths.login}?returnTo=${encodeURIComponent(props.paths.checkout)}`
    : props.paths.checkout;
  const canApplyPromotionCode = promotionCodeInput.trim().length > 0;

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
              <Card key={commerceCartItemId(item)}>
                <CardHeader>
                  <CardTitle className="text-lg">{commerceCartItemTitle(item)}</CardTitle>
                  <CardDescription>
                    {(() => {
                      const sku = commerceCartItemSku(item);
                      if (typeof sku === "string" && sku.length > 0) {
                        return `SKU ${sku}`;
                      }

                      const productId = commerceCartItemProductId(item);
                      if (typeof productId === "string") {
                        return `Product ${productId}`;
                      }

                      return "Product";
                    })()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {formatMoney(commerceCartItemUnitPrice(item), commerceCartItemCurrency(item))} each
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => { void commerce.setCartQuantity(commerceCartItemId(item), commerceCartItemQuantity(item) - 1); }}
                    >
                      -1
                    </Button>
                    <span className="text-sm">Qty {commerceCartItemQuantity(item)}</span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => { void commerce.setCartQuantity(commerceCartItemId(item), commerceCartItemQuantity(item) + 1); }}
                    >
                      +1
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { void commerce.removeFromCart(commerceCartItemId(item)); }}
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
              <div className="space-y-2">
                <label htmlFor="cart-promotion-code" className="text-xs font-medium text-muted-foreground">
                  Promotion code
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    id="cart-promotion-code"
                    value={promotionCodeInput}
                    onChange={(event) => setPromotionCodeInput(event.currentTarget.value)}
                    placeholder="Enter code"
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={!canApplyPromotionCode}
                    onClick={() => {
                      const code = promotionCodeInput.trim();
                      if (code.length === 0) {
                        return;
                      }

                      void commerce.applyPromotionCode(code);
                      setPromotionCodeInput("");
                    }}
                  >
                    Apply
                  </Button>
                </div>
                {commerce.promotionCodes.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {commerce.promotionCodes.map((code) => (
                      <Button
                        key={code}
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => { void commerce.removePromotionCode(code); }}
                      >
                        Remove {code}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No promotion code applied.</p>
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatMoney(commerce.cartSubtotal, commerce.cartCurrency ?? "EUR")}</span>
              </div>
              {props.features.checkout ? (
                <Link href={checkoutPath as Route} className="inline-block text-sm font-medium text-primary hover:underline">
                  {requiresLoginForCheckout ? "Login to checkout" : "Proceed to checkout"}
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
