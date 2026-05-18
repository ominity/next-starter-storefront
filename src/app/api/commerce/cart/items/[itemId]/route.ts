import { cookies } from "next/headers";

import { getStarterOminityConfig } from "@/lib/ominity/env";
import {
  deleteCartItemSnapshot,
  setCartItemQuantitySnapshot,
  updateCartItemSnapshot,
} from "@/lib/ominity/server/commerce";
import { isRecord, jsonError, parseJsonBody } from "@/lib/ominity/server/http";
import { resolveRequestCountry, resolveRequestSdkLanguage } from "@/lib/ominity/server/language";
import {
  mockDeleteCartItem,
  mockGetOrCreateCart,
  mockUpdateCartItem,
} from "@/lib/ominity/server/mock-commerce";

interface CartItemRouteProps {
  params: Promise<{
    itemId: string;
  }>;
}

function parseQuantity(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.floor(value);
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

export async function PATCH(request: Request, context: CartItemRouteProps): Promise<Response> {
  const { itemId } = await context.params;
  if (!itemId || itemId.trim().length === 0) {
    return jsonError(400, "INVALID_ITEM_ID", "A valid cart item id is required.");
  }

  let payload: unknown;
  try {
    payload = await parseJsonBody(request);
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  if (!isRecord(payload)) {
    return jsonError(400, "INVALID_PAYLOAD", "Request body must be an object.");
  }

  const quantity = parseQuantity(payload.quantity);
  const hasData = isRecord(payload.data);

  if (quantity === null && !hasData) {
    return jsonError(400, "INVALID_UPDATE", "Provide `quantity` or a `data` object.");
  }

  const config = getStarterOminityConfig();
  const cookieStore = await cookies();

  if (config.useMockData) {
    const current = mockGetOrCreateCart(cookieStore.get(config.cartCookieName)?.value);
    const snapshot = quantity === null
      ? current
      : mockUpdateCartItem({
        cartId: current.cart.id,
        itemId,
        quantity,
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
    const refreshed = quantity !== null
      ? await setCartItemQuantitySnapshot(
        cookieStore,
        itemId,
        quantity,
        createCartData,
        language,
      )
      : await updateCartItemSnapshot(
        cookieStore,
        itemId,
        payload.data as Record<string, unknown>,
        createCartData,
        language,
      );
    return Response.json(refreshed);
  } catch (error) {
    return jsonError(500, "CART_ITEM_UPDATE_FAILED", "Failed to update cart item.", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function DELETE(request: Request, context: CartItemRouteProps): Promise<Response> {
  const { itemId } = await context.params;
  if (!itemId || itemId.trim().length === 0) {
    return jsonError(400, "INVALID_ITEM_ID", "A valid cart item id is required.");
  }

  const config = getStarterOminityConfig();
  const cookieStore = await cookies();

  if (config.useMockData) {
    const current = mockGetOrCreateCart(cookieStore.get(config.cartCookieName)?.value);
    const snapshot = mockDeleteCartItem({
      cartId: current.cart.id,
      itemId,
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
    const refreshed = await deleteCartItemSnapshot(
      cookieStore,
      itemId,
      createCartData,
      language,
    );
    return Response.json(refreshed);
  } catch (error) {
    return jsonError(500, "CART_ITEM_DELETE_FAILED", "Failed to delete cart item.", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
