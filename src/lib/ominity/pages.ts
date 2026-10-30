import "server-only";

import type { Category, Product } from "@ominity/api-typescript/models";
import {
  matchLocaleFromSegments,
  normalizeLocaleCode,
  parseLocaleCode,
  type CmsPage,
  type CmsRoutingConfig,
} from "@ominity/next/cms";
import { fetchCmsPageForParams } from "@ominity/next/next";
import { cache } from "react";

import { config } from "./config";
import { matchRoute, routePath, type RouteName } from "./routes";
import { ominity } from "./sdk";
import { cmsLinkResolver, getCmsClient, getCmsRoutes, getRouting } from "./site";

interface ResolvedBase {
  readonly locale: string;
  readonly canonicalPath: string;
  /** This page in every channel language, by locale code. */
  readonly alternates: Readonly<Record<string, string>>;
  readonly redirect: boolean;
}

export type ResolvedPage = ResolvedBase & (
  | { readonly kind: "cms"; readonly page: CmsPage }
  | { readonly kind: "product"; readonly product: Product }
  | { readonly kind: "category"; readonly category: Category }
  | { readonly kind: Exclude<RouteName, "product" | "category">; readonly params: Readonly<Record<string, string>> }
);

function language(locale: string): string {
  return parseLocaleCode(normalizeLocaleCode(locale)).language;
}

/** Compares a built path with the incoming one, ignoring the base path, a trailing slash and encoding. */
function samePath(built: string, incoming: string): boolean {
  const normalize = (path: string) => {
    const withoutBase = config.basePath && path.startsWith(config.basePath) ? path.slice(config.basePath.length) : path;
    try {
      return decodeURIComponent(withoutBase.replace(/\/+$/, "") || "/");
    } catch {
      return withoutBase;
    }
  };
  return normalize(built) === normalize(incoming);
}

/** `routePath` for every channel locale; `paramsFor` returns null when the page doesn't exist in a language. */
function localize(
  name: RouteName,
  routing: CmsRoutingConfig,
  incoming: string,
  locale: string,
  paramsFor: (language: string) => Readonly<Record<string, string | ReadonlyArray<string>>> | null = () => ({}),
): ResolvedBase | null {
  const alternates: Record<string, string> = {};
  for (const { code } of routing.locales) {
    const params = paramsFor(language(code));
    if (params) alternates[code] = routePath(name, code, routing, params);
  }
  const params = paramsFor(language(locale));
  if (!params) return null;
  const canonicalPath = routePath(name, locale, routing, params);
  return {
    locale,
    canonicalPath,
    alternates,
    redirect: config.canonicalRedirectPolicy === "if-not-canonical" && !samePath(canonicalPath, incoming),
  };
}

/** The route for a language, or the first one when the item has none for it (like `linkTo`). */
function routeFor<T>(routes: Readonly<Record<string, T>>, lang: string): T | undefined {
  return routes[lang] ?? Object.values(routes)[0];
}

function slugSegments(slug: unknown): string[] {
  return (Array.isArray(slug) ? slug : String(slug ?? "").split("/")).map(String).filter(Boolean);
}

/** Product URLs are `{sku}-{slug}` and SKUs may contain dashes, so try the longest SKU first. */
async function findProduct(segment: string, locale: string): Promise<Product | null> {
  const parts = segment.split("-");
  for (let end = parts.length - 1; end >= 1; end -= 1) {
    const sku = parts.slice(0, end).join("-");
    const { items } = await ominity(locale).commerce.products.list({ filter: { sku }, include: "offers", limit: 25 });
    const product = items.find((item) => item.sku === sku);
    if (product) return product;
  }
  return null;
}

async function resolveCms(segments: ReadonlyArray<string>, locale: string, preview: boolean): Promise<ResolvedPage | null> {
  const resolved = await fetchCmsPageForParams({
    client: getCmsClient(),
    routes: await getCmsRoutes({ preview }),
    params: { path: segments },
    routing: await getRouting(),
    catchAllParam: "path",
    preview,
  }).catch(() => null);
  if (!resolved) return null;

  const alternates = Object.fromEntries(resolved.page.translations.map((translation) => [
    translation.locale,
    cmsLinkResolver.resolve(translation.path, { locale: translation.locale }).href,
  ]));
  return {
    kind: "cms",
    page: resolved.page,
    locale: resolved.route.locale ?? locale,
    canonicalPath: resolved.route.canonicalPath,
    alternates,
    redirect: resolved.route.shouldRedirect,
  };
}

/**
 * Turns a URL into one of the starter's pages: a fixed page (cart, login, …), a product, a category or a CMS page.
 * Locale prefixes follow `OMINITY_LOCALE_SEGMENT_STRATEGY`; the paths of fixed pages come from `src/locales/routes`.
 */
export const resolvePage = cache(async (path: string, preview: boolean): Promise<ResolvedPage | null> => {
  const segments = path.split("/").filter(Boolean);
  const routing = await getRouting();
  const localeMatch = matchLocaleFromSegments(segments, routing);
  const locale = normalizeLocaleCode(localeMatch?.locale ?? routing.defaultLocale);
  const rest = segments.slice(localeMatch?.consumedSegments ?? 0);
  const incoming = `/${segments.join("/")}`;
  const match = matchRoute(rest, locale);

  if (match?.name === "product") {
    const product = await findProduct(`${match.params.sku}-${match.params.slug}`, locale);
    if (!product) return null;
    const base = localize("product", routing, incoming, locale, (lang) => {
      const route = routeFor(product.routes, lang);
      return route ? { sku: product.sku, slug: String(route.parameters.slug ?? "") } : null;
    });
    return base && { ...base, kind: "product", product };
  }

  if (match?.name === "category") {
    const { items } = await ominity(locale).commerce.categories.list({ filter: { slug: match.params.slug }, limit: 1 });
    const category = items[0];
    if (!category) return null;
    const base = localize("category", routing, incoming, locale, (lang) => {
      const route = routeFor(category.routes, lang);
      return route ? { slug: slugSegments(route.parameters.slug) } : null;
    });
    return base && { ...base, kind: "category", category };
  }

  if (match) {
    const base = localize(match.name, routing, incoming, locale, () => match.params);
    return base && { ...base, kind: match.name, params: match.params };
  }

  return resolveCms(segments, locale, preview);
});
