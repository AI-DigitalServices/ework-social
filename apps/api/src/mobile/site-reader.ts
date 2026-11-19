import axios from 'axios';
import { assertPublicHost, validateWebhookUrl } from '../webhooks/webhook-url.util';

/**
 * Reads a business website for the onboarding "we read your site" step.
 * Safety: https only, private and internal addresses refused (same checks as webhooks),
 * every redirect re-checked, short timeout, size cap, HTML only. The text is DATA for the
 * AI and is never executed or trusted.
 */

export class SiteReadError extends Error {}

export type SiteInfo = {
  title: string;
  description: string;
  siteName: string;
  themeColor: string;
  language: string;
  headings: string[];
  text: string;
};

const MAX_HTML = 1_500_000;
const MAX_REDIRECTS = 3;

export function normalizeWebsite(input: unknown): { ok: boolean; url?: URL; reason?: string } {
  let raw = typeof input === 'string' ? input.trim() : '';
  if (!raw) return { ok: false, reason: 'Please enter your website address.' };
  if (raw.length > 200) return { ok: false, reason: 'That address is too long.' };
  if (/^http:\/\//i.test(raw)) {
    raw = 'https://' + raw.slice(7);
  } else if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) && !/^https:\/\//i.test(raw)) {
    return { ok: false, reason: 'Please enter a normal website address like www.mybusiness.com.' };
  } else if (!/^https:\/\//i.test(raw)) {
    raw = 'https://' + raw.replace(/^\/+/, '');
  }
  const check = validateWebhookUrl(raw);
  if (!check.ok || !check.url) return { ok: false, reason: 'That does not look like a public website address.' };
  return { ok: true, url: check.url };
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return code > 31 && code < 65536 ? String.fromCharCode(code) : ' ';
    });
}

function clean(s: string, max: number): string {
  return decodeEntities(s.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim().slice(0, max);
}

function meta(html: string, key: string): string {
  // The value is quoted with " or ', and may itself contain the other kind (Ada's Bakery).
  const val = '(?:"([^"]*)"|\'([^\']*)\')';
  const a = new RegExp(`<meta[^>]+(?:name|property)=["']${key}["'][^>]*content=${val}`, 'i').exec(html);
  if (a) return clean(a[1] ?? a[2] ?? '', 400);
  const b = new RegExp(`<meta[^>]+content=${val}[^>]*(?:name|property)=["']${key}["']`, 'i').exec(html);
  return b ? clean(b[1] ?? b[2] ?? '', 400) : '';
}

export function extractSiteInfo(htmlIn: string): SiteInfo {
  const html = String(htmlIn || '').slice(0, MAX_HTML);
  const title = clean((/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html) || [])[1] || '', 200);
  const lang = (/<html[^>]*\slang=["']([^"']+)["']/i.exec(html) || [])[1] || '';

  const headings: string[] = [];
  const hre = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
  let m: RegExpExecArray | null;
  while ((m = hre.exec(html)) && headings.length < 12) {
    const h = clean(m[1], 120);
    if (h) headings.push(h);
  }

  const body = html
    .replace(/<(script|style|noscript|svg|template|iframe)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
  const text = clean(body, 5000);

  return {
    title,
    description: meta(html, 'description') || meta(html, 'og:description'),
    siteName: meta(html, 'og:site_name'),
    themeColor: meta(html, 'theme-color'),
    language: clean(lang, 20),
    headings,
    text,
  };
}

export async function readWebsite(start: URL): Promise<SiteInfo> {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    try {
      await assertPublicHost(url.hostname);
    } catch {
      throw new SiteReadError('We could not read that website.');
    }

    let res: any;
    try {
      res = await axios.get(url.toString(), {
        maxRedirects: 0,
        timeout: 8000,
        maxContentLength: MAX_HTML,
        responseType: 'text',
        transformResponse: (x: any) => x,
        validateStatus: () => true,
        headers: { 'User-Agent': 'eWorkSocial-SiteReader/1.0', Accept: 'text/html,application/xhtml+xml' },
      });
    } catch {
      throw new SiteReadError('We could not reach that website. Check the address and try again.');
    }

    if (res.status >= 300 && res.status < 400 && res.headers?.location) {
      let next: URL;
      try {
        next = new URL(String(res.headers.location), url);
      } catch {
        throw new SiteReadError('We could not read that website.');
      }
      const check = validateWebhookUrl(next.toString());
      if (!check.ok || !check.url) throw new SiteReadError('We could not read that website.');
      url = check.url;
      continue;
    }

    if (res.status < 200 || res.status >= 300) {
      throw new SiteReadError('That website did not let us read it. You can type your details in instead.');
    }
    const type = String(res.headers?.['content-type'] || '').toLowerCase();
    if (!type.includes('html')) throw new SiteReadError('That address is not a normal web page.');

    const info = extractSiteInfo(String(res.data ?? ''));
    if (!info.text && !info.title && !info.description) {
      throw new SiteReadError('We could not find any readable text on that page. You can type your details in instead.');
    }
    return info;
  }
  throw new SiteReadError('That website redirected too many times.');
}
