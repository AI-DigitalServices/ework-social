'use client';

import { Calendar, Users, BarChart3, MessageSquareReply } from 'lucide-react';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { registerAction } from '@/actions/auth.actions';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

// ─── Inner component that can safely use useSearchParams ─────────────────────

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);

  // Invite-flow context — passed from /invite/accept when user doesn't yet exist
  const inviteToken = searchParams.get('invite') || '';
  const inviteEmail = searchParams.get('email') || '';
  const isInviteFlow = !!(inviteToken && inviteEmail);

  const [form, setForm] = useState({
    name: '',
    email: inviteEmail, // pre-fill from invite link
    password: '',
    workspaceName: isInviteFlow ? 'My Workspace' : '', // hidden in invite mode
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Don't allow changing the email when in invite flow
    if (e.target.name === 'email' && isInviteFlow) return;
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Register the account. In invite-flow mode the backend:
      //   1. Creates the user WITHOUT a personal workspace
      //   2. Auto-accepts the invite and creates the WorkspaceMember row
      //   3. Returns the invited workspace as the active workspace
      // This keeps the client cleanly scoped to just the workspace they were invited to.
      const data = await registerAction(
        form.name,
        form.email,
        form.password,
        form.workspaceName || 'My Workspace',
        isInviteFlow ? inviteToken : undefined,
      );
      setAuth(data.user, data.workspace, data.accessToken, data.refreshToken);

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080C14', fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Libre+Baskerville:wght@700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .reg-wrap { display: flex; min-height: 100vh; }
        .reg-left { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 60px; position: relative; overflow: hidden; background-image: linear-gradient(rgba(37,99,235,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.04) 1px, transparent 1px); background-size: 64px 64px; }
        .reg-right { width: 480px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; padding: 40px 48px; background: #070B12; border-left: 1px solid #1A2840; }
        .field-input { width: 100%; padding: 13px 16px; background: #0C1524; border: 1px solid #1A2840; border-radius: 10px; color: #E8F0FA; font-size: 15px; font-family: 'Inter', sans-serif; outline: none; transition: border-color 0.2s, box-shadow 0.2s; }
        .field-input::placeholder { color: #3A506B; }
        .field-input:focus { border-color: #2563EB; box-shadow: 0 0 0 3px rgba(37,99,235,0.15); }
        .field-input:disabled { opacity: 0.6; cursor: not-allowed; }
        .field-label { font-size: 13px; font-weight: 600; color: #8BA0BC; margin-bottom: 7px; display: block; }
        .submit-btn { width: 100%; padding: 15px; background: #2563EB; color: white; border: none; border-radius: 10px; font-size: 15px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-family: 'Inter', sans-serif; }
        .submit-btn:hover:not(:disabled) { background: #1D4ED8; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(37,99,235,0.4); }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        @media (max-width: 768px) {
          .reg-wrap { flex-direction: column; }
          .reg-left { display: none; }
          .reg-right { max-width: 100%; min-height: 100vh; padding: 32px 24px; border-left: none; justify-content: flex-start; padding-top: 48px; }
          .reg-form-inner { width: 100%; max-width: 100%; }
        }
      `}</style>

      <div className="reg-wrap">
        {/* Left panel — branding */}
        <div className="reg-left">
          <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', filter: 'blur(120px)', background: '#2563EB', opacity: 0.1, top: -100, left: -100, pointerEvents: 'none' }} />
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 80, maxWidth: 560, width: '100%' }}>
            <img src="/icon.png" alt="eWork Social" style={{ width: 36, height: 36, borderRadius: 9, objectFit: 'cover' }} />
            <span style={{ fontFamily: 'Libre Baskerville, serif', fontWeight: 700, fontSize: 18, color: '#fff' }}>eWork Social</span>
          </Link>
          <div style={{ maxWidth: 560, width: '100%' }}>
            <h1 style={{ fontFamily: 'Libre Baskerville, serif', fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-1.5px', color: '#F0F6FF', marginBottom: 20 }}>
              {isInviteFlow
                ? <>You've been invited to<br /><span style={{ color: '#3B82F6', fontStyle: 'italic' }}>collaborate</span></>
                : <>Start managing your clients<br /><span style={{ color: '#3B82F6', fontStyle: 'italic' }}>social media</span> today.</>
              }
            </h1>
            <p style={{ color: '#6B8299', fontSize: 16, lineHeight: 1.75, marginBottom: 48 }}>
              {isInviteFlow
                ? "Create your free account to access the workspace you've been invited to. It only takes 30 seconds."
                : 'Join agencies across Africa and beyond. Your 7-day free trial includes all Pro features — no credit card required.'
              }
            </p>
            {[
              { Icon: Calendar, text: 'Schedule posts across Facebook, Instagram and more' },
              { Icon: Users, text: 'CRM and lead pipeline for all your clients' },
              { Icon: BarChart3, text: 'Analytics dashboard with engagement tracking' },
              { Icon: MessageSquareReply, text: 'Auto-responder with keyword triggers' },
            ].map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                <div style={{ width: 38, height: 38, background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.25)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <f.Icon size={18} color="#4D8FE8" />
                </div>
                <span style={{ color: '#8BA0BC', fontSize: 15 }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel — form */}
        <div className="reg-right">
          <div className="reg-form-inner" style={{ width: '100%', maxWidth: 400 }}>
            {/* Mobile logo */}
            <div style={{ display: 'none' }} className="mobile-logo">
              <style>{`@media(max-width:768px){ .mobile-logo { display: flex !important; align-items: center; gap: 10px; margin-bottom: 32px; justify-content: center; } }`}</style>
              <img src="/icon.png" alt="eWork Social" style={{ width: 36, height: 36, borderRadius: 9, objectFit: 'cover' }} />
              <span style={{ fontFamily: 'Libre Baskerville, serif', fontWeight: 700, fontSize: 20, color: '#fff' }}>eWork Social</span>
            </div>

            {/* Invite banner OR social proof */}
            {isInviteFlow ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, padding: '12px 16px', background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.3)', borderRadius: 10 }}>
                <span style={{ fontSize: 20 }}>📩</span>
                <div>
                  <p style={{ color: '#60A5FA', fontSize: 13, fontWeight: 700, margin: 0 }}>You have a workspace invitation</p>
                  <p style={{ color: '#4A6080', fontSize: 12, margin: 0 }}>Create your account to join — it's free</p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, padding: '8px 14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10 }}>
                <div style={{ display: 'flex' }}>
                  {['B', 'A', 'S', 'D'].map((l, i) => (
                    <div key={i} style={{ width: 24, height: 24, borderRadius: '50%', background: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'][i], border: '2px solid #070B12', marginLeft: i > 0 ? -8 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>{l}</div>
                  ))}
                </div>
                <span style={{ color: '#10B981', fontSize: 12, fontWeight: 600 }}>6 agencies joined this week</span>
              </div>
            )}

            <h2 style={{ fontFamily: 'Libre Baskerville, serif', fontSize: 26, fontWeight: 700, color: '#F0F6FF', marginBottom: 8, letterSpacing: '-0.5px' }}>
              {isInviteFlow ? 'Create your account' : 'Start your free trial'}
            </h2>
            <p style={{ color: '#4A6080', fontSize: 14, marginBottom: 32 }}>
              {isInviteFlow ? 'Your email is pre-filled from the invite link' : '7-day free trial · No credit card required · Cancel anytime'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Name */}
              <div>
                <label className="field-label">Your Full Name</label>
                <input type="text" name="name" value={form.name} onChange={handleChange} className="field-input" placeholder="John Doe" required />
              </div>

              {/* Email — locked in invite flow */}
              <div>
                <label className="field-label">
                  Work Email
                  {isInviteFlow && (
                    <span style={{ marginLeft: 8, fontSize: 11, color: '#2563EB', fontWeight: 600, background: 'rgba(37,99,235,0.1)', padding: '2px 8px', borderRadius: 6 }}>
                      🔒 Locked to invite
                    </span>
                  )}
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="field-input"
                  placeholder="you@agency.com"
                  disabled={isInviteFlow}
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="field-label">Password</label>
                <input type="password" name="password" value={form.password} onChange={handleChange} className="field-input" placeholder="Minimum 8 characters" required />
              </div>

              {/* Workspace name — hidden in invite flow (auto-set to "My Workspace") */}
              {!isInviteFlow && (
                <div>
                  <label className="field-label">Agency / Workspace Name</label>
                  <input type="text" name="workspaceName" value={form.workspaceName} onChange={handleChange} className="field-input" placeholder="My Digital Agency" required />
                </div>
              )}

              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5', fontSize: 14, padding: '12px 16px', borderRadius: 10 }}>
                  {error}
                </div>
              )}

              {/* Founding member badge — only on normal signup */}
              {!isInviteFlow && (
                <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>🏆</span>
                  <div>
                    <p style={{ color: '#F59E0B', fontSize: 12, fontWeight: 700, margin: 0 }}>Founding Member Pricing Available</p>
                    <p style={{ color: '#4A6080', fontSize: 11, margin: 0 }}>Locked in at 50% off Agency Pro — forever. Only 44 spots left.</p>
                  </div>
                </div>
              )}

              <button className="submit-btn" onClick={handleSubmit} disabled={loading}>
                {loading
                  ? 'Creating your account...'
                  : isInviteFlow
                  ? 'Create Account & Join Workspace →'
                  : 'Start Free Trial →'
                }
              </button>

              <p style={{ fontSize: 12, color: '#2A3A52', textAlign: 'center', lineHeight: 1.6 }}>
                By signing up you agree to our <a href="/terms" style={{ color: '#4D8FE8', textDecoration: 'none' }}>Terms</a> and <a href="/privacy" style={{ color: '#4D8FE8', textDecoration: 'none' }}>Privacy Policy</a>
              </p>
            </div>

            <div style={{ borderTop: '1px solid #1A2840', marginTop: 28, paddingTop: 24, textAlign: 'center' }}>
              <p style={{ color: '#4A6080', fontSize: 14 }}>
                Already have an account? <Link href="/login" style={{ color: '#3B82F6', fontWeight: 600, textDecoration: 'none' }}>Sign in →</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page wrapper — Suspense required for useSearchParams in Next.js App Router

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#080C14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #2563EB', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <RegisterContent />
    </Suspense>
  );
}
