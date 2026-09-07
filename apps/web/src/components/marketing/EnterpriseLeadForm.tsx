'use client';

import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function EnterpriseLeadForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  const submit = async () => {
    if (!name.trim() || !email.trim()) { setError('Name and email are required.'); return; }
    setStatus('sending'); setError('');
    try {
      const res = await fetch(`${API}/leads/enterprise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, company, message, interest: 'software' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || 'Something went wrong.');
      }
      setStatus('done');
    } catch (err: any) {
      setStatus('error');
      setError(err?.message || 'Could not send. Please try again.');
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', background: '#070B12', border: '1px solid #1A2840',
    borderRadius: 10, color: '#F0F6FF', fontSize: 14, outline: 'none', fontFamily: 'Inter, sans-serif',
  };

  if (status === 'done') {
    return (
      <div style={{ background: '#0C1524', border: '1px solid rgba(16,185,129,0.35)', borderRadius: 16, padding: 32, textAlign: 'center' }}>
        <p style={{ fontSize: 20, fontWeight: 700, color: '#10B981', marginBottom: 8 }}>Thanks — we&apos;ll be in touch.</p>
        <p style={{ color: '#8BA0BC', fontSize: 15 }}>Our team will reach out to <strong style={{ color: '#C8D8EC' }}>{email}</strong> shortly. Prefer to talk now? Book a call above.</p>
      </div>
    );
  }

  return (
    <div style={{ background: '#0C1524', border: '1px solid #1A2840', borderRadius: 16, padding: 32 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <input style={inputStyle} placeholder="Your name *" value={name} onChange={e => setName(e.target.value)} />
        <input style={inputStyle} type="email" placeholder="Work email *" value={email} onChange={e => setEmail(e.target.value)} />
      </div>
      <input style={{ ...inputStyle, marginBottom: 14 }} placeholder="Company" value={company} onChange={e => setCompany(e.target.value)} />
      <textarea style={{ ...inputStyle, marginBottom: 14, resize: 'vertical' as const, minHeight: 90 }} placeholder="What are you looking for? (team size, goals, anything useful)" value={message} onChange={e => setMessage(e.target.value)} />
      {error && <p style={{ color: '#F87171', fontSize: 13, marginBottom: 12 }}>{error}</p>}
      <button
        onClick={submit}
        disabled={status === 'sending'}
        className="pbtn-primary"
        style={{ width: '100%', border: 'none', cursor: 'pointer', opacity: status === 'sending' ? 0.6 : 1 }}
      >
        {status === 'sending' ? 'Sending…' : 'Talk to sales'}
      </button>
      <p style={{ color: '#4A6080', fontSize: 12, marginTop: 12, textAlign: 'center' }}>
        We&apos;ll only use your details to respond to this enquiry.
      </p>
    </div>
  );
}
