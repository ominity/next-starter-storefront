import { createOminityCommerceShippingMethodsRouteHandlers } from "@ominity/next/commerce";

import { getStarterCommerceRouteConfig } from "@/lib/ominity/server/route-config";

export const { GET } = createOminityCommerceShippingMethodsRouteHandlers(
  getStarterCommerceRouteConfig(),
);
