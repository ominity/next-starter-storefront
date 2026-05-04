import { getStarterOminityConfig } from "@/lib/ominity/env";
import {
  normalizeCart,
  normalizeCartItems,
  type StarterApiCart,
  type StarterApiCartItem,
} from "@/lib/ominity/server/normalize";
import { createApiKeySdk } from "@/lib/ominity/server/sdk";

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

async function fetchCartItems(cartId: string): Promise<ReadonlyArray<StarterApiCartItem>> {
  const sdk = createApiKeySdk();
  const listResponse = await sdk.commerce.cartItems.list(cartId, {
    cartId,
    include: "product",
    limit: 250,
  });

  return normalizeCartItems(listResponse);
}

export async function getOrCreateCartSnapshot(
  cookiesStore: StarterCookieStore,
  createCartData: Readonly<Record<string, unknown>> = {},
): Promise<StarterCartSnapshot> {
  const sdk = createApiKeySdk();

  let created = false;
  let cart = null as Awaited<ReturnType<typeof sdk.commerce.carts.get>> | null;
  const cookieCartId = cartIdFromCookie(cookiesStore);
  if (cookieCartId) {
    try {
      cart = await sdk.commerce.carts.get(cookieCartId, {
        include: "billingAddress,shippingAddress",
      });
    } catch {
      cart = null;
    }
  }

  if (!cart) {
    cart = await sdk.commerce.carts.create(createCartData as Record<string, any>);
    created = true;
  }

  const normalizedCart = normalizeCart(cart);
  if (normalizedCart.id.length === 0) {
    throw new Error("Failed to resolve cart id.");
  }

  writeCartIdCookie(cookiesStore, normalizedCart.id);
  const items = await fetchCartItems(normalizedCart.id);

  return {
    cart: normalizedCart,
    items,
    created,
  };
}

export async function refreshCartSnapshot(cookiesStore: StarterCookieStore): Promise<StarterCartSnapshot | null> {
  const cartId = cartIdFromCookie(cookiesStore);
  if (!cartId) {
    return null;
  }

  const sdk = createApiKeySdk();

  let cart: Awaited<ReturnType<typeof sdk.commerce.carts.get>> | null = null;
  try {
    cart = await sdk.commerce.carts.get(cartId, {
      include: "billingAddress,shippingAddress",
    });
  } catch {
    return null;
  }

  const normalizedCart = normalizeCart(cart);
  if (normalizedCart.id.length === 0) {
    return null;
  }

  writeCartIdCookie(cookiesStore, normalizedCart.id);
  const items = await fetchCartItems(normalizedCart.id);

  return {
    cart: normalizedCart,
    items,
    created: false,
  };
}
