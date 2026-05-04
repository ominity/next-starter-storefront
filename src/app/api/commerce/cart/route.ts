import { cookies } from "next/headers";

import { getStarterOminityConfig } from "@/lib/ominity/env";
import { getOrCreateCartSnapshot } from "@/lib/ominity/server/commerce";
import { isRecord, jsonError, parseJsonBody } from "@/lib/ominity/server/http";
import { mockGetOrCreateCart } from "@/lib/ominity/server/mock-commerce";
import { createApiKeySdk } from "@/lib/ominity/server/sdk";

export async function GET(): Promise<Response> {
  const config = getStarterOminityConfig();
  const cookieStore = await cookies();

  if (config.useMockData) {
    const cartId = cookieStore.get(config.cartCookieName)?.value;
    const snapshot = mockGetOrCreateCart(cartId);
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
    const snapshot = await getOrCreateCartSnapshot(cookieStore);
    return Response.json(snapshot);
  } catch (error) {
    return jsonError(500, "CART_LOAD_FAILED", "Failed to load cart.", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function PATCH(request: Request): Promise<Response> {
  const config = getStarterOminityConfig();
  const cookieStore = await cookies();

  let payload: unknown;
  try {
    payload = await parseJsonBody(request);
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  if (!isRecord(payload) || !isRecord(payload.data)) {
    return jsonError(400, "INVALID_CART_UPDATE", "Request body must contain a `data` object.");
  }

  if (config.useMockData) {
    const cartId = cookieStore.get(config.cartCookieName)?.value;
    const snapshot = mockGetOrCreateCart(cartId);
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
    const snapshot = await getOrCreateCartSnapshot(cookieStore);
    const sdk = createApiKeySdk();
    await sdk.commerce.carts.update(snapshot.cart.id, payload.data as Record<string, any>);
    const refreshed = await getOrCreateCartSnapshot(cookieStore);

    return Response.json(refreshed);
  } catch (error) {
    return jsonError(500, "CART_UPDATE_FAILED", "Failed to update cart.", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
