'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import {
  MessageSquare, Mail, CheckCircle, RefreshCw,
  Send, Sparkles, Filter, Instagram, Facebook,
  Clock, User, ChevronDown
} from 'lucide-react';

const PLATFORM_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  INSTAGRAM: { bg: '#E1306C', text: '#fff', label: 'Instagram' },
  FACEBOOK:  { bg: '#1877F2', text: '#fff', label: 'Facebook' },
};

const TYPE_META: Record<string, { label: string; icon: any }> = {
  DM:      { label: 'Direct Message', icon: Mail },
  COMMENT: { label: 'Comment',        icon: MessageSquare },
};

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}

function PlatformBadge({ platform }: { platform: string }) {
  const meta = PLATFORM_COLORS[platform] || { bg: '#378ADD', text: '#fff', label: platform };
  return (
    <span style={{
      background: meta.bg, color: meta.text,
      fontSize: 10, fontWeight: 700, padding: '2px 8px',
      borderRadius: 999, letterSpacing: 0.5,
    }}>{meta.label}</span>
  );
}

function MessageCard({ msg, isSelected, onClick }: { msg: any; isSelected: boolean; onClick: () => void }) {
  const TypeIcon = TYPE_META[msg.type]?.icon || MessageSquare;
  return (
    <div
      onClick={onClick}
      className="cursor-pointer transition-all"
      style={{
        padding: '14px 16px',
        background: isSelected ? 'rgba(37,99,235,0.08)' : msg.isRead ? '#fff' : 'rgba(37,99,235,0.04)',
        borderLeft: `3px solid ${isSelected ? '#2563EB' : msg.isRead ? 'transparent' : '#2563EB'}`,
        borderBottom: '1px solid #F1F5F9',
      }}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div style={{
          width: 38, height: 38, borderRadius: '50%',
          background: PLATFORM_COLORS[msg.platform]?.bg || '#378ADD',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 14, fontWeight: 700, flexShrink: 0,
        }}>
          {(msg.senderName || '?').charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-800 text-sm">
                {msg.senderName || 'Unknown'}
              </span>
              <PlatformBadge platform={msg.platform} />
              <span style={{
                display: 'flex', alignItems: 'center', gap: 3,
                color: '#94A3B8', fontSize: 11,
              }}>
                <TypeIcon size={10} />
                {TYPE_META[msg.type]?.label}
              </span>
            </div>
            <span className="text-slate-400 text-xs flex-shrink-0">{formatTime(msg.createdAt)}</span>
          </div>
          <p className="text-slate-500 text-xs line-clamp-2">{msg.content}</p>
          {msg.isResolved && (
            <span className="inline-flex items-center gap-1 mt-1 text-green-600 text-xs font-medium">
              <CheckCircle size={10} /> Resolved
            </span>
          )}
        </div>

        {/* Unread dot */}
        {!msg.isRead && (
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563EB', flexShrink: 0, marginTop: 4 }} />
        )}
      </div>
    </div>
  );
}

export default function InboxPage() {
  const { workspace } = useAuthStore();
  const [messages, setMessages] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [replying, setReplying] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [filter, setFilter] = useState({ platform: '', type: '', isResolved: 'false' });
  const [toast, setToast] = useState<string | null>(null);
  const replyRef = useRef<HTMLTextAreaElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadMessages = useCallback(async () => {
    if (!workspace?.id) return;
    setLoading(true);
    try {
      const params: any = { workspaceId: workspace.id };
      if (filter.platform) params.platform = filter.platform;
      if (filter.type) params.type = filter.type;
      if (filter.isResolved !== '') params.isResolved = filter.isResolved;
      const [msgRes, statsRes] = await Promise.all([
        api.get('/inbox', { params }),
        api.get('/inbox/stats', { params: { workspaceId: workspace.id } }),
      ]);
      setMessages(msgRes.data.messages || []);
      setStats(statsRes.data || {});
    } catch (err) {
      console.error('Failed to load inbox:', err);
    } finally {
      setLoading(false);
    }
  }, [workspace?.id, filter]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(loadMessages, 30000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  const selectMessage = async (msg: any) => {
    setSelected(msg);
    setReplyText('');
    if (!msg.isRead) {
      await api.patch(`/inbox/${msg.id}/read?workspaceId=${workspace?.id}`);
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m));
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selected) return;
    setReplying(true);
    try {
      await api.post(`/inbox/${selected.id}/reply`, {
        workspaceId: workspace?.id,
        content: replyText,
      });
      setReplyText('');
      setSelected((prev: any) => ({ ...prev, isResolved: true }));
      setMessages(prev => prev.map(m =>
        m.id === selected.id ? { ...m, isResolved: true, isRead: true } : m
      ));
      showToast('Reply sent successfully!');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to send reply');
    } finally {
      setReplying(false);
    }
  };

  const handleSuggest = async () => {
    if (!selected) return;
    setSuggesting(true);
    try {
      const res = await api.post(`/inbox/${selected.id}/suggest?workspaceId=${workspace?.id}`);
      setReplyText(res.data.suggestion);
      replyRef.current?.focus();
    } catch {
      showToast('AI suggestion failed');
    } finally {
      setSuggesting(false);
    }
  };

  const handleResolve = async (msg: any) => {
    await api.patch(`/inbox/${msg.id}/resolve?workspaceId=${workspace?.id}`);
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isResolved: true } : m));
    if (selected?.id === msg.id) setSelected((prev: any) => ({ ...prev, isResolved: true }));
    showToast('Marked as resolved');
  };

  const STAT_CARDS = [
    { label: 'Total',    value: stats.total   || 0, color: '#2563EB' },
    { label: 'Unread',   value: stats.unread  || 0, color: '#F59E0B' },
    { label: 'DMs',      value: stats.dms     || 0, color: '#8B5CF6' },
    { label: 'Comments', value: stats.comments|| 0, color: '#10B981' },
  ];

  return (
    <div style={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: '#10B981', color: '#fff',
          padding: '10px 18px', borderRadius: 10,
          fontWeight: 600, fontSize: 13,
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        }}>{toast}</div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Engagement Hub</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            All your DMs and comments in one place
          </p>
        </div>
        <button onClick={loadMessages} className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50 transition">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 flex-shrink-0">
        {STAT_CARDS.map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-100 p-4">
            <p style={{ fontSize: 26, fontWeight: 800, color: s.color, letterSpacing: '-1px' }}>{s.value}</p>
            <p className="text-slate-500 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap flex-shrink-0">
        {[
          { key: 'platform', options: [['', 'All Platforms'], ['INSTAGRAM', 'Instagram'], ['FACEBOOK', 'Facebook']] },
          { key: 'type',     options: [['', 'All Types'], ['DM', 'DMs'], ['COMMENT', 'Comments']] },
          { key: 'isResolved', options: [['false', 'Open'], ['true', 'Resolved'], ['', 'All']] },
        ].map(f => (
          <select
            key={f.key}
            value={filter[f.key as keyof typeof filter]}
            onChange={e => setFilter(prev => ({ ...prev, [f.key]: e.target.value }))}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {f.options.map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        ))}
      </div>

      {/* Main — message list + thread view */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* Message List */}
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden flex-shrink-0" style={{ width: 340 }}>
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-700">
              {messages.length} message{messages.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="overflow-y-auto" style={{ height: 'calc(100% - 48px)' }}>
            {loading ? (
              <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
                Loading messages...
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center px-6">
                <MessageSquare className="w-10 h-10 text-slate-200 mb-3" />
                <p className="text-slate-500 text-sm font-medium">No messages yet</p>
                <p className="text-slate-400 text-xs mt-1">
                  Messages from Facebook and Instagram will appear here
                </p>
              </div>
            ) : (
              messages.map(msg => (
                <MessageCard
                  key={msg.id}
                  msg={msg}
                  isSelected={selected?.id === msg.id}
                  onClick={() => selectMessage(msg)}
                />
              ))
            )}
          </div>
        </div>

        {/* Thread / Reply View */}
        <div className="bg-white rounded-xl border border-slate-100 flex-1 flex flex-col overflow-hidden">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Select a message</h3>
              <p className="text-slate-400 text-sm">
                Click any message on the left to view and reply
              </p>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: PLATFORM_COLORS[selected.platform]?.bg || '#378ADD',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 16, fontWeight: 700,
                  }}>
                    {(selected.senderName || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{selected.senderName || 'Unknown'}</p>
                    <div className="flex items-center gap-2">
                      <PlatformBadge platform={selected.platform} />
                      <span className="text-slate-400 text-xs">{TYPE_META[selected.type]?.label}</span>
                      <span className="text-slate-400 text-xs">{formatTime(selected.createdAt)}</span>
                    </div>
                  </div>
                </div>
                {!selected.isResolved && (
                  <button
                    onClick={() => handleResolve(selected)}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-green-200 text-green-600 rounded-lg text-xs font-medium hover:bg-green-50 transition"
                  >
                    <CheckCircle size={12} /> Mark Resolved
                  </button>
                )}
                {selected.isResolved && (
                  <span className="flex items-center gap-1 text-green-600 text-xs font-semibold">
                    <CheckCircle size={12} /> Resolved
                  </span>
                )}
              </div>

              {/* Message content */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                {/* Original message */}
                <div className="flex gap-3">
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: PLATFORM_COLORS[selected.platform]?.bg || '#378ADD',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0,
                  }}>
                    {(selected.senderName || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-none px-4 py-3 max-w-md">
                      <p className="text-slate-800 text-sm leading-relaxed">{selected.content}</p>
                    </div>
                    <p className="text-slate-400 text-xs mt-1 ml-1">{formatTime(selected.createdAt)}</p>
                  </div>
                </div>

                {/* Replies */}
                {selected.replies?.map((reply: any) => (
                  <div key={reply.id} className="flex gap-3 justify-end">
                    <div>
                      <div className="bg-blue-600 rounded-2xl rounded-tr-none px-4 py-3 max-w-md">
                        <p className="text-white text-sm leading-relaxed">{reply.content}</p>
                      </div>
                      <p className="text-slate-400 text-xs mt-1 text-right mr-1">{formatTime(reply.sentAt)}</p>
                    </div>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: '#2563EB',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0,
                    }}>A</div>
                  </div>
                ))}
              </div>

              {/* Reply box */}
              {!selected.isResolved && (
                <div className="px-6 py-4 border-t border-slate-100 flex-shrink-0">
                  {/* AI suggestion button */}
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      onClick={handleSuggest}
                      disabled={suggesting}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 border border-violet-200 text-violet-600 rounded-lg text-xs font-semibold hover:bg-violet-100 transition disabled:opacity-50"
                    >
                      <Sparkles size={12} />
                      {suggesting ? 'Generating...' : 'AI Suggest Reply'}
                    </button>
                    {selected.aiSuggestion && !replyText && (
                      <button
                        onClick={() => setReplyText(selected.aiSuggestion)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Use last suggestion
                      </button>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <textarea
                      ref={replyRef}
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder={`Reply to ${selected.senderName || 'this message'}...`}
                      rows={3}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleReply();
                      }}
                      className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleReply}
                      disabled={replying || !replyText.trim()}
                      className="px-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2 self-end py-3 text-sm font-semibold"
                    >
                      <Send size={14} />
                      {replying ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                  <p className="text-slate-400 text-xs mt-2">⌘ + Enter to send</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
