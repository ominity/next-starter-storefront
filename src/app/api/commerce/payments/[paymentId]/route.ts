import { getStarterOminityConfig } from "@/lib/ominity/env";
import { jsonError } from "@/lib/ominity/server/http";
import { mockGetPayment } from "@/lib/ominity/server/mock-commerce";
import { normalizePayment } from "@/lib/ominity/server/normalize";
import { createApiKeySdk } from "@/lib/ominity/server/sdk";

interface PaymentRouteProps {
  params: Promise<{
    paymentId: string;
  }>;
}

export async function GET(_: Request, context: PaymentRouteProps): Promise<Response> {
  const { paymentId } = await context.params;
  if (!paymentId || paymentId.trim().length === 0) {
    return jsonError(400, "INVALID_PAYMENT_ID", "A valid payment id is required.");
  }

  const config = getStarterOminityConfig();
  if (config.useMockData) {
    const payment = mockGetPayment(paymentId);
    if (!payment) {
      return jsonError(404, "PAYMENT_NOT_FOUND", "Payment was not found.");
    }

    return Response.json({
      payment,
      mode: "mock",
    });
  }

  try {
    const sdk = createApiKeySdk();
    const payment = await sdk.commerce.payments.get(paymentId);

    return Response.json({
      payment: normalizePayment(payment),
    });
  } catch {
    return jsonError(404, "PAYMENT_NOT_FOUND", "Payment was not found.");
  }
}
