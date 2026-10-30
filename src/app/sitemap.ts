import { buildCmsSitemap } from "@ominity/next/next";
import type { MetadataRoute } from "next";

import { config } from "@/lib/ominity/config";
import { getCmsRoutes, getRouting } from "@/lib/ominity/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return buildCmsSitemap({
    routes: await getCmsRoutes(),
    routing: await getRouting(),
    baseUrl: config.siteUrl,
    includeAlternates: true,
  }) as MetadataRoute.Sitemap;
}
