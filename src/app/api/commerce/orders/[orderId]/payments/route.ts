import { getStarterOminityConfig } from "@/lib/ominity/env";
import { getStarterCommerceClient } from "@/lib/ominity/server/commerce";
import { jsonError } from "@/lib/ominity/server/http";
import { resolveRequestSdkLanguage } from "@/lib/ominity/server/language";
import { mockListOrderPayments } from "@/lib/ominity/server/mock-commerce";

interface OrderPaymentsRouteProps {
  params: Promise<{
    orderId: string;
  }>;
}

export async function GET(request: Request, context: OrderPaymentsRouteProps): Promise<Response> {
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
    const language = await resolveRequestSdkLanguage(request);
    const client = getStarterCommerceClient(language);
    const payments = await client.listOrderPayments({
      orderId,
    });

    return Response.json({
      items: payments,
    });
  } catch (error) {
    return jsonError(500, "ORDER_PAYMENTS_FAILED", "Failed to load order payments.", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
