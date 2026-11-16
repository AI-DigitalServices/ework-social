import * as Sentry from '@sentry/nextjs';

// Next.js App Router requires this file to actually load sentry.server.config.ts /
// sentry.edge.config.ts - without it, those files exist but are never imported,
// and nothing ever reaches Sentry regardless of DSN being set.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
