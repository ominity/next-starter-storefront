"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface CommerceCatalogProduct {
  readonly id: string;
  readonly sku: string;
  readonly title: string;
  readonly canonicalPath: string;
  readonly unitPrice: number;
  readonly currency: string;
  readonly coverImage?: string;
}

export interface CommerceCartItem {
  readonly id: string;
  readonly productId?: string;
  readonly sku?: string;
  readonly title?: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly totalPrice: number;
  readonly currency: string;
  readonly imageUrl?: string;
}

export interface CommerceWishlistItem extends CommerceCatalogProduct {}

export interface CommerceOrder {
  readonly id: string;
  readonly status: string;
  readonly number?: string;
  readonly createdAt?: string;
  readonly total: number;
  readonly currency: string;
}

export interface CommercePayment {
  readonly id: string;
  readonly status: string;
  readonly amount: number;
  readonly currency: string;
  readonly createdAt?: string;
}

export interface CommerceCreateOrderInput {
  readonly fullName?: string;
  readonly email?: string;
  readonly address?: string;
  readonly notes?: string;
  readonly shippingAddress?: Readonly<Record<string, unknown>>;
  readonly billingAddress?: Readonly<Record<string, unknown>>;
}

const STORAGE_KEYS = {
  wishlist: "ominity-starter:commerce:wishlist",
} as const;

interface ApiMoney {
  readonly value?: number;
  readonly currency?: string;
}

interface ApiCartItem {
  readonly id?: string;
  readonly productId?: string;
  readonly sku?: string;
  readonly title?: string;
  readonly quantity?: number;
  readonly unitPrice?: ApiMoney;
  readonly totalPrice?: ApiMoney;
  readonly imageUrl?: string;
}

interface ApiOrder {
  readonly id?: string;
  readonly status?: string;
  readonly number?: string;
  readonly createdAt?: string;
  readonly totalAmount?: ApiMoney;
}

interface ApiPayment {
  readonly id?: string;
  readonly status?: string;
  readonly createdAt?: string;
  readonly amount?: ApiMoney;
}

interface CartSnapshotResponse {
  readonly items?: ReadonlyArray<ApiCartItem>;
}

interface CheckoutResponse {
  readonly order?: ApiOrder;
}

interface OrderResponse {
  readonly order?: ApiOrder;
}

interface OrderPaymentsResponse {
  readonly items?: ReadonlyArray<ApiPayment>;
}

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }

    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  return undefined;
}

function requestHeaders(init?: HeadersInit): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...(init ?? {}),
  };
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: requestHeaders(init?.headers),
    cache: "no-store",
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {}

  if (!response.ok) {
    const message = typeof payload === "object"
      && payload !== null
      && typeof (payload as { error?: unknown }).error === "string"
      ? (payload as { error: string }).error
      : `Request failed (${response.status}).`;
    throw new Error(message);
  }

  return payload as T;
}

function normalizeCartItems(items: ReadonlyArray<ApiCartItem> | undefined): ReadonlyArray<CommerceCartItem> {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.flatMap((entry): CommerceCartItem[] => {
    const id = typeof entry.id === "string" ? entry.id : "";
    if (id.length === 0) {
      return [];
    }

    const quantity = asNumber(entry.quantity) ?? 1;
    const unitPrice = asNumber(entry.unitPrice?.value) ?? 0;
    const totalPrice = asNumber(entry.totalPrice?.value) ?? unitPrice * quantity;
    const currency = typeof entry.unitPrice?.currency === "string" && entry.unitPrice.currency.length > 0
      ? entry.unitPrice.currency
      : typeof entry.totalPrice?.currency === "string" && entry.totalPrice.currency.length > 0
        ? entry.totalPrice.currency
        : "EUR";

    return [{
      id,
      ...(typeof entry.productId === "string" ? { productId: entry.productId } : {}),
      ...(typeof entry.sku === "string" ? { sku: entry.sku } : {}),
      ...(typeof entry.title === "string" ? { title: entry.title } : {}),
      quantity: quantity > 0 ? Math.floor(quantity) : 1,
      unitPrice,
      totalPrice,
      currency,
      ...(typeof entry.imageUrl === "string" ? { imageUrl: entry.imageUrl } : {}),
    }];
  });
}


function normalizeOrder(order: ApiOrder | undefined): CommerceOrder | null {
  if (!order || typeof order.id !== "string" || order.id.length === 0) {
    return null;
  }

  const total = asNumber(order.totalAmount?.value) ?? 0;
  const currency = typeof order.totalAmount?.currency === "string" && order.totalAmount.currency.length > 0
    ? order.totalAmount.currency
    : "EUR";

  return {
    id: order.id,
    status: typeof order.status === "string" ? order.status : "unknown",
    ...(typeof order.number === "string" ? { number: order.number } : {}),
    ...(typeof order.createdAt === "string" ? { createdAt: order.createdAt } : {}),
    total,
    currency,
  };
}

function normalizePayments(items: ReadonlyArray<ApiPayment> | undefined): ReadonlyArray<CommercePayment> {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.flatMap((entry): CommercePayment[] => {
    const id = typeof entry.id === "string" ? entry.id : "";
    if (id.length === 0) {
      return [];
    }

    return [{
      id,
      status: typeof entry.status === "string" ? entry.status : "unknown",
      amount: asNumber(entry.amount?.value) ?? 0,
      currency: typeof entry.amount?.currency === "string" && entry.amount.currency.length > 0
        ? entry.amount.currency
        : "EUR",
      ...(typeof entry.createdAt === "string" ? { createdAt: entry.createdAt } : {}),
    }];
  });
}

function splitFullName(fullName: string | undefined): { firstName?: string; lastName?: string } {
  if (typeof fullName !== "string") {
    return {};
  }

  const normalized = fullName.trim();
  if (normalized.length === 0) {
    return {};
  }

  const parts = normalized.split(/\s+/);
  const firstName = parts[0];
  if (!firstName) {
    return {};
  }

  if (parts.length === 1) {
    return {
      firstName,
    };
  }

  const lastName = parts.slice(1).join(" ").trim();
  return {
    firstName,
    ...(lastName.length > 0 ? { lastName } : {}),
  };
}

export interface CommerceContextValue {
  readonly ready: boolean;
  readonly cart: ReadonlyArray<CommerceCartItem>;
  readonly wishlist: ReadonlyArray<CommerceWishlistItem>;
  readonly cartCount: number;
  readonly cartSubtotal: number;
  refreshCart(): Promise<void>;
  addToCart(product: CommerceCatalogProduct, quantity?: number): Promise<void>;
  removeFromCart(itemId: string): Promise<void>;
  setCartQuantity(itemId: string, quantity: number): Promise<void>;
  clearCart(): Promise<void>;
  toggleWishlist(product: CommerceCatalogProduct): void;
  removeFromWishlist(productId: string): void;
  isWishlisted(productId: string): boolean;
  createOrder(input?: CommerceCreateOrderInput): Promise<CommerceOrder | null>;
  getOrderById(orderId: string): Promise<CommerceOrder | null>;
  listOrderPayments(orderId: string): Promise<ReadonlyArray<CommercePayment>>;
}

const CommerceContext = createContext<CommerceContextValue | null>(null);

export interface CommerceProviderProps {
  readonly children: ReactNode;
}

export function CommerceProvider(props: CommerceProviderProps) {
  const [ready, setReady] = useState(false);
  const [cart, setCart] = useState<ReadonlyArray<CommerceCartItem>>([]);
  const [wishlist, setWishlist] = useState<ReadonlyArray<CommerceWishlistItem>>([]);

  const refreshCart = useCallback(async () => {
    const response = await requestJson<CartSnapshotResponse>("/api/commerce/cart");
    setCart(normalizeCartItems(response.items));
  }, []);

  useEffect(() => {
    setWishlist(readStorage<ReadonlyArray<CommerceWishlistItem>>(STORAGE_KEYS.wishlist, []));

    const bootstrap = async () => {
      try {
        await refreshCart();
      } catch {
        setCart([]);
      } finally {
        setReady(true);
      }
    };

    void bootstrap();
  }, [refreshCart]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    writeStorage(STORAGE_KEYS.wishlist, wishlist);
  }, [ready, wishlist]);

  const addToCart = useCallback(async (product: CommerceCatalogProduct, quantity = 1) => {
    const normalizedQuantity = Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1;
    const snapshot = await requestJson<CartSnapshotResponse>("/api/commerce/cart/items", {
      method: "POST",
      body: JSON.stringify({
        productId: product.id,
        quantity: normalizedQuantity,
        sku: product.sku,
        title: product.title,
        unitPrice: product.unitPrice,
        currency: product.currency,
        ...(typeof product.coverImage === "string" ? { imageUrl: product.coverImage } : {}),
      }),
    });

    setCart(normalizeCartItems(snapshot.items));
  }, []);

  const removeFromCart = useCallback(async (itemId: string) => {
    const snapshot = await requestJson<CartSnapshotResponse>(`/api/commerce/cart/items/${encodeURIComponent(itemId)}`, {
      method: "DELETE",
    });
    setCart(normalizeCartItems(snapshot.items));
  }, []);

  const setCartQuantity = useCallback(async (itemId: string, quantity: number) => {
    const snapshot = await requestJson<CartSnapshotResponse>(`/api/commerce/cart/items/${encodeURIComponent(itemId)}`, {
      method: "PATCH",
      body: JSON.stringify({
        quantity,
      }),
    });
    setCart(normalizeCartItems(snapshot.items));
  }, []);

  const clearCart = useCallback(async () => {
    await Promise.all(cart.map((item) => requestJson<CartSnapshotResponse>(
      `/api/commerce/cart/items/${encodeURIComponent(item.id)}`,
      { method: "DELETE" },
    )));
    await refreshCart();
  }, [cart, refreshCart]);

  const toggleWishlist = useCallback((product: CommerceCatalogProduct) => {
    setWishlist((previous) => {
      const exists = previous.some((item) => item.id === product.id);
      if (exists) {
        return previous.filter((item) => item.id !== product.id);
      }

      return [...previous, product];
    });
  }, []);

  const removeFromWishlist = useCallback((productId: string) => {
    setWishlist((previous) => previous.filter((item) => item.id !== productId));
  }, []);

  const isWishlisted = useCallback((productId: string) => {
    return wishlist.some((item) => item.id === productId);
  }, [wishlist]);

  const createOrder = useCallback(async (input?: CommerceCreateOrderInput) => {
    const names = splitFullName(input?.fullName);

    const response = await requestJson<CheckoutResponse>("/api/commerce/checkout", {
      method: "POST",
      body: JSON.stringify({
        ...(typeof input?.email === "string" && input.email.trim().length > 0
          ? { email: input.email.trim() }
          : {}),
        ...(typeof input?.notes === "string" && input.notes.trim().length > 0
          ? { notes: input.notes.trim() }
          : {}),
        ...(typeof input?.address === "string" && input.address.trim().length > 0
          ? {
            shippingAddress: {
              street: input.address.trim(),
              ...(typeof names.firstName === "string" ? { firstName: names.firstName } : {}),
              ...(typeof names.lastName === "string" ? { lastName: names.lastName } : {}),
            },
          }
          : {}),
        ...(input?.shippingAddress ? { shippingAddress: input.shippingAddress } : {}),
        ...(input?.billingAddress ? { billingAddress: input.billingAddress } : {}),
      }),
    });

    await refreshCart();
    return normalizeOrder(response.order);
  }, [refreshCart]);

  const getOrderById = useCallback(async (orderId: string) => {
    const response = await requestJson<OrderResponse>(`/api/commerce/orders/${encodeURIComponent(orderId)}`);
    return normalizeOrder(response.order);
  }, []);

  const listOrderPayments = useCallback(async (orderId: string) => {
    const response = await requestJson<OrderPaymentsResponse>(
      `/api/commerce/orders/${encodeURIComponent(orderId)}/payments`,
    );
    return normalizePayments(response.items);
  }, []);

  const cartCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [cart]);

  const value = useMemo<CommerceContextValue>(() => ({
    ready,
    cart,
    wishlist,
    cartCount,
    cartSubtotal,
    refreshCart,
    addToCart,
    removeFromCart,
    setCartQuantity,
    clearCart,
    toggleWishlist,
    removeFromWishlist,
    isWishlisted,
    createOrder,
    getOrderById,
    listOrderPayments,
  }), [
    ready,
    cart,
    wishlist,
    cartCount,
    cartSubtotal,
    refreshCart,
    addToCart,
    removeFromCart,
    setCartQuantity,
    clearCart,
    toggleWishlist,
    removeFromWishlist,
    isWishlisted,
    createOrder,
    getOrderById,
    listOrderPayments,
  ]);

  return (
    <CommerceContext.Provider value={value}>
      {props.children}
    </CommerceContext.Provider>
  );
}

export function useCommerce(): CommerceContextValue {
  const value = useContext(CommerceContext);
  if (!value) {
    throw new Error("useCommerce must be used inside CommerceProvider.");
  }

  return value;
}
