'use client';

import Link from 'next/link';
import { BlogPost } from '@/content/blog/posts';

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  'Agency Tips':    { bg: 'rgba(37,99,235,0.15)',  color: '#60A5FA' },
  'Scheduling':     { bg: 'rgba(16,185,129,0.15)', color: '#34D399' },
  'Platform Guides':{ bg: 'rgba(245,158,11,0.15)', color: '#FCD34D' },
  'AI & Automation':{ bg: 'rgba(139,92,246,0.15)', color: '#A78BFA' },
  'Case Studies':   { bg: 'rgba(239,68,68,0.15)',  color: '#F87171' },
};

function getReadingEmoji(category: string): string {
  const map: Record<string, string> = {
    'Agency Tips': '🏢', 'Scheduling': '📅',
    'Platform Guides': '📱', 'AI & Automation': '🤖',
    'Case Studies': '📊',
  };
  return map[category] || '📝';
}

export default function BlogList({ posts }: { posts: BlogPost[] }) {
  const featured = posts[0];
  const rest = posts.slice(1);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 80px' }}>

      {/* Featured post — large card */}
      {featured && (
        <Link href={`/blog/${featured.slug}`} style={{ textDecoration: 'none', display: 'block', marginBottom: 32 }}>
          <div
            style={{
              background: 'linear-gradient(135deg, #0C1524 0%, #0F1D30 100%)',
              border: '1px solid #1A2840',
              borderRadius: 20, overflow: 'hidden',
              transition: 'transform 0.2s, border-color 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#2563EB';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#1A2840';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {/* Featured banner */}
            <div style={{ background: 'linear-gradient(135deg, #1E3A5F, #2563EB)', padding: '10px 28px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: 2 }}>✦ FEATURED ARTICLE</span>
            </div>

            <div style={{ padding: '32px 36px 36px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                <span style={{ fontSize: 28 }}>{getReadingEmoji(featured.category)}</span>
                <div>
                  {(() => {
                    const cat = CATEGORY_COLORS[featured.category] || { bg: 'rgba(37,99,235,0.15)', color: '#60A5FA' };
                    return (
                      <span style={{ background: cat.bg, color: cat.color, fontSize: 11, fontWeight: 700, padding: '3px 12px', borderRadius: 999, letterSpacing: 1 }}>
                        {featured.category.toUpperCase()}
                      </span>
                    );
                  })()}
                </div>
              </div>

              <h2 style={{ color: '#F0F6FF', fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 800, margin: '0 0 14px', lineHeight: 1.2, fontFamily: 'Georgia, serif', letterSpacing: '-0.5px' }}>
                {featured.title}
              </h2>

              <p style={{ color: '#6B8299', fontSize: 16, lineHeight: 1.75, margin: '0 0 24px' }}>
                {featured.excerpt}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 13, fontWeight: 700 }}>
                    {featured.author.charAt(0)}
                  </div>
                  <div>
                    <p style={{ color: '#C8D8E8', fontSize: 13, fontWeight: 600, margin: 0 }}>{featured.author}</p>
                    <p style={{ color: '#3A506B', fontSize: 12, margin: 0 }}>
                      {new Date(featured.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} · {featured.readTime} min read
                    </p>
                  </div>
                </div>
                <span style={{ color: '#2563EB', fontSize: 14, fontWeight: 700 }}>Read article →</span>
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* Divider */}
      {rest.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{ flex: 1, height: 1, background: '#1A2840' }} />
          <span style={{ color: '#3A506B', fontSize: 11, fontWeight: 700, letterSpacing: 2 }}>MORE ARTICLES</span>
          <div style={{ flex: 1, height: 1, background: '#1A2840' }} />
        </div>
      )}

      {/* Rest of posts — compact cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 20 }}>
        {rest.map((post, idx) => {
          const cat = CATEGORY_COLORS[post.category] || { bg: 'rgba(37,99,235,0.15)', color: '#60A5FA' };
          return (
            <Link key={post.slug} href={`/blog/${post.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
              <div
                style={{
                  background: '#0C1524', border: '1px solid #1A2840',
                  borderRadius: 16, padding: '26px 28px',
                  height: '100%', transition: 'transform 0.2s, border-color 0.2s',
                  borderLeft: `3px solid ${cat.color}`,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = cat.color;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget.style as any).borderColor = '';
                  e.currentTarget.style.borderLeft = `3px solid ${cat.color}`;
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span style={{ fontSize: 20 }}>{getReadingEmoji(post.category)}</span>
                  <span style={{ background: cat.bg, color: cat.color, fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 999, letterSpacing: 1 }}>
                    {post.category.toUpperCase()}
                  </span>
                  <span style={{ color: '#3A506B', fontSize: 11, marginLeft: 'auto' }}>{post.readTime} min</span>
                </div>

                <h3 style={{ color: '#F0F6FF', fontSize: 18, fontWeight: 700, margin: '0 0 10px', lineHeight: 1.3, fontFamily: 'Georgia, serif' }}>
                  {post.title}
                </h3>

                <p style={{ color: '#6B8299', fontSize: 13.5, lineHeight: 1.65, margin: '0 0 18px' }}>
                  {post.excerpt.slice(0, 100)}...
                </p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: '#4A6080', fontSize: 12 }}>
                    {new Date(post.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <span style={{ color: cat.color, fontSize: 12, fontWeight: 700 }}>Read →</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
