export const COMMERCE_EVENT_DOM_NAME = "ominity:commerce:event";

export type CommerceEventName =
  | "product_viewed"
  | "cart_viewed"
  | "checkout_started"
  | "checkout_completed"
  | "order_viewed"
  | "order_payments_viewed"
  | "cart_item_added"
  | "cart_item_removed"
  | "cart_item_quantity_updated"
  | "promotion_code_applied"
  | "promotion_code_removed"
  | "wishlist_item_added"
  | "wishlist_item_removed";

export interface CommerceEventPayloadMap {
  readonly product_viewed: {
    readonly productId: string;
    readonly sku?: string;
    readonly title?: string;
    readonly unitPrice?: number;
    readonly currency?: string;
    readonly canonicalPath?: string;
  };
  readonly cart_viewed: {
    readonly cartCount: number;
    readonly cartSubtotal: number;
    readonly currency?: string;
    readonly promotionCodes?: ReadonlyArray<string>;
  };
  readonly checkout_started: {
    readonly mode: "guest" | "authenticated";
    readonly cartCount: number;
    readonly cartSubtotal: number;
    readonly currency?: string;
    readonly promotionCodes?: ReadonlyArray<string>;
  };
  readonly checkout_completed: {
    readonly orderId: string;
    readonly orderNumber?: string;
    readonly total?: number;
    readonly currency?: string;
  };
  readonly order_viewed: {
    readonly orderId: string;
    readonly status?: string;
    readonly total?: number;
    readonly currency?: string;
  };
  readonly order_payments_viewed: {
    readonly orderId: string;
    readonly paymentsCount: number;
  };
  readonly cart_item_added: {
    readonly productId: string;
    readonly sku?: string;
    readonly title?: string;
    readonly quantity: number;
    readonly cartCount?: number;
    readonly cartSubtotal?: number;
    readonly currency?: string;
  };
  readonly cart_item_removed: {
    readonly itemId: string;
    readonly productId?: string;
    readonly sku?: string;
    readonly title?: string;
    readonly quantity?: number;
    readonly cartCount?: number;
    readonly cartSubtotal?: number;
    readonly currency?: string;
  };
  readonly cart_item_quantity_updated: {
    readonly itemId: string;
    readonly productId?: string;
    readonly quantity: number;
    readonly previousQuantity?: number;
    readonly cartCount?: number;
    readonly cartSubtotal?: number;
    readonly currency?: string;
  };
  readonly promotion_code_applied: {
    readonly code: string;
    readonly promotionCodes: ReadonlyArray<string>;
  };
  readonly promotion_code_removed: {
    readonly code: string;
    readonly promotionCodes: ReadonlyArray<string>;
  };
  readonly wishlist_item_added: {
    readonly productId: string;
    readonly sku?: string;
    readonly title?: string;
    readonly unitPrice?: number;
    readonly currency?: string;
  };
  readonly wishlist_item_removed: {
    readonly productId: string;
  };
}

export interface CommerceEvent<TName extends CommerceEventName = CommerceEventName> {
  readonly name: TName;
  readonly payload: CommerceEventPayloadMap[TName];
  readonly timestamp: string;
}

export type CommerceEventListener = (event: CommerceEvent) => void;

const listeners = new Set<CommerceEventListener>();

export function addCommerceEventListener(listener: CommerceEventListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function removeCommerceEventListener(listener: CommerceEventListener): void {
  listeners.delete(listener);
}

export function emitCommerceEvent<TName extends CommerceEventName>(
  name: TName,
  payload: CommerceEventPayloadMap[TName],
): CommerceEvent<TName> {
  const event: CommerceEvent<TName> = {
    name,
    payload,
    timestamp: new Date().toISOString(),
  };

  for (const listener of listeners) {
    try {
      listener(event);
    } catch {}
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(COMMERCE_EVENT_DOM_NAME, { detail: event }));
  }

  return event;
}

export function isCommerceEventName(value: string): value is CommerceEventName {
  return [
    "product_viewed",
    "cart_viewed",
    "checkout_started",
    "checkout_completed",
    "order_viewed",
    "order_payments_viewed",
    "cart_item_added",
    "cart_item_removed",
    "cart_item_quantity_updated",
    "promotion_code_applied",
    "promotion_code_removed",
    "wishlist_item_added",
    "wishlist_item_removed",
  ].includes(value);
}

