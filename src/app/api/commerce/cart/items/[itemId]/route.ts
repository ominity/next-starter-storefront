import { createOminityCommerceCartItemRouteHandlers } from "@ominity/next/commerce";

import { getStarterCommerceRouteConfig } from "@/lib/ominity/server/route-config";

export const { PATCH, DELETE } = createOminityCommerceCartItemRouteHandlers(
  getStarterCommerceRouteConfig(),
);
