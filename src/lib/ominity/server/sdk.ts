import { Ominity } from "@ominity/api-typescript";

import { getStarterOminityConfig } from "@/lib/ominity/env";

function baseSdkOptions(language?: string) {
  const config = getStarterOminityConfig();
  if (!config.apiUrl) {
    throw new Error("OMINITY_API_URL is required.");
  }

  return {
    serverURL: config.apiUrl,
    ...(typeof language === "string" ? { language } : {}),
    ...(typeof config.channelId === "string" ? { channelId: config.channelId } : {}),
  };
}

export function createApiKeySdk(language?: string): Ominity {
  const config = getStarterOminityConfig();
  if (!config.apiKey) {
    throw new Error("OMINITY_API_KEY is required.");
  }

  return new Ominity({
    ...baseSdkOptions(language),
    security: {
      apiKey: config.apiKey,
    },
  });
}

export function createOAuthSdk(accessToken: string, language?: string): Ominity {
  return new Ominity({
    ...baseSdkOptions(language),
    security: {
      oAuth: accessToken,
    },
  });
}
