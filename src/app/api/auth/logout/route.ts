import { cookies } from "next/headers";

import { clearAuthSessionCookie } from "@/lib/ominity/server/auth";

export async function POST(): Promise<Response> {
  const cookieStore = await cookies();
  clearAuthSessionCookie(cookieStore);

  return Response.json({
    ok: true,
  });
}
