import type { OminityOptions } from "@ominity/api-typescript";
import type { Cart } from "@ominity/api-typescript/models/commerce/cart";
import type { CartItem } from "@ominity/api-typescript/models/commerce/cart-item";
import { normalizeLocaleCode, parseLocaleCode } from "@ominity/next/cms";
import {
  createCommerceClient,
  type CommerceClient,
} from "@ominity/next/commerce";
import {
  clearCartIdCookie,
  createCommerceCartItemAndRefresh,
  deleteCommerceCartItemAndRefresh,
  getOrCreateCommerceCartSnapshot,
  refreshCommerceCartSnapshot,
  setCommerceCartItemQuantityAndRefresh,
  updateCommerceCartAndRefresh,
  updateCommerceCartItemAndRefresh,
  type CartCookieOptions,
} from "@ominity/next/next";

import { getStarterChannelContext } from "@/lib/ominity/channel-context";
import { getStarterOminityConfig } from "@/lib/ominity/env";
import { getOminityDebugHttpClient } from "@/lib/ominity/server/sdk-debug-fetcher";

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
  readonly cart: Cart;
  readonly items: ReadonlyArray<CartItem>;
  readonly created: boolean;
}

interface StarterBaseCartInput {
  readonly cookiesStore: StarterCookieStore;
  readonly createCartData?: Readonly<Record<string, unknown>>;
  readonly language?: string;
}

const CART_INCLUDE = "shippingMethod";
const CART_ITEMS_INCLUDE = "product,offer";

const commerceClientByLanguage = new Map<string, CommerceClient>();

function cartCookieOptions(): CartCookieOptions {
  const config = getStarterOminityConfig();
  return {
    name: config.cartCookieName,
    path: "/",
    maxAgeSeconds: config.cartCookieMaxAgeSeconds,
    httpOnly: true,
    secure: config.nodeEnv === "production",
    sameSite: "lax",
  };
}

function sdkOptions(language?: string): OminityOptions {
  const config = getStarterOminityConfig();
  if (!config.apiUrl) {
    throw new Error("OMINITY_API_URL is required.");
  }
  if (!config.apiKey) {
    throw new Error("OMINITY_API_KEY is required.");
  }

  const debugHttpClient = getOminityDebugHttpClient("sdk");
  return {
    serverURL: config.apiUrl,
    security: {
      apiKey: config.apiKey,
    },
    ...(debugHttpClient ? { httpClient: debugHttpClient } : {}),
    ...(typeof language === "string" && language.length > 0 ? { language } : {}),
    ...(typeof config.channelId === "string" ? { channelId: config.channelId } : {}),
  };
}

function languageClientKey(language?: string): string {
  if (typeof language !== "string") {
    return "__default__";
  }

  const normalized = language.trim().toLowerCase();
  return normalized.length > 0 ? normalized : "__default__";
}

export function getStarterCommerceClient(language?: string): CommerceClient {
  const key = languageClientKey(language);
  const cached = commerceClientByLanguage.get(key);
  if (cached) {
    return cached;
  }

  const client = createCommerceClient({
    sdk: sdkOptions(language),
  });
  commerceClientByLanguage.set(key, client);
  return client;
}

function asValidCountry(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : undefined;
}

async function resolveCreateCartCountryFallback(
  createCartData: Readonly<Record<string, unknown>>,
): Promise<string | undefined> {
  const fromPayload = asValidCountry(createCartData.country);
  if (fromPayload) {
    return fromPayload;
  }

  const channelContext = await getStarterChannelContext();
  const fromDefaultCountry = asValidCountry(channelContext.defaultCountry);
  if (fromDefaultCountry) {
    return fromDefaultCountry;
  }

  const defaultLocaleCountry = parseLocaleCode(normalizeLocaleCode(channelContext.defaultLocale)).country;
  const fromDefaultLocale = asValidCountry(defaultLocaleCountry);
  if (fromDefaultLocale) {
    return fromDefaultLocale;
  }

  for (const country of channelContext.countries) {
    const candidate = asValidCountry(country);
    if (candidate) {
      return candidate;
    }
  }

  return undefined;
}

async function resolvedCreateCartData(
  createCartData: Readonly<Record<string, unknown>>,
): Promise<Readonly<Record<string, unknown>>> {
  const createCountry = await resolveCreateCartCountryFallback(createCartData);
  if (!createCountry) {
    throw new Error("Failed to resolve cart country for cart creation.");
  }

  return {
    ...createCartData,
    country: createCountry,
  };
}

function snapshotInput(input: StarterBaseCartInput) {
  return {
    client: getStarterCommerceClient(input.language),
    cookies: input.cookiesStore,
    cookieOptions: cartCookieOptions(),
    cartInclude: CART_INCLUDE,
    itemsInclude: CART_ITEMS_INCLUDE,
  } as const;
}

export function clearCartCookie(cookiesStore: StarterCookieStore): void {
  clearCartIdCookie(cookiesStore, cartCookieOptions());
}

export async function getOrCreateCartSnapshot(
  cookiesStore: StarterCookieStore,
  createCartData: Readonly<Record<string, unknown>> = {},
  language?: string,
): Promise<StarterCartSnapshot> {
  const data = await resolvedCreateCartData(createCartData);
  return getOrCreateCommerceCartSnapshot({
    ...snapshotInput({
      cookiesStore,
      ...(typeof language === "string" ? { language } : {}),
    }),
    createCartData: data,
  });
}

export async function refreshCartSnapshot(
  cookiesStore: StarterCookieStore,
  language?: string,
): Promise<StarterCartSnapshot | null> {
  return refreshCommerceCartSnapshot(snapshotInput({
    cookiesStore,
    ...(typeof language === "string" ? { language } : {}),
  }));
}

export async function updateCartSnapshot(
  cookiesStore: StarterCookieStore,
  data: Readonly<Record<string, unknown>>,
  createCartData: Readonly<Record<string, unknown>> = {},
  language?: string,
): Promise<StarterCartSnapshot> {
  return updateCommerceCartAndRefresh({
    ...snapshotInput({
      cookiesStore,
      ...(typeof language === "string" ? { language } : {}),
    }),
    createCartData: await resolvedCreateCartData(createCartData),
    data,
  });
}

export async function createCartItemSnapshot(
  cookiesStore: StarterCookieStore,
  input: {
    readonly productId: string;
    readonly quantity?: number;
    readonly data?: Readonly<Record<string, unknown>>;
  },
  createCartData: Readonly<Record<string, unknown>> = {},
  language?: string,
): Promise<StarterCartSnapshot> {
  return createCommerceCartItemAndRefresh({
    ...snapshotInput({
      cookiesStore,
      ...(typeof language === "string" ? { language } : {}),
    }),
    createCartData: await resolvedCreateCartData(createCartData),
    productId: input.productId,
    ...(typeof input.quantity === "number" ? { quantity: input.quantity } : {}),
    ...(input.data ? { data: input.data } : {}),
  });
}

export async function updateCartItemSnapshot(
  cookiesStore: StarterCookieStore,
  itemId: string,
  data: Readonly<Record<string, unknown>>,
  createCartData: Readonly<Record<string, unknown>> = {},
  language?: string,
): Promise<StarterCartSnapshot> {
  return updateCommerceCartItemAndRefresh({
    ...snapshotInput({
      cookiesStore,
      ...(typeof language === "string" ? { language } : {}),
    }),
    createCartData: await resolvedCreateCartData(createCartData),
    itemId,
    data,
  });
}

export async function setCartItemQuantitySnapshot(
  cookiesStore: StarterCookieStore,
  itemId: string,
  quantity: number,
  createCartData: Readonly<Record<string, unknown>> = {},
  language?: string,
): Promise<StarterCartSnapshot> {
  return setCommerceCartItemQuantityAndRefresh({
    ...snapshotInput({
      cookiesStore,
      ...(typeof language === "string" ? { language } : {}),
    }),
    createCartData: await resolvedCreateCartData(createCartData),
    itemId,
    quantity,
  });
}

export async function deleteCartItemSnapshot(
  cookiesStore: StarterCookieStore,
  itemId: string,
  createCartData: Readonly<Record<string, unknown>> = {},
  language?: string,
): Promise<StarterCartSnapshot> {
  return deleteCommerceCartItemAndRefresh({
    ...snapshotInput({
      cookiesStore,
      ...(typeof language === "string" ? { language } : {}),
    }),
    createCartData: await resolvedCreateCartData(createCartData),
    itemId,
  });
}
