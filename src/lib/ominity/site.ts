import {
  createRoutingConfig,
  normalizeLocaleCode,
  parseLocaleCode,
  type CmsRouteLinkResolver,
  type CmsRouteObject,
} from "@ominity/next/cms";
import { createOminitySiteSupport } from "@ominity/next/next";

import { config } from "./config";
import { routePath, type RouteName } from "./routes";

/** Product and category links follow the starter's localized templates; the link resolver adds the locale prefix. */
function templateResolver(name: RouteName): CmsRouteLinkResolver {
  return ({ route, locale }) => {
    const slug = route.parameters.slug;
    const segments = (Array.isArray(slug) ? slug : String(slug ?? "").split("/")).map(String).filter(Boolean);
    const routing = createRoutingConfig({ defaultLocale: locale, locales: [], localeSegmentStrategy: "none" });
    return routePath(name, locale, routing, name === "product"
      ? { sku: String(route.parameters.sku ?? ""), slug: segments.join("-") }
      : { slug: segments });
  };
}

const site = createOminitySiteSupport({
  getConfig: () => ({
    apiUrl: config.apiUrl,
    ...(config.apiKey ? { apiKey: config.apiKey } : {}),
    debugLogs: config.debugLogs,
    devTool: config.devTool,
    localeSegmentStrategy: config.localeSegmentStrategy,
    canonicalRedirectPolicy: config.canonicalRedirectPolicy,
    stringLinkStrategy: config.stringLinkStrategy,
    trailingSlash: config.trailingSlash,
    basePath: config.basePath,
    homeLocaleRedirectCookieName: config.homeLocaleRedirectCookieName,
  }),
  routeResolvers: {
    product: templateResolver("product"),
    category: templateResolver("category"),
  },
});

export const cmsLinkResolver = site.cmsLinkResolver;
export const getCmsClient = site.getCmsClient;
export const getCmsRoutes = site.getCmsRoutes;
/** Routing for the current channel's languages and the configured locale strategy. */
export const getRouting = site.getChannelAwareCmsRouting;
/** Languages, countries and currencies of the current channel. */
export const getChannel = site.getChannelContext;
export const getDevToolChannelInfo = site.getDevToolChannelInfo;
export const getDevToolHttpClient = site.getDevToolHttpClient;
export const resolveRequestSdkLanguage = site.resolveRequestSdkLanguage;
export const resolveRequestCountry = site.resolveRequestCountry;

/** The localized URL of anything with SDK `routes`, such as a `Product` or `Category`; null when it has no route. */
export function linkTo(entity: { readonly routes: Readonly<Record<string, unknown>> }, locale: string): string | null {
  const language = parseLocaleCode(normalizeLocaleCode(locale)).language;
  const route = entity.routes[language] ?? Object.values(entity.routes)[0];
  try {
    return route ? cmsLinkResolver.resolve(route as CmsRouteObject, { locale }).href : null;
  } catch {
    return null;
  }
}
