'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { loginAction } from '@/actions/auth.actions';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <div style={{ minHeight: '100vh', background: '#080C14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Libre+Baskerville:wght@700&display=swap');
        * { box-sizing: border-box; }
        .field-input { width: 100%; padding: 13px 16px; background: #0C1524; border: 1px solid #1A2840; border-radius: 10px; color: #E8F0FA; font-size: 15px; font-family: 'Inter', sans-serif; outline: none; transition: border-color 0.2s, box-shadow 0.2s; }
        .field-input::placeholder { color: #3A506B; }
        .field-input:focus { border-color: #2563EB; box-shadow: 0 0 0 3px rgba(37,99,235,0.15); }
        .field-label { font-size: 13px; font-weight: 600; color: #8BA0BC; margin-bottom: 7px; display: block; }
        .submit-btn { width: 100%; padding: 15px; background: #2563EB; color: white; border: none; border-radius: 10px; font-size: 15px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-family: 'Inter', sans-serif; }
        .submit-btn:hover:not(:disabled) { background: #1D4ED8; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(37,99,235,0.4); }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>

      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 40, height: 40, background: '#2563EB', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>⚡</div>
            <span style={{ fontFamily: 'Libre Baskerville, serif', fontWeight: 700, fontSize: 20, color: '#fff' }}>eWork Social</span>
          </Link>
        </div>

        {/* Card */}
        <div style={{ background: '#070B12', border: '1px solid #1A2840', borderRadius: 20, padding: '40px 36px' }}>
          <h2 style={{ fontFamily: 'Libre Baskerville, serif', fontSize: 24, fontWeight: 700, color: '#F0F6FF', marginBottom: 8, letterSpacing: '-0.5px' }}>
            Welcome back
          </h2>
          <p style={{ color: '#4A6080', fontSize: 14, marginBottom: 32 }}>
            Sign in to your eWork Social account
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label className="field-label">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field-input"
                placeholder="you@agency.com"
                required
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                <label className="field-label" style={{ margin: 0 }}>Password</label>
                <a href="/forgot-password" style={{ fontSize: 12, color: '#4D8FE8', textDecoration: 'none' }}>Forgot password?</a>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field-input"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5', fontSize: 14, padding: '12px 16px', borderRadius: 10 }}>
                {error}
              </div>
            )}

            <button className="submit-btn" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>
          </div>

          <div style={{ borderTop: '1px solid #1A2840', marginTop: 28, paddingTop: 24, textAlign: 'center' }}>
            <p style={{ color: '#4A6080', fontSize: 14 }}>
              Don't have an account?{' '}
              <Link href="/register" style={{ color: '#3B82F6', fontWeight: 600, textDecoration: 'none' }}>
                Start free trial →
              </Link>
            </p>
          </div>
        </div>

        {/* Footer note */}
        <p style={{ textAlign: 'center', color: '#2A3A52', fontSize: 12, marginTop: 24 }}>
          Protected by eWork Social · <a href="/privacy" style={{ color: '#2A3A52' }}>Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
