import { normalizeLocaleCode, parseLocaleCode } from "@ominity/next/cms";
import type { LocalizedRouteTemplateMap } from "@ominity/next/next";

import enCommerceRouteTranslations from "@/locales/routes/commerce/en.json";
import nlCommerceRouteTranslations from "@/locales/routes/commerce/nl.json";

export type CommerceUtilityRoute =
  | "products"
  | "cart"
  | "wishlist"
  | "checkout"
  | "payment";

export type CommerceTemplateRoute = "product" | "category";

export const COMMERCE_UTILITY_ROUTES: ReadonlyArray<CommerceUtilityRoute> = [
  "products",
  "cart",
  "wishlist",
  "checkout",
  "payment",
];

type CommerceRouteTranslationKey = CommerceUtilityRoute | CommerceTemplateRoute;

type CommerceRouteTranslationDictionary = Readonly<Record<CommerceRouteTranslationKey, string>>;

const DEFAULT_COMMERCE_ROUTE_TRANSLATIONS: CommerceRouteTranslationDictionary = {
  products: "products",
  cart: "cart",
  wishlist: "wishlist",
  checkout: "checkout",
  payment: "payment",
  product: "p/{sku}-{slug}",
  category: "c/{slug}",
};

const COMMERCE_ROUTE_TRANSLATIONS_BY_LANGUAGE = {
  en: enCommerceRouteTranslations,
  nl: nlCommerceRouteTranslations,
} as const satisfies Readonly<Record<string, CommerceRouteTranslationDictionary>>;

function normalizeTemplate(value: string | undefined, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value
    .trim()
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");

  return normalized.length > 0 ? normalized : fallback;
}

function firstTranslationDictionary(): CommerceRouteTranslationDictionary {
  const first = Object.values(COMMERCE_ROUTE_TRANSLATIONS_BY_LANGUAGE)[0];
  return first ?? DEFAULT_COMMERCE_ROUTE_TRANSLATIONS;
}

function translationDictionaryForLocale(locale: string): CommerceRouteTranslationDictionary {
  const normalizedLocale = normalizeLocaleCode(locale);
  const language = parseLocaleCode(normalizedLocale).language;
  const fallback = firstTranslationDictionary();

  return COMMERCE_ROUTE_TRANSLATIONS_BY_LANGUAGE[normalizedLocale as keyof typeof COMMERCE_ROUTE_TRANSLATIONS_BY_LANGUAGE]
    ?? COMMERCE_ROUTE_TRANSLATIONS_BY_LANGUAGE[language as keyof typeof COMMERCE_ROUTE_TRANSLATIONS_BY_LANGUAGE]
    ?? COMMERCE_ROUTE_TRANSLATIONS_BY_LANGUAGE.en
    ?? fallback;
}

function normalizedTranslationForRoute(
  dictionary: CommerceRouteTranslationDictionary,
  route: CommerceRouteTranslationKey,
): string {
  const fallback = DEFAULT_COMMERCE_ROUTE_TRANSLATIONS[route];
  return normalizeTemplate(dictionary[route], fallback);
}

export function localizedCommerceSlugMapForRoute(route: CommerceUtilityRoute): Readonly<Record<string, string>> {
  const entries = Object.entries(COMMERCE_ROUTE_TRANSLATIONS_BY_LANGUAGE).map(([language, dictionary]) => {
    return [language, normalizedTranslationForRoute(dictionary, route)] as const;
  });

  return Object.fromEntries(entries);
}

export function localizedCommerceTemplateMapForRoute(route: CommerceTemplateRoute): LocalizedRouteTemplateMap {
  const entries = Object.entries(COMMERCE_ROUTE_TRANSLATIONS_BY_LANGUAGE).map(([language, dictionary]) => {
    return [language, normalizedTranslationForRoute(dictionary, route)] as const;
  });

  return Object.fromEntries(entries);
}

export function commerceRouteTemplateForLocale(route: CommerceTemplateRoute, locale: string): string {
  const dictionary = translationDictionaryForLocale(locale);
  return normalizedTranslationForRoute(dictionary, route);
}

function templateSegments(template: string): ReadonlyArray<string> {
  return normalizeTemplate(template, "")
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
}

function isDynamicSegment(segment: string): boolean {
  return /{[A-Za-z0-9_]+}/.test(segment);
}

export function commerceProductIncomingSuffixSegments(
  locale: string,
  productSegment: string,
): ReadonlyArray<string> {
  const template = commerceRouteTemplateForLocale("product", locale);
  const segments = templateSegments(template);
  const dynamicCount = segments.filter((segment) => isDynamicSegment(segment)).length;

  if (dynamicCount !== 1) {
    return ["p", productSegment];
  }

  return segments.map((segment) => (isDynamicSegment(segment) ? productSegment : segment));
}

export function commerceCategoryIncomingSuffixSegments(
  locale: string,
  slugSegments: ReadonlyArray<string>,
): ReadonlyArray<string> {
  const template = commerceRouteTemplateForLocale("category", locale);
  const segments = templateSegments(template);
  const dynamicIndexes = segments
    .map((segment, index) => (isDynamicSegment(segment) ? index : -1))
    .filter((index) => index >= 0);

  if (dynamicIndexes.length !== 1) {
    return ["c", ...slugSegments];
  }

  const dynamicIndex = dynamicIndexes[0];
  if (typeof dynamicIndex !== "number") {
    return ["c", ...slugSegments];
  }

  return [
    ...segments.slice(0, dynamicIndex),
    ...slugSegments,
    ...segments.slice(dynamicIndex + 1),
  ];
}
