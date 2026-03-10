'use client';

import { useEffect, useState } from 'react';

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#080C14', color: '#fff' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Syne:wght@700;800&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        .btn-primary { background: #2563EB; color: white; padding: 14px 28px; border-radius: 10px; font-size: 15px; font-weight: 600; border: none; cursor: pointer; text-decoration: none; display: inline-block; transition: all 0.2s; }
        .btn-primary:hover { background: #1D4ED8; transform: translateY(-1px); }
        .btn-outline { background: transparent; color: #CBD5E1; padding: 14px 28px; border-radius: 10px; font-size: 15px; font-weight: 600; border: 1px solid #1E293B; text-decoration: none; display: inline-block; transition: all 0.2s; }
        .btn-outline:hover { border-color: #334155; color: #fff; }
        .nav-link { color: #94A3B8; text-decoration: none; font-size: 14px; font-weight: 500; transition: color 0.2s; }
        .nav-link:hover { color: #fff; }
        .feature-card { background: #0D1526; border: 1px solid #1E293B; border-radius: 16px; padding: 32px; transition: all 0.3s; }
        .feature-card:hover { border-color: #2563EB40; transform: translateY(-4px); }
        .pricing-card { background: #0D1526; border: 1px solid #1E293B; border-radius: 20px; padding: 36px; transition: all 0.3s; position: relative; }
        .pricing-card.popular { border-color: #2563EB; background: #0D1A2D; }
        .check-item { display: flex; align-items: center; gap: 10px; color: #94A3B8; font-size: 14px; margin-bottom: 12px; }
        .platform-pill { background: #0D1526; border: 1px solid #1E293B; border-radius: 100px; padding: 8px 16px; font-size: 13px; color: #94A3B8; display: inline-flex; align-items: center; gap: 8px; transition: all 0.2s; }
        .ticker { display: flex; gap: 40px; animation: ticker 20s linear infinite; white-space: nowrap; }
        @keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .section-label { font-size: 12px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #2563EB; margin-bottom: 12px; }
        .grid-bg { background-image: linear-gradient(rgba(37,99,235,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.03) 1px, transparent 1px); background-size: 60px 60px; }
      `}</style>

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: scrollY > 50 ? 'rgba(8,12,20,0.95)' : 'transparent', backdropFilter: scrollY > 50 ? 'blur(12px)' : 'none', borderBottom: scrollY > 50 ? '1px solid #1E293B' : 'none', transition: 'all 0.3s', padding: '0 40px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 68 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, background: '#2563EB', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⚡</div>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18 }}>eWork Social</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            <a href="#features" className="nav-link">Features</a>
            <a href="#pricing" className="nav-link">Pricing</a>
            <a href="/login" className="nav-link">Sign in</a>
            <a href="/register" className="btn-primary" style={{ padding: '10px 20px', fontSize: 14 }}>Get started free</a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="grid-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', paddingTop: 100, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', filter: 'blur(120px)', background: '#2563EB', opacity: 0.1, top: -100, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px', width: '100%', textAlign: 'center' }}>
          <span style={{ background: '#1E3A5F', color: '#60A5FA', fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 100, display: 'inline-block', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 24 }}>🌍 Built for African Agencies</span>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(44px, 7vw, 80px)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-2px', marginBottom: 24 }}>
            Manage Every Client&apos;s<br /><span style={{ color: '#2563EB' }}>Social Media</span> at Scale
          </h1>
          <p style={{ fontSize: 18, color: '#94A3B8', lineHeight: 1.7, marginBottom: 40, maxWidth: 600, margin: '0 auto 40px' }}>
            The all-in-one platform for digital agencies. Schedule posts, manage clients, track analytics, and automate responses.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
            <a href="/register" className="btn-primary" style={{ fontSize: 16, padding: '16px 32px' }}>Start free trial →</a>
            <a href="/login" className="btn-outline" style={{ fontSize: 16, padding: '16px 32px' }}>Sign in to dashboard</a>
          </div>
          <p style={{ color: '#475569', fontSize: 13 }}>No credit card required · 7-day free trial · Cancel anytime</p>

          {/* Mock Dashboard */}
          <div style={{ marginTop: 64, background: '#0D1526', border: '1px solid #1E293B', borderRadius: 20, overflow: 'hidden', boxShadow: '0 40px 80px rgba(0,0,0,0.5)' }}>
            <div style={{ background: '#080C14', borderBottom: '1px solid #1E293B', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F57' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFBD2E' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28C840' }} />
              <span style={{ marginLeft: 12, fontSize: 12, color: '#475569' }}>app.eworksocial.com/dashboard</span>
            </div>
            <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '180px 1fr', gap: 20, textAlign: 'left' }}>
              <div style={{ borderRight: '1px solid #1E293B', paddingRight: 20 }}>
                {['📊 Dashboard', '📅 Scheduler', '👥 CRM', '📈 Analytics', '🤖 Auto-Responder'].map((item, i) => (
                  <div key={item} style={{ padding: '8px 12px', borderRadius: 8, marginBottom: 4, fontSize: 12, background: i === 0 ? '#1E3A5F' : 'transparent', color: i === 0 ? '#60A5FA' : '#64748B' }}>{item}</div>
                ))}
              </div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Welcome back! 👋</p>
                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                  {[['24', 'Posts', '#2563EB'], ['12', 'Clients', '#10B981'], ['8', 'Leads', '#F59E0B'], ['6', 'Accounts', '#8B5CF6']].map(([n, l, c]) => (
                    <div key={l} style={{ background: '#080C14', border: '1px solid #1E293B', borderRadius: 10, padding: 12, flex: 1 }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: c as string }}>{n}</div>
                      <div style={{ fontSize: 11, color: '#64748B' }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TICKER */}
      <div style={{ borderTop: '1px solid #1E293B', borderBottom: '1px solid #1E293B', padding: '18px 0', overflow: 'hidden', background: '#0A0F1A' }}>
        <div style={{ display: 'flex', overflow: 'hidden' }}>
          <div className="ticker">
            {['📅 Smart Scheduling', '👥 CRM Pipeline', '📊 Analytics', '🤖 Auto-Responder', '💳 Paystack Billing', '🌍 Africa-First', '⚡ BullMQ Queue', '🔒 Multi-Tenant',
              '📅 Smart Scheduling', '👥 CRM Pipeline', '📊 Analytics', '🤖 Auto-Responder', '💳 Paystack Billing', '🌍 Africa-First', '⚡ BullMQ Queue', '🔒 Multi-Tenant'].map((item, i) => (
              <span key={i} style={{ color: '#475569', fontSize: 13 }}>{item} <span style={{ color: '#1E293B', margin: '0 16px' }}>●</span></span>
            ))}
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <section id="features" style={{ padding: '100px 40px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <p className="section-label">Features</p>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, letterSpacing: '-1.5px' }}>Everything your agency needs</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          {[
            { icon: '📅', title: 'Smart Scheduler', desc: 'Schedule posts across Facebook, Instagram, LinkedIn and more. Calendar view and intelligent queue management.', color: '#2563EB' },
            { icon: '👥', title: 'CRM & Pipeline', desc: 'Full client relationship management with lead pipeline: Lead → Contacted → Proposal → Active.', color: '#10B981' },
            { icon: '📊', title: 'Analytics', desc: 'Track engagement, reach, clicks, and follower growth. Up to 12 months history on Agency Pro.', color: '#F59E0B' },
            { icon: '🤖', title: 'Auto-Responder', desc: 'Auto-reply to comments and DMs with keyword triggers and template responses.', color: '#8B5CF6' },
            { icon: '🏢', title: 'Multi-Tenant', desc: 'Each workspace is fully isolated with separate branding, accounts, and permissions.', color: '#EC4899' },
            { icon: '🏷️', title: 'White Label', desc: 'Agency Pro gets a white-labeled dashboard with custom domain. Present it as your own product.', color: '#14B8A6' },
          ].map((f, i) => (
            <div key={i} className="feature-card">
              <div style={{ width: 48, height: 48, background: `${f.color}20`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 20 }}>{f.icon}</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{f.title}</h3>
              <p style={{ color: '#64748B', fontSize: 14, lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PLATFORMS */}
      <section style={{ padding: '80px 40px', background: '#0A0F1A', borderTop: '1px solid #1E293B', borderBottom: '1px solid #1E293B' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          <p className="section-label">Platforms</p>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, marginBottom: 16 }}>Post everywhere at once</h2>
          <p style={{ color: '#64748B', marginBottom: 48 }}>Connect all your social accounts and manage them from one place</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            {[['📘', 'Facebook', 'Live'], ['📸', 'Instagram', 'Live'], ['💼', 'LinkedIn', 'Soon'], ['𝕏', 'Twitter/X', 'Growth+'], ['🎵', 'TikTok', 'Soon'], ['▶️', 'YouTube', 'Soon'], ['📌', 'Pinterest', 'Soon'], ['💬', 'WhatsApp', 'Soon']].map(([icon, name, status], i) => (
              <div key={i} className="platform-pill">
                <span>{icon}</span><span>{name}</span>
                <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: status === 'Live' ? '#065F46' : status === 'Growth+' ? '#1E3A5F' : '#1E293B', color: status === 'Live' ? '#34D399' : status === 'Growth+' ? '#60A5FA' : '#475569' }}>{status}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ padding: '100px 40px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <p className="section-label">Pricing</p>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, letterSpacing: '-1.5px' }}>Simple, transparent pricing</h2>
          <p style={{ color: '#64748B', marginTop: 12 }}>Start free. Scale as you grow.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24 }}>
          {[
            { name: 'Free Trial', price: '₦0', period: '7 days', popular: false, features: ['5 social accounts', '50 posts/month', '1 workspace', 'Basic CRM', 'Watermark on posts'], cta: 'Start free' },
            { name: 'Starter', price: '₦5,000', period: '/month', popular: false, features: ['10 social accounts', '200 posts/month', 'CRM & pipeline', '30-day analytics', 'No watermark'], cta: 'Get Starter' },
            { name: 'Growth', price: '₦12,000', period: '/month', popular: true, features: ['30 social accounts', '2,000 posts/month', '5 team members', '6-month analytics', 'Bulk scheduling', 'Twitter/X access'], cta: 'Get Growth' },
            { name: 'Agency Pro', price: '₦29,000', period: '/month', popular: false, features: ['100 social accounts', 'Unlimited posts', '15 team members', '12-month analytics', 'White-label', 'API access'], cta: 'Get Agency Pro' },
          ].map((plan, i) => (
            <div key={i} className={`pricing-card ${plan.popular ? 'popular' : ''}`}>
              {plan.popular && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#2563EB', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 14px', borderRadius: 100, whiteSpace: 'nowrap' }}>MOST POPULAR</div>}
              <p style={{ fontSize: 14, color: '#64748B', fontWeight: 600, marginBottom: 8 }}>{plan.name}</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                <span style={{ fontSize: 34, fontWeight: 800, fontFamily: 'Syne, sans-serif' }}>{plan.price}</span>
                <span style={{ color: '#64748B', fontSize: 13 }}>{plan.period}</span>
              </div>
              <div style={{ borderTop: '1px solid #1E293B', margin: '20px 0' }} />
              {plan.features.map((f, j) => (
                <div key={j} className="check-item">
                  <div style={{ width: 18, height: 18, background: '#1E3A5F', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60A5FA', fontSize: 10, flexShrink: 0 }}>✓</div>
                  {f}
                </div>
              ))}
              <a href="/register" className={plan.popular ? 'btn-primary' : 'btn-outline'} style={{ display: 'block', textAlign: 'center', marginTop: 24, width: '100%' }}>{plan.cta}</a>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 40px', borderTop: '1px solid #1E293B', textAlign: 'center' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ width: 64, height: 64, background: '#2563EB', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 24px' }}>⚡</div>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, letterSpacing: '-1.5px', marginBottom: 16 }}>Ready to scale your agency?</h2>
          <p style={{ color: '#64748B', fontSize: 16, marginBottom: 40, lineHeight: 1.7 }}>Join agencies across Africa managing their clients&apos; social media with eWork Social.</p>
          <a href="/register" className="btn-primary" style={{ fontSize: 16, padding: '16px 40px' }}>Get started free →</a>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid #1E293B', padding: '40px', background: '#080C14' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, background: '#2563EB', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>⚡</div>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 16 }}>eWork Social</span>
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            <a href="/privacy" style={{ color: '#475569', fontSize: 13, textDecoration: 'none' }}>Privacy Policy</a>
            <a href="/terms" style={{ color: '#475569', fontSize: 13, textDecoration: 'none' }}>Terms of Service</a>
            <a href="/login" style={{ color: '#475569', fontSize: 13, textDecoration: 'none' }}>Sign In</a>
          </div>
          <p style={{ color: '#334155', fontSize: 13 }}>© 2026 eWork Social. Built for African agencies.</p>
        </div>
      </footer>
    </div>
  );
}
