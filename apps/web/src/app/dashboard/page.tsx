'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { getDashboardStatsAction, getRecentPostsAction } from '@/actions/analytics.actions';
import {
  CalendarDays, Users, TrendingUp, Share2, ArrowRight,
  CheckCircle, Clock, AlertCircle, Zap, X, Link2, Gift, Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import PlatformIcon from '@/components/ui/PlatformIcon';

/* ─── Stat card gradient config ──────────────────────────────── */
const STAT_CARD = [
  { label: 'Scheduled Posts', key: 'scheduledPosts',  icon: CalendarDays, gradient: 'linear-gradient(135deg,#1e3a5f 0%,#1e2d42 100%)', glow: 'rgba(59,130,246,0.5)',  accent: '#93c5fd', href: '/dashboard/scheduler'        },
  { label: 'Published Posts', key: 'publishedPosts',  icon: CheckCircle,  gradient: 'linear-gradient(135deg,#0c2a20 0%,#1e2d42 100%)', glow: 'rgba(16,185,129,0.5)', accent: '#6ee7b7', href: '/dashboard/scheduler'        },
  { label: 'Total Clients',   key: 'totalClients',    icon: Users,        gradient: 'linear-gradient(135deg,#2d1854 0%,#1e2d42 100%)', glow: 'rgba(139,92,246,0.5)', accent: '#c4b5fd', href: '/dashboard/crm'             },
  { label: 'Social Accounts', key: 'socialAccounts',  icon: Share2,       gradient: 'linear-gradient(135deg,#2d1508 0%,#1e2d42 100%)', glow: 'rgba(249,115,22,0.5)', accent: '#fdba74', href: '/dashboard/settings?tab=social' },
] as const;

/* ─── Quick actions ──────────────────────────────────────────── */
const QUICK_ACTIONS = [
  { label: 'Schedule a Post',    desc: 'Create and schedule content',   href: '/dashboard/scheduler',            gradient: 'linear-gradient(135deg,#2563EB,#1D4ED8)', glow: 'rgba(37,99,235,0.4)',  icon: CalendarDays },
  { label: 'Add a Client',       desc: 'Add to your CRM pipeline',      href: '/dashboard/crm',                  gradient: 'linear-gradient(135deg,#16a34a,#15803d)', glow: 'rgba(22,163,74,0.4)',  icon: Users        },
  { label: 'View Analytics',     desc: 'Track your performance',         href: '/dashboard/analytics',            gradient: 'linear-gradient(135deg,#7c3aed,#6d28d9)', glow: 'rgba(124,58,237,0.4)', icon: TrendingUp   },
  { label: 'Connect Platform',   desc: 'Add social accounts',            href: '/dashboard/settings?tab=social',  gradient: 'linear-gradient(135deg,#d97706,#b45309)', glow: 'rgba(217,119,6,0.4)',  icon: Link2        },
  { label: 'Set Automation',     desc: 'Auto-send pipeline emails',      href: '/dashboard/crm?view=automation',  gradient: 'linear-gradient(135deg,#db2777,#be185d)', glow: 'rgba(219,39,119,0.4)', icon: Sparkles     },
  { label: 'Refer & Earn',       desc: 'Get 20% commission',             href: '/dashboard/settings?tab=referral',gradient: 'linear-gradient(135deg,#ea580c,#c2410c)', glow: 'rgba(234,88,12,0.4)',  icon: Gift         },
];

/* ─── Status config for recent posts ────────────────────────── */
const STATUS_META: Record<string, { icon: any; gradient: string; textColor: string; label: string }> = {
  DRAFT:     { icon: Clock,         gradient: 'rgba(100,116,139,0.12)',  textColor: '#94a3b8', label: 'Draft'     },
  SCHEDULED: { icon: Clock,         gradient: 'rgba(59,130,246,0.12)',   textColor: '#60a5fa', label: 'Scheduled' },
  PUBLISHED: { icon: CheckCircle,   gradient: 'rgba(16,185,129,0.12)',   textColor: '#34d399', label: 'Published' },
  FAILED:    { icon: AlertCircle,   gradient: 'rgba(239,68,68,0.12)',    textColor: '#f87171', label: 'Failed'    },
};


/* ─── Welcome modal ──────────────────────────────────────────── */
function WelcomeModal({ name, onClose }: { name: string; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{
        background: '#fff', borderRadius: 24, padding: '44px 40px',
        maxWidth: 520, width: '100%', textAlign: 'center',
        boxShadow: '0 24px 80px rgba(0,0,0,0.25)', position: 'relative',
      }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
          <X size={16} />
        </button>
        <div style={{ fontSize: 52, marginBottom: 12 }}>👋</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1e2d42', marginBottom: 8 }}>Welcome, {name}!</h2>
        <p style={{ color: '#64748b', fontSize: 15, lineHeight: 1.7, marginBottom: 32 }}>
          You&apos;re now on eWork Social. Here&apos;s how to get the most out of your workspace in the next 3 minutes.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32, textAlign: 'left' }}>
          {[
            { icon: '🔗', title: 'Connect a social account', desc: 'Link Instagram, Facebook, LinkedIn, Threads, Bluesky and more', href: '/dashboard/settings?tab=social' },
            { icon: '📅', title: 'Schedule your first post',  desc: 'Write content, pick a time, and let eWork handle the publishing', href: '/dashboard/scheduler' },
            { icon: '👥', title: 'Add your first client',     desc: 'Manage client accounts and track their pipeline in the CRM', href: '/dashboard/crm' },
          ].map(item => (
            <a key={item.title} href={item.href} onClick={onClose} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 16px', background: '#f8fafc', borderRadius: 14, textDecoration: 'none', border: '1px solid #e2e8f0' }}>
              <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg,#2563EB,#1D4ED8)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{item.icon}</div>
              <div>
                <p style={{ color: '#1e2d42', fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{item.title}</p>
                <p style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.4, margin: 0 }}>{item.desc}</p>
              </div>
              <ArrowRight size={16} style={{ color: '#cbd5e1', marginLeft: 'auto', marginTop: 10, flexShrink: 0 }} />
            </a>
          ))}
        </div>
        <button onClick={onClose} style={{ width: '100%', background: 'linear-gradient(135deg,#2563EB,#1D4ED8)', color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 20px rgba(37,99,235,0.4)' }}>
          Let&apos;s get started →
        </button>
        <p style={{ color: '#cbd5e1', fontSize: 12, marginTop: 12 }}>You have a 7-day free trial · No credit card needed</p>
      </div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────── */
export default function DashboardPage() {
  const { user, workspace } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [checklistDismissed, setChecklistDismissed] = useState(false);
  const [inactiveAccounts, setInactiveAccounts] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const key = `ework_welcomed_${user.id}`;
    if (!localStorage.getItem(key)) { setShowWelcome(true); localStorage.setItem(key, '1'); }
    if (localStorage.getItem(`ework_checklist_dismissed_${user.id}`)) setChecklistDismissed(true);
  }, [user]);

  useEffect(() => {
    if (!workspace?.id) return;
    Promise.all([getDashboardStatsAction(workspace.id), getRecentPostsAction(workspace.id)])
      .then(([s, p]) => { setStats(s); setRecentPosts(p?.slice(0, 4) || []); })
      .catch(console.error)
      .finally(() => setLoading(false));
    import('@/lib/api').then(({ default: api }) => {
      api.get(`/social/accounts?workspaceId=${workspace.id}`)
        .then(res => setInactiveAccounts(res.data.filter((a: any) => !a.isActive)))
        .catch(() => {});
    });
  }, [workspace?.id]);

  const dismissChecklist = () => {
    if (!user) return;
    localStorage.setItem(`ework_checklist_dismissed_${user.id}`, '1');
    setChecklistDismissed(true);
  };

  const checklistSteps = [
    { label: 'Connect a social account',   done: (stats?.socialAccounts ?? 0) > 0, href: '/dashboard/settings?tab=social', icon: '🔗' },
    { label: 'Schedule your first post',   done: (stats?.totalPosts ?? 0) > 0,      href: '/dashboard/scheduler',           icon: '📅' },
    { label: 'Add your first client',      done: (stats?.totalClients ?? 0) > 0,    href: '/dashboard/crm',                 icon: '👥' },
    { label: 'Set up pipeline automation', done: stats?.hasAutomation ?? false,      href: '/dashboard/crm?view=automation',  icon: '⚡' },
    { label: 'Invite a team member',       done: stats?.hasTeamMember ?? false,      href: '/dashboard/settings?tab=workspace', icon: '🤝' },
  ];
  const completedSteps = checklistSteps.filter(s => s.done).length;
  const progressPct    = Math.round((completedSteps / checklistSteps.length) * 100);
  const allDone        = progressPct === 100;

  return (
    <div className="space-y-5">
      {showWelcome && user && (
        <WelcomeModal name={user.name?.split(' ')[0] || 'there'} onClose={() => setShowWelcome(false)} />
      )}

      {/* ── Inactive account banners ──────────────────────────────── */}
      {inactiveAccounts.map(account => (
        <div key={account.id} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
          padding: '14px 20px',
          background: 'linear-gradient(135deg,rgba(245,158,11,0.1),rgba(234,88,12,0.06))',
          border: '1px solid rgba(245,158,11,0.25)', borderRadius: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <PlatformIcon platform={account.platform} size="md" glow />
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#92400e' }}>
                {account.platform} token expired — @{account.accountName}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#b45309' }}>
                Scheduled posts to this account are paused. Reconnect to resume publishing.
              </p>
            </div>
          </div>
          <Link href="/dashboard/settings?tab=social" style={{
            flexShrink: 0, fontSize: 12, fontWeight: 700, padding: '8px 14px',
            background: 'linear-gradient(135deg,#f59e0b,#d97706)',
            boxShadow: '0 0 12px rgba(245,158,11,0.35)',
            color: '#fff', borderRadius: 10, textDecoration: 'none',
          }}>
            Reconnect →
          </Link>
        </div>
      ))}

      {/* ── Hero welcome header ───────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg,#1e2d42 0%,#1e293b 60%,#1e2e40 100%)',
        borderRadius: 20, padding: '28px 32px',
        border: '1px solid rgba(255,255,255,0.10)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -30, right: 80,  width: 200, height: 200, borderRadius: '50%', background: 'rgba(99,102,241,0.1)',  filter: 'blur(50px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -30, right: 0, width: 160, height: 160, borderRadius: '50%', background: 'rgba(16,185,129,0.08)', filter: 'blur(40px)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>
              Welcome back, {user?.name?.split(' ')[0]} 👋
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(148,163,184,0.85)' }}>
              Here&apos;s what&apos;s happening with <span style={{ color: '#93c5fd', fontWeight: 600 }}>{workspace?.name}</span> today.
            </p>
          </div>
          <Link href="/dashboard/scheduler" style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '11px 20px', borderRadius: 12,
            background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
            boxShadow: '0 0 20px rgba(99,102,241,0.4)',
            color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none',
          }}>
            <Zap size={15} />
            Create Post
          </Link>
        </div>
      </div>

      {/* ── Stat cards ────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {STAT_CARD.map(card => {
          const Icon = card.icon;
          return (
            <Link key={card.key} href={card.href} style={{ textDecoration: 'none' }}>
              <div style={{
                background: card.gradient,
                borderRadius: 16, padding: '20px 22px',
                border: '1px solid rgba(255,255,255,0.10)',
                position: 'relative', overflow: 'hidden',
                cursor: 'pointer', transition: 'transform 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <div style={{ position: 'absolute', top: -24, right: -24, width: 80, height: 80, borderRadius: '50%', background: card.glow, filter: 'blur(22px)', pointerEvents: 'none' }} />
                <div style={{ position: 'relative' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(255,255,255,0.08)', border: `1px solid ${card.accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                    <Icon size={14} color={card.accent} />
                  </div>
                  <p style={{ margin: 0, fontSize: 30, fontWeight: 800, color: '#f1f5f9', lineHeight: 1 }}>
                    {loading ? '—' : (stats?.[card.key] ?? 0)}
                  </p>
                  <p style={{ margin: '6px 0 0', fontSize: 11, fontWeight: 600, color: 'rgba(148,163,184,0.7)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {card.label}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Quick actions + checklist ─────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: !checklistDismissed ? '2fr 1fr' : '1fr', gap: 16 }}>
        {/* Quick actions */}
        <div style={{ background: '#fff', borderRadius: 20, padding: '24px', border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <p style={{ margin: '0 0 18px', fontSize: 15, fontWeight: 700, color: '#1e2d42' }}>Quick Actions</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {QUICK_ACTIONS.map(action => {
              const ActionIcon = action.icon;
              return (
                <Link key={action.label} href={action.href} style={{ textDecoration: 'none' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 16px', borderRadius: 14,
                    border: '1px solid #f1f5f9', background: '#fafafa',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#f1f5f9'; e.currentTarget.style.background = '#fafafa'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <div style={{
                      width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                      background: action.gradient,
                      boxShadow: `0 0 14px ${action.glow}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <ActionIcon size={16} color="#fff" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{action.label}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>{action.desc}</p>
                    </div>
                    <ArrowRight size={13} color="#cbd5e1" style={{ flexShrink: 0 }} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Onboarding checklist */}
        {!checklistDismissed && (
          <div style={{
            borderRadius: 20, padding: '24px',
            background: allDone
              ? 'linear-gradient(135deg,#14532d,#166534,#065f46)'
              : 'linear-gradient(135deg,#1e3a8a,#1e40af,#1d4ed8)',
            border: '1px solid rgba(255,255,255,0.08)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: -30, right: -20, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.10)', filter: 'blur(30px)', pointerEvents: 'none' }} />
            <button
              onClick={dismissChecklist}
              style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
            >
              <X size={13} />
            </button>

            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, paddingRight: 28 }}>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff' }}>{allDone ? '🎉 All done!' : '🚀 Getting Started'}</p>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{completedSteps}/{checklistSteps.length}</span>
              </div>

              {/* Progress bar */}
              <div style={{ height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 99, marginBottom: 20, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#fff', borderRadius: 99, width: `${progressPct}%`, transition: 'width 0.5s ease' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {checklistSteps.map(step => (
                  <a key={step.label} href={step.href} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', opacity: step.done ? 0.55 : 1, transition: 'opacity 0.15s' }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                      background: step.done ? 'rgba(52,211,153,0.25)' : 'rgba(255,255,255,0.12)',
                      border: `1px solid ${step.done ? 'rgba(52,211,153,0.5)' : 'rgba(255,255,255,0.2)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: step.done ? 13 : 11, color: step.done ? '#34d399' : '#fff', fontWeight: 700,
                    }}>
                      {step.done ? '✓' : step.icon}
                    </div>
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: step.done ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.9)', textDecoration: step.done ? 'line-through' : 'none' }}>
                      {step.label}
                    </span>
                    {!step.done && <ArrowRight size={12} color="rgba(255,255,255,0.35)" />}
                  </a>
                ))}
              </div>

              {allDone && (
                <div style={{ marginTop: 20, padding: '12px 14px', background: 'rgba(255,255,255,0.1)', borderRadius: 12, textAlign: 'center' }}>
                  <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: '#fff' }}>You&apos;re fully set up! 🚀</p>
                  <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Your workspace is ready to grow</p>
                  <button onClick={dismissChecklist} style={{ marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                    Dismiss this panel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Recent posts ──────────────────────────────────────────── */}
      {recentPosts.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 20, padding: '24px', border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1e2d42' }}>Recent Posts</p>
            <Link href="/dashboard/scheduler" style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', textDecoration: 'none' }}>
              View all →
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentPosts.map((post: any) => {
              const sMeta = STATUS_META[post.status] || STATUS_META.DRAFT;
              const StatusIcon = sMeta.icon;
              return (
                <div key={post.id} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 16px',
                  background: '#fafafa',
                  border: '1px solid #f1f5f9',
                  borderRadius: 14,
                }}>
                  <PlatformIcon platform={post.socialAccount?.platform || ''} size="md" glow />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {post.content}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>{post.socialAccount?.accountName}</p>
                  </div>
                  {post.mediaUrls?.length > 0 && (
                    <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>📎 {post.mediaUrls.length}</span>
                  )}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '5px 10px', borderRadius: 99,
                    background: sMeta.gradient,
                    flexShrink: 0,
                  }}>
                    <StatusIcon size={11} color={sMeta.textColor} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: sMeta.textColor }}>{sMeta.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
