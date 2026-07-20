'use client';

import { useState, useEffect, useCallback } from 'react';
import PlatformIcon from '@/components/ui/PlatformIcon';
import { CheckCircle, Plus, Trash2, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import BlueskyConnectModal from '@/components/settings/BlueskyConnectModal';

const platforms = [
  { id: 'facebook',  name: 'Facebook',          description: 'Pages, posts, analytics & auto-responder',        phase: 1, apiPlatform: 'FACEBOOK'  },
  { id: 'instagram', name: 'Instagram',          description: 'Feed, Reels, Stories & DM auto-responder',        phase: 1, apiPlatform: 'INSTAGRAM' },
  { id: 'linkedin',  name: 'LinkedIn',           description: 'Company pages & personal profiles',               phase: 1, apiPlatform: 'LINKEDIN'  },
  { id: 'bluesky',   name: 'Bluesky',            description: 'Posts, threads & growing global audience',        phase: 1, apiPlatform: 'BLUESKY'   },
  { id: 'twitter',   name: 'Twitter / X',        description: '@Mentions pulled into inbox every 10 min — free', phase: 1, apiPlatform: 'TWITTER'   },
  { id: 'tiktok',    name: 'TikTok',             description: 'Video posts & analytics',                         phase: 1, apiPlatform: 'TIKTOK'    },
  { id: 'youtube',   name: 'YouTube',            description: 'Videos, shorts & channel analytics',              phase: 1, apiPlatform: 'YOUTUBE'   },
  { id: 'threads',   name: 'Threads',            description: 'Posts, replies & growing Meta audience',          phase: 1, apiPlatform: 'THREADS'   },
  { id: 'pinterest', name: 'Pinterest',          description: 'Pins, boards & analytics',                        phase: 3, apiPlatform: 'PINTEREST' },
  { id: 'whatsapp',  name: 'WhatsApp Business',  description: 'Broadcasts & auto-responder',                     phase: 3, apiPlatform: 'WHATSAPP'  },
  { id: 'telegram',  name: 'Telegram',           description: 'Channel posts & bot auto-responder',              phase: 4, apiPlatform: 'TELEGRAM'  },
  { id: 'reddit',    name: 'Reddit',             description: 'Subreddit posts & community management',          phase: 4, apiPlatform: 'REDDIT'    },
];

const platformColors: Record<string, { border: string; bg: string; text: string; badge: string }> = {
  FACEBOOK:  { border: 'border-blue-200',  bg: 'bg-blue-50',  text: 'text-blue-700',  badge: 'bg-blue-100 text-blue-700' },
  INSTAGRAM: { border: 'border-pink-200',  bg: 'bg-pink-50',  text: 'text-pink-700',  badge: 'bg-pink-100 text-pink-700' },
  LINKEDIN:  { border: 'border-blue-300',  bg: 'bg-blue-50',  text: 'text-blue-800',  badge: 'bg-blue-100 text-blue-800' },
  TWITTER:   { border: 'border-slate-300', bg: 'bg-slate-50', text: 'text-slate-800', badge: 'bg-slate-100 text-slate-800' },
  TIKTOK:    { border: 'border-slate-300', bg: 'bg-slate-50', text: 'text-slate-900', badge: 'bg-slate-100 text-slate-900' },
  YOUTUBE:   { border: 'border-red-200',   bg: 'bg-red-50',   text: 'text-red-600',   badge: 'bg-red-100 text-red-600' },
  BLUESKY:   { border: 'border-sky-200',   bg: 'bg-sky-50',   text: 'text-sky-700',   badge: 'bg-sky-100 text-sky-700' },
  THREADS:   { border: 'border-slate-300',  bg: 'bg-slate-50',  text: 'text-slate-800',  badge: 'bg-slate-100 text-slate-800' },
  default:   { border: 'border-slate-200', bg: 'bg-slate-50', text: 'text-slate-700', badge: 'bg-slate-100 text-slate-700' },
};

const phaseLabels: Record<number, string> = {
  1: '🚀 Phase 1 — Available Now',
  2: '⚡ Phase 2 — Coming Soon',
  3: '🌍 Phase 3 — Roadmap',
  4: '🔮 Phase 4 — Future',
};

const MAX_ACCOUNTS = 10;

interface ConnectedAccount {
  id: string;
  platform: string;
  accountName: string;
  accountId: string;
  isActive: boolean;
  createdAt: string;
}

/* ── Twitter OAuth 2.0 connect modal ─────────────────────── */
function TwitterConnectModal({ onClose }: { onClose: () => void }) {
  const { workspace, token } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleOAuth = async () => {
    if (!workspace?.id || !token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/twitter/auth-url?workspaceId=${workspace.id}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || 'Could not generate Twitter authorisation URL');
      }
      const { url } = await res.json();
      // Hand off to Twitter — callback lands back at /twitter/callback on the API
      window.location.href = url;
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 32, width: 420, boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#1DA1F2,#0d8bd9)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(29,161,242,0.4)' }}>
            <span style={{ color: '#fff', fontSize: 22, fontWeight: 900 }}>𝕏</span>
          </div>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: '#1E293B' }}>Connect Twitter / X</h3>
            <p style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Authorise eWork Social to read @mentions & send replies</p>
          </div>
        </div>

        {/* What you get */}
        <div style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.08),rgba(5,150,105,0.05))', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 12, padding: '12px 14px', marginBottom: 20 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#059669', marginBottom: 6 }}>What you'll be able to do</p>
          <ul style={{ margin: 0, padding: '0 0 0 16px', listStyle: 'disc' }}>
            <li style={{ fontSize: 12, color: '#374151', marginBottom: 3 }}>@Mentions pulled into Engagement Hub every 10 min</li>
            <li style={{ fontSize: 12, color: '#374151', marginBottom: 3 }}>Reply to mentions directly from your inbox</li>
            <li style={{ fontSize: 12, color: '#374151' }}>Secure OAuth 2.0 — we never store your password</li>
          </ul>
        </div>

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
            <p style={{ fontSize: 12, color: '#DC2626', margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: '11px', borderRadius: 12, border: '1.5px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={handleOAuth}
            disabled={loading}
            style={{ flex: 2, padding: '11px', borderRadius: 12, border: 'none', background: loading ? '#E2E8F0' : 'linear-gradient(135deg,#1DA1F2,#0d8bd9)', color: loading ? '#94A3B8' : '#fff', fontWeight: 800, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 14px rgba(29,161,242,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            {loading ? (
              <>
                <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #94A3B8', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                Redirecting…
              </>
            ) : (
              <>
                <span style={{ fontWeight: 900, fontSize: 15 }}>𝕏</span>
                Authorise with Twitter
              </>
            )}
          </button>
        </div>
        <p style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', marginTop: 12 }}>
          You'll be redirected to Twitter to approve access, then brought back here automatically.
        </p>
      </div>
    </div>
  );
}

export default function SocialAccountsTab() {
  const { workspace, token } = useAuthStore();
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showBlueskyModal, setShowBlueskyModal] = useState(false);
  const [showTwitterModal, setShowTwitterModal] = useState(false);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadAccounts = useCallback(async () => {
    if (!workspace?.id || !token) return;
    setLoading(true);
    try {
      const res = await api.get(`/social/accounts?workspaceId=${workspace.id}`);
      setAccounts(res.data);
    } catch (err) {
      console.error('Failed to load accounts:', err);
    } finally {
      setLoading(false);
    }
  }, [workspace?.id, token]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const error = params.get('error');
    if (success === 'connected') {
      showToast('success', '✅ Account connected! Your mentions will appear in the Engagement Hub shortly.');
      window.history.replaceState({}, '', window.location.pathname + '?tab=social');
      setTimeout(() => loadAccounts(), 2000);
    } else if (error === 'cancelled') {
      showToast('error', 'Connection was cancelled.');
      window.history.replaceState({}, '', window.location.pathname + '?tab=social');
    } else if (error === 'no_pages') {
      showToast('error', '⚠️ No Facebook Pages found. Your account must be admin of at least one Facebook Page.');
      window.history.replaceState({}, '', window.location.pathname + '?tab=social');
    } else if (error === 'failed') {
      showToast('error', '❌ Connection failed. Please try again.');
      window.history.replaceState({}, '', window.location.pathname + '?tab=social');
    }
  }, [loadAccounts]);

  const handleConnect = async (platformId: string) => {
    if (!workspace?.id || !token) return;
    if (platformId === 'bluesky') { setShowBlueskyModal(true); return; }
    if (platformId === 'twitter') { setShowTwitterModal(true); return; }
    if (!['facebook', 'instagram', 'linkedin', 'tiktok', 'youtube', 'threads'].includes(platformId)) return;
    try {
      const authUrlEndpoint = 
        platformId === 'linkedin' ? 'linkedin/auth-url' :
        platformId === 'tiktok' ? 'tiktok/auth-url' :
        platformId === 'youtube' ? 'youtube/auth-url' :
        platformId === 'threads' ? 'threads/auth-url' :
        'facebook/auth-url';
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/social/${authUrlEndpoint}?workspaceId=${workspace.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      } else {
        showToast('error', 'Failed to get OAuth URL. Check your Meta App settings.');
      }
    } catch (err) {
      showToast('error', 'Network error. Please try again.');
    }
  };

  const handleDisconnect = async (accountId: string, accountName: string) => {
    if (!workspace?.id || !token) return;
    setDisconnecting(accountId);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/social/accounts/${accountId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspaceId: workspace.id }),
        }
      );
      if (res.ok) {
        setAccounts(prev => prev.filter(a => a.id !== accountId));
        showToast('success', `Disconnected ${accountName}`);
      }
    } catch (err) {
      showToast('error', 'Failed to disconnect. Try again.');
    } finally {
      setDisconnecting(null);
    }
  };

  const getConnectedAccount = (apiPlatform: string) =>
    accounts.find(a => a.platform === apiPlatform);

  return (
    <div className="space-y-8 relative">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-sm font-medium ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      {/* Connected count bar */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="font-semibold text-blue-800">
            {loading ? '...' : accounts.length} of {MAX_ACCOUNTS} accounts connected
          </p>
          <p className="text-blue-600 text-sm mt-0.5">Your current plan allows up to {MAX_ACCOUNTS} social accounts</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadAccounts} className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition" title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="w-32 h-2 bg-blue-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${(accounts.length / MAX_ACCOUNTS) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Platforms by phase */}
      {[1, 2, 3, 4].map(phase => (
        <div key={phase}>
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">{phaseLabels[phase]}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {platforms.filter(p => p.phase === phase).map(platform => {
              const account = getConnectedAccount(platform.apiPlatform);
              const isConnected = !!account;
              const isLocked = phase > 1;
              const colors = platformColors[platform.apiPlatform] || platformColors.default;
              const isDisconnecting = disconnecting === account?.id;

              return (
                <div key={platform.id} className={`border rounded-xl p-5 transition-all ${isConnected ? `${colors.border} ${colors.bg}` : 'border-slate-200 bg-white'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <PlatformIcon platform={platform.apiPlatform} size="lg" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-800">{platform.name}</p>
                          {isConnected && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
                        </div>
                        <p className="text-slate-500 text-xs mt-0.5">{platform.description}</p>
                        {account && (
                          <span className={`inline-block text-xs font-medium mt-1.5 px-2 py-0.5 rounded-full ${colors.badge}`}>
                            @{account.accountName} · {new Date(account.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                      {isConnected ? (
                        <>
                          <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition"><ExternalLink className="w-4 h-4" /></button>
                          <button onClick={() => handleDisconnect(account.id, account.accountName)} disabled={isDisconnecting} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50">
                            {isDisconnecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => !isLocked && handleConnect(platform.id)}
                          disabled={isLocked}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${isLocked ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                        >
                          {isLocked ? '🔒 Coming Soon' : <><Plus className="w-3 h-3" />Connect</>}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Meta dev mode notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Meta App in Development Mode</p>
          <p className="text-xs text-amber-700 mt-1">Only accounts added as testers can connect right now. Go to <strong>developers.facebook.com → Your App → Roles → Testers</strong> to add test accounts.</p>
        </div>
      </div>
      {showBlueskyModal && (
        <BlueskyConnectModal
          onClose={() => setShowBlueskyModal(false)}
          onConnected={() => { loadAccounts(); showToast('success', '🦋 Bluesky connected successfully!'); }}
        />
      )}

      {showTwitterModal && (
        <TwitterConnectModal
          onClose={() => setShowTwitterModal(false)}
        />
      )}
    </div>
  );
}
