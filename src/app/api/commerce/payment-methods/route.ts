import { createOminityCommercePaymentMethodsRouteHandlers } from "@ominity/next/commerce";

import { getStarterCommerceRouteConfig } from "@/lib/ominity/server/route-config";

export const { GET } = createOminityCommercePaymentMethodsRouteHandlers(
  getStarterCommerceRouteConfig(),
);
