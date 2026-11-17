'use client';
import { useEffect } from 'react';
import { useCurrencyStore, IP_TO_CURRENCY, Currency } from '@/store/currency.store';

const SAVED_KEY = 'ework_currency'; // the visitor's own choice - always wins
const DETECTED_KEY = 'ework_currency_detected'; // cached detection, expires
const DETECTED_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const VALID: Currency[] = ['NGN', 'USD', 'KES', 'ZAR', 'GHS'];

/**
 * Picks the display currency: the visitor's saved choice, else a recent cached
 * detection, else the country Vercel reports for the request (/geo-country).
 * Unknown country or any failure shows USD and is NOT cached, so the next
 * visit tries again.
 */
export function useCurrencyDetect() {
  const setCurrency = useCurrencyStore((s) => s.setCurrency);

  useEffect(() => {
    let cancelled = false;
    try {
      const saved = localStorage.getItem(SAVED_KEY);
      if (saved && VALID.includes(saved as Currency)) {
        setCurrency(saved as Currency);
        return;
      }
      const cached = JSON.parse(localStorage.getItem(DETECTED_KEY) || 'null');
      if (cached && VALID.includes(cached.c) && Date.now() - cached.at < DETECTED_TTL_MS) {
        setCurrency(cached.c as Currency);
        return;
      }
    } catch {
      /* storage unavailable - fall through to detection */
    }

    fetch('/geo-country', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (!data?.country) {
          setCurrency('USD');
          return;
        }
        const detected: Currency = IP_TO_CURRENCY[data.country] || 'USD';
        setCurrency(detected);
        try {
          localStorage.setItem(DETECTED_KEY, JSON.stringify({ c: detected, at: Date.now() }));
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        if (!cancelled) setCurrency('USD');
      });

    return () => {
      cancelled = true;
    };
  }, []);
}
