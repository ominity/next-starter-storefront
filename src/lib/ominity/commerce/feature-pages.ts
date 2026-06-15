import type { Metadata } from "next";
import { matchLocaleFromSegments, normalizeLocaleCode, type CmsRoutingConfig } from "@ominity/next/cms";
import { buildLocalizedSlugAlternates } from "@ominity/next/next";

import { getStarterOminityConfig } from "@/lib/ominity/env";
import { getStarterChannelContext } from "@/lib/ominity/site";
import { getChannelAwareCmsRouting } from "@/lib/ominity/site";

import { generateLocaleStaticParamsForCommerceVariant, resolveLocaleForCommerceVariant } from "./locale";
import {
  buildCommerceUtilityPath,
  buildCommerceUtilityPaths,
  COMMERCE_UTILITY_ROUTES,
  commerceUtilityRouteDefinition,
  type CommerceUtilityPaths,
  type CommerceUtilityRoute,
} from "./paths";
import type { CommerceLocaleVariant } from "./types";

export type CommerceFeature =
  | "products"
  | "categories"
  | "cart"
  | "wishlist"
  | "checkout"
  | "payment";

export interface ResolveCommerceFeaturePageInput {
  readonly feature: CommerceFeature;
  readonly variant: CommerceLocaleVariant;
  readonly localeSegment?: string;
  readonly countrySegment?: string;
}

export interface ResolvedCommerceFeaturePage {
  readonly locale: string;
  readonly paths: CommerceUtilityPaths;
}

function normalizePath(path: string): string {
  if (path.length === 0) {
    return "/";
  }

  const withLeadingSlash = path.startsWith("/") ? path : `/${path}`;
  if (withLeadingSlash === "/") {
    return "/";
  }

  return withLeadingSlash.replace(/\/+$/, "");
}

function splitPath(path: string): ReadonlyArray<string> {
  return normalizePath(path).split("/").filter((segment) => segment.length > 0);
}

function removeBasePath(path: string, basePath: string): string {
  if (basePath.length === 0 || basePath === "/") {
    return normalizePath(path);
  }

  const normalizedPath = normalizePath(path);
  const normalizedBasePath = normalizePath(basePath);

  if (normalizedPath === normalizedBasePath) {
    return "/";
  }

  if (normalizedPath.startsWith(`${normalizedBasePath}/`)) {
    return normalizePath(normalizedPath.slice(normalizedBasePath.length));
  }

  return normalizedPath;
}

function resolveLocaleAndRoute(
  canonicalPath: string,
  routing: CmsRoutingConfig,
): {
  readonly locale: string;
  readonly route?: CommerceUtilityRoute;
} {
  const normalizedCanonicalPath = normalizePath(canonicalPath);
  const relativePath = removeBasePath(normalizedCanonicalPath, routing.basePath);
  const segments = splitPath(relativePath);
  const matchedLocale = matchLocaleFromSegments(segments, routing);
  const locale = normalizeLocaleCode(matchedLocale?.locale ?? routing.defaultLocale);

  for (const route of COMMERCE_UTILITY_ROUTES) {
    const candidatePath = normalizePath(buildCommerceUtilityPath(route, locale, routing));
    if (candidatePath === normalizedCanonicalPath) {
      return {
        locale,
        route,
      };
    }
  }

  return {
    locale,
  };
}

const featureFlagMap: Readonly<Record<CommerceFeature, (config: ReturnType<typeof getStarterOminityConfig>) => boolean>> = {
  products: (config) => config.enableCommerceProducts,
  categories: (config) => config.enableCommerceCategories,
  cart: (config) => config.enableCommerceCart,
  wishlist: (config) => config.enableCommerceWishlist,
  checkout: (config) => config.enableCommerceCheckout,
  payment: (config) => config.enableCommercePayment,
};

export function isCommerceFeatureEnabled(feature: CommerceFeature): boolean {
  const config = getStarterOminityConfig();
  if (!config.enableCommerce) {
    return false;
  }

  return featureFlagMap[feature](config);
}

export async function resolveCommerceFeaturePage(
  input: ResolveCommerceFeaturePageInput,
): Promise<ResolvedCommerceFeaturePage | null> {
  if (!isCommerceFeatureEnabled(input.feature)) {
    return null;
  }

  const locale = await resolveLocaleForCommerceVariant({
    variant: input.variant,
    ...(typeof input.localeSegment === "string" ? { localeSegment: input.localeSegment } : {}),
    ...(typeof input.countrySegment === "string" ? { countrySegment: input.countrySegment } : {}),
  });

  if (!locale) {
    return null;
  }

  return {
    locale,
    paths: buildCommerceUtilityPaths(locale),
  };
}

export async function generateFixedCommerceStaticParamsForVariant(
  variant: CommerceLocaleVariant,
): Promise<ReadonlyArray<Readonly<Record<string, string>>>> {
  const params = await generateLocaleStaticParamsForCommerceVariant(variant);
  return params
    .filter((entry) => Object.keys(entry).length > 0);
}

export async function buildCommerceFeatureMetadata(input: {
  readonly title: string;
  readonly description: string;
  readonly canonicalPath: string;
}): Promise<Metadata> {
  const config = getStarterOminityConfig();
  const routing = await getChannelAwareCmsRouting();
  const channelContext = await getStarterChannelContext();
  const resolved = resolveLocaleAndRoute(input.canonicalPath, routing);

  if (resolved.route) {
    const definition = commerceUtilityRouteDefinition(resolved.route);
    const alternates = buildLocalizedSlugAlternates({
      routing,
      locale: resolved.locale,
      slugByLocale: definition.slugByLocale,
      baseUrl: config.siteUrl,
      countries: channelContext.countries,
      languages: channelContext.languages,
      ...(typeof definition.prefixPath === "string" ? { prefixPath: definition.prefixPath } : {}),
    }).alternates;
    const canonicalUrl = alternates.canonical ?? new URL(input.canonicalPath, config.siteUrl).toString();

    return {
      title: input.title,
      description: input.description,
      alternates,
      openGraph: {
        title: input.title,
        description: input.description,
        url: canonicalUrl,
        locale: resolved.locale,
      },
    };
  }

  const canonicalUrl = new URL(input.canonicalPath, config.siteUrl).toString();

  return {
    title: input.title,
    description: input.description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: input.title,
      description: input.description,
      url: canonicalUrl,
    },
  };
}
