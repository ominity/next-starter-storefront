import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import { fetchCmsPageForParams, generateCmsStaticParams, resolveDraftMode } from "@ominity/next/next";
import { buildNextMetadataFromPage } from "@ominity/next/next";
import { renderCmsPage } from "@ominity/next/rendering";

import { getCmsClient, getCmsRoutes } from "@/lib/ominity/data-source";
import { getStarterOminityConfig } from "@/lib/ominity/env";
import { cmsRegistry, cmsRendererOptions } from "@/lib/ominity/registry";
import { getChannelAwareCmsRouting } from "@/lib/ominity/routing";
import type { StarterRenderContext } from "@/lib/ominity/types";

export const dynamicParams = true;
export const revalidate = 300;

type CmsPageParams = Readonly<Record<string, string | readonly string[] | undefined>> & {
  segment?: string[];
};

interface CmsPageProps {
  params: Promise<CmsPageParams>;
}

const resolveCmsResult = async (params: CmsPageParams, preview: boolean) => {
  const client = getCmsClient();
  const routes = await getCmsRoutes({ preview });
  if (routes.length === 0) {
    return null;
  }
  const routing = await getChannelAwareCmsRouting();

  try {
    return await fetchCmsPageForParams({
      client,
      routes,
      params,
      routing,
      catchAllParam: "segment",
      preview,
    });
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

    return params.map((entry) => ({
      segment: Array.isArray(entry.segment) ? [...entry.segment] : [],
    }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: CmsPageProps): Promise<Metadata> {
  const routeParams = await params;
  const preview = await resolveDraftMode({ useNextDraftMode: true });
  const config = getStarterOminityConfig();

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

  return buildNextMetadataFromPage(resolved.page, {
    baseUrl: config.siteUrl,
    includeAlternates: true,
    includeCanonical: true,
    locale: resolved.route.locale,
  }) as Metadata;
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
