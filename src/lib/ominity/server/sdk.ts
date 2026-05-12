import { Ominity } from "@ominity/api-typescript";

import { getStarterOminityConfig } from "@/lib/ominity/env";
import { getOminityDebugHttpClient } from "@/lib/ominity/server/sdk-debug-fetcher";

type HookContextLike = {
  options?: Record<string, unknown>;
};

type BeforeCreateRequestLike = (
  context: HookContextLike,
  input: unknown,
) => unknown;

type HooksLike = {
  beforeCreateRequest?: BeforeCreateRequestLike;
  __ominityContextOptionsPatched?: boolean;
};

type OminityWithInternals = Ominity & {
  _options?: Record<string, unknown> & {
    hooks?: HooksLike;
  };
};

function patchHookContextOptions(sdk: Ominity): Ominity {
  const sdkWithInternals = sdk as OminityWithInternals;
  const hooks = sdkWithInternals._options?.hooks;
  if (!hooks || typeof hooks.beforeCreateRequest !== "function") {
    return sdk;
  }

  if (hooks.__ominityContextOptionsPatched === true) {
    return sdk;
  }

  const original = hooks.beforeCreateRequest.bind(hooks) as (
    context: HookContextLike,
    input: unknown,
  ) => unknown;
  (hooks as unknown as { beforeCreateRequest: BeforeCreateRequestLike }).beforeCreateRequest = ((
    context: HookContextLike,
    input: unknown,
  ) => {
    const contextOptions = typeof context?.options === "object" && context.options !== null
      ? context.options
      : {};

    const mergedContext: HookContextLike = {
      ...(context ?? {}),
      options: {
        ...(sdkWithInternals._options ?? {}),
        ...contextOptions,
      },
    };

    return original(mergedContext, input);
  }) as BeforeCreateRequestLike;

  hooks.__ominityContextOptionsPatched = true;
  return sdk;
}

function baseSdkOptions(language?: string) {
  const config = getStarterOminityConfig();
  if (!config.apiUrl) {
    throw new Error("OMINITY_API_URL is required.");
  }
  const debugHttpClient = getOminityDebugHttpClient("sdk");

  return {
    serverURL: config.apiUrl,
    ...(debugHttpClient ? { httpClient: debugHttpClient } : {}),
    ...(typeof language === "string" ? { language } : {}),
    ...(typeof config.channelId === "string" ? { channelId: config.channelId } : {}),
  };
}

export function createApiKeySdk(language?: string): Ominity {
  const config = getStarterOminityConfig();
  if (!config.apiKey) {
    throw new Error("OMINITY_API_KEY is required.");
  }

  return patchHookContextOptions(new Ominity({
    ...baseSdkOptions(language),
    security: {
      apiKey: config.apiKey,
    },
  }));
}

export function createOAuthSdk(accessToken: string, language?: string): Ominity {
  return patchHookContextOptions(new Ominity({
    ...baseSdkOptions(language),
    security: {
      oAuth: accessToken,
    },
  }));
}
