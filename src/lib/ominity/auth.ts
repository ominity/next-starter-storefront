import "server-only";

import type { OminityAuthRouteHandlerConfig } from "@ominity/next/auth/server";
import { listOminitySocialProviders, redirectIfOminitySignedIn } from "@ominity/next/auth/server";
import type { OminitySocialProvider } from "@ominity/next/react";
import { unstable_cache } from "next/cache";

import { config } from "./config";

/**
 * The auth settings shared by the API route (`src/app/api/[...ominity]/route.ts`) and the server parts of the auth
 * pages, so both read the same session cookie.
 */
export const authConfig = {
  ominityBaseUrl: config.apiUrl,
  ominityApiKey: config.apiKey,
  authClientId: config.authClientId,
  authClientSecret: config.authClientSecret,
  authScope: config.authScope,
  authSessionSecret: config.authSessionSecret,
  siteUrl: config.siteUrl,
  nodeEnv: config.nodeEnv,
  debugEnabled: config.debugLogs,
  /**
   * Where the links in sign-in and signup code emails point. Without a locale prefix the page resolves to the
   * default locale and redirects to its canonical path; browsers keep the `#email=…&code=…` fragment across that
   * redirect. Keep it equal to the `verify` path in `src/locales/routes/*.json`.
   */
  emailCodePath: "/auth/verify",
} satisfies OminityAuthRouteHandlerConfig;

/** Throws when Ominity can't be reached, so a failure is not cached. */
const loadSocialProviders = unstable_cache(
  () => listOminitySocialProviders(authConfig),
  ["ominity-social-providers"],
  { revalidate: 300 },
);

/**
 * The channel's enabled social sign-in providers, loaded on the server so the buttons render with the page. Cached
 * for five minutes; an empty list when Ominity can't be reached.
 */
export async function getSocialProviders(): Promise<ReadonlyArray<OminitySocialProvider>> {
  if (!config.apiKey) return [];
  return loadSocialProviders().catch(() => []);
}

/**
 * Sends a signed-in visitor from the sign-in, signup and code pages to `returnTo` (a safe path outside the auth pages)
 * or the account page. `loginPath` is the localized login page; every auth page sits next to it.
 */
export async function redirectIfSignedIn(paths: { readonly login: string; readonly account: string }, returnTo: string | undefined): Promise<void> {
  await redirectIfOminitySignedIn(authConfig, {
    returnTo,
    home: paths.account,
    authPathPrefix: paths.login.slice(0, paths.login.lastIndexOf("/") + 1),
  });
}
