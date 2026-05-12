/**
 * One-time script to register our RISC receiver endpoint with Google.
 *
 * Prerequisites:
 *  1. Create a service account in Google Cloud Console with role:
 *       "RISC Configuration Admin" (roles/riscconfigs.admin)
 *  2. Enable the RISC API at:
 *       https://console.cloud.google.com/apis/library/risc.googleapis.com
 *  3. Download the service account JSON key and keep it secure.
 *  4. Run:
 *       node scripts/register-risc.js /path/to/service-account-key.json
 *
 * This script:
 *  - Signs a short-lived bearer JWT with the service account private key
 *  - Calls POST https://risc.googleapis.com/v1beta/stream:update to register
 *    our receiver URL and subscribe to all security event types
 *  - Optionally sends a test verification token to confirm delivery works
 */

const fs   = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

// ── Config ────────────────────────────────────────────────────────────────────

const RECEIVER_URL = 'https://api.eworksocial.com/api/risc/google';

const EVENTS_REQUESTED = [
  'https://schemas.openid.net/secevent/risc/event-type/sessions-revoked',
  'https://schemas.openid.net/secevent/risc/event-type/account-disabled',
  'https://schemas.openid.net/secevent/risc/event-type/account-enabled',
  'https://schemas.openid.net/secevent/risc/event-type/account-credential-change-required',
  'https://schemas.openid.net/secevent/oauth/event-type/tokens-revoked',
  'https://schemas.openid.net/secevent/oauth/event-type/token-revoked',
  'https://schemas.openid.net/secevent/risc/event-type/verification', // needed for test below
];

const RISC_API_AUDIENCE =
  'https://risc.googleapis.com/google.identity.risc.v1beta.RiscManagementService';

// ── Helpers ───────────────────────────────────────────────────────────────────

function base64url(buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function signJwt(payload, privateKeyPem, keyId) {
  const header  = { alg: 'RS256', typ: 'JWT', kid: keyId };
  const enc = (obj) => base64url(Buffer.from(JSON.stringify(obj)));
  const signingInput = `${enc(header)}.${enc(payload)}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signingInput);
  const sig = sign.sign(privateKeyPem, 'base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return `${signingInput}.${sig}`;
}

function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Load service account key
  const keyFilePath = process.argv[2];
  if (!keyFilePath) {
    console.error('Usage: node scripts/register-risc.js /path/to/service-account-key.json');
    process.exit(1);
  }

  const keyFile = JSON.parse(fs.readFileSync(path.resolve(keyFilePath), 'utf8'));
  const { client_email, private_key, private_key_id } = keyFile;

  if (!client_email || !private_key) {
    console.error('❌  Invalid service account key file — missing client_email or private_key');
    process.exit(1);
  }

  console.log(`\n🔑  Service account: ${client_email}`);

  // 2. Sign a 1-hour bearer JWT
  const now = Math.floor(Date.now() / 1000);
  const bearerToken = signJwt(
    {
      iss: client_email,
      sub: client_email,
      aud: RISC_API_AUDIENCE,
      iat: now,
      exp: now + 3600,
    },
    private_key,
    private_key_id,
  );

  console.log('✅  Bearer token signed\n');

  // 3. Register receiver endpoint via RISC stream:update
  console.log(`📡  Registering receiver: ${RECEIVER_URL}`);

  const streamConfig = JSON.stringify({
    delivery: {
      delivery_method: 'https://schemas.openid.net/secevent/risc/delivery-method/push',
      url: RECEIVER_URL,
    },
    events_requested: EVENTS_REQUESTED,
  });

  const updateRes = await httpsRequest(
    {
      hostname: 'risc.googleapis.com',
      path: '/v1beta/stream:update',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Length': Buffer.byteLength(streamConfig),
      },
    },
    streamConfig,
  );

  if (updateRes.status === 200) {
    console.log('✅  Stream registered successfully!\n');
    console.log('   Response:', JSON.stringify(updateRes.body, null, 2));
  } else {
    console.error(`❌  Registration failed (HTTP ${updateRes.status})`);
    console.error('   Response:', JSON.stringify(updateRes.body, null, 2));
    process.exit(1);
  }

  // 4. Optional: send a test verification token to confirm the endpoint works
  const testPrompt = process.argv[3] === '--test';
  if (testPrompt) {
    console.log('\n🧪  Sending verification test token...');

    const verifyBody = JSON.stringify({ state: `ework-risc-test-${Date.now()}` });
    const verifyRes = await httpsRequest(
      {
        hostname: 'risc.googleapis.com',
        path: '/v1beta/stream:verify',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${bearerToken}`,
          'Content-Length': Buffer.byteLength(verifyBody),
        },
      },
      verifyBody,
    );

    if (verifyRes.status === 200) {
      console.log('✅  Verification token sent — check your Railway logs for the RISC verification event');
    } else {
      console.error(`⚠️   Verification send failed (HTTP ${verifyRes.status}):`, verifyRes.body);
    }
  }

  console.log('\n🎉  RISC setup complete. Google will now POST security events to:');
  console.log(`   ${RECEIVER_URL}\n`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
