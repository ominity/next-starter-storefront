import { handleOminitySocialLoginRedirect } from "@ominity/next/auth/proxy";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Keeps social login results out of the address bar. The social login callback redirects with
 * `?socialLogin=…&socialError=…`; this strips them, and a failure's code reaches the login page once as
 * `?socialError=` (read by the `login` view) without showing in the URL.
 *
 * The login page is localized, so each page is its own `loginPath`: a failure redirects to the login page, the error
 * cookie is scoped to that path, and the next request for it gets the error.
 */
export function proxy(request: NextRequest) {
  return handleOminitySocialLoginRedirect(request, { loginPath: request.nextUrl.pathname }) ?? NextResponse.next();
}

export const config = {
  // Every page; not the API routes, Next's own files or static files.
  matcher: ["/((?!api/|_next/|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)"],
};
