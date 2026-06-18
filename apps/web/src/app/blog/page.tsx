import Link from 'next/link';
import { posts } from '@/content/blog/posts';
import BlogList from './BlogList';

export const metadata = {
  title: 'Blog — eWork Social',
  description: 'Tips, guides and insights for freelance social media managers and digital marketing agencies in Africa.',
};

export default function BlogPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: "'Inter', sans-serif" }}>

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid #E5E7EB', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, position: 'sticky', top: 0, background: 'rgba(249,250,251,0.95)', backdropFilter: 'blur(12px)', zIndex: 10 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 32, height: 32, background: '#2563EB', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⚡</div>
          <span style={{ fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: 18, color: '#111827' }}>eWork Social</span>
        </Link>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <Link href="/" style={{ color: '#6B7280', fontSize: 14, textDecoration: 'none' }}>Home</Link>
          <Link href="/register" style={{ background: '#2563EB', color: 'white', padding: '8px 18px', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
            Start Free Trial →
          </Link>
        </div>
      </nav>

      {/* Hero header */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '64px 24px 48px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.3)', borderRadius: 999, padding: '4px 16px', marginBottom: 20 }}>
          <span style={{ color: '#60A5FA', fontSize: 12, fontWeight: 700, letterSpacing: 2 }}>THE eBLOG</span>
        </div>
        <h1 style={{ color: '#111827', fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, lineHeight: 1.1, margin: '0 0 16px', fontFamily: 'Georgia, serif', letterSpacing: '-1px' }}>
          Insights for Agency Owners<br />
          <span style={{ color: '#2563EB' }}>& Social Media Managers</span>
        </h1>
        <p style={{ color: '#6B7280', fontSize: 17, lineHeight: 1.7, margin: 0, maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>
          Practical guides, feature walkthroughs and strategies to help African agencies manage more clients and grow faster.
        </p>
      </div>

      {/* Post list */}
      <BlogList posts={posts} />

      {/* Bottom CTA */}
      <div style={{ borderTop: '1px solid #E5E7EB', padding: '64px 24px', textAlign: 'center', background: '#EFF6FF' }}>
        <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 8 }}>Ready to simplify your client workflow?</p>
        <h3 style={{ color: '#111827', fontSize: 26, fontWeight: 700, margin: '0 0 24px', fontFamily: 'Georgia, serif' }}>
          Start managing all your clients from one place.
        </h3>
        <Link href="/register" style={{ display: 'inline-block', background: '#2563EB', color: 'white', padding: '14px 32px', borderRadius: 12, textDecoration: 'none', fontWeight: 700, fontSize: 15 }}>
          Start Free Trial — No Card Required
        </Link>
      </div>
    </div>
  );
}
