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
  TrendingUp, Share2, UserCheck, BarChart2,
} from 'lucide-react';

import PlatformIcon from '@/components/ui/PlatformIcon';

/* ─── Platform chart colours (for Recharts bars) ─────────────── */
const PLATFORM_CHART_COLOR: Record<string, string> = {
  FACEBOOK: '#3b82f6', INSTAGRAM: '#ec4899', TWITTER:  '#0ea5e9',
  THREADS:  '#94a3b8', LINKEDIN:  '#0077b5', BLUESKY:  '#0085ff',
  TIKTOK:   '#8b5cf6', YOUTUBE:   '#ef4444',
};

/* ─── Stat card config ───────────────────────────────────────── */
const STAT_CARDS = [
  { key: 'totalPosts',     label: 'Total Posts',     icon: FileText,   gradient: 'linear-gradient(135deg,#1e293b 0%,#1e2d42 100%)', glow: 'rgba(99,102,241,0.5)',  accent: '#a5b4fc' },
  { key: 'scheduledPosts', label: 'Scheduled',       icon: Clock,      gradient: 'linear-gradient(135deg,#1e3a5f 0%,#1e2d42 100%)', glow: 'rgba(59,130,246,0.5)',  accent: '#93c5fd' },
  { key: 'publishedPosts', label: 'Published',       icon: CheckCircle,gradient: 'linear-gradient(135deg,#0c2a20 0%,#1e2d42 100%)', glow: 'rgba(16,185,129,0.5)', accent: '#6ee7b7' },
  { key: 'socialAccounts', label: 'Social Accounts', icon: Share2,     gradient: 'linear-gradient(135deg,#2d1508 0%,#1e2d42 100%)', glow: 'rgba(249,115,22,0.5)', accent: '#fdba74' },
  { key: 'totalClients',   label: 'Total Clients',   icon: Users,      gradient: 'linear-gradient(135deg,#2d1854 0%,#1e2d42 100%)', glow: 'rgba(139,92,246,0.5)', accent: '#c4b5fd' },
  { key: 'activeClients',  label: 'Active Clients',  icon: UserCheck,  gradient: 'linear-gradient(135deg,#0c2a20 0%,#1e2d42 100%)', glow: 'rgba(16,185,129,0.5)', accent: '#86efac' },
  { key: 'openLeads',      label: 'Open Leads',      icon: TrendingUp, gradient: 'linear-gradient(135deg,#2d1f08 0%,#1e2d42 100%)', glow: 'rgba(245,158,11,0.5)', accent: '#fcd34d' },
] as const;

/* ─── Pipeline stage colours ─────────────────────────────────── */
const PIPELINE_COLORS: Record<string, string> = {
  LEAD: '#60a5fa', CONTACTED: '#a78bfa', PROPOSAL: '#fbbf24',
  ACTIVE: '#34d399', DORMANT: '#f87171',
};

/* ─── Status config for recent posts ────────────────────────── */
const STATUS_META: Record<string, { label: string; textColor: string; bg: string }> = {
  DRAFT:     { label: 'Draft',     textColor: '#94a3b8', bg: 'rgba(100,116,139,0.12)'  },
  SCHEDULED: { label: 'Scheduled', textColor: '#60a5fa', bg: 'rgba(59,130,246,0.12)'  },
  PUBLISHED: { label: 'Published', textColor: '#34d399', bg: 'rgba(16,185,129,0.12)'  },
  FAILED:    { label: 'Failed',    textColor: '#f87171', bg: 'rgba(239,68,68,0.12)'   },
};


/* ─── Dark chart tooltip ─────────────────────────────────────── */
const darkTooltip = {
  contentStyle: {
    background: '#1e2d42',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    color: '#f1f5f9',
    fontSize: 12,
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  },
  labelStyle: { color: '#94a3b8', marginBottom: 4 },
  itemStyle: { color: '#e2e8f0' },
};

const darkAxisTick = { fontSize: 11, fill: 'rgba(148,163,184,0.75)' };

export default function AnalyticsPage() {
  const { workspace } = useAuthStore();
  const [stats, setStats]       = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [pipeline, setPipeline] = useState<any[]>([]);
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => { if (workspace?.id) loadAll(); }, [workspace?.id]);

  const loadAll = async () => {
    try {
      const [s, a, p, pl, rp] = await Promise.all([
        getDashboardStatsAction(workspace!.id),
        getPostActivityAction(workspace!.id),
        getPipelineBreakdownAction(workspace!.id),
        getPlatformBreakdownAction(workspace!.id),
        getRecentPostsAction(workspace!.id),
      ]);
      setStats(s); setActivity(a); setPipeline(p); setPlatforms(pl); setRecentPosts(rp);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid rgba(99,102,241,0.3)', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 14px' }} />
          <p style={{ color: '#94a3b8', fontSize: 13 }}>Loading analytics…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Hero header ───────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg,#1e2d42 0%,#1e293b 60%,#1e2e40 100%)',
        borderRadius: 20, padding: '28px 32px',
        border: '1px solid rgba(255,255,255,0.10)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -30, right: 60,  width: 200, height: 200, borderRadius: '50%', background: 'rgba(99,102,241,0.1)', filter: 'blur(50px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -30, right: 0, width: 160, height: 160, borderRadius: '50%', background: 'rgba(245,158,11,0.08)', filter: 'blur(40px)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 13, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 0 20px rgba(99,102,241,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <BarChart2 size={20} color="#fff" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>Analytics</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(148,163,184,0.85)' }}>Track performance across all your platforms and clients</p>
          </div>
        </div>
      </div>

      {/* ── Stat cards — row 1 (posts) ────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {STAT_CARDS.slice(0, 4).map(card => {
          const Icon = card.icon;
          return (
            <div key={card.key} style={{ background: card.gradient, borderRadius: 16, padding: '20px 22px', border: '1px solid rgba(255,255,255,0.10)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -24, right: -24, width: 80, height: 80, borderRadius: '50%', background: card.glow, filter: 'blur(22px)', pointerEvents: 'none' }} />
              <div style={{ position: 'relative' }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(255,255,255,0.08)', border: `1px solid ${card.accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                  <Icon size={14} color={card.accent} />
                </div>
                <p style={{ margin: 0, fontSize: 30, fontWeight: 800, color: '#f1f5f9', lineHeight: 1 }}>{stats?.[card.key] ?? 0}</p>
                <p style={{ margin: '6px 0 0', fontSize: 11, fontWeight: 600, color: 'rgba(148,163,184,0.7)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{card.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Stat cards — row 2 (CRM) ──────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {STAT_CARDS.slice(4).map(card => {
          const Icon = card.icon;
          return (
            <div key={card.key} style={{ background: card.gradient, borderRadius: 16, padding: '20px 22px', border: '1px solid rgba(255,255,255,0.10)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -24, right: -24, width: 80, height: 80, borderRadius: '50%', background: card.glow, filter: 'blur(22px)', pointerEvents: 'none' }} />
              <div style={{ position: 'relative' }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(255,255,255,0.08)', border: `1px solid ${card.accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                  <Icon size={14} color={card.accent} />
                </div>
                <p style={{ margin: 0, fontSize: 30, fontWeight: 800, color: '#f1f5f9', lineHeight: 1 }}>{stats?.[card.key] ?? 0}</p>
                <p style={{ margin: '6px 0 0', fontSize: 11, fontWeight: 600, color: 'rgba(148,163,184,0.7)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{card.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Post activity chart ───────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg,#1e2d42 0%,#243756 100%)', borderRadius: 20, padding: '28px 28px 20px', border: '1px solid rgba(255,255,255,0.10)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 8px rgba(99,102,241,0.8)' }} />
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>Post Activity — Last 30 Days</p>
        </div>
        {activity.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={activity}>
              <defs>
                <linearGradient id="activityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={darkAxisTick} interval={4} axisLine={false} tickLine={false} />
              <YAxis tick={darkAxisTick} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip {...darkTooltip} />
              <Area type="monotone" dataKey="posts" stroke="#818cf8" strokeWidth={2.5} fill="url(#activityGrad)" name="Posts Created" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: 'rgba(148,163,184,0.5)', fontSize: 13 }}>No post activity yet — start scheduling posts to see data here.</p>
          </div>
        )}
      </div>

      {/* ── Pipeline + Platform breakdown ─────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* CRM Pipeline pie */}
        <div style={{ background: 'linear-gradient(135deg,#1e2d42 0%,#243756 100%)', borderRadius: 20, padding: '28px 24px 20px', border: '1px solid rgba(255,255,255,0.10)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6', boxShadow: '0 0 8px rgba(139,92,246,0.8)' }} />
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>CRM Pipeline</p>
          </div>
          {pipeline.some(p => p.count > 0) ? (
            <>
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie data={pipeline.filter(p => p.count > 0)} dataKey="count" nameKey="stage" cx="50%" cy="50%" outerRadius={76} strokeWidth={0}>
                    {pipeline.filter(p => p.count > 0).map(entry => (
                      <Cell key={entry.stage} fill={PIPELINE_COLORS[entry.stage] || '#60a5fa'} />
                    ))}
                  </Pie>
                  <Tooltip {...darkTooltip} />
                  <Legend formatter={(v) => <span style={{ fontSize: 11, color: 'rgba(148,163,184,0.85)' }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 12 }}>
                {pipeline.map(p => (
                  <div key={p.stage} style={{ textAlign: 'center', padding: '8px 4px', background: 'rgba(255,255,255,0.04)', borderRadius: 10 }}>
                    <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: PIPELINE_COLORS[p.stage] || '#f1f5f9' }}>{p.count}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 10, fontWeight: 600, color: 'rgba(148,163,184,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{p.stage}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ color: 'rgba(148,163,184,0.5)', fontSize: 13, textAlign: 'center' }}>No CRM data yet — add contacts to see your pipeline.</p>
            </div>
          )}
        </div>

        {/* Posts by platform bar chart */}
        <div style={{ background: 'linear-gradient(135deg,#1e2d42 0%,#243756 100%)', borderRadius: 20, padding: '28px 24px 20px', border: '1px solid rgba(255,255,255,0.10)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ec4899', boxShadow: '0 0 8px rgba(236,72,153,0.8)' }} />
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>Posts by Platform</p>
          </div>
          {platforms.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={platforms} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="platform" tick={darkAxisTick} axisLine={false} tickLine={false} />
                <YAxis tick={darkAxisTick} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip {...darkTooltip} />
                <Bar dataKey="posts" name="Posts" radius={[8, 8, 0, 0]}>
                  {platforms.map((entry) => {
                    return <Cell key={entry.platform} fill={PLATFORM_CHART_COLOR[entry.platform] || '#6366f1'} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ color: 'rgba(148,163,184,0.5)', fontSize: 13, textAlign: 'center' }}>No platform data yet — schedule posts to see breakdown.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Recent posts ──────────────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg,#1e2d42 0%,#243756 100%)', borderRadius: 20, padding: '24px 24px 20px', border: '1px solid rgba(255,255,255,0.10)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px rgba(52,211,153,0.8)' }} />
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>Recent Posts</p>
        </div>
        {recentPosts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <p style={{ color: 'rgba(148,163,184,0.5)', fontSize: 13 }}>No posts yet — start creating content from the Scheduler.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentPosts.map(post => {
              const sMeta = STATUS_META[post.status] || STATUS_META.DRAFT;
              return (
                <div key={post.id} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  borderRadius: 14,
                }}>
                  <PlatformIcon platform={post.socialAccount?.platform || ''} size="md" glow />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {post.content}
                    </p>
                    <p style={{ margin: '3px 0 0', fontSize: 11, color: 'rgba(148,163,184,0.65)' }}>
                      {post.socialAccount?.accountName} · {new Date(post.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <div style={{ padding: '5px 11px', borderRadius: 99, background: sMeta.bg, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: sMeta.textColor }}>{sMeta.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
