import {
  createRoutingConfig,
  type CmsRouteLinkResolver,
} from "@ominity/next/cms";
import {
  buildLocalizedRoutePath,
  createOminitySiteSupport,
  type OminityChannelContext,
  type OminityLocaleVariant,
  type ResolveLocaleForVariantInput,
} from "@ominity/next/next";

import { localizedCommerceTemplateMapForRoute } from "./commerce/route-translations";
import { getStarterOminityConfig } from "./env";
import { mockCmsClient } from "./mock-data";

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

const config = getStarterOminityConfig();
const productTemplateByLocale = localizedCommerceTemplateMapForRoute("product");
const categoryTemplateByLocale = localizedCommerceTemplateMapForRoute("category");
const cmsRouteTemplateRouting = createRoutingConfig({
  defaultLocale: config.defaultLocale,
  locales: config.locales,
  localeSegmentStrategy: "none",
  canonicalRedirectPolicy: config.canonicalRedirectPolicy,
  trailingSlash: false,
  basePath: "",
});

function resolveProductRoutePath(parameters: Readonly<Record<string, unknown>>, locale: string): string {
  const skuValue = parameters.sku;
  const sku = typeof skuValue === "number"
    ? `${skuValue}`
    : typeof skuValue === "string"
      ? skuValue.trim()
      : "";
  if (sku.length === 0) {
    throw new Error("Product route requires parameters.sku");
  }

  const slugSegments = normalizePathSegments(parameters.slug);
  if (slugSegments.length === 0) {
    throw new Error("Product route requires parameters.slug");
  }

  const slug = slugSegments.join("-");
  return buildLocalizedRoutePath({
    routing: cmsRouteTemplateRouting,
    locale,
    templateByLocale: productTemplateByLocale,
    params: {
      sku,
      slug,
    },
  });
}

function resolveCategoryRoutePath(parameters: Readonly<Record<string, unknown>>, locale: string): string {
  const slugSegments = normalizePathSegments(parameters.slug);
  if (slugSegments.length === 0) {
    throw new Error("Category route requires parameters.slug");
  }

  return buildLocalizedRoutePath({
    routing: cmsRouteTemplateRouting,
    locale,
    templateByLocale: categoryTemplateByLocale,
    params: {
      slug: [...slugSegments],
    },
  });
}

const commerceRouteResolvers: Readonly<Record<string, CmsRouteLinkResolver>> = {
  product: (context) => resolveProductRoutePath(context.route.parameters, context.locale),
  category: (context) => resolveCategoryRoutePath(context.route.parameters, context.locale),
};

const support = createOminitySiteSupport({
  getConfig: getStarterOminityConfig,
  mockClient: mockCmsClient,
  routeResolvers: commerceRouteResolvers,
});

export type StarterChannelContext = OminityChannelContext;
export type StarterLocaleVariant = OminityLocaleVariant;
export type { ResolveLocaleForVariantInput };

export const cmsRouting = support.cmsRouting;
export const cmsLinkResolver = support.cmsLinkResolver;
export const cmsLocalizedStringLinkResolver = support.cmsLocalizedStringLinkResolver;
export const getOminityDebugHttpClient = support.getDebugHttpClient;
export const getLiveCmsClient = support.getLiveCmsClient;
export const getCmsClient = support.getCmsClient;
export const getCmsPageByPath = support.getCmsPageByPath;
export const getCmsRoutes = support.getCmsRoutes;
export const getCmsMenus = support.getCmsMenus;
export const getMainMenu = support.getMainMenu;
export const getStarterChannelContext = support.getChannelContext;
export const getChannelAwareCmsRouting = support.getChannelAwareCmsRouting;
export const resolveRequestLocale = support.resolveRequestLocale;
export const resolveRequestSdkLanguage = support.resolveRequestSdkLanguage;
export const resolveRequestCountry = support.resolveRequestCountry;
export const variantMatchesCurrentStrategy = support.variantMatchesCurrentStrategy;
export const resolveLocaleForVariant = support.resolveLocaleForVariant;
export const generateLocaleStaticParamsForVariant = support.generateLocaleStaticParamsForVariant;
export const resetStarterOminitySiteCaches = support.resetCaches;
