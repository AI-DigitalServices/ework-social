'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import {
  getPostActivityAction,
  getPipelineBreakdownAction,
  getPlatformBreakdownAction,
  getRecentPostsAction,
  getDashboardStatsAction,
} from '@/actions/analytics.actions';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  FileText, Clock, CheckCircle, Users,
  TrendingUp, Share2, UserCheck,
} from 'lucide-react';

const PIPELINE_COLORS: Record<string, string> = {
  LEAD: '#94a3b8',
  CONTACTED: '#3b82f6',
  PROPOSAL: '#f59e0b',
  ACTIVE: '#22c55e',
  DORMANT: '#ef4444',
};

const PLATFORM_COLORS = ['#3b82f6', '#ec4899', '#0ea5e9', '#8b5cf6', '#f59e0b'];

const statusConfig: Record<string, { color: string; label: string }> = {
  DRAFT: { color: 'bg-slate-100 text-slate-600', label: 'Draft' },
  SCHEDULED: { color: 'bg-blue-100 text-blue-600', label: 'Scheduled' },
  PUBLISHED: { color: 'bg-green-100 text-green-600', label: 'Published' },
  FAILED: { color: 'bg-red-100 text-red-600', label: 'Failed' },
};

const platformIcons: Record<string, string> = {
  FACEBOOK: '📘', INSTAGRAM: '📸', TWITTER: '🐦',
  LINKEDIN: '💼', TIKTOK: '🎵', YOUTUBE: '▶️',
};

export default function AnalyticsPage() {
  const { workspace } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [pipeline, setPipeline] = useState<any[]>([]);
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (workspace?.id) loadAll();
  }, [workspace?.id]);

  const loadAll = async () => {
    try {
      const [s, a, p, pl, rp] = await Promise.all([
        getDashboardStatsAction(workspace!.id),
        getPostActivityAction(workspace!.id),
        getPipelineBreakdownAction(workspace!.id),
        getPlatformBreakdownAction(workspace!.id),
        getRecentPostsAction(workspace!.id),
      ]);
      setStats(s);
      setActivity(a);
      setPipeline(p);
      setPlatforms(pl);
      setRecentPosts(rp);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Total Posts', value: stats?.totalPosts ?? 0, icon: FileText, color: 'text-slate-600 bg-slate-100' },
    { label: 'Scheduled', value: stats?.scheduledPosts ?? 0, icon: Clock, color: 'text-blue-600 bg-blue-100' },
    { label: 'Published', value: stats?.publishedPosts ?? 0, icon: CheckCircle, color: 'text-green-600 bg-green-100' },
    { label: 'Total Clients', value: stats?.totalClients ?? 0, icon: Users, color: 'text-purple-600 bg-purple-100' },
    { label: 'Active Clients', value: stats?.activeClients ?? 0, icon: UserCheck, color: 'text-green-600 bg-green-100' },
    { label: 'Open Leads', value: stats?.openLeads ?? 0, icon: TrendingUp, color: 'text-yellow-600 bg-yellow-100' },
    { label: 'Social Accounts', value: stats?.socialAccounts ?? 0, icon: Share2, color: 'text-pink-600 bg-pink-100' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Analytics</h2>
        <p className="text-slate-500 mt-1">Track your performance across all platforms.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {statCards.map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${stat.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
              <p className="text-slate-500 text-xs mt-0.5">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Post activity chart */}
      <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-6">Post Activity — Last 30 Days</h3>
        {activity.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={activity}>
              <defs>
                <linearGradient id="colorPosts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                interval={4}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
              <Area
                type="monotone"
                dataKey="posts"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#colorPosts)"
                name="Posts Created"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-slate-400">
            No post activity yet
          </div>
        )}
      </div>

      {/* Pipeline + Platform breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pipeline breakdown */}
        <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6">CRM Pipeline</h3>
          {pipeline.some(p => p.count > 0) ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pipeline.filter(p => p.count > 0)}
                    dataKey="count"
                    nameKey="stage"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    strokeWidth={2}
                  >
                    {pipeline.filter(p => p.count > 0).map((entry) => (
                      <Cell
                        key={entry.stage}
                        fill={PIPELINE_COLORS[entry.stage]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend
                    formatter={(value) => (
                      <span style={{ fontSize: 12, color: '#64748b' }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-3 gap-2 mt-4">
                {pipeline.map(p => (
                  <div key={p.stage} className="text-center">
                    <p className="text-lg font-bold text-slate-800">{p.count}</p>
                    <p className="text-xs text-slate-500">{p.stage}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400">
              No CRM data yet
            </div>
          )}
        </div>

        {/* Platform breakdown */}
        <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6">Posts by Platform</h3>
          {platforms.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={platforms}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="platform"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip />
                <Bar dataKey="posts" name="Posts" radius={[6, 6, 0, 0]}>
                  {platforms.map((_, index) => (
                    <Cell
                      key={index}
                      fill={PLATFORM_COLORS[index % PLATFORM_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400">
              No platform data yet
            </div>
          )}
        </div>
      </div>

      {/* Recent posts */}
      <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-4">Recent Posts</h3>
        {recentPosts.length === 0 ? (
          <p className="text-center text-slate-400 py-8">No posts yet</p>
        ) : (
          <div className="space-y-3">
            {recentPosts.map(post => {
              const status = statusConfig[post.status] || statusConfig.DRAFT;
              return (
                <div
                  key={post.id}
                  className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition"
                >
                  <span className="text-xl">
                    {platformIcons[post.socialAccount?.platform] || '📱'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 truncate">{post.content}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {post.socialAccount?.accountName} · {new Date(post.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${status.color}`}>
                    {status.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
