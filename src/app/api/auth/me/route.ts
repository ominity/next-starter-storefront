import { cookies } from "next/headers";

import {
  clearAuthSessionCookie,
  isAuthSessionExpired,
  loadUserFromAccessToken,
  readAuthSessionCookie,
  writeAuthSessionCookie,
} from "@/lib/ominity/server/auth";
import { getStarterOminityConfig } from "@/lib/ominity/env";

export async function GET(): Promise<Response> {
  const config = getStarterOminityConfig();
  const cookieStore = await cookies();
  const session = await readAuthSessionCookie(cookieStore);

  if (!session) {
    return Response.json({
      authenticated: false,
    });
  }

  if (isAuthSessionExpired(session)) {
    clearAuthSessionCookie(cookieStore);
    return Response.json({
      authenticated: false,
    });
  }

  if (config.useMockData) {
    return Response.json({
      authenticated: true,
      session,
      user: {
        ...(typeof session.userId === "number" ? { id: session.userId } : {}),
        ...(typeof session.email === "string" ? { email: session.email } : {}),
        ...(typeof session.firstName === "string" ? { firstName: session.firstName } : {}),
        ...(typeof session.lastName === "string" ? { lastName: session.lastName } : {}),
        ...(typeof session.isMfaEnabled === "boolean" ? { isMfaEnabled: session.isMfaEnabled } : {}),
      },
      mode: "mock",
    });
  }

  try {
    const user = await loadUserFromAccessToken(session.accessToken);
    const mergedSession = {
      ...session,
      ...(typeof user?.id === "number" ? { userId: user.id } : {}),
      ...(typeof user?.email === "string" ? { email: user.email } : {}),
      ...(typeof user?.firstName === "string" ? { firstName: user.firstName } : {}),
      ...(typeof user?.lastName === "string" ? { lastName: user.lastName } : {}),
      ...(typeof user?.isMfaEnabled === "boolean" ? { isMfaEnabled: user.isMfaEnabled } : {}),
    };
    await writeAuthSessionCookie(cookieStore, mergedSession);

    return Response.json({
      authenticated: true,
      session: mergedSession,
      user,
    });
  } catch {
    clearAuthSessionCookie(cookieStore);
    return Response.json({
      authenticated: false,
    });
  }
}
