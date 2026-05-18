"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type {
  Cart as ApiCart,
} from "@ominity/api-typescript/models/commerce/cart";
import type {
  CartItem as ApiCartItem,
} from "@ominity/api-typescript/models/commerce/cart-item";
import type {
  Order as ApiOrder,
} from "@ominity/api-typescript/models/commerce/order";
import type {
  Payment as ApiPayment,
} from "@ominity/api-typescript/models/commerce/payment";
import {
  commerceCartItemCurrency,
  commerceCartItemId,
  commerceCartItemProductId,
  commerceCartItemQuantity,
  commerceCartItemSku,
  commerceCartItemTitle,
  commerceCartItemTotalPrice,
  commerceOrderCurrency,
  commerceOrderId,
  commerceOrderTotal,
  commercePaymentId,
} from "@ominity/next/commerce";
import { emitCommerceEvent } from "@/lib/ominity/commerce/events";

export interface CommerceCatalogProduct {
  readonly id: string;
  readonly sku: string;
  readonly title: string;
  readonly canonicalPath: string;
  readonly unitPrice: number;
  readonly currency: string;
  readonly coverImage?: string;
}

export type CommerceCartItem = ApiCartItem;

export interface CommerceWishlistItem extends CommerceCatalogProduct {}

export type CommerceOrder = ApiOrder;
export type CommercePayment = ApiPayment;

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

interface CartSnapshotResponse {
  readonly cart?: ApiCart;
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

  return items.filter((entry) => commerceCartItemId(entry).length > 0);
}

function normalizePromotionCodes(value: ReadonlyArray<string> | undefined): ReadonlyArray<string> {
  if (!Array.isArray(value)) {
    return [];
  }

  const entries = value.flatMap((entry) => {
    if (typeof entry !== "string") {
      return [];
    }

    const trimmed = entry.trim();
    return trimmed.length > 0 ? [trimmed] : [];
  });

  return Array.from(new Set(entries));
}


function normalizeOrder(order: ApiOrder | undefined): CommerceOrder | null {
  if (!order) {
    return null;
  }

  return commerceOrderId(order).length > 0 ? order : null;
}

function normalizePayments(items: ReadonlyArray<ApiPayment> | undefined): ReadonlyArray<CommercePayment> {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.filter((entry) => {
    return commercePaymentId(entry).length > 0;
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

function cartCountFromItems(items: ReadonlyArray<CommerceCartItem>): number {
  return items.reduce((sum, item) => sum + commerceCartItemQuantity(item), 0);
}

function cartSubtotalFromItems(items: ReadonlyArray<CommerceCartItem>): number {
  return items.reduce((sum, item) => sum + commerceCartItemTotalPrice(item), 0);
}

function cartCurrencyFromItems(items: ReadonlyArray<CommerceCartItem>): string | undefined {
  const first = items[0];
  if (!first) {
    return undefined;
  }

  const currency = commerceCartItemCurrency(first);
  return currency.length > 0 ? currency : undefined;
}

export interface CommerceContextValue {
  readonly ready: boolean;
  readonly cart: ReadonlyArray<CommerceCartItem>;
  readonly cartCountry: string | undefined;
  readonly cartCurrency: string | undefined;
  readonly promotionCodes: ReadonlyArray<string>;
  readonly wishlist: ReadonlyArray<CommerceWishlistItem>;
  readonly cartCount: number;
  readonly cartSubtotal: number;
  refreshCart(): Promise<void>;
  setCartCountry(country: string): Promise<void>;
  applyPromotionCode(code: string): Promise<void>;
  removePromotionCode(code: string): Promise<void>;
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
  const [cartCountry, setCartCountryState] = useState<string | undefined>();
  const [cartCurrency, setCartCurrencyState] = useState<string | undefined>();
  const [promotionCodes, setPromotionCodes] = useState<ReadonlyArray<string>>([]);
  const [wishlist, setWishlist] = useState<ReadonlyArray<CommerceWishlistItem>>([]);

  const syncCartSnapshot = useCallback((snapshot: CartSnapshotResponse) => {
    setCart(normalizeCartItems(snapshot.items));
    setCartCountryState(typeof snapshot.cart?.country === "string" ? snapshot.cart.country.toUpperCase() : undefined);
    setCartCurrencyState(typeof snapshot.cart?.currency === "string" ? snapshot.cart.currency.toUpperCase() : undefined);
    setPromotionCodes(normalizePromotionCodes(snapshot.cart?.promotionCodes));
  }, []);

  const refreshCart = useCallback(async () => {
    const response = await requestJson<CartSnapshotResponse>("/api/commerce/cart");
    syncCartSnapshot(response);
  }, [syncCartSnapshot]);

  const setCartCountry = useCallback(async (country: string) => {
    const normalizedCountry = country.trim().toUpperCase();
    if (normalizedCountry.length !== 2) {
      return;
    }

    const response = await requestJson<CartSnapshotResponse>("/api/commerce/cart", {
      method: "PATCH",
      body: JSON.stringify({
        country: normalizedCountry,
      }),
    });

    syncCartSnapshot(response);
    setCartCountryState(typeof response.cart?.country === "string" ? response.cart.country.toUpperCase() : normalizedCountry);
  }, [syncCartSnapshot]);

  const applyPromotionCode = useCallback(async (code: string) => {
    const normalizedCode = code.trim();
    if (normalizedCode.length === 0) {
      return;
    }

    const nextCodes = Array.from(new Set([...promotionCodes, normalizedCode]));
    const response = await requestJson<CartSnapshotResponse>("/api/commerce/cart", {
      method: "PATCH",
      body: JSON.stringify({
        promotionCodes: nextCodes,
      }),
    });

    syncCartSnapshot(response);
    const resolvedCodes = normalizePromotionCodes(response.cart?.promotionCodes);
    emitCommerceEvent("promotion_code_applied", {
      code: normalizedCode,
      promotionCodes: resolvedCodes,
    });
  }, [promotionCodes, syncCartSnapshot]);

  const removePromotionCode = useCallback(async (code: string) => {
    const normalizedCode = code.trim();
    const nextCodes = promotionCodes.filter((entry) => entry !== normalizedCode);
    const response = await requestJson<CartSnapshotResponse>("/api/commerce/cart", {
      method: "PATCH",
      body: JSON.stringify({
        promotionCodes: nextCodes,
      }),
    });

    syncCartSnapshot(response);
    const resolvedCodes = normalizePromotionCodes(response.cart?.promotionCodes);
    emitCommerceEvent("promotion_code_removed", {
      code: normalizedCode,
      promotionCodes: resolvedCodes,
    });
  }, [promotionCodes, syncCartSnapshot]);

  useEffect(() => {
    setWishlist(readStorage<ReadonlyArray<CommerceWishlistItem>>(STORAGE_KEYS.wishlist, []));

    const bootstrap = async () => {
      try {
        await refreshCart();
      } catch {
        setCart([]);
        setCartCountryState(undefined);
        setCartCurrencyState(undefined);
        setPromotionCodes([]);
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

    const nextCart = normalizeCartItems(snapshot.items);
    const nextCurrency = cartCurrencyFromItems(nextCart);
    syncCartSnapshot(snapshot);
    emitCommerceEvent("cart_item_added", {
      productId: product.id,
      quantity: normalizedQuantity,
      ...(typeof product.sku === "string" ? { sku: product.sku } : {}),
      ...(typeof product.title === "string" ? { title: product.title } : {}),
      ...(nextCart.length > 0 ? { cartCount: cartCountFromItems(nextCart) } : {}),
      ...(nextCart.length > 0 ? { cartSubtotal: cartSubtotalFromItems(nextCart) } : {}),
      ...(typeof nextCurrency === "string" ? { currency: nextCurrency } : {}),
    });
  }, [syncCartSnapshot]);

  const removeFromCart = useCallback(async (itemId: string) => {
    const previousItem = cart.find((entry) => commerceCartItemId(entry) === itemId);
    setCart((current) => current.filter((entry) => commerceCartItemId(entry) !== itemId));

    try {
      const snapshot = await requestJson<CartSnapshotResponse>(
        `/api/commerce/cart/items/${encodeURIComponent(itemId)}`,
        {
          method: "DELETE",
        },
      );
      const nextCart = normalizeCartItems(snapshot.items);
      const nextCurrency = cartCurrencyFromItems(nextCart);
      const previousProductId = previousItem ? commerceCartItemProductId(previousItem) : undefined;
      const previousSku = previousItem ? commerceCartItemSku(previousItem) : undefined;
      const previousTitle = previousItem ? commerceCartItemTitle(previousItem) : undefined;
      syncCartSnapshot(snapshot);
      emitCommerceEvent("cart_item_removed", {
        itemId,
        ...(typeof previousProductId === "string" ? { productId: previousProductId } : {}),
        ...(typeof previousSku === "string" ? { sku: previousSku } : {}),
        ...(typeof previousTitle === "string" ? { title: previousTitle } : {}),
        ...(previousItem ? { quantity: commerceCartItemQuantity(previousItem) } : {}),
        ...(nextCart.length > 0 ? { cartCount: cartCountFromItems(nextCart) } : {}),
        ...(nextCart.length > 0 ? { cartSubtotal: cartSubtotalFromItems(nextCart) } : {}),
        ...(typeof nextCurrency === "string" ? { currency: nextCurrency } : {}),
      });
    } finally {
      try {
        await refreshCart();
      } catch {}
    }
  }, [cart, refreshCart, syncCartSnapshot]);

  const setCartQuantity = useCallback(async (itemId: string, quantity: number) => {
    const previousItem = cart.find((entry) => commerceCartItemId(entry) === itemId);
    const snapshot = await requestJson<CartSnapshotResponse>(`/api/commerce/cart/items/${encodeURIComponent(itemId)}`, {
      method: "PATCH",
      body: JSON.stringify({
        quantity,
      }),
    });
    const nextCart = normalizeCartItems(snapshot.items);
    const nextCurrency = cartCurrencyFromItems(nextCart);
    const previousProductId = previousItem ? commerceCartItemProductId(previousItem) : undefined;
    syncCartSnapshot(snapshot);
    emitCommerceEvent("cart_item_quantity_updated", {
      itemId,
      quantity,
      ...(typeof previousProductId === "string" ? { productId: previousProductId } : {}),
      ...(previousItem ? { previousQuantity: commerceCartItemQuantity(previousItem) } : {}),
      ...(nextCart.length > 0 ? { cartCount: cartCountFromItems(nextCart) } : {}),
      ...(nextCart.length > 0 ? { cartSubtotal: cartSubtotalFromItems(nextCart) } : {}),
      ...(typeof nextCurrency === "string" ? { currency: nextCurrency } : {}),
    });
  }, [cart, syncCartSnapshot]);

  const clearCart = useCallback(async () => {
    await Promise.all(cart.flatMap((item) => {
      const itemId = commerceCartItemId(item);
      if (itemId.length === 0) {
        return [];
      }

      return [requestJson<CartSnapshotResponse>(
        `/api/commerce/cart/items/${encodeURIComponent(itemId)}`,
        { method: "DELETE" },
      )];
    }));
    await refreshCart();
  }, [cart, refreshCart]);

  const toggleWishlist = useCallback((product: CommerceCatalogProduct) => {
    const exists = wishlist.some((item) => item.id === product.id);
    if (exists) {
      setWishlist((previous) => previous.filter((item) => item.id !== product.id));
      emitCommerceEvent("wishlist_item_removed", {
        productId: product.id,
      });
      return;
    }

    setWishlist((previous) => [...previous, product]);
    emitCommerceEvent("wishlist_item_added", {
      productId: product.id,
      ...(product.sku ? { sku: product.sku } : {}),
      ...(product.title ? { title: product.title } : {}),
      ...(typeof product.unitPrice === "number" ? { unitPrice: product.unitPrice } : {}),
      ...(product.currency ? { currency: product.currency } : {}),
    });
  }, [wishlist]);

  const removeFromWishlist = useCallback((productId: string) => {
    setWishlist((previous) => previous.filter((item) => item.id !== productId));
    emitCommerceEvent("wishlist_item_removed", {
      productId,
    });
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
    const order = normalizeOrder(response.order);
    if (order) {
      emitCommerceEvent("checkout_completed", {
        orderId: commerceOrderId(order),
        ...(order.number ? { orderNumber: order.number } : {}),
        total: commerceOrderTotal(order),
        currency: commerceOrderCurrency(order),
      });
    }

    return order;
  }, [refreshCart]);

  const getOrderById = useCallback(async (orderId: string) => {
    const response = await requestJson<OrderResponse>(`/api/commerce/orders/${encodeURIComponent(orderId)}`);
    const order = normalizeOrder(response.order);
    if (order) {
      emitCommerceEvent("order_viewed", {
        orderId: commerceOrderId(order),
        ...(order.status ? { status: order.status } : {}),
        total: commerceOrderTotal(order),
        currency: commerceOrderCurrency(order),
      });
    }

    return order;
  }, []);

  const listOrderPayments = useCallback(async (orderId: string) => {
    const response = await requestJson<OrderPaymentsResponse>(
      `/api/commerce/orders/${encodeURIComponent(orderId)}/payments`,
    );
    const payments = normalizePayments(response.items);
    emitCommerceEvent("order_payments_viewed", {
      orderId,
      paymentsCount: payments.length,
    });
    return payments;
  }, []);

  const cartCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + commerceCartItemQuantity(item), 0);
  }, [cart]);

  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + commerceCartItemTotalPrice(item), 0);
  }, [cart]);

  const value = useMemo<CommerceContextValue>(() => ({
    ready,
    cart,
    cartCountry,
    cartCurrency,
    promotionCodes,
    wishlist,
    cartCount,
    cartSubtotal,
    refreshCart,
    setCartCountry,
    applyPromotionCode,
    removePromotionCode,
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
    cartCountry,
    cartCurrency,
    promotionCodes,
    wishlist,
    cartCount,
    cartSubtotal,
    refreshCart,
    setCartCountry,
    applyPromotionCode,
    removePromotionCode,
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
