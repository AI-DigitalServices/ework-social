'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, token, setVerified, logout } = useAuthStore();
  const [hasHydrated, setHasHydrated] = useState(false);
  const router = useRouter();
  const trialStatus = useTrialStatus();

  // Verification gate state
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState('');

  useEffect(() => { setHasHydrated(true); }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!token) router.push('/login');
  }, [hasHydrated, token, router]);

  const handleResend = useCallback(async () => {
    setResending(true);
    setResent(false);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setResent(true);
    } catch {}
    setResending(false);
  }, [token]);

  // Polls /auth/me to check if the user has verified in another tab/device
  const handleCheckVerified = useCallback(async () => {
    setChecking(true);
    setCheckError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.isVerified) {
        setVerified();
        // store update triggers re-render — dashboard loads automatically
      } else {
        setCheckError("Your email hasn't been verified yet. Click the link in your inbox and try again.");
      }
    } catch {
      setCheckError('Unable to check status. Please try again.');
    }
    setChecking(false);
  }, [token, setVerified]);

  const handleSignupAgain = useCallback(() => {
    logout();
    router.push('/register');
  }, [logout, router]);

  // ── Loading skeleton ───────────────────────────────────────────────────
  if (!hasHydrated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!token) return null;

  // ── Hard verification gate — replaces the entire dashboard ─────────────
  if (user && !user.isVerified) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#080C14',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, sans-serif',
        padding: '24px',
      }}>
        <div style={{ textAlign: 'center', maxWidth: 460, width: '100%' }}>

          {/* Brand mark */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 44 }}>
            <img src="/icon.png" alt="eWork Social" style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'cover' }} />
            <span style={{ fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: 18, color: '#fff' }}>eWork Social</span>
          </div>

          {/* Email icon */}
          <div style={{
            width: 76, height: 76,
            borderRadius: '50%',
            background: 'rgba(37,99,235,0.12)',
            border: '1.5px solid rgba(37,99,235,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 28px',
            fontSize: 34,
          }}>
            ✉️
          </div>

          <h1 style={{
            color: '#F0F6FF',
            fontSize: 26,
            fontWeight: 800,
            fontFamily: 'Georgia, serif',
            letterSpacing: '-0.3px',
            marginBottom: 14,
          }}>
            Verify your email to continue
          </h1>

          <p style={{ color: '#6B8299', fontSize: 15, lineHeight: 1.75, marginBottom: 6 }}>
            We sent a verification link to:
          </p>
          <p style={{ color: '#60A5FA', fontSize: 16, fontWeight: 600, marginBottom: 10 }}>
            {user?.email}
          </p>
          <p style={{ color: '#3A506B', fontSize: 13, lineHeight: 1.7, marginBottom: 32 }}>
            Open that email and click the verification link to activate your account. If you don't see it, check your spam or promotions folder.
          </p>

          {/* Primary: check verification status */}
          <button
            onClick={handleCheckVerified}
            disabled={checking}
            style={{
              display: 'block', width: '100%',
              background: checking ? '#1D4ED8' : '#2563EB',
              color: 'white',
              padding: '14px 24px',
              borderRadius: 12,
              fontWeight: 700, fontSize: 15,
              border: 'none',
              cursor: checking ? 'default' : 'pointer',
              marginBottom: 10,
              transition: 'background 0.2s',
            }}
          >
            {checking ? 'Checking…' : "I've verified my email — continue →"}
          </button>

          {checkError && (
            <p style={{ color: '#F87171', fontSize: 13, marginBottom: 10, lineHeight: 1.5 }}>
              {checkError}
            </p>
          )}

          {/* Secondary: resend */}
          <button
            onClick={handleResend}
            disabled={resending || resent}
            style={{
              display: 'block', width: '100%',
              background: 'transparent',
              color: resent ? '#34D399' : '#94A3B8',
              padding: '13px 24px',
              borderRadius: 12,
              fontWeight: 500, fontSize: 14,
              border: '1px solid #1A2840',
              cursor: resending || resent ? 'default' : 'pointer',
              transition: 'color 0.2s, border-color 0.2s',
            }}
          >
            {resent ? '✓ Verification email sent!' : resending ? 'Sending…' : 'Resend verification email'}
          </button>

          {/* Escape hatch */}
          <p style={{ color: '#3A506B', fontSize: 12, marginTop: 28 }}>
            Wrong email address?{' '}
            <button
              onClick={handleSignupAgain}
              style={{ background: 'none', border: 'none', color: '#60A5FA', cursor: 'pointer', fontSize: 12, padding: 0, textDecoration: 'underline' }}
            >
              Sign up again with a different email
            </button>
          </p>
        </div>
      </div>
    );
  }

  // ── Normal dashboard layout ────────────────────────────────────────────
  const bannerCount = [
    trialStatus?.trialActive && trialStatus.trialDaysLeft <= 3,
    trialStatus?.expired,
  ].filter(Boolean).length;

  const topPadding = 64 + (bannerCount * 44);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />

      {/* Trial expiring soon banner */}
      {trialStatus?.trialActive && trialStatus.trialDaysLeft <= 3 && (
        <div
          className="fixed left-0 lg:left-64 right-0 z-30 bg-orange-500 text-white px-4 py-2.5 flex items-center justify-between gap-4"
          style={{ top: 64, height: 44 }}
        >
          <p className="text-sm font-medium">
            ⏳ Your free trial expires in <strong>{trialStatus.trialDaysLeft} day{trialStatus.trialDaysLeft !== 1 ? 's' : ''}</strong> — upgrade to keep access!
          </p>
          <Link href="/dashboard/settings?tab=plan"
            className="bg-white text-orange-600 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-orange-50 transition shrink-0">
            Upgrade Now
          </Link>
        </div>
      )}

      {/* Trial expired banner */}
      {trialStatus?.expired && (
        <div
          className="fixed left-0 lg:left-64 right-0 z-30 bg-red-600 text-white px-4 py-2.5 flex items-center justify-between gap-4"
          style={{ top: trialStatus?.trialActive && trialStatus.trialDaysLeft <= 3 ? 108 : 64, height: 44 }}
        >
          <p className="text-sm font-medium">
            🔒 Your free trial has ended. Upgrade to continue using eWork Social.
          </p>
          <Link href="/dashboard/settings?tab=plan"
            className="bg-white text-red-600 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-red-50 transition shrink-0">
            Upgrade Now
          </Link>
        </div>
      )}

      <Header />
      <main
        className="lg:ml-64 min-h-screen"
        style={{ paddingTop: topPadding, paddingLeft: '1rem', paddingRight: '1rem', overflowX: 'hidden', maxWidth: '100vw' }}
      >
        {children}
      </main>
    </div>
  );
}
