import { getStarterOminityConfig } from "@/lib/ominity/env";
import { resetPassword } from "@/lib/ominity/server/auth";
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
  const token = typeof payload.token === "string" ? payload.token.trim() : "";
  const password = typeof payload.password === "string" ? payload.password : "";

  if (email.length === 0 || token.length === 0 || password.length < 6) {
    return jsonError(
      400,
      "INVALID_RESET_INPUT",
      "email, token, and password (min 6 chars) are required.",
    );
  }

  try {
    const language = await resolveRequestSdkLanguage(request);
    const userAgent = request.headers.get("user-agent");
    const ipAddress = request.headers.get("x-forwarded-for");
    const result = await resetPassword({
      email,
      token,
      password,
      ...(typeof language === "string" ? { language } : {}),
      ...(typeof userAgent === "string" ? { userAgent } : {}),
      ...(typeof ipAddress === "string" ? { ipAddress } : {}),
    });
    return Response.json(result);
  } catch (error) {
    return jsonError(502, "PASSWORD_RESET_FAILED", "Failed to reset password.", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
