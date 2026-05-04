import { cookies } from "next/headers";

import {
  createAuthSession,
  loadUserFromAccessToken,
  requestPasswordGrantToken,
  writeAuthSessionCookie,
} from "@/lib/ominity/server/auth";
import { jsonError, parseJsonBody, isRecord } from "@/lib/ominity/server/http";
import { getStarterOminityConfig } from "@/lib/ominity/env";

export async function POST(request: Request): Promise<Response> {
  let payload: unknown;
  try {
    payload = await parseJsonBody(request);
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  if (!isRecord(payload)) {
    return jsonError(400, "INVALID_PAYLOAD", "Request body must be an object.");
  }

  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const password = typeof payload.password === "string" ? payload.password : "";

  if (email.length === 0 || password.length === 0) {
    return jsonError(400, "INVALID_CREDENTIALS", "Email and password are required.");
  }

  const config = getStarterOminityConfig();
  const cookieStore = await cookies();

  if (config.useMockData) {
    const session = {
      accessToken: "mock-access-token",
      tokenType: "Bearer",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      email,
    };

    await writeAuthSessionCookie(cookieStore, session);

    return Response.json({
      session,
      user: {
        email,
      },
      mode: "mock",
    });
  }

  try {
    const token = await requestPasswordGrantToken({
      username: email,
      password,
    });

    const user = await loadUserFromAccessToken(token.accessToken);
    const session = createAuthSession(token, user);
    await writeAuthSessionCookie(cookieStore, session);

    return Response.json({
      session,
      user,
    });
  } catch (error) {
    return jsonError(
      401,
      "LOGIN_FAILED",
      "Login failed. Verify credentials and auth configuration.",
      {
        message: error instanceof Error ? error.message : "Unknown error",
      },
    );
  }
}
