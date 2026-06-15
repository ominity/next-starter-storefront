import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import {
  fetchCmsPageForParams,
  generateCmsStaticParams,
  resolveCmsPathFromParams,
  resolveDraftMode,
} from "@ominity/next/next";
import { buildNextMetadataFromPage } from "@ominity/next/next";
import { renderCmsPage } from "@ominity/next/cms/rendering";
import {
  localePrefixSegments,
  matchLocaleFromSegments,
  normalizeLocaleCode,
  type CmsPage,
  type CmsRoutingConfig,
} from "@ominity/next/cms";

import { getStarterChannelContext } from "@/lib/ominity/site";
import { getCmsClient, getCmsRoutes } from "@/lib/ominity/site";
import { getStarterOminityConfig } from "@/lib/ominity/env";
import { cmsRegistry, cmsRendererOptions } from "@/lib/ominity/registry";
import { getChannelAwareCmsRouting } from "@/lib/ominity/site";
import type { CmsRenderContext as StarterRenderContext } from "@ominity/next/cms";

export const dynamicParams = true;
export const revalidate = 300;

type CmsPageParams = Readonly<Record<string, string | readonly string[] | undefined>> & {
  segment?: string[];
};

interface CmsPageProps {
  params: Promise<CmsPageParams>;
}

interface ResolvedCmsRoute {
  readonly locale: string;
  readonly incomingPath: string;
  readonly localizedPath: string;
  readonly canonicalPath: string;
  readonly shouldRedirect: boolean;
}

interface ResolvedCmsResult {
  readonly page: CmsPage;
  readonly route: ResolvedCmsRoute;
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

function joinPath(segments: ReadonlyArray<string>): string {
  if (segments.length === 0) {
    return "/";
  }

  return `/${segments.join("/")}`;
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

function localizeVisiblePath(path: string, locale: string, routing: CmsRoutingConfig): string {
  const routeSegments = splitPath(path);
  const prefixSegments = localePrefixSegments(locale, routing);
  const combined = [...prefixSegments, ...routeSegments];
  const localizedPath = joinPath(combined);

  const withBasePath = routing.basePath.length > 0
    ? normalizePath(`${routing.basePath}${localizedPath === "/" ? "" : localizedPath}`)
    : localizedPath;

  if (routing.trailingSlash && withBasePath !== "/") {
    return `${withBasePath}/`;
  }

  return withBasePath;
}

function resolveFallbackRoute(incomingPath: string, routing: CmsRoutingConfig): ResolvedCmsRoute {
  const normalizedIncomingPath = normalizePath(incomingPath);
  const relativePath = removeBasePath(normalizedIncomingPath, routing.basePath);
  const segments = splitPath(relativePath);
  const matchedLocale = matchLocaleFromSegments(segments, routing);
  const consumedSegments = matchedLocale?.consumedSegments ?? 0;
  const locale = normalizeLocaleCode(matchedLocale?.locale ?? routing.defaultLocale);
  const localizedPath = joinPath(segments.slice(consumedSegments));
  const canonicalPath = localizeVisiblePath(localizedPath, locale, routing);

  return {
    locale,
    incomingPath: normalizedIncomingPath,
    localizedPath: normalizePath(localizedPath),
    canonicalPath,
    shouldRedirect: routing.canonicalRedirectPolicy === "if-not-canonical"
      && normalizedIncomingPath !== normalizePath(canonicalPath),
  };
}

const resolveCmsResult = async (params: CmsPageParams, preview: boolean): Promise<ResolvedCmsResult | null> => {
  const client = getCmsClient();
  const routing = await getChannelAwareCmsRouting();
  const incomingPath = resolveCmsPathFromParams({
    params,
    catchAllParam: "segment",
  });

  try {
    const routes = await getCmsRoutes({ preview });
    if (routes.length > 0) {
      const resolved = await fetchCmsPageForParams({
        client,
        routes,
        params,
        routing,
        catchAllParam: "segment",
        preview,
      });

      if (resolved) {
        return {
          page: resolved.page,
          route: {
            locale: resolved.route.locale,
            incomingPath: resolved.route.incomingPath,
            localizedPath: resolved.route.localizedPath,
            canonicalPath: resolved.route.canonicalPath,
            shouldRedirect: resolved.route.shouldRedirect,
          },
        };
      }
    }
  } catch {
    // Fallback lookup below handles route endpoint failures.
  }

  const fallbackRoute = resolveFallbackRoute(incomingPath, routing);
  try {
    const page = await client.getPageByPath({
      path: fallbackRoute.localizedPath,
      locale: fallbackRoute.locale,
      ...(preview ? { preview: true } : {}),
    });

    if (!page) {
      return null;
    }

    return {
      page,
      route: fallbackRoute,
    };
  } catch {
    return null;
  }
};

export async function generateStaticParams() {
  try {
    const routes = await getCmsRoutes();
    const routing = await getChannelAwareCmsRouting();
    const params = generateCmsStaticParams({
      routes,
      routing,
      catchAllParam: "segment",
    });

    return params
      .map((entry) => ({
        segment: Array.isArray(entry.segment) ? [...entry.segment] : [],
      }))
      .filter((entry) => entry.segment.length > 0);
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: CmsPageProps): Promise<Metadata> {
  const routeParams = await params;
  const preview = await resolveDraftMode({ useNextDraftMode: true });
  const config = getStarterOminityConfig();
  const routing = await getChannelAwareCmsRouting();
  const channelContext = await getStarterChannelContext();

  const resolved = await resolveCmsResult(routeParams, preview);
  if (!resolved) {
    return {
      title: "Not Found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const baseMetadata = buildNextMetadataFromPage(resolved.page, {
    baseUrl: config.siteUrl,
    includeAlternates: true,
    includeCanonical: true,
    locale: resolved.route.locale,
    routing,
    alternateLanguages: channelContext.languages,
    alternateCountries: channelContext.countries,
  }) as Metadata;

  const currentLocale = normalizeLocaleCode(resolved.route.locale);
  const metadataCanonical = baseMetadata.alternates?.canonical;
  const canonicalUrl = typeof metadataCanonical === "string"
    ? metadataCanonical
    : metadataCanonical instanceof URL
      ? metadataCanonical.toString()
      : new URL(resolved.route.canonicalPath, config.siteUrl).toString();

  return {
    ...baseMetadata,
    alternates: {
      canonical: canonicalUrl,
      ...(baseMetadata.alternates?.languages ? { languages: baseMetadata.alternates.languages } : {}),
    },
    openGraph: {
      ...baseMetadata.openGraph,
      url: canonicalUrl,
      locale: currentLocale,
    },
  };
}

export default async function CmsCatchAllPage({ params }: CmsPageProps) {
  const routeParams = await params;
  const preview = await resolveDraftMode({ useNextDraftMode: true });

  const resolved = await resolveCmsResult(routeParams, preview);
  if (!resolved) {
    notFound();
  }

  if (resolved.route.shouldRedirect) {
    redirect(resolved.route.canonicalPath as Route);
  }

  const context: StarterRenderContext = {
    page: resolved.page,
    locale: resolved.route.locale,
    path: resolved.route.incomingPath,
    preview,
    debug: getStarterOminityConfig().debugLogs,
  };

  return (
    <div className="space-y-6">
      {renderCmsPage({
        page: resolved.page,
        registry: cmsRegistry,
        context,
        options: cmsRendererOptions,
      }) as ReactNode}
    </div>
  );
}
