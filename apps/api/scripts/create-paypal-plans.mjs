#!/usr/bin/env node
/**
 * eWork Social — PayPal billing plan bootstrap
 *
 * Creates the six subscription plans (3 tiers x monthly/annual) against an
 * existing PayPal Product, then prints the env block to paste into .env.
 *
 * Run it TWICE over the life of the integration: once against sandbox, once
 * against live. Sandbox IDs never work in production — the product and every
 * plan must be recreated there, which is the whole reason this is a script
 * and not a series of curl commands.
 *
 *   PAYPAL_ENV=sandbox \
 *   PAYPAL_CLIENT_ID=... \
 *   PAYPAL_CLIENT_SECRET=... \
 *   PAYPAL_PRODUCT_ID=PROD-7XA89529W7282064A \
 *   node create-paypal-plans.mjs
 *
 * Flags:
 *   --dry-run   print the payloads without calling PayPal
 *
 * Notes:
 *   - No TRIAL billing cycle: the 7 free days are handled inside eWork Social
 *     before the user ever reaches PayPal checkout. To move the trial into
 *     PayPal instead, see TRIAL_CYCLE at the bottom of this file.
 *   - total_cycles: 0 means the plan renews indefinitely.
 *   - Each create sends a stable PayPal-Request-Id, so re-running does not
 *     silently produce duplicate plans.
 */

const ENV = process.env.PAYPAL_ENV || 'sandbox';
const CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PRODUCT_ID = process.env.PAYPAL_PRODUCT_ID;
const DRY_RUN = process.argv.includes('--dry-run');

const BASE =
  ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

// ── Tier definitions ────────────────────────────────────────────────────
// Prices are USD and identical to what Paystack charges the naira equivalent
// of — deliberate price parity across both rails. Annual = 10x monthly
// (two months free, ~16.7% off).

const TIERS = [
  {
    key: 'STARTER',
    label: 'Starter',
    monthly: '5.00',
    annual: '50.00',
    blurb: '10 social accounts, 25 clients, 200 posts a month, AI captions and replies.',
  },
  {
    key: 'GROWTH',
    label: 'Growth',
    monthly: '12.00',
    annual: '120.00',
    blurb: '30 accounts, unlimited clients, 5 team seats, bulk scheduling, automation, AI agent.',
  },
  {
    key: 'AGENCY_PRO',
    label: 'Agency Pro',
    monthly: '29.00',
    annual: '290.00',
    blurb: 'Everything in Growth plus white label, API access, priority support and higher AI limits.',
  },
];

const INTERVALS = [
  {
    key: 'MONTHLY',
    unit: 'MONTH',
    count: 1,
    priceField: 'monthly',
    suffix: 'Monthly',
    billedAs: 'monthly',
  },
  {
    key: 'ANNUAL',
    unit: 'YEAR',
    count: 1,
    priceField: 'annual',
    suffix: 'Annual',
    billedAs: 'annually, two months free',
  },
];

// ── Payload builder ─────────────────────────────────────────────────────

function buildPlan(tier, interval) {
  const price = tier[interval.priceField];
  return {
    product_id: PRODUCT_ID,
    name: `eWork Social ${tier.label} (${interval.suffix})`,
    description: truncate(`${tier.blurb} Billed ${interval.billedAs}, USD.`, 127),
    status: 'ACTIVE',
    billing_cycles: [
      {
        tenure_type: 'REGULAR',
        sequence: 1,
        total_cycles: 0, // renews forever
        frequency: {
          interval_unit: interval.unit,
          interval_count: interval.count,
        },
        pricing_scheme: {
          fixed_price: { value: price, currency_code: 'USD' },
        },
      },
    ],
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee: { value: '0', currency_code: 'USD' },
      setup_fee_failure_action: 'CONTINUE',
      // Suspend after 3 consecutive failed attempts rather than cancelling
      // outright — gives the customer a window to fix their funding source.
      payment_failure_threshold: 3,
    },
  };
}

function truncate(s, n) {
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}

function envVarName(tier, interval) {
  return `PAYPAL_PLAN_${tier.key}_${interval.key}`;
}

// ── PayPal API ──────────────────────────────────────────────────────────

async function getAccessToken() {
  const creds = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) {
    throw new Error(`Token request failed (${res.status}): ${await res.text()}`);
  }
  const json = await res.json();
  return json.access_token;
}

async function createPlan(token, payload, requestId) {
  const res = await fetch(`${BASE}/v1/billing/plans`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': requestId, // idempotency: re-runs don't duplicate
      Prefer: 'return=representation',
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) {
    return { ok: false, status: res.status, body: text };
  }
  return { ok: true, plan: JSON.parse(text) };
}

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
  if (!PRODUCT_ID) {
    fail('PAYPAL_PRODUCT_ID is not set.');
  }
  if (!DRY_RUN && (!CLIENT_ID || !CLIENT_SECRET)) {
    fail('PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set (or pass --dry-run).');
  }

  console.log(`\neWork Social — PayPal plans`);
  console.log(`  environment : ${ENV}${ENV === 'live' ? '  *** LIVE ***' : ''}`);
  console.log(`  product     : ${PRODUCT_ID}`);
  console.log(`  plans       : ${TIERS.length * INTERVALS.length}\n`);

  const jobs = [];
  for (const tier of TIERS) {
    for (const interval of INTERVALS) {
      jobs.push({ tier, interval, payload: buildPlan(tier, interval) });
    }
  }

  if (DRY_RUN) {
    for (const job of jobs) {
      console.log(`── ${envVarName(job.tier, job.interval)} ${'─'.repeat(30)}`);
      console.log(JSON.stringify(job.payload, null, 2));
      console.log('');
    }
    console.log('Dry run — nothing was sent to PayPal.\n');
    return;
  }

  const token = await getAccessToken();
  const results = [];

  for (const job of jobs) {
    const name = envVarName(job.tier, job.interval);
    // Stable per (env, product, tier, interval) so a re-run is idempotent.
    const requestId = `ews-${ENV}-${PRODUCT_ID}-${job.tier.key}-${job.interval.key}`;
    process.stdout.write(`  creating ${name} … `);
    const out = await createPlan(token, job.payload, requestId);
    if (out.ok) {
      console.log(out.plan.id);
      results.push({ name, id: out.plan.id });
    } else {
      console.log(`FAILED (${out.status})`);
      console.error(`    ${out.body}\n`);
      results.push({ name, id: null, error: `${out.status}` });
    }
  }

  const failed = results.filter((r) => !r.id);

  console.log(`\n── paste into .env (${ENV}) ${'─'.repeat(24)}`);
  console.log(`PAYPAL_ENV=${ENV}`);
  console.log(`PAYPAL_PRODUCT_ID=${PRODUCT_ID}`);
  for (const r of results) {
    console.log(`${r.name}=${r.id || '<FAILED — re-run>'}`);
  }
  console.log('');

  if (failed.length) {
    console.error(`${failed.length} plan(s) failed. Fix the errors above and re-run —`);
    console.error(`the request ids are stable, so plans that succeeded will not duplicate.\n`);
    process.exit(1);
  }

  console.log('Next: create the webhook in the PayPal dashboard, put its id in');
  console.log('PAYPAL_WEBHOOK_ID, and subscribe to the billing events.\n');
}

function fail(msg) {
  console.error(`\n${msg}\n`);
  process.exit(1);
}

main().catch((err) => {
  console.error(`\nUnexpected failure: ${err.message}\n`);
  process.exit(1);
});

/* ────────────────────────────────────────────────────────────────────────
 * OPTIONAL — moving the 7-day trial into PayPal
 *
 * Current setup: no trial cycle. PayPal charges on day one; eWork Social
 * owns the free period before checkout. If you later want PayPal to run the
 * trial instead, prepend this to billing_cycles and bump the REGULAR cycle's
 * sequence to 2:
 *
 *   {
 *     tenure_type: 'TRIAL',
 *     sequence: 1,
 *     total_cycles: 1,
 *     frequency: { interval_unit: 'DAY', interval_count: 7 },
 *     pricing_scheme: { fixed_price: { value: '0', currency_code: 'USD' } },
 *   }
 *
 * Caveat worth knowing before you do: PayPal still collects billing
 * agreement consent up front, so the user sees a PayPal approval screen
 * before the free period starts. That converts worse than a truly
 * card-free trial, which is the argument for keeping the trial in-app.
 * ──────────────────────────────────────────────────────────────────────── */
