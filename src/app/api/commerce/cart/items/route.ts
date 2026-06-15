import { createOminityCommerceCartItemsRouteHandlers } from "@ominity/next/commerce";

import { getStarterCommerceRouteConfig } from "@/lib/ominity/server/route-config";

export const { POST } = createOminityCommerceCartItemsRouteHandlers(
  getStarterCommerceRouteConfig(),
);
