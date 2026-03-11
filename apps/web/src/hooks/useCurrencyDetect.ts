'use client';
import { useEffect } from 'react';
import { useCurrencyStore, IP_TO_CURRENCY, Currency } from '@/store/currency.store';

export function useCurrencyDetect() {
  const setCurrency = useCurrencyStore((s) => s.setCurrency);

  useEffect(() => {
    const saved = localStorage.getItem('ework_currency') as Currency | null;
    if (saved) { setCurrency(saved); return; }
    fetch('https://ipapi.co/json/')
      .then(r => r.json())
      .then(data => {
        const currency = IP_TO_CURRENCY[data.country_code] || 'USD';
        setCurrency(currency);
      })
      .catch(() => setCurrency('USD'));
  }, []);
}
