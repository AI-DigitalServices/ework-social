import { isIP } from 'net';
import { promises as dns } from 'dns';

// Outbound webhook targets are chosen by customers, so they must never be able
// to point us at our own network (cloud metadata, databases, localhost).

function ipv4Parts(ip: string): number[] | null {
  const p = ip.split('.');
  if (p.length !== 4) return null;
  const n = p.map((x) => (/^\d{1,3}$/.test(x) ? Number(x) : NaN));
  return n.some((x) => !(x >= 0 && x <= 255)) ? null : n;
}

/** True for any address that is not a normal public internet address. */
export function isPrivateIp(ip: string): boolean {
  let addr = (ip || '').trim().toLowerCase();
  if (addr.startsWith('[') && addr.endsWith(']')) addr = addr.slice(1, -1);
  const zone = addr.indexOf('%');
  if (zone >= 0) addr = addr.slice(0, zone);

  const kind = isIP(addr);
  if (kind === 4) {
    const p = ipv4Parts(addr);
    if (!p) return true;
    const [a, b] = p;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true; // link-local + cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
    if (a === 192 && b === 0 && p[2] === 0) return true;
    if (a === 198 && (b === 18 || b === 19)) return true;
    if (a >= 224) return true; // multicast + reserved
    return false;
  }
  if (kind === 6) {
    const dotted = addr.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (dotted) return isPrivateIp(dotted[1]);
    const hex = addr.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (hex) {
      const hi = parseInt(hex[1], 16);
      const lo = parseInt(hex[2], 16);
      return isPrivateIp(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
    }
    // Only global unicast (2000::/3) counts as public.
    const first = parseInt(addr.split(':')[0] || '0', 16);
    return (first & 0xe000) !== 0x2000;
  }
  return true; // not an IP at all: treat as unsafe
}

// Flat shape on purpose: the API project is not compiled with strict null checks,
// so a two-shape union would not narrow on `ok`.
export type UrlCheck = { ok: boolean; url?: URL; reason?: string };

/** Static checks on a webhook URL, done when it is saved. */
export function validateWebhookUrl(raw: unknown): UrlCheck {
  if (typeof raw !== 'string' || !raw.trim() || raw.length > 2048) {
    return { ok: false, reason: 'A valid https:// URL is required.' };
  }
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return { ok: false, reason: 'That is not a valid URL.' };
  }
  if (u.protocol !== 'https:') return { ok: false, reason: 'The webhook URL must start with https://.' };
  if (u.username || u.password) return { ok: false, reason: 'Remove the username/password from the URL.' };

  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (isIP(host)) {
    if (isPrivateIp(host)) return { ok: false, reason: 'That address is private or reserved and cannot be used.' };
  } else if (
    !host.includes('.') ||
    host === 'localhost' ||
    /\.(localhost|local|internal|localdomain|lan|home|corp)$/.test(host)
  ) {
    return { ok: false, reason: 'Use a public hostname for the webhook URL.' };
  }
  return { ok: true, url: u };
}

/**
 * Delivery-time check: resolve the hostname and refuse if any address is
 * private. Narrows (but cannot fully close) DNS-rebinding; redirects are also
 * disabled at the HTTP layer.
 */
export async function assertPublicHost(hostname: string): Promise<void> {
  const host = (hostname || '').toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (isIP(host)) {
    if (isPrivateIp(host)) throw new Error('Blocked: private address');
    return;
  }
  const records = await dns.lookup(host, { all: true });
  if (!records.length || records.some((r) => isPrivateIp(r.address))) {
    throw new Error('Blocked: host resolves to a private address');
  }
}
