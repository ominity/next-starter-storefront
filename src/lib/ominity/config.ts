import type {
  CmsCanonicalRedirectPolicy,
  CmsLocaleSegmentStrategy,
  StringLinkStrategy,
} from "@ominity/next/cms";
import type { HomeLocaleRedirectMode } from "@ominity/next/next";

const env = process.env;

function flag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function oneOf<T extends string>(value: string | undefined, options: ReadonlyArray<T>, fallback: T): T {
  return options.includes(value as T) ? value as T : fallback;
}

function text(value: string | undefined): string | undefined {
  return value?.trim() || undefined;
}

const nodeEnv = env.NODE_ENV ?? "development";

/** Everything the starter reads from the environment. See `.env.example`. */
export const config = {
  nodeEnv,
  siteUrl: env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  apiUrl: text(env.OMINITY_API_URL) ?? "https://demo.ominity.com/api",
  apiKey: text(env.OMINITY_API_KEY),
  authClientId: text(env.OMINITY_AUTH_CLIENT_ID),
  authClientSecret: text(env.OMINITY_AUTH_CLIENT_SECRET),
  authScope: text(env.OMINITY_AUTH_SCOPE),
  authSessionSecret: text(env.OMINITY_AUTH_SESSION_SECRET),
  localeSegmentStrategy: oneOf<CmsLocaleSegmentStrategy>(
    env.OMINITY_LOCALE_SEGMENT_STRATEGY,
    ["none", "language", "country-language"],
    "language",
  ),
  canonicalRedirectPolicy: oneOf<CmsCanonicalRedirectPolicy>(
    env.OMINITY_CANONICAL_REDIRECT_POLICY,
    ["if-not-canonical", "never"],
    "if-not-canonical",
  ),
  stringLinkStrategy: oneOf<StringLinkStrategy>(
    env.OMINITY_STRING_LINK_STRATEGY,
    ["localize-relative", "passthrough"],
    "localize-relative",
  ),
  homeLocaleRedirectMode: oneOf<HomeLocaleRedirectMode>(
    env.OMINITY_HOME_LOCALE_REDIRECT_MODE,
    ["off", "accept-language", "cookie-accept-language", "geo-cookie-accept-language"],
    "off",
  ),
  homeLocaleRedirectCookieName: text(env.OMINITY_HOME_LOCALE_REDIRECT_COOKIE_NAME) ?? "ominity_locale",
  homeLocaleRedirectSkipBots: flag(env.OMINITY_HOME_LOCALE_REDIRECT_SKIP_BOTS, true),
  trailingSlash: flag(env.OMINITY_TRAILING_SLASH, false),
  basePath: env.OMINITY_BASE_PATH ?? "",
  draftToken: text(env.OMINITY_DRAFT_TOKEN),
  checkoutAllowGuest: flag(env.OMINITY_CHECKOUT_ALLOW_GUEST, true),
  trackingEnabled: flag(env.OMINITY_TRACKING_ENABLED, false),
  formsValidateFormId: flag(env.OMINITY_FORMS_VALIDATE_FORM_ID, true),
  strictMissingComponents: flag(env.OMINITY_STRICT_COMPONENTS, true),
  debugLogs: flag(env.OMINITY_DEBUG_LOGS, false),
  devTool: flag(env.OMINITY_DEV_TOOL, nodeEnv !== "production"),
} as const;
