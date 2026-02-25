/**
 * Central currency formatting utility
 * Supports dynamic currency per tenant via church_settings
 */

export interface CurrencyConfig {
  code: string;
  symbol: string;
  locale: string;
}

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: "USD", symbol: "$", locale: "en-US" },
  { code: "HTG", symbol: "G", locale: "fr-HT" },
  { code: "EUR", symbol: "€", locale: "fr-FR" },
  { code: "CAD", symbol: "CA$", locale: "en-CA" },
  { code: "GBP", symbol: "£", locale: "en-GB" },
  { code: "XOF", symbol: "CFA", locale: "fr-SN" },
  { code: "BRL", symbol: "R$", locale: "pt-BR" },
  { code: "XAF", symbol: "FCFA", locale: "fr-CM" },
];

// Default currency (fallback)
export const DEFAULT_CURRENCY_CODE = "USD";
export const DEFAULT_CURRENCY_SYMBOL = "$";

export function getCurrencyConfig(code: string): CurrencyConfig {
  return SUPPORTED_CURRENCIES.find(c => c.code === code) || SUPPORTED_CURRENCIES[0];
}

export function formatCurrency(amount: number, currencyCode: string = DEFAULT_CURRENCY_CODE, locale?: string): string {
  const config = getCurrencyConfig(currencyCode);
  return new Intl.NumberFormat(locale || config.locale, {
    style: "currency",
    currency: config.code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCurrencyCompact(amount: number, currencyCode: string = DEFAULT_CURRENCY_CODE): string {
  const config = getCurrencyConfig(currencyCode);
  if (amount >= 1000000) {
    return `${config.symbol}${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `${config.symbol}${(amount / 1000).toFixed(0)}k`;
  }
  return `${config.symbol}${amount.toFixed(0)}`;
}

// Legacy exports for backward compatibility
export const CURRENCY_CODE = DEFAULT_CURRENCY_CODE;
export const CURRENCY_SYMBOL = DEFAULT_CURRENCY_SYMBOL;
