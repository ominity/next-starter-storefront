import { HTTPClient, type Fetcher } from "@ominity/api-typescript";
import { createCmsClient, type CmsClient } from "@ominity/next/cms";
import { getCachedOminityDebugFetcher } from "@ominity/next/debug";

import { getStarterOminityConfig } from "./env";

let cachedClient: CmsClient | null = null;
let cachedCmsHttpClient: HTTPClient | null = null;

function defaultFetcher(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (typeof init === "undefined") {
    return fetch(input);
  }

  return fetch(input, init);
}

function getCmsHttpClient(): HTTPClient {
  if (cachedCmsHttpClient) {
    return cachedCmsHttpClient;
  }

  const config = getStarterOminityConfig();
  const debugFetcher = getCachedOminityDebugFetcher({
    source: "cms",
    enabled: config.debugBar,
  });
  const baseFetcher = debugFetcher ?? defaultFetcher;
  const fetcher: Fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
    return baseFetcher(input, init);
  };

  cachedCmsHttpClient = new HTTPClient({ fetcher });
  return cachedCmsHttpClient;
}

export const getLiveCmsClient = (): CmsClient => {
  if (cachedClient) {
    return cachedClient;
  }

  const config = getStarterOminityConfig();
  if (!config.apiUrl || !config.apiKey) {
    throw new Error(
      "Missing OMINITY_API_URL or OMINITY_API_KEY. Set env vars or enable OMINITY_USE_MOCK_DATA=true.",
    );
  }

  cachedClient = createCmsClient({
    sdk: {
      serverURL: config.apiUrl,
      security: {
        apiKey: config.apiKey,
      },
      httpClient: getCmsHttpClient(),
      ...(typeof config.channelId === "string" ? { channelId: config.channelId } : {}),
    },
    debug: {
      enabled: config.debugLogs,
    },
  });

  return cachedClient;
};
