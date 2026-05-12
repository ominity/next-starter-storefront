import {
  createAuthClient,
  createAuthSession as createOminityAuthSession,
  isAuthSessionExpired,
  requestPasswordGrantToken as requestPasswordGrantTokenWithSdk,
  requestRefreshToken as requestRefreshTokenWithSdk,
  type AuthMfaMethod,
  type AuthSession,
  type OAuthTokenResponse,
} from "@ominity/next/auth";
import {
  clearAuthSessionCookie as clearAuthSessionCookieWithSdk,
  readAuthSessionCookie as readAuthSessionCookieWithSdk,
  writeAuthSessionCookie as writeAuthSessionCookieWithSdk,
  type AuthSessionCookieOptions,
} from "@ominity/next/next";

import { getStarterOminityConfig } from "@/lib/ominity/env";
import { normalizeUser, type StarterApiUser } from "@/lib/ominity/server/normalize";
import { createOAuthSdk } from "@/lib/ominity/server/sdk";

export type StarterOAuthToken = OAuthTokenResponse;

export interface StarterAuthSession extends AuthSession {
  readonly firstName?: string;
  readonly lastName?: string;
  readonly isMfaEnabled?: boolean;
}

export interface StarterCookieValue {
  readonly value: string;
}

export interface StarterCookieStore {
  get(name: string): StarterCookieValue | undefined;
  set(...args: any[]): unknown;
}

const DEV_SESSION_SECRET = "development-only-ominity-session-secret-change-me";

function resolveAuthClientSdkOptions(
  accessToken?: string,
  language?: string,
): {
  serverURL: string;
  language?: string;
  channelId?: string;
  security?: {
    apiKey?: string;
    oAuth?: string;
  };
} {
  const config = getStarterOminityConfig();
  if (!config.apiUrl) {
    throw new Error("OMINITY_API_URL is required.");
  }

  const security = accessToken
    ? {
      oAuth: accessToken,
    }
    : config.apiKey
      ? {
        apiKey: config.apiKey,
      }
      : undefined;

  return {
    serverURL: config.apiUrl,
    ...(typeof language === "string" && language.length > 0 ? { language } : {}),
    ...(typeof config.channelId === "string" ? { channelId: config.channelId } : {}),
    ...(security ? { security } : {}),
  };
}

function resolveTokenConfig(): {
  clientId: string;
  clientSecret: string;
  scope?: string;
} {
  const config = getStarterOminityConfig();
  if (!config.authClientId || !config.authClientSecret) {
    throw new Error(
      "Missing auth config: OMINITY_AUTH_CLIENT_ID, OMINITY_AUTH_CLIENT_SECRET.",
    );
  }

  return {
    clientId: config.authClientId,
    clientSecret: config.authClientSecret,
    ...(typeof config.authScope === "string" ? { scope: config.authScope } : {}),
  };
}

function resolveAuthSessionSecret(): string {
  const config = getStarterOminityConfig();
  if (typeof config.authSessionSecret === "string" && config.authSessionSecret.length >= 32) {
    return config.authSessionSecret;
  }

  if (config.nodeEnv === "production") {
    throw new Error(
      "OMINITY_AUTH_SESSION_SECRET must be configured in production (minimum 32 characters).",
    );
  }

  return DEV_SESSION_SECRET;
}

function resolveCookieOptions(): AuthSessionCookieOptions {
  const config = getStarterOminityConfig();

  return {
    name: config.authCookieName,
    maxAgeSeconds: config.authCookieMaxAgeSeconds,
    path: "/",
    httpOnly: true,
    secure: config.nodeEnv === "production",
    sameSite: "lax",
    sessionSecret: resolveAuthSessionSecret(),
  };
}

function createServerAuthClient(accessToken?: string, language?: string) {
  return createAuthClient({
    sdk: resolveAuthClientSdkOptions(accessToken, language),
    debug: {
      enabled: getStarterOminityConfig().debugLogs,
    },
  });
}

function toPublicMfaMethod(item: AuthMfaMethod): {
  method: string;
  isEnabled: boolean;
  verifiedAt?: string | null;
  lastUsedAt?: string | null;
  lastSentAt?: string | null;
} {
  const result: {
    method: string;
    isEnabled: boolean;
    verifiedAt?: string | null;
    lastUsedAt?: string | null;
    lastSentAt?: string | null;
  } = {
    method: item.method,
    isEnabled: item.isEnabled,
  };

  if (typeof item.verifiedAt === "string" || item.verifiedAt === null) {
    result.verifiedAt = item.verifiedAt;
  }
  if (typeof item.lastUsedAt === "string" || item.lastUsedAt === null) {
    result.lastUsedAt = item.lastUsedAt;
  }
  if (typeof item.lastSentAt === "string" || item.lastSentAt === null) {
    result.lastSentAt = item.lastSentAt;
  }

  return result;
}

export async function requestPasswordGrantToken(input: {
  readonly username: string;
  readonly password: string;
  readonly language?: string;
}): Promise<StarterOAuthToken> {
  const tokenConfig = resolveTokenConfig();

  return requestPasswordGrantTokenWithSdk({
    sdk: resolveAuthClientSdkOptions(undefined, input.language),
    username: input.username,
    password: input.password,
    clientId: tokenConfig.clientId,
    clientSecret: tokenConfig.clientSecret,
    ...(typeof tokenConfig.scope === "string" ? { scope: tokenConfig.scope } : {}),
  });
}

export async function requestRefreshToken(input: {
  readonly refreshToken: string;
  readonly language?: string;
}): Promise<StarterOAuthToken> {
  const tokenConfig = resolveTokenConfig();

  return requestRefreshTokenWithSdk({
    sdk: resolveAuthClientSdkOptions(undefined, input.language),
    refreshToken: input.refreshToken,
    clientId: tokenConfig.clientId,
    clientSecret: tokenConfig.clientSecret,
    ...(typeof tokenConfig.scope === "string" ? { scope: tokenConfig.scope } : {}),
  });
}

export function createAuthSession(
  token: StarterOAuthToken,
  user?: StarterApiUser | null,
): StarterAuthSession {
  return createOminityAuthSession(token, {
    ...(typeof user?.id === "number" ? { userId: user.id } : {}),
    ...(typeof user?.email === "string" ? { email: user.email } : {}),
  });
}

export async function readAuthSessionCookie(
  cookiesStore: StarterCookieStore,
): Promise<StarterAuthSession | null> {
  const session = await readAuthSessionCookieWithSdk(cookiesStore, resolveCookieOptions());
  if (!session) {
    return null;
  }

  return session;
}

export async function writeAuthSessionCookie(
  cookiesStore: StarterCookieStore,
  session: StarterAuthSession,
): Promise<void> {
  await writeAuthSessionCookieWithSdk(cookiesStore, session, resolveCookieOptions());
}

export function clearAuthSessionCookie(cookiesStore: StarterCookieStore): void {
  clearAuthSessionCookieWithSdk(cookiesStore, resolveCookieOptions());
}

export async function loadUserFromAccessToken(
  accessToken: string,
  language?: string,
): Promise<StarterApiUser | null> {
  const sdk = createOAuthSdk(accessToken, language);
  const me = await sdk.me.get();
  return normalizeUser(me);
}

export async function listUserMfaMethods(input: {
  readonly accessToken: string;
  readonly userId: number;
  readonly language?: string;
}): Promise<ReadonlyArray<{
  method: string;
  isEnabled: boolean;
  verifiedAt?: string | null;
  lastUsedAt?: string | null;
  lastSentAt?: string | null;
}>> {
  const authClient = createServerAuthClient(input.accessToken, input.language);
  const response = await authClient.listUserMfaMethods({
    userId: input.userId,
  });

  return response.items.map((item) => toPublicMfaMethod(item));
}

export async function sendUserMfaCode(input: {
  readonly accessToken: string;
  readonly userId: number;
  readonly method: string;
  readonly language?: string;
}): Promise<{ ok: boolean; method: string }> {
  const authClient = createServerAuthClient(input.accessToken, input.language);
  const result = await authClient.sendUserMfaCode({
    userId: input.userId,
    method: input.method,
  });

  return {
    ok: result.success === true,
    method: input.method,
  };
}

export async function validateUserMfaCode(input: {
  readonly accessToken: string;
  readonly userId: number;
  readonly method: string;
  readonly code: string;
  readonly language?: string;
}): Promise<{
  ok: boolean;
  method: string;
  item?: {
    method: string;
    isEnabled: boolean;
    verifiedAt?: string | null;
    lastUsedAt?: string | null;
    lastSentAt?: string | null;
  };
}> {
  const authClient = createServerAuthClient(input.accessToken, input.language);
  const result = await authClient.validateUserMfaCode({
    userId: input.userId,
    method: input.method,
    code: input.code,
  });

  let item: AuthMfaMethod | undefined;
  if (result.success) {
    try {
      item = await authClient.getUserMfaMethod({
        userId: input.userId,
        method: input.method,
      });
    } catch {}
  }

  return {
    ok: result.success === true,
    method: input.method,
    ...(item ? { item: toPublicMfaMethod(item) } : {}),
  };
}

export async function validateUserRecoveryCode(input: {
  readonly accessToken: string;
  readonly userId: number;
  readonly code: string;
  readonly language?: string;
}): Promise<{ ok: boolean }> {
  const authClient = createServerAuthClient(input.accessToken, input.language);
  const result = await authClient.validateUserRecoveryCode({
    userId: input.userId,
    code: input.code,
  });

  return {
    ok: result.success === true,
  };
}

export async function sendPasswordResetLink(input: {
  readonly email: string;
  readonly redirectUrl: string;
  readonly userAgent?: string | null;
  readonly ipAddress?: string | null;
  readonly language?: string;
}): Promise<{ ok: boolean; message: string; expiresAt?: string }> {
  const authClient = createServerAuthClient(undefined, input.language);
  const result = await authClient.sendPasswordResetLink({
    email: input.email,
    redirectUrl: input.redirectUrl,
    ...(typeof input.userAgent === "string" || input.userAgent === null
      ? { userAgent: input.userAgent }
      : {}),
    ...(typeof input.ipAddress === "string" || input.ipAddress === null
      ? { ipAddress: input.ipAddress }
      : {}),
  });

  return {
    ok: result.success === true,
    message: result.message,
    ...(typeof result.expiresAt === "string" ? { expiresAt: result.expiresAt } : {}),
  };
}

export async function resetPassword(input: {
  readonly email: string;
  readonly token: string;
  readonly password: string;
  readonly userAgent?: string | null;
  readonly ipAddress?: string | null;
  readonly language?: string;
}): Promise<{ ok: boolean; message: string; updatedAt?: string }> {
  const authClient = createServerAuthClient(undefined, input.language);
  const result = await authClient.resetPassword({
    email: input.email,
    token: input.token,
    password: input.password,
    ...(typeof input.userAgent === "string" || input.userAgent === null
      ? { userAgent: input.userAgent }
      : {}),
    ...(typeof input.ipAddress === "string" || input.ipAddress === null
      ? { ipAddress: input.ipAddress }
      : {}),
  });

  return {
    ok: result.success === true,
    message: result.message,
    ...(typeof result.updatedAt === "string" ? { updatedAt: result.updatedAt } : {}),
  };
}

export { isAuthSessionExpired };
