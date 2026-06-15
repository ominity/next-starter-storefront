import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { resolveHomeLocaleRedirect } from "@ominity/next/next";

import CmsCatchAllPage, { generateMetadata as generateCmsCatchAllMetadata } from "./(pages)/[...segment]/page";

import { getStarterOminityConfig } from "@/lib/ominity/env";
import { getChannelAwareCmsRouting } from "@/lib/ominity/site";

const ROOT_PARAMS = Object.freeze({ segment: [] as string[] });

function detectedCountryHeader(headersStore: { get(name: string): string | null }): string | undefined {
  const candidates = [
    headersStore.get("x-ominity-country"),
    headersStore.get("x-country"),
    headersStore.get("x-country-code"),
    headersStore.get("x-vercel-ip-country"),
    headersStore.get("cf-ipcountry"),
    headersStore.get("cloudfront-viewer-country"),
    headersStore.get("fastly-country-code"),
    headersStore.get("x-appengine-country"),
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate;
    }
  }

  return undefined;
}

export async function generateMetadata(): Promise<Metadata> {
  return generateCmsCatchAllMetadata({
    params: Promise.resolve(ROOT_PARAMS),
  });
}

export default async function HomePageRoute() {
  const config = getStarterOminityConfig();

  if (config.homeLocaleRedirectMode !== "off") {
    const routing = await getChannelAwareCmsRouting();
    const requestHeaders = await headers();
    const resolvedRedirect = resolveHomeLocaleRedirect({
      incomingPath: "/",
      routing,
      mode: config.homeLocaleRedirectMode,
      cookieName: config.homeLocaleRedirectCookieName,
      skipBots: config.homeLocaleRedirectSkipBots,
      cookieHeader: requestHeaders.get("cookie"),
      acceptLanguageHeader: requestHeaders.get("accept-language"),
      countryHeader: detectedCountryHeader(requestHeaders) ?? null,
      userAgentHeader: requestHeaders.get("user-agent"),
    });

    if (resolvedRedirect) {
      redirect(resolvedRedirect.destinationPath as Route);
    }
  }

  return <CmsCatchAllPage params={Promise.resolve(ROOT_PARAMS)} />;
}
