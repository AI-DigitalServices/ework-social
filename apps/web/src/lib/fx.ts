// Pure helpers for showing approximate local prices from live exchange rates.
// NGN and USD are real prices. KES, ZAR, GHS (and GBP/EUR on the landing page)
// are display-only approximations of the USD price: those customers are billed
// in US dollars at checkout.

export interface FxRates {
  KES: number;
  ZAR: number;
  GHS: number;
  GBP: number;
  EUR: number;
}

/** Used when the live source is unavailable (values are units per 1 USD). */
export const FALLBACK_RATES: FxRates = { KES: 130, ZAR: 17, GHS: 11.7, GBP: 0.76, EUR: 0.91 };

/** The real USD prices of the paid tiers. */
export const USD_PRICES = { starter: 5, growth: 12, agency: 29 } as const;

// Round to a step that looks like a price (KSh 1,560 rather than KSh 1,559.64).
const STEP: Record<string, number> = { KES: 10, ZAR: 1, GHS: 1, GBP: 1, EUR: 1 };

/**
 * Keeps a live rate only if it is a sane number near the fallback (0.6x-1.6x);
 * anything else - a bad response, a zero, a wildly different value - falls back,
 * so a faulty rate source can never put an absurd price on the screen.
 */
export function sanitizeRates(raw: any): FxRates {
  const out = { ...FALLBACK_RATES };
  (Object.keys(FALLBACK_RATES) as Array<keyof FxRates>).forEach((k) => {
    const v = Number(raw?.[k]);
    const base = FALLBACK_RATES[k];
    if (Number.isFinite(v) && v >= base * 0.6 && v <= base * 1.6) out[k] = v;
  });
  return out;
}

/** USD amount -> rounded local amount, or null when the currency has no rate. */
export function convertUsd(usd: number, code: string, rates: FxRates): number | null {
  const rate = (rates as any)[code];
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) return null;
  const step = STEP[code] ?? 1;
  return Math.max(step, Math.round((usd * rate) / step) * step);
}

export function formatAmount(symbol: string, amount: number): string {
  return `${symbol}${amount.toLocaleString('en-US')}`;
}

/** Landing-page price: the real table value for USD and NGN, a live approximation for the rest. */
export function landingPrice(code: string, staticAmount: number, usdAmount: number, rates: FxRates): number {
  if (code === 'USD' || code === 'NGN') return staticAmount;
  return convertUsd(usdAmount, code, rates) ?? staticAmount;
}
