'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import api from '@/lib/api';

export const dynamic = 'force-dynamic';

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'register'>('loading');
  const [message, setMessage] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');

  useEffect(() => {
    if (!token) { setStatus('error'); setMessage('Invalid invite link'); return; }
    acceptInvite();
  }, [token]);

  const acceptInvite = async () => {
    try {
      const res = await api.post('/workspace/invite/accept', { token });
      if (res.data.needsRegistration) {
        setStatus('register');
        setWorkspaceName(res.data.workspaceId);
        setTimeout(() => router.push(`/register?email=${res.data.email}&invite=${token}`), 2000);
      } else {
        setStatus('success');
        setWorkspaceName(res.data.workspaceName);
        setTimeout(() => router.push('/dashboard'), 2000);
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(err?.response?.data?.message || 'Failed to accept invite');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080C14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ background: '#0C1524', border: '1px solid #1A2840', borderRadius: 20, padding: '48px 40px', maxWidth: 420, width: '100%', textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, background: '#2563EB', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 24 }}>⚡</div>
        {status === 'loading' && (
          <>
            <div style={{ width: 32, height: 32, border: '3px solid #2563EB', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ color: '#6B8299', fontSize: 15 }}>Accepting your invitation...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <h2 style={{ color: '#F0F6FF', fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Welcome aboard! 🎉</h2>
            <p style={{ color: '#6B8299', fontSize: 15, marginBottom: 8 }}>You've joined <strong style={{ color: '#F0F6FF' }}>{workspaceName}</strong></p>
            <p style={{ color: '#4A6080', fontSize: 13 }}>Redirecting to dashboard...</p>
          </>
        )}
        {status === 'register' && (
          <>
            <h2 style={{ color: '#F0F6FF', fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Almost there!</h2>
            <p style={{ color: '#6B8299', fontSize: 15 }}>You need to create an account first. Redirecting...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <h2 style={{ color: '#F0F6FF', fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Invite Error</h2>
            <p style={{ color: '#ef4444', fontSize: 15, marginBottom: 24 }}>{message}</p>
            <a href="/login" style={{ display: 'inline-block', background: '#2563EB', color: 'white', padding: '12px 24px', borderRadius: 10, textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>Go to Login</a>
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#080C14' }} />}>
      <AcceptInviteContent />
    </Suspense>
  );
}
