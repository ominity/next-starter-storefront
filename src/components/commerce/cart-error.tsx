"use client";

import { useCart } from "@ominity/next/react";

/** The last failed cart change. A refused promotion code is shown by the code form in `CartSummary`. */
export function CartError() {
  const { error } = useCart();
  if (!error || error.code === "PROMOTION_CODE_NOT_APPLIED") return null;
  return <p className="text-sm text-destructive" role="alert">{error.message}</p>;
}
