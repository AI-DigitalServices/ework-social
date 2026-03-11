'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080C14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Libre+Baskerville:wght@700&display=swap');
        * { box-sizing: border-box; }
        .field-input { width: 100%; padding: 13px 16px; background: #0C1524; border: 1px solid #1A2840; border-radius: 10px; color: #E8F0FA; font-size: 15px; font-family: 'Inter', sans-serif; outline: none; transition: border-color 0.2s, box-shadow 0.2s; }
        .field-input::placeholder { color: #3A506B; }
        .field-input:focus { border-color: #2563EB; box-shadow: 0 0 0 3px rgba(37,99,235,0.15); }
        .submit-btn { width: 100%; padding: 15px; background: #2563EB; color: white; border: none; border-radius: 10px; font-size: 15px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-family: 'Inter', sans-serif; }
        .submit-btn:hover:not(:disabled) { background: #1D4ED8; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(37,99,235,0.4); }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>

      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 40, height: 40, background: '#2563EB', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>⚡</div>
            <span style={{ fontFamily: 'Libre Baskerville, serif', fontWeight: 700, fontSize: 20, color: '#fff' }}>eWork Social</span>
          </Link>
        </div>

        <div style={{ background: '#070B12', border: '1px solid #1A2840', borderRadius: 20, padding: '40px 36px' }}>
          {!sent ? (
            <>
              <h2 style={{ fontFamily: 'Libre Baskerville, serif', fontSize: 24, fontWeight: 700, color: '#F0F6FF', marginBottom: 8 }}>Forgot password?</h2>
              <p style={{ color: '#4A6080', fontSize: 14, marginBottom: 32 }}>Enter your email and we will send you a reset link.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#8BA0BC', marginBottom: 7, display: 'block' }}>Email Address</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field-input" placeholder="you@agency.com" required />
                </div>
                {error && (
                  <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5', fontSize: 14, padding: '12px 16px', borderRadius: 10 }}>{error}</div>
                )}
                <button className="submit-btn" onClick={handleSubmit} disabled={loading || !email}>
                  {loading ? 'Sending...' : 'Send Reset Link →'}
                </button>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📬</div>
              <h2 style={{ fontFamily: 'Libre Baskerville, serif', fontSize: 22, fontWeight: 700, color: '#F0F6FF', marginBottom: 12 }}>Check your inbox!</h2>
              <p style={{ color: '#6B8299', fontSize: 15, lineHeight: 1.7, marginBottom: 24 }}>
                We sent a password reset link to <strong style={{ color: '#E8F0FA' }}>{email}</strong>. It expires in 1 hour.
              </p>
              <button className="submit-btn" onClick={() => { setSent(false); setEmail(''); }} style={{ marginBottom: 0 }}>
                Send another link
              </button>
            </div>
          )}

          <div style={{ borderTop: '1px solid #1A2840', marginTop: 28, paddingTop: 24, textAlign: 'center' }}>
            <Link href="/login" style={{ color: '#3B82F6', fontWeight: 600, textDecoration: 'none', fontSize: 14 }}>← Back to Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
