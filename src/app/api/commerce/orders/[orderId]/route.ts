import { getStarterOminityConfig } from "@/lib/ominity/env";
import { getStarterCommerceClient } from "@/lib/ominity/server/commerce";
import { jsonError } from "@/lib/ominity/server/http";
import { resolveRequestSdkLanguage } from "@/lib/ominity/server/language";
import { mockGetOrder } from "@/lib/ominity/server/mock-commerce";

interface OrderRouteProps {
  params: Promise<{
    orderId: string;
  }>;
}

export async function GET(request: Request, context: OrderRouteProps): Promise<Response> {
  const { orderId } = await context.params;
  if (!orderId || orderId.trim().length === 0) {
    return jsonError(400, "INVALID_ORDER_ID", "A valid order id is required.");
  }

  const config = getStarterOminityConfig();
  if (config.useMockData) {
    const order = mockGetOrder(orderId);
    if (!order) {
      return jsonError(404, "ORDER_NOT_FOUND", "Order was not found.");
    }

    return Response.json({
      order,
      mode: "mock",
    });
  }

  try {
    const language = await resolveRequestSdkLanguage(request);
    const client = getStarterCommerceClient(language);
    const order = await client.getOrder({
      id: orderId,
    });
    if (!order) {
      return jsonError(404, "ORDER_NOT_FOUND", "Order was not found.");
    }

    return Response.json({
      order,
    });
  } catch {
    return jsonError(404, "ORDER_NOT_FOUND", "Order was not found.");
  }
}
