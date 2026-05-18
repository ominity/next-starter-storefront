import { getStarterOminityConfig } from "@/lib/ominity/env";
import { getStarterCommerceClient } from "@/lib/ominity/server/commerce";
import { jsonError } from "@/lib/ominity/server/http";
import { resolveRequestSdkLanguage } from "@/lib/ominity/server/language";

export async function GET(request: Request): Promise<Response> {
  const config = getStarterOminityConfig();
  if (config.useMockData) {
    return Response.json({
      items: [{
        id: "standard",
        name: "Standard Shipping",
      }, {
        id: "express",
        name: "Express Shipping",
      }],
      mode: "mock",
    });
  }

  try {
    const language = await resolveRequestSdkLanguage(request);
    const client = getStarterCommerceClient(language);
    const methods = await client.listShippingMethods();

    return Response.json({
      items: methods,
    });
  } catch (error) {
    return jsonError(500, "SHIPPING_METHODS_FAILED", "Failed to load shipping methods.", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
