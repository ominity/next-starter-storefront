import { cookies } from "next/headers";

import { getStarterOminityConfig } from "@/lib/ominity/env";
import { createCartItemSnapshot } from "@/lib/ominity/server/commerce";
import { isRecord, jsonError, parseJsonBody } from "@/lib/ominity/server/http";
import { resolveRequestCountry, resolveRequestSdkLanguage } from "@/lib/ominity/server/language";
import { mockAddCartItem, mockGetOrCreateCart } from "@/lib/ominity/server/mock-commerce";

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

function normalizeProductId(value: unknown): string | number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (Number.isFinite(parsed) && `${parsed}` === trimmed) {
    return parsed;
  }

  return trimmed;
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

  const productId = normalizeProductId(payload.productId);
  const quantity = normalizeQuantity(payload.quantity);

  if (productId === null) {
    return jsonError(400, "INVALID_PRODUCT_ID", "A non-empty productId is required.");
  }

  const config = getStarterOminityConfig();
  const cookieStore = await cookies();

  if (config.useMockData) {
    const current = mockGetOrCreateCart(cookieStore.get(config.cartCookieName)?.value);
    const snapshot = mockAddCartItem({
      cartId: current.cart.id,
      productId: String(productId),
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
    const refreshed = await createCartItemSnapshot(
      cookieStore,
      {
        productId: String(productId),
        quantity,
      },
      createCartData,
      language,
    );
    return Response.json(refreshed);
  } catch (error) {
    return jsonError(500, "CART_ITEM_CREATE_FAILED", "Failed to add item to cart.", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
