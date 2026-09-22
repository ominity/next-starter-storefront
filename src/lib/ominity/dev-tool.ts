import { SDK_VERSION } from "@ominity/api-typescript";
import ominityNextPackage from "@ominity/next/package.json";
import type {
  OminityDevToolChannelInfo,
  OminityDevToolFlag,
  OminityDevToolHealthCheck,
  OminityDevToolSnapshot,
} from "@ominity/next/dev-tool";
import nextPackage from "next/package.json";

import appPackage from "../../../package.json";
import type { StarterOminityConfig } from "./env";

const isConfigured = (value: string | undefined): boolean => (
  typeof value === "string" && value.trim().length > 0
);

const applicationName = appPackage.name
  .replace(/^@[^/]+\//, "")
  .split("-")
  .filter(Boolean)
  .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
  .join(" ");

export const createStarterDevToolSnapshot = (
  config: StarterOminityConfig,
  channel: OminityDevToolChannelInfo | undefined,
): OminityDevToolSnapshot => {
  const requiredEnvironment: Array<{
    readonly name: string;
    readonly value: string | undefined;
    readonly message: string;
  }> = [];

  if (!config.useMockData) {
    requiredEnvironment.push(
      { name: "OMINITY_API_URL", value: config.apiUrl, message: "Required for live Ominity requests." },
      { name: "OMINITY_API_KEY", value: config.apiKey, message: "Required by server-side Ominity clients." },
    );
  }

  if (config.enableAuth) {
    requiredEnvironment.push(
      { name: "OMINITY_AUTH_CLIENT_ID", value: config.authClientId, message: "Required when authentication is enabled." },
      { name: "OMINITY_AUTH_CLIENT_SECRET", value: config.authClientSecret, message: "Required when authentication is enabled." },
      { name: "OMINITY_AUTH_SESSION_SECRET", value: config.authSessionSecret, message: "Required to sign local auth sessions." },
    );
  }

  const missingEnvironment = requiredEnvironment
    .filter((item) => !isConfigured(item.value))
    .map((item) => item.name);
  const warnings: string[] = [];

  if (config.nodeEnv === "production" && config.devTool) {
    warnings.push("The Ominity Dev Tool is enabled in production.");
  }
  if (config.nodeEnv === "production" && config.useMockData) {
    warnings.push("Mock data is enabled in production.");
  }
  if (config.nodeEnv === "production" && /localhost|127\.0\.0\.1/.test(config.siteUrl)) {
    warnings.push("The production site URL points to localhost.");
  }
  if (config.nodeEnv === "production" && config.apiUrl?.startsWith("http://")) {
    warnings.push("The production Ominity API URL does not use HTTPS.");
  }
  if (
    config.enableAuth
    && isConfigured(config.authSessionSecret)
    && (config.authSessionSecret!.length < 32 || config.authSessionSecret!.startsWith("change-me"))
  ) {
    warnings.push("The auth session secret is a placeholder or shorter than 32 characters.");
  }

  const healthChecks: OminityDevToolHealthCheck[] = [
    {
      label: "Configuration mode",
      status: "enabled",
      message: config.useMockData ? "Using the built-in mock data source." : "Using the live Ominity API.",
    },
    {
      label: "Current channel",
      status: channel ? "enabled" : "disabled",
      ...(!channel ? { severity: "error" as const } : {}),
      message: channel
        ? `${channel.name ?? channel.identifier ?? channel.id ?? "Channel"} was resolved from /channels/current.`
        : "Could not resolve the current channel from /channels/current.",
    },
    ...requiredEnvironment.map((item): OminityDevToolHealthCheck => ({
      label: item.name,
      status: isConfigured(item.value) ? "enabled" : "disabled",
      ...(!isConfigured(item.value) ? { severity: "error" as const } : {}),
      message: isConfigured(item.value) ? "Configured." : item.message,
    })),
    ...warnings.map((warning): OminityDevToolHealthCheck => ({
      label: "Unsafe environment setting",
      status: "unknown",
      severity: "warning",
      message: warning,
    })),
  ];
  const flags: OminityDevToolFlag[] = [
    { label: "Commerce", value: config.enableCommerce, status: config.enableCommerce ? "enabled" : "disabled" },
    { label: "Products", value: config.enableCommerceProducts, status: config.enableCommerceProducts ? "enabled" : "disabled" },
    { label: "Categories", value: config.enableCommerceCategories, status: config.enableCommerceCategories ? "enabled" : "disabled" },
    { label: "Cart", value: config.enableCommerceCart, status: config.enableCommerceCart ? "enabled" : "disabled" },
    { label: "Wishlist", value: config.enableCommerceWishlist, status: config.enableCommerceWishlist ? "enabled" : "disabled" },
    { label: "Checkout", value: config.enableCommerceCheckout, status: config.enableCommerceCheckout ? "enabled" : "disabled" },
    { label: "Payment", value: config.enableCommercePayment, status: config.enableCommercePayment ? "enabled" : "disabled" },
    { label: "Auth", value: config.enableAuth, status: config.enableAuth ? "enabled" : "disabled" },
    { label: "Customer accounts", value: config.enableCustomerAccounts, status: config.enableCustomerAccounts ? "enabled" : "disabled" },
    { label: "Tracking", value: config.trackingEnabled, status: config.trackingEnabled ? "enabled" : "disabled" },
  ];
  const displayedApiUrl = config.apiUrl
    ?? (config.useMockData ? "Not used in mock mode" : undefined);

  return {
    integration: {
      appName: applicationName,
      environment: config.nodeEnv,
      runtime: `Node.js ${process.version} · Next.js App Router`,
      packageName: "@ominity/next",
      packageVersion: ominityNextPackage.version,
      sdkVersion: SDK_VERSION,
      nextVersion: nextPackage.version,
      ...(displayedApiUrl ? { apiUrl: displayedApiUrl } : {}),
      basePath: config.basePath || "/",
      mockData: config.useMockData,
      debugLogs: config.debugLogs,
      devTool: config.devTool,
      flags,
      details: {
        appPackage: `${appPackage.name}@${appPackage.version}`,
        siteUrl: config.siteUrl,
        revalidateSeconds: config.revalidateSeconds,
      },
    },
    health: {
      mode: config.useMockData ? "mock" : "live",
      environment: config.nodeEnv,
      ...(displayedApiUrl ? { apiUrl: displayedApiUrl } : {}),
      ...(typeof channel?.id === "string" ? { channelId: channel.id } : {}),
      localeSegmentStrategy: config.localeSegmentStrategy,
      basePath: config.basePath || "/",
      trailingSlash: config.trailingSlash,
      canonicalRedirectPolicy: config.canonicalRedirectPolicy,
      draftMode: false,
      previewMode: false,
      unsafeWarnings: warnings,
      missingEnvironment,
      checks: healthChecks,
      details: {
        strictMissingComponents: config.strictMissingComponents,
        checkoutAllowGuest: config.checkoutAllowGuest,
        formsValidateFormId: config.formsValidateFormId,
      },
    },
    ...(channel ? { channel } : {}),
  };
};
