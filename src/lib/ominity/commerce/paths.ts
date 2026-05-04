import { normalizeLocaleCode } from "@ominity/next/cms";

import { cmsLocalizedStringLinkResolver } from "@/lib/ominity/routing";

export type CommerceUtilityRoute =
  | "home"
  | "cart"
  | "wishlist"
  | "checkout"
  | "payment";

const COMMERCE_ROUTE_SEGMENTS: Readonly<Record<CommerceUtilityRoute, string>> = {
  home: "/",
  cart: "/cart",
  wishlist: "/wishlist",
  checkout: "/checkout",
  payment: "/payment",
};

export interface CommerceUtilityPaths {
  readonly home: string;
  readonly cart: string;
  readonly wishlist: string;
  readonly checkout: string;
  readonly payment: string;
}

export function buildCommerceUtilityPath(route: CommerceUtilityRoute, locale: string): string {
  const normalizedLocale = normalizeLocaleCode(locale);
  return cmsLocalizedStringLinkResolver.resolve(
    COMMERCE_ROUTE_SEGMENTS[route],
    { locale: normalizedLocale },
  ).href;
}

export function buildCommerceUtilityPaths(locale: string): CommerceUtilityPaths {
  return {
    home: buildCommerceUtilityPath("home", locale),
    cart: buildCommerceUtilityPath("cart", locale),
    wishlist: buildCommerceUtilityPath("wishlist", locale),
    checkout: buildCommerceUtilityPath("checkout", locale),
    payment: buildCommerceUtilityPath("payment", locale),
  };
}
