const DEFAULT_CURRENCY = "EUR";

export function resolveCurrency(currency: string | undefined): string {
  if (typeof currency === "string" && currency.length > 0) {
    return currency.toUpperCase();
  }

  return DEFAULT_CURRENCY;
}

export function resolveUnitPrice(value: number | undefined): number {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value;
  }

  return 0;
}

export function formatMoney(value: number, currency: string | undefined): string {
  const normalizedCurrency = resolveCurrency(currency);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: normalizedCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
