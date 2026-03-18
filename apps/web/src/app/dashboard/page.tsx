'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { getDashboardStatsAction, getRecentPostsAction } from '@/actions/analytics.actions';
import {
  CalendarDays, Users, TrendingUp, Share2, ArrowRight,
  CheckCircle, Clock, AlertCircle, Zap, Gift, BarChart3,
} from 'lucide-react';
import Link from 'next/link';

const quickActions = [
  { label: '📅 Schedule a Post', desc: 'Create and schedule content', href: '/dashboard/scheduler', color: 'hover:border-blue-200 hover:bg-blue-50 group-hover:text-blue-700' },
  { label: '👥 Add a Client', desc: 'Add to your CRM pipeline', href: '/dashboard/crm', color: 'hover:border-green-200 hover:bg-green-50 group-hover:text-green-700' },
  { label: '📊 View Analytics', desc: 'Track your performance', href: '/dashboard/analytics', color: 'hover:border-purple-200 hover:bg-purple-50 group-hover:text-purple-700' },
  { label: '🔗 Connect Platform', desc: 'Add social accounts', href: '/dashboard/settings?tab=social', color: 'hover:border-yellow-200 hover:bg-yellow-50 group-hover:text-yellow-700' },
  { label: '⚡ Set Automation', desc: 'Auto-send pipeline emails', href: '/dashboard/crm?view=automation', color: 'hover:border-pink-200 hover:bg-pink-50 group-hover:text-pink-700' },
  { label: '🎁 Refer & Earn', desc: 'Get 20% commission', href: '/dashboard/settings?tab=referral', color: 'hover:border-orange-200 hover:bg-orange-50 group-hover:text-orange-700' },
];

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
  DRAFT: { icon: Clock, color: 'text-slate-500 bg-slate-100', label: 'Draft' },
  SCHEDULED: { icon: Clock, color: 'text-blue-600 bg-blue-100', label: 'Scheduled' },
  PUBLISHED: { icon: CheckCircle, color: 'text-green-600 bg-green-100', label: 'Published' },
  FAILED: { icon: AlertCircle, color: 'text-red-600 bg-red-100', label: 'Failed' },
};

const platformIcons: Record<string, string> = {
  FACEBOOK: '📘', INSTAGRAM: '📸', TWITTER: '🐦',
  LINKEDIN: '💼', TIKTOK: '🎵', YOUTUBE: '▶️',
};

export default function DashboardPage() {
  const { user, workspace } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    }
  }, [workspace?.id]);

  const statCards = [
    { label: 'Scheduled Posts', value: stats?.scheduledPosts ?? '...', icon: CalendarDays, color: 'bg-blue-500', href: '/dashboard/scheduler' },
    { label: 'Published Posts', value: stats?.publishedPosts ?? '...', icon: CheckCircle, color: 'bg-green-500', href: '/dashboard/scheduler' },
    { label: 'Total Clients', value: stats?.totalClients ?? '...', icon: Users, color: 'bg-purple-500', href: '/dashboard/crm' },
    { label: 'Social Accounts', value: stats?.socialAccounts ?? '...', icon: Share2, color: 'bg-orange-500', href: '/dashboard/settings?tab=social' },
  ];

  const checklistSteps = [
    { label: 'Connect a social account', done: (stats?.socialAccounts ?? 0) > 0, href: '/dashboard/settings?tab=social', icon: '🔗' },
    { label: 'Schedule your first post', done: (stats?.totalPosts ?? 0) > 0, href: '/dashboard/scheduler', icon: '📅' },
    { label: 'Add your first client', done: (stats?.totalClients ?? 0) > 0, href: '/dashboard/crm', icon: '👥' },
    { label: 'Set up pipeline automation', done: false, href: '/dashboard/crm?view=automation', icon: '⚡' },
    { label: 'Invite a team member', done: false, href: '/dashboard/settings?tab=workspace', icon: '🤝' },
  ];

  const completedSteps = checklistSteps.filter(s => s.done).length;
  const progressPct = Math.round((completedSteps / checklistSteps.length) * 100);

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Welcome back, {user?.name?.split(' ')[0]}! 👋
          </h2>
          <p className="text-slate-500 mt-1">
            Here's what's happening with <strong>{workspace?.name}</strong> today.
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
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <Link key={action.label} href={action.href}
                className={`flex items-start justify-between p-4 rounded-xl border border-slate-100 transition group ${action.color}`}>
                <div>
                  <p className="font-medium text-slate-700 text-sm">{action.label}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{action.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0 mt-0.5" />
              </Link>
            ))}
          </div>
        </div>

        {/* Onboarding checklist */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-lg">🚀 Getting Started</h3>
            <span className="text-blue-200 text-sm">{completedSteps}/{checklistSteps.length}</span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-white/20 rounded-full mb-5 overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progressPct}%` }} />
          </div>

          <div className="space-y-3">
            {checklistSteps.map((step, i) => (
              <a key={step.label} href={step.href}
                className="flex items-center gap-3 group/step hover:opacity-80 transition-opacity no-underline">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  step.done ? 'bg-green-400 text-white' : 'bg-white/20 text-white'
                }`}>
                  {step.done ? '✓' : step.icon}
                </div>
                <span className={`flex-1 text-sm ${step.done ? 'line-through text-blue-200' : 'text-blue-50'}`}>
                  {step.label}
                </span>
                {!step.done && <ArrowRight className="w-3.5 h-3.5 text-blue-300 opacity-0 group-hover/step:opacity-100 transition-opacity" />}
              </a>
            ))}
          </div>

          {progressPct === 100 && (
            <div className="mt-4 p-3 bg-white/10 rounded-xl text-center">
              <p className="text-sm font-semibold">🎉 Setup complete!</p>
              <p className="text-blue-200 text-xs mt-0.5">You're ready to grow</p>
            </div>
          )}
        </div>
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
                  <span className="text-xl flex-shrink-0">{platformIcons[post.socialAccount?.platform] || '📱'}</span>
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
