import type { CurrencyAmount, ProductOffer } from "@ominity/api-typescript/models";
import { resolveCommerceProductPrice } from "@ominity/next/commerce";

export function formatMoney(value: string | number | undefined, currency: string | undefined): string {
  const amount = typeof value === "number" ? value : Number.parseFloat(value ?? "");
  if (!currency || !Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(amount);
}

/** Formats an SDK amount such as `cart.totalAmount`. */
export function formatAmount(amount: CurrencyAmount | null | undefined): string {
  return formatMoney(amount?.value ?? amount?.amount, amount?.currency);
}

/** The display price of a product's offers (`include: "offers"`). */
export function formatPrice(offers: ReadonlyArray<ProductOffer> | undefined): string {
  const price = resolveCommerceProductPrice({ offers: offers ?? [] });
  return price ? formatAmount(price) : "—";
}
