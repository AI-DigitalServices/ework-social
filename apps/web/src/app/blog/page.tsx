import Link from 'next/link';
import { posts } from '@/content/blog/posts';

export const metadata = {
  title: 'Blog — eWork Social',
  description: 'Tips, guides and insights for freelance social media managers and digital marketing agencies.',
};

export default function BlogPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#080C14', fontFamily: "'Inter', sans-serif" }}>

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid #1A2840', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src="/icon.png" alt="eWork Social" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }} />
          <span style={{ fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: 18, color: '#fff' }}>eWork Social</span>
        </Link>
        <Link href="/register" style={{ background: '#2563EB', color: 'white', padding: '10px 20px', borderRadius: 10, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
          Start Free Trial →
        </Link>
      </nav>

      {/* Header */}
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '72px 24px 48px' }}>
        <p style={{ color: '#2563EB', fontSize: 13, fontWeight: 700, letterSpacing: 2, marginBottom: 16 }}>BLOG</p>
        <h1 style={{ color: '#F0F6FF', fontSize: 42, fontWeight: 800, lineHeight: 1.15, margin: '0 0 16px', fontFamily: 'Georgia, serif', letterSpacing: '-0.5px' }}>
          Tips for Social Media<br />Managers & Agencies
        </h1>
        <p style={{ color: '#6B8299', fontSize: 17, lineHeight: 1.7, margin: 0 }}>
          Practical guides, feature walkthroughs and strategies to help you manage more clients, post smarter, and grow your business.
        </p>
      </div>

      {/* Post list */}
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '0 24px 80px' }}>
        {posts.map(post => (
          <Link key={post.slug} href={`/blog/${post.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
            <div style={{
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

      {/* CTA */}
      <div style={{ borderTop: '1px solid #1A2840', padding: '64px 24px', textAlign: 'center' }}>
        <p style={{ color: '#6B8299', fontSize: 14, marginBottom: 8 }}>Ready to simplify your client workflow?</p>
        <h3 style={{ color: '#F0F6FF', fontSize: 26, fontWeight: 700, margin: '0 0 24px', fontFamily: 'Georgia, serif' }}>
          Start managing all your clients from one place.
        </h3>
        <Link href="/register" style={{ display: 'inline-block', background: '#2563EB', color: 'white', padding: '14px 32px', borderRadius: 12, textDecoration: 'none', fontWeight: 700, fontSize: 15 }}>
          Start Free Trial — No Card Required
        </Link>
      </div>
    </div>
  );
}
