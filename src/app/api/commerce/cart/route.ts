import { cookies } from "next/headers";

import { getStarterOminityConfig } from "@/lib/ominity/env";
import {
  getOrCreateCartSnapshot,
  updateCartSnapshot,
} from "@/lib/ominity/server/commerce";
import { isRecord, jsonError, parseJsonBody } from "@/lib/ominity/server/http";
import { resolveRequestCountry, resolveRequestSdkLanguage } from "@/lib/ominity/server/language";
import { mockGetOrCreateCart, mockUpdateCart } from "@/lib/ominity/server/mock-commerce";

function asString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizePromotionCodes(value: unknown): ReadonlyArray<string> | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const values = value.flatMap((entry) => {
    if (typeof entry !== "string") {
      return [];
    }

    const trimmed = entry.trim();
    return trimmed.length > 0 ? [trimmed] : [];
  });

  return Array.from(new Set(values));
}

function parseCartUpdatePayload(payload: unknown): {
  readonly data?: Readonly<Record<string, unknown>>;
  readonly error?: string;
} {
  if (!isRecord(payload)) {
    return {
      error: "Request body must be an object.",
    };
  }

  const rawData = isRecord(payload.data) ? payload.data : payload;
  const data: Record<string, unknown> = { ...rawData };

  if ("country" in rawData) {
    const country = asString(rawData.country);
    if (!country || country.length !== 2) {
      return {
        error: "`country` must be a valid 2-letter code.",
      };
    }

    data.country = country.toUpperCase();
  }

  if ("promotionCodes" in rawData) {
    if (!Array.isArray(rawData.promotionCodes)) {
      return {
        error: "`promotionCodes` must be an array.",
      };
    }

    data.promotionCodes = normalizePromotionCodes(rawData.promotionCodes) ?? [];
  }

  if (Object.keys(data).length === 0) {
    return {
      error: "Request body must contain cart update fields.",
    };
  }

  return { data };
}

export async function GET(request: Request): Promise<Response> {
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
    const language = await resolveRequestSdkLanguage(request);
    const country = await resolveRequestCountry(request);
    const snapshot = await getOrCreateCartSnapshot(
      cookieStore,
      country ? { country } : {},
      language,
    );
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

  const parsedUpdate = parseCartUpdatePayload(payload);
  if (parsedUpdate.error || !parsedUpdate.data) {
    return jsonError(400, "INVALID_CART_UPDATE", parsedUpdate.error ?? "Invalid cart update payload.");
  }

  if (config.useMockData) {
    const cartId = cookieStore.get(config.cartCookieName)?.value;
    const current = mockGetOrCreateCart(cartId);
    const mockCountry = asString(parsedUpdate.data.country);
    const mockPromotionCodes = Array.isArray(parsedUpdate.data.promotionCodes)
      ? parsedUpdate.data.promotionCodes.flatMap((entry) => {
        if (typeof entry !== "string") {
          return [];
        }

        const trimmed = entry.trim();
        return trimmed.length > 0 ? [trimmed] : [];
      })
      : undefined;
    const snapshot = mockUpdateCart({
      cartId: current.cart.id,
      ...(typeof mockCountry === "string" ? { country: mockCountry } : {}),
      ...(Array.isArray(mockPromotionCodes) ? { promotionCodes: mockPromotionCodes } : {}),
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
    const refreshed = await updateCartSnapshot(
      cookieStore,
      parsedUpdate.data,
      createCartData,
      language,
    );
    return Response.json(refreshed);
  } catch (error) {
    return jsonError(500, "CART_UPDATE_FAILED", "Failed to update cart.", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
