import { asNumber, asString, isRecord } from "./http";

export interface StarterApiMoney {
  readonly currency: string;
  readonly value: number;
}

export interface StarterApiCart {
  readonly id: string;
  readonly status: string;
  readonly type: string;
  readonly currency: string;
  readonly totalQuantity: number;
  readonly subtotalAmount: StarterApiMoney;
  readonly shippingAmount: StarterApiMoney;
  readonly discountAmount: StarterApiMoney;
  readonly taxAmount: StarterApiMoney;
  readonly totalAmount: StarterApiMoney;
}

export interface StarterApiCartItem {
  readonly id: string;
  readonly productId?: string;
  readonly sku?: string;
  readonly title?: string;
  readonly quantity: number;
  readonly unitPrice: StarterApiMoney;
  readonly totalPrice: StarterApiMoney;
  readonly imageUrl?: string;
}

export interface StarterApiOrder {
  readonly id: string;
  readonly status: string;
  readonly number?: string;
  readonly createdAt?: string;
  readonly totalAmount: StarterApiMoney;
}

export interface StarterApiPayment {
  readonly id: string;
  readonly status: string;
  readonly amount: StarterApiMoney;
  readonly createdAt?: string;
}

export interface StarterApiShippingMethod {
  readonly id: string;
  readonly name: string;
}

export interface StarterApiPaymentMethod {
  readonly id: string;
  readonly label: string;
  readonly gateway?: string;
  readonly method?: string;
  readonly isEnabled: boolean;
}

export interface StarterApiUser {
  readonly id?: number;
  readonly email?: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly isMfaEnabled?: boolean;
}

function normalizeId(input: unknown): string {
  if (typeof input === "string" && input.length > 0) {
    return input;
  }

  if (typeof input === "number" && Number.isFinite(input)) {
    return `${input}`;
  }

  return "";
}

function normalizeMoney(input: unknown, fallbackCurrency = "EUR"): StarterApiMoney {
  if (typeof input === "number") {
    return {
      currency: fallbackCurrency,
      value: Number.isFinite(input) ? input : 0,
    };
  }

  if (typeof input === "string") {
    const parsed = Number.parseFloat(input);
    return {
      currency: fallbackCurrency,
      value: Number.isFinite(parsed) ? parsed : 0,
    };
  }

  if (!isRecord(input)) {
    return {
      currency: fallbackCurrency,
      value: 0,
    };
  }

  const currency = asString(input.currency)
    ?? asString(input.currencyCode)
    ?? fallbackCurrency;

  const value = asNumber(input.value)
    ?? asNumber(input.amount)
    ?? asNumber(input.gross)
    ?? asNumber(input.net)
    ?? 0;

  return {
    currency: currency.toUpperCase(),
    value,
  };
}

function normalizeList(input: unknown): ReadonlyArray<unknown> {
  if (Array.isArray(input)) {
    return input;
  }

  if (!isRecord(input)) {
    return [];
  }

  if (Array.isArray(input.items)) {
    return input.items;
  }

  if (Array.isArray(input.data)) {
    return input.data;
  }

  if (isRecord(input._embedded)) {
    const embedded = input._embedded;
    for (const value of Object.values(embedded)) {
      if (Array.isArray(value)) {
        return value;
      }
    }
  }

  return [];
}

export function normalizeCart(input: unknown): StarterApiCart {
  const record = isRecord(input) ? input : {};
  const currency = asString(record.currency)?.toUpperCase() ?? "EUR";

  return {
    id: normalizeId(record.id),
    status: asString(record.status) ?? "unknown",
    type: asString(record.type) ?? "unknown",
    currency,
    totalQuantity: asNumber(record.totalQuantity) ?? 0,
    subtotalAmount: normalizeMoney(record.subtotalAmount, currency),
    shippingAmount: normalizeMoney(record.shippingAmount, currency),
    discountAmount: normalizeMoney(record.discountAmount, currency),
    taxAmount: normalizeMoney(record.taxAmount ?? record.vatAmount, currency),
    totalAmount: normalizeMoney(record.totalAmount, currency),
  };
}

export function normalizeCartItem(input: unknown): StarterApiCartItem {
  const record = isRecord(input) ? input : {};
  const product = isRecord(record.product) ? record.product : {};
  const currency = asString(record.currency)
    ?? asString(product.currency)
    ?? "EUR";
  const quantity = asNumber(record.quantity) ?? asNumber(record.qty) ?? 1;
  const productIdFromRecord = normalizeId(record.productId);
  const productIdFromProduct = normalizeId(product.id);
  const sku = asString(record.sku) ?? asString(product.sku);
  const title = asString(record.title) ?? asString(record.name) ?? asString(product.title);
  const imageUrl = asString(record.imageUrl) ?? asString(product.coverImage);

  return {
    id: normalizeId(record.id),
    ...(productIdFromRecord.length > 0
      ? { productId: productIdFromRecord }
      : productIdFromProduct.length > 0
        ? { productId: productIdFromProduct }
        : {}),
    ...(typeof sku === "string" ? { sku } : {}),
    ...(typeof title === "string" ? { title } : {}),
    quantity: quantity > 0 ? Math.floor(quantity) : 1,
    unitPrice: normalizeMoney(
      record.unitPrice ?? record.price ?? record.unitAmount ?? product.price,
      currency,
    ),
    totalPrice: normalizeMoney(record.totalPrice ?? record.total ?? record.totalAmount, currency),
    ...(typeof imageUrl === "string" ? { imageUrl } : {}),
  };
}

export function normalizeCartItems(input: unknown): ReadonlyArray<StarterApiCartItem> {
  return normalizeList(input)
    .map((entry) => normalizeCartItem(entry))
    .filter((entry) => entry.id.length > 0);
}

export function normalizeOrder(input: unknown): StarterApiOrder {
  const record = isRecord(input) ? input : {};
  const totalAmount = normalizeMoney(record.totalAmount, "EUR");
  const number = asString(record.number);
  const createdAt = asString(record.createdAt);

  return {
    id: normalizeId(record.id),
    status: asString(record.status) ?? "unknown",
    ...(typeof number === "string" ? { number } : {}),
    ...(typeof createdAt === "string" ? { createdAt } : {}),
    totalAmount,
  };
}

export function normalizePayment(input: unknown): StarterApiPayment {
  const record = isRecord(input) ? input : {};
  const createdAt = asString(record.createdAt);

  return {
    id: normalizeId(record.id),
    status: asString(record.status) ?? "unknown",
    amount: normalizeMoney(record.amount, "EUR"),
    ...(typeof createdAt === "string" ? { createdAt } : {}),
  };
}

export function normalizePayments(input: unknown): ReadonlyArray<StarterApiPayment> {
  return normalizeList(input)
    .map((entry) => normalizePayment(entry))
    .filter((entry) => entry.id.length > 0);
}

export function normalizeShippingMethods(input: unknown): ReadonlyArray<StarterApiShippingMethod> {
  return normalizeList(input).flatMap((entry): StarterApiShippingMethod[] => {
    if (!isRecord(entry)) {
      return [];
    }

    const id = normalizeId(entry.id ?? entry.code ?? entry.name);
    if (id.length === 0) {
      return [];
    }

    const name = asString(entry.name) ?? asString(entry.label) ?? id;
    return [{ id, name }];
  });
}

export function normalizePaymentMethods(input: unknown): ReadonlyArray<StarterApiPaymentMethod> {
  return normalizeList(input).flatMap((entry): StarterApiPaymentMethod[] => {
    if (!isRecord(entry)) {
      return [];
    }

    const id = normalizeId(entry.id);
    if (id.length === 0) {
      return [];
    }

    const label = asString(entry.label) ?? asString(entry.method) ?? id;
    const gateway = asString(entry.gateway);
    const method = asString(entry.method);

    return [{
      id,
      label,
      ...(typeof gateway === "string" ? { gateway } : {}),
      ...(typeof method === "string" ? { method } : {}),
      isEnabled: typeof entry.isEnabled === "boolean" ? entry.isEnabled : true,
    }];
  });
}

export function normalizeUser(input: unknown): StarterApiUser | null {
  if (!isRecord(input)) {
    return null;
  }

  if (input.resource !== "user") {
    return null;
  }

  const email = asString(input.email);
  const firstName = asString(input.firstName);
  const lastName = asString(input.lastName);

  return {
    ...(typeof input.id === "number" ? { id: input.id } : {}),
    ...(typeof email === "string" ? { email } : {}),
    ...(typeof firstName === "string" ? { firstName } : {}),
    ...(typeof lastName === "string" ? { lastName } : {}),
    ...(typeof input.isMfaEnabled === "boolean" ? { isMfaEnabled: input.isMfaEnabled } : {}),
  };
}
