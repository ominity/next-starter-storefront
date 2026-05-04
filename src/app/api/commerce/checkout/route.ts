import { cookies } from "next/headers";

import { getStarterOminityConfig } from "@/lib/ominity/env";
import { getOrCreateCartSnapshot } from "@/lib/ominity/server/commerce";
import { isRecord, jsonError, parseJsonBody } from "@/lib/ominity/server/http";
import { mockCreateOrder, mockGetOrCreateCart } from "@/lib/ominity/server/mock-commerce";
import { normalizeOrder } from "@/lib/ominity/server/normalize";
import { createApiKeySdk } from "@/lib/ominity/server/sdk";

function asString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asStringList(value: unknown): ReadonlyArray<string> | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const entries = value.flatMap((entry) => {
    if (typeof entry !== "string") {
      return [];
    }

    const trimmed = entry.trim();
    return trimmed.length > 0 ? [trimmed] : [];
  });

  return entries.length > 0 ? entries : undefined;
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

  const config = getStarterOminityConfig();
  const cookieStore = await cookies();

  if (config.useMockData) {
    const snapshot = mockGetOrCreateCart(cookieStore.get(config.cartCookieName)?.value);
    const order = mockCreateOrder({
      cartId: snapshot.cart.id,
    });

    cookieStore.set(config.cartCookieName, snapshot.cart.id, {
      path: "/",
      maxAge: config.cartCookieMaxAgeSeconds,
      httpOnly: true,
      secure: config.nodeEnv === "production",
      sameSite: "lax",
    });

    return Response.json({
      order,
      mode: "mock",
    });
  }

  try {
    const snapshot = await getOrCreateCartSnapshot(cookieStore);
    const sdk = createApiKeySdk();

    const orderData: Record<string, unknown> = isRecord(payload.orderData)
      ? { ...payload.orderData }
      : {};

    orderData.cartId = asString(payload.cartId) ?? snapshot.cart.id;

    const email = asString(payload.email);
    if (email) {
      orderData.email = email;
    }

    const notes = asString(payload.notes);
    if (notes) {
      orderData.notes = notes;
    }

    const companyName = asString(payload.companyName);
    if (companyName) {
      orderData.companyName = companyName;
    }

    const companyVat = asString(payload.companyVat);
    if (companyVat) {
      orderData.companyVat = companyVat;
    }

    const shippingMethodId = asString(payload.shippingMethodId);
    if (shippingMethodId) {
      orderData.shippingMethodId = shippingMethodId;
    }

    if (isRecord(payload.billingAddress)) {
      orderData.billingAddress = payload.billingAddress;
    }

    if (isRecord(payload.shippingAddress)) {
      orderData.shippingAddress = payload.shippingAddress;
    }

    const promotionCodes = asStringList(payload.promotionCodes);
    if (promotionCodes) {
      orderData.promotionCodes = promotionCodes;
    }

    const order = await sdk.commerce.orders.create(orderData as Record<string, any>);
    const normalizedOrder = normalizeOrder(order);
    if (!normalizedOrder.id) {
      return jsonError(500, "ORDER_CREATE_FAILED", "Order created but response did not include an id.");
    }

    return Response.json({
      order: normalizedOrder,
    });
  } catch (error) {
    return jsonError(500, "CHECKOUT_FAILED", "Failed to create order.", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
