import { normalizeLocaleCode } from "@ominity/next/cms";

import { cmsLocalizedStringLinkResolver } from "@/lib/ominity/routing";

export type AuthUtilityRoute =
  | "home"
  | "login"
  | "register"
  | "account"
  | "mfa"
  | "forgotPassword"
  | "resetPassword";

const AUTH_ROUTE_SEGMENTS: Readonly<Record<AuthUtilityRoute, string>> = {
  home: "/",
  login: "/auth/login",
  register: "/auth/register",
  account: "/account",
  mfa: "/auth/mfa",
  forgotPassword: "/auth/forgot-password",
  resetPassword: "/auth/reset-password",
};

export interface AuthUtilityPaths {
  readonly home: string;
  readonly login: string;
  readonly register: string;
  readonly account: string;
  readonly mfa: string;
  readonly forgotPassword: string;
  readonly resetPassword: string;
}

export function buildAuthUtilityPath(route: AuthUtilityRoute, locale: string): string {
  const normalizedLocale = normalizeLocaleCode(locale);
  return cmsLocalizedStringLinkResolver.resolve(
    AUTH_ROUTE_SEGMENTS[route],
    { locale: normalizedLocale },
  ).href;
}

export function buildAuthUtilityPaths(locale: string): AuthUtilityPaths {
  return {
    home: buildAuthUtilityPath("home", locale),
    login: buildAuthUtilityPath("login", locale),
    register: buildAuthUtilityPath("register", locale),
    account: buildAuthUtilityPath("account", locale),
    mfa: buildAuthUtilityPath("mfa", locale),
    forgotPassword: buildAuthUtilityPath("forgotPassword", locale),
    resetPassword: buildAuthUtilityPath("resetPassword", locale),
  };
}
