'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { getDashboardStatsAction, getRecentPostsAction } from '@/actions/analytics.actions';
import {
  CalendarDays, Users, TrendingUp, Share2, ArrowRight,
  CheckCircle, Clock, AlertCircle, Zap, X, Link2, Gift, Sparkles,
} from 'lucide-react';
import Link from 'next/link';

const quickActions = [
  { label: 'Schedule a Post', desc: 'Create and schedule content', href: '/dashboard/scheduler', icon: CalendarDays, iconBg: 'bg-blue-500' },
  { label: 'Add a Client', desc: 'Add to your CRM pipeline', href: '/dashboard/crm', icon: Users, iconBg: 'bg-green-500' },
  { label: 'View Analytics', desc: 'Track your performance', href: '/dashboard/analytics', icon: TrendingUp, iconBg: 'bg-purple-500' },
  { label: 'Connect Platform', desc: 'Add social accounts', href: '/dashboard/settings?tab=social', icon: Link2, iconBg: 'bg-amber-500' },
  { label: 'Set Automation', desc: 'Auto-send pipeline emails', href: '/dashboard/crm?view=automation', icon: Sparkles, iconBg: 'bg-pink-500' },
  { label: 'Refer & Earn', desc: 'Get 20% commission', href: '/dashboard/settings?tab=referral', icon: Gift, iconBg: 'bg-orange-500' },
];

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
  DRAFT: { icon: Clock, color: 'text-slate-500 bg-slate-100', label: 'Draft' },
  SCHEDULED: { icon: Clock, color: 'text-blue-600 bg-blue-100', label: 'Scheduled' },
  PUBLISHED: { icon: CheckCircle, color: 'text-green-600 bg-green-100', label: 'Published' },
  FAILED: { icon: AlertCircle, color: 'text-red-600 bg-red-100', label: 'Failed' },
};

const PLATFORM_META: Record<string, { color: string; letter: string }> = {
  FACEBOOK:  { color: '#1877F2', letter: 'f'  },
  INSTAGRAM: { color: '#E1306C', letter: '✦'  },
  TWITTER:   { color: '#1DA1F2', letter: '𝕏'  },
  LINKEDIN:  { color: '#0077B5', letter: 'in' },
  TIKTOK:    { color: '#000000', letter: 'tt' },
  YOUTUBE:   { color: '#FF0000', letter: '▶'  },
  THREADS:   { color: '#000000', letter: 'th' },
  BLUESKY:   { color: '#0085FF', letter: 'bs' },
};

function PlatformIcon({ platform, size = 32 }: { platform: string; size?: number }) {
  const meta = PLATFORM_META[platform] || { color: '#378ADD', letter: '?' };
  return (
    <div style={{
      width: size, height: size, borderRadius: size > 24 ? 8 : 6,
      background: meta.color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: size * 0.34, fontWeight: 900,
      flexShrink: 0, letterSpacing: '-0.5px',
    }}>
      {meta.letter}
    </div>
  );
}

// Welcome modal — shown once on first login
function WelcomeModal({ name, onClose }: { name: string; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 24, padding: '44px 40px', maxWidth: 520, width: '100%', textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.2)', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
          <X size={16} />
        </button>

        <div style={{ fontSize: 52, marginBottom: 12 }}>👋</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
          Welcome, {name}!
        </h2>
        <p style={{ color: '#64748b', fontSize: 15, lineHeight: 1.7, marginBottom: 32 }}>
          You&apos;re now on eWork Social. Here&apos;s how to get the most out of your workspace in the next 3 minutes.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32, textAlign: 'left' }}>
          {[
            { step: '1', icon: '🔗', title: 'Connect a social account', desc: 'Link Instagram, Facebook, LinkedIn, Threads, Bluesky and more', href: '/dashboard/settings?tab=social' },
            { step: '2', icon: '📅', title: 'Schedule your first post', desc: 'Write content, pick a time, and let eWork handle the publishing', href: '/dashboard/scheduler' },
            { step: '3', icon: '👥', title: 'Add your first client', desc: 'Manage client accounts and track their pipeline in the CRM', href: '/dashboard/crm' },
          ].map((item) => (
            <a key={item.step} href={item.href} onClick={onClose} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 16px', background: '#f8fafc', borderRadius: 14, textDecoration: 'none', border: '1px solid #e2e8f0', transition: 'border-color 0.2s' }}>
              <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{item.icon}</div>
              <div>
                <p style={{ color: '#0f172a', fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{item.title}</p>
                <p style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.4 }}>{item.desc}</p>
              </div>
              <ArrowRight size={16} style={{ color: '#cbd5e1', marginLeft: 'auto', marginTop: 10, flexShrink: 0 }} />
            </a>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{ width: '100%', background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
        >
          Let&apos;s get started →
        </button>
        <p style={{ color: '#cbd5e1', fontSize: 12, marginTop: 12 }}>You have a 7-day free trial · No credit card needed</p>
      </div>
    </div>
  );
}

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
    // Show welcome modal only once per user
    const key = `ework_welcomed_${user.id}`;
    if (!localStorage.getItem(key)) {
      setShowWelcome(true);
      localStorage.setItem(key, '1');
    }
    // Check if checklist was dismissed
    const dismissedKey = `ework_checklist_dismissed_${user.id}`;
    if (localStorage.getItem(dismissedKey)) {
      setChecklistDismissed(true);
    }
  }, [user]);

  useEffect(() => {
    if (workspace?.id) {
      Promise.all([
        getDashboardStatsAction(workspace.id),
        getRecentPostsAction(workspace.id),
      ]).then(([s, p]) => {
        setStats(s);
        setRecentPosts(p?.slice(0, 4) || []);
      }).catch(console.error)
        .finally(() => setLoading(false));

      // Check for inactive social accounts (expired tokens)
      import('@/lib/api').then(({ default: api }) => {
        api.get(`/social/accounts?workspaceId=${workspace.id}`)
          .then(res => {
            const inactive = res.data.filter((a: any) => !a.isActive);
            setInactiveAccounts(inactive);
          })
          .catch(() => {});
      });
    }
  }, [workspace?.id]);

  const dismissChecklist = () => {
    if (!user) return;
    localStorage.setItem(`ework_checklist_dismissed_${user.id}`, '1');
    setChecklistDismissed(true);
  };

  const checklistSteps = [
    { label: 'Connect a social account', done: (stats?.socialAccounts ?? 0) > 0, href: '/dashboard/settings?tab=social', icon: '🔗' },
    { label: 'Schedule your first post', done: (stats?.totalPosts ?? 0) > 0, href: '/dashboard/scheduler', icon: '📅' },
    { label: 'Add your first client', done: (stats?.totalClients ?? 0) > 0, href: '/dashboard/crm', icon: '👥' },
    { label: 'Set up pipeline automation', done: stats?.hasAutomation ?? false, href: '/dashboard/crm?view=automation', icon: '⚡' },
    { label: 'Invite a team member', done: stats?.hasTeamMember ?? false, href: '/dashboard/settings?tab=workspace', icon: '🤝' },
  ];

  const completedSteps = checklistSteps.filter(s => s.done).length;
  const progressPct = Math.round((completedSteps / checklistSteps.length) * 100);
  const allDone = progressPct === 100;
  const showChecklist = !checklistDismissed;

  const statCards = [
    { label: 'Scheduled Posts', value: stats?.scheduledPosts ?? '...', icon: CalendarDays, color: 'bg-blue-500', href: '/dashboard/scheduler' },
    { label: 'Published Posts', value: stats?.publishedPosts ?? '...', icon: CheckCircle, color: 'bg-green-500', href: '/dashboard/scheduler' },
    { label: 'Total Clients', value: stats?.totalClients ?? '...', icon: Users, color: 'bg-purple-500', href: '/dashboard/crm' },
    { label: 'Social Accounts', value: stats?.socialAccounts ?? '...', icon: Share2, color: 'bg-orange-500', href: '/dashboard/settings?tab=social' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome modal */}
      {showWelcome && user && (
        <WelcomeModal name={user.name?.split(' ')[0] || 'there'} onClose={() => setShowWelcome(false)} />
      )}

      {/* Inactive account banners */}
      {inactiveAccounts.map((account) => (
        <div key={account.id} className="flex items-center justify-between gap-4 px-5 py-3.5 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-center gap-3">
            <PlatformIcon platform={account.platform} size={28} />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                {account.platform} token expired — @{account.accountName}
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                Scheduled posts to this account are paused. Reconnect to resume publishing.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/settings?tab=social"
            className="shrink-0 text-xs font-bold px-3 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition"
          >
            Reconnect →
          </Link>
        </div>
      ))}

      {/* Welcome header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Welcome back, {user?.name?.split(' ')[0]}! 👋
          </h2>
          <p className="text-slate-500 mt-1">
            Here&apos;s what&apos;s happening with <strong>{workspace?.name}</strong> today.
          </p>
        </div>
        <Link href="/dashboard/scheduler"
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition">
          <Zap className="w-4 h-4" /> Create Post
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href}
              className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition group">
              <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-3xl font-bold text-slate-800">{loading ? '...' : stat.value}</p>
              <p className="text-slate-500 text-xs mt-1">{stat.label}</p>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick actions */}
        <div className={showChecklist ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 h-full">
            <h3 className="font-bold text-slate-800 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => {
                const ActionIcon = action.icon;
                return (
                  <Link key={action.label} href={action.href}
                    className="flex items-start gap-3 p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition group">
                    <div className={`w-9 h-9 ${action.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <ActionIcon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-700 text-sm">{action.label}</p>
                      <p className="text-slate-400 text-xs mt-0.5">{action.desc}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Onboarding checklist */}
        {showChecklist && (
          <div className="relative">
            <div className={`rounded-xl p-6 text-white h-full ${allDone ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-blue-600 to-blue-800'}`}>
              {/* Dismiss button */}
              <button
                onClick={dismissChecklist}
                title="Dismiss checklist"
                style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
              >
                <X size={14} />
              </button>

              <div className="flex items-center justify-between mb-2 pr-6">
                <h3 className="font-bold text-lg">{allDone ? '🎉 All done!' : '🚀 Getting Started'}</h3>
                <span className="text-blue-200 text-sm">{completedSteps}/{checklistSteps.length}</span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-white/20 rounded-full mb-5 overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
              </div>

              <div className="space-y-3">
                {checklistSteps.map((step) => (
                  <a key={step.label} href={step.href}
                    className="flex items-center gap-3 group/step hover:opacity-80 transition-opacity no-underline">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      step.done ? 'bg-green-400 text-white' : 'bg-white/20 text-white'
                    }`}>
                      {step.done ? '✓' : step.icon}
                    </div>
                    <span className={`flex-1 text-sm ${step.done ? 'line-through opacity-60' : 'text-blue-50'}`}>
                      {step.label}
                    </span>
                    {!step.done && <ArrowRight className="w-3.5 h-3.5 text-blue-300 opacity-0 group-hover/step:opacity-100 transition-opacity" />}
                  </a>
                ))}
              </div>

              {allDone && (
                <div className="mt-5 p-3 bg-white/15 rounded-xl text-center">
                  <p className="text-sm font-semibold">You&apos;re fully set up! 🚀</p>
                  <p className="text-green-100 text-xs mt-0.5">Your workspace is ready to grow</p>
                  <button onClick={dismissChecklist} className="mt-2 text-xs text-green-100 underline underline-offset-2 bg-transparent border-none cursor-pointer">
                    Dismiss this panel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Recent posts */}
      {recentPosts.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800">Recent Posts</h3>
            <Link href="/dashboard/scheduler" className="text-blue-600 text-sm font-medium hover:underline">
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {recentPosts.map((post: any) => {
              const status = statusConfig[post.status] || statusConfig.DRAFT;
              const StatusIcon = status.icon;
              return (
                <div key={post.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
                  <PlatformIcon platform={post.socialAccount?.platform || ''} size={32} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 truncate">{post.content}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{post.socialAccount?.accountName}</p>
                  </div>
                  {post.mediaUrls?.length > 0 && (
                    <span className="text-xs text-slate-400 flex-shrink-0">📎 {post.mediaUrls.length}</span>
                  )}
                  <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${status.color}`}>
                    <StatusIcon className="w-3 h-3" />{status.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
