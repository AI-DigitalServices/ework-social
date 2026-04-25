'use client';

import { useState } from 'react';
import { X, Eye, EyeOff, ExternalLink } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

interface Props {
  onClose: () => void;
  onConnected: () => void;
}

export default function BlueskyConnectModal({ onClose, onConnected }: Props) {
  const { workspace } = useAuthStore();
  const [identifier, setIdentifier] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = async () => {
    if (!identifier.trim() || !appPassword.trim() || !workspace?.id) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/social/bluesky/connect', {
        workspaceId: workspace.id,
        identifier: identifier.trim(),
        appPassword: appPassword.trim(),
      });
      onConnected();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Connection failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🦋</span>
            <div>
              <h3 className="font-bold text-slate-800">Connect Bluesky</h3>
              <p className="text-xs text-slate-500">Uses App Password — not your main password</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Info box */}
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
            <p className="text-sm text-sky-800 font-medium mb-1">How to get an App Password:</p>
            <ol className="text-xs text-sky-700 space-y-1 list-decimal list-inside">
              <li>Go to Bluesky Settings → Privacy &amp; Security</li>
              <li>Click &quot;App Passwords&quot; → &quot;Add App Password&quot;</li>
              <li>Name it &quot;eWork Social&quot; and copy the password</li>
            </ol>
            
              href="https://bsky.app/settings/app-passwords"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 mt-3 text-xs text-sky-600 font-semibold hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              Open Bluesky App Passwords →
            </a>
          </div>

          {/* Handle input */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">
              Bluesky Handle
            </label>
            <input
              type="text"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              placeholder="yourhandle.bsky.social"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 placeholder-slate-400 text-sm"
            />
          </div>

          {/* App Password input */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">
              App Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={appPassword}
                onChange={e => setAppPassword(e.target.value)}
                placeholder="xxxx-xxxx-xxxx-xxxx"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 placeholder-slate-400 text-sm pr-12"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              Your app password is encrypted and stored securely. We never store your main password.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleConnect}
              disabled={loading || !identifier.trim() || !appPassword.trim()}
              className="flex-1 py-3 bg-sky-500 text-white rounded-xl text-sm font-semibold hover:bg-sky-600 transition disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Connecting...
                </span>
              ) : 'Connect Bluesky'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
