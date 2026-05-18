import {
  createCmsLinkResolver,
  createRoutingConfig,
  type CmsRouteLinkResolver,
  type CmsRoutingConfig,
} from "@ominity/next/cms";
import { buildLocalizedRoutePath } from "@ominity/next/next";

import { getStarterChannelContext } from "./channel-context";
import {
  localizedCommerceTemplateMapForRoute,
} from "./commerce/route-translations";
import { getStarterOminityConfig } from "./env";

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
  product: (context) => {
    return resolveProductRoutePath(context.route.parameters, context.locale);
  },
  category: (context) => {
    return resolveCategoryRoutePath(context.route.parameters, context.locale);
  },
};

export const cmsRouting = createRoutingConfig({
  defaultLocale: config.defaultLocale,
  locales: config.locales,
  localeSegmentStrategy: config.localeSegmentStrategy,
  canonicalRedirectPolicy: config.canonicalRedirectPolicy,
  trailingSlash: config.trailingSlash,
  basePath: config.basePath,
});

export const cmsLinkResolver = createCmsLinkResolver({
  config: cmsRouting,
  stringLinkStrategy: config.stringLinkStrategy,
  routeResolvers: commerceRouteResolvers,
});

export const cmsLocalizedStringLinkResolver = createCmsLinkResolver({
  config: cmsRouting,
  stringLinkStrategy: "localize-relative",
  routeResolvers: commerceRouteResolvers,
});

let cachedChannelAwareRoutingPromise: Promise<CmsRoutingConfig> | null = null;

export async function getChannelAwareCmsRouting(): Promise<CmsRoutingConfig> {
  if (cachedChannelAwareRoutingPromise) {
    return cachedChannelAwareRoutingPromise;
  }

  cachedChannelAwareRoutingPromise = (async () => {
    const channel = await getStarterChannelContext();
    const currentConfig = getStarterOminityConfig();

    return createRoutingConfig({
      defaultLocale: channel.defaultLocale,
      locales: channel.locales,
      localeSegmentStrategy: currentConfig.localeSegmentStrategy,
      canonicalRedirectPolicy: currentConfig.canonicalRedirectPolicy,
      trailingSlash: currentConfig.trailingSlash,
      basePath: currentConfig.basePath,
    });
  })();

  return cachedChannelAwareRoutingPromise;
}
