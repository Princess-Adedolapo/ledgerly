import type { CurrencyCode, CurrencyDisplayMode } from './supabase';

export const CURRENCY_CONFIG = {
  USD: { symbol: '$', code: 'USD', label: 'US Dollar ($)' },
  NGN: { symbol: '₦', code: 'NGN', label: 'Nigerian Naira (₦)' },
  EUR: { symbol: '€', code: 'EUR', label: 'Euro (€)' },
  GBP: { symbol: '£', code: 'GBP', label: 'British Pound (£)' },
} as const;

export const CURRENCY_CODES = Object.keys(CURRENCY_CONFIG) as CurrencyCode[];

const LOCALE_MAP: Record<CurrencyCode, string> = {
  USD: 'en-US',
  NGN: 'en-NG',
  EUR: 'de-DE',
  GBP: 'en-GB',
};

/**
 * Formats a numeric value as a currency string using Intl.NumberFormat.
 * - displayMode 'symbol' => "$1,200" (locale-aware symbol)
 * - displayMode 'code'   => "USD 1,200" (ISO code prefix)
 */
export function formatCurrency(
  value: number,
  currencyCode: string,
  displayMode: CurrencyDisplayMode = 'symbol',
  decimals: number = 0
): string {
  const code = (currencyCode in CURRENCY_CONFIG ? currencyCode : 'USD') as CurrencyCode;
  const locale = LOCALE_MAP[code];

  const formattedNumber = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(decimals === 0 ? Math.round(value) : value);

  if (displayMode === 'code') {
    return `${code} ${formattedNumber}`;
  }

  return `${CURRENCY_CONFIG[code].symbol}${formattedNumber}`;
}

/** Returns the display prefix for a currency ('$', '€', 'USD ', etc.) based on the user's display mode. */
export function getCurrencySymbol(
  currencyCode: string,
  displayMode: CurrencyDisplayMode = 'symbol'
): string {
  const code = (currencyCode in CURRENCY_CONFIG ? currencyCode : 'USD') as CurrencyCode;
  return displayMode === 'code' ? `${code} ` : CURRENCY_CONFIG[code].symbol;
}
