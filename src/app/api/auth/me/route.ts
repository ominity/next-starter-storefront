import { createOminityAuthMeRouteHandler } from "@ominity/next/auth";

import { getStarterAuthRouteConfig } from "@/lib/ominity/server/route-config";

export const GET = createOminityAuthMeRouteHandler(getStarterAuthRouteConfig());
