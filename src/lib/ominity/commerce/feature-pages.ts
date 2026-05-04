import type { Metadata } from "next";

import { getStarterOminityConfig } from "@/lib/ominity/env";

import { generateLocaleStaticParamsForCommerceVariant, resolveLocaleForCommerceVariant } from "./locale";
import { buildCommerceUtilityPaths, type CommerceUtilityPaths } from "./paths";
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

export function buildCommerceFeatureMetadata(input: {
  readonly title: string;
  readonly description: string;
  readonly canonicalPath: string;
}): Metadata {
  const config = getStarterOminityConfig();
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
