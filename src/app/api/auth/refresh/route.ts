import { cookies } from "next/headers";

import {
  clearAuthSessionCookie,
  createAuthSession,
  loadUserFromAccessToken,
  readAuthSessionCookie,
  requestRefreshToken,
  writeAuthSessionCookie,
} from "@/lib/ominity/server/auth";
import { getStarterOminityConfig } from "@/lib/ominity/env";
import { jsonError } from "@/lib/ominity/server/http";

export async function POST(): Promise<Response> {
  const config = getStarterOminityConfig();
  const cookieStore = await cookies();
  const session = await readAuthSessionCookie(cookieStore);

  if (!session?.refreshToken) {
    clearAuthSessionCookie(cookieStore);
    return jsonError(401, "NO_REFRESH_TOKEN", "No refresh token available.");
  }

  if (config.useMockData) {
    const refreshed = {
      ...session,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
    await writeAuthSessionCookie(cookieStore, refreshed);

    return Response.json({
      session: refreshed,
      mode: "mock",
    });
  }

  try {
    const token = await requestRefreshToken({
      refreshToken: session.refreshToken,
    });
    const user = await loadUserFromAccessToken(token.accessToken);
    const refreshed = createAuthSession(token, user);
    await writeAuthSessionCookie(cookieStore, refreshed);

    return Response.json({
      session: refreshed,
      user,
    });
  } catch (error) {
    clearAuthSessionCookie(cookieStore);
    return jsonError(
      401,
      "REFRESH_FAILED",
      "Could not refresh auth session.",
      {
        message: error instanceof Error ? error.message : "Unknown error",
      },
    );
  }
}
