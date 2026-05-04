import { cookies } from "next/headers";

import {
  clearAuthSessionCookie,
  readAuthSessionCookie,
  validateUserMfaCode,
  loadUserFromAccessToken,
} from "@/lib/ominity/server/auth";
import { getStarterOminityConfig } from "@/lib/ominity/env";
import { isRecord, jsonError, parseJsonBody } from "@/lib/ominity/server/http";

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

  if (!isRecord(payload)) {
    return jsonError(400, "INVALID_PAYLOAD", "Request body must be an object.");
  }

  const method = typeof payload.method === "string" ? payload.method.trim() : "";
  const code = typeof payload.code === "string" ? payload.code.trim() : "";

  if (method.length === 0 || code.length === 0) {
    return jsonError(400, "INVALID_MFA_INPUT", "Both method and code are required.");
  }

  const config = getStarterOminityConfig();
  if (config.useMockData) {
    return Response.json({
      ok: true,
      method,
      mode: "mock",
    });
  }

  try {
    const user = await loadUserFromAccessToken(session.accessToken);
    const userId = typeof user?.id === "number" ? user.id : session.userId;
    if (!userId) {
      return jsonError(400, "MISSING_USER_ID", "Current session does not include a user id.");
    }

    const result = await validateUserMfaCode({
      accessToken: session.accessToken,
      userId,
      method,
      code,
    });

    return Response.json(result);
  } catch {
    clearAuthSessionCookie(cookieStore);
    return jsonError(401, "UNAUTHENTICATED", "Current auth session is invalid.");
  }
}
