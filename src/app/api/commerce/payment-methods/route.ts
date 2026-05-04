import { getStarterOminityConfig } from "@/lib/ominity/env";
import { jsonError } from "@/lib/ominity/server/http";
import { normalizePaymentMethods } from "@/lib/ominity/server/normalize";
import { createApiKeySdk } from "@/lib/ominity/server/sdk";

export async function GET(): Promise<Response> {
  const config = getStarterOminityConfig();
  if (config.useMockData) {
    return Response.json({
      items: [{
        id: "1",
        label: "Card",
        gateway: "mock",
        method: "card",
        isEnabled: true,
      }],
      mode: "mock",
    });
  }

  try {
    const sdk = createApiKeySdk();
    const methods = await sdk.settings.paymentMethods.list({
      page: 1,
      limit: 100,
    });

    return Response.json({
      items: normalizePaymentMethods(methods),
    });
  } catch (error) {
    return jsonError(500, "PAYMENT_METHODS_FAILED", "Failed to load payment methods.", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
