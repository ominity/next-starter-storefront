import type { MetadataRoute } from "next";

import { buildCmsSitemap } from "@ominity/next/next";

import { getCmsRoutes } from "@/lib/ominity/data-source";
import { getStarterOminityConfig } from "@/lib/ominity/env";
import { getChannelAwareCmsRouting } from "@/lib/ominity/routing";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const config = getStarterOminityConfig();
  const routes = await getCmsRoutes();
  const routing = await getChannelAwareCmsRouting();

  return buildCmsSitemap({
    routes,
    routing,
    baseUrl: config.siteUrl,
    includeAlternates: true,
  }) as MetadataRoute.Sitemap;
}
