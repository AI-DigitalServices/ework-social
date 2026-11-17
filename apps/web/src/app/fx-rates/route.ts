import { NextResponse } from 'next/server';
import { FALLBACK_RATES, sanitizeRates } from '@/lib/fx';

// Daily exchange rates for the approximate local prices. Source: ExchangeRate-API's
// open endpoint (updates once a day; its terms ask for an attribution link, shown
// next to the prices). Cached for 12 hours so the source is hit at most a couple of
// times a day. Any failure returns the fallback rates, never an error.
const SOURCE = 'https://open.er-api.com/v6/latest/USD';

export async function GET() {
  try {
    const res = await fetch(SOURCE, { next: { revalidate: 43200 } });
    if (!res.ok) throw new Error(`rates source answered ${res.status}`);
    const data = await res.json();
    if (data?.result !== 'success') throw new Error('rates source did not report success');
    return NextResponse.json(
      { rates: sanitizeRates(data.rates), updatedAt: data.time_last_update_utc ?? null, source: 'live' },
      { headers: { 'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=86400' } },
    );
  } catch {
    return NextResponse.json(
      { rates: FALLBACK_RATES, updatedAt: null, source: 'fallback' },
      { headers: { 'Cache-Control': 'public, s-maxage=600' } },
    );
  }
}
