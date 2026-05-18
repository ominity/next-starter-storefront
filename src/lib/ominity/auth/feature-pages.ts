import type { Metadata } from "next";
import { matchLocaleFromSegments, normalizeLocaleCode, type CmsRoutingConfig } from "@ominity/next/cms";
import { buildLocalizedSlugAlternates } from "@ominity/next/next";

import { getStarterOminityConfig } from "@/lib/ominity/env";
import { getStarterChannelContext } from "@/lib/ominity/channel-context";
import { resolveLocaleForVariant, type StarterLocaleVariant } from "@/lib/ominity/locale-variant";
import { getChannelAwareCmsRouting } from "@/lib/ominity/routing";

import {
  AUTH_UTILITY_ROUTES,
  type AuthUtilityRoute,
  authUtilityRouteDefinition,
  buildAuthUtilityPath,
  buildAuthUtilityPaths,
  type AuthUtilityPaths,
} from "./paths";

export type AuthFeature = "login" | "register" | "account" | "mfa";

export interface ResolveAuthFeaturePageInput {
  readonly feature: AuthFeature;
  readonly variant: StarterLocaleVariant;
  readonly localeSegment?: string;
  readonly countrySegment?: string;
}

export interface ResolvedAuthFeaturePage {
  readonly locale: string;
  readonly paths: AuthUtilityPaths;
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

function splitPath(path: string): ReadonlyArray<string> {
  return normalizePath(path).split("/").filter((segment) => segment.length > 0);
}

function removeBasePath(path: string, basePath: string): string {
  if (basePath.length === 0 || basePath === "/") {
    return normalizePath(path);
  }

  const normalizedPath = normalizePath(path);
  const normalizedBasePath = normalizePath(basePath);

  if (normalizedPath === normalizedBasePath) {
    return "/";
  }

  if (normalizedPath.startsWith(`${normalizedBasePath}/`)) {
    return normalizePath(normalizedPath.slice(normalizedBasePath.length));
  }

  return normalizedPath;
}

function resolveLocaleAndRoute(
  canonicalPath: string,
  routing: CmsRoutingConfig,
): {
  readonly locale: string;
  readonly route?: AuthUtilityRoute;
} {
  const normalizedCanonicalPath = normalizePath(canonicalPath);
  const relativePath = removeBasePath(normalizedCanonicalPath, routing.basePath);
  const segments = splitPath(relativePath);
  const matchedLocale = matchLocaleFromSegments(segments, routing);
  const locale = normalizeLocaleCode(matchedLocale?.locale ?? routing.defaultLocale);

  for (const route of AUTH_UTILITY_ROUTES) {
    const candidatePath = normalizePath(buildAuthUtilityPath(route, locale, routing));
    if (candidatePath === normalizedCanonicalPath) {
      return {
        locale,
        route,
      };
    }
  }

  return {
    locale,
  };
}

export function isAuthFeatureEnabled(_feature: AuthFeature): boolean {
  const config = getStarterOminityConfig();
  return config.enableAuth;
}

export async function resolveAuthFeaturePage(
  input: ResolveAuthFeaturePageInput,
): Promise<ResolvedAuthFeaturePage | null> {
  if (!isAuthFeatureEnabled(input.feature)) {
    return null;
  }

  const locale = await resolveLocaleForVariant({
    variant: input.variant,
    ...(typeof input.localeSegment === "string" ? { localeSegment: input.localeSegment } : {}),
    ...(typeof input.countrySegment === "string" ? { countrySegment: input.countrySegment } : {}),
  });

  if (!locale) {
    return null;
  }

  return {
    locale,
    paths: buildAuthUtilityPaths(locale),
  };
}

export async function buildAuthFeatureMetadata(input: {
  readonly title: string;
  readonly description: string;
  readonly canonicalPath: string;
}): Promise<Metadata> {
  const config = getStarterOminityConfig();
  const routing = await getChannelAwareCmsRouting();
  const channelContext = await getStarterChannelContext();
  const resolved = resolveLocaleAndRoute(input.canonicalPath, routing);

  if (resolved.route) {
    const definition = authUtilityRouteDefinition(resolved.route);
    const alternates = buildLocalizedSlugAlternates({
      routing,
      locale: resolved.locale,
      slugByLocale: definition.slugByLocale,
      baseUrl: config.siteUrl,
      countries: channelContext.countries,
      languages: channelContext.languages,
      ...(typeof definition.prefixPath === "string" ? { prefixPath: definition.prefixPath } : {}),
    }).alternates;
    const canonicalUrl = alternates.canonical ?? new URL(input.canonicalPath, config.siteUrl).toString();

    return {
      title: input.title,
      description: input.description,
      alternates,
      openGraph: {
        title: input.title,
        description: input.description,
        url: canonicalUrl,
        locale: resolved.locale,
      },
    };
  }

  const canonicalUrl = new URL(input.canonicalPath, config.siteUrl).toString();

  return {
    title: input.title,
    description: input.description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: input.title,
      description: input.description,
      url: canonicalUrl,
    },
  };
}
