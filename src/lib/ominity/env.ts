import type {
  CmsCanonicalRedirectPolicy,
  CmsLocaleSegmentStrategy,
  StringLinkStrategy,
} from "@ominity/next/cms";
import type { HomeLocaleRedirectMode as StarterHomeLocaleRedirectMode } from "@ominity/next/next";

const DEFAULT_REVALIDATE_SECONDS = 300;
const DEFAULT_COMMERCE_LIST_LIMIT = 250;
const DEFAULT_AUTH_COOKIE_NAME = "ominity_auth_session";
const DEFAULT_AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const DEFAULT_ACTIVE_CUSTOMER_COOKIE_NAME = "ominity_active_customer";
const DEFAULT_ACTIVE_CUSTOMER_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const DEFAULT_CART_COOKIE_NAME = "ominity_cart_id";
const DEFAULT_CART_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const toBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
};

const toNumber = (value: string | undefined, fallback: number): number => {
  if (typeof value !== "string") {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
};

const toNonEmptyString = (value: string | undefined): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const toLocaleStrategy = (
  value: string | undefined,
): CmsLocaleSegmentStrategy => {
  if (value === "none" || value === "language" || value === "country-language") {
    return value;
  }

  return "language";
};

const toCanonicalPolicy = (
  value: string | undefined,
): CmsCanonicalRedirectPolicy => {
  if (value === "never" || value === "if-not-canonical") {
    return value;
  }

  return "if-not-canonical";
};

const toStringLinkStrategy = (value: string | undefined): StringLinkStrategy => {
  if (value === "passthrough" || value === "localize-relative") {
    return value;
  }

  return "localize-relative";
};

const toHomeLocaleRedirectMode = (
  value: string | undefined,
): StarterHomeLocaleRedirectMode => {
  if (
    value === "off"
    || value === "accept-language"
    || value === "cookie-accept-language"
    || value === "geo-cookie-accept-language"
  ) {
    return value;
  }

  return "off";
};

export interface StarterOminityConfig {
  readonly nodeEnv: string;
  readonly siteUrl: string;
  readonly useMockData: boolean;
  readonly trackingEnabled: boolean;
  readonly debugLogs: boolean;
  readonly devTool: boolean;
  readonly strictMissingComponents: boolean;
  readonly apiUrl?: string;
  readonly apiKey?: string;
  readonly localeSegmentStrategy: CmsLocaleSegmentStrategy;
  readonly canonicalRedirectPolicy: CmsCanonicalRedirectPolicy;
  readonly stringLinkStrategy: StringLinkStrategy;
  readonly homeLocaleRedirectMode: StarterHomeLocaleRedirectMode;
  readonly homeLocaleRedirectCookieName: string;
  readonly homeLocaleRedirectSkipBots: boolean;
  readonly trailingSlash: boolean;
  readonly basePath: string;
  readonly revalidateSeconds: number;
  readonly draftToken?: string;
  readonly formsValidateFormId: boolean;
  readonly enableCommerce: boolean;
  readonly enableCommerceProducts: boolean;
  readonly enableCommerceCategories: boolean;
  readonly enableCommerceCart: boolean;
  readonly enableCommerceWishlist: boolean;
  readonly enableCommerceCheckout: boolean;
  readonly enableCommercePayment: boolean;
  readonly enableAuth: boolean;
  readonly enableCustomerAccounts: boolean;
  readonly checkoutAllowGuest: boolean;
  readonly commerceListLimit: number;
  readonly authClientId?: string;
  readonly authClientSecret?: string;
  readonly authScope?: string;
  readonly authSessionSecret?: string;
  readonly authCookieName: string;
  readonly authCookieMaxAgeSeconds: number;
  readonly activeCustomerCookieName: string;
  readonly activeCustomerCookieMaxAgeSeconds: number;
  readonly cartCookieName: string;
  readonly cartCookieMaxAgeSeconds: number;
}

let cachedConfig: StarterOminityConfig | null = null;

export const getStarterOminityConfig = (): StarterOminityConfig => {
  if (cachedConfig) {
    return cachedConfig;
  }

  const enableCommerce = toBoolean(process.env.OMINITY_FEATURE_COMMERCE, true);
  const enableCommerceProducts = enableCommerce
    && toBoolean(process.env.OMINITY_FEATURE_COMMERCE_PRODUCTS, true);
  const enableCommerceCategories = enableCommerce
    && toBoolean(process.env.OMINITY_FEATURE_COMMERCE_CATEGORIES, true);
  const enableCommerceCart = enableCommerce
    && toBoolean(process.env.OMINITY_FEATURE_CART, true);
  const enableCommerceWishlist = enableCommerce
    && toBoolean(process.env.OMINITY_FEATURE_WISHLIST, true);
  const enableCommerceCheckout = enableCommerce
    && toBoolean(process.env.OMINITY_FEATURE_CHECKOUT, true);
  const enableCommercePayment = enableCommerce
    && toBoolean(process.env.OMINITY_FEATURE_PAYMENT, true);
  const enableAuth = toBoolean(process.env.OMINITY_FEATURE_AUTH, true);
  const enableCustomerAccounts = enableAuth
    && toBoolean(process.env.OMINITY_FEATURE_CUSTOMER_ACCOUNTS, true);
  const checkoutAllowGuest = toBoolean(process.env.OMINITY_CHECKOUT_ALLOW_GUEST, true);

  cachedConfig = {
    nodeEnv: process.env.NODE_ENV ?? "development",
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    useMockData: toBoolean(process.env.OMINITY_USE_MOCK_DATA, true),
    trackingEnabled: toBoolean(process.env.OMINITY_TRACKING_ENABLED, false),
    debugLogs: toBoolean(process.env.OMINITY_DEBUG_LOGS, false),
    devTool: toBoolean(
      process.env.OMINITY_DEV_TOOL,
      toBoolean(process.env.OMINITY_DEBUG_BAR, (process.env.NODE_ENV ?? "development") !== "production"),
    ),
    strictMissingComponents: toBoolean(process.env.OMINITY_STRICT_COMPONENTS, true),
    ...(typeof process.env.OMINITY_API_URL === "string"
      ? { apiUrl: process.env.OMINITY_API_URL }
      : {}),
    ...(typeof process.env.OMINITY_API_KEY === "string"
      ? { apiKey: process.env.OMINITY_API_KEY }
      : {}),
    localeSegmentStrategy: toLocaleStrategy(process.env.OMINITY_LOCALE_SEGMENT_STRATEGY),
    canonicalRedirectPolicy: toCanonicalPolicy(process.env.OMINITY_CANONICAL_REDIRECT_POLICY),
    stringLinkStrategy: toStringLinkStrategy(process.env.OMINITY_STRING_LINK_STRATEGY),
    homeLocaleRedirectMode: toHomeLocaleRedirectMode(process.env.OMINITY_HOME_LOCALE_REDIRECT_MODE),
    homeLocaleRedirectCookieName: toNonEmptyString(process.env.OMINITY_HOME_LOCALE_REDIRECT_COOKIE_NAME) ?? "ominity_locale",
    homeLocaleRedirectSkipBots: toBoolean(process.env.OMINITY_HOME_LOCALE_REDIRECT_SKIP_BOTS, true),
    trailingSlash: toBoolean(process.env.OMINITY_TRAILING_SLASH, false),
    basePath: process.env.OMINITY_BASE_PATH ?? "",
    revalidateSeconds: toNumber(
      process.env.OMINITY_REVALIDATE_SECONDS,
      DEFAULT_REVALIDATE_SECONDS,
    ),
    ...(typeof process.env.OMINITY_DRAFT_TOKEN === "string"
      ? { draftToken: process.env.OMINITY_DRAFT_TOKEN }
      : {}),
    formsValidateFormId: toBoolean(process.env.OMINITY_FORMS_VALIDATE_FORM_ID, true),
    enableCommerce,
    enableCommerceProducts,
    enableCommerceCategories,
    enableCommerceCart,
    enableCommerceWishlist,
    enableCommerceCheckout,
    enableCommercePayment,
    enableAuth,
    enableCustomerAccounts,
    checkoutAllowGuest,
    commerceListLimit: toNumber(
      process.env.OMINITY_COMMERCE_LIST_LIMIT,
      DEFAULT_COMMERCE_LIST_LIMIT,
    ),
    ...(toNonEmptyString(process.env.OMINITY_AUTH_CLIENT_ID)
      ? { authClientId: toNonEmptyString(process.env.OMINITY_AUTH_CLIENT_ID)! }
      : {}),
    ...(toNonEmptyString(process.env.OMINITY_AUTH_CLIENT_SECRET)
      ? { authClientSecret: toNonEmptyString(process.env.OMINITY_AUTH_CLIENT_SECRET)! }
      : {}),
    ...(toNonEmptyString(process.env.OMINITY_AUTH_SCOPE)
      ? { authScope: toNonEmptyString(process.env.OMINITY_AUTH_SCOPE)! }
      : {}),
    ...(toNonEmptyString(process.env.OMINITY_AUTH_SESSION_SECRET)
      ? { authSessionSecret: toNonEmptyString(process.env.OMINITY_AUTH_SESSION_SECRET)! }
      : {}),
    authCookieName: toNonEmptyString(process.env.OMINITY_AUTH_COOKIE_NAME) ?? DEFAULT_AUTH_COOKIE_NAME,
    authCookieMaxAgeSeconds: toNumber(
      process.env.OMINITY_AUTH_COOKIE_MAX_AGE_SECONDS,
      DEFAULT_AUTH_COOKIE_MAX_AGE_SECONDS,
    ),
    activeCustomerCookieName: toNonEmptyString(process.env.OMINITY_ACTIVE_CUSTOMER_COOKIE_NAME)
      ?? DEFAULT_ACTIVE_CUSTOMER_COOKIE_NAME,
    activeCustomerCookieMaxAgeSeconds: toNumber(
      process.env.OMINITY_ACTIVE_CUSTOMER_COOKIE_MAX_AGE_SECONDS,
      DEFAULT_ACTIVE_CUSTOMER_COOKIE_MAX_AGE_SECONDS,
    ),
    cartCookieName: toNonEmptyString(process.env.OMINITY_CART_COOKIE_NAME) ?? DEFAULT_CART_COOKIE_NAME,
    cartCookieMaxAgeSeconds: toNumber(
      process.env.OMINITY_CART_COOKIE_MAX_AGE_SECONDS,
      DEFAULT_CART_COOKIE_MAX_AGE_SECONDS,
    ),
  };

  return cachedConfig;
};
