import { getStarterOminityConfig } from "@/lib/ominity/env";
import {
  normalizeCart,
  normalizeCartItemsFromCart,
  type StarterApiCart,
  type StarterApiCartItem,
} from "@/lib/ominity/server/normalize";
import { createApiKeySdk } from "@/lib/ominity/server/sdk";
import { ResponseValidationError } from "@ominity/api-typescript/models/errors";

export interface StarterCookieValue {
  readonly value: string;
}

export interface StarterCookieSetOptions {
  readonly path?: string;
  readonly maxAge?: number;
  readonly httpOnly?: boolean;
  readonly secure?: boolean;
  readonly sameSite?: "lax" | "strict" | "none";
}

export interface StarterCookieStore {
  get(name: string): StarterCookieValue | undefined;
  set(...args: any[]): unknown;
}

export interface StarterCartSnapshot {
  readonly cart: StarterApiCart;
  readonly items: ReadonlyArray<StarterApiCartItem>;
  readonly created: boolean;
}

const CART_RELATIONS_INCLUDE = "items,items.product,items.offer,shippingMethod";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function recoverCartFromValidationError(error: unknown): Record<string, unknown> | null {
  if (!(error instanceof ResponseValidationError)) {
    return null;
  }

  if (error.statusCode < 200 || error.statusCode >= 300) {
    return null;
  }

  if (!isRecord(error.rawValue)) {
    return null;
  }

  const payload = error.rawValue;
  const resource = typeof payload.resource === "string" ? payload.resource : "";
  const id = payload.id;
  const hasId = (typeof id === "string" && id.length > 0)
    || (typeof id === "number" && Number.isFinite(id));

  if (resource !== "cart" || !hasId) {
    return null;
  }

  return payload;
}

function cartIdFromCookie(cookiesStore: StarterCookieStore): string | null {
  const config = getStarterOminityConfig();
  const value = cookiesStore.get(config.cartCookieName)?.value;
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function writeCartIdCookie(cookiesStore: StarterCookieStore, cartId: string): void {
  const config = getStarterOminityConfig();
  cookiesStore.set(config.cartCookieName, cartId, {
    path: "/",
    maxAge: config.cartCookieMaxAgeSeconds,
    httpOnly: true,
    secure: config.nodeEnv === "production",
    sameSite: "lax",
  });
}

export function clearCartCookie(cookiesStore: StarterCookieStore): void {
  const config = getStarterOminityConfig();
  cookiesStore.set(config.cartCookieName, "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    secure: config.nodeEnv === "production",
    sameSite: "lax",
  });
}

async function parseResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("json")) {
    return response.json();
  }

  return response.text();
}

async function fetchCartWithRelations(
  cartId: string,
  language?: string,
): Promise<Record<string, unknown> | null> {
  const sdk = createApiKeySdk(language);
  const response = await sdk.http.get(`/commerce/carts/${encodeURIComponent(cartId)}`, {
    query: {
      include: CART_RELATIONS_INCLUDE,
    },
    errorCodes: ["5XX"],
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch cart ${cartId}: status ${response.status}.`);
  }

  const payload = await parseResponseBody(response);
  return isRecord(payload) ? payload : null;
}

export async function getOrCreateCartSnapshot(
  cookiesStore: StarterCookieStore,
  createCartData: Readonly<Record<string, unknown>> = {},
  language?: string,
): Promise<StarterCartSnapshot> {
  const sdk = createApiKeySdk(language);

  let created = false;
  let cartPayload: Record<string, unknown> | null = null;
  const cookieCartId = cartIdFromCookie(cookiesStore);
  if (cookieCartId) {
    cartPayload = await fetchCartWithRelations(cookieCartId, language);
  }

  if (!cartPayload) {
    let createdCartPayload: Record<string, unknown> | null = null;
    try {
      const createdCart = await sdk.commerce.carts.create(createCartData as Record<string, any>);
      createdCartPayload = isRecord(createdCart) ? createdCart as Record<string, unknown> : null;
    } catch (error) {
      const recovered = recoverCartFromValidationError(error);
      if (!recovered) {
        throw error;
      }

      createdCartPayload = recovered;
    }
    created = true;

    if (!createdCartPayload) {
      throw new Error("Failed to create cart.");
    }

    const createdCartId = normalizeCart(createdCartPayload).id;
    if (createdCartId.length === 0) {
      throw new Error("Failed to resolve created cart id.");
    }

    cartPayload = await fetchCartWithRelations(createdCartId, language) ?? createdCartPayload;
  }

  const normalizedCart = normalizeCart(cartPayload);
  if (normalizedCart.id.length === 0) {
    throw new Error("Failed to resolve cart id.");
  }

  writeCartIdCookie(cookiesStore, normalizedCart.id);
  const items = normalizeCartItemsFromCart(cartPayload);

  return {
    cart: normalizedCart,
    items,
    created,
  };
}

export async function refreshCartSnapshot(
  cookiesStore: StarterCookieStore,
  language?: string,
): Promise<StarterCartSnapshot | null> {
  const cartId = cartIdFromCookie(cookiesStore);
  if (!cartId) {
    return null;
  }

  const cartPayload = await fetchCartWithRelations(cartId, language);
  if (!cartPayload) {
    return null;
  }

  const normalizedCart = normalizeCart(cartPayload);
  if (normalizedCart.id.length === 0) {
    return null;
  }

  writeCartIdCookie(cookiesStore, normalizedCart.id);
  const items = normalizeCartItemsFromCart(cartPayload);

  return {
    cart: normalizedCart,
    items,
    created: false,
  };
}
