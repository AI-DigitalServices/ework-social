import { BadRequestException } from '@nestjs/common';

// Input cleaning for the public API. Every function either returns a clean
// value or throws a 400 with a message an automation builder can act on.

export const LEAD_STAGES = ['LEAD', 'CONTACTED', 'PROPOSAL', 'ACTIVE', 'DORMANT'];
export const LEAD_SOURCES = [
  'MANUAL', 'INSTAGRAM_DM', 'INSTAGRAM_COMMENT', 'FACEBOOK_DM', 'FACEBOOK_COMMENT', 'REFERRAL', 'WEBSITE', 'OTHER',
];
export const POST_LIST_STATUSES = ['DRAFT', 'SCHEDULED', 'PUBLISHED', 'FAILED', 'PENDING_APPROVAL'];

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function asObject(body: unknown): Record<string, any> {
  return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, any>) : {};
}

export function cleanString(v: unknown, field: string, max: number, required = false): string | undefined {
  if (v === undefined || v === null || v === '') {
    if (required) throw new BadRequestException(`${field} is required.`);
    return undefined;
  }
  if (typeof v !== 'string') throw new BadRequestException(`${field} must be text.`);
  const s = v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();
  if (!s) {
    if (required) throw new BadRequestException(`${field} is required.`);
    return undefined;
  }
  if (s.length > max) throw new BadRequestException(`${field} is too long (max ${max} characters).`);
  return s;
}

export function cleanEmail(v: unknown, required = false): string | undefined {
  const s = cleanString(v, 'email', 254, required);
  if (!s) return undefined;
  const e = s.toLowerCase();
  if (!EMAIL_RE.test(e)) throw new BadRequestException('email is not a valid email address.');
  return e;
}

export function cleanStage(v: unknown): string | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const s = String(v).trim().toUpperCase();
  if (!LEAD_STAGES.includes(s)) throw new BadRequestException(`stage must be one of: ${LEAD_STAGES.join(', ')}.`);
  return s;
}

export function cleanSource(v: unknown): string | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const s = String(v).trim().toUpperCase();
  if (!LEAD_SOURCES.includes(s)) throw new BadRequestException(`source must be one of: ${LEAD_SOURCES.join(', ')}.`);
  return s;
}

export function cleanTags(v: unknown): string[] | undefined {
  if (v === undefined) return undefined;
  if (!Array.isArray(v)) throw new BadRequestException('tags must be a list of text values.');
  const out: string[] = [];
  for (const t of v) {
    if (typeof t !== 'string') throw new BadRequestException('tags must be a list of text values.');
    const s = t.trim();
    if (!s) continue;
    if (s.length > 40) throw new BadRequestException('Each tag can be at most 40 characters.');
    if (!out.includes(s)) out.push(s);
  }
  if (out.length > 20) throw new BadRequestException('A contact can have at most 20 tags.');
  return out;
}

/** undefined = not provided, null = explicitly cleared. */
export function cleanDeal(v: unknown): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== 'number' || !isFinite(v) || v < 0 || v > 1e12) {
    throw new BadRequestException('dealValue must be a number between 0 and 1,000,000,000,000.');
  }
  return v;
}

/** undefined = not provided, null = explicitly cleared. */
export function cleanDate(v: unknown, field: string): Date | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  if (typeof v !== 'string') throw new BadRequestException(`${field} must be an ISO date string.`);
  const d = new Date(v);
  if (isNaN(d.getTime())) throw new BadRequestException(`${field} is not a valid date.`);
  return d;
}

export function cleanLimit(v: unknown, def = 50, max = 100): number {
  const n = parseInt(String(v ?? ''), 10);
  if (!isFinite(n)) return def;
  return Math.min(Math.max(n, 1), max);
}

export function cleanMediaUrls(v: unknown): string[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) throw new BadRequestException('mediaUrls must be a list of https URLs.');
  if (v.length > 10) throw new BadRequestException('At most 10 media URLs per post.');
  return v.map((u) => {
    let ok = false;
    try {
      ok = typeof u === 'string' && u.length <= 2048 && new URL(u).protocol === 'https:';
    } catch {
      ok = false;
    }
    if (!ok) throw new BadRequestException('Each media URL must be a valid https URL.');
    return u as string;
  });
}
