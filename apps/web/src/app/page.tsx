'use client';
import { useState } from 'react';

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid #1A2840' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '22px 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: 16 }}
      >
        <span style={{ color: '#E8F0FA', fontSize: 16, fontWeight: 600, lineHeight: 1.4 }}>{question}</span>
        <span style={{ color: '#4A6080', fontSize: 20, flexShrink: 0, transition: 'transform 0.2s', transform: open ? 'rotate(45deg)' : 'rotate(0deg)' }}>+</span>
      </button>
      {open && (
        <p style={{ color: '#6B8299', fontSize: 15, lineHeight: 1.8, paddingBottom: 22, marginTop: -8 }}>{answer}</p>
      )}
    </div>
  );
}


import { useEffect } from 'react';

const CURRENCIES = [
  { code: 'USD', symbol: '$', flag: '🇺🇸', label: 'USD', rates: { starter: 5, growth: 12, pro: 29 } },
  { code: 'NGN', symbol: '₦', flag: '🇳🇬', label: 'NGN', rates: { starter: 5000, growth: 12000, pro: 29000 } },
  { code: 'KES', symbol: 'KSh', flag: '🇰🇪', label: 'KES', rates: { starter: 650, growth: 1560, pro: 3770 } },
  { code: 'ZAR', symbol: 'R', flag: '🇿🇦', label: 'ZAR', rates: { starter: 92, growth: 220, pro: 532 } },
  { code: 'GHS', symbol: '₵', flag: '🇬🇭', label: 'GHS', rates: { starter: 78, growth: 187, pro: 452 } },
  { code: 'GBP', symbol: '£', flag: '🇬🇧', label: 'GBP', rates: { starter: 4, growth: 9, pro: 22 } },
  { code: 'EUR', symbol: '€', flag: '🇪🇺', label: 'EUR', rates: { starter: 5, growth: 11, pro: 27 } },
];

function formatPrice(symbol: string, amount: number) {
  if (amount >= 1000) return `${symbol}${amount.toLocaleString()}`;
  return `${symbol}${amount}`;
}

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [currency, setCurrency] = useState(CURRENCIES[0]);
  const [showCurrencyMenu, setShowCurrencyMenu] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);

    // Auto-detect currency from IP geolocation
    fetch('https://ipapi.co/json/')
      .then(r => r.json())
      .then(data => {
        const country = data.country_code;
        if (country === 'NG') setCurrency(CURRENCIES[1]);
        else if (country === 'KE') setCurrency(CURRENCIES[2]);
        else if (country === 'ZA') setCurrency(CURRENCIES[3]);
        else if (country === 'GH') setCurrency(CURRENCIES[4]);
        else if (country === 'GB') setCurrency(CURRENCIES[5]);
        else if (['DE','FR','ES','IT','NL','BE','AT','PT'].includes(country)) setCurrency(CURRENCIES[6]);
      })
      .catch(() => {}); // fallback to USD

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const plans = [
    { name: 'Free Trial', price: '0', isFree: true, period: '7 days', popular: false, features: ['5 social accounts', '50 posts/month', '1 workspace', 'Basic CRM', 'Watermark on posts'], cta: 'Start free' },
    { name: 'Starter', priceKey: 'starter' as const, period: '/month', popular: false, features: ['10 social accounts', '200 posts/month', 'CRM & pipeline', '30-day analytics', 'No watermark'], cta: 'Get Starter' },
    { name: 'Growth', priceKey: 'growth' as const, period: '/month', popular: true, features: ['30 social accounts', '2,000 posts/month', '5 team members', '6-month analytics', 'Bulk scheduling', 'Twitter/X access'], cta: 'Get Growth' },
    { name: 'Agency Pro', priceKey: 'pro' as const, period: '/month', popular: false, features: ['100 social accounts', 'Unlimited posts', '15 team members', '12-month analytics', 'White-label dashboard', 'Full API access'], cta: 'Get Agency Pro' },
  ];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: '#080C14', color: '#fff' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Libre+Baskerville:ital,wght@0,700;1,700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #080C14; }
        ::-webkit-scrollbar-thumb { background: #2563EB; border-radius: 2px; }
        .btn-primary { background: #2563EB; color: white; padding: 14px 28px; border-radius: 8px; font-size: 15px; font-weight: 600; border: none; cursor: pointer; text-decoration: none; display: inline-block; transition: all 0.2s; font-family: 'Inter', sans-serif; }
        .btn-primary:hover { background: #1D4ED8; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(37,99,235,0.35); }
        .btn-outline { background: transparent; color: #CBD5E1; padding: 14px 28px; border-radius: 8px; font-size: 15px; font-weight: 600; border: 1px solid #2A3A52; text-decoration: none; display: inline-block; transition: all 0.2s; font-family: 'Inter', sans-serif; }
        .btn-outline:hover { border-color: #10B981; color: #10B981; background: rgba(16,185,129,0.08); box-shadow: 0 0 0 1px #10B981; }
        .nav-link { color: #8BA0BC; text-decoration: none; font-size: 14px; font-weight: 500; transition: color 0.2s; }
        .nav-link:hover { color: #fff; }
        .feature-card { background: #0C1524; border: 1px solid #1A2840; border-radius: 16px; padding: 32px; transition: all 0.3s; }
        .feature-card:hover { border-color: rgba(37,99,235,0.5); transform: translateY(-4px); box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
        .pricing-card { background: #0C1524; border: 1px solid #1A2840; border-radius: 20px; padding: 36px; transition: all 0.3s; position: relative; }
        .pricing-card.popular { border-color: #2563EB; background: #0A1830; }
        .pricing-card:hover { transform: translateY(-4px); }
        .check-item { display: flex; align-items: center; gap: 10px; color: #8BA0BC; font-size: 14px; margin-bottom: 12px; font-weight: 400; }
        .platform-pill { background: #0C1524; border: 1px solid #1A2840; border-radius: 100px; padding: 10px 18px; font-size: 14px; font-weight: 500; color: #C8D8EC; display: inline-flex; align-items: center; gap: 10px; transition: all 0.2s; }
        .platform-pill:hover { border-color: #2563EB; color: #fff; }
        .ticker-wrap { overflow: hidden; }
        .ticker { display: flex; gap: 0; animation: ticker 28s linear infinite; white-space: nowrap; }
        @keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .section-label { font-size: 11px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: #4D8FE8; margin-bottom: 14px; display: block; }
        .grid-bg { background-image: linear-gradient(rgba(37,99,235,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.04) 1px, transparent 1px); background-size: 64px 64px; }
        .fade-in { opacity: 0; transform: translateY(24px); transition: opacity 0.7s ease, transform 0.7s ease; }
        .fade-in.show { opacity: 1; transform: translateY(0); }
        .currency-btn { background: #0C1524; border: 1px solid #1A2840; color: #C8D8EC; padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s; font-family: 'Inter', sans-serif; position: relative; }
        .currency-btn:hover { border-color: #2563EB; color: #fff; }
        .currency-menu { position: absolute; top: calc(100% + 8px); right: 0; background: #0C1524; border: 1px solid #1A2840; border-radius: 12px; padding: 8px; min-width: 180px; z-index: 200; box-shadow: 0 16px 40px rgba(0,0,0,0.5); }
        .currency-option { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; color: #8BA0BC; transition: all 0.15s; }
        .currency-option:hover { background: #1A2840; color: #fff; }
        .currency-option.active { background: rgba(37,99,235,0.2); color: #7EB3F7; }
        .dash-preview { background: #0C1524; border: 1px solid #1A2840; border-radius: 20px; overflow: hidden; box-shadow: 0 48px 96px rgba(0,0,0,0.6); }
        .africa-badge { background: linear-gradient(135deg, rgba(16,185,129,0.15), rgba(37,99,235,0.15)); border: 1px solid rgba(16,185,129,0.3); color: #34D399; font-size: 13px; font-weight: 600; padding: 10px 20px; border-radius: 12px; display: inline-flex; align-items: center; gap: 8px; }
      `}</style>

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: scrollY > 40 ? 'rgba(8,12,20,0.96)' : 'transparent', backdropFilter: scrollY > 40 ? 'blur(16px)' : 'none', borderBottom: scrollY > 40 ? '1px solid #1A2840' : 'none', transition: 'all 0.3s', padding: '0 48px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 68 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, background: '#2563EB', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⚡</div>
            <span style={{ fontFamily: 'Libre Baskerville, serif', fontWeight: 700, fontSize: 18, color: '#fff', letterSpacing: '-0.5px' }}>eWork Social</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
            <a href="#features" className="nav-link">Features</a>
            <a href="#platforms" className="nav-link">Platforms</a>
            <a href="#pricing" className="nav-link">Pricing</a>
            <a href="/login" className="nav-link">Sign in</a>
            <a href="/register" className="btn-primary" style={{ padding: '10px 22px', fontSize: 14 }}>Get started free</a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="grid-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', paddingTop: 110, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', filter: 'blur(130px)', background: 'radial-gradient(circle, #2563EB, #1E3A8A)', opacity: 0.12, top: -150, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px', width: '100%', textAlign: 'center' }}>

          <div className={`fade-in ${isVisible ? 'show' : ''}`} style={{ transitionDelay: '0.1s', marginBottom: 32 }}>
            <h1 style={{ fontFamily: 'Libre Baskerville, serif', fontSize: 'clamp(48px, 7vw, 86px)', fontWeight: 700, lineHeight: 1.05, letterSpacing: '-2px', color: '#FFFFFF', marginBottom: 0 }}>
              One Dashboard.<br />
              Every Client&apos;s <span style={{ color: '#3B82F6', fontStyle: 'italic' }}>Social Media</span>.
            </h1>
          </div>

          <div className={`fade-in ${isVisible ? 'show' : ''}`} style={{ transitionDelay: '0.25s', marginBottom: 44 }}>
            <p style={{ fontSize: 19, color: '#8BA0BC', lineHeight: 1.75, fontWeight: 400, maxWidth: 600, margin: '0 auto' }}>
              The all-in-one platform for digital agencies. Schedule posts, manage clients,
              track analytics, and automate responses — built to scale.
            </p>
          </div>

          <div className={`fade-in ${isVisible ? 'show' : ''}`} style={{ transitionDelay: '0.35s', display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 18 }}>
            <a href="/register" className="btn-primary" style={{ fontSize: 16, padding: '16px 36px' }}>Start free trial →</a>
            <a href="/login" className="btn-outline" style={{ fontSize: 16, padding: '16px 36px' }}>Sign in to dashboard</a>
          </div>

          <div className={`fade-in ${isVisible ? 'show' : ''}`} style={{ transitionDelay: '0.45s', marginBottom: 72 }}>
            <p style={{ color: '#4A6080', fontSize: 13, fontWeight: 500 }}>No credit card required · 7-day free trial · Cancel anytime</p>
          </div>

          {/* Dashboard Preview */}
          <div className={`fade-in ${isVisible ? 'show' : ''}`} style={{ transitionDelay: '0.55s' }}>
            <div className="dash-preview">
              <div style={{ background: '#070B12', borderBottom: '1px solid #1A2840', padding: '14px 22px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#FF5F57' }} />
                <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#FFBD2E' }} />
                <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#28C840' }} />
                <span style={{ marginLeft: 14, fontSize: 12, color: '#4A6080', fontWeight: 500 }}>app.eworksocial.com/dashboard</span>
              </div>
              <div style={{ padding: 28, display: 'grid', gridTemplateColumns: '190px 1fr', gap: 24, textAlign: 'left' as const }}>
                <div style={{ borderRight: '1px solid #1A2840', paddingRight: 22 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22 }}>
                    <div style={{ width: 26, height: 26, background: '#2563EB', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>⚡</div>
                    <span style={{ fontFamily: 'Libre Baskerville, serif', fontWeight: 700, fontSize: 13 }}>eWork Social</span>
                  </div>
                  {[['📊', 'Dashboard'], ['📅', 'Scheduler'], ['👥', 'CRM'], ['📈', 'Analytics'], ['🤖', 'Auto-Responder']].map(([icon, label], i) => (
                    <div key={label} style={{ padding: '9px 12px', borderRadius: 8, marginBottom: 3, fontSize: 13, background: i === 0 ? 'rgba(37,99,235,0.18)' : 'transparent', color: i === 0 ? '#7EB3F7' : '#4A6080', display: 'flex', alignItems: 'center', gap: 8, fontWeight: i === 0 ? 600 : 400 }}>
                      {icon} {label}
                    </div>
                  ))}
                </div>
                <div>
                  <p style={{ fontSize: 17, fontWeight: 700, marginBottom: 18, letterSpacing: '-0.3px' }}>Welcome back! 👋</p>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                    {[['24', 'Scheduled Posts', '#3B82F6'], ['12', 'Active Clients', '#10B981'], ['8', 'Open Leads', '#F59E0B'], ['6', 'Social Accounts', '#8B5CF6']].map(([n, l, c]) => (
                      <div key={l} style={{ background: '#070B12', border: '1px solid #1A2840', borderRadius: 10, padding: '12px 14px', flex: 1 }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: c, letterSpacing: '-0.5px' }}>{n}</div>
                        <div style={{ fontSize: 11, color: '#4A6080', marginTop: 3, fontWeight: 500 }}>{l}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: '#070B12', borderRadius: 10, padding: 16, border: '1px solid #1A2840' }}>
                    <p style={{ fontSize: 11, color: '#4A6080', marginBottom: 12, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' as const }}>Upcoming Posts</p>
                    {[
                      { platform: '📘 Facebook', time: 'Today 2:00 PM', text: 'New product launch announcement...' },
                      { platform: '📸 Instagram', time: 'Today 5:00 PM', text: 'Behind the scenes at our office...' },
                      { platform: '💼 LinkedIn', time: 'Tomorrow 9:00 AM', text: 'Industry insights for Q2 2026...' },
                    ].map((post, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: i < 2 ? '1px solid #1A2840' : 'none' }}>
                        <span style={{ fontSize: 12, color: '#8BA0BC', fontWeight: 500, minWidth: 110 }}>{post.platform}</span>
                        <span style={{ fontSize: 12, color: '#4A6080', flex: 1 }}>{post.text}</span>
                        <span style={{ fontSize: 11, color: '#3B82F6', background: 'rgba(37,99,235,0.15)', padding: '3px 10px', borderRadius: 5, fontWeight: 600, whiteSpace: 'nowrap' as const }}>{post.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TICKER */}
      <div style={{ borderTop: '1px solid #1A2840', borderBottom: '1px solid #1A2840', padding: '22px 0', overflow: 'hidden', background: '#070B12' }}>
        <div className="ticker-wrap">
          <div className="ticker">
            {[
              { icon: '📅', label: 'Smart Scheduling', color: '#3B82F6' },
              { icon: '👥', label: 'CRM Pipeline', color: '#10B981' },
              { icon: '📊', label: 'Analytics Dashboard', color: '#F59E0B' },
              { icon: '🤖', label: 'Auto-Responder', color: '#A78BFA' },
              { icon: '💳', label: 'Paystack Billing', color: '#F472B6' },
              { icon: '🌍', label: 'Global-Ready', color: '#34D399' },
              { icon: '⚡', label: 'BullMQ Queue', color: '#FB923C' },
              { icon: '🔒', label: 'Multi-Tenant Security', color: '#818CF8' },
              { icon: '📅', label: 'Smart Scheduling', color: '#3B82F6' },
              { icon: '👥', label: 'CRM Pipeline', color: '#10B981' },
              { icon: '📊', label: 'Analytics Dashboard', color: '#F59E0B' },
              { icon: '🤖', label: 'Auto-Responder', color: '#A78BFA' },
              { icon: '💳', label: 'Paystack Billing', color: '#F472B6' },
              { icon: '🌍', label: 'Global-Ready', color: '#34D399' },
              { icon: '⚡', label: 'BullMQ Queue', color: '#FB923C' },
              { icon: '🔒', label: 'Multi-Tenant Security', color: '#818CF8' },
            ].map((item, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, padding: '0 30px', fontSize: 15, fontWeight: 600, color: item.color }}>
                <span style={{ fontSize: 19 }}>{item.icon}</span>
                {item.label}
                <span style={{ color: '#1E2D42', marginLeft: 6, fontSize: 12 }}>◆</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <section id="features" style={{ padding: '110px 48px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 72 }}>
          <span className="section-label">Features</span>
          <h2 style={{ fontFamily: 'Libre Baskerville, serif', fontSize: 'clamp(32px, 5vw, 54px)', fontWeight: 700, letterSpacing: '-1.5px', lineHeight: 1.1, color: '#F0F6FF' }}>
            Everything your agency needs<br />to scale social media
          </h2>
          <p style={{ color: '#6B8299', fontSize: 17, marginTop: 18, fontWeight: 400 }}>Built for agencies managing multiple clients at once</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
          {[
            { icon: '📅', title: 'Smart Scheduler', desc: 'Schedule posts across Facebook, Instagram, LinkedIn and more. Bulk upload, calendar view, and intelligent queue management powered by BullMQ.', color: '#3B82F6' },
            { icon: '👥', title: 'CRM & Lead Pipeline', desc: 'Full client relationship management with pipeline stages: Lead → Contacted → Proposal → Active. Never miss a follow-up.', color: '#10B981' },
            { icon: '📊', title: 'Analytics Dashboard', desc: 'Track engagement, reach, clicks, and follower growth across all platforms. Up to 12 months of history on Agency Pro.', color: '#F59E0B' },
            { icon: '🤖', title: 'Auto-Responder', desc: 'Auto-reply to comments and DMs with keyword triggers and template responses. Automatically update lead stages in CRM.', color: '#8B5CF6' },
            { icon: '🏢', title: 'Multi-Tenant Workspaces', desc: 'Each client workspace is fully isolated with separate branding, accounts, and permissions. Scale without chaos.', color: '#EC4899' },
            { icon: '🏷️', title: 'White-Label Ready', desc: 'Agency Pro users get a fully white-labeled dashboard with custom domain support. Resell it as your own product.', color: '#14B8A6' },
          ].map((f, i) => (
            <div key={i} className="feature-card">
              <div style={{ width: 52, height: 52, background: `${f.color}18`, border: `1px solid ${f.color}30`, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 22 }}>{f.icon}</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: '#E8F0FA', letterSpacing: '-0.3px' }}>{f.title}</h3>
              <p style={{ color: '#6B8299', fontSize: 15, lineHeight: 1.75, fontWeight: 400 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PLATFORMS */}
      <section id="platforms" style={{ padding: '90px 48px', background: '#070B12', borderTop: '1px solid #1A2840', borderBottom: '1px solid #1A2840' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          <span className="section-label">Platforms</span>
          <h2 style={{ fontFamily: 'Libre Baskerville, serif', fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 700, letterSpacing: '-1px', marginBottom: 16, color: '#F0F6FF' }}>Post everywhere at once</h2>
          <p style={{ color: '#6B8299', fontSize: 16, marginBottom: 52, fontWeight: 400 }}>Connect all your social accounts and manage them from one place</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center' }}>
            {[['📘', 'Facebook', 'Live', '#10B981', '#064E3B'], ['📸', 'Instagram', 'Live', '#10B981', '#064E3B'], ['💼', 'LinkedIn', 'Coming Soon', '#6B8299', '#1A2840'], ['𝕏', 'Twitter / X', 'Growth+', '#3B82F6', '#1E3A5F'], ['🎵', 'TikTok', 'Coming Soon', '#6B8299', '#1A2840'], ['▶️', 'YouTube', 'Coming Soon', '#6B8299', '#1A2840'], ['📌', 'Pinterest', 'Coming Soon', '#6B8299', '#1A2840'], ['💬', 'WhatsApp', 'Coming Soon', '#6B8299', '#1A2840']].map(([icon, name, status, textColor, bgColor], i) => (
              <div key={i} className="platform-pill">
                <span style={{ fontSize: 18 }}>{icon}</span>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{name}</span>
                <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 5, background: bgColor, color: textColor, fontWeight: 700 }}>{status}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ padding: '110px 48px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <span className="section-label">Pricing</span>
          <h2 style={{ fontFamily: 'Libre Baskerville, serif', fontSize: 'clamp(32px, 5vw, 54px)', fontWeight: 700, letterSpacing: '-1.5px', color: '#F0F6FF' }}>
            Simple, transparent pricing
          </h2>
          <p style={{ color: '#6B8299', fontSize: 17, marginTop: 14, fontWeight: 400, marginBottom: 32 }}>Start free. Scale as you grow. No surprises.</p>

          {/* Currency Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, position: 'relative' }}>
            <span style={{ color: '#6B8299', fontSize: 13, fontWeight: 500 }}>Show prices in:</span>
            <div style={{ position: 'relative' }}>
              <button className="currency-btn" onClick={() => setShowCurrencyMenu(!showCurrencyMenu)}>
                <span>{currency.flag}</span>
                <span>{currency.code}</span>
                <span style={{ fontSize: 10, marginLeft: 2 }}>▾</span>
              </button>
              {showCurrencyMenu && (
                <div className="currency-menu">
                  {CURRENCIES.map((c) => (
                    <div key={c.code} className={`currency-option ${currency.code === c.code ? 'active' : ''}`} onClick={() => { setCurrency(c); setShowCurrencyMenu(false); }}>
                      <span style={{ fontSize: 16 }}>{c.flag}</span>
                      <span style={{ fontWeight: 600 }}>{c.code}</span>
                      <span style={{ color: '#4A6080', marginLeft: 'auto' }}>{c.symbol}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(255px, 1fr))', gap: 24 }}>
          {plans.map((plan, i) => {
            const displayPrice = plan.isFree
              ? `${currency.symbol}0`
              : formatPrice(currency.symbol, currency.rates[plan.priceKey!]);
            return (
              <div key={i} className={`pricing-card ${plan.popular ? 'popular' : ''}`}>
                {plan.popular && <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: '#2563EB', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 16px', borderRadius: 100, whiteSpace: 'nowrap' as const, letterSpacing: '0.5px' }}>MOST POPULAR</div>}
                <p style={{ fontSize: 13, color: '#6B8299', fontWeight: 700, marginBottom: 10, letterSpacing: '1px', textTransform: 'uppercase' as const }}>{plan.name}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 38, fontWeight: 800, color: '#F0F6FF', letterSpacing: '-1.5px', fontFamily: 'Libre Baskerville, serif' }}>{displayPrice}</span>
                  <span style={{ color: '#4A6080', fontSize: 14, fontWeight: 500 }}>{plan.period}</span>
                </div>
                <p style={{ fontSize: 11, color: '#4A6080', marginBottom: 4, fontWeight: 500 }}>≈ billed in {currency.code}</p>
                <div style={{ borderTop: '1px solid #1A2840', margin: '20px 0' }} />
                {plan.features.map((f, j) => (
                  <div key={j} className="check-item">
                    <div style={{ width: 19, height: 19, background: 'rgba(37,99,235,0.2)', border: '1px solid rgba(37,99,235,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6', fontSize: 10, flexShrink: 0, fontWeight: 700 }}>✓</div>
                    <span style={{ color: '#8BA0BC' }}>{f}</span>
                  </div>
                ))}
                <a href="/register" className={plan.popular ? 'btn-primary' : 'btn-outline'} style={{ display: 'block', textAlign: 'center' as const, marginTop: 28, width: '100%', padding: '14px' }}>{plan.cta}</a>
              </div>
            );
          })}
        </div>
        <p style={{ textAlign: 'center', color: '#4A6080', fontSize: 12, marginTop: 24, fontWeight: 500 }}>
          * Prices shown are approximate conversions. Final billing processed in NGN via Paystack.
        </p>
      </section>

      {/* AFRICA FIRST SECTION */}
      <section style={{ padding: '80px 48px', background: '#070B12', borderTop: '1px solid #1A2840' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
            <div>
              <div className="africa-badge" style={{ marginBottom: 24, display: 'inline-flex' }}>
                🌍 Africa-First, Globally Ready
              </div>
              <h2 style={{ fontFamily: 'Libre Baskerville, serif', fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700, letterSpacing: '-1px', color: '#F0F6FF', marginBottom: 20, lineHeight: 1.2 }}>
                Built for where<br />agencies are growing
              </h2>
              <p style={{ color: '#6B8299', fontSize: 16, lineHeight: 1.8, fontWeight: 400 }}>
                eWork Social was built with African digital agencies in mind — with Paystack billing, local currency support, WhatsApp notifications, and timezone-aware scheduling. But the platform works everywhere.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { icon: '💳', label: 'Paystack Billing', desc: 'NGN, KES, ZAR, GHS', color: '#10B981' },
                { icon: '🕐', label: 'Timezone Aware', desc: 'Auto-detects your region', color: '#3B82F6' },
                { icon: '💬', label: 'WhatsApp Alerts', desc: 'Notifications & reminders', color: '#F59E0B' },
                { icon: '🌐', label: 'Works Globally', desc: 'No geographic limits', color: '#8B5CF6' },
              ].map((item, i) => (
                <div key={i} style={{ background: '#0C1524', border: '1px solid #1A2840', borderRadius: 14, padding: '20px 18px' }}>
                  <div style={{ fontSize: 24, marginBottom: 10 }}>{item.icon}</div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#E8F0FA', marginBottom: 4 }}>{item.label}</p>
                  <p style={{ fontSize: 12, color: '#4A6080', fontWeight: 400 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>


      {/* TESTIMONIALS */}
      <section style={{ padding: '100px 48px', background: '#070B12', borderTop: '1px solid #1A2840' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <span className="section-label">Early Feedback</span>
            <h2 style={{ fontFamily: 'Libre Baskerville, serif', fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700, letterSpacing: '-1px', color: '#F0F6FF', marginBottom: 16 }}>
              What agencies are saying
            </h2>
            <p style={{ color: '#6B8299', fontSize: 16, maxWidth: 520, margin: '0 auto' }}>
              Real feedback from our beta users and early community members.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {[
              {
                quote: "This is exactly what agencies need. The CRM + scheduler combo in one tool is a game changer for managing multiple clients.",
                name: "Agency Owner",
                title: "Digital Marketing Agency, Lagos",
                initials: "AO",
                color: "#2563EB",
              },
              {
                quote: "Finally a tool built with African agencies in mind. The Naira pricing alone makes it a no-brainer compared to foreign tools.",
                name: "Social Media Manager",
                title: "Creative Agency, Abuja",
                initials: "SM",
                color: "#7C3AED",
              },
              {
                quote: "The automated pipeline follow-up emails save me hours every week. I set it once and it keeps my leads warm automatically.",
                name: "Freelance Strategist",
                title: "Digital Consultant, Accra",
                initials: "FS",
                color: "#059669",
              },
            ].map((t, i) => (
              <div key={i} style={{ background: '#0C1524', border: '1px solid #1A2840', borderRadius: 20, padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[...Array(5)].map((_, j) => (
                    <span key={j} style={{ color: '#F59E0B', fontSize: 16 }}>★</span>
                  ))}
                </div>
                <p style={{ color: '#8FA8C0', fontSize: 15, lineHeight: 1.75, fontStyle: 'italic', flex: 1 }}>"{t.quote}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 42, height: 42, background: t.color, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{t.initials}</div>
                  <div>
                    <p style={{ color: '#E8F0FA', fontWeight: 600, fontSize: 14 }}>{t.name}</p>
                    <p style={{ color: '#4A6080', fontSize: 12 }}>{t.title}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p style={{ textAlign: 'center', color: '#2A3A52', fontSize: 13, marginTop: 40 }}>
            🔒 Beta users — names anonymized for privacy
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: '100px 48px', borderTop: '1px solid #1A2840' }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <span className="section-label">FAQ</span>
            <h2 style={{ fontFamily: 'Libre Baskerville, serif', fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700, letterSpacing: '-1px', color: '#F0F6FF', marginBottom: 16 }}>
              Frequently asked questions
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[
              {
                q: "What social media platforms does eWork Social support?",
                a: "Currently LinkedIn, Facebook and Instagram are fully supported. Twitter/X, TikTok, YouTube and WhatsApp are coming in Phase 2. We're expanding fast based on user demand.",
              },
              {
                q: "Can I manage multiple clients from one account?",
                a: "Yes! eWork Social is built specifically for agencies managing multiple clients. Each workspace supports multiple social accounts, clients, and team members depending on your plan.",
              },
              {
                q: "How does the 7-day free trial work?",
                a: "You get full access to all Pro features for 7 days — no credit card required. After 7 days, you choose a plan or stay on the free tier with limited features.",
              },
              {
                q: "Can I invite my team members?",
                a: "Absolutely! You can invite team members with specific roles (Admin, Editor, Viewer). They'll receive an email invite and get access to your workspace dashboard.",
              },
              {
                q: "What payment methods are accepted?",
                a: "We use Paystack for payments, supporting cards, bank transfers and USSD across Nigeria, Ghana, Kenya, South Africa and more. Pricing is displayed in your local currency.",
              },
              {
                q: "What is the CRM pipeline automation?",
                a: "When a lead moves to a new stage in your pipeline (e.g. Lead → Proposal), eWork Social automatically sends a personalized email to that contact. You write the template once, we handle the rest.",
              },
              {
                q: "Can I cancel my subscription anytime?",
                a: "Yes, you can cancel at any time from your Settings page. You'll retain access until the end of your billing period with no hidden fees.",
              },
              {
                q: "Is my data secure?",
                a: "Yes. We use industry-standard encryption, secure JWT authentication, and your data is stored on enterprise-grade infrastructure. You can delete your account and all data at any time.",
              },
            ].map((item, i) => (
              <FaqItem key={i} question={item.q} answer={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '90px 48px', borderTop: '1px solid #1A2840' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ width: 68, height: 68, background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, margin: '0 auto 28px', boxShadow: '0 12px 32px rgba(37,99,235,0.4)' }}>⚡</div>
          <h2 style={{ fontFamily: 'Libre Baskerville, serif', fontSize: 'clamp(32px, 5vw, 50px)', fontWeight: 700, letterSpacing: '-1.5px', marginBottom: 18, color: '#F0F6FF' }}>
            Ready to scale your agency?
          </h2>
          <p style={{ color: '#6B8299', fontSize: 17, marginBottom: 44, lineHeight: 1.75, fontWeight: 400 }}>
            Join agencies across Africa and beyond managing their clients&apos; social media with eWork Social. Start your free 7-day trial — no credit card needed.
          </p>
          <a href="/register" className="btn-primary" style={{ fontSize: 16, padding: '17px 44px' }}>Get started free →</a>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid #1A2840', padding: '44px 48px', background: '#070B12' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, background: '#2563EB', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>⚡</div>
            <span style={{ fontFamily: 'Libre Baskerville, serif', fontWeight: 700, fontSize: 17, letterSpacing: '-0.3px' }}>eWork Social</span>
          </div>
          <div style={{ display: 'flex', gap: 28 }}>
            <a href="/privacy" style={{ color: '#4A6080', fontSize: 13, textDecoration: 'none', fontWeight: 500 }}>Privacy Policy</a>
            <a href="/terms" style={{ color: '#4A6080', fontSize: 13, textDecoration: 'none', fontWeight: 500 }}>Terms of Service</a>
            <a href="/login" style={{ color: '#4A6080', fontSize: 13, textDecoration: 'none', fontWeight: 500 }}>Sign In</a>
          </div>
          <p style={{ color: '#2A3A52', fontSize: 13, fontWeight: 500 }}>© 2026 eWork Social · Built for agencies, everywhere.</p>
        </div>
      </footer>
    </div>
  );
}
