import { NextRequest, NextResponse } from 'next/server';

// Returns the visitor's country from the header Vercel adds to every request.
// Same-site, so there is no third-party lookup, no CORS and no rate limit.
// On localhost (no header) the country is null and the app falls back to USD.
export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const raw = (req.headers.get('x-vercel-ip-country') || '').trim().toUpperCase();
  const country = /^[A-Z]{2}$/.test(raw) ? raw : null;
  return NextResponse.json({ country }, { headers: { 'Cache-Control': 'private, no-store' } });
}
