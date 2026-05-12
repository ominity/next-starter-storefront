import { Ominity } from "@ominity/api-typescript";
import { normalizeLocaleCode, parseLocaleCode, type CmsRouteObject } from "@ominity/next/cms";

import { getStarterOminityConfig } from "@/lib/ominity/env";
import { cmsLinkResolver } from "@/lib/ominity/routing";

import {
  MOCK_COMMERCE_CATEGORIES,
  MOCK_COMMERCE_PRODUCTS,
} from "./mock-data";
import type {
  StarterCommerceCategoryRecord,
  StarterCommerceCategoryRouteEntry,
  StarterCommerceProductRecord,
  StarterCommerceProductRouteEntry,
  StarterResolvedCommerceCategory,
  StarterResolvedCommerceProduct,
} from "./types";

const liveCommerceSdkByLanguage = new Map<string, Ominity>();

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function asPrice(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function resolveProductPrice(input: UnknownRecord): { readonly price?: number; readonly currency?: string } {
  const rawPrice = input.price;
  const nestedPrice = isRecord(rawPrice) ? rawPrice : null;

  const price = asPrice(rawPrice)
    ?? (nestedPrice ? asPrice(nestedPrice.amount) : undefined)
    ?? (nestedPrice ? asPrice(nestedPrice.gross) : undefined)
    ?? asPrice(input.priceIncVat)
    ?? asPrice(input.priceInclVat)
    ?? asPrice(input.grossPrice)
    ?? asPrice(input.netPrice);

  const currency = asString(input.currency)
    ?? asString(input.currencyCode)
    ?? (nestedPrice ? asString(nestedPrice.currency) : undefined)
    ?? (nestedPrice ? asString(nestedPrice.currencyCode) : undefined);

  return {
    ...(typeof price === "number" ? { price } : {}),
    ...(typeof currency === "string" ? { currency } : {}),
  };
}

function localeCandidates(locale: string): ReadonlyArray<string> {
  const normalizedLocale = normalizeLocaleCode(locale);
  const parsed = parseLocaleCode(normalizedLocale);
  return Array.from(new Set([normalizedLocale, parsed.language].filter((entry) => entry.length > 0)));
}

function normalizePathSegments(value: unknown): ReadonlyArray<string> {
  if (Array.isArray(value)) {
    return value
      .flatMap((entry) => `${entry}`.split("/"))
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  if (typeof value === "string") {
    return value
      .split("/")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  if (typeof value === "number") {
    return [`${value}`];
  }

  return [];
}

function routePathSegments(route: CmsRouteObject): ReadonlyArray<string> {
  return normalizePathSegments(route.parameters.slug);
}

function productRouteSegment(route: CmsRouteObject): string | null {
  const skuValue = route.parameters.sku;
  const sku = typeof skuValue === "number"
    ? `${skuValue}`
    : typeof skuValue === "string"
      ? skuValue.trim()
      : "";

  if (sku.length === 0) {
    return null;
  }

  const slugPart = normalizePathSegments(route.parameters.slug).join("-");
  if (slugPart.length === 0) {
    return null;
  }

  return `${sku}-${slugPart}`;
}

function normalizeRouteMap(input: unknown): Readonly<Record<string, CmsRouteObject>> {
  if (!isRecord(input)) {
    return {};
  }

  const result: Record<string, CmsRouteObject> = {};

  for (const [key, value] of Object.entries(input)) {
    if (!isRecord(value)) {
      continue;
    }

    const routeName = asString(value.name);
    if (!routeName) {
      continue;
    }

    const routeLocale = normalizeLocaleCode(asString(value.locale) ?? key);
    const routeParameters = isRecord(value.parameters) ? value.parameters : {};

    result[routeLocale] = {
      resource: "route",
      name: routeName,
      locale: routeLocale,
      parameters: routeParameters,
    };
  }

  return result;
}

function resolveRouteForLocale(
  routes: Readonly<Record<string, CmsRouteObject>>,
  locale: string,
  expectedRouteName: "product" | "category",
): CmsRouteObject | null {
  for (const candidate of localeCandidates(locale)) {
    const direct = routes[normalizeLocaleCode(candidate)];
    if (direct && direct.name === expectedRouteName) {
      return direct;
    }
  }

  for (const candidate of localeCandidates(locale)) {
    for (const route of Object.values(routes)) {
      if (route.name !== expectedRouteName) {
        continue;
      }

      const routeLocale = normalizeLocaleCode(route.locale ?? candidate);
      if (routeLocale === normalizeLocaleCode(candidate)) {
        return route;
      }
    }
  }

  return Object.values(routes).find((route) => route.name === expectedRouteName) ?? null;
}

function canonicalPathForRoute(route: CmsRouteObject, locale: string): string {
  try {
    return cmsLinkResolver.resolve(route, { locale }).href;
  } catch {
    if (route.name === "product") {
      const segment = productRouteSegment(route);
      return segment ? `/p/${segment}` : "/";
    }

    const segments = routePathSegments(route);
    return segments.length > 0 ? `/c/${segments.join("/")}` : "/c";
  }
}

function normalizeLiveProduct(input: unknown): StarterCommerceProductRecord | null {
  if (!isRecord(input)) {
    return null;
  }

  const sku = asString(input.sku);
  const title = asString(input.title);
  if (!sku || !title) {
    return null;
  }

  const routes = normalizeRouteMap(input.routes);
  if (Object.keys(routes).length === 0) {
    return null;
  }

  const idValue = asString(input.id) ?? (typeof input.id === "number" ? `${input.id}` : null);
  if (!idValue) {
    return null;
  }
  const shortDescription = asString(input.shortDescription);
  const description = asString(input.description);
  const coverImage = asString(input.coverImage);
  const stock = asNumber(input.stock);
  const categoryId = asNumber(input.categoryId);
  const pricing = resolveProductPrice(input);

  return {
    id: idValue,
    ...(typeof input.id === "number" ? { numericId: input.id } : {}),
    sku,
    title,
    ...(typeof shortDescription === "string" ? { shortDescription } : {}),
    ...(typeof description === "string" ? { description } : {}),
    ...(typeof coverImage === "string" ? { coverImage } : {}),
    ...(typeof stock === "number" ? { stock } : {}),
    ...(typeof categoryId === "number" ? { categoryId } : {}),
    ...pricing,
    routes,
  };
}

function normalizeLiveCategory(input: unknown): StarterCommerceCategoryRecord | null {
  if (!isRecord(input)) {
    return null;
  }

  const name = asString(input.name);
  if (!name) {
    return null;
  }

  const routes = normalizeRouteMap(input.routes);
  if (Object.keys(routes).length === 0) {
    return null;
  }

  const idValue = asString(input.id) ?? (typeof input.id === "number" ? `${input.id}` : null);
  if (!idValue) {
    return null;
  }
  const description = asString(input.description);
  const coverImage = asString(input.coverImage);
  const productsCount = asNumber(input.productsCount);
  const fullSlug = asString(input.fullSlug);

  return {
    id: idValue,
    ...(typeof input.id === "number" ? { numericId: input.id } : {}),
    name,
    ...(typeof description === "string" ? { description } : {}),
    ...(typeof coverImage === "string" ? { coverImage } : {}),
    ...(typeof productsCount === "number" ? { productsCount } : {}),
    ...(typeof fullSlug === "string" ? { fullSlug } : {}),
    routes,
  };
}

function languageFromLocale(locale: string | undefined): string | undefined {
  if (typeof locale !== "string" || locale.length === 0) {
    return undefined;
  }

  const parsed = parseLocaleCode(normalizeLocaleCode(locale));
  return parsed.language.length > 0 ? parsed.language : undefined;
}

function getLiveCommerceSdk(language?: string): Ominity | null {
  const config = getStarterOminityConfig();
  if (!config.apiUrl || !config.apiKey) {
    return null;
  }

  const sdkLanguage = typeof language === "string" && language.length > 0 ? language : "";
  const cacheKey = sdkLanguage || "__default__";
  const cached = liveCommerceSdkByLanguage.get(cacheKey);
  if (cached) {
    return cached;
  }

  const sdk = new Ominity({
    serverURL: config.apiUrl,
    security: {
      apiKey: config.apiKey,
    },
    ...(typeof config.channelId === "string" ? { channelId: config.channelId } : {}),
    ...(sdkLanguage ? { language: sdkLanguage } : {}),
  });

  liveCommerceSdkByLanguage.set(cacheKey, sdk);
  return sdk;
}

async function listLiveProducts(language?: string): Promise<ReadonlyArray<StarterCommerceProductRecord>> {
  const sdk = getLiveCommerceSdk(language);
  if (!sdk) {
    return [];
  }

  const config = getStarterOminityConfig();
  try {
    const response = await sdk.commerce.products.list({
      include: "routes",
      limit: config.commerceListLimit,
    });

    return response.items
      .map((item) => normalizeLiveProduct(item))
      .filter((item): item is StarterCommerceProductRecord => item !== null);
  } catch {
    return [];
  }
}

async function listLiveCategories(language?: string): Promise<ReadonlyArray<StarterCommerceCategoryRecord>> {
  const sdk = getLiveCommerceSdk(language);
  if (!sdk) {
    return [];
  }

  const config = getStarterOminityConfig();
  try {
    const response = await sdk.commerce.categories.list({
      include: "routes",
      limit: config.commerceListLimit,
    });

    return response.items
      .map((item) => normalizeLiveCategory(item))
      .filter((item): item is StarterCommerceCategoryRecord => item !== null);
  } catch {
    return [];
  }
}

export async function listCommerceProducts(locale?: string): Promise<ReadonlyArray<StarterCommerceProductRecord>> {
  const config = getStarterOminityConfig();
  if (config.useMockData) {
    return MOCK_COMMERCE_PRODUCTS;
  }

  return listLiveProducts(languageFromLocale(locale));
}

export async function listCommerceCategories(locale?: string): Promise<ReadonlyArray<StarterCommerceCategoryRecord>> {
  const config = getStarterOminityConfig();
  if (config.useMockData) {
    return MOCK_COMMERCE_CATEGORIES;
  }

  return listLiveCategories(languageFromLocale(locale));
}

export async function listCommerceProductRouteEntries(): Promise<ReadonlyArray<StarterCommerceProductRouteEntry>> {
  const products = await listCommerceProducts();
  const entries: StarterCommerceProductRouteEntry[] = [];

  for (const product of products) {
    for (const route of Object.values(product.routes)) {
      if (route.name !== "product") {
        continue;
      }

      const routeSegment = productRouteSegment(route);
      if (!routeSegment) {
        continue;
      }

      entries.push({
        locale: normalizeLocaleCode(route.locale ?? "en"),
        routeSegment,
      });
    }
  }

  const deduped = new Map<string, StarterCommerceProductRouteEntry>();
  for (const entry of entries) {
    deduped.set(`${entry.locale}:${entry.routeSegment}`, entry);
  }

  return Array.from(deduped.values());
}

export async function listCommerceCategoryRouteEntries(): Promise<ReadonlyArray<StarterCommerceCategoryRouteEntry>> {
  const categories = await listCommerceCategories();
  const entries: StarterCommerceCategoryRouteEntry[] = [];

  for (const category of categories) {
    for (const route of Object.values(category.routes)) {
      if (route.name !== "category") {
        continue;
      }

      const slugSegments = routePathSegments(route);
      if (slugSegments.length === 0) {
        continue;
      }

      entries.push({
        locale: normalizeLocaleCode(route.locale ?? "en"),
        slugSegments,
      });
    }
  }

  const deduped = new Map<string, StarterCommerceCategoryRouteEntry>();
  for (const entry of entries) {
    deduped.set(`${entry.locale}:${entry.slugSegments.join("/")}`, entry);
  }

  return Array.from(deduped.values());
}

export async function findCommerceProductByRouteSegment(input: {
  readonly locale: string;
  readonly routeSegment: string;
}): Promise<StarterResolvedCommerceProduct | null> {
  const normalizedLocale = normalizeLocaleCode(input.locale);
  const products = await listCommerceProducts(normalizedLocale);

  for (const product of products) {
    const route = resolveRouteForLocale(product.routes, normalizedLocale, "product");
    if (!route) {
      continue;
    }

    const candidateSegment = productRouteSegment(route);
    if (!candidateSegment) {
      continue;
    }

    if (candidateSegment !== input.routeSegment) {
      continue;
    }

    return {
      record: product,
      locale: normalizedLocale,
      route,
      routeSegment: candidateSegment,
      canonicalPath: canonicalPathForRoute(route, normalizedLocale),
    };
  }

  return null;
}

export async function findCommerceCategoryBySlugSegments(input: {
  readonly locale: string;
  readonly slugSegments: ReadonlyArray<string>;
}): Promise<StarterResolvedCommerceCategory | null> {
  const normalizedLocale = normalizeLocaleCode(input.locale);
  const categories = await listCommerceCategories(normalizedLocale);
  const normalizedInputSlug = normalizePathSegments(input.slugSegments);

  for (const category of categories) {
    const route = resolveRouteForLocale(category.routes, normalizedLocale, "category");
    if (!route) {
      continue;
    }

    const candidateSegments = routePathSegments(route);
    if (candidateSegments.join("/") !== normalizedInputSlug.join("/")) {
      continue;
    }

    return {
      record: category,
      locale: normalizedLocale,
      route,
      slugSegments: candidateSegments,
      canonicalPath: canonicalPathForRoute(route, normalizedLocale),
    };
  }

  return null;
}

export async function listCommerceProductsForCategory(input: {
  readonly locale: string;
  readonly category: StarterResolvedCommerceCategory;
}): Promise<ReadonlyArray<StarterResolvedCommerceProduct>> {
  const normalizedLocale = normalizeLocaleCode(input.locale);
  const products = await listCommerceProducts(normalizedLocale);
  const categorySlug = input.category.slugSegments.join("/");
  const fallbackLanguage = parseLocaleCode(normalizedLocale).language;
  const result: StarterResolvedCommerceProduct[] = [];

  for (const product of products) {
    const route = resolveRouteForLocale(product.routes, normalizedLocale, "product");
    if (!route) {
      continue;
    }

    const routeSegment = productRouteSegment(route);
    if (!routeSegment) {
      continue;
    }

    const categoryById = typeof product.categoryId === "number"
      && typeof input.category.record.numericId === "number"
      && product.categoryId === input.category.record.numericId;

    const categoryBySlug = product.categorySlugs
      && (
        product.categorySlugs[normalizedLocale] === categorySlug
        || product.categorySlugs[fallbackLanguage] === categorySlug
      );

    if (!categoryById && !categoryBySlug) {
      continue;
    }

    result.push({
      record: product,
      locale: normalizedLocale,
      route,
      routeSegment,
      canonicalPath: canonicalPathForRoute(route, normalizedLocale),
    });
  }

  return result;
}

export async function listResolvedCommerceProducts(locale: string): Promise<ReadonlyArray<StarterResolvedCommerceProduct>> {
  const normalizedLocale = normalizeLocaleCode(locale);
  const products = await listCommerceProducts(normalizedLocale);
  const result: StarterResolvedCommerceProduct[] = [];

  for (const product of products) {
    const route = resolveRouteForLocale(product.routes, normalizedLocale, "product");
    if (!route) {
      continue;
    }

    const routeSegment = productRouteSegment(route);
    if (!routeSegment) {
      continue;
    }

    result.push({
      record: product,
      locale: normalizedLocale,
      route,
      routeSegment,
      canonicalPath: canonicalPathForRoute(route, normalizedLocale),
    });
  }

  return result.sort((a, b) => a.record.title.localeCompare(b.record.title, undefined, { sensitivity: "base" }));
}

export async function listResolvedCommerceCategories(
  locale: string,
): Promise<ReadonlyArray<StarterResolvedCommerceCategory>> {
  const normalizedLocale = normalizeLocaleCode(locale);
  const categories = await listCommerceCategories(normalizedLocale);
  const result: StarterResolvedCommerceCategory[] = [];

  for (const category of categories) {
    const route = resolveRouteForLocale(category.routes, normalizedLocale, "category");
    if (!route) {
      continue;
    }

    const slugSegments = routePathSegments(route);
    if (slugSegments.length === 0) {
      continue;
    }

    result.push({
      record: category,
      locale: normalizedLocale,
      route,
      slugSegments,
      canonicalPath: canonicalPathForRoute(route, normalizedLocale),
    });
  }

  return result.sort((a, b) => a.record.name.localeCompare(b.record.name, undefined, { sensitivity: "base" }));
}
