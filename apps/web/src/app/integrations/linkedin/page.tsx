'use client';
import Link from 'next/link';

const NAV_BG = '#0A1628';
const DARK = '#0D1B2A';
const BLUE = '#378ADD';
const BLUE_DARK = '#2563EB';
const LINKEDIN_BLUE = '#0077B5';
const TEXT = '#E8F0FA';
const MUTED = '#6B8299';
const CARD_BG = '#111E30';
const BORDER = '#1A2840';

const features = [
  {
    icon: '📅',
    title: 'Schedule posts to Company Pages',
    desc: 'Draft, schedule, and auto-publish content to any LinkedIn Company Page you admin — right from the eWork Social scheduler. Set it once, post at the perfect time.',
  },
  {
    icon: '💬',
    title: 'Engage from a unified inbox',
    desc: 'Comments on your LinkedIn Company Page posts land in the same Engagement Hub as your Facebook, Instagram, and Twitter interactions. One inbox, every platform.',
  },
  {
    icon: '↩️',
    title: 'Reply to comments without leaving',
    desc: 'Respond to LinkedIn Page comments directly inside eWork Social. No switching tabs, no missing conversations — your community gets faster, more consistent replies.',
  },
  {
    icon: '🏢',
    title: 'Multiple Company Pages, one connection',
    desc: 'Connect your agency page, your client pages, and new brands like Kashlet in a single OAuth flow. Every page you admin appears as a separate account in the composer.',
  },
  {
    icon: '📊',
    title: 'Post analytics & engagement tracking',
    desc: 'See how your LinkedIn content performs alongside every other platform. Impressions, reactions, comments — all in one place for your monthly agency reports.',
  },
  {
    icon: '🔒',
    title: 'Secure OAuth — your credentials stay yours',
    desc: 'We connect via LinkedIn\'s official OAuth 2.0. We never store your LinkedIn password. Access tokens are encrypted with AES-256-CBC at rest and you can disconnect any time.',
  },
];

const steps = [
  {
    num: '01',
    title: 'Connect your LinkedIn account',
    desc: 'Go to Settings → Social Accounts → LinkedIn. Click "Connect Personal Profile" to link your member account, then "Connect Company Pages" to authorise your Company Pages via LinkedIn\'s Community Management API.',
  },
  {
    num: '02',
    title: 'Select which pages to manage',
    desc: 'eWork Social automatically discovers all LinkedIn Company Pages and Showcase Pages where you have the Administrator role. Each page appears as its own account in the scheduler and inbox.',
  },
  {
    num: '03',
    title: 'Schedule posts & engage with comments',
    desc: 'Create posts in the scheduler, assign them to any connected LinkedIn Page, and set your publish time. Comments roll into the Engagement Hub where your team can reply, track, and resolve — without leaving the platform.',
  },
];

const useCases = [
  { label: 'Agency managing client LinkedIn Pages', icon: '🏪' },
  { label: 'Brand with multiple Showcase Pages', icon: '🏷️' },
  { label: 'Founder posting across personal + company profile', icon: '👤' },
  { label: 'Team needing a shared LinkedIn comment inbox', icon: '👥' },
];

export default function LinkedInIntegrationPage() {
  return (
    <div style={{ background: DARK, minHeight: '100vh', color: TEXT, fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>

      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: NAV_BG, borderBottom: `1px solid ${BORDER}`, padding: '0 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${BLUE}, ${BLUE_DARK})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 16, fontWeight: 900 }}>e</span>
            </div>
            <span style={{ color: TEXT, fontWeight: 800, fontSize: 17 }}>eWork Social</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href="/blog" style={{ color: MUTED, textDecoration: 'none', fontSize: 14 }}>Blog</Link>
            <Link href="/login" style={{ color: MUTED, textDecoration: 'none', fontSize: 14 }}>Log in</Link>
            <Link href="/register" style={{ background: BLUE, color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 700, padding: '8px 16px', borderRadius: 8 }}>
              Start free trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: '80px 24px 64px', textAlign: 'center' }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          {/* LinkedIn badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(0,119,181,0.12)', border: '1px solid rgba(0,119,181,0.3)', borderRadius: 100, padding: '6px 16px', marginBottom: 28 }}>
            <div style={{ width: 20, height: 20, borderRadius: 4, background: LINKEDIN_BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 11, fontWeight: 900 }}>in</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#60A8D0' }}>LinkedIn Integration</span>
          </div>

          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 20, color: '#fff' }}>
            Manage LinkedIn Company Pages<br />
            <span style={{ color: BLUE }}>from your agency dashboard</span>
          </h1>
          <p style={{ fontSize: 18, color: MUTED, lineHeight: 1.7, marginBottom: 36, maxWidth: 600, margin: '0 auto 36px' }}>
            Schedule posts, reply to comments, and monitor engagement on LinkedIn Company Pages — alongside Facebook, Instagram, and Twitter — without switching platforms.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/register" style={{ background: BLUE, color: '#fff', textDecoration: 'none', padding: '14px 28px', borderRadius: 10, fontWeight: 800, fontSize: 15, boxShadow: '0 4px 20px rgba(55,138,221,0.4)' }}>
              Start free 7-day trial
            </Link>
            <Link href="/login" style={{ border: `1.5px solid ${BORDER}`, color: TEXT, textDecoration: 'none', padding: '14px 28px', borderRadius: 10, fontWeight: 700, fontSize: 15 }}>
              Log in to connect
            </Link>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section style={{ padding: '64px 24px', background: '#0A1628' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: BLUE, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>What you can do</p>
          <h2 style={{ textAlign: 'center', fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 800, color: '#fff', marginBottom: 48 }}>
            Everything your LinkedIn presence needs, in one place
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {features.map((f) => (
              <div key={f.title} style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 28 }}>
                <div style={{ fontSize: 28, marginBottom: 14 }}>{f.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 10 }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '64px 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <p style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: BLUE, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>How it works</p>
          <h2 style={{ textAlign: 'center', fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 800, color: '#fff', marginBottom: 48 }}>
            Set up in under 5 minutes
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {steps.map((s) => (
              <div key={s.num} style={{ display: 'flex', gap: 24, alignItems: 'flex-start', background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 28 }}>
                <div style={{ minWidth: 52, height: 52, borderRadius: 14, background: `rgba(55,138,221,0.15)`, border: `1.5px solid rgba(55,138,221,0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: 900, color: BLUE }}>{s.num}</span>
                </div>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{s.title}</h3>
                  <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.7 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section style={{ padding: '48px 24px', background: '#0A1628' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 800, color: '#fff', marginBottom: 36 }}>
            Born in Africa. Built for the world.
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {useCases.map((u) => (
              <div key={u.label} style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '20px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 22 }}>{u.icon}</span>
                <p style={{ fontSize: 13, color: TEXT, fontWeight: 500, textAlign: 'left', lineHeight: 1.4 }}>{u.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security section */}
      <section style={{ padding: '64px 24px' }}>
        <div style={{ maxWidth: 780, margin: '0 auto', background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 20, padding: '48px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>🔐</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 14 }}>Your data stays yours</h2>
          <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.8, maxWidth: 540, margin: '0 auto 28px' }}>
            eWork Social connects to LinkedIn exclusively via OAuth 2.0. We never see your LinkedIn password. Access tokens are encrypted with AES-256-CBC before being stored. You can disconnect any account at any time, and we will immediately stop accessing it.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['OAuth 2.0 only', 'AES-256-CBC encryption', 'Revoke access anytime', 'Admin-only page access'].map(b => (
              <span key={b} style={{ background: 'rgba(55,138,221,0.1)', border: '1px solid rgba(55,138,221,0.25)', borderRadius: 100, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#60A8D0' }}>{b}</span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '64px 24px 80px', textAlign: 'center' }}>
        <div style={{ maxWidth: 580, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 900, color: '#fff', marginBottom: 16 }}>
            Ready to manage LinkedIn from one dashboard?
          </h2>
          <p style={{ fontSize: 16, color: MUTED, marginBottom: 32 }}>
            From Lagos to London, Accra to Amsterdam — social media agencies everywhere use eWork Social to manage their clients' LinkedIn presence from one unified dashboard.
          </p>
          <Link href="/register" style={{ background: BLUE, color: '#fff', textDecoration: 'none', padding: '16px 36px', borderRadius: 12, fontWeight: 800, fontSize: 16, boxShadow: '0 4px 24px rgba(55,138,221,0.4)', display: 'inline-block' }}>
            Start your free 7-day trial
          </Link>
          <p style={{ fontSize: 12, color: MUTED, marginTop: 12 }}>No credit card required · Cancel anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${BORDER}`, padding: '28px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 12, flexWrap: 'wrap' }}>
          <Link href="/" style={{ color: MUTED, fontSize: 13, textDecoration: 'none' }}>Home</Link>
          <Link href="/blog" style={{ color: MUTED, fontSize: 13, textDecoration: 'none' }}>Blog</Link>
          <Link href="/privacy" style={{ color: MUTED, fontSize: 13, textDecoration: 'none' }}>Privacy Policy</Link>
          <Link href="/terms" style={{ color: MUTED, fontSize: 13, textDecoration: 'none' }}>Terms of Service</Link>
          <Link href="/register" style={{ color: MUTED, fontSize: 13, textDecoration: 'none' }}>Sign up</Link>
        </div>
        <p style={{ color: MUTED, fontSize: 12 }}>© 2025 Jben Logistics Limited · eWork Social</p>
      </footer>
    </div>
  );
}
