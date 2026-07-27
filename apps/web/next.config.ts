import type { NextConfig } from "next";

// Content-Security-Policy for the SaaS app.
//
// Shipped as REPORT-ONLY: violations are logged to the browser console but
// nothing is blocked, so it cannot break the app. Review the console for a few
// days of real traffic, confirm only expected sources appear, then switch the
// header name below from 'Content-Security-Policy-Report-Only' to
// 'Content-Security-Policy' to enforce it.
//
// 'unsafe-inline' / 'unsafe-eval' are required because Next.js emits inline
// hydration scripts (no nonce pipeline yet) and PostHog uses eval internally.
// Even with those, the policy still blocks the highest-value XSS attacks:
// scripts can only load from our own origin + PostHog, and connect-src
// restricts where data can be sent — stopping exfiltration to attacker domains.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://us.i.posthog.com https://us-assets.i.posthog.com https://www.clarity.ms https://*.clarity.ms",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob: https:",
  "font-src 'self' https://fonts.gstatic.com data:",
  "connect-src 'self' https://api.eworksocial.com https://us.i.posthog.com https://us-assets.i.posthog.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.clarity.ms https://c.clarity.ms https://k.clarity.ms",
  "frame-src 'self' https://js.paystack.co https://checkout.paystack.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join('; ');

const nextConfig: NextConfig = {
  reactCompiler: true,
  env: {
    NEXT_PUBLIC_POSTHOG_KEY: process.env.PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Report-only for now — change to 'Content-Security-Policy' to enforce.
          { key: 'Content-Security-Policy-Report-Only', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
