'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import { CheckCircle, Clock, AlertCircle, RefreshCw, Send, ExternalLink } from 'lucide-react';

const PLATFORM_COLORS: Record<string, string> = {
  INSTAGRAM: '#E1306C', FACEBOOK: '#1877F2', LINKEDIN: '#0077B5',
  TIKTOK: '#000000', THREADS: '#000000', BLUESKY: '#0085FF', YOUTUBE: '#FF0000',
};

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  PENDING:            { label: 'Awaiting Review',  color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  icon: Clock },
  APPROVED:           { label: 'Approved',          color: '#10B981', bg: 'rgba(16,185,129,0.1)', icon: CheckCircle },
  REVISION_REQUESTED: { label: 'Needs Revision',   color: '#EF4444', bg: 'rgba(239,68,68,0.1)',  icon: AlertCircle },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function ApprovalsPage() {
  const { workspace } = useAuthStore();
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [copied, setCopied] = useState<string | null>(null);

  const loadApprovals = useCallback(async () => {
    if (!workspace?.id) return;
    setLoading(true);
    try {
      const res = await api.get(`/approvals/workspace?workspaceId=${workspace.id}`);
      setApprovals(res.data);
    } catch (err) {
      console.error('Failed to load approvals:', err);
    } finally {
      setLoading(false);
    }
  }, [workspace?.id]);

  useEffect(() => { loadApprovals(); }, [loadApprovals]);

  const copyLink = (approvalToken: string) => {
    const url = `${window.location.origin}/approve/${approvalToken}`;
    navigator.clipboard.writeText(url);
    setCopied(approvalToken);
    setTimeout(() => setCopied(null), 2000);
  };

  const counts = {
    all: approvals.length,
    PENDING: approvals.filter(a => a.status === 'PENDING').length,
    APPROVED: approvals.filter(a => a.status === 'APPROVED').length,
    REVISION_REQUESTED: approvals.filter(a => a.status === 'REVISION_REQUESTED').length,
  };

  const filtered = filter === 'all' ? approvals : approvals.filter(a => a.status === filter);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Client Approvals</h2>
          <p className="text-slate-500 mt-1">Track content approval status across all your clients.</p>
        </div>
        <button onClick={loadApprovals} className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { key: 'all',                label: 'Total',          color: 'text-slate-800', bg: 'bg-slate-100' },
          { key: 'PENDING',            label: 'Awaiting',       color: 'text-amber-700', bg: 'bg-amber-100' },
          { key: 'APPROVED',           label: 'Approved',       color: 'text-green-700', bg: 'bg-green-100' },
          { key: 'REVISION_REQUESTED', label: 'Needs Revision', color: 'text-red-700',   bg: 'bg-red-100'   },
        ].map(s => (
          <button key={s.key} onClick={() => setFilter(s.key)}
            className={`bg-white rounded-xl p-4 border text-left transition ${filter === s.key ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-100'}`}>
            <p className={`text-2xl font-bold ${s.color}`}>{counts[s.key as keyof typeof counts]}</p>
            <p className="text-slate-500 text-xs mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading approvals...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 p-16 text-center">
          <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Send className="w-8 h-8 text-purple-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">No approvals yet</h3>
          <p className="text-slate-500 max-w-sm mx-auto text-sm">
            Send posts for client approval from the Scheduler. Clients receive an email with a review link — no login needed.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(approval => {
            const status = STATUS_META[approval.status] || STATUS_META.PENDING;
            const StatusIcon = status.icon;
            const platformColor = PLATFORM_COLORS[approval.post?.socialAccount?.platform] || '#378ADD';
            return (
              <div key={approval.id} className="bg-white rounded-xl border border-slate-100 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: platformColor }}>
                      {approval.post?.socialAccount?.platform?.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-slate-800 text-sm">{approval.clientName}</span>
                        <span className="text-slate-400 text-xs">{approval.clientEmail}</span>
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ background: status.bg, color: status.color }}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </div>
                      <p className="text-slate-500 text-xs line-clamp-2 mb-2">
                        {approval.post?.content?.slice(0, 120)}...
                      </p>
                      {approval.revisionNote && (
                        <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-2">
                          <p className="text-red-600 text-xs font-semibold mb-0.5">Client revision note:</p>
                          <p className="text-red-700 text-xs">{approval.revisionNote}</p>
                        </div>
                      )}
                      <p className="text-slate-400 text-xs">
                        Sent {formatDate(approval.createdAt)}
                        {approval.respondedAt && ` · Responded ${formatDate(approval.respondedAt)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => copyLink(approval.token)}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 transition">
                      <ExternalLink className="w-3 h-3" />
                      {copied === approval.token ? 'Copied!' : 'Copy Link'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
