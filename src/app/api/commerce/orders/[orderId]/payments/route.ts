import { getStarterOminityConfig } from "@/lib/ominity/env";
import { jsonError } from "@/lib/ominity/server/http";
import { mockListOrderPayments } from "@/lib/ominity/server/mock-commerce";
import { normalizePayments } from "@/lib/ominity/server/normalize";
import { createApiKeySdk } from "@/lib/ominity/server/sdk";

interface OrderPaymentsRouteProps {
  params: Promise<{
    orderId: string;
  }>;
}

export async function GET(_: Request, context: OrderPaymentsRouteProps): Promise<Response> {
  const { orderId } = await context.params;
  if (!orderId || orderId.trim().length === 0) {
    return jsonError(400, "INVALID_ORDER_ID", "A valid order id is required.");
  }

  const config = getStarterOminityConfig();
  if (config.useMockData) {
    return Response.json({
      items: mockListOrderPayments(orderId),
      mode: "mock",
    });
  }

  try {
    const sdk = createApiKeySdk();
    const payments = await sdk.commerce.orders.listPayments(orderId);

    return Response.json({
      items: normalizePayments(payments),
    });
  } catch (error) {
    return jsonError(500, "ORDER_PAYMENTS_FAILED", "Failed to load order payments.", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
