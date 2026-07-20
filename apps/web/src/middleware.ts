import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const response = NextResponse.next();

  // app.eworksocial.com is the authenticated SaaS app — never index it.
  // All public SEO traffic should go through www.eworksocial.com.
  if (hostname.startsWith('app.')) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  return response;
}

export const config = {
  // Run on all routes except Next.js internals and static files
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.*\\.png|og-image\\.png).*)',
  ],
};
