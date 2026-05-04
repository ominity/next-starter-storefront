import { cookies } from "next/headers";

import {
  createAuthSession,
  loadUserFromAccessToken,
  requestPasswordGrantToken,
  writeAuthSessionCookie,
} from "@/lib/ominity/server/auth";
import { getStarterOminityConfig } from "@/lib/ominity/env";
import { jsonError, isRecord, parseJsonBody } from "@/lib/ominity/server/http";
import { createApiKeySdk } from "@/lib/ominity/server/sdk";

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

  const firstName = typeof payload.firstName === "string" ? payload.firstName.trim() : "";
  const lastName = typeof payload.lastName === "string" ? payload.lastName.trim() : "";
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const password = typeof payload.password === "string" ? payload.password : "";

  if (firstName.length === 0 || email.length === 0 || password.length < 6) {
    return jsonError(
      400,
      "INVALID_REGISTER_INPUT",
      "firstName, email, and password (min 6 chars) are required.",
    );
  }

  const config = getStarterOminityConfig();
  const cookieStore = await cookies();

  if (config.useMockData) {
    const session = {
      accessToken: "mock-access-token",
      tokenType: "Bearer",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      email,
      firstName,
      ...(lastName.length > 0 ? { lastName } : {}),
    };

    await writeAuthSessionCookie(cookieStore, session);

    return Response.json({
      user: {
        email,
        firstName,
        ...(lastName.length > 0 ? { lastName } : {}),
      },
      session,
      mode: "mock",
    });
  }

  try {
    const sdk = createApiKeySdk();
    const user = await sdk.users.create({
      firstName,
      ...(lastName.length > 0 ? { lastName } : {}),
      email,
      password,
    });

    let session = null as ReturnType<typeof createAuthSession> | null;
    let authedUser = null as Awaited<ReturnType<typeof loadUserFromAccessToken>> | null;

    try {
      const token = await requestPasswordGrantToken({
        username: email,
        password,
      });
      authedUser = await loadUserFromAccessToken(token.accessToken);
      session = createAuthSession(token, authedUser);
      await writeAuthSessionCookie(cookieStore, session);
    } catch {}

    return Response.json({
      user: {
        ...(typeof user.id === "number" ? { id: user.id } : {}),
        ...(typeof user.email === "string" ? { email: user.email } : {}),
        ...(typeof user.firstName === "string" ? { firstName: user.firstName } : {}),
        ...(typeof user.lastName === "string" ? { lastName: user.lastName } : {}),
      },
      ...(authedUser ? { me: authedUser } : {}),
      ...(session ? { session } : {}),
    });
  } catch (error) {
    return jsonError(
      400,
      "REGISTER_FAILED",
      "Registration failed.",
      {
        message: error instanceof Error ? error.message : "Unknown error",
      },
    );
  }
}
