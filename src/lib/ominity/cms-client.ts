import { createCmsClient, type CmsClient } from "@ominity/next/cms";

import { getStarterOminityConfig } from "./env";

let cachedClient: CmsClient | null = null;

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
      ...(typeof config.channelId === "string" ? { channelId: config.channelId } : {}),
    },
    debug: {
      enabled: config.debugLogs,
    },
  });

  return cachedClient;
};
