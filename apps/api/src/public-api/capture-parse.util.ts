// Turns whatever a website form posts into a clean lead. Pure, no framework imports.
// Understands the field names used by WordPress form plugins (Contact Form 7,
// Gravity Forms, Elementor, WPForms), Typeform/Webflow-style exports and plain HTML forms.

export interface ParsedCapture {
  spam: boolean;
  name?: string;
  email?: string;
  emailInvalid: boolean;
  phone?: string;
  company?: string;
  message?: string;
  extras: Array<[string, string]>;
}

const ALIASES = {
  name: ['name', 'full_name', 'fullname', 'full-name', 'your-name', 'contact_name', 'contactname'],
  first: ['first_name', 'firstname', 'first-name', 'fname'],
  last: ['last_name', 'lastname', 'last-name', 'lname', 'surname'],
  email: ['email', 'e-mail', 'your-email', 'email_address', 'emailaddress', 'mail'],
  phone: ['phone', 'tel', 'telephone', 'mobile', 'your-phone', 'phone_number', 'phonenumber', 'whatsapp'],
  company: ['company', 'company_name', 'companyname', 'organization', 'organisation', 'business', 'business_name'],
  message: ['message', 'your-message', 'comments', 'comment', 'notes', 'details', 'enquiry', 'inquiry', 'description'],
};
const HONEYPOTS = ['_gotcha', '_hp', 'hp', 'bot-field', 'website_hp', 'honeypot'];
const SENSITIVE_KEY = /token|password|passwd|nonce|csrf|captcha|secret/i;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function clean(s: string, max = 5000): string {
  return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
}

function scalar(v: any): string | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) {
    const parts = v.map(scalar).filter(Boolean) as string[];
    return parts.length ? parts.join(', ') : undefined;
  }
  if (typeof v === 'object' && 'value' in v) return scalar((v as any).value);
  return undefined;
}

function flatten(body: unknown): Map<string, string> {
  const out = new Map<string, string>();
  const add = (k: string, v: any) => {
    const key = k.trim().toLowerCase();
    if (!key || out.has(key)) return;
    const s = scalar(v);
    if (s === undefined) return;
    const t = clean(s);
    if (t) out.set(key, t);
  };
  if (!body || typeof body !== 'object') return out;
  for (const [k, v] of Object.entries(body as Record<string, any>)) {
    add(k, v);
    // Nested shapes such as fields[email] or fields: { email: { value } } -> hoist one level.
    if (v && typeof v === 'object' && !Array.isArray(v) && !('value' in v)) {
      for (const [k2, v2] of Object.entries(v)) add(k2, v2);
    }
  }
  return out;
}

function pick(map: Map<string, string>, aliases: string[]): string | undefined {
  for (const a of aliases) {
    const v = map.get(a);
    if (v) return v;
  }
  return undefined;
}

export function parseCaptureBody(body: unknown): ParsedCapture {
  const map = flatten(body);

  const spam = HONEYPOTS.some((h) => !!map.get(h));

  const first = pick(map, ALIASES.first);
  const last = pick(map, ALIASES.last);
  const name = pick(map, ALIASES.name) || [first, last].filter(Boolean).join(' ') || undefined;

  const rawEmail = pick(map, ALIASES.email);
  const lowered = rawEmail?.toLowerCase().slice(0, 254);
  const emailInvalid = !!lowered && !EMAIL_RE.test(lowered);
  const email = lowered && !emailInvalid ? lowered : undefined;

  const phone = pick(map, ALIASES.phone)?.slice(0, 50);
  const company = pick(map, ALIASES.company)?.slice(0, 200);
  const message = pick(map, ALIASES.message)?.slice(0, 4000);

  const used = new Set<string>([...Object.values(ALIASES).flat(), ...HONEYPOTS]);
  const extras: Array<[string, string]> = [];
  for (const [k, v] of map) {
    if (extras.length >= 10) break;
    if (used.has(k) || k.startsWith('_') || k.includes('.') || SENSITIVE_KEY.test(k)) continue;
    extras.push([k.slice(0, 60), v.slice(0, 200)]);
  }

  return { spam, name: name?.slice(0, 200), email, emailInvalid, phone, company, message, extras };
}
