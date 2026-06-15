import { createCmsLinkResolver, normalizeLocaleCode, type CmsRoutingConfig } from "@ominity/next/cms";
import {
  buildLocalizedStaticPath,
  type LocalizedSlugMap,
} from "@ominity/next/next";

import { cmsRouting } from "@/lib/ominity/site";
import {
  COMMERCE_UTILITY_ROUTES,
  localizedCommerceSlugMapForRoute,
  type CommerceUtilityRoute,
} from "./route-translations";

export { COMMERCE_UTILITY_ROUTES, type CommerceUtilityRoute };

interface LocalizedStaticRouteDefinition {
  readonly prefixPath?: string;
  readonly slugByLocale: LocalizedSlugMap;
}

function localizedSlugMapForRoute(route: CommerceUtilityRoute): LocalizedSlugMap {
  return localizedCommerceSlugMapForRoute(route);
}

export function commerceUtilityRouteDefinition(route: CommerceUtilityRoute): LocalizedStaticRouteDefinition {
  return {
    prefixPath: "/",
    slugByLocale: localizedSlugMapForRoute(route),
  };
}

export interface CommerceUtilityPaths {
  readonly home: string;
  readonly products: string;
  readonly cart: string;
  readonly wishlist: string;
  readonly checkout: string;
  readonly payment: string;
}

export function buildCommerceUtilityPath(
  route: CommerceUtilityRoute,
  locale: string,
  routing: CmsRoutingConfig = cmsRouting,
): string {
  const normalizedLocale = normalizeLocaleCode(locale);
  const definition = commerceUtilityRouteDefinition(route);

  return buildLocalizedStaticPath({
    routing,
    locale: normalizedLocale,
    slugByLocale: definition.slugByLocale,
    ...(typeof definition.prefixPath === "string" ? { prefixPath: definition.prefixPath } : {}),
  });
}

export function buildCommerceUtilityPaths(
  locale: string,
  routing: CmsRoutingConfig = cmsRouting,
): CommerceUtilityPaths {
  const resolver = createCmsLinkResolver({
    config: routing,
    stringLinkStrategy: "localize-relative",
  });
  const home = resolver.resolve("/", { locale: normalizeLocaleCode(locale) }).href;

  return {
    home,
    products: buildCommerceUtilityPath("products", locale, routing),
    cart: buildCommerceUtilityPath("cart", locale, routing),
    wishlist: buildCommerceUtilityPath("wishlist", locale, routing),
    checkout: buildCommerceUtilityPath("checkout", locale, routing),
    payment: buildCommerceUtilityPath("payment", locale, routing),
  };
}
