'use client';
import { useEffect, useState } from 'react';
import { FALLBACK_RATES, FxRates, sanitizeRates } from '@/lib/fx';

// One fetch per page load, shared by every component that asks. Until it
// answers (or if it fails) the fallback rates are used, so prices never blank out.
let cached: FxRates | null = null;
let inflight: Promise<FxRates> | null = null;

function load(): Promise<FxRates> {
  if (cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = fetch('/fx-rates')
      .then((r) => r.json())
      .then((d) => {
        cached = sanitizeRates(d?.rates);
        return cached;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function useFxRates(): { rates: FxRates; live: boolean } {
  const [state, setState] = useState<{ rates: FxRates; live: boolean }>({
    rates: cached ?? FALLBACK_RATES,
    live: !!cached,
  });

  useEffect(() => {
    let off = false;
    if (cached) return;
    load()
      .then((rates) => {
        if (!off) setState({ rates, live: true });
      })
      .catch(() => {
        /* keep the fallback rates */
      });
    return () => {
      off = true;
    };
  }, []);

  return state;
}
