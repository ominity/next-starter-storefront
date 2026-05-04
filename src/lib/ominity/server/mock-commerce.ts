import type {
  StarterApiCart,
  StarterApiCartItem,
  StarterApiMoney,
  StarterApiOrder,
  StarterApiPayment,
} from "@/lib/ominity/server/normalize";

interface MockCartRecord {
  id: string;
  currency: string;
  items: Map<string, StarterApiCartItem>;
  createdAt: string;
  updatedAt: string;
}

interface MockOrderRecord {
  order: StarterApiOrder;
  cartId: string;
}

const mockCarts = new Map<string, MockCartRecord>();
const mockOrders = new Map<string, MockOrderRecord>();
const mockPayments = new Map<string, ReadonlyArray<StarterApiPayment>>();

function createId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function money(value: number, currency: string): StarterApiMoney {
  return {
    value,
    currency,
  };
}

function calculateTotals(items: ReadonlyArray<StarterApiCartItem>, currency: string) {
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice.value, 0);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    totalQuantity,
    subtotalAmount: money(subtotal, currency),
    shippingAmount: money(0, currency),
    discountAmount: money(0, currency),
    taxAmount: money(0, currency),
    totalAmount: money(subtotal, currency),
  };
}

function toCart(record: MockCartRecord): StarterApiCart {
  const items = Array.from(record.items.values());
  const totals = calculateTotals(items, record.currency);

  return {
    id: record.id,
    status: "active",
    type: "cart",
    currency: record.currency,
    totalQuantity: totals.totalQuantity,
    subtotalAmount: totals.subtotalAmount,
    shippingAmount: totals.shippingAmount,
    discountAmount: totals.discountAmount,
    taxAmount: totals.taxAmount,
    totalAmount: totals.totalAmount,
  };
}

function ensureCartRecord(cartId?: string): MockCartRecord {
  if (cartId) {
    const existing = mockCarts.get(cartId);
    if (existing) {
      return existing;
    }
  }

  const created: MockCartRecord = {
    id: createId("cart"),
    currency: "EUR",
    items: new Map<string, StarterApiCartItem>(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockCarts.set(created.id, created);
  return created;
}

export function mockGetOrCreateCart(cartId?: string): {
  readonly cart: StarterApiCart;
  readonly items: ReadonlyArray<StarterApiCartItem>;
  readonly created: boolean;
} {
  const existing = cartId ? mockCarts.get(cartId) : undefined;
  const record = ensureCartRecord(cartId);

  return {
    cart: toCart(record),
    items: Array.from(record.items.values()),
    created: !existing,
  };
}

export function mockAddCartItem(input: {
  readonly cartId: string;
  readonly productId: string;
  readonly quantity: number;
  readonly sku?: string;
  readonly title?: string;
  readonly unitPrice?: number;
  readonly currency?: string;
  readonly imageUrl?: string;
}): {
  readonly cart: StarterApiCart;
  readonly items: ReadonlyArray<StarterApiCartItem>;
} {
  const record = ensureCartRecord(input.cartId);
  const existing = Array.from(record.items.values()).find((entry) => entry.productId === input.productId);

  const quantity = Number.isFinite(input.quantity) && input.quantity > 0 ? Math.floor(input.quantity) : 1;
  const unitPrice = Number.isFinite(input.unitPrice) && input.unitPrice && input.unitPrice > 0 ? input.unitPrice : 99;
  const currency = typeof input.currency === "string" && input.currency.length > 0
    ? input.currency.toUpperCase()
    : record.currency;

  if (existing) {
    const nextQuantity = existing.quantity + quantity;
    const nextItem: StarterApiCartItem = {
      ...existing,
      quantity: nextQuantity,
      unitPrice: money(unitPrice, currency),
      totalPrice: money(unitPrice * nextQuantity, currency),
    };
    record.items.set(existing.id, nextItem);
  } else {
    const itemId = createId("item");
    record.items.set(itemId, {
      id: itemId,
      productId: input.productId,
      ...(typeof input.sku === "string" && input.sku.length > 0 ? { sku: input.sku } : {}),
      ...(typeof input.title === "string" && input.title.length > 0 ? { title: input.title } : {}),
      quantity,
      unitPrice: money(unitPrice, currency),
      totalPrice: money(unitPrice * quantity, currency),
      ...(typeof input.imageUrl === "string" && input.imageUrl.length > 0 ? { imageUrl: input.imageUrl } : {}),
    });
  }

  record.updatedAt = new Date().toISOString();

  return {
    cart: toCart(record),
    items: Array.from(record.items.values()),
  };
}

export function mockUpdateCartItem(input: {
  readonly cartId: string;
  readonly itemId: string;
  readonly quantity: number;
}): {
  readonly cart: StarterApiCart;
  readonly items: ReadonlyArray<StarterApiCartItem>;
} {
  const record = ensureCartRecord(input.cartId);
  const current = record.items.get(input.itemId);
  if (!current) {
    return {
      cart: toCart(record),
      items: Array.from(record.items.values()),
    };
  }

  if (input.quantity <= 0) {
    record.items.delete(input.itemId);
  } else {
    const quantity = Math.floor(input.quantity);
    const unitPrice = current.unitPrice.value;
    const currency = current.unitPrice.currency;
    record.items.set(input.itemId, {
      ...current,
      quantity,
      totalPrice: money(unitPrice * quantity, currency),
    });
  }

  record.updatedAt = new Date().toISOString();

  return {
    cart: toCart(record),
    items: Array.from(record.items.values()),
  };
}

export function mockDeleteCartItem(input: {
  readonly cartId: string;
  readonly itemId: string;
}): {
  readonly cart: StarterApiCart;
  readonly items: ReadonlyArray<StarterApiCartItem>;
} {
  const record = ensureCartRecord(input.cartId);
  record.items.delete(input.itemId);
  record.updatedAt = new Date().toISOString();

  return {
    cart: toCart(record),
    items: Array.from(record.items.values()),
  };
}

export function mockCreateOrder(input: {
  readonly cartId: string;
  readonly orderNumberPrefix?: string;
}): StarterApiOrder {
  const record = ensureCartRecord(input.cartId);
  const cart = toCart(record);
  const orderId = createId("order");

  const order: StarterApiOrder = {
    id: orderId,
    status: "pending",
    number: `${input.orderNumberPrefix ?? "ORD"}-${Date.now().toString(36).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    totalAmount: cart.totalAmount,
  };

  mockOrders.set(orderId, {
    order,
    cartId: record.id,
  });
  mockPayments.set(orderId, []);

  return order;
}

export function mockGetOrder(orderId: string): StarterApiOrder | null {
  return mockOrders.get(orderId)?.order ?? null;
}

export function mockListOrderPayments(orderId: string): ReadonlyArray<StarterApiPayment> {
  return mockPayments.get(orderId) ?? [];
}

export function mockGetPayment(paymentId: string): StarterApiPayment | null {
  for (const payments of mockPayments.values()) {
    const matched = payments.find((entry) => entry.id === paymentId);
    if (matched) {
      return matched;
    }
  }

  return null;
}
