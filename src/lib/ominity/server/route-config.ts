import type { OminityAuthRouteHandlerConfig } from "@ominity/next/auth";
import type { OminityCommerceRouteHandlerConfig } from "@ominity/next/commerce";

import { getStarterOminityConfig } from "@/lib/ominity/env";
import {
  resolveRequestCountry,
  resolveRequestSdkLanguage,
} from "@/lib/ominity/site";
import { getOminityDebugHttpClient } from "@/lib/ominity/site";

export function getStarterAuthRouteConfig(): OminityAuthRouteHandlerConfig {
  const config = getStarterOminityConfig();

  return {
    ominityBaseUrl: config.apiUrl,
    ominityApiKey: config.apiKey,
    channelId: config.channelId,
    authClientId: config.authClientId,
    authClientSecret: config.authClientSecret,
    authScope: config.authScope,
    authSessionSecret: config.authSessionSecret,
    authCookieName: config.authCookieName,
    authCookieMaxAgeSeconds: config.authCookieMaxAgeSeconds,
    nodeEnv: config.nodeEnv,
    siteUrl: config.siteUrl,
    useMockData: config.useMockData,
    debugEnabled: config.debugLogs,
    sdkHttpClient: getOminityDebugHttpClient("sdk"),
    resolveLanguage: resolveRequestSdkLanguage,
  };
}

export function getStarterCommerceRouteConfig(): OminityCommerceRouteHandlerConfig {
  const config = getStarterOminityConfig();

  return {
    ominityBaseUrl: config.apiUrl,
    ominityApiKey: config.apiKey,
    channelId: config.channelId,
    cartCookieName: config.cartCookieName,
    cartCookieMaxAgeSeconds: config.cartCookieMaxAgeSeconds,
    nodeEnv: config.nodeEnv,
    useMockData: config.useMockData,
    debugEnabled: config.debugLogs,
    paymentMethodsLimit: 100,
    sdkHttpClient: getOminityDebugHttpClient("sdk"),
    resolveLanguage: resolveRequestSdkLanguage,
    resolveCountry: resolveRequestCountry,
  };
}
