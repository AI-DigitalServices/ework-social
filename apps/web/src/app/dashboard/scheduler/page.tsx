'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { getPostsAction, getSocialAccountsAction } from '@/actions/scheduler.actions';
import PostCard from '@/components/scheduler/PostCard';
import CreatePostModal from '@/components/scheduler/CreatePostModal';
import CalendarView from '@/components/scheduler/CalendarView';
import { Plus, LayoutGrid, Calendar, Clock, CheckCircle, FileText, Settings, Zap, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import PlatformIcon from '@/components/ui/PlatformIcon';

/* ─── Stat card visual config ────────────────────────────────── */
const STAT_STYLE = {
  total:     { gradient: 'linear-gradient(135deg,#1e293b 0%,#0f172a 100%)', glow: 'rgba(99,102,241,0.5)',  accent: '#a5b4fc', icon: FileText  },
  scheduled: { gradient: 'linear-gradient(135deg,#1e3a5f 0%,#0f172a 100%)', glow: 'rgba(59,130,246,0.5)',  accent: '#93c5fd', icon: Clock      },
  published: { gradient: 'linear-gradient(135deg,#0c2a20 0%,#0f172a 100%)', glow: 'rgba(16,185,129,0.5)', accent: '#6ee7b7', icon: CheckCircle },
  drafts:    { gradient: 'linear-gradient(135deg,#2d1f08 0%,#0f172a 100%)', glow: 'rgba(245,158,11,0.5)', accent: '#fcd34d', icon: FileText   },
} as const;

/* ─── Status filter config ───────────────────────────────────── */
const FILTER_STYLE: Record<string, { active: string; dot: string; label: string }> = {
  ALL:       { active: 'linear-gradient(135deg,#334155,#1e293b)', dot: '#94a3b8', label: 'All'       },
  DRAFT:     { active: 'linear-gradient(135deg,#374151,#1f2937)', dot: '#9ca3af', label: 'Drafts'     },
  SCHEDULED: { active: 'linear-gradient(135deg,#1e3a5f,#1e293b)', dot: '#60a5fa', label: 'Scheduled' },
  PUBLISHED: { active: 'linear-gradient(135deg,#0c2a20,#1e293b)', dot: '#34d399', label: 'Published' },
  FAILED:    { active: 'linear-gradient(135deg,#3b1212,#1e293b)', dot: '#f87171', label: 'Failed'    },
};

function PlatformBadge({ platform, accountName }: { platform: string; accountName: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '5px 12px 5px 5px',
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 100,
      backdropFilter: 'blur(8px)',
    }}>
      <PlatformIcon platform={platform} size="xs" glow />
      <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap' }}>
        {accountName}
      </span>
    </div>
  );
}

export default function SchedulerPage() {
  const { workspace } = useAuthStore();
  const router = useRouter();
  const [posts, setPosts] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [view, setView] = useState<'grid' | 'calendar'>('grid');
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    if (workspace?.id) loadData();
  }, [workspace?.id]);

  const loadData = async () => {
    try {
      const [postsData, accountsData] = await Promise.all([
        getPostsAction(workspace!.id),
        getSocialAccountsAction(workspace!.id),
      ]);
      setPosts(postsData);
      setAccounts(accountsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePostCreated = (post: any) => {
    setPosts(prev => [post, ...prev]);
  };

  const filteredPosts = filter === 'ALL' ? posts : posts.filter(p => p.status === filter);

  const stats = {
    total:     posts.length,
    scheduled: posts.filter(p => p.status === 'SCHEDULED').length,
    published: posts.filter(p => p.status === 'PUBLISHED').length,
    drafts:    posts.filter(p => p.status === 'DRAFT').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Hero header ───────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#162032 100%)',
        borderRadius: 20,
        padding: '28px 32px',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Glow blobs */}
        <div style={{ position: 'absolute', top: -40, right: 60,  width: 200, height: 200, borderRadius: '50%', background: 'rgba(59,130,246,0.12)',  filter: 'blur(50px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -40, right: -20, width: 160, height: 160, borderRadius: '50%', background: 'rgba(16,185,129,0.08)', filter: 'blur(40px)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
                boxShadow: '0 0 16px rgba(99,102,241,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Zap size={18} color="#fff" />
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>Post Scheduler</h1>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(148,163,184,0.9)', margin: 0 }}>
              Create, schedule and manage content across all your connected accounts
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* View toggle */}
            <div style={{
              display: 'flex', gap: 4, padding: 4,
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)',
            }}>
              {(['grid', 'calendar'] as const).map(v => (
                <button key={v} onClick={() => setView(v)} style={{
                  padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: view === v ? 'rgba(255,255,255,0.12)' : 'transparent',
                  color: view === v ? '#fff' : 'rgba(148,163,184,0.7)',
                  transition: 'all 0.15s',
                }}>
                  {v === 'grid' ? <LayoutGrid size={15} /> : <Calendar size={15} />}
                </button>
              ))}
            </div>

            {/* Create button */}
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={accounts.length === 0}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', borderRadius: 12, border: 'none', cursor: accounts.length === 0 ? 'not-allowed' : 'pointer',
                background: accounts.length === 0 ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg,#3b82f6,#6366f1)',
                boxShadow: accounts.length === 0 ? 'none' : '0 0 20px rgba(99,102,241,0.4)',
                color: '#fff', fontSize: 13, fontWeight: 700,
                opacity: accounts.length === 0 ? 0.5 : 1,
                transition: 'all 0.15s',
              }}
            >
              <Plus size={15} />
              Create Post
            </button>
          </div>
        </div>

        {/* Connected accounts bar */}
        {accounts.length > 0 && (
          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(148,163,184,0.6)', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
              Posting to:
            </span>
            {accounts.map(acc => (
              <PlatformBadge key={acc.id} platform={acc.platform} accountName={acc.accountName} />
            ))}
            <button
              onClick={() => router.push('/dashboard/settings?tab=social')}
              style={{
                marginLeft: 'auto', fontSize: 11, fontWeight: 700,
                color: 'rgba(99,102,241,0.9)', background: 'none', border: 'none', cursor: 'pointer',
                padding: '4px 10px', borderRadius: 8,
                backdropFilter: 'blur(4px)',
              }}
            >
              Manage →
            </button>
          </div>
        )}
      </div>

      {/* ── No accounts warning ───────────────────────────────────── */}
      {accounts.length === 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
          padding: '16px 20px',
          background: 'linear-gradient(135deg,rgba(245,158,11,0.12),rgba(234,88,12,0.08))',
          border: '1px solid rgba(245,158,11,0.25)',
          borderRadius: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(245,158,11,0.15)',
              border: '1px solid rgba(245,158,11,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <AlertTriangle size={16} color="#f59e0b" />
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: '#92400e' }}>No social accounts connected</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#b45309' }}>
                Connect your Facebook or Instagram account to start scheduling posts.
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push('/dashboard/settings?tab=social')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg,#f59e0b,#d97706)',
              boxShadow: '0 0 14px rgba(245,158,11,0.35)',
              color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0,
            }}
          >
            <Settings size={13} />
            Connect Account
          </button>
        </div>
      )}

      {/* ── Stat cards ────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {([
          { key: 'total',     label: 'Total Posts',  value: stats.total     },
          { key: 'scheduled', label: 'Scheduled',     value: stats.scheduled },
          { key: 'published', label: 'Published',     value: stats.published },
          { key: 'drafts',    label: 'Drafts',        value: stats.drafts    },
        ] as const).map(({ key, label, value }) => {
          const style = STAT_STYLE[key];
          const Icon  = style.icon;
          return (
            <div key={key} style={{
              background: style.gradient,
              borderRadius: 16,
              padding: '20px 22px',
              border: '1px solid rgba(255,255,255,0.06)',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* glow blob */}
              <div style={{
                position: 'absolute', top: -24, right: -24,
                width: 80, height: 80, borderRadius: '50%',
                background: style.glow, filter: 'blur(22px)',
                pointerEvents: 'none',
              }} />
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 9,
                  background: 'rgba(255,255,255,0.08)',
                  border: `1px solid ${style.accent}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 14,
                }}>
                  <Icon size={14} color={style.accent} />
                </div>
                <p style={{ margin: 0, fontSize: 30, fontWeight: 800, color: '#f1f5f9', lineHeight: 1 }}>{value}</p>
                <p style={{ margin: '6px 0 0', fontSize: 11, fontWeight: 600, color: 'rgba(148,163,184,0.7)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Filter tabs ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {(['ALL', 'DRAFT', 'SCHEDULED', 'PUBLISHED', 'FAILED'] as const).map(status => {
          const fStyle = FILTER_STYLE[status];
          const count  = status === 'ALL' ? posts.length : posts.filter(p => p.status === status).length;
          const active = filter === status;
          return (
            <button
              key={status}
              onClick={() => setFilter(status)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: active ? fStyle.active : 'rgba(255,255,255,0.0)',
                boxShadow: active ? '0 2px 12px rgba(0,0,0,0.18)' : 'none',
                color: active ? '#f1f5f9' : '#64748b',
                fontWeight: active ? 700 : 500, fontSize: 13,
                transition: 'all 0.15s',
                outline: active ? 'none' : '1px solid #e2e8f0',
              }}
            >
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: active ? fStyle.dot : '#cbd5e1',
                flexShrink: 0,
                boxShadow: active ? `0 0 6px ${fStyle.dot}` : 'none',
              }} />
              {fStyle.label}
              {status !== 'ALL' && (
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  padding: '1px 6px', borderRadius: 20,
                  background: active ? 'rgba(255,255,255,0.12)' : '#f1f5f9',
                  color: active ? '#fff' : '#94a3b8',
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Content ───────────────────────────────────────────────── */}
      {view === 'calendar' ? (
        <CalendarView posts={filteredPosts} />
      ) : filteredPosts.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 24px',
          background: 'linear-gradient(135deg,#0f172a,#1e293b)',
          borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 240, height: 240, borderRadius: '50%', background: 'rgba(99,102,241,0.08)', filter: 'blur(60px)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 60, height: 60, borderRadius: 18,
              background: 'rgba(99,102,241,0.15)',
              border: '1px solid rgba(99,102,241,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <FileText size={26} color="#a5b4fc" />
            </div>
            <p style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>No posts here yet</p>
            <p style={{ margin: '0 0 24px', fontSize: 13, color: 'rgba(148,163,184,0.7)' }}>
              {accounts.length === 0 ? 'Connect a social account first to start scheduling.' : 'Create your first post to fill up this calendar.'}
            </p>
            {accounts.length > 0 && (
              <button
                onClick={() => setShowCreateModal(true)}
                style={{
                  padding: '11px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
                  boxShadow: '0 0 20px rgba(99,102,241,0.4)',
                  color: '#fff', fontSize: 13, fontWeight: 700,
                }}
              >
                Create Your First Post
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPosts.map(post => (
            <PostCard key={post.id} post={post} accounts={accounts} onUpdate={loadData} />
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreatePostModal
          accounts={accounts}
          onClose={() => setShowCreateModal(false)}
          onCreated={handlePostCreated}
        />
      )}
    </div>
  );
}
