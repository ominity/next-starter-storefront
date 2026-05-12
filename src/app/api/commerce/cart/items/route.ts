import { cookies } from "next/headers";

import { getStarterOminityConfig } from "@/lib/ominity/env";
import { getOrCreateCartSnapshot } from "@/lib/ominity/server/commerce";
import { isRecord, jsonError, parseJsonBody } from "@/lib/ominity/server/http";
import { resolveRequestCountry, resolveRequestSdkLanguage } from "@/lib/ominity/server/language";
import { mockAddCartItem, mockGetOrCreateCart } from "@/lib/ominity/server/mock-commerce";
import { createApiKeySdk } from "@/lib/ominity/server/sdk";

function normalizeQuantity(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 0 ? Math.floor(value) : 1;
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return 1;
}

export async function POST(request: Request): Promise<Response> {
  let payload: unknown;
  try {
    payload = await parseJsonBody(request);
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  if (!isRecord(payload)) {
    return jsonError(400, "INVALID_PAYLOAD", "Request body must be an object.");
  }

  const productId = typeof payload.productId === "string" ? payload.productId.trim() : "";
  const quantity = normalizeQuantity(payload.quantity);

  if (productId.length === 0) {
    return jsonError(400, "INVALID_PRODUCT_ID", "A non-empty productId is required.");
  }

  const config = getStarterOminityConfig();
  const cookieStore = await cookies();

  if (config.useMockData) {
    const current = mockGetOrCreateCart(cookieStore.get(config.cartCookieName)?.value);
    const snapshot = mockAddCartItem({
      cartId: current.cart.id,
      productId,
      quantity,
      ...(typeof payload.sku === "string" ? { sku: payload.sku } : {}),
      ...(typeof payload.title === "string" ? { title: payload.title } : {}),
      ...(typeof payload.unitPrice === "number" ? { unitPrice: payload.unitPrice } : {}),
      ...(typeof payload.currency === "string" ? { currency: payload.currency } : {}),
      ...(typeof payload.imageUrl === "string" ? { imageUrl: payload.imageUrl } : {}),
    });

    cookieStore.set(config.cartCookieName, snapshot.cart.id, {
      path: "/",
      maxAge: config.cartCookieMaxAgeSeconds,
      httpOnly: true,
      secure: config.nodeEnv === "production",
      sameSite: "lax",
    });

    return Response.json({
      ...snapshot,
      mode: "mock",
    });
  }

  try {
    const language = await resolveRequestSdkLanguage(request);
    const country = await resolveRequestCountry(request);
    const createCartData = country ? { country } : {};
    const snapshot = await getOrCreateCartSnapshot(cookieStore, createCartData, language);
    const sdk = createApiKeySdk(language);
    await sdk.commerce.cartItems.create(snapshot.cart.id, productId, quantity);
    const refreshed = await getOrCreateCartSnapshot(cookieStore, createCartData, language);

    return Response.json(refreshed);
  } catch (error) {
    return jsonError(500, "CART_ITEM_CREATE_FAILED", "Failed to add item to cart.", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
