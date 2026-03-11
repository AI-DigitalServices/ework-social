'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok) { setSuccess(true); setTimeout(() => router.push('/login'), 3000); }
      else { setError(data.message || 'Failed to reset password.'); }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) return (
    <div style={{ textAlign: 'center', color: '#F0F6FF' }}>
      <p>Invalid reset link. <Link href="/forgot-password" style={{ color: '#3B82F6' }}>Request a new one →</Link></p>
    </div>
  );

  return (
    <div style={{ background: '#070B12', border: '1px solid #1A2840', borderRadius: 20, padding: '40px 36px' }}>
      {!success ? (
        <>
          <h2 style={{ fontFamily: 'Libre Baskerville, serif', fontSize: 24, fontWeight: 700, color: '#F0F6FF', marginBottom: 8 }}>Set new password</h2>
          <p style={{ color: '#4A6080', fontSize: 14, marginBottom: 32 }}>Choose a strong password for your account.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#8BA0BC', marginBottom: 7, display: 'block' }}>New Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="field-input" placeholder="Minimum 8 characters" required />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#8BA0BC', marginBottom: 7, display: 'block' }}>Confirm Password</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="field-input" placeholder="Repeat your password" required />
            </div>
            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5', fontSize: 14, padding: '12px 16px', borderRadius: 10 }}>{error}</div>
            )}
            <button className="submit-btn" onClick={handleSubmit} disabled={loading || !password || !confirm}>
              {loading ? 'Resetting...' : 'Reset Password →'}
            </button>
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <h2 style={{ fontFamily: 'Libre Baskerville, serif', fontSize: 22, fontWeight: 700, color: '#F0F6FF', marginBottom: 12 }}>Password reset!</h2>
          <p style={{ color: '#6B8299', fontSize: 15, marginBottom: 0 }}>Redirecting you to login...</p>
        </div>
      )}
      <div style={{ borderTop: '1px solid #1A2840', marginTop: 28, paddingTop: 24, textAlign: 'center' }}>
        <Link href="/login" style={{ color: '#3B82F6', fontWeight: 600, textDecoration: 'none', fontSize: 14 }}>← Back to Sign In</Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
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
        <Suspense fallback={<div style={{ color: '#6B8299', textAlign: 'center' }}>Loading...</div>}>
          <ResetPasswordContent />
        </Suspense>
      </div>
    </div>
  );
}
