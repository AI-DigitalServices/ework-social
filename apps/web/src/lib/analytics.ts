/**
 * Google Tag Manager data layer helpers.
 *
 * The GTM container is loaded in app/layout.tsx via NEXT_PUBLIC_GTM_ID. These
 * helpers only push events into the data layer — all tag configuration
 * (Google Ads conversion, Enhanced Conversions, GA4) lives in the GTM UI, so
 * conversion IDs and labels never need a redeploy to change.
 */

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

/** Safe no-op when GTM is absent (local dev, blocked script, missing env). */
function push(payload: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
}

/**
 * Fires the Google Ads signup conversion.
 *
 * Deliberately NOT fired for invite-flow signups: someone joining an existing
 * workspace from a team invite never saw an ad, and counting them would teach
 * Google's bidding that invite traffic is acquisition. Only genuine new-
 * workspace signups are the conversion we pay for.
 *
 * The raw email is passed through for Enhanced Conversions — GTM hashes it
 * with SHA-256 in the browser before anything leaves the page, so no plaintext
 * address is transmitted.
 */
export function trackSignup(params: { email: string; country?: string }) {
  push({
    event: 'user_signup',
    signup_type: 'new_workspace',
    enhanced_user_data: {
      email: params.email,
      ...(params.country ? { country: params.country } : {}),
    },
  });
}

/**
 * Secondary signal — fire when a workspace connects its first social account.
 * Keep this as an observation-only conversion in Google Ads (not primary, no
 * bidding weight): it answers "are the signups we are buying real?" without
 * disturbing the campaign, and it is the earliest honest proxy for intent
 * available client-side.
 */
export function trackAccountActivated(params: { platform: string }) {
  push({
    event: 'account_activated',
    platform: params.platform,
  });
}
