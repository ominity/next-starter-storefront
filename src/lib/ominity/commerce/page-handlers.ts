import type { Metadata } from "next";
import {
  normalizeLocaleCode,
  parseLocaleCode,
  resolveAlternateLocaleTargets,
  type CmsRouteObject,
} from "@ominity/next/cms";

import { getStarterChannelContext } from "@/lib/ominity/site";
import { getStarterOminityConfig } from "@/lib/ominity/env";
import { cmsLinkResolver, getChannelAwareCmsRouting } from "@/lib/ominity/site";

import {
  findCommerceCategoryBySlugSegments,
  findCommerceProductByRouteSegment,
  listCommerceCategoryRouteEntries,
  listCommerceProductRouteEntries,
  listCommerceProductsForCategory,
} from "./data-source";
import {
  commerceCategoryIncomingSuffixSegments,
  commerceProductIncomingSuffixSegments,
} from "./route-translations";
import { resolveLocaleForCommerceVariant, variantMatchesCurrentStrategy } from "./locale";
import type {
  CommerceLocaleVariant,
  StarterResolvedCommerceCategory,
  StarterResolvedCommerceProduct,
} from "./types";

export interface ResolveProductPageInput {
  readonly variant: CommerceLocaleVariant;
  readonly productSegment: string;
  readonly preview: boolean;
  readonly localeSegment?: string;
  readonly countrySegment?: string;
}

export interface ResolveCategoryPageInput {
  readonly variant: CommerceLocaleVariant;
  readonly slugSegments: ReadonlyArray<string>;
  readonly preview: boolean;
  readonly localeSegment?: string;
  readonly countrySegment?: string;
}

export interface ResolvedProductPage {
  readonly locale: string;
  readonly product: StarterResolvedCommerceProduct;
  readonly shouldRedirect: boolean;
}

export interface ResolvedCategoryPage {
  readonly locale: string;
  readonly category: StarterResolvedCommerceCategory;
  readonly products: ReadonlyArray<StarterResolvedCommerceProduct>;
  readonly shouldRedirect: boolean;
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

function buildIncomingPath(input: {
  readonly variant: CommerceLocaleVariant;
  readonly countrySegment?: string;
  readonly localeSegment?: string;
  readonly suffixSegments: ReadonlyArray<string>;
}): string {
  const leadingSegments: string[] = [];

  if (input.variant === "language") {
    if (input.localeSegment) {
      leadingSegments.push(input.localeSegment);
    }
  } else if (input.variant === "country-language") {
    if (input.countrySegment) {
      leadingSegments.push(input.countrySegment);
    }
    if (input.localeSegment) {
      leadingSegments.push(input.localeSegment);
    }
  }

  return normalizePath(`/${[...leadingSegments, ...input.suffixSegments].join("/")}`);
}

function stripBasePath(path: string, basePath: string): string {
  const normalizedPath = normalizePath(path);
  const normalizedBasePath = normalizePath(basePath);

  if (normalizedBasePath === "/") {
    return normalizedPath;
  }

  if (normalizedPath === normalizedBasePath) {
    return "/";
  }

  if (normalizedPath.startsWith(`${normalizedBasePath}/`)) {
    const stripped = normalizedPath.slice(normalizedBasePath.length);
    return normalizePath(stripped.length === 0 ? "/" : stripped);
  }

  return normalizedPath;
}

function shouldRedirect(incomingPath: string, canonicalPath: string): boolean {
  const config = getStarterOminityConfig();
  if (config.canonicalRedirectPolicy !== "if-not-canonical") {
    return false;
  }

  const incomingComparable = stripBasePath(incomingPath, config.basePath);
  const canonicalComparable = stripBasePath(canonicalPath, config.basePath);

  return normalizePath(incomingComparable) !== normalizePath(canonicalComparable);
}

function absoluteCanonical(path: string): string {
  const config = getStarterOminityConfig();
  return new URL(path, config.siteUrl).toString();
}

function localeCandidates(locale: string): ReadonlyArray<string> {
  const normalizedLocale = normalizeLocaleCode(locale);
  const parsed = parseLocaleCode(normalizedLocale);
  return Array.from(new Set([normalizedLocale, parsed.language].filter((entry) => entry.length > 0)));
}

function resolveRouteForLocale(
  routes: Readonly<Record<string, CmsRouteObject>>,
  locale: string,
  routeName: "product" | "category",
): CmsRouteObject | null {
  for (const candidate of localeCandidates(locale)) {
    const direct = routes[normalizeLocaleCode(candidate)];
    if (direct && direct.name === routeName) {
      return direct;
    }
  }

  const targetLanguage = parseLocaleCode(normalizeLocaleCode(locale)).language;
  for (const route of Object.values(routes)) {
    if (route.name !== routeName) {
      continue;
    }

    const routeLocale = normalizeLocaleCode(route.locale ?? "");
    if (parseLocaleCode(routeLocale).language === targetLanguage) {
      return route;
    }
  }

  return Object.values(routes).find((route) => route.name === routeName) ?? null;
}

async function commerceRouteLanguageAlternates(
  routes: Readonly<Record<string, CmsRouteObject>>,
  routeName: "product" | "category",
): Promise<Readonly<Record<string, string>>> {
  const channelContext = await getStarterChannelContext();
  const routing = await getChannelAwareCmsRouting();
  const entries: Array<[string, string]> = [];
  const targets = resolveAlternateLocaleTargets({
    localeSegmentStrategy: routing.localeSegmentStrategy,
    locales: routing.locales,
    countries: channelContext.countries,
    languages: channelContext.languages,
  });

  for (const target of targets) {
    const route = resolveRouteForLocale(routes, target.locale, routeName);
    if (!route) {
      continue;
    }

    try {
      const path = cmsLinkResolver.resolve(route, { locale: target.locale }).href;
      entries.push([target.hrefLang, absoluteCanonical(path)]);
    } catch {
      // Skip invalid route payloads; canonical URL is still emitted.
    }
  }

  return Object.fromEntries(entries);
}

export async function resolveProductPageData(input: ResolveProductPageInput): Promise<ResolvedProductPage | null> {
  const config = getStarterOminityConfig();
  if (!config.enableCommerce || !config.enableCommerceProducts) {
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

  const product = await findCommerceProductByRouteSegment({
    locale,
    routeSegment: input.productSegment,
  });

  if (!product) {
    return null;
  }

  const incomingPath = buildIncomingPath({
    variant: input.variant,
    ...(typeof input.countrySegment === "string" ? { countrySegment: input.countrySegment } : {}),
    ...(typeof input.localeSegment === "string" ? { localeSegment: input.localeSegment } : {}),
    suffixSegments: commerceProductIncomingSuffixSegments(locale, input.productSegment),
  });

  return {
    locale,
    product,
    shouldRedirect: shouldRedirect(incomingPath, product.canonicalPath),
  };
}

export async function resolveCategoryPageData(input: ResolveCategoryPageInput): Promise<ResolvedCategoryPage | null> {
  const config = getStarterOminityConfig();
  if (!config.enableCommerce || !config.enableCommerceCategories) {
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

  const category = await findCommerceCategoryBySlugSegments({
    locale,
    slugSegments: input.slugSegments,
  });

  if (!category) {
    return null;
  }

  const products = await listCommerceProductsForCategory({
    locale,
    category,
  });

  const incomingPath = buildIncomingPath({
    variant: input.variant,
    ...(typeof input.countrySegment === "string" ? { countrySegment: input.countrySegment } : {}),
    ...(typeof input.localeSegment === "string" ? { localeSegment: input.localeSegment } : {}),
    suffixSegments: commerceCategoryIncomingSuffixSegments(locale, input.slugSegments),
  });

  return {
    locale,
    category,
    products,
    shouldRedirect: shouldRedirect(incomingPath, category.canonicalPath),
  };
}

export async function buildProductMetadata(input: ResolvedProductPage): Promise<Metadata> {
  const description = input.product.record.shortDescription ?? input.product.record.description;
  const canonicalUrl = absoluteCanonical(input.product.canonicalPath);
  const languages = {
    ...(await commerceRouteLanguageAlternates(input.product.record.routes, "product")),
  };
  if (!languages[input.locale]) {
    languages[input.locale] = canonicalUrl;
  }

  return {
    title: input.product.record.title,
    ...(typeof description === "string" ? { description } : {}),
    alternates: {
      canonical: canonicalUrl,
      ...(Object.keys(languages).length > 0 ? { languages } : {}),
    },
    openGraph: {
      title: input.product.record.title,
      ...(typeof description === "string" ? { description } : {}),
      url: canonicalUrl,
      locale: input.locale,
      ...(typeof input.product.record.coverImage === "string"
        ? {
          images: [
            {
              url: input.product.record.coverImage,
              alt: input.product.record.title,
            },
          ],
        }
        : {}),
    },
  };
}

export async function buildCategoryMetadata(input: ResolvedCategoryPage): Promise<Metadata> {
  const description = input.category.record.description;
  const canonicalUrl = absoluteCanonical(input.category.canonicalPath);
  const languages = {
    ...(await commerceRouteLanguageAlternates(input.category.record.routes, "category")),
  };
  if (!languages[input.locale]) {
    languages[input.locale] = canonicalUrl;
  }

  return {
    title: input.category.record.name,
    ...(typeof description === "string" ? { description } : {}),
    alternates: {
      canonical: canonicalUrl,
      ...(Object.keys(languages).length > 0 ? { languages } : {}),
    },
    openGraph: {
      title: input.category.record.name,
      ...(typeof description === "string" ? { description } : {}),
      url: canonicalUrl,
      locale: input.locale,
      ...(typeof input.category.record.coverImage === "string"
        ? {
          images: [
            {
              url: input.category.record.coverImage,
              alt: input.category.record.name,
            },
          ],
        }
        : {}),
    },
  };
}
export async function generateProductStaticParamsForVariant(
  variant: CommerceLocaleVariant,
): Promise<ReadonlyArray<Readonly<Record<string, string>>>> {
  if (!variantMatchesCurrentStrategy(variant)) {
    return [];
  }

  const config = getStarterOminityConfig();
  if (!config.enableCommerce || !config.enableCommerceProducts) {
    return [];
  }

  const entries = await listCommerceProductRouteEntries();
  const channelContext = await getStarterChannelContext();
  const defaultLocale = normalizeLocaleCode(channelContext.defaultLocale);
  const defaultLanguage = parseLocaleCode(defaultLocale).language;
  const params: Array<Readonly<Record<string, string>>> = [];

  for (const entry of entries) {
    const parsedLocale = parseLocaleCode(normalizeLocaleCode(entry.locale));

    if (variant === "none") {
      if (normalizeLocaleCode(entry.locale) !== defaultLocale && parsedLocale.language !== defaultLanguage) {
        continue;
      }

      params.push({
        product: entry.routeSegment,
      });
      continue;
    }

    if (variant === "language") {
      if (parsedLocale.language.length === 0) {
        continue;
      }

      params.push({
        locale: parsedLocale.language,
        product: entry.routeSegment,
      });
      continue;
    }

    if (!parsedLocale.country || parsedLocale.language.length === 0) {
      continue;
    }

    params.push({
      country: parsedLocale.country.toLowerCase(),
      locale: parsedLocale.language,
      product: entry.routeSegment,
    });
  }

  const deduped = new Map<string, Readonly<Record<string, string>>>();
  for (const entry of params) {
    deduped.set(JSON.stringify(entry), entry);
  }

  return Array.from(deduped.values());
}

export async function generateCategoryStaticParamsForVariant(
  variant: CommerceLocaleVariant,
): Promise<ReadonlyArray<Readonly<Record<string, string | ReadonlyArray<string>>>>> {
  if (!variantMatchesCurrentStrategy(variant)) {
    return [];
  }

  const config = getStarterOminityConfig();
  if (!config.enableCommerce || !config.enableCommerceCategories) {
    return [];
  }

  const entries = await listCommerceCategoryRouteEntries();
  const channelContext = await getStarterChannelContext();
  const defaultLocale = normalizeLocaleCode(channelContext.defaultLocale);
  const defaultLanguage = parseLocaleCode(defaultLocale).language;
  const params: Array<Readonly<Record<string, string | ReadonlyArray<string>>>> = [];

  for (const entry of entries) {
    const parsedLocale = parseLocaleCode(normalizeLocaleCode(entry.locale));

    if (variant === "none") {
      if (normalizeLocaleCode(entry.locale) !== defaultLocale && parsedLocale.language !== defaultLanguage) {
        continue;
      }

      params.push({
        slug: [...entry.slugSegments],
      });
      continue;
    }

    if (variant === "language") {
      if (parsedLocale.language.length === 0) {
        continue;
      }

      params.push({
        locale: parsedLocale.language,
        slug: [...entry.slugSegments],
      });
      continue;
    }

    if (!parsedLocale.country || parsedLocale.language.length === 0) {
      continue;
    }

    params.push({
      country: parsedLocale.country.toLowerCase(),
      locale: parsedLocale.language,
      slug: [...entry.slugSegments],
    });
  }

  const deduped = new Map<string, Readonly<Record<string, string | ReadonlyArray<string>>>>();
  for (const entry of params) {
    deduped.set(JSON.stringify(entry), entry);
  }

  return Array.from(deduped.values());
}
