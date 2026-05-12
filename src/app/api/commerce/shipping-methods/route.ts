import { getStarterOminityConfig } from "@/lib/ominity/env";
import { jsonError } from "@/lib/ominity/server/http";
import { resolveRequestSdkLanguage } from "@/lib/ominity/server/language";
import { normalizeShippingMethods } from "@/lib/ominity/server/normalize";
import { createApiKeySdk } from "@/lib/ominity/server/sdk";

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
    const sdk = createApiKeySdk(language);
    const methods = await sdk.commerce.shippingMethods.list();

    return Response.json({
      items: normalizeShippingMethods(methods),
    });
  } catch (error) {
    return jsonError(500, "SHIPPING_METHODS_FAILED", "Failed to load shipping methods.", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
