'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import { CheckCircle, Clock, AlertCircle, RefreshCw, Send, ExternalLink, ClipboardCheck } from 'lucide-react';

import PlatformIcon from '@/components/ui/PlatformIcon';

/* ─── Status visual config ───────────────────────────────────── */
const STATUS_META: Record<string, {
  label: string; textColor: string; bg: string; glow: string;
  cardGlow: string; accentColor: string; icon: any;
}> = {
  PENDING: {
    label: 'Awaiting Review', textColor: '#fbbf24', bg: 'rgba(245,158,11,0.12)',
    glow: 'rgba(245,158,11,0.5)', cardGlow: 'rgba(245,158,11,0.15)', accentColor: '#fcd34d',
    icon: Clock,
  },
  APPROVED: {
    label: 'Approved', textColor: '#34d399', bg: 'rgba(16,185,129,0.12)',
    glow: 'rgba(16,185,129,0.5)', cardGlow: 'rgba(16,185,129,0.15)', accentColor: '#6ee7b7',
    icon: CheckCircle,
  },
  REVISION_REQUESTED: {
    label: 'Needs Revision', textColor: '#f87171', bg: 'rgba(239,68,68,0.12)',
    glow: 'rgba(239,68,68,0.5)', cardGlow: 'rgba(239,68,68,0.1)', accentColor: '#fca5a5',
    icon: AlertCircle,
  },
};

/* ─── Stat filter card config ────────────────────────────────── */
const FILTER_CARDS = [
  { key: 'all',                label: 'Total',          gradient: 'linear-gradient(135deg,#1e293b 0%,#0f172a 100%)', glow: 'rgba(99,102,241,0.5)',  accent: '#a5b4fc', dotColor: '#818cf8' },
  { key: 'PENDING',            label: 'Awaiting',       gradient: 'linear-gradient(135deg,#2d1f08 0%,#0f172a 100%)', glow: 'rgba(245,158,11,0.5)', accent: '#fcd34d', dotColor: '#fbbf24' },
  { key: 'APPROVED',           label: 'Approved',       gradient: 'linear-gradient(135deg,#0c2a20 0%,#0f172a 100%)', glow: 'rgba(16,185,129,0.5)', accent: '#6ee7b7', dotColor: '#34d399' },
  { key: 'REVISION_REQUESTED', label: 'Needs Revision', gradient: 'linear-gradient(135deg,#2d0808 0%,#0f172a 100%)', glow: 'rgba(239,68,68,0.5)',  accent: '#fca5a5', dotColor: '#f87171' },
] as const;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}


export default function ApprovalsPage() {
  const { workspace } = useAuthStore();
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('all');
  const [copied, setCopied]       = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

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

  useEffect(() => {
    loadApprovals();
    const interval = setInterval(loadApprovals, 30000);
    return () => clearInterval(interval);
  }, [loadApprovals]);

  const copyLink = (approvalToken: string) => {
    const url = `${window.location.origin}/approve/${approvalToken}`;
    navigator.clipboard.writeText(url);
    setCopied(approvalToken);
    setTimeout(() => setCopied(null), 2000);
  };

  const counts = {
    all:                approvals.length,
    PENDING:            approvals.filter(a => a.status === 'PENDING').length,
    APPROVED:           approvals.filter(a => a.status === 'APPROVED').length,
    REVISION_REQUESTED: approvals.filter(a => a.status === 'REVISION_REQUESTED').length,
  };

  const filtered = filter === 'all' ? approvals : approvals.filter(a => a.status === filter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Hero header ───────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#162032 100%)',
        borderRadius: 20, padding: '28px 32px',
        border: '1px solid rgba(255,255,255,0.06)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -30, right: 60,  width: 200, height: 200, borderRadius: '50%', background: 'rgba(16,185,129,0.08)', filter: 'blur(50px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -30, right: 0, width: 160, height: 160, borderRadius: '50%', background: 'rgba(245,158,11,0.07)', filter: 'blur(40px)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 13, background: 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 0 20px rgba(16,185,129,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ClipboardCheck size={20} color="#fff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>Client Approvals</h2>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(148,163,184,0.85)' }}>Track content approval status across all your clients</p>
            </div>
          </div>
          <button
            onClick={loadApprovals}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12, color: '#94a3b8', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLElement).style.color = '#e2e8f0'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.color = '#94a3b8'; }}
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Stat / filter cards ───────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {FILTER_CARDS.map(card => {
          const isActive = filter === card.key;
          const count = counts[card.key as keyof typeof counts];
          return (
            <button
              key={card.key}
              onClick={() => setFilter(card.key)}
              style={{
                background: card.gradient,
                borderRadius: 16, padding: '20px 22px', textAlign: 'left',
                border: isActive ? `1.5px solid ${card.dotColor}60` : '1px solid rgba(255,255,255,0.06)',
                position: 'relative', overflow: 'hidden', cursor: 'pointer',
                boxShadow: isActive ? `0 0 20px ${card.glow}` : 'none',
                transform: isActive ? 'translateY(-2px)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ position: 'absolute', top: -24, right: -24, width: 80, height: 80, borderRadius: '50%', background: isActive ? card.glow : 'transparent', filter: 'blur(22px)', pointerEvents: 'none', transition: 'all 0.3s' }} />
              <div style={{ position: 'relative' }}>
                {isActive && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: card.dotColor, boxShadow: `0 0 6px ${card.dotColor}` }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: card.dotColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Active</span>
                  </div>
                )}
                <p style={{ margin: 0, fontSize: 32, fontWeight: 800, color: '#f1f5f9', lineHeight: 1 }}>{count}</p>
                <p style={{ margin: '6px 0 0', fontSize: 11, fontWeight: 600, color: isActive ? card.accent : 'rgba(148,163,184,0.65)', textTransform: 'uppercase', letterSpacing: '0.06em', transition: 'color 0.2s' }}>{card.label}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Content area ──────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 36, height: 36, border: '3px solid rgba(16,185,129,0.3)', borderTop: '3px solid #10b981', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 14px' }} />
            <p style={{ color: '#94a3b8', fontSize: 13 }}>Loading approvals…</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        /* ── Empty state ──────────────────────────────────────────── */
        <div style={{
          background: 'linear-gradient(135deg,#0f172a 0%,#1a2540 100%)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 20, padding: '56px 32px', textAlign: 'center',
        }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 0 28px rgba(16,185,129,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Send size={26} color="#fff" />
          </div>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#f1f5f9' }}>No approvals yet</h3>
          <p style={{ margin: '10px auto 0', fontSize: 13, color: 'rgba(148,163,184,0.7)', maxWidth: 340, lineHeight: 1.6 }}>
            Send posts for client approval from the Scheduler. Clients receive an email with a review link — no login needed.
          </p>
        </div>
      ) : (
        /* ── Approval list ────────────────────────────────────────── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(approval => {
            const sMeta = STATUS_META[approval.status] || STATUS_META.PENDING;
            const StatusIcon = sMeta.icon;
            const platform = approval.post?.socialAccount?.platform;
            const isHovered = hoveredCard === approval.id;
            return (
              <div
                key={approval.id}
                onMouseEnter={() => setHoveredCard(approval.id)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  background: 'linear-gradient(135deg,#0f172a 0%,#1a2540 100%)',
                  border: isHovered ? `1px solid rgba(255,255,255,0.12)` : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 18, padding: '18px 20px',
                  transition: 'all 0.2s',
                  transform: isHovered ? 'translateY(-1px)' : 'none',
                  boxShadow: isHovered ? `0 4px 24px ${sMeta.cardGlow}` : 'none',
                  position: 'relative', overflow: 'hidden',
                }}
              >
                {/* Status glow pulse on left edge */}
                <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, borderRadius: '0 3px 3px 0', background: sMeta.textColor, boxShadow: `0 0 8px ${sMeta.glow}`, opacity: 0.8 }} />

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, paddingLeft: 8 }}>
                  <PlatformIcon platform={platform || ''} size="md" glow />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{approval.clientName}</span>
                      <span style={{ fontSize: 11, color: 'rgba(148,163,184,0.6)' }}>{approval.clientEmail}</span>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '4px 10px', borderRadius: 99,
                        background: sMeta.bg, flexShrink: 0,
                      }}>
                        <StatusIcon size={11} color={sMeta.textColor} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: sMeta.textColor }}>{sMeta.label}</span>
                      </span>
                    </div>

                    <p style={{ margin: 0, fontSize: 13, color: 'rgba(148,163,184,0.75)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {approval.post?.content?.slice(0, 160)}
                    </p>

                    {approval.revisionNote && (
                      <div style={{
                        marginTop: 10, padding: '10px 14px',
                        background: 'rgba(239,68,68,0.08)',
                        border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: 12,
                      }}>
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#f87171', marginBottom: 3 }}>Client revision note:</p>
                        <p style={{ margin: 0, fontSize: 12, color: '#fca5a5', lineHeight: 1.5 }}>{approval.revisionNote}</p>
                      </div>
                    )}

                    <p style={{ margin: '10px 0 0', fontSize: 11, color: 'rgba(148,163,184,0.5)' }}>
                      Sent {formatDate(approval.createdAt)}
                      {approval.respondedAt && (
                        <span style={{ color: sMeta.textColor }}> · Responded {formatDate(approval.respondedAt)}</span>
                      )}
                    </p>
                  </div>

                  <button
                    onClick={() => copyLink(approval.token)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 14px', borderRadius: 10,
                      background: copied === approval.token ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.06)',
                      border: copied === approval.token ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.08)',
                      color: copied === approval.token ? '#34d399' : '#94a3b8',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                      transition: 'all 0.2s',
                    }}
                  >
                    <ExternalLink size={12} />
                    {copied === approval.token ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
