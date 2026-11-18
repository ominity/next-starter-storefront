import { createOminityRouteHandlers } from "@ominity/next/routes";

import { authConfig } from "@/lib/ominity/auth";
import { config } from "@/lib/ominity/config";
import { routePath } from "@/lib/ominity/routes";
import { getChannel, getRouting, resolveRequestCountry, resolveRequestSdkLanguage } from "@/lib/ominity/site";

async function defaultLocalePath(name: "account" | "login" | "mfa"): Promise<string> {
  const [channel, routing] = await Promise.all([getChannel(), getRouting()]);
  return routePath(name, channel.defaultLocale, routing);
}

/**
 * Every server route the package's browser features use: auth, cart and checkout, customer accounts, the browser SDK
 * gateway (`/api/ominity`), tracking, forms, draft mode and the dev tool.
 */
export const { GET, POST, PATCH, PUT, DELETE } = createOminityRouteHandlers({
  ...authConfig,
  resolveLanguage: resolveRequestSdkLanguage,
  /** Links in sign-in and signup code emails open the `verify` page in the visitor's language. */
  async emailCodePath(request) {
    const [channel, routing, language] = await Promise.all([getChannel(), getRouting(), resolveRequestSdkLanguage(request)]);
    return routePath("verify", language ?? channel.defaultLocale, routing);
  },
  draftToken: config.draftToken,
  devTool: config.devTool,
  auth: {
    socialLoginSuccessPath: () => defaultLocalePath("account"),
    socialLoginFailurePath: () => defaultLocalePath("login"),
    socialLoginMfaPath: () => defaultLocalePath("mfa"),
  },
  async resolveInvitationAcceptUrl({ request }) {
    const [channel, routing, language] = await Promise.all([getChannel(), getRouting(), resolveRequestSdkLanguage(request)]);
    const path = routePath("invitation", language ?? channel.defaultLocale, routing, { token: "TOKEN" });
    return new URL(path.replace("TOKEN", "{token}"), config.siteUrl).toString();
  },
  commerce: { guestCheckout: config.checkoutAllowGuest, paymentMethodsLimit: 100, resolveCountry: resolveRequestCountry },
  tracking: { enabled: config.trackingEnabled, debug: config.debugLogs },
  forms: { formsValidateFormId: config.formsValidateFormId },
});
