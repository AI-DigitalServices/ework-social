'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import {
  Users, TrendingUp, DollarSign, BarChart3, CheckCircle,
  AlertCircle, RefreshCw, Globe, Crown, Activity,
  Zap, Server, Clock, MessageSquare, Send, Star,
  FileText, UserCheck,
} from 'lucide-react';
import { BLOG_POST_COUNT } from '@/content/blog/posts';

const ADMIN_EMAILS = ['admin@eworksocial.com', 'eworksocial@gmail.com', 'aiservices.agent@gmail.com'];

const planColors: Record<string, string> = {
  FREE: '#4A6080', TRIAL: '#2563EB', STARTER: '#10B981', GROWTH: '#8B5CF6', AGENCY_PRO: '#F59E0B',
};

const PIPELINE_COLORS: Record<string, string> = {
  LEAD: '#60a5fa', CONTACTED: '#a78bfa', PROPOSAL: '#fbbf24', ACTIVE: '#34d399', DORMANT: '#f87171',
};

export default function AdminPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const [kpi, setKpi]           = useState<any>(null);
  const [failedPosts, setFailedPosts] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [health, setHealth]     = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [partners, setPartners] = useState<any>(null);
  const [waitlist, setWaitlist] = useState<{ total: number; entries: any[] } | null>(null);
  const [loading, setLoading]   = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [hasHydrated, setHasHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'partners' | 'subscriptions' | 'failed' | 'health' | 'waitlist'>('overview');

  useEffect(() => { setHasHydrated(true); }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!token) { router.push('/login'); return; }
    if (user && !ADMIN_EMAILS.includes(user.email)) { router.push('/dashboard'); return; }
    if (user && ADMIN_EMAILS.includes(user.email)) loadAll();
  }, [hasHydrated, token, user]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [kpiRes, failedRes, subsRes, healthRes, refRes, waitlistRes, partnersRes] = await Promise.all([
        api.get('/admin/kpi'),
        api.get('/admin/failed-posts'),
        api.get('/admin/subscriptions'),
        api.get('/admin/health'),
        api.get('/admin/referrals'),
        api.get('/admin/waitlist'),
        api.get('/admin/partners'),
      ]);
      setKpi(kpiRes.data);
      setFailedPosts(failedRes.data);
      setSubscriptions(subsRes.data);
      setHealth(healthRes.data);
      setReferrals(refRes.data);
      setWaitlist(waitlistRes.data);
      setPartners(partnersRes.data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const s = {
    page:    { minHeight: '100vh', background: '#080C14', fontFamily: 'Inter, sans-serif', padding: '40px 24px' },
    wrap:    { maxWidth: 1280, margin: '0 auto' },
    card:    { background: '#0C1524', border: '1px solid #1A2840', borderRadius: 16, padding: 24 },
    label:   { color: '#4A6080', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 1 },
    value:   { color: '#F0F6FF', fontSize: 28, fontWeight: 700, marginBottom: 4 },
    sub:     { color: '#4A6080', fontSize: 11 },
    th:      { padding: '8px 12px', textAlign: 'left' as const, color: '#4A6080', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 1 },
    td:      { padding: '12px', color: '#E8F0FA', fontSize: 14 },
    tdMuted: { padding: '12px', color: '#6B8299', fontSize: 13 },
    row:     { borderBottom: '1px solid #0F1E2E' },
  };

  if (loading || !kpi) return (
    <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '4px solid #2563EB', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#4A6080', fontSize: 13 }}>Loading founder dashboard…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  /* ── KPI card rows ─────────────────────────────────────────── */
  const kpiRow1 = [
    { label: 'Total Users',     value: kpi.users.total,             sub: `+${kpi.users.today} today`,                                           icon: Users,       color: '#2563EB', bg: '#1E3A5F' },
    { label: 'New This Week',   value: kpi.users.thisWeek,          sub: `${kpi.users.growthRate >= 0 ? '+' : ''}${kpi.users.growthRate}% vs last month`, icon: TrendingUp,  color: '#10B981', bg: '#064E3B' },
    { label: 'Paying Users',    value: kpi.revenue.payingUsers,     sub: `of ${kpi.users.total} total`,                                         icon: Crown,       color: '#F59E0B', bg: '#451A03' },
    { label: 'MRR',             value: `$${kpi.revenue.mrr}`,       sub: `ARR: $${kpi.revenue.arr}`,                                            icon: DollarSign,  color: '#8B5CF6', bg: '#2E1065' },
    { label: 'Total Posts',     value: kpi.product.totalPosts,      sub: `${kpi.product.postsThisMonth} this month`,                            icon: BarChart3,   color: '#06B6D4', bg: '#0C4A6E' },
    { label: 'Publish Rate',    value: `${kpi.product.publishSuccessRate}%`, sub: `${kpi.product.failedPosts} failed`,                          icon: CheckCircle, color: '#10B981', bg: '#064E3B' },
    { label: 'Social Accounts', value: kpi.product.totalSocialAccounts, sub: 'connected',                                                       icon: Globe,       color: '#F59E0B', bg: '#451A03' },
    { label: 'Total Clients',   value: kpi.product.totalClients,    sub: 'in CRM',                                                              icon: Users,       color: '#EC4899', bg: '#500724' },
  ];

  const kpiRow2 = [
    { label: 'Auto-Responder Triggers', value: kpi.engagement.totalAutoTriggers, sub: `${kpi.engagement.activeAutoRules} active rules`,         icon: Zap,         color: '#F59E0B', bg: '#451A03' },
    { label: 'Open Inbox Threads',      value: kpi.engagement.openInboxThreads,  sub: `${kpi.engagement.totalInboxMessages} total received`,     icon: MessageSquare,color: '#06B6D4', bg: '#0C4A6E' },
    { label: 'Pending Approvals',       value: kpi.engagement.pendingApprovals,  sub: `${kpi.engagement.totalApprovals} total sent`,             icon: Send,        color: '#8B5CF6', bg: '#2E1065' },
    { label: 'Blog Posts Live',         value: BLOG_POST_COUNT,                  sub: 'driving SEO traffic',                                     icon: FileText,    color: '#10B981', bg: '#064E3B' },
    { label: 'Total Partners',          value: partners?.summary?.totalPartners ?? 0,    sub: `${partners?.summary?.foundingPartners ?? 0} founding`, icon: Star,    color: '#F59E0B', bg: '#451A03' },
    { label: 'Partner Referrals',       value: partners?.summary?.totalPayingReferrals ?? 0, sub: `${partners?.summary?.totalReferrals ?? 0} total referred`, icon: UserCheck, color: '#EC4899', bg: '#500724' },
    { label: 'Est. Commission Owed',    value: `₦${(partners?.summary?.totalEstimatedCommission ?? 0).toLocaleString()}`, sub: 'to all partners', icon: DollarSign, color: '#8B5CF6', bg: '#2E1065' },
    { label: 'Waitlist Signups',        value: waitlist?.total ?? 0,             sub: `${waitlist?.entries?.filter((e: any) => new Date(e.createdAt) > new Date(Date.now() - 7*86400000)).length ?? 0} this week`, icon: Users, color: '#2563EB', bg: '#1E3A5F' },
  ];

  const tabs = [
    { id: 'overview',       label: '📊 Overview' },
    { id: 'partners',       label: `⭐ Partners (${partners?.summary?.totalPartners ?? 0})` },
    { id: 'subscriptions',  label: `💳 Subscriptions (${subscriptions.length})` },
    { id: 'failed',         label: `❌ Failed Posts (${failedPosts.length})` },
    { id: 'health',         label: '🖥️ System Health' },
    { id: 'waitlist',       label: `🏆 Waitlist (${waitlist?.total ?? 0})` },
  ];

  return (
    <div style={s.page}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={s.wrap}>

        {/* ── Header ─────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <img src="/icon.png" alt="eWork Social" style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover' }} />
              <h1 style={{ color: '#F0F6FF', fontSize: 24, fontWeight: 700 }}>Founder Dashboard</h1>
            </div>
            <p style={{ color: '#4A6080', fontSize: 13 }}>Last refreshed: {lastRefresh.toLocaleTimeString()}</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={loadAll} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#0C1524', border: '1px solid #1A2840', borderRadius: 10, color: '#6B8299', cursor: 'pointer', fontSize: 13 }}>
              <RefreshCw size={14} /> Refresh
            </button>
            <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#2563EB', borderRadius: 10, color: 'white', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
              → App Dashboard
            </a>
          </div>
        </div>

        {/* ── KPI Row 1 — Core metrics ───────────────────────────── */}
        <p style={{ color: '#4A6080', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>Core Metrics</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 14 }}>
          {kpiRow1.map((card, i) => {
            const Icon = card.icon;
            return (
              <div key={i} style={s.card}>
                <div style={{ width: 34, height: 34, background: card.bg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                  <Icon size={16} color={card.color} />
                </div>
                <p style={s.value}>{card.value}</p>
                <p style={s.label}>{card.label}</p>
                <p style={{ ...s.sub, marginTop: 4 }}>{card.sub}</p>
              </div>
            );
          })}
        </div>

        {/* ── KPI Row 2 — Engagement & Growth ───────────────────── */}
        <p style={{ color: '#4A6080', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10, marginTop: 6 }}>Engagement · Partners · Growth</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 32 }}>
          {kpiRow2.map((card, i) => {
            const Icon = card.icon;
            return (
              <div key={i} style={{ ...s.card, borderLeft: `3px solid ${card.color}30` }}>
                <div style={{ width: 34, height: 34, background: card.bg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                  <Icon size={16} color={card.color} />
                </div>
                <p style={s.value}>{card.value}</p>
                <p style={s.label}>{card.label}</p>
                <p style={{ ...s.sub, marginTop: 4 }}>{card.sub}</p>
              </div>
            );
          })}
        </div>

        {/* ── Tabs ───────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              style={{ padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, background: activeTab === tab.id ? '#2563EB' : '#0C1524', color: activeTab === tab.id ? 'white' : '#6B8299', transition: 'all 0.2s' }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Overview Tab ───────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

            {/* Plan breakdown */}
            <div style={s.card}>
              <h3 style={{ color: '#F0F6FF', fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Plan Breakdown</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Object.entries(kpi.revenue.planBreakdown).map(([plan, count]: any) => (
                  <div key={plan} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 9, height: 9, borderRadius: '50%', background: planColors[plan] || '#4A6080' }} />
                      <span style={{ color: '#8FA8C0', fontSize: 14 }}>{plan}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 80, height: 5, background: '#1A2840', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${kpi.users.total > 0 ? (count / kpi.users.total) * 100 : 0}%`, height: '100%', background: planColors[plan] || '#4A6080', borderRadius: 3 }} />
                      </div>
                      <span style={{ color: '#F0F6FF', fontSize: 14, fontWeight: 600, minWidth: 20, textAlign: 'right' }}>{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CRM Pipeline breakdown */}
            <div style={s.card}>
              <h3 style={{ color: '#F0F6FF', fontSize: 15, fontWeight: 700, marginBottom: 20 }}>CRM Pipeline</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Object.entries(kpi.crmPipeline).map(([stage, count]: any) => (
                  <div key={stage} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 9, height: 9, borderRadius: '50%', background: PIPELINE_COLORS[stage] || '#4A6080' }} />
                      <span style={{ color: '#8FA8C0', fontSize: 14 }}>{stage}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 80, height: 5, background: '#1A2840', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${kpi.product.totalClients > 0 ? (count / kpi.product.totalClients) * 100 : 0}%`, height: '100%', background: PIPELINE_COLORS[stage] || '#4A6080', borderRadius: 3 }} />
                      </div>
                      <span style={{ color: '#F0F6FF', fontSize: 14, fontWeight: 600, minWidth: 20, textAlign: 'right' }}>{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* User growth */}
            <div style={s.card}>
              <h3 style={{ color: '#F0F6FF', fontSize: 15, fontWeight: 700, marginBottom: 20 }}>User Growth</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: 'Today',       value: kpi.users.today,      color: '#2563EB' },
                  { label: 'This Week',   value: kpi.users.thisWeek,   color: '#10B981' },
                  { label: 'This Month',  value: kpi.users.thisMonth,  color: '#8B5CF6' },
                  { label: 'Last Month',  value: kpi.users.lastMonth,  color: '#F59E0B' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#8FA8C0', fontSize: 14 }}>{item.label}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 80, height: 5, background: '#1A2840', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${kpi.users.total > 0 ? (item.value / kpi.users.total) * 100 : 0}%`, height: '100%', background: item.color, borderRadius: 3 }} />
                      </div>
                      <span style={{ color: '#F0F6FF', fontSize: 16, fontWeight: 700, minWidth: 30, textAlign: 'right' }}>{item.value}</span>
                    </div>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid #1A2840', paddingTop: 14, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#8FA8C0', fontSize: 14 }}>Growth Rate</span>
                  <span style={{ color: kpi.users.growthRate >= 0 ? '#10B981' : '#EF4444', fontSize: 16, fontWeight: 700 }}>
                    {kpi.users.growthRate >= 0 ? '+' : ''}{kpi.users.growthRate}%
                  </span>
                </div>
              </div>
            </div>

            {/* Engagement summary */}
            <div style={s.card}>
              <h3 style={{ color: '#F0F6FF', fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Engagement Hub</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: 'Auto-Responder Rules',  value: kpi.engagement.activeAutoRules,   color: '#F59E0B' },
                  { label: 'Total Triggers Fired',  value: kpi.engagement.totalAutoTriggers, color: '#F59E0B' },
                  { label: 'Total Inbox Messages',  value: kpi.engagement.totalInboxMessages, color: '#06B6D4' },
                  { label: 'Open Threads',          value: kpi.engagement.openInboxThreads,  color: kpi.engagement.openInboxThreads > 20 ? '#EF4444' : '#10B981' },
                  { label: 'Approvals Sent',        value: kpi.engagement.totalApprovals,    color: '#8B5CF6' },
                  { label: 'Pending Approval',      value: kpi.engagement.pendingApprovals,  color: kpi.engagement.pendingApprovals > 5 ? '#F59E0B' : '#10B981' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: i < 5 ? '1px solid #0F1E2E' : 'none', paddingBottom: i < 5 ? 12 : 0 }}>
                    <span style={{ color: '#8FA8C0', fontSize: 13 }}>{item.label}</span>
                    <span style={{ color: item.color, fontSize: 15, fontWeight: 700 }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent signups — full width */}
            <div style={{ ...s.card, gridColumn: '1 / -1' }}>
              <h3 style={{ color: '#F0F6FF', fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Recent Signups</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1A2840' }}>
                      {['Name', 'Email', 'Plan', 'Verified', 'Joined'].map(h => <th key={h} style={s.th}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {kpi.recentUsers.map((u: any) => (
                      <tr key={u.id} style={s.row}>
                        <td style={s.td}>{u.name}</td>
                        <td style={s.tdMuted}>{u.email}</td>
                        <td style={s.td}>
                          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: (planColors[u.plan] || '#4A6080') + '30', color: planColors[u.plan] || '#4A6080' }}>{u.plan}</span>
                        </td>
                        <td style={s.td}>
                          {u.isVerified ? <CheckCircle size={15} color="#10B981" /> : <AlertCircle size={15} color="#F59E0B" />}
                        </td>
                        <td style={s.tdMuted}>{new Date(u.joinedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Partners Tab ───────────────────────────────────────── */}
        {activeTab === 'partners' && partners && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14 }}>
              {[
                { label: 'Total Partners',      value: partners.summary.totalPartners,         color: '#2563EB' },
                { label: 'Founding Partners',   value: partners.summary.foundingPartners,      color: '#F59E0B' },
                { label: 'Total Referred',      value: partners.summary.totalReferrals,        color: '#10B981' },
                { label: 'Paying Referrals',    value: partners.summary.totalPayingReferrals,  color: '#8B5CF6' },
                { label: 'Commission Owed',     value: `₦${partners.summary.totalEstimatedCommission.toLocaleString()}`, color: '#EC4899' },
              ].map((stat, i) => (
                <div key={i} style={s.card}>
                  <p style={{ color: stat.color, fontSize: 26, fontWeight: 800, marginBottom: 6 }}>{stat.value}</p>
                  <p style={s.label}>{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Partners table */}
            <div style={s.card}>
              <h3 style={{ color: '#F0F6FF', fontSize: 15, fontWeight: 700, marginBottom: 20 }}>
                All Partners ({partners.partners.length})
              </h3>
              {partners.partners.length === 0 ? (
                <p style={{ color: '#4A6080', textAlign: 'center', padding: '40px 0' }}>No partners yet — share the referral program!</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #1A2840' }}>
                        {['Partner', 'Code', 'Tier', 'Referred', 'Paying', 'Est. Commission', 'Joined'].map(h => (
                          <th key={h} style={s.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {partners.partners.map((p: any) => (
                        <tr key={p.id} style={s.row}>
                          <td style={s.td}>
                            <div>
                              <p style={{ margin: 0, fontWeight: 600 }}>{p.name}</p>
                              <p style={{ margin: 0, color: '#6B8299', fontSize: 12 }}>{p.email}</p>
                            </div>
                          </td>
                          <td style={s.td}>
                            <code style={{ background: '#1A2840', padding: '3px 8px', borderRadius: 6, color: '#4D8FE8', fontSize: 12 }}>{p.referralCode}</code>
                          </td>
                          <td style={s.td}>
                            {p.isFoundingPartner
                              ? <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#451A0360', color: '#F59E0B' }}>⭐ Founding</span>
                              : <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#1E3A5F60', color: '#60a5fa' }}>Standard</span>
                            }
                          </td>
                          <td style={s.td}>{p.totalReferrals}</td>
                          <td style={s.td}><span style={{ color: '#10B981', fontWeight: 700 }}>{p.payingReferrals}</span></td>
                          <td style={s.td}><span style={{ color: '#8B5CF6', fontWeight: 600 }}>₦{p.estimatedCommission.toLocaleString()}</span></td>
                          <td style={s.tdMuted}>{new Date(p.joinedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Subscriptions Tab ──────────────────────────────────── */}
        {activeTab === 'subscriptions' && (
          <div style={s.card}>
            <h3 style={{ color: '#F0F6FF', fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Active Paid Subscriptions ({subscriptions.length})</h3>
            {subscriptions.length === 0 ? (
              <p style={{ color: '#4A6080', textAlign: 'center', padding: '40px 0' }}>No active paid subscriptions yet</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1A2840' }}>
                    {['Workspace', 'Owner', 'Plan', 'Paystack Ref', 'Since'].map(h => <th key={h} style={s.th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((sub: any) => (
                    <tr key={sub.id} style={s.row}>
                      <td style={s.td}>{sub.workspaceName}</td>
                      <td style={s.tdMuted}>{sub.ownerEmail}</td>
                      <td style={s.td}>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: (planColors[sub.plan] || '#4A6080') + '30', color: planColors[sub.plan] || '#4A6080' }}>{sub.plan}</span>
                      </td>
                      <td style={s.td}><code style={{ background: '#1A2840', padding: '3px 8px', borderRadius: 6, color: '#4D8FE8', fontSize: 11 }}>{sub.paystackRef || 'manual'}</code></td>
                      <td style={s.tdMuted}>{new Date(sub.updatedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Failed Posts Tab ───────────────────────────────────── */}
        {activeTab === 'failed' && (
          <div style={s.card}>
            <h3 style={{ color: '#F0F6FF', fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Failed Posts ({failedPosts.length})</h3>
            {failedPosts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <CheckCircle size={40} color="#10B981" style={{ margin: '0 auto 12px' }} />
                <p style={{ color: '#10B981', fontSize: 16, fontWeight: 600 }}>No failed posts</p>
                <p style={{ color: '#4A6080', fontSize: 13, marginTop: 4 }}>All posts published successfully</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1A2840' }}>
                    {['Content', 'Platform', 'Workspace', 'Error', 'When'].map(h => <th key={h} style={s.th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {failedPosts.map((post: any) => (
                    <tr key={post.id} style={s.row}>
                      <td style={{ ...s.tdMuted, maxWidth: 200 }}>{post.content}</td>
                      <td style={s.td}>{post.platform}</td>
                      <td style={s.tdMuted}>{post.workspaceName}</td>
                      <td style={{ padding: '12px', color: '#EF4444', fontSize: 12, maxWidth: 220 }}>{post.errorMessage || 'Unknown error'}</td>
                      <td style={s.tdMuted}>{new Date(post.updatedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── System Health Tab ──────────────────────────────────── */}
        {activeTab === 'health' && health && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div style={s.card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <Activity size={17} color="#10B981" />
                <h3 style={{ color: '#F0F6FF', fontSize: 15, fontWeight: 700 }}>Scheduler Status</h3>
                <span style={{ marginLeft: 'auto', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: health.scheduler.status === 'healthy' ? '#064E3B' : '#451A03', color: health.scheduler.status === 'healthy' ? '#10B981' : '#F59E0B' }}>
                  {health.scheduler.status === 'healthy' ? '✅ Healthy' : '⚠️ Warning'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: 'Scheduled Posts',       value: health.scheduler.scheduledPosts,    color: '#2563EB' },
                  { label: 'Overdue (pending)',      value: health.scheduler.pendingOverdue,    color: health.scheduler.pendingOverdue > 0 ? '#F59E0B' : '#10B981' },
                  { label: 'Published Last Hour',   value: health.scheduler.publishedLastHour, color: '#10B981' },
                  { label: 'Failed Last Hour',      value: health.scheduler.failedLastHour,    color: health.scheduler.failedLastHour > 0 ? '#EF4444' : '#10B981' },
                  { label: 'Active Auto-Rules',     value: kpi.engagement.activeAutoRules,     color: '#F59E0B' },
                  { label: 'Open Inbox Threads',    value: kpi.engagement.openInboxThreads,    color: kpi.engagement.openInboxThreads > 20 ? '#EF4444' : '#06B6D4' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#8FA8C0', fontSize: 14 }}>{item.label}</span>
                    <span style={{ color: item.color, fontSize: 16, fontWeight: 700 }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={s.card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <Server size={17} color="#8B5CF6" />
                <h3 style={{ color: '#F0F6FF', fontSize: 15, fontWeight: 700 }}>Server Status</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: 'Memory Usage',          value: `${health.memoryMB} MB` },
                  { label: 'Uptime',                value: `${Math.floor(health.uptime / 3600)}h ${Math.floor((health.uptime % 3600) / 60)}m` },
                  { label: 'Active Social Accounts',value: health.accounts.totalActive },
                  { label: 'Unread Notifications',  value: health.notifications.unread },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#8FA8C0', fontSize: 14 }}>{item.label}</span>
                    <span style={{ color: '#F0F6FF', fontSize: 16, fontWeight: 700 }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ ...s.card, gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Clock size={14} color="#4A6080" />
                <span style={{ color: '#4A6080', fontSize: 13 }}>Last checked: {new Date(health.timestamp).toLocaleTimeString()}</span>
              </div>
              <p style={{ color: '#4A6080', fontSize: 12 }}>Cron runs every 2 min. Overdue count high = check Railway logs. Open inbox threads above 20 may need attention.</p>
            </div>
          </div>
        )}

        {/* ── Waitlist Tab ───────────────────────────────────────── */}
        {activeTab === 'waitlist' && waitlist && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
              {[
                { label: 'Total Signups', value: waitlist.total, color: '#2563EB' },
                { label: 'This Week',     value: waitlist.entries.filter((e: any) => new Date(e.createdAt) > new Date(Date.now() - 7 * 86400000)).length, color: '#10B981' },
                { label: 'Today',         value: waitlist.entries.filter((e: any) => new Date(e.createdAt).toDateString() === new Date().toDateString()).length, color: '#F59E0B' },
              ].map((stat, i) => (
                <div key={i} style={s.card}>
                  <p style={{ color: '#4A6080', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{stat.label}</p>
                  <p style={{ color: stat.color, fontSize: 32, fontWeight: 800 }}>{stat.value}</p>
                </div>
              ))}
            </div>
            <div style={s.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ color: '#F0F6FF', fontSize: 15, fontWeight: 700 }}>🏆 Founding Members</h3>
                <span style={{ color: '#4A6080', fontSize: 13 }}>{waitlist.total} total signups</span>
              </div>
              {waitlist.entries.length === 0 ? (
                <p style={{ color: '#4A6080', textAlign: 'center', padding: '40px 0' }}>No signups yet — share the waitlist link!</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #1A2840' }}>
                        {['#', 'Name', 'Email', 'Source', 'Signed Up'].map(h => (
                          <th key={h} style={{ textAlign: 'left', color: '#4A6080', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, padding: '0 0 12px' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...waitlist.entries].reverse().map((entry: any, i: number) => (
                        <tr key={entry.id} style={{ borderBottom: '1px solid #111827' }}>
                          <td style={{ padding: '14px 0', color: '#2563EB', fontSize: 13, fontWeight: 700 }}>#{i + 1}</td>
                          <td style={{ padding: '14px 12px 14px 0', color: '#E8F0FA', fontSize: 14 }}>{entry.name || '—'}</td>
                          <td style={{ padding: '14px 12px 14px 0', color: '#93C5FD', fontSize: 14 }}>{entry.email}</td>
                          <td style={{ padding: '14px 12px 14px 0' }}>
                            <span style={{ background: '#1A2840', color: '#6B8299', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6 }}>{entry.source || 'landing_page'}</span>
                          </td>
                          <td style={{ padding: '14px 0', color: '#4A6080', fontSize: 13 }}>{new Date(entry.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
