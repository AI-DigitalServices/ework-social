'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import {
  MessageSquare, CheckCircle, RefreshCw, Send, Sparkles,
  Tag, Users, Link2, X, ChevronDown, Search, Plus,
  Inbox, Zap, Instagram, Twitter, Facebook, AtSign, Linkedin,
  Clock, TrendingUp, Eye, ArrowRight,
} from 'lucide-react';

/* ─────────────── platform config ───────────────────────────── */

const PLATFORM: Record<string, { gradient: string; glow: string; dot: string; icon: React.ReactNode; label: string }> = {
  INSTAGRAM: {
    gradient: 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
    glow: 'rgba(225,48,108,0.35)',
    dot: '#E1306C',
    icon: <Instagram size={10} />,
    label: 'Instagram',
  },
  FACEBOOK: {
    gradient: 'linear-gradient(135deg, #1877F2, #0a5bd4)',
    glow: 'rgba(24,119,242,0.35)',
    dot: '#1877F2',
    icon: <Facebook size={10} />,
    label: 'Facebook',
  },
  TWITTER: {
    gradient: 'linear-gradient(135deg, #1DA1F2, #0d8bd9)',
    glow: 'rgba(29,161,242,0.35)',
    dot: '#1DA1F2',
    icon: <Twitter size={10} />,
    label: 'X / Twitter',
  },
  THREADS: {
    gradient: 'linear-gradient(135deg, #333, #111)',
    glow: 'rgba(0,0,0,0.3)',
    dot: '#333',
    icon: <AtSign size={10} />,
    label: 'Threads',
  },
  LINKEDIN: {
    gradient: 'linear-gradient(135deg, #0077B5, #005885)',
    glow: 'rgba(0,119,181,0.35)',
    dot: '#0077B5',
    icon: <Linkedin size={10} />,
    label: 'LinkedIn',
  },
};

const TAG_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  'Lead':        { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)',  text: '#3B82F6', dot: '#3B82F6' },
  'VIP Client':  { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)',  text: '#D97706', dot: '#F59E0B' },
  'Support':     { bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.3)',  text: '#7C3AED', dot: '#8B5CF6' },
  'Opportunity': { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)',  text: '#059669', dot: '#10B981' },
  'Spam':        { bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.3)',   text: '#DC2626', dot: '#EF4444' },
  'Follow Up':   { bg: 'rgba(236,72,153,0.12)', border: 'rgba(236,72,153,0.3)',  text: '#DB2777', dot: '#EC4899' },
};

const AVAILABLE_TAGS = Object.keys(TAG_COLORS);

function formatTime(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h`;
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}

/* ─────────────── shimmer skeleton ──────────────────────────── */

function Shimmer({ w, h, r = 8 }: { w: string | number; h: number; r?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
    }} />
  );
}

function SkeletonCard() {
  return (
    <div style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', gap: 12 }}>
      <Shimmer w={40} h={40} r={20} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <Shimmer w={90} h={12} />
          <Shimmer w={56} h={12} r={20} />
        </div>
        <Shimmer w="80%" h={11} />
        <Shimmer w="45%" h={10} r={20} />
      </div>
    </div>
  );
}

/* ─────────────── empty state ────────────────────────────────── */

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 40, textAlign: 'center' }}>
      {/* Animated rings */}
      <div style={{ position: 'relative', width: 100, height: 100, marginBottom: 28 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '2px solid',
            borderColor: i === 0 ? 'rgba(99,102,241,0.5)' : i === 1 ? 'rgba(139,92,246,0.3)' : 'rgba(167,139,250,0.15)',
            animation: `ping ${1.4 + i * 0.4}s ease-out infinite`,
            animationDelay: `${i * 0.3}s`,
          }} />
        ))}
        <div style={{
          position: 'absolute', inset: '50%', transform: 'translate(-50%,-50%)',
          width: 56, height: 56, borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
        }}>
          <Inbox size={24} color="#fff" />
        </div>
      </div>

      <h3 style={{ fontSize: 17, fontWeight: 800, color: '#1E293B', marginBottom: 8 }}>
        {filtered ? 'No messages match' : 'Your inbox is ready'}
      </h3>
      <p style={{ fontSize: 13, color: '#94A3B8', maxWidth: 240, lineHeight: 1.6, marginBottom: 20 }}>
        {filtered
          ? 'Try adjusting your filters or search to find what you\'re looking for.'
          : 'Messages from Instagram, Facebook, Twitter, and LinkedIn will appear here the moment they arrive.'}
      </p>

      {!filtered && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          {['Instagram', 'Facebook', 'X / Twitter', 'LinkedIn'].map((p, i) => {
            const colors = [
              'linear-gradient(135deg, #f09433, #dc2743, #bc1888)',
              'linear-gradient(135deg, #1877F2, #0a5bd4)',
              'linear-gradient(135deg, #1DA1F2, #0d8bd9)',
              'linear-gradient(135deg, #0077B5, #005885)',
            ];
            return (
              <div key={p} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 999,
                background: colors[i], color: '#fff',
                fontSize: 11, fontWeight: 700,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                animation: `float ${2 + i * 0.3}s ease-in-out infinite alternate`,
                animationDelay: `${i * 0.2}s`,
              }}>
                <Zap size={10} /> {p}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─────────────── no-thread-selected state ───────────────────── */

function NoThreadSelected() {
  const tips = [
    { icon: <Tag size={16} />, text: 'Tag conversations as Lead, VIP, or Support', color: '#3B82F6' },
    { icon: <Link2 size={16} />, text: 'Link messages directly to CRM contacts', color: '#10B981' },
    { icon: <Sparkles size={16} />, text: 'Get AI-suggested replies in one click', color: '#8B5CF6' },
    { icon: <Users size={16} />, text: 'Assign threads to team members', color: '#F59E0B' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 48 }}>
      {/* Hero icon */}
      <div style={{
        width: 80, height: 80, borderRadius: 24,
        background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #EC4899 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 24, boxShadow: '0 16px 48px rgba(99,102,241,0.35)',
        animation: 'float 3s ease-in-out infinite alternate',
      }}>
        <MessageSquare size={36} color="#fff" />
      </div>

      <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1E293B', marginBottom: 8 }}>
        Select a conversation
      </h3>
      <p style={{ fontSize: 13, color: '#94A3B8', marginBottom: 32, textAlign: 'center', maxWidth: 280, lineHeight: 1.6 }}>
        Click any message on the left to open the thread, reply, tag it, or connect it to your CRM.
      </p>

      {/* Feature tip cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 320 }}>
        {tips.map((tip, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 16px', borderRadius: 14,
            background: '#FAFBFF',
            border: '1px solid #EEF2FF',
            animation: `slideUp 0.4s ease both`,
            animationDelay: `${i * 0.08}s`,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: `${tip.color}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: tip.color, flexShrink: 0,
            }}>
              {tip.icon}
            </div>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#475569', lineHeight: 1.4 }}>{tip.text}</p>
            <ArrowRight size={12} color="#CBD5E1" style={{ marginLeft: 'auto', flexShrink: 0 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────── platform badge ─────────────────────────────── */

function PlatformBadge({ platform }: { platform: string }) {
  const p = PLATFORM[platform];
  if (!p) return <span style={{ fontSize: 10, fontWeight: 700, background: '#E2E8F0', color: '#64748B', padding: '2px 8px', borderRadius: 999 }}>{platform}</span>;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: p.gradient, color: '#fff',
      fontSize: 10, fontWeight: 700, padding: '2px 9px',
      borderRadius: 999, letterSpacing: 0.2, boxShadow: `0 2px 6px ${p.glow}`,
    }}>
      {p.icon} {p.label}
    </span>
  );
}

/* ─────────────── avatar ─────────────────────────────────────── */

function Avatar({ name, platform, size = 40 }: { name?: string; platform: string; size?: number }) {
  const p = PLATFORM[platform];
  const initial = (name || '?').charAt(0).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2,
      background: p?.gradient || 'linear-gradient(135deg, #6366F1, #8B5CF6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: size * 0.35, fontWeight: 800,
      flexShrink: 0, boxShadow: `0 4px 12px ${p?.glow || 'rgba(99,102,241,0.3)'}`,
      position: 'relative',
    }}>
      {initial}
      {/* Platform dot */}
      <div style={{
        position: 'absolute', bottom: 0, right: 0,
        width: size * 0.3, height: size * 0.3, borderRadius: '50%',
        background: p?.dot || '#6366F1',
        border: '2px solid #fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.12,
      }} />
    </div>
  );
}

/* ─────────────── tag chip ───────────────────────────────────── */

function TagChip({ tag, onRemove }: { tag: string; onRemove?: () => void }) {
  const c = TAG_COLORS[tag] || { bg: '#f1f5f9', border: '#e2e8f0', text: '#64748b', dot: '#94a3b8' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: c.bg, border: `1px solid ${c.border}`,
      color: c.text, fontSize: 10, fontWeight: 700,
      padding: '3px 9px', borderRadius: 999,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      {tag}
      {onRemove && (
        <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text, padding: 0, lineHeight: 1, opacity: 0.7 }}>×</button>
      )}
    </span>
  );
}

/* ─────────────── message card ───────────────────────────────── */

function MessageCard({ msg, isSelected, onClick }: { msg: any; isSelected: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const p = PLATFORM[msg.platform];
  const unread = !msg.isRead;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '14px 16px',
        cursor: 'pointer',
        background: isSelected
          ? 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.06) 100%)'
          : hovered ? '#FAFBFF' : unread ? 'rgba(99,102,241,0.03)' : '#fff',
        borderLeft: `3px solid ${isSelected ? '#6366F1' : unread ? (p?.dot || '#6366F1') : 'transparent'}`,
        borderBottom: '1px solid #F1F5F9',
        transition: 'all 0.15s ease',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ position: 'relative' }}>
          <Avatar name={msg.senderName} platform={msg.platform} size={40} />
          {unread && (
            <div style={{
              position: 'absolute', top: -2, right: -2,
              width: 10, height: 10, borderRadius: '50%',
              background: p?.dot || '#6366F1',
              border: '2px solid #fff',
              animation: 'pulseGlow 2s infinite',
            }} />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontWeight: unread ? 800 : 600, fontSize: 13, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>
              {msg.senderName || 'Unknown'}
            </span>
            <span style={{ fontSize: 11, color: '#94A3B8', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3 }}>
              <Clock size={9} /> {formatTime(msg.createdAt)}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <PlatformBadge platform={msg.platform} />
            {msg.type === 'COMMENT' && (
              <span style={{ fontSize: 10, background: '#FEF3C7', color: '#D97706', padding: '1px 7px', borderRadius: 999, fontWeight: 700 }}>Comment</span>
            )}
          </div>

          <p style={{ fontSize: 12, color: unread ? '#334155' : '#64748B', fontWeight: unread ? 500 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.4, marginBottom: 6 }}>
            {msg.content}
          </p>

          {/* Tags + CRM badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
            {msg.tags?.slice(0, 2).map((t: string) => <TagChip key={t} tag={t} />)}
            {msg.crmClient && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#059669', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', padding: '2px 7px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Link2 size={9} /> {msg.crmClient.name}
              </span>
            )}
            {msg.isResolved && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: 3 }}>
                <CheckCircle size={9} /> Done
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Hover slide-in arrow */}
      {(hovered || isSelected) && (
        <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', opacity: isSelected ? 1 : 0.4 }}>
          <ArrowRight size={14} color={isSelected ? '#6366F1' : '#94A3B8'} />
        </div>
      )}
    </div>
  );
}

/* ─────────────── stat card ──────────────────────────────────── */

function StatCard({ label, value, icon, gradient, sub }: { label: string; value: number; icon: React.ReactNode; gradient: string; sub?: string }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 16, padding: '16px 18px',
      border: '1px solid #EEF2FF',
      boxShadow: '0 2px 12px rgba(99,102,241,0.06)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* BG glow blob */}
      <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: gradient, opacity: 0.1 }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 28, fontWeight: 900, color: '#1E293B', letterSpacing: '-1.5px', lineHeight: 1 }}>{value.toLocaleString()}</p>
          <p style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, marginTop: 4 }}>{label}</p>
          {sub && <p style={{ fontSize: 10, color: '#CBD5E1', marginTop: 2 }}>{sub}</p>}
        </div>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', flexShrink: 0,
          boxShadow: `0 4px 14px rgba(0,0,0,0.15)`,
        }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

/* ─────────────── tag picker ─────────────────────────────────── */

function TagPicker({ currentTags, onSave }: { currentTags: string[]; onSave: (tags: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(currentTags);
  useEffect(() => setSelected(currentTags), [currentTags]);
  const toggle = (t: string) => setSelected(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  const save = () => { onSave(selected); setOpen(false); };

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(v => !v)} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 12px', borderRadius: 10,
        border: '1.5px solid #E2E8F0', background: '#FAFBFF',
        color: '#64748B', fontSize: 11, fontWeight: 700, cursor: 'pointer',
        transition: 'all 0.15s',
      }}>
        <Tag size={12} /> Tags <ChevronDown size={10} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100,
          background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0',
          boxShadow: '0 16px 48px rgba(0,0,0,0.12)', padding: 10, minWidth: 185,
          animation: 'dropIn 0.15s ease',
        }}>
          <p style={{ fontSize: 10, fontWeight: 800, color: '#94A3B8', padding: '4px 8px 8px', letterSpacing: 1, textTransform: 'uppercase' }}>Apply Tags</p>
          {AVAILABLE_TAGS.map(tag => {
            const c = TAG_COLORS[tag];
            const active = selected.includes(tag);
            return (
              <button key={tag} onClick={() => toggle(tag)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 10, border: 'none',
                background: active ? c.bg : 'none', cursor: 'pointer',
                transition: 'all 0.12s',
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: active ? c.text : '#475569', flex: 1, textAlign: 'left' }}>{tag}</span>
                {active && <CheckCircle size={12} style={{ color: c.dot }} />}
              </button>
            );
          })}
          <div style={{ borderTop: '1px solid #F1F5F9', marginTop: 8, paddingTop: 8, display: 'flex', gap: 8 }}>
            <button onClick={save} style={{ flex: 1, padding: '8px', borderRadius: 9, background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Save</button>
            <button onClick={() => setOpen(false)} style={{ padding: '8px 12px', borderRadius: 9, background: '#F1F5F9', color: '#64748B', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────── CRM link picker ────────────────────────────── */

function CrmLinkPicker({ currentClient, workspaceId, messageId, onLinked, onCreateNew }: {
  currentClient: any; workspaceId: string; messageId: string;
  onLinked: (c: any) => void; onCreateNew: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const r = await api.get('/inbox/clients', { params: { workspaceId } }); setClients(r.data || []); } catch {}
    setLoading(false);
  };

  const link = async (clientId: string | null) => {
    const r = await api.patch(`/inbox/${messageId}/crm-link`, { workspaceId, clientId });
    onLinked(r.data?.crmClient || null); setOpen(false);
  };

  const filtered = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => { setOpen(v => !v); if (!open) load(); }} style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 10,
        border: currentClient ? '1.5px solid rgba(16,185,129,0.4)' : '1.5px solid #E2E8F0',
        background: currentClient ? 'rgba(16,185,129,0.08)' : '#FAFBFF',
        color: currentClient ? '#059669' : '#64748B',
        fontSize: 11, fontWeight: 700, cursor: 'pointer',
      }}>
        <Link2 size={12} /> {currentClient ? currentClient.name : 'Link to CRM'}
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100,
          background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0',
          boxShadow: '0 16px 48px rgba(0,0,0,0.12)', padding: 12, width: 250,
          animation: 'dropIn 0.15s ease',
        }}>
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients..." autoFocus
              style={{ width: '100%', paddingLeft: 30, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: '1.5px solid #E2E8F0', borderRadius: 9, fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ maxHeight: 160, overflowY: 'auto' }}>
            {loading ? <p style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', padding: '12px 0' }}>Loading...</p>
              : filtered.length === 0 ? <p style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', padding: '12px 0' }}>No clients found</p>
              : filtered.map(c => (
                <button key={c.id} onClick={() => link(c.id)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 6px', borderRadius: 9, border: 'none', background: 'none', cursor: 'pointer',
                }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {c.name.charAt(0)}
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#1E293B' }}>{c.name}</p>
                    <p style={{ fontSize: 10, color: '#94A3B8' }}>{c.stage}</p>
                  </div>
                </button>
              ))}
          </div>
          <div style={{ borderTop: '1px solid #F1F5F9', marginTop: 8, paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button onClick={() => { onCreateNew(); setOpen(false); }} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
              borderRadius: 9, border: '1.5px dashed rgba(16,185,129,0.4)',
              background: 'rgba(16,185,129,0.05)', color: '#059669', fontWeight: 700, fontSize: 12, cursor: 'pointer',
            }}>
              <Plus size={12} /> Create new CRM contact
            </button>
            {currentClient && (
              <button onClick={() => link(null)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 9, border: 'none', background: 'rgba(239,68,68,0.06)', color: '#DC2626', fontWeight: 600, fontSize: 11, cursor: 'pointer' }}>
                <X size={11} /> Unlink
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────── assign picker ──────────────────────────────── */

function AssignPicker({ currentAssignee, workspaceId, messageId, onAssigned }: {
  currentAssignee: any; workspaceId: string; messageId: string; onAssigned: (u: any) => void;
}) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const load = async () => { try { const r = await api.get('/inbox/members', { params: { workspaceId } }); setMembers(r.data || []); } catch {} };
  const assign = async (userId: string | null) => { const r = await api.patch(`/inbox/${messageId}/assign`, { workspaceId, userId }); onAssigned(r.data?.assignedTo || null); setOpen(false); };

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => { setOpen(v => !v); if (!open) load(); }} style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 10,
        border: currentAssignee ? '1.5px solid rgba(139,92,246,0.4)' : '1.5px solid #E2E8F0',
        background: currentAssignee ? 'rgba(139,92,246,0.08)' : '#FAFBFF',
        color: currentAssignee ? '#7C3AED' : '#64748B',
        fontSize: 11, fontWeight: 700, cursor: 'pointer',
      }}>
        <Users size={12} /> {currentAssignee ? currentAssignee.name.split(' ')[0] : 'Assign'}
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100,
          background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0',
          boxShadow: '0 16px 48px rgba(0,0,0,0.12)', padding: 10, minWidth: 190,
          animation: 'dropIn 0.15s ease',
        }}>
          {members.length === 0
            ? <p style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', padding: '12px 0' }}>No team members yet</p>
            : members.map(m => (
              <button key={m.id} onClick={() => assign(m.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px', borderRadius: 9, border: 'none', background: 'none', cursor: 'pointer' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#8B5CF6,#EC4899)', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {m.name?.charAt(0)}
                </div>
                <div style={{ textAlign: 'left', flex: 1 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#1E293B' }}>{m.name}</p>
                  <p style={{ fontSize: 10, color: '#94A3B8' }}>{m.email}</p>
                </div>
                {currentAssignee?.id === m.id && <CheckCircle size={12} style={{ color: '#8B5CF6' }} />}
              </button>
            ))}
          {currentAssignee && (
            <button onClick={() => assign(null)} style={{ width: '100%', marginTop: 6, padding: '7px', borderRadius: 9, border: 'none', background: 'rgba(239,68,68,0.06)', color: '#DC2626', fontWeight: 600, fontSize: 11, cursor: 'pointer' }}>Unassign</button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────── global keyframes injected once ─────────────── */

const STYLES = `
@keyframes shimmer { from { background-position: 200% 0 } to { background-position: -200% 0 } }
@keyframes ping { 0% { transform: scale(1); opacity: 0.6 } 100% { transform: scale(2.4); opacity: 0 } }
@keyframes pulseGlow { 0%,100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.5) } 50% { box-shadow: 0 0 0 5px rgba(99,102,241,0) } }
@keyframes float { from { transform: translateY(0) } to { transform: translateY(-6px) } }
@keyframes slideUp { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }
@keyframes dropIn { from { opacity: 0; transform: translateY(-6px) scale(0.97) } to { opacity: 1; transform: translateY(0) scale(1) } }
@keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
@keyframes liveBlip { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(0.85)} }
`;

/* ─────────────── main page ──────────────────────────────────── */

export default function InboxPage() {
  const { workspace } = useAuthStore();
  const [messages, setMessages]   = useState<any[]>([]);
  const [stats, setStats]         = useState<any>({});
  const [selected, setSelected]   = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [replying, setReplying]   = useState(false);
  const [hiding, setHiding]       = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPostComment, setShowPostComment] = useState(false);
  const [recentMedia, setRecentMedia] = useState<any[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [selectedMediaId, setSelectedMediaId] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [search, setSearch]       = useState('');
  const [activeTab, setActiveTab] = useState('all'); // all | unread | needsReply | assigned | resolved
  const [filter, setFilter]       = useState({ platform: '', type: '', tag: '' });
  const [toast, setToast]         = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const replyRef = useRef<HTMLTextAreaElement>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadMessages = useCallback(async () => {
    if (!workspace?.id) return;
    try {
      const params: any = { workspaceId: workspace.id };
      if (filter.platform) params.platform = filter.platform;
      if (filter.type) params.type = filter.type;
      if (filter.tag) params.tag = filter.tag;
      if (search) params.search = search;
      // Tab drives isResolved + isRead filters
      if (activeTab === 'resolved') {
        params.isResolved = 'true';
      } else if (activeTab === 'unread' || activeTab === 'needsReply') {
        params.isResolved = 'false'; params.isRead = 'false';
      } else {
        params.isResolved = 'false'; // 'all' and 'assigned' both show open conversations
      }
      const [msgRes, statsRes] = await Promise.all([
        api.get('/inbox', { params }),
        api.get('/inbox/stats', { params: { workspaceId: workspace.id } }),
      ]);
      setMessages(msgRes.data.messages || []);
      setStats(statsRes.data || {});
      setLastRefresh(new Date());
    } catch (err) { console.error('Inbox load error:', err); }
    finally { setLoading(false); }
  }, [workspace?.id, filter, search, activeTab]);

  useEffect(() => { setLoading(true); loadMessages(); }, [loadMessages]);
  useEffect(() => { const i = setInterval(loadMessages, 30000); return () => clearInterval(i); }, [loadMessages]);

  const selectMessage = async (msg: any) => {
    setSelected(msg); setReplyText('');
    if (!msg.isRead) {
      await api.patch(`/inbox/${msg.id}/read?workspaceId=${workspace?.id}`);
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m));
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selected) return;
    setReplying(true);
    try {
      const res = await api.post(`/inbox/${selected.id}/reply`, { workspaceId: workspace?.id, content: replyText });
      const newReply = { id: Date.now().toString(), content: replyText, sentAt: new Date().toISOString(), isAuto: false };
      setSelected((p: any) => ({ ...p, isRead: true, replies: [...(p.replies || []), newReply] }));
      setMessages(prev => prev.map(m => m.id === selected.id ? { ...m, isRead: true } : m));
      setReplyText('');
      showToast('Reply sent ✓');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to send reply', 'error');
    } finally { setReplying(false); }
  };

  const handleReopen = async (msg: any) => {
    await api.patch(`/inbox/${msg.id}/resolve?workspaceId=${workspace?.id}`, { isResolved: false });
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isResolved: false } : m));
    if (selected?.id === msg.id) setSelected((p: any) => ({ ...p, isResolved: false }));
    showToast('Conversation reopened ✓');
  };

  const handleSuggest = async () => {
    if (!selected) return;
    setSuggesting(true);
    try {
      const res = await api.post(`/inbox/${selected.id}/suggest?workspaceId=${workspace?.id}`);
      setReplyText(res.data.suggestion);
      replyRef.current?.focus();
    } catch { showToast('AI suggestion failed', 'error'); }
    finally { setSuggesting(false); }
  };

  const handleHide = async (msg: any, hidden: boolean) => {
    setHiding(true);
    try {
      await api.patch(`/inbox/${msg.id}/hide`, { workspaceId: workspace?.id, hidden });
      setSelected((p: any) => ({ ...p, hidden }));
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, hidden } : m));
      showToast(hidden ? 'Comment hidden ✓' : 'Comment unhidden ✓');
    } catch (err) {
      showToast('Failed to update comment visibility');
    } finally { setHiding(false); }
  };

  const handleDelete = async (msg: any) => {
    setDeleting(true);
    try {
      await api.delete(`/inbox/${msg.id}`, { params: { workspaceId: workspace?.id } });
      setMessages(prev => prev.filter(m => m.id !== msg.id));
      setSelected(null);
      setShowDeleteConfirm(false);
      showToast('Comment deleted ✓');
    } catch (err) {
      showToast('Failed to delete comment');
    } finally { setDeleting(false); }
  };

  const handleResolve = async (msg: any) => {
    await api.patch(`/inbox/${msg.id}/resolve?workspaceId=${workspace?.id}`);
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isResolved: true } : m));
    if (selected?.id === msg.id) setSelected((p: any) => ({ ...p, isResolved: true }));
    showToast('Marked as resolved ✓');
  };

  const handleTagsSave = async (tags: string[]) => {
    if (!selected) return;
    await api.patch(`/inbox/${selected.id}/tags`, { workspaceId: workspace?.id, tags });
    setSelected((p: any) => ({ ...p, tags }));
    setMessages(prev => prev.map(m => m.id === selected.id ? { ...m, tags } : m));
    showToast('Tags updated ✓');
  };

  const handleCrmLinked = (crmClient: any) => {
    setSelected((p: any) => ({ ...p, crmClient }));
    setMessages(prev => prev.map(m => m.id === selected?.id ? { ...m, crmClient } : m));
    showToast(crmClient ? `Linked to ${crmClient.name} ✓` : 'CRM link removed');
  };

  const handleCreateCrm = async () => {
    if (!selected) return;
    try {
      const res = await api.post(`/inbox/${selected.id}/create-crm-contact`, { workspaceId: workspace?.id });
      const c = { id: res.data.id, name: res.data.name, stage: res.data.stage };
      setSelected((p: any) => ({ ...p, crmClient: c }));
      setMessages(prev => prev.map(m => m.id === selected.id ? { ...m, crmClient: c } : m));
      showToast(`CRM contact "${res.data.name}" created ✓`);
    } catch { showToast('Failed to create CRM contact', 'error'); }
  };

  const openPostComment = async () => {
    setShowPostComment(true);
    setSelectedMediaId('');
    setNewCommentText('');
    setMediaLoading(true);
    try {
      const res = await api.get('/inbox/recent-media', { params: { workspaceId: workspace?.id } });
      setRecentMedia(res.data || []);
    } catch { showToast('Could not load recent posts', 'error'); }
    finally { setMediaLoading(false); }
  };

  const handlePostComment = async () => {
    if (!selectedMediaId || !newCommentText.trim()) return;
    setPostingComment(true);
    try {
      await api.post('/inbox/post-comment', {
        workspaceId: workspace?.id,
        mediaId: selectedMediaId,
        content: newCommentText.trim(),
      });
      setShowPostComment(false);
      setNewCommentText('');
      setSelectedMediaId('');
      showToast('Comment posted to Instagram ✓');
      setLoading(true);
      loadMessages();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to post comment', 'error');
    } finally { setPostingComment(false); }
  };

  const handleAssigned = (assignedTo: any) => {
    setSelected((p: any) => ({ ...p, assignedTo }));
    setMessages(prev => prev.map(m => m.id === selected?.id ? { ...m, assignedTo } : m));
    showToast(assignedTo ? `Assigned to ${assignedTo.name} ✓` : 'Unassigned');
  };

  const isFiltered = !!(filter.platform || filter.type || filter.tag || search || activeTab !== 'all');

  // Client-side secondary filtering for tabs that need it
  const displayMessages = activeTab === 'assigned'
    ? messages.filter((m: any) => m.assignedTo !== null)
    : activeTab === 'needsReply'
    ? messages.filter((m: any) => !m.replies || m.replies.length === 0)
    : messages;

  const STATS = [
    { label: 'Total Messages', value: stats.total || 0, icon: <Inbox size={16} />, gradient: 'linear-gradient(135deg,#6366F1,#8B5CF6)' },
    { label: 'Unread', value: stats.unread || 0, icon: <Eye size={16} />, gradient: 'linear-gradient(135deg,#F59E0B,#EF4444)', sub: 'needs attention' },
    { label: 'DMs', value: stats.dms || 0, icon: <MessageSquare size={16} />, gradient: 'linear-gradient(135deg,#8B5CF6,#EC4899)' },
    { label: 'Comments', value: stats.comments || 0, icon: <TrendingUp size={16} />, gradient: 'linear-gradient(135deg,#10B981,#0EA5E9)' },
  ];

  return (
    <>
      <style>{STYLES}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          background: toast.type === 'success' ? 'linear-gradient(135deg,#10B981,#059669)' : 'linear-gradient(135deg,#EF4444,#DC2626)',
          color: '#fff', padding: '12px 20px', borderRadius: 14,
          fontWeight: 700, fontSize: 13,
          boxShadow: `0 8px 32px ${toast.type === 'success' ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)'}`,
          animation: 'slideUp 0.2s ease',
        }}>
          {toast.msg}
        </div>
      )}

      {/* ── Post Comment Modal ─────────────────────────────────────────────── */}
      {showPostComment && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.15s ease',
        }} onClick={e => { if (e.target === e.currentTarget) setShowPostComment(false); }}>
          <div style={{
            background: '#fff', borderRadius: 20, width: 560, maxWidth: '95vw',
            boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
            animation: 'slideUp 0.2s ease',
            overflow: 'hidden',
          }}>
            {/* Modal header */}
            <div style={{
              padding: '20px 24px 16px',
              background: 'linear-gradient(135deg,#6366F1,#8B5CF6)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <h3 style={{ color: '#fff', fontSize: 17, fontWeight: 800, margin: 0 }}>Post Comment on Instagram</h3>
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, margin: '4px 0 0' }}>Select a post, write your comment, then manage it from the hub</p>
              </div>
              <button onClick={() => setShowPostComment(false)} style={{
                background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8,
                color: '#fff', cursor: 'pointer', padding: '6px 10px', fontSize: 16, fontWeight: 700,
              }}>✕</button>
            </div>

            <div style={{ padding: '20px 24px' }}>
              {/* Post selector */}
              <p style={{ fontSize: 12, fontWeight: 800, color: '#475569', marginBottom: 12, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                1. Select a Post
              </p>
              {mediaLoading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 20 }}>
                  {Array.from({ length: 8 }).map((_, i) => <Shimmer key={i} w="100%" h={80} r={10} />)}
                </div>
              ) : recentMedia.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#94A3B8', fontSize: 13, marginBottom: 20 }}>
                  No recent posts found. Make sure your Instagram account is connected.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 20 }}>
                  {recentMedia.map((m: any) => (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMediaId(m.id)}
                      style={{
                        borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
                        border: selectedMediaId === m.id ? '3px solid #6366F1' : '2px solid transparent',
                        boxShadow: selectedMediaId === m.id ? '0 0 0 2px rgba(99,102,241,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
                        transition: 'all 0.15s',
                        position: 'relative',
                      }}
                    >
                      <img
                        src={m.thumbnail_url || m.media_url}
                        alt={m.caption || m.id}
                        style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }}
                        onError={(e: any) => { e.target.style.display = 'none'; }}
                      />
                      {selectedMediaId === m.id && (
                        <div style={{
                          position: 'absolute', inset: 0, background: 'rgba(99,102,241,0.25)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <CheckCircle size={22} color="#fff" />
                        </div>
                      )}
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        background: 'linear-gradient(transparent,rgba(0,0,0,0.6))',
                        padding: '12px 6px 4px', fontSize: 9, color: '#fff', fontWeight: 600,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {m.caption?.slice(0, 30) || m.media_type}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Comment text */}
              <p style={{ fontSize: 12, fontWeight: 800, color: '#475569', marginBottom: 10, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                2. Write Your Comment
              </p>
              <textarea
                value={newCommentText}
                onChange={e => setNewCommentText(e.target.value)}
                placeholder="Type your comment here..."
                rows={3}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 12,
                  border: '1.5px solid #E2E8F0', fontSize: 14, color: '#1E293B',
                  resize: 'none', outline: 'none', lineHeight: 1.6,
                  background: '#FAFBFF', fontFamily: 'inherit', boxSizing: 'border-box',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => { e.target.style.borderColor = '#6366F1'; }}
                onBlur={e => { e.target.style.borderColor = '#E2E8F0'; }}
              />

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowPostComment(false)} style={{
                  padding: '10px 20px', borderRadius: 12,
                  border: '1.5px solid #E2E8F0', background: '#fff',
                  color: '#64748B', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                }}>Cancel</button>
                <button
                  onClick={handlePostComment}
                  disabled={postingComment || !selectedMediaId || !newCommentText.trim()}
                  style={{
                    padding: '10px 24px', borderRadius: 12, border: 'none',
                    background: (selectedMediaId && newCommentText.trim()) ? 'linear-gradient(135deg,#6366F1,#8B5CF6)' : '#E2E8F0',
                    color: (selectedMediaId && newCommentText.trim()) ? '#fff' : '#94A3B8',
                    fontWeight: 800, fontSize: 13, cursor: (selectedMediaId && newCommentText.trim()) ? 'pointer' : 'not-allowed',
                    boxShadow: (selectedMediaId && newCommentText.trim()) ? '0 4px 14px rgba(99,102,241,0.4)' : 'none',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  <Instagram size={14} />
                  {postingComment ? 'Posting...' : 'Post Comment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexShrink: 0 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'linear-gradient(135deg,#6366F1,#8B5CF6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
              }}>
                <Inbox size={18} color="#fff" />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E293B', letterSpacing: '-0.5px' }}>Engagement Hub</h2>
              {/* Live dot */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 999, padding: '3px 10px' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', animation: 'liveBlip 1.5s infinite' }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#059669' }}>LIVE</span>
              </div>
            </div>
            <p style={{ fontSize: 12, color: '#94A3B8' }}>
              All DMs & comments unified · refreshed {formatTime(lastRefresh.toISOString())}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={openPostComment}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 18px', borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg,#6366F1,#8B5CF6)',
                color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
              }}
            >
              <Plus size={14} /> Post Comment
            </button>
            <button
              onClick={() => { setLoading(true); loadMessages(); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 16px', borderRadius: 12,
                border: '1.5px solid #E2E8F0', background: '#fff',
                color: '#64748B', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16, flexShrink: 0 }}>
          {STATS.map(s => <StatCard key={s.label} {...s} />)}
        </div>

        {/* ── v2 Filter tabs ────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexShrink: 0, overflowX: 'auto', paddingBottom: 2 }}>
          {([
            { id: 'all',        label: 'All',         count: null },
            { id: 'unread',     label: 'Unread',      count: stats.unread || 0 },
            { id: 'needsReply', label: 'Needs Reply', count: null },
            { id: 'assigned',   label: 'Assigned',    count: null },
            { id: 'resolved',   label: 'Resolved',    count: stats.resolved || 0 },
          ] as { id: string; label: string; count: number | null }[]).map(tab => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 16px', borderRadius: 999, whiteSpace: 'nowrap',
                  border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                  transition: 'all 0.15s ease',
                  background: active
                    ? 'linear-gradient(135deg, #6366F1, #8B5CF6)'
                    : '#F1F5F9',
                  color: active ? '#fff' : '#64748B',
                  boxShadow: active ? '0 4px 12px rgba(99,102,241,0.35)' : 'none',
                }}
              >
                {tab.label}
                {tab.count !== null && tab.count > 0 && (
                  <span style={{
                    background: active ? 'rgba(255,255,255,0.25)' : 'rgba(99,102,241,0.12)',
                    color: active ? '#fff' : '#6366F1',
                    fontSize: 10, fontWeight: 800,
                    padding: '1px 7px', borderRadius: 999,
                    minWidth: 18, textAlign: 'center',
                  }}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Filter dropdowns row ──────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', flexShrink: 0 }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations..."
              style={{
                paddingLeft: 34, paddingRight: 14, paddingTop: 9, paddingBottom: 9,
                border: '1.5px solid #E2E8F0', borderRadius: 12, fontSize: 13,
                color: '#334155', background: '#fff', outline: 'none',
                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                width: 210,
              }}
            />
          </div>

          {[
            { key: 'platform', opts: [['', 'All Platforms'], ['INSTAGRAM', '📷 Instagram'], ['FACEBOOK', '📘 Facebook'], ['TWITTER', '𝕏 Twitter'], ['LINKEDIN', '💼 LinkedIn'], ['THREADS', '🧵 Threads']] },
            { key: 'type',     opts: [['', 'All Types'], ['DM', '💬 DMs'], ['COMMENT', '💭 Comments']] },
            { key: 'tag',      opts: [['', 'All Tags'], ...AVAILABLE_TAGS.map(t => [t, t])] },
          ].map(f => (
            <select
              key={f.key}
              value={filter[f.key as keyof typeof filter]}
              onChange={e => setFilter(prev => ({ ...prev, [f.key]: e.target.value }))}
              style={{
                padding: '9px 12px', borderRadius: 12, fontSize: 13,
                border: '1.5px solid #E2E8F0', background: '#fff', color: '#334155',
                outline: 'none', cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
              }}
            >
              {f.opts.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
            </select>
          ))}

          {isFiltered && (
            <button
              onClick={() => { setFilter({ platform: '', type: '', tag: '' }); setSearch(''); setActiveTab('all'); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 14px', borderRadius: 12,
                border: '1.5px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)',
                color: '#DC2626', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}
            >
              <X size={12} /> Clear
            </button>
          )}
        </div>

        {/* Main split pane */}
        <div style={{ display: 'flex', gap: 14, flex: 1, minHeight: 0 }}>

          {/* List panel */}
          <div style={{
            width: 345, flexShrink: 0, background: '#fff', borderRadius: 18,
            border: '1px solid #EEF2FF', overflow: 'hidden',
            boxShadow: '0 4px 24px rgba(99,102,241,0.07)',
            display: 'flex', flexDirection: 'column',
          }}>
            {/* List header */}
            <div style={{
              padding: '14px 18px', borderBottom: '1px solid #F1F5F9',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'linear-gradient(135deg, #FAFBFF, #F5F3FF)',
            }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#374151' }}>
                {loading ? 'Loading...' : `${displayMessages.length} conversation${displayMessages.length !== 1 ? 's' : ''}`}
              </span>
              {stats.unread > 0 && (
                <span style={{
                  background: 'linear-gradient(135deg,#6366F1,#8B5CF6)',
                  color: '#fff', fontSize: 11, fontWeight: 800,
                  padding: '2px 10px', borderRadius: 999,
                  boxShadow: '0 2px 8px rgba(99,102,241,0.4)',
                }}>
                  {stats.unread} unread
                </span>
              )}
            </div>

            {/* Message list */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
              ) : displayMessages.length === 0 ? (
                <EmptyState filtered={isFiltered} />
              ) : (
                displayMessages.map((msg: any) => (
                  <MessageCard key={msg.id} msg={msg} isSelected={selected?.id === msg.id} onClick={() => selectMessage(msg)} />
                ))
              )}
            </div>
          </div>

          {/* Thread panel */}
          <div style={{
            flex: 1, background: '#fff', borderRadius: 18,
            border: '1px solid #EEF2FF', overflow: 'hidden',
            boxShadow: '0 4px 24px rgba(99,102,241,0.07)',
            display: 'flex', flexDirection: 'column',
          }}>
            {!selected ? (
              <NoThreadSelected />
            ) : (
              <>
                {/* Thread header */}
                <div style={{
                  padding: '16px 20px', borderBottom: '1px solid #F1F5F9', flexShrink: 0,
                  background: 'linear-gradient(135deg, #FAFBFF, #F5F3FF)',
                }}>
                  {/* Sender row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Avatar name={selected.senderName} platform={selected.platform} size={44} />
                      <div>
                        <p style={{ fontWeight: 800, fontSize: 15, color: '#1E293B', marginBottom: 4 }}>{selected.senderName || 'Unknown'}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <PlatformBadge platform={selected.platform} />
                          <span style={{ fontSize: 11, color: '#94A3B8' }}>{selected.type === 'DM' ? 'Direct Message' : 'Comment'}</span>
                          <span style={{ fontSize: 11, color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Clock size={10} /> {formatTime(selected.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {selected.type === 'COMMENT' && (
                      <>
                        <button onClick={() => handleHide(selected, !selected.hidden)} disabled={hiding} style={{
                          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                          borderRadius: 12, border: '1.5px solid #E2E8F0',
                          background: selected.hidden ? 'rgba(245,158,11,0.08)' : '#fff',
                          color: selected.hidden ? '#D97706' : '#64748B',
                          fontWeight: 700, fontSize: 12, cursor: 'pointer', opacity: hiding ? 0.6 : 1,
                        }}>
                          <Eye size={13} /> {selected.hidden ? 'Unhide' : 'Hide'}
                        </button>
                        {!showDeleteConfirm ? (
                          <button onClick={() => setShowDeleteConfirm(true)} style={{
                            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                            borderRadius: 12, border: '1.5px solid rgba(239,68,68,0.3)',
                            background: 'rgba(239,68,68,0.06)', color: '#DC2626',
                            fontWeight: 700, fontSize: 12, cursor: 'pointer',
                          }}>
                            <X size={13} /> Delete
                          </button>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 11, color: '#DC2626', fontWeight: 700 }}>Delete permanently?</span>
                            <button onClick={() => handleDelete(selected)} disabled={deleting} style={{
                              padding: '6px 12px', borderRadius: 10, border: 'none',
                              background: '#DC2626', color: '#fff', fontWeight: 700, fontSize: 11, cursor: 'pointer',
                            }}>{deleting ? 'Deleting...' : 'Confirm'}</button>
                            <button onClick={() => setShowDeleteConfirm(false)} style={{
                              padding: '6px 12px', borderRadius: 10, border: '1px solid #E2E8F0',
                              background: '#fff', color: '#64748B', fontWeight: 700, fontSize: 11, cursor: 'pointer',
                            }}>Cancel</button>
                          </div>
                        )}
                      </>
                    )}
                    {selected.isResolved ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(16,185,129,0.1)', border: '1.5px solid rgba(16,185,129,0.3)', borderRadius: 12, padding: '6px 14px', color: '#059669', fontWeight: 800, fontSize: 12 }}>
                        <CheckCircle size={13} /> Resolved
                      </div>
                    ) : (
                      <button onClick={() => handleResolve(selected)} style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                        borderRadius: 12, border: '1.5px solid rgba(16,185,129,0.35)',
                        background: 'rgba(16,185,129,0.06)', color: '#059669',
                        fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
                      }}>
                        <CheckCircle size={13} /> Mark resolved
                      </button>
                    )}
                    </div>
                  </div>

                  {/* Action bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <TagPicker currentTags={selected.tags || []} onSave={handleTagsSave} />
                    <CrmLinkPicker currentClient={selected.crmClient} workspaceId={workspace?.id || ''} messageId={selected.id} onLinked={handleCrmLinked} onCreateNew={handleCreateCrm} />
                    <AssignPicker currentAssignee={selected.assignedTo} workspaceId={workspace?.id || ''} messageId={selected.id} onAssigned={handleAssigned} />

                    {/* Active tags display */}
                    {selected.tags?.map((t: string) => (
                      <TagChip key={t} tag={t} onRemove={() => handleTagsSave(selected.tags.filter((x: string) => x !== t))} />
                    ))}

                    {/* Assigned to badge */}
                    {selected.assignedTo && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)', padding: '3px 10px', borderRadius: 999 }}>
                        → {selected.assignedTo.name}
                      </span>
                    )}
                  </div>

                  {/* Post context (for comments) */}
                  {selected.postContent && (
                    <div style={{
                      marginTop: 10, padding: '10px 14px',
                      background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)',
                      borderRadius: 10, borderLeft: '3px solid #6366F1',
                    }}>
                      <p style={{ fontSize: 10, fontWeight: 800, color: '#6366F1', marginBottom: 3, letterSpacing: 0.5, textTransform: 'uppercase' }}>Commenting on:</p>
                      <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{selected.postContent}</p>
                    </div>
                  )}
                </div>

                {/* Message thread */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16, background: '#FAFBFF' }}>
                  {/* Original message */}
                  <div style={{ display: 'flex', gap: 12, animation: 'fadeIn 0.2s ease' }}>
                    <Avatar name={selected.senderName} platform={selected.platform} size={36} />
                    <div style={{ maxWidth: '70%' }}>
                      <div style={{
                        background: '#fff', border: '1px solid #EEF2FF',
                        borderRadius: '18px 18px 18px 4px',
                        padding: '12px 16px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                      }}>
                        <p style={{ fontSize: 14, color: '#1E293B', lineHeight: 1.6 }}>{selected.content}</p>
                      </div>
                      <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 4, marginLeft: 4 }}>{formatTime(selected.createdAt)}</p>
                    </div>
                  </div>

                  {/* Replies */}
                  {selected.replies?.map((reply: any, i: number) => (
                    <div key={reply.id} style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', animation: 'fadeIn 0.2s ease', animationDelay: `${i * 0.05}s` }}>
                      <div style={{ maxWidth: '70%', textAlign: 'right' }}>
                        <div style={{
                          background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                          borderRadius: '18px 18px 4px 18px',
                          padding: '12px 16px',
                          boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
                        }}>
                          <p style={{ fontSize: 14, color: '#fff', lineHeight: 1.6 }}>{reply.content}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 4, marginRight: 4 }}>
                          <p style={{ fontSize: 11, color: '#94A3B8' }}>{formatTime(reply.sentAt)}</p>
                          {reply.isAuto && <span style={{ fontSize: 10, background: 'rgba(139,92,246,0.1)', color: '#8B5CF6', padding: '2px 7px', borderRadius: 999, fontWeight: 700 }}>Auto</span>}
                        </div>
                      </div>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: 'linear-gradient(135deg,#6366F1,#8B5CF6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 14, fontWeight: 800, flexShrink: 0,
                        boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
                      }}>A</div>
                    </div>
                  ))}
                </div>

                {/* Reply box — always shown, resolved state shows banner above it */}
                <div style={{ padding: '16px 20px', borderTop: '1px solid #F1F5F9', flexShrink: 0, background: '#fff' }}>

                  {/* Resolved banner with Reopen option */}
                  {selected.isResolved && (
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px', borderRadius: 12, marginBottom: 12,
                      background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CheckCircle size={14} color="#10B981" />
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>Marked as resolved</span>
                      </div>
                      <button onClick={() => handleReopen(selected)} style={{
                        padding: '5px 12px', borderRadius: 8,
                        border: '1.5px solid rgba(99,102,241,0.35)',
                        background: 'rgba(99,102,241,0.06)', color: '#6366F1',
                        fontWeight: 700, fontSize: 11, cursor: 'pointer',
                      }}>
                        Reopen
                      </button>
                    </div>
                  )}

                  {/* AI button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <button
                      onClick={handleSuggest}
                      disabled={suggesting}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 7,
                        padding: '8px 16px', borderRadius: 10,
                        background: suggesting ? '#F5F3FF' : 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(99,102,241,0.12))',
                        border: '1.5px solid rgba(139,92,246,0.35)',
                        color: '#7C3AED', fontWeight: 800, fontSize: 12, cursor: 'pointer',
                        transition: 'all 0.15s', opacity: suggesting ? 0.7 : 1,
                      }}
                    >
                      <Sparkles size={13} />
                      {suggesting ? 'Generating AI reply...' : '✨ AI Suggest Reply'}
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <textarea
                      ref={replyRef}
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder={`Reply to ${selected.senderName || 'this message'}...`}
                      rows={3}
                      onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleReply(); }}
                      style={{
                        flex: 1, padding: '12px 16px',
                        border: '1.5px solid #E2E8F0', borderRadius: 14,
                        fontSize: 14, color: '#1E293B', resize: 'none', outline: 'none',
                        lineHeight: 1.5, background: '#FAFBFF',
                        transition: 'border-color 0.15s, box-shadow 0.15s', fontFamily: 'inherit',
                      }}
                      onFocus={e => { e.target.style.borderColor = '#6366F1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
                      onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none'; }}
                    />
                    <button
                      onClick={handleReply}
                      disabled={replying || !replyText.trim()}
                      style={{
                        padding: '12px 18px', borderRadius: 14,
                        background: replyText.trim() ? 'linear-gradient(135deg,#6366F1,#8B5CF6)' : '#E2E8F0',
                        color: replyText.trim() ? '#fff' : '#94A3B8',
                        border: 'none', cursor: replyText.trim() ? 'pointer' : 'not-allowed',
                        display: 'flex', alignItems: 'center', gap: 8,
                        fontWeight: 800, fontSize: 13,
                        boxShadow: replyText.trim() ? '0 4px 16px rgba(99,102,241,0.35)' : 'none',
                        transition: 'all 0.15s', alignSelf: 'flex-end',
                      }}
                    >
                      <Send size={14} /> {replying ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                  <p style={{ fontSize: 11, color: '#CBD5E1', marginTop: 6 }}>⌘ + Enter to send</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
