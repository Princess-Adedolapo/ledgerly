import type { CurrencyCode } from './supabase';

export const EXCHANGE_RATES: Record<CurrencyCode, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.78,
  NGN: 1550.0,
};

/**
 * Converts an amount from one currency to another using deterministic rates.
 * - USD as the base currency.
 */
export function convertCurrency(
  amount: number,
  from: string,
  to: string
): number {
  const fromCode = (from in EXCHANGE_RATES ? from : 'USD') as CurrencyCode;
  const toCode = (to in EXCHANGE_RATES ? to : 'USD') as CurrencyCode;

  if (fromCode === toCode) return amount;

  // Convert to base currency (USD) then to target currency
  const baseAmount = amount / EXCHANGE_RATES[fromCode];
  const converted = baseAmount * EXCHANGE_RATES[toCode];
  
  return converted;
}

/**
 * Summarizes a collection of records (with currency_code and amount/value fields)
 * into a single unified amount in the target currency.
 */
export function aggregateInCurrency<T extends { amount?: number; value?: number | null; currency_code?: string | null }>(
  items: T[],
  targetCurrency: string,
  field: 'amount' | 'value' = 'amount'
): number {
  return items.reduce((sum, item) => {
    const value = Number(item[field] ?? 0);
    const itemCurrency = item.currency_code ?? 'USD';
    return sum + convertCurrency(value, itemCurrency, targetCurrency);
  }, 0);
}
