import { create } from 'zustand';

export type Currency = 'NGN' | 'USD' | 'KES' | 'ZAR' | 'GHS';

interface CurrencyState {
  currency: Currency;
  setCurrency: (c: Currency) => void;
}

export const useCurrencyStore = create<CurrencyState>((set) => ({
  currency: 'NGN',
  setCurrency: (currency) => set({ currency }),
}));

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  NGN: '₦', USD: '$', KES: 'KSh', ZAR: 'R', GHS: 'GH₵',
};

// All prices in NGN kobo base, converted for display
export const PLAN_PRICES: Record<string, Record<Currency, string>> = {
  starter: { NGN: '₦5,000', USD: '$5', KES: 'KSh 650', ZAR: 'R95', GHS: 'GH₵65' },
  growth:  { NGN: '₦12,000', USD: '$12', KES: 'KSh 1,560', ZAR: 'R228', GHS: 'GH₵156' },
  agency:  { NGN: '₦29,000', USD: '$29', KES: 'KSh 3,770', ZAR: 'R551', GHS: 'GH₵377' },
};

export const IP_TO_CURRENCY: Record<string, Currency> = {
  NG: 'NGN', US: 'USD', GB: 'USD', KE: 'KES', ZA: 'ZAR', GH: 'GHS',
  CA: 'USD', AU: 'USD', DE: 'USD', FR: 'USD',
};
