/**
 * Central currency formatting utility
 * All currency-related formatting should use this utility
 */

export const CURRENCY_CODE = "USD";
export const CURRENCY_SYMBOL = "$";

export function formatCurrency(amount: number, locale: string = "en-US"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: CURRENCY_CODE,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCurrencyCompact(amount: number): string {
  if (amount >= 1000000) {
    return `${CURRENCY_SYMBOL}${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `${CURRENCY_SYMBOL}${(amount / 1000).toFixed(0)}k`;
  }
  return `${CURRENCY_SYMBOL}${amount.toFixed(0)}`;
}
