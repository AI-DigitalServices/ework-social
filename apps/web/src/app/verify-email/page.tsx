'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import Link from 'next/link';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const setVerified = useAuthStore((s) => s.setVerified);
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) { setStatus('error'); setMessage('No verification token found.'); return; }
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/verify-email?token=${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) { setVerified(); setStatus('success'); setTimeout(() => router.push('/dashboard'), 3000); }
        else { setStatus('error'); setMessage(data.message || 'Verification failed.'); }
      })
      .catch(() => { setStatus('error'); setMessage('Something went wrong. Please try again.'); });
  }, [token]);

  return (
    <div style={{ minHeight: '100vh', background: '#080C14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ textAlign: 'center', maxWidth: 480, padding: '0 24px' }}>
        {status === 'loading' && (<><div style={{ fontSize: 48, marginBottom: 24 }}>⏳</div><h1 style={{ color: '#F0F6FF', fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Verifying your email...</h1><p style={{ color: '#6B8299', fontSize: 15 }}>Please wait a moment.</p></>)}
        {status === 'success' && (<><div style={{ fontSize: 48, marginBottom: 24 }}>🎉</div><h1 style={{ color: '#F0F6FF', fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Email Verified!</h1><p style={{ color: '#6B8299', fontSize: 15, marginBottom: 24 }}>Your account is now fully activated. Redirecting to dashboard...</p><Link href="/dashboard" style={{ display: 'inline-block', background: '#2563EB', color: 'white', padding: '12px 32px', borderRadius: 10, textDecoration: 'none', fontWeight: 700 }}>Go to Dashboard →</Link></>)}
        {status === 'error' && (<><div style={{ fontSize: 48, marginBottom: 24 }}>❌</div><h1 style={{ color: '#F0F6FF', fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Verification Failed</h1><p style={{ color: '#6B8299', fontSize: 15, marginBottom: 24 }}>{message}</p><Link href="/dashboard" style={{ display: 'inline-block', background: '#2563EB', color: 'white', padding: '12px 32px', borderRadius: 10, textDecoration: 'none', fontWeight: 700 }}>Back to Dashboard →</Link></>)}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#080C14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#6B8299', fontSize: 15 }}>Loading...</p>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
