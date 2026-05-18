import { getStarterOminityConfig } from "@/lib/ominity/env";
import { getStarterCommerceClient } from "@/lib/ominity/server/commerce";
import { jsonError } from "@/lib/ominity/server/http";
import { resolveRequestSdkLanguage } from "@/lib/ominity/server/language";

export async function GET(request: Request): Promise<Response> {
  const config = getStarterOminityConfig();
  if (config.useMockData) {
    return Response.json({
      items: [{
        resource: "paymentmethod",
        id: 1,
        label: "Card",
        gateway: "mock",
        method: "card",
        icon: "",
        isEnabled: true,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        links: {
          self: {
            href: "https://mock.ominity.local/payment-methods/1",
            type: "application/hal+json",
          },
        },
      }],
      mode: "mock",
    });
  }

  try {
    const language = await resolveRequestSdkLanguage(request);
    const client = getStarterCommerceClient(language);
    const methods = await client.listPaymentMethods({
      page: 1,
      limit: 100,
    });

    return Response.json({
      items: methods,
    });
  } catch (error) {
    return jsonError(500, "PAYMENT_METHODS_FAILED", "Failed to load payment methods.", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
