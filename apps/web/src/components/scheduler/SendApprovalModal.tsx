'use client';

import { useState, useEffect } from 'react';
import { X, Send, User, Mail } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

interface Props {
  post: any;
  onClose: () => void;
  onSent: () => void;
}

export default function SendApprovalModal({ post, onClose, onSent }: Props) {
  const { workspace } = useAuthStore();
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientName, setClientName] = useState('');
  const [useExisting, setUseExisting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!workspace?.id) return;
    api.get(`/crm/clients?workspaceId=${workspace.id}`)
      .then(r => {
        setClients(r.data?.data || r.data || []);
      })
      .catch(() => setClients([]));
  }, [workspace?.id]);

  // Auto-fill when client is selected
  useEffect(() => {
    if (selectedClientId) {
      const client = clients.find((c: any) => c.id === selectedClientId);
      if (client) {
        setClientEmail(client.email || '');
        setClientName(client.name || '');
      }
    }
  }, [selectedClientId, clients]);

  const handleSend = async () => {
    if (!clientEmail.trim() || !clientName.trim()) {
      setError('Please provide client name and email.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/approvals/send', {
        postId: post.id,
        workspaceId: workspace?.id,
        clientEmail: clientEmail.trim(),
        clientName: clientName.trim(),
        clientId: selectedClientId || undefined,
      });
      setSuccess(true);
      setTimeout(() => onSent(), 1500);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to send approval request.');
    } finally {
      setLoading(false);
    }
  };

  const platformIcons: Record<string, string> = {
    FACEBOOK: '📘', INSTAGRAM: '📸', LINKEDIN: '💼',
    TIKTOK: '🎵', YOUTUBE: '▶️', THREADS: '🧵', BLUESKY: '🦋',
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center">
              <Send className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Send for Client Approval</h3>
              <p className="text-xs text-slate-500">Client receives an email with a review link</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* Post preview */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <span>{platformIcons[post.socialAccount?.platform] || '📱'}</span>
              <span className="text-xs font-semibold text-slate-600">{post.socialAccount?.accountName}</span>
            </div>
            <p className="text-slate-700 text-sm line-clamp-2">{post.content}</p>
          </div>

          {/* Client selector */}
          {clients.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => setUseExisting(true)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition border ${useExisting ? 'bg-purple-600 text-white border-purple-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                Select Client
              </button>
              <button
                onClick={() => { setUseExisting(false); setSelectedClientId(''); setClientEmail(''); setClientName(''); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition border ${!useExisting ? 'bg-purple-600 text-white border-purple-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                Enter Manually
              </button>
            </div>
          )}

          {/* Existing client dropdown */}
          {useExisting && clients.length > 0 ? (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                Select Client
              </label>
              <select
                value={selectedClientId}
                onChange={e => setSelectedClientId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 text-sm bg-white"
              >
                <option value="">Choose a client...</option>
                {clients.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name} {c.email ? `— ${c.email}` : ''}</option>
                ))}
              </select>
            </div>
          ) : null}

          {/* Manual / override fields */}
          {(!useExisting || !clients.length) && (
            <>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Client Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    placeholder="e.g. Zenith Bank"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 text-sm"
                  />
                </div>
              </div>
            </>
          )}

          {/* Always show email field — pre-filled if client selected */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">
              Client Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                value={clientEmail}
                onChange={e => setClientEmail(e.target.value)}
                placeholder="client@company.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 text-sm"
              />
            </div>
            {selectedClientId && !clients.find((c:any) => c.id === selectedClientId)?.email && (
              <p className="text-xs text-amber-600 mt-1">This client has no email saved — please enter one above.</p>
            )}
          </div>

          {/* Info box */}
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
            <p className="text-xs text-purple-700">
              The client will receive an email with a secure review link. They can approve or request changes without creating an account.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700 font-medium text-center">
              ✅ Approval request sent successfully!
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
              onClick={handleSend}
              disabled={loading || success || !clientEmail.trim()}
              className="flex-1 py-3 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send for Approval
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
