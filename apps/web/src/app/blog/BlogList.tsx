'use client';

import Link from 'next/link';
import { BlogPost } from '@/content/blog/posts';

export default function BlogList({ posts }: { posts: BlogPost[] }) {
  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '0 24px 80px' }}>
      {posts.map(post => (
        <Link key={post.slug} href={`/blog/${post.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
          <div
            style={{
              background: '#0C1524', border: '1px solid #1A2840', borderRadius: 16,
              padding: '32px 36px', marginBottom: 20, transition: 'border-color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#2563EB')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#1A2840')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <span style={{ background: '#1E3A5F', color: '#60A5FA', fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 999 }}>
                {post.category}
              </span>
              <span style={{ color: '#3A506B', fontSize: 13 }}>
                {new Date(post.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              <span style={{ color: '#3A506B', fontSize: 13 }}>· {post.readTime} min read</span>
            </div>
            <h2 style={{ color: '#F0F6FF', fontSize: 22, fontWeight: 700, margin: '0 0 12px', lineHeight: 1.35, fontFamily: 'Georgia, serif' }}>
              {post.title}
            </h2>
            <p style={{ color: '#6B8299', fontSize: 15, lineHeight: 1.7, margin: '0 0 20px' }}>
              {post.excerpt}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 700 }}>
                {post.author.charAt(0)}
              </div>
              <span style={{ color: '#4A6080', fontSize: 13, fontWeight: 500 }}>{post.author}</span>
              <span style={{ color: '#2563EB', fontSize: 14, fontWeight: 600, marginLeft: 'auto' }}>Read article →</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
