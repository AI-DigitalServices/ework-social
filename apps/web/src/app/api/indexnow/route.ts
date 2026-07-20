import { NextResponse } from 'next/server';
import { posts } from '@/content/blog/posts';

const BASE = 'https://www.eworksocial.com';
const INDEXNOW_KEY = 'b77f0ef2ec07c7be9f3f5d18bfd75374';
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

// POST /api/indexnow
// Pings Bing/IndexNow with all public URLs.
// Call this manually after deploying new blog posts or major page updates.
// Secure it with an optional INDEXNOW_SECRET env var.
export async function POST(req: Request) {
  const secret = process.env.INDEXNOW_SECRET;
  if (secret) {
    const { authorization } = Object.fromEntries(req.headers);
    if (authorization !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const staticUrls = [
    BASE,
    `${BASE}/register`,
    `${BASE}/login`,
    `${BASE}/blog`,
    `${BASE}/privacy`,
    `${BASE}/terms`,
  ];

  const blogUrls = posts.map((p) => `${BASE}/blog/${p.slug}`);
  const urlList = [...staticUrls, ...blogUrls];

  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: 'www.eworksocial.com',
        key: INDEXNOW_KEY,
        keyLocation: `${BASE}/${INDEXNOW_KEY}.txt`,
        urlList,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: res.status });
    }

    return NextResponse.json({
      success: true,
      submitted: urlList.length,
      urls: urlList,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// GET /api/indexnow — returns the key for verification
export async function GET() {
  return NextResponse.json({ key: INDEXNOW_KEY, urls: posts.length + 6 });
}
