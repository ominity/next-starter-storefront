import { getStarterOminityConfig } from "@/lib/ominity/env";
import { jsonError } from "@/lib/ominity/server/http";
import { mockGetOrder } from "@/lib/ominity/server/mock-commerce";
import { normalizeOrder } from "@/lib/ominity/server/normalize";
import { createApiKeySdk } from "@/lib/ominity/server/sdk";

interface OrderRouteProps {
  params: Promise<{
    orderId: string;
  }>;
}

export async function GET(_: Request, context: OrderRouteProps): Promise<Response> {
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
    const sdk = createApiKeySdk();
    const order = await sdk.commerce.orders.get(orderId);

    return Response.json({
      order: normalizeOrder(order),
    });
  } catch {
    return jsonError(404, "ORDER_NOT_FOUND", "Order was not found.");
  }
}
