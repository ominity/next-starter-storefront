import { cookies } from "next/headers";

import {
  clearAuthSessionCookie,
  listUserMfaMethods,
  loadUserFromAccessToken,
  readAuthSessionCookie,
} from "@/lib/ominity/server/auth";
import { jsonError } from "@/lib/ominity/server/http";
import { getStarterOminityConfig } from "@/lib/ominity/env";

export async function GET(): Promise<Response> {
  const config = getStarterOminityConfig();
  const cookieStore = await cookies();
  const session = await readAuthSessionCookie(cookieStore);
  if (!session) {
    return jsonError(401, "UNAUTHENTICATED", "You must be authenticated.");
  }

  if (config.useMockData) {
    return Response.json({
      items: [{
        method: "email",
        isEnabled: true,
      }],
      mode: "mock",
    });
  }

  try {
    const user = await loadUserFromAccessToken(session.accessToken);
    const userId = typeof user?.id === "number" ? user.id : session.userId;
    if (!userId) {
      return jsonError(400, "MISSING_USER_ID", "Current session does not include a user id.");
    }

    const methods = await listUserMfaMethods({
      accessToken: session.accessToken,
      userId,
    });

    return Response.json({
      items: methods,
    });
  } catch {
    clearAuthSessionCookie(cookieStore);
    return jsonError(401, "UNAUTHENTICATED", "Current auth session is invalid.");
  }
}
