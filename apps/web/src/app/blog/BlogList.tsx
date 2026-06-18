'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BlogPost } from '@/content/blog/posts';

const CATEGORY_COLORS: Record<string, string> = {
  'Agency Tips':     '#3B82F6',
  'Scheduling':      '#10B981',
  'Platform Guides': '#F59E0B',
  'AI & Automation': '#8B5CF6',
  'Case Studies':    '#EF4444',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function ThreeCard({ post }: { post: BlogPost }) {
  const [hovered, setHovered] = useState(false);
  const catColor = CATEGORY_COLORS[post.category] || '#3B82F6';

  return (
    <Link href={`/blog/${post.slug}`} style={{ textDecoration: 'none', display: 'block', flex: '1 1 0' }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          borderRadius: 14, overflow: 'hidden',
          border: '1px solid #e5e7eb', height: '100%',
          background: '#fff',
          transition: 'box-shadow 0.2s, transform 0.2s',
          boxShadow: hovered ? '0 8px 28px rgba(0,0,0,0.1)' : '0 2px 6px rgba(0,0,0,0.05)',
          transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        }}
      >
        {/* Image */}
        <div style={{ position: 'relative', height: 180, overflow: 'hidden' }}>
          <img
            src={post.coverImage}
            alt={post.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover',
              transition: 'transform 0.3s', transform: hovered ? 'scale(1.05)' : 'scale(1)' }}
          />
          <span style={{
            position: 'absolute', top: 12, left: 12,
            background: catColor, color: '#fff',
            fontSize: 10, fontWeight: 700, padding: '3px 10px',
            borderRadius: 999, letterSpacing: 1,
          }}>
            {post.category.toUpperCase()}
          </span>
        </div>

        {/* Content */}
        <div style={{ padding: '16px 18px 20px' }}>
          <h3 style={{
            color: '#111827', fontSize: 15, fontWeight: 700,
            margin: '0 0 8px', lineHeight: 1.4,
            fontFamily: 'Georgia, serif',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {post.title}
          </h3>
          <p style={{
            color: '#6B7280', fontSize: 13, lineHeight: 1.6,
            margin: '0 0 14px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {post.excerpt}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: catColor, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 11, fontWeight: 700,
              }}>
                {post.author.charAt(0)}
              </div>
              <span style={{ color: '#9CA3AF', fontSize: 11 }}>
                {new Date(post.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
            <span style={{ color: catColor, fontSize: 11, fontWeight: 700 }}>
              {post.readTime} min →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function HeroCard({ post }: { post: BlogPost }) {
  const [hovered, setHovered] = useState(false);
  const catColor = CATEGORY_COLORS[post.category] || '#3B82F6';

  return (
    <Link href={`/blog/${post.slug}`} style={{ textDecoration: 'none', display: 'block', flex: '1 1 60%' }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid #e5e7eb', transition: 'box-shadow 0.2s', boxShadow: hovered ? '0 8px 32px rgba(0,0,0,0.12)' : '0 2px 8px rgba(0,0,0,0.06)' }}
      >
        {/* Hero image */}
        <div style={{ position: 'relative', height: 320, overflow: 'hidden' }}>
          <img
            src={post.coverImage}
            alt={post.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s', transform: hovered ? 'scale(1.03)' : 'scale(1)' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)' }} />
          <span style={{ position: 'absolute', top: 16, left: 16, background: catColor, color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 999, letterSpacing: 1 }}>
            {post.category.toUpperCase()}
          </span>
        </div>

        {/* Content */}
        <div style={{ padding: '24px 28px 28px', background: '#fff' }}>
          <h2 style={{ color: '#111827', fontSize: 'clamp(20px, 2.5vw, 26px)', fontWeight: 800, margin: '0 0 12px', lineHeight: 1.25, fontFamily: 'Georgia, serif', letterSpacing: '-0.3px' }}>
            {post.title}
          </h2>
          <p style={{ color: '#6B7280', fontSize: 15, lineHeight: 1.7, margin: '0 0 20px' }}>
            {post.excerpt}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: catColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700 }}>
              {post.author.charAt(0)}
            </div>
            <div>
              <p style={{ color: '#111827', fontSize: 13, fontWeight: 600, margin: 0 }}>{post.author}</p>
              <p style={{ color: '#9CA3AF', fontSize: 12, margin: 0 }}>{formatDate(post.publishedAt)} · {post.readTime} min read</p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function SideCard({ post }: { post: BlogPost }) {
  const [hovered, setHovered] = useState(false);
  const catColor = CATEGORY_COLORS[post.category] || '#3B82F6';

  return (
    <Link href={`/blog/${post.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ display: 'flex', gap: 14, padding: '16px 0', borderBottom: '1px solid #F3F4F6', transition: 'opacity 0.2s', opacity: hovered ? 0.8 : 1 }}
      >
        {/* Thumbnail */}
        <div style={{ width: 90, height: 70, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
          <img src={post.coverImage} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ color: catColor, fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>
            {post.category.toUpperCase()}
          </span>
          <h4 style={{ color: '#111827', fontSize: 14, fontWeight: 700, margin: '4px 0 6px', lineHeight: 1.3, fontFamily: 'Georgia, serif', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {post.title}
          </h4>
          <p style={{ color: '#9CA3AF', fontSize: 11, margin: 0 }}>
            {formatDate(post.publishedAt)} · {post.readTime} min
          </p>
        </div>
      </div>
    </Link>
  );
}

export default function BlogList({ posts, isDark = false }: { posts: BlogPost[]; isDark?: boolean }) {
  const featured = posts[0];
  const trending = posts.slice(1, 5);
  const threeCards = posts.slice(1, 4);
  const grid = posts.slice(4);

  if (!featured) return null;

  const catColor = CATEGORY_COLORS[featured.category] || '#3B82F6';

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px' }}>

      {/* Hero section — featured + trending sidebar */}
      <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', marginBottom: 48 }}>

        {/* Featured post */}
        <HeroCard post={featured} />

        {/* Trending sidebar */}
        {trending.length > 0 && (
          <div style={{
            flex: '1 1 300px', background: isDark ? '#0C1524' : '#F9FAFB',
            borderRadius: 16, padding: '24px', border: `1px solid ${isDark ? '#1A2840' : '#E5E7EB'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 12, borderBottom: `2px solid ${catColor}` }}>
              <span style={{ color: isDark ? '#fff' : '#111827', fontWeight: 800, fontSize: 16 }}>More Articles</span>
            </div>
            {trending.map(post => <SideCard key={post.slug} post={post} />)}
          </div>
        )}
      </div>

      {/* Grid for remaining posts */}
      {/* Three card row */}
      {threeCards.length > 0 && (
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
            <span style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 700, letterSpacing: 2 }}>LATEST ARTICLES</span>
            <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {threeCards.map(post => (
              <ThreeCard key={post.slug} post={post} />
            ))}
          </div>
        </div>
      )}

      {grid.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
            <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
            <span style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 700, letterSpacing: 2 }}>ALL ARTICLES</span>
            <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
            {grid.map(post => (
              <HeroCard key={post.slug} post={post} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
