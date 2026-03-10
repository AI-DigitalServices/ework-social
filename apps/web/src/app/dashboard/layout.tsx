'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (mounted && !token) router.push('/login');
  }, [mounted, token, router]);

  if (!mounted || !token) return null;

  const showBanner = user && !user.isVerified && !bannerDismissed;

  const handleResend = async () => {
    setResending(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setResent(true);
    } catch (err) {
      console.error(err);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {showBanner && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          background: 'linear-gradient(90deg, #92400e, #b45309)',
          borderBottom: '1px solid #d97706',
          padding: '10px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <span style={{ color: '#fef3c7', fontSize: 14, fontWeight: 500 }}>
            Please verify your email address to unlock all features.
            Check your inbox at <strong>{user.email}</strong>
          </span>
          {!resent ? (
            <button
              onClick={handleResend}
              disabled={resending}
              style={{
                background: 'rgba(255,255,255,0.2)', color: '#fef3c7',
                border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6,
                padding: '4px 12px', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', marginLeft: 8,
              }}
            >
              {resending ? 'Sending...' : 'Resend Email'}
            </button>
          ) : (
            <span style={{ color: '#86efac', fontSize: 13, fontWeight: 600, marginLeft: 8 }}>
              ✓ Email sent!
            </span>
          )}
          <button
            onClick={() => setBannerDismissed(true)}
            style={{
              background: 'transparent', border: 'none', color: '#fcd34d',
              cursor: 'pointer', fontSize: 18, marginLeft: 8, lineHeight: 1,
            }}
          >×</button>
        </div>
      )}
      <Sidebar />
      <Header />
      <main className="ml-64 min-h-screen" style={{ paddingTop: showBanner ? '96px' : '64px' }}>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
