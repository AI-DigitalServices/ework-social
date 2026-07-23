'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { loginAction } from '@/actions/auth.actions';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.eworksocial.com';

// Google "G" SVG icon
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.859-3.048.859-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

export default function LoginPage() {
  const router  = useRouter();
  const { user, workspace, token, refreshToken: storedRefresh, setAuth, logout } = useAuthStore();

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [resuming, setResuming] = useState(false);

  // If already fully authenticated, go straight to dashboard
  useEffect(() => {
    if (token && user) router.replace('/dashboard');
  }, [token, user, router]);

  const hasReturningUser = !!(user && !token); // user in store but token expired/cleared

  const handleResume = async () => {
    if (!storedRefresh) { setShowEmailForm(true); return; }
    setResuming(true);
    try {
      const res = await fetch(`${API}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: storedRefresh }),
      });
      if (res.ok) {
        const data = await res.json();
        setAuth(user!, workspace!, data.accessToken, data.refreshToken);
        router.replace('/dashboard');
      } else {
        logout();
        setShowEmailForm(true);
      }
    } catch {
      setShowEmailForm(true);
    } finally {
      setResuming(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await loginAction(email, password);
      setAuth(data.user, data.workspace, data.accessToken, data.refreshToken);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API}/auth/google`;
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080C14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Libre+Baskerville:wght@700&display=swap');
        * { box-sizing: border-box; }
        .field-input { width: 100%; padding: 13px 16px; background: #0C1524; border: 1px solid #1A2840; border-radius: 10px; color: #E8F0FA; font-size: 15px; font-family: 'Inter', sans-serif; outline: none; transition: border-color 0.2s, box-shadow 0.2s; }
        .field-input::placeholder { color: #3A506B; }
        .field-input:focus { border-color: #2563EB; box-shadow: 0 0 0 3px rgba(37,99,235,0.15); }
        .social-btn { width: 100%; padding: 13px 16px; background: #0C1524; border: 1px solid #1A2840; border-radius: 10px; color: #E8F0FA; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: 'Inter', sans-serif; display: flex; align-items: center; justify-content: center; gap: 10px; }
        .social-btn:hover { background: #111E30; border-color: #2A3D55; transform: translateY(-1px); }
        .submit-btn { width: 100%; padding: 15px; background: #2563EB; color: white; border: none; border-radius: 10px; font-size: 15px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-family: 'Inter', sans-serif; }
        .submit-btn:hover:not(:disabled) { background: #1D4ED8; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(37,99,235,0.4); }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .divider { display: flex; align-items: center; gap: 12px; margin: 20px 0; }
        .divider-line { flex: 1; height: 1px; background: #1A2840; }
        .divider-text { color: #2A3A52; font-size: 12px; font-weight: 500; white-space: nowrap; }
      `}</style>

      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <img src="/icon.png" alt="eWork Social" style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover' }} />
            <span style={{ fontFamily: 'Libre Baskerville, serif', fontWeight: 700, fontSize: 20, color: '#fff' }}>eWork Social</span>
          </Link>
        </div>

        {/* Card */}
        <div style={{ background: '#070B12', border: '1px solid #1A2840', borderRadius: 20, padding: '36px 32px' }}>

          {/* ── Welcome back (returning user with expired token) ── */}
          {hasReturningUser && !showEmailForm ? (
            <>
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#fff', margin: '0 auto 16px' }}>
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <h2 style={{ fontFamily: 'Libre Baskerville, serif', fontSize: 22, fontWeight: 700, color: '#F0F6FF', marginBottom: 6 }}>
                  Welcome back 👋
                </h2>
                <p style={{ color: '#4A6080', fontSize: 14 }}>{user?.name} · {user?.email}</p>
              </div>

              <button
                onClick={handleResume}
                disabled={resuming}
                className="submit-btn"
                style={{ marginBottom: 12 }}
              >
                {resuming ? 'Signing you in…' : `Continue as ${user?.name?.split(' ')[0]} →`}
              </button>

              <button
                onClick={() => { logout(); setShowEmailForm(true); }}
                style={{ width: '100%', padding: '11px', background: 'transparent', border: '1px solid #1A2840', borderRadius: 10, color: '#4A6080', fontSize: 13, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
              >
                Not you? Sign in with another account
              </button>
            </>
          ) : (
            <>
              <h2 style={{ fontFamily: 'Libre Baskerville, serif', fontSize: 24, fontWeight: 700, color: '#F0F6FF', marginBottom: 8, letterSpacing: '-0.5px' }}>
                Sign in
              </h2>
              <p style={{ color: '#4A6080', fontSize: 14, marginBottom: 28 }}>
                Access your eWork Social dashboard
              </p>

              {/* Google button */}
              <button onClick={handleGoogleLogin} className="social-btn" style={{ marginBottom: 10 }}>
                <GoogleIcon />
                Continue with Google
              </button>

              {/* Divider */}
              <div className="divider">
                <div className="divider-line" />
                <span className="divider-text">or continue with email</span>
                <div className="divider-line" />
              </div>

              {/* Email / password form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#8BA0BC' }}>Email</label>
                    <a href="/forgot-password" style={{ fontSize: 12, color: '#4D8FE8', textDecoration: 'none' }}>Forgot password?</a>
                  </div>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="field-input" placeholder="you@agency.com" />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#8BA0BC', marginBottom: 7, display: 'block' }}>Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="field-input" placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleSubmit(e as any)} />
                </div>

                {error && (
                  <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5', fontSize: 14, padding: '12px 16px', borderRadius: 10 }}>
                    {error}
                  </div>
                )}

                <button className="submit-btn" onClick={handleSubmit} disabled={loading}>
                  {loading ? 'Signing in…' : 'Sign In →'}
                </button>
              </div>
            </>
          )}

          <div style={{ borderTop: '1px solid #1A2840', marginTop: 24, paddingTop: 20, textAlign: 'center' }}>
            <p style={{ color: '#4A6080', fontSize: 14 }}>
              New to eWork Social?{' '}
              <Link href="/register" style={{ color: '#3B82F6', fontWeight: 600, textDecoration: 'none' }}>
                Start free trial →
              </Link>
            </p>
          </div>
        </div>

        {/* Trust badges */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 24, flexWrap: 'wrap' }}>
          {[
            '✓ Meta Platform Approved',
            '✓ Google OAuth',
            '✓ SSL Encrypted',
          ].map(badge => (
            <span key={badge} style={{ color: '#2A3A52', fontSize: 11, fontWeight: 600, letterSpacing: '0.3px' }}>
              {badge}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
