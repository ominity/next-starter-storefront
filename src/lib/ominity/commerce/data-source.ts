import { Ominity } from "@ominity/api-typescript";
import { normalizeLocaleCode, parseLocaleCode, type CmsRouteObject } from "@ominity/next/cms";
import { buildLocalizedRoutePath } from "@ominity/next/next";

import { getStarterOminityConfig } from "@/lib/ominity/env";
import { cmsLinkResolver, cmsRouting } from "@/lib/ominity/routing";

import {
  MOCK_COMMERCE_CATEGORIES,
  MOCK_COMMERCE_PRODUCTS,
} from "./mock-data";
import {
  localizedCommerceTemplateMapForRoute,
} from "./route-translations";
import type {
  StarterCommerceCategoryRecord,
  StarterCommerceCategoryRouteEntry,
  StarterCommerceProductRecord,
  StarterCommerceProductRouteEntry,
  StarterResolvedCommerceCategory,
  StarterResolvedCommerceProduct,
} from "./types";

const liveCommerceSdkByLanguage = new Map<string, Ominity>();
const PRODUCT_TEMPLATE_BY_LOCALE = localizedCommerceTemplateMapForRoute("product");
const CATEGORY_TEMPLATE_BY_LOCALE = localizedCommerceTemplateMapForRoute("category");

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

function asArray(value: unknown): ReadonlyArray<unknown> {
  return Array.isArray(value) ? value : [];
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

function recordId(input: UnknownRecord): { readonly id: string; readonly numericId?: number } | null {
  const idValue = asString(input.id) ?? (typeof input.id === "number" ? `${input.id}` : null);
  if (!idValue) {
    return null;
  }

  return {
    id: idValue,
    ...(typeof input.id === "number" ? { numericId: input.id } : {}),
  };
}

function asNullableNumber(value: unknown): number | null | undefined {
  if (value === null) {
    return null;
  }

  return asNumber(value);
}

function customFieldValue(
  input: UnknownRecord,
  keys: ReadonlyArray<string>,
): unknown {
  for (const key of keys) {
    if (key in input) {
      return input[key];
    }
  }

  const customFields = asArray(input.customFields);
  for (const field of customFields) {
    if (!isRecord(field)) {
      continue;
    }

    const fieldKey = asString(field.key) ?? asString(field.name) ?? asString(field.slug);
    if (!fieldKey) {
      continue;
    }

    if (!keys.includes(fieldKey)) {
      continue;
    }

    if ("value" in field) {
      return field.value;
    }
  }

  return undefined;
}

function normalizeProductOffers(input: UnknownRecord) {
  const embedded = isRecord(input._embedded) ? input._embedded : null;
  const offerEntries = [
    ...asArray(input.offers),
    ...(embedded ? asArray(embedded.offers) : []),
  ];
  const offers = offerEntries
    .map((entry) => {
      if (!isRecord(entry)) {
        return null;
      }

      const id = recordId(entry);
      if (!id) {
        return null;
      }

      const priceEntries = isRecord(entry.prices) ? entry.prices : {};
      const prices: Record<string, { amount: number; formatted?: string }> = {};

      for (const [currencyCode, moneyValue] of Object.entries(priceEntries)) {
        if (!isRecord(moneyValue)) {
          continue;
        }

        const amount = asPrice(moneyValue.amount);
        if (typeof amount !== "number") {
          continue;
        }

        const formatted = asString(moneyValue.formatted);
        prices[currencyCode] = {
          amount,
          ...(typeof formatted === "string" ? { formatted } : {}),
        };
      }

      const type = asString(entry.type);
      const quantity = asNumber(entry.quantity);
      const intervalId = asNullableNumber(entry.intervalId);

      return {
        ...id,
        ...(typeof type === "string" ? { type } : {}),
        ...(typeof quantity === "number" ? { quantity } : {}),
        ...(typeof intervalId !== "undefined" ? { intervalId } : {}),
        prices,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  return offers;
}

function extractCategorySlugsFromRoutes(
  routes: Readonly<Record<string, CmsRouteObject>>,
): Readonly<Record<string, string>> | undefined {
  const categorySlugs: Record<string, string> = {};

  for (const [localeCode, route] of Object.entries(routes)) {
    if (route.name !== "category") {
      continue;
    }

    const slug = normalizePathSegments(route.parameters.slug).join("/");
    if (slug.length === 0) {
      continue;
    }

    const normalizedLocale = normalizeLocaleCode(localeCode);
    categorySlugs[normalizedLocale] = slug;

    const language = parseLocaleCode(normalizedLocale).language;
    if (language.length > 0 && !categorySlugs[language]) {
      categorySlugs[language] = slug;
    }
  }

  return Object.keys(categorySlugs).length > 0 ? categorySlugs : undefined;
}

function normalizeCategorySlugMap(input: unknown): Readonly<Record<string, string>> | undefined {
  if (!isRecord(input)) {
    return undefined;
  }

  const result: Record<string, string> = {};
  for (const [localeKey, value] of Object.entries(input)) {
    const slug = normalizePathSegments(value).join("/");
    if (slug.length === 0) {
      continue;
    }

    const normalizedLocale = normalizeLocaleCode(localeKey);
    result[normalizedLocale] = slug;

    const language = parseLocaleCode(normalizedLocale).language;
    if (language.length > 0 && !result[language]) {
      result[language] = slug;
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function normalizeProductCategory(input: UnknownRecord) {
  const embedded = isRecord(input._embedded) ? input._embedded : null;
  const rawCategory = isRecord(input.category)
    ? input.category
    : embedded && isRecord(embedded.category)
      ? embedded.category
      : null;

  if (!rawCategory) {
    return null;
  }

  const categoryId = recordId(rawCategory);
  if (!categoryId) {
    return null;
  }

  const name = asString(rawCategory.name);
  const slug = asString(rawCategory.slug);
  const fullSlug = asString(rawCategory.fullSlug);
  const routes = normalizeRouteMap(rawCategory.routes);
  const categorySlugs = extractCategorySlugsFromRoutes(routes);

  return {
    category: {
      ...categoryId,
      ...(typeof name === "string" ? { name } : {}),
      ...(typeof slug === "string" ? { slug } : {}),
      ...(typeof fullSlug === "string" ? { fullSlug } : {}),
    },
    ...(typeof categoryId.numericId === "number" ? { categoryId: categoryId.numericId } : {}),
    ...(categorySlugs ? { categorySlugs } : {}),
  };
}

function normalizeProductGroups(input: UnknownRecord) {
  const embedded = isRecord(input._embedded) ? input._embedded : null;
  const groupEntries = [
    ...asArray(input.groups),
    ...(embedded ? asArray(embedded.product_groups) : []),
    ...(embedded ? asArray(embedded.groups) : []),
  ];

  const groups = groupEntries
    .map((entry) => {
      if (!isRecord(entry)) {
        return null;
      }

      const id = recordId(entry);
      if (!id) {
        return null;
      }

      const name = asString(entry.name);
      const slug = asString(entry.slug);
      const displayType = asString(customFieldValue(entry, ["displayType", "display_type", "type"]));
      const image = asString(customFieldValue(entry, ["image", "coverImage", "icon"]));
      const color = asString(customFieldValue(entry, ["color", "colour"]));
      const label = asString(customFieldValue(entry, ["label", "title"]));

      return {
        ...id,
        ...(typeof name === "string" ? { name } : {}),
        ...(typeof slug === "string" ? { slug } : {}),
        ...(typeof displayType === "string" ? { displayType } : {}),
        ...(typeof image === "string" ? { image } : {}),
        ...(typeof color === "string" ? { color } : {}),
        ...(typeof label === "string" ? { label } : {}),
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  if (groups.length === 0) {
    return undefined;
  }

  const deduped = new Map<string, (typeof groups)[number]>();
  for (const group of groups) {
    deduped.set(group.id, group);
  }

  return Array.from(deduped.values());
}

function resolveProductPrice(
  input: UnknownRecord,
  offers: ReadonlyArray<ReturnType<typeof normalizeProductOffers>[number]>,
): { readonly price?: number; readonly currency?: string } {
  const primaryOffer = offers.find((offer) => offer.quantity === 1) ?? offers[0];
  if (primaryOffer) {
    const [currencyCode, value] = Object.entries(primaryOffer.prices)[0] ?? [];
    const amount = value?.amount;
    if (typeof currencyCode === "string" && typeof amount === "number") {
      return {
        price: amount,
        currency: currencyCode,
      };
    }
  }

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
      const skuValue = route.parameters.sku;
      const sku = typeof skuValue === "number"
        ? `${skuValue}`
        : typeof skuValue === "string"
          ? skuValue.trim()
          : "";
      const slugSegments = normalizePathSegments(route.parameters.slug);

      if (sku.length > 0 && slugSegments.length > 0) {
        try {
          return buildLocalizedRoutePath({
            routing: cmsRouting,
            locale,
            templateByLocale: PRODUCT_TEMPLATE_BY_LOCALE,
            params: {
              sku,
              slug: slugSegments.join("-"),
            },
          });
        } catch {
          // Fall through to legacy fallback below.
        }
      }

      const segment = productRouteSegment(route);
      return segment ? `/p/${segment}` : "/";
    }

    const segments = routePathSegments(route);
    if (segments.length > 0) {
      try {
        return buildLocalizedRoutePath({
          routing: cmsRouting,
          locale,
          templateByLocale: CATEGORY_TEMPLATE_BY_LOCALE,
          params: {
            slug: [...segments],
          },
        });
      } catch {
        // Fall through to legacy fallback below.
      }
    }

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

  const productId = recordId(input);
  if (!productId) {
    return null;
  }

  const shortDescription = asString(input.shortDescription);
  const description = asString(input.description);
  const coverImage = asString(input.coverImage);
  const stock = asNumber(input.stock);
  const categoryId = asNumber(input.categoryId);
  const offers = normalizeProductOffers(input);
  const pricing = resolveProductPrice(input, offers);
  const category = normalizeProductCategory(input);
  const directCategorySlugs = normalizeCategorySlugMap(input.categorySlugs);
  const groups = normalizeProductGroups(input);

  return {
    ...productId,
    sku,
    title,
    ...(typeof shortDescription === "string" ? { shortDescription } : {}),
    ...(typeof description === "string" ? { description } : {}),
    ...(typeof coverImage === "string" ? { coverImage } : {}),
    ...(typeof stock === "number" ? { stock } : {}),
    ...(typeof categoryId === "number" ? { categoryId } : {}),
    ...(directCategorySlugs ? { categorySlugs: directCategorySlugs } : {}),
    ...(category ? category : {}),
    ...(offers.length > 0 ? { offers } : {}),
    ...(groups ? { groups } : {}),
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

  const categoryId = recordId(input);
  if (!categoryId) {
    return null;
  }

  const description = asString(input.description);
  const coverImage = asString(input.coverImage);
  const productsCount = asNumber(input.productsCount);
  const fullSlug = asString(input.fullSlug);

  return {
    ...categoryId,
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

async function parseResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.toLowerCase().includes("json")) {
    return response.json();
  }

  return response.text();
}

function readEmbeddedCollection(payload: unknown, key: string): ReadonlyArray<unknown> {
  if (!isRecord(payload)) {
    return [];
  }

  const embedded = payload._embedded;
  if (!isRecord(embedded)) {
    return [];
  }

  const entries = embedded[key];
  return Array.isArray(entries) ? entries : [];
}

function logCommerceDataError(message: string, details: UnknownRecord): void {
  const config = getStarterOminityConfig();
  if (!config.debugLogs) {
    return;
  }

  console.warn(`[ominity commerce] ${message}`, details);
}

async function listLiveProducts(language?: string): Promise<ReadonlyArray<StarterCommerceProductRecord>> {
  const sdk = getLiveCommerceSdk(language);
  if (!sdk) {
    return [];
  }

  const config = getStarterOminityConfig();
  try {
    const response = await sdk.http.get("/commerce/products", {
      query: {
        include: "offers,category,groups",
        limit: config.commerceListLimit,
      },
    });
    const payload = await parseResponseBody(response);
    const items = readEmbeddedCollection(payload, "products");

    return items
      .map((item) => normalizeLiveProduct(item))
      .filter((item): item is StarterCommerceProductRecord => item !== null);
  } catch (error) {
    logCommerceDataError("Failed to list live products.", {
      ...(typeof language === "string" ? { language } : {}),
      error,
    });
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
    const response = await sdk.http.get("/commerce/categories", {
      query: {
        limit: config.commerceListLimit,
      },
    });
    const payload = await parseResponseBody(response);
    const items = readEmbeddedCollection(payload, "categories");

    return items
      .map((item) => normalizeLiveCategory(item))
      .filter((item): item is StarterCommerceCategoryRecord => item !== null);
  } catch (error) {
    logCommerceDataError("Failed to list live categories.", {
      ...(typeof language === "string" ? { language } : {}),
      error,
    });
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
