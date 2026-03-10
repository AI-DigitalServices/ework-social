'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { registerAction } from '@/actions/auth.actions';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ name: '', email: '', password: '', workspaceName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await registerAction(form.name, form.email, form.password, form.workspaceName);
      setAuth(data.user, data.workspace, data.accessToken, data.refreshToken);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080C14', display: 'flex', fontFamily: "'Inter', sans-serif" }}>
      <style>{\`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Libre+Baskerville:wght@700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .field-input { width: 100%; padding: 13px 16px; background: #0C1524; border: 1px solid #1A2840; border-radius: 10px; color: #E8F0FA; font-size: 15px; font-family: 'Inter', sans-serif; outline: none; transition: border-color 0.2s, box-shadow 0.2s; }
        .field-input::placeholder { color: #3A506B; }
        .field-input:focus { border-color: #2563EB; box-shadow: 0 0 0 3px rgba(37,99,235,0.15); }
        .field-label { font-size: 13px; font-weight: 600; color: #8BA0BC; margin-bottom: 7px; display: block; }
        .submit-btn { width: 100%; padding: 15px; background: #2563EB; color: white; border: none; border-radius: 10px; font-size: 15px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-family: 'Inter', sans-serif; }
        .submit-btn:hover:not(:disabled) { background: #1D4ED8; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(37,99,235,0.4); }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .grid-bg { background-image: linear-gradient(rgba(37,99,235,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.04) 1px, transparent 1px); background-size: 64px 64px; }
      \`}</style>

      <div className="grid-bg" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 80px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', filter: 'blur(120px)', background: '#2563EB', opacity: 0.1, top: -100, left: -100, pointerEvents: 'none' }} />

        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 80 }}>
          <div style={{ width: 36, height: 36, background: '#2563EB', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⚡</div>
          <span style={{ fontFamily: 'Libre Baskerville, serif', fontWeight: 700, fontSize: 18, color: '#fff' }}>eWork Social</span>
        </Link>

        <div style={{ maxWidth: 440 }}>
          <h1 style={{ fontFamily: 'Libre Baskerville, serif', fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-1.5px', color: '#F0F6FF', marginBottom: 20 }}>
            Start managing your clients<br /><span style={{ color: '#3B82F6', fontStyle: 'italic' }}>social media</span> today.
          </h1>
          <p style={{ color: '#6B8299', fontSize: 16, lineHeight: 1.75, marginBottom: 48 }}>
            Join agencies across Africa and beyond. Your 7-day free trial includes all Pro features — no credit card required.
          </p>

          {[
            { icon: '📅', text: 'Schedule posts across Facebook, Instagram & more' },
            { icon: '👥', text: 'CRM & lead pipeline for all your clients' },
            { icon: '📊', text: 'Analytics dashboard with engagement tracking' },
            { icon: '🤖', text: 'Auto-responder with keyword triggers' },
          ].map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
              <div style={{ width: 38, height: 38, background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.25)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{f.icon}</div>
              <span style={{ color: '#8BA0BC', fontSize: 15 }}>{f.text}</span>
            </div>
          ))}

          <div style={{ marginTop: 48, padding: '20px 24px', background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 14 }}>
            <p style={{ color: '#8BA0BC', fontSize: 14, lineHeight: 1.7, fontStyle: 'italic' }}>
              "eWork Social changed how we manage our clients. Everything in one place — scheduling, CRM, analytics. Game changer."
            </p>
            <p style={{ color: '#4D8FE8', fontSize: 13, fontWeight: 600, marginTop: 12 }}>— Digital Agency Owner, Lagos</p>
          </div>
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 520, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 48px', background: '#070B12', borderLeft: '1px solid #1A2840' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <h2 style={{ fontFamily: 'Libre Baskerville, serif', fontSize: 26, fontWeight: 700, color: '#F0F6FF', marginBottom: 8, letterSpacing: '-0.5px' }}>Create your account</h2>
          <p style={{ color: '#4A6080', fontSize: 14, marginBottom: 32 }}>7-day free trial · No credit card required</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[
              { label: 'Your Full Name', name: 'name', type: 'text', placeholder: 'John Doe' },
              { label: 'Work Email', name: 'email', type: 'email', placeholder: 'you@agency.com' },
              { label: 'Password', name: 'password', type: 'password', placeholder: 'Minimum 8 characters' },
              { label: 'Agency / Workspace Name', name: 'workspaceName', type: 'text', placeholder: 'My Digital Agency' },
            ].map(field => (
              <div key={field.name}>
                <label className="field-label">{field.label}</label>
                <input type={field.type} name={field.name} value={form[field.name as keyof typeof form]} onChange={handleChange} className="field-input" placeholder={field.placeholder} required />
              </div>
            ))}

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5', fontSize: 14, padding: '12px 16px', borderRadius: 10 }}>
                {error}
              </div>
            )}

            <button className="submit-btn" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Creating your account...' : 'Start Free Trial →'}
            </button>

            <p style={{ fontSize: 12, color: '#2A3A52', textAlign: 'center', lineHeight: 1.6 }}>
              By signing up you agree to our <a href="/terms" style={{ color: '#4D8FE8', textDecoration: 'none' }}>Terms</a> and <a href="/privacy" style={{ color: '#4D8FE8', textDecoration: 'none' }}>Privacy Policy</a>
            </p>
          </div>

          <div style={{ borderTop: '1px solid #1A2840', marginTop: 28, paddingTop: 24, textAlign: 'center' }}>
            <p style={{ color: '#4A6080', fontSize: 14 }}>
              Already have an account? <Link href="/login" style={{ color: '#3B82F6', fontWeight: 600, textDecoration: 'none' }}>Sign in →</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
