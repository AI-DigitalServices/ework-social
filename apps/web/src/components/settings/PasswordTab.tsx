'use client';

import { useState } from 'react';
import { KeyRound, Save } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';

export default function PasswordTab() {
  const { token } = useAuthStore();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    if (!form.current) { setError('Please enter your current password.'); return; }
    if (form.next.length < 8) { setError('New password must be at least 8 characters.'); return; }
    if (form.next !== form.confirm) { setError('New passwords do not match.'); return; }

    setStatus('saving');
    try {
      await api.post('/auth/change-password', {
        currentPassword: form.current,
        newPassword: form.next,
      });
      setStatus('saved');
      setForm({ current: '', next: '', confirm: '' });
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update password. Please try again.');
      setStatus('error');
    }
  };

  return (
    <div className="max-w-md space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
          <KeyRound className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800">Change Password</h3>
          <p className="text-sm text-slate-500">Update your login password.</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
          <input
            type="password"
            value={form.current}
            onChange={e => setForm({ ...form, current: e.target.value })}
            placeholder="Enter your current password"
            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
          <input
            type="password"
            value={form.next}
            onChange={e => setForm({ ...form, next: e.target.value })}
            placeholder="Minimum 8 characters"
            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
          <input
            type="password"
            value={form.confirm}
            onChange={e => setForm({ ...form, confirm: e.target.value })}
            placeholder="Re-enter new password"
            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}
        {status === 'saved' && (
          <p className="text-green-600 text-sm font-medium">✓ Password updated successfully.</p>
        )}

        <button
          onClick={handleSave}
          disabled={status === 'saving'}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition ${
            status === 'saved'
              ? 'bg-green-500 text-white'
              : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
          }`}
        >
          <Save className="w-4 h-4" />
          {status === 'saving' ? 'Saving...' : status === 'saved' ? 'Saved!' : 'Update Password'}
        </button>
      </div>
    </div>
  );
}
