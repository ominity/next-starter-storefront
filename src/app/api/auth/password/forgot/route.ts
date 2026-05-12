import { getStarterOminityConfig } from "@/lib/ominity/env";
import { sendPasswordResetLink } from "@/lib/ominity/server/auth";
import { isRecord, jsonError, parseJsonBody } from "@/lib/ominity/server/http";
import { resolveRequestSdkLanguage } from "@/lib/ominity/server/language";

export async function POST(request: Request): Promise<Response> {
  let payload: unknown;
  try {
    payload = await parseJsonBody(request);
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const config = getStarterOminityConfig();
  if (config.useMockData) {
    return Response.json({
      ok: true,
      mode: "mock",
    });
  }

  if (!isRecord(payload)) {
    return jsonError(400, "INVALID_PAYLOAD", "Request body must be an object.");
  }

  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const redirectUrl = typeof payload.redirectUrl === "string" && payload.redirectUrl.trim().length > 0
    ? payload.redirectUrl.trim()
    : `${config.siteUrl.replace(/\/+$/, "")}/auth/reset-password`;

  if (email.length === 0) {
    return jsonError(400, "INVALID_EMAIL", "A valid email is required.");
  }

  try {
    const language = await resolveRequestSdkLanguage(request);
    const userAgent = request.headers.get("user-agent");
    const ipAddress = request.headers.get("x-forwarded-for");
    const result = await sendPasswordResetLink({
      email,
      redirectUrl,
      ...(typeof language === "string" ? { language } : {}),
      ...(typeof userAgent === "string" ? { userAgent } : {}),
      ...(typeof ipAddress === "string" ? { ipAddress } : {}),
    });
    return Response.json(result);
  } catch (error) {
    return jsonError(502, "PASSWORD_FORGOT_FAILED", "Failed to request password reset.", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
