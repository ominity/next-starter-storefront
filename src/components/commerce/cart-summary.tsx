"use client";

import { commerceMoneyValue } from "@ominity/next/commerce";
import { useCart } from "@ominity/next/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatAmount } from "@/lib/format";

/** Totals, applied promotion codes and their discount, for the cart page and the checkout. */
export function CartSummary({ promotions = true }: { readonly promotions?: boolean }) {
  const cart = useCart();
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  if (!cart.cart) return null;
  const row = (label: string, value: string, strong = false) => (
    <div className={`flex items-center justify-between text-sm ${strong ? "border-t pt-2 font-semibold" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );

  return (
    <div className="space-y-3">
      {promotions && (
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            setCodeError(null);
            void cart.applyPromotionCode(code).then(
              () => setCode(""),
              (error: unknown) => setCodeError(error instanceof Error ? error.message : "This code could not be applied."),
            );
          }}
        >
          <label htmlFor="promotion-code" className="text-xs font-medium text-muted-foreground">Promotion code</label>
          <div className="flex gap-2">
            <Input id="promotion-code" value={code} onChange={(event) => { setCode(event.currentTarget.value); setCodeError(null); }} placeholder="Enter code" />
            <Button type="submit" size="sm" disabled={!code.trim() || cart.pending}>Apply</Button>
          </div>
          {cart.promotionCodes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {cart.promotionCodes.map((applied) => (
                <Button key={applied} type="button" size="sm" variant="outline" onClick={() => { void cart.removePromotionCode(applied).catch(() => undefined); }}>
                  {applied} ✕
                </Button>
              ))}
            </div>
          )}
          {codeError && <p className="text-xs text-destructive">{codeError}</p>}
        </form>
      )}
      {row("Subtotal", formatAmount(cart.cart.subtotalAmount))}
      {commerceMoneyValue(cart.cart.discountAmount) !== 0 && row("Discount", `−${formatAmount(cart.cart.discountAmount)}`)}
      {commerceMoneyValue(cart.cart.shippingAmount) !== 0 && row("Shipping", formatAmount(cart.cart.shippingAmount))}
      {commerceMoneyValue(cart.cart.taxAmount) !== 0 && row("Tax", formatAmount(cart.cart.taxAmount))}
      {row("Total", formatAmount(cart.cart.totalAmount), true)}
    </div>
  );
}
