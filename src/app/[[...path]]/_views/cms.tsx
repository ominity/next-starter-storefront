import { renderCmsPage } from "@ominity/next/cms/rendering";
import { buildNextMetadataFromPage } from "@ominity/next/next";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { config } from "@/lib/ominity/config";
import { cmsRegistry, cmsRendererOptions } from "@/lib/ominity/registry";
import { getRouting } from "@/lib/ominity/site";

import type { PageViews } from "./types";

export const cmsViews = {
  cms: {
    async metadata({ page, locale }) {
      return buildNextMetadataFromPage(page, { baseUrl: config.siteUrl, locale, routing: await getRouting() }) as Metadata;
    },
    render: ({ page, path, preview }) => renderCmsPage({
      page: page.page,
      registry: cmsRegistry,
      context: { page: page.page, locale: page.locale, path, preview, debug: config.debugLogs },
      options: cmsRendererOptions,
    }) as ReactNode,
  },
} satisfies Partial<PageViews>;
