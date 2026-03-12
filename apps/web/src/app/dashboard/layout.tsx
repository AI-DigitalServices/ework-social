'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const trialStatus = useTrialStatus();
  const [showVerifyBanner, setShowVerifyBanner] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    if (user && !user.isVerified) setShowVerifyBanner(true);
  }, [token, user]);

  const handleResend = async () => {
    setResending(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setResent(true);
    } catch {}
    setResending(false);
  };

  // Calculate banner count for padding
  const bannerCount = [
    showVerifyBanner,
    trialStatus?.trialActive && trialStatus.trialDaysLeft <= 3,
    trialStatus?.expired,
  ].filter(Boolean).length;

  const topPadding = 64 + (bannerCount * 44);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />

      {/* Email verification banner */}
      {showVerifyBanner && (
        <div className="fixed top-16 left-0 lg:left-64 right-0 z-30 bg-amber-500 text-white px-4 py-2.5 flex items-center justify-between gap-4" style={{ height: 44 }}>
          <p className="text-sm font-medium truncate">
            ⚠️ Please verify your email address to unlock all features. Check your inbox at <strong>{user?.email}</strong>
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={handleResend} disabled={resending || resent}
              className="bg-white text-amber-600 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-amber-50 transition disabled:opacity-60">
              {resent ? 'Sent!' : resending ? 'Sending...' : 'Resend Email'}
            </button>
            <button onClick={() => setShowVerifyBanner(false)} className="text-white/80 hover:text-white text-lg leading-none">×</button>
          </div>
        </div>
      )}

      {/* Trial expiring soon banner */}
      {trialStatus?.trialActive && trialStatus.trialDaysLeft <= 3 && (
        <div className="fixed left-0 lg:left-64 right-0 z-30 bg-orange-500 text-white px-4 py-2.5 flex items-center justify-between gap-4"
          style={{ top: showVerifyBanner ? 104 : 64, height: 44 }}>
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
        <div className="fixed left-0 lg:left-64 right-0 z-30 bg-red-600 text-white px-4 py-2.5 flex items-center justify-between gap-4"
          style={{ top: showVerifyBanner ? 104 : 64, height: 44 }}>
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
      <main className="lg:ml-64 min-h-screen" style={{ paddingTop: topPadding }}>
        {children}
      </main>
    </div>
  );
}
