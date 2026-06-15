import { createCmsLinkResolver, normalizeLocaleCode, type CmsRoutingConfig } from "@ominity/next/cms";
import {
  buildLocalizedStaticPath,
  type LocalizedSlugMap,
} from "@ominity/next/next";

import enAuthRouteSlugs from "@/locales/routes/auth/en.json";
import nlAuthRouteSlugs from "@/locales/routes/auth/nl.json";
import { cmsRouting } from "@/lib/ominity/site";

export type AuthUtilityRoute =
  | "login"
  | "register"
  | "account"
  | "mfa"
  | "forgotPassword"
  | "resetPassword";

export const AUTH_UTILITY_ROUTES: ReadonlyArray<AuthUtilityRoute> = [
  "login",
  "register",
  "account",
  "mfa",
  "forgotPassword",
  "resetPassword",
];

interface LocalizedStaticRouteDefinition {
  readonly prefixPath?: string;
  readonly slugByLocale: LocalizedSlugMap;
}

const AUTH_ROUTE_SLUGS_BY_LANGUAGE = {
  en: enAuthRouteSlugs,
  nl: nlAuthRouteSlugs,
} as const satisfies Readonly<Record<string, Record<AuthUtilityRoute, string>>>;

const AUTH_ROUTE_PREFIXES: Readonly<Record<AuthUtilityRoute, string | undefined>> = {
  login: "/auth",
  register: "/auth",
  account: "/",
  mfa: "/auth",
  forgotPassword: "/auth",
  resetPassword: "/auth",
};

function localizedSlugMapForRoute(route: AuthUtilityRoute): LocalizedSlugMap {
  const entries = Object.entries(AUTH_ROUTE_SLUGS_BY_LANGUAGE).map(([language, dictionary]) => {
    const slug = dictionary[route];
    return [language, typeof slug === "string" ? slug : ""] as const;
  });
  return Object.fromEntries(entries);
}

export function authUtilityRouteDefinition(route: AuthUtilityRoute): LocalizedStaticRouteDefinition {
  return {
    ...(typeof AUTH_ROUTE_PREFIXES[route] === "string" ? { prefixPath: AUTH_ROUTE_PREFIXES[route] } : {}),
    slugByLocale: localizedSlugMapForRoute(route),
  };
}

export interface AuthUtilityPaths {
  readonly home: string;
  readonly login: string;
  readonly register: string;
  readonly account: string;
  readonly mfa: string;
  readonly forgotPassword: string;
  readonly resetPassword: string;
}

export function buildAuthUtilityPath(
  route: AuthUtilityRoute,
  locale: string,
  routing: CmsRoutingConfig = cmsRouting,
): string {
  const normalizedLocale = normalizeLocaleCode(locale);
  const definition = authUtilityRouteDefinition(route);

  return buildLocalizedStaticPath({
    routing,
    locale: normalizedLocale,
    slugByLocale: definition.slugByLocale,
    ...(typeof definition.prefixPath === "string" ? { prefixPath: definition.prefixPath } : {}),
  });
}

export function buildAuthUtilityPaths(locale: string, routing: CmsRoutingConfig = cmsRouting): AuthUtilityPaths {
  const resolver = createCmsLinkResolver({
    config: routing,
    stringLinkStrategy: "localize-relative",
  });
  const home = resolver.resolve("/", { locale: normalizeLocaleCode(locale) }).href;

  return {
    home,
    login: buildAuthUtilityPath("login", locale, routing),
    register: buildAuthUtilityPath("register", locale, routing),
    account: buildAuthUtilityPath("account", locale, routing),
    mfa: buildAuthUtilityPath("mfa", locale, routing),
    forgotPassword: buildAuthUtilityPath("forgotPassword", locale, routing),
    resetPassword: buildAuthUtilityPath("resetPassword", locale, routing),
  };
}
