import { Fragment } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Plans & Pricing — eWork Social',
  description:
    'Compare eWork Social plans — from Free to Agency Pro — and explore Enterprise: custom software or a fully managed, done-for-you social media service.',
};

const TIERS = ['Free', 'Starter', 'Growth', 'Agency Pro', 'Enterprise'];
const PRICES = ['$0', '$5/mo', '$12/mo', '$29/mo', 'Custom'];

// ✓ = included, — = not included. Strings render as-is.
const MATRIX: { group: string; rows: { label: string; vals: string[] }[] }[] = [
  {
    group: 'Core',
    rows: [
      { label: 'Social accounts', vals: ['5', '10', '30', '100', 'Custom'] },
      { label: 'Posts / month', vals: ['50', '200', '2,000', 'Unlimited', 'Unlimited'] },
      { label: 'Team members', vals: ['1', '1', '5', '15', 'Unlimited'] },
      { label: 'Clients (CRM)', vals: ['5', '25', 'Unlimited', 'Unlimited', 'Unlimited'] },
      { label: 'Analytics history', vals: ['7 days', '30 days', '180 days', '365 days', 'Custom'] },
    ],
  },
  {
    group: 'Publishing',
    rows: [
      { label: 'Platforms', vals: ['FB, IG', 'FB, IG, LI', '+ X, TikTok', 'All 8', 'All 8'] },
      { label: 'Bulk scheduling', vals: ['—', '—', '✓', '✓', '✓'] },
      { label: 'Per-platform editor', vals: ['—', '—', '✓', '✓', '✓'] },
      { label: 'No watermark', vals: ['—', '✓', '✓', '✓', '✓'] },
    ],
  },
  {
    group: 'AI OS',
    rows: [
      { label: 'AI captions / month', vals: ['3', '20', '100', 'Unlimited', 'Unlimited'] },
      { label: 'AI hashtags & rewrite', vals: ['—', '—', '✓', '✓', '✓'] },
      { label: 'AI CRM insights', vals: ['—', '—', '✓', '✓', '✓'] },
      { label: 'AI Agent (manual runs)', vals: ['—', '—', 'Capped', 'Unlimited', 'Unlimited'] },
      { label: 'Autopilot (scheduled auto-runs)', vals: ['—', '—', '—', '✓', '✓'] },
      { label: 'AI image generation / month', vals: ['—', '—', '50', '500', 'Custom'] },
      { label: 'Bring your own AI key (BYOK)', vals: ['—', '—', '✓', '✓', '✓'] },
    ],
  },
  {
    group: 'Engagement & Automation',
    rows: [
      { label: 'Engagement Hub inbox', vals: ['✓', '✓', '✓', '✓', '✓'] },
      { label: 'Auto-responder', vals: ['—', 'Comments', 'Comments + DMs', 'Full', 'Full'] },
      { label: 'Outbound webhooks (Zapier/Make/n8n)', vals: ['—', '—', '✓', '✓', '✓'] },
      { label: 'API access', vals: ['—', '—', '—', '✓', '✓'] },
    ],
  },
  {
    group: 'Agency & Enterprise',
    rows: [
      { label: 'Client approval portal', vals: ['—', '—', '✓', '✓', '✓'] },
      { label: 'White-label dashboard', vals: ['—', '—', '—', '✓', '✓'] },
      { label: 'SSO & dedicated support', vals: ['—', '—', '—', '—', '✓'] },
      { label: 'Custom limits & features', vals: ['—', '—', '—', 'Some', 'Fully custom'] },
      { label: 'Managed service (done-for-you)', vals: ['—', '—', '—', '—', '✓'] },
    ],
  },
];

function Cell({ v }: { v: string }) {
  if (v === '✓') return <span style={{ color: '#10B981', fontWeight: 700 }}>✓</span>;
  if (v === '—') return <span style={{ color: '#3A4A62' }}>—</span>;
  return <span style={{ color: '#C8D8EC', fontSize: 13 }}>{v}</span>;
}

export default function PricingPage() {
  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: '#080C14', color: '#fff', minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Libre+Baskerville:ital,wght@0,700;1,700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        .pbtn-primary { background: #2563EB; color: #fff; padding: 14px 28px; border-radius: 8px; font-size: 15px; font-weight: 600; border: none; cursor: pointer; text-decoration: none; display: inline-block; transition: all 0.2s; }
        .pbtn-primary:hover { background: #1D4ED8; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(37,99,235,0.35); }
        .pbtn-outline { background: transparent; color: #CBD5E1; padding: 14px 28px; border-radius: 8px; font-size: 15px; font-weight: 600; border: 1px solid #2A3A52; text-decoration: none; display: inline-block; transition: all 0.2s; }
        .pbtn-outline:hover { border-color: #10B981; color: #10B981; background: rgba(16,185,129,0.08); }
        .ecard { background: #0C1524; border: 1px solid #1A2840; border-radius: 20px; padding: 36px; transition: all 0.3s; }
        .ecard:hover { transform: translateY(-4px); border-color: rgba(37,99,235,0.5); }
        .cmp-table { width: 100%; border-collapse: collapse; min-width: 820px; }
        .cmp-table th, .cmp-table td { padding: 14px 16px; text-align: center; border-bottom: 1px solid #12203A; }
        .cmp-table th:first-child, .cmp-table td:first-child { text-align: left; color: #8BA0BC; font-weight: 500; }
        .cmp-table thead th { position: sticky; top: 0; background: #0A1220; }
        .cmp-pro { background: rgba(37,99,235,0.06); }
        .wrap { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
      `}</style>

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid #1A2840', padding: '18px 0' }}>
        <div className="wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ fontFamily: 'Libre Baskerville, serif', fontWeight: 700, fontSize: 20, color: '#F0F6FF', textDecoration: 'none' }}>
            eWork Social
          </Link>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <Link href="/" style={{ color: '#8BA0BC', fontSize: 14, textDecoration: 'none' }}>Home</Link>
            <Link href="/login" style={{ color: '#8BA0BC', fontSize: 14, textDecoration: 'none' }}>Log in</Link>
            <Link href="/register" className="pbtn-primary" style={{ padding: '10px 20px', fontSize: 14 }}>Start free</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: '80px 0 40px', textAlign: 'center' }}>
        <div className="wrap">
          <h1 style={{ fontFamily: 'Libre Baskerville, serif', fontSize: 'clamp(34px, 5vw, 56px)', fontWeight: 700, letterSpacing: '-1.5px', color: '#F0F6FF' }}>
            Plans built to scale with you
          </h1>
          <p style={{ color: '#6B8299', fontSize: 18, marginTop: 16, maxWidth: 620, margin: '16px auto 0' }}>
            Start free, grow into the full AI Operating System, and when you need custom scale or a done-for-you team — talk to us about Enterprise.
          </p>
        </div>
      </section>

      {/* Comparison table */}
      <section style={{ padding: '20px 0 80px' }}>
        <div className="wrap" style={{ overflowX: 'auto' }}>
          <table className="cmp-table">
            <thead>
              <tr>
                <th></th>
                {TIERS.map((t, i) => (
                  <th key={t} className={i === 3 ? 'cmp-pro' : ''} style={{ color: '#F0F6FF' }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{t}</div>
                    <div style={{ fontSize: 13, color: i === 3 ? '#3B82F6' : '#6B8299', fontWeight: 600, marginTop: 4 }}>{PRICES[i]}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATRIX.map((section) => (
                <Fragment key={section.group}>
                  <tr>
                    <td colSpan={6} style={{ paddingTop: 26, color: '#4A6080', fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', borderBottom: 'none' }}>
                      {section.group}
                    </td>
                  </tr>
                  {section.rows.map((row) => (
                    <tr key={row.label}>
                      <td>{row.label}</td>
                      {row.vals.map((v, i) => (
                        <td key={i} className={i === 3 ? 'cmp-pro' : ''}><Cell v={v} /></td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
              <tr>
                <td></td>
                {TIERS.map((t, i) => (
                  <td key={t} className={i === 3 ? 'cmp-pro' : ''} style={{ paddingTop: 22 }}>
                    {i === 4 ? (
                      <a href="#enterprise" className="pbtn-outline" style={{ padding: '10px 16px', fontSize: 13 }}>Talk to sales</a>
                    ) : (
                      <Link href="/register" className={i === 3 ? 'pbtn-primary' : 'pbtn-outline'} style={{ padding: '10px 16px', fontSize: 13 }}>
                        {i === 0 ? 'Start free' : 'Choose'}
                      </Link>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
          <p style={{ color: '#4A6080', fontSize: 12, marginTop: 20, textAlign: 'center' }}>
            Prices shown in USD; billed in your local currency at checkout. Autopilot and heavy AI usage live on Agency Pro & Enterprise.
          </p>
        </div>
      </section>

      {/* Enterprise — two paths */}
      <section id="enterprise" style={{ padding: '80px 0', background: '#070B12', borderTop: '1px solid #1A2840', borderBottom: '1px solid #1A2840' }}>
        <div className="wrap">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span style={{ color: '#3B82F6', fontSize: 13, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>Enterprise</span>
            <h2 style={{ fontFamily: 'Libre Baskerville, serif', fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, color: '#F0F6FF', marginTop: 12, letterSpacing: '-1px' }}>
              For brands and agencies at scale
            </h2>
            <p style={{ color: '#6B8299', fontSize: 17, marginTop: 14, maxWidth: 640, margin: '14px auto 0' }}>
              Two ways to work with eWork Social — run the platform yourself with custom power, or hand it to our team entirely.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
            {/* Run it yourself */}
            <div className="ecard">
              <p style={{ fontSize: 12, color: '#3B82F6', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Run it yourself</p>
              <h3 style={{ fontFamily: 'Libre Baskerville, serif', fontSize: 26, fontWeight: 700, color: '#F0F6FF', margin: '10px 0 14px' }}>
                Enterprise software
              </h3>
              <p style={{ color: '#8BA0BC', fontSize: 15, lineHeight: 1.6, marginBottom: 20 }}>
                The full AI Operating System with the guardrails big teams need — you own the account, your team drives it.
              </p>
              {['Custom account, post & AI limits', 'Unlimited team seats & workspaces', 'White-label dashboard for your brand', 'SSO and dedicated onboarding + support', 'Full API access & custom integrations', 'Priority SLA'].map((f) => (
                <div key={f} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ color: '#10B981', fontWeight: 700 }}>✓</span>
                  <span style={{ color: '#C8D8EC', fontSize: 14 }}>{f}</span>
                </div>
              ))}
              <a href="mailto:hello@eworksocial.com?subject=Enterprise%20software%20enquiry" className="pbtn-primary" style={{ marginTop: 22, width: '100%', textAlign: 'center' }}>
                Talk to sales
              </a>
            </div>

            {/* We run it for you */}
            <div className="ecard" style={{ borderColor: 'rgba(16,185,129,0.35)' }}>
              <p style={{ fontSize: 12, color: '#10B981', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>We run it for you</p>
              <h3 style={{ fontFamily: 'Libre Baskerville, serif', fontSize: 26, fontWeight: 700, color: '#F0F6FF', margin: '10px 0 14px' }}>
                Managed service
              </h3>
              <p style={{ color: '#8BA0BC', fontSize: 15, lineHeight: 1.6, marginBottom: 20 }}>
                No time to manage it? Our team plans, creates, and runs your social media on eWork Social — you approve, we handle the rest.
              </p>
              {['Dedicated strategist + content team', 'Done-for-you posting across all platforms', 'AI-assisted content, tuned to your brand', 'Monthly reporting & growth reviews', 'Community management & engagement', 'Flexible monthly retainer'].map((f) => (
                <div key={f} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ color: '#10B981', fontWeight: 700 }}>✓</span>
                  <span style={{ color: '#C8D8EC', fontSize: 14 }}>{f}</span>
                </div>
              ))}
              <a href="mailto:hello@eworksocial.com?subject=Managed%20service%20consultation" className="pbtn-outline" style={{ marginTop: 22, width: '100%', textAlign: 'center' }}>
                Book a consultation
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '40px 0', textAlign: 'center' }}>
        <div className="wrap">
          <p style={{ color: '#4A6080', fontSize: 13 }}>
            Questions? <a href="mailto:hello@eworksocial.com" style={{ color: '#8BA0BC' }}>hello@eworksocial.com</a> · <Link href="/" style={{ color: '#8BA0BC' }}>Back to home</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
