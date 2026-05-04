import { createCmsLinkResolver, createRoutingConfig, type CmsRoutingConfig } from "@ominity/next/cms";

import { getStarterChannelContext } from "./channel-context";
import { getStarterOminityConfig } from "./env";

const config = getStarterOminityConfig();

export const cmsRouting = createRoutingConfig({
  defaultLocale: config.defaultLocale,
  locales: config.locales,
  localeSegmentStrategy: config.localeSegmentStrategy,
  canonicalRedirectPolicy: config.canonicalRedirectPolicy,
  trailingSlash: config.trailingSlash,
  basePath: config.basePath,
});

export const cmsLinkResolver = createCmsLinkResolver({
  config: cmsRouting,
  stringLinkStrategy: config.stringLinkStrategy,
});

export const cmsLocalizedStringLinkResolver = createCmsLinkResolver({
  config: cmsRouting,
  stringLinkStrategy: "localize-relative",
});

let cachedChannelAwareRoutingPromise: Promise<CmsRoutingConfig> | null = null;

export async function getChannelAwareCmsRouting(): Promise<CmsRoutingConfig> {
  if (cachedChannelAwareRoutingPromise) {
    return cachedChannelAwareRoutingPromise;
  }

  cachedChannelAwareRoutingPromise = (async () => {
    const channel = await getStarterChannelContext();
    const currentConfig = getStarterOminityConfig();

    return createRoutingConfig({
      defaultLocale: channel.defaultLocale,
      locales: channel.locales,
      localeSegmentStrategy: currentConfig.localeSegmentStrategy,
      canonicalRedirectPolicy: currentConfig.canonicalRedirectPolicy,
      trailingSlash: currentConfig.trailingSlash,
      basePath: currentConfig.basePath,
    });
  })();

  return cachedChannelAwareRoutingPromise;
}
