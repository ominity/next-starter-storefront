import { cookies } from "next/headers";

import {
  clearAuthSessionCookie,
  readAuthSessionCookie,
  sendUserMfaCode,
  loadUserFromAccessToken,
} from "@/lib/ominity/server/auth";
import { getStarterOminityConfig } from "@/lib/ominity/env";
import { isRecord, jsonError, parseJsonBody } from "@/lib/ominity/server/http";
import { resolveRequestSdkLanguage } from "@/lib/ominity/server/language";

export async function POST(request: Request): Promise<Response> {
  const cookieStore = await cookies();
  const session = await readAuthSessionCookie(cookieStore);
  if (!session) {
    return jsonError(401, "UNAUTHENTICATED", "You must be authenticated.");
  }

  let payload: unknown;
  try {
    payload = await parseJsonBody(request);
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  if (!isRecord(payload) || typeof payload.method !== "string" || payload.method.trim().length === 0) {
    return jsonError(400, "INVALID_METHOD", "A non-empty MFA method is required.");
  }

  const method = payload.method.trim();
  const config = getStarterOminityConfig();
  if (config.useMockData) {
    return Response.json({
      ok: true,
      method,
      mode: "mock",
    });
  }

  try {
    const language = await resolveRequestSdkLanguage(request);
    const user = await loadUserFromAccessToken(session.accessToken, language);
    const userId = typeof user?.id === "number" ? user.id : session.userId;
    if (!userId) {
      return jsonError(400, "MISSING_USER_ID", "Current session does not include a user id.");
    }

    const result = await sendUserMfaCode({
      accessToken: session.accessToken,
      userId,
      method,
      ...(typeof language === "string" ? { language } : {}),
    });

    return Response.json({
      ...result,
    });
  } catch {
    clearAuthSessionCookie(cookieStore);
    return jsonError(401, "UNAUTHENTICATED", "Current auth session is invalid.");
  }
}
