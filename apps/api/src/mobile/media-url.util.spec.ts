import { isOwnMediaUrl, mediaPrefix } from './media-url.util';

const env = { SUPABASE_URL: 'https://abc.supabase.co/', SUPABASE_BUCKET: 'media' };
const ws = 'cm1workspace12345';
const sha = 'a'.repeat(64);
const good = `https://abc.supabase.co/storage/v1/object/public/media/${ws}/${sha}.jpg`;

describe('media-url.util', () => {
  it('builds the workspace prefix without a double slash', () => {
    expect(mediaPrefix(ws, env)).toBe(`https://abc.supabase.co/storage/v1/object/public/media/${ws}/`);
  });

  it('defaults the bucket to media', () => {
    expect(mediaPrefix(ws, { SUPABASE_URL: 'https://abc.supabase.co' })).toContain('/public/media/');
  });

  it('returns null when storage is not configured', () => {
    expect(mediaPrefix(ws, {})).toBeNull();
    expect(isOwnMediaUrl(good, ws, {})).toBe(false);
  });

  it('accepts the workspace own content-addressed file', () => {
    expect(isOwnMediaUrl(good, ws, env)).toBe(true);
  });

  it('refuses another workspace, another host and odd names', () => {
    expect(isOwnMediaUrl(good.replace(ws, 'cm1someoneelse123'), ws, env)).toBe(false);
    expect(isOwnMediaUrl(good.replace('abc.supabase.co', 'evil.example.com'), ws, env)).toBe(false);
    expect(isOwnMediaUrl(`${good}?x=1`, ws, env)).toBe(false);
    expect(isOwnMediaUrl(good.replace(`${sha}.jpg`, '../secret.jpg'), ws, env)).toBe(false);
    expect(isOwnMediaUrl(good.replace(`${sha}.jpg`, 'photo.jpg'), ws, env)).toBe(false);
  });

  it('refuses non-strings, long values and bad workspace ids', () => {
    expect(isOwnMediaUrl(null, ws, env)).toBe(false);
    expect(isOwnMediaUrl('x'.repeat(600), ws, env)).toBe(false);
    expect(isOwnMediaUrl(good, '../x', env)).toBe(false);
  });
});
