'use client';

export const dynamic = 'force-dynamic';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

function CallbackContent() {
  const router = useRouter();
  const params = useSearchParams();
  const setAuth = useAuthStore(s => s.setAuth);

  useEffect(() => {
    const token        = params.get('token');
    const refreshToken = params.get('refreshToken');
    const userId       = params.get('userId');
    const name         = params.get('name');
    const email        = params.get('email');
    const workspaceId  = params.get('workspaceId');
    const workspaceName = params.get('workspaceName');
    const workspacePlan = params.get('workspacePlan');

    if (!token || !userId || !email) {
      router.replace('/login?error=oauth_failed');
      return;
    }

    setAuth(
      { id: userId, name: name || email, email, isVerified: true },
      { id: workspaceId || '', name: workspaceName || 'My Workspace', slug: '', plan: workspacePlan || 'FREE', isOwner: true, role: 'OWNER' },
      token,
      refreshToken || undefined,
    );

    router.replace('/dashboard');
  }, [params, setAuth, router]);

  return (
    <div style={{ minHeight: '100vh', background: '#080C14', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 36, height: 36, border: '3px solid #2563EB', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: '#4A6080', fontSize: 14, fontFamily: 'Inter, sans-serif' }}>Signing you in…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#080C14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #2563EB', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
