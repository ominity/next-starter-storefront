import { createCmsLinkResolver, normalizeLocaleCode, parseLocaleCode, type CmsRoutingConfig } from "@ominity/next/cms";
import {
  buildLocalizedRoutePath,
  resolveLocalizedRouteTemplate,
  type LocalizedRouteTemplateMap,
  type RouteTemplateParams,
} from "@ominity/next/next";

import en from "@/locales/routes/en.json";
import nl from "@/locales/routes/nl.json";

/**
 * The starter's own pages, with their path per language (`src/locales/routes/*.json`). Add a language by adding a
 * file here; missing languages fall back to the first one.
 */
const TEMPLATES = { en, nl } as const;

export type RouteName = keyof typeof en;
export type FixedRouteName = Exclude<RouteName, "product" | "category" | "invitation">;
export type RoutePaths = Readonly<Record<FixedRouteName | "home", string>>;

export interface RouteMatch {
  readonly name: RouteName;
  readonly params: Readonly<Record<string, string>>;
}

const FIXED_ROUTES = Object.keys(en).filter(
  (name): name is FixedRouteName => !["product", "category", "invitation"].includes(name),
);

function templatesFor(name: RouteName): LocalizedRouteTemplateMap {
  return Object.fromEntries(Object.entries(TEMPLATES).map(([language, routes]) => [language, routes[name]]));
}

/** The localized path of one of the starter's pages, with the locale prefix of the current strategy. */
export function routePath(name: RouteName, locale: string, routing: CmsRoutingConfig, params?: RouteTemplateParams): string {
  return buildLocalizedRoutePath({ routing, locale, templateByLocale: templatesFor(name), ...(params ? { params } : {}) });
}

/** Every fixed page's path for a locale, for links and the header. */
export function routePaths(locale: string, routing: CmsRoutingConfig): RoutePaths {
  const paths = Object.fromEntries(FIXED_ROUTES.map((name) => [name, routePath(name, locale, routing)]));
  const home = createCmsLinkResolver({ config: routing, stringLinkStrategy: "localize-relative" }).resolve("/", { locale }).href;
  return { ...paths, home } as RoutePaths;
}

function escape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Matches the path after the locale prefix against the templates of that locale. A placeholder that is a whole last
 * segment, like the category `{slug}`, takes all remaining segments.
 */
export function matchRoute(segments: ReadonlyArray<string>, locale: string): RouteMatch | null {
  const language = parseLocaleCode(normalizeLocaleCode(locale)).language;

  for (const name of Object.keys(en) as RouteName[]) {
    const template = resolveLocalizedRouteTemplate({ templateByLocale: templatesFor(name), locale: language });
    const parts = template.split("/").filter(Boolean);
    const last = parts.at(-1) ?? "";
    const rest = /^\{(\w+)\}$/.test(last) && segments.length >= parts.length
      ? [...segments.slice(0, parts.length - 1), segments.slice(parts.length - 1).join("/")]
      : segments;
    if (rest.length !== parts.length) continue;

    const params: Record<string, string> = {};
    const matched = parts.every((part, index) => {
      const keys: string[] = [];
      const pattern = escape(part).replace(/\\\{(\w+)\\\}/g, (_, key: string) => {
        keys.push(key);
        return "(.+?)";
      });
      const values = new RegExp(`^${pattern}$`).exec(rest[index] ?? "");
      keys.forEach((key, position) => {
        params[key] = values?.[position + 1] ?? "";
      });
      return values !== null;
    });
    if (matched) return { name, params };
  }

  return null;
}

/** The localized URL of an SDK `Product`, usable in client components (e.g. for wishlist items). */
export function productPath(
  product: { readonly sku: string; readonly routes: Readonly<Record<string, { readonly parameters: Readonly<Record<string, unknown>> }>> },
  locale: string,
  routing: CmsRoutingConfig,
): string | null {
  const language = parseLocaleCode(normalizeLocaleCode(locale)).language;
  const slug = (product.routes[language] ?? Object.values(product.routes)[0])?.parameters.slug;
  return typeof slug === "string" && slug ? routePath("product", locale, routing, { sku: product.sku, slug }) : null;
}
