'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import {
  Users, TrendingUp, DollarSign, BarChart3, CheckCircle,
  AlertCircle, RefreshCw, Globe, Crown, Activity, CreditCard,
  Zap, Server, Clock,
} from 'lucide-react';

const ADMIN_EMAILS = ['admin@eworksocial.com', 'eworksocial@gmail.com', 'aiservices.agent@gmail.com'];

const planColors: Record<string, string> = {
  FREE: '#4A6080', TRIAL: '#2563EB', STARTER: '#10B981', GROWTH: '#8B5CF6', AGENCY_PRO: '#F59E0B',
};

export default function AdminPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const [kpi, setKpi] = useState<any>(null);
  const [failedPosts, setFailedPosts] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [hasHydrated, setHasHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'subscriptions' | 'failed' | 'health'>('overview');

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
      const [kpiRes, failedRes, subsRes, healthRes, refRes] = await Promise.all([
        api.get('/admin/kpi'),
        api.get('/admin/failed-posts'),
        api.get('/admin/subscriptions'),
        api.get('/admin/health'),
        api.get('/admin/referrals'),
      ]);
      setKpi(kpiRes.data);
      setFailedPosts(failedRes.data);
      setSubscriptions(subsRes.data);
      setHealth(healthRes.data);
      setReferrals(refRes.data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const s = {
    page: { minHeight: '100vh', background: '#080C14', fontFamily: 'Inter, sans-serif', padding: '40px 24px' },
    wrap: { maxWidth: 1200, margin: '0 auto' },
    card: { background: '#0C1524', border: '1px solid #1A2840', borderRadius: 16, padding: 24 },
    label: { color: '#4A6080', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 1 },
    value: { color: '#F0F6FF', fontSize: 28, fontWeight: 700, marginBottom: 4 },
    sub: { color: '#4A6080', fontSize: 11 },
    th: { padding: '8px 12px', textAlign: 'left' as const, color: '#4A6080', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 1 },
    td: { padding: '12px', color: '#E8F0FA', fontSize: 14 },
    tdMuted: { padding: '12px', color: '#6B8299', fontSize: 13 },
    row: { borderBottom: '1px solid #0F1E2E' },
  };

  if (loading || !kpi) return (
    <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 40, height: 40, border: '4px solid #2563EB', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const statCards = [
    { label: 'Total Users', value: kpi.users.total, sub: `+${kpi.users.today} today`, icon: Users, color: '#2563EB', bg: '#1E3A5F' },
    { label: 'New This Week', value: kpi.users.thisWeek, sub: `${kpi.users.growthRate >= 0 ? '+' : ''}${kpi.users.growthRate}% vs last month`, icon: TrendingUp, color: '#10B981', bg: '#064E3B' },
    { label: 'Paying Users', value: kpi.revenue.payingUsers, sub: `of ${kpi.users.total} total`, icon: Crown, color: '#F59E0B', bg: '#451A03' },
    { label: 'MRR', value: `$${kpi.revenue.mrr}`, sub: `ARR: $${kpi.revenue.arr}`, icon: DollarSign, color: '#8B5CF6', bg: '#2E1065' },
    { label: 'Total Posts', value: kpi.product.totalPosts, sub: `${kpi.product.postsThisMonth} this month`, icon: BarChart3, color: '#06B6D4', bg: '#0C4A6E' },
    { label: 'Publish Rate', value: `${kpi.product.publishSuccessRate}%`, sub: `${kpi.product.failedPosts} failed`, icon: CheckCircle, color: '#10B981', bg: '#064E3B' },
    { label: 'Social Accounts', value: kpi.product.totalSocialAccounts, sub: 'connected', icon: Globe, color: '#F59E0B', bg: '#451A03' },
    { label: 'Total Clients', value: kpi.product.totalClients, sub: 'in CRM', icon: Users, color: '#EC4899', bg: '#500724' },
  ];

  const tabs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'subscriptions', label: `💳 Subscriptions (${subscriptions.length})` },
    { id: 'failed', label: `❌ Failed Posts (${failedPosts.length})` },
    { id: 'health', label: '🖥️ System Health' },
  ];

  return (
    <div style={s.page}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; }`}</style>

      <div style={s.wrap}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, background: '#2563EB', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⚡</div>
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

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
          {statCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <div key={i} style={s.card}>
                <div style={{ width: 36, height: 36, background: card.bg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <Icon size={18} color={card.color} />
                </div>
                <p style={s.value}>{card.value}</p>
                <p style={s.label}>{card.label}</p>
                <p style={{ ...s.sub, marginTop: 4 }}>{card.sub}</p>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              style={{ padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, background: activeTab === tab.id ? '#2563EB' : '#0C1524', color: activeTab === tab.id ? 'white' : '#6B8299', transition: 'all 0.2s' }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Plan breakdown */}
            <div style={s.card}>
              <h3 style={{ color: '#F0F6FF', fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Plan Breakdown</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Object.entries(kpi.revenue.planBreakdown).map(([plan, count]: any) => (
                  <div key={plan} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: planColors[plan] || '#4A6080' }} />
                      <span style={{ color: '#8FA8C0', fontSize: 14 }}>{plan}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 80, height: 6, background: '#1A2840', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${kpi.users.total > 0 ? (count / kpi.users.total) * 100 : 0}%`, height: '100%', background: planColors[plan] || '#4A6080', borderRadius: 3 }} />
                      </div>
                      <span style={{ color: '#F0F6FF', fontSize: 14, fontWeight: 600, minWidth: 20, textAlign: 'right' }}>{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* User growth */}
            <div style={s.card}>
              <h3 style={{ color: '#F0F6FF', fontSize: 16, fontWeight: 700, marginBottom: 20 }}>User Growth</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { label: 'Today', value: kpi.users.today, color: '#2563EB' },
                  { label: 'This Week', value: kpi.users.thisWeek, color: '#10B981' },
                  { label: 'This Month', value: kpi.users.thisMonth, color: '#8B5CF6' },
                  { label: 'Last Month', value: kpi.users.lastMonth, color: '#F59E0B' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#8FA8C0', fontSize: 14 }}>{item.label}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 80, height: 6, background: '#1A2840', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${kpi.users.total > 0 ? (item.value / kpi.users.total) * 100 : 0}%`, height: '100%', background: item.color, borderRadius: 3 }} />
                      </div>
                      <span style={{ color: '#F0F6FF', fontSize: 16, fontWeight: 700, minWidth: 30, textAlign: 'right' }}>{item.value}</span>
                    </div>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid #1A2840', paddingTop: 16, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#8FA8C0', fontSize: 14 }}>Growth Rate</span>
                  <span style={{ color: kpi.users.growthRate >= 0 ? '#10B981' : '#EF4444', fontSize: 16, fontWeight: 700 }}>
                    {kpi.users.growthRate >= 0 ? '+' : ''}{kpi.users.growthRate}%
                  </span>
                </div>
              </div>
            </div>

            {/* Recent signups */}
            <div style={{ ...s.card, gridColumn: '1 / -1' }}>
              <h3 style={{ color: '#F0F6FF', fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Recent Signups</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1A2840' }}>
                      {['Name', 'Email', 'Plan', 'Verified', 'Joined'].map(h => (
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {kpi.recentUsers.map((u: any) => (
                      <tr key={u.id} style={s.row}>
                        <td style={s.td}>{u.name}</td>
                        <td style={s.tdMuted}>{u.email}</td>
                        <td style={s.td}>
                          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: (planColors[u.plan] || '#4A6080') + '30', color: planColors[u.plan] || '#4A6080' }}>
                            {u.plan}
                          </span>
                        </td>
                        <td style={s.td}>
                          {u.isVerified ? <CheckCircle size={16} color="#10B981" /> : <AlertCircle size={16} color="#F59E0B" />}
                        </td>
                        <td style={s.tdMuted}>{new Date(u.joinedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Referrals */}
            <div style={{ ...s.card, gridColumn: '1 / -1' }}>
              <h3 style={{ color: '#F0F6FF', fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Referral Program</h3>
              {referrals.length === 0 ? (
                <p style={{ color: '#4A6080', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>No referrals yet</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1A2840' }}>
                      {['Referrer', 'Code', 'Total', 'Paying'].map(h => <th key={h} style={s.th}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.map((r: any) => (
                      <tr key={r.id} style={s.row}>
                        <td style={s.td}>{r.name}</td>
                        <td style={s.td}><code style={{ background: '#1A2840', padding: '3px 8px', borderRadius: 6, color: '#4D8FE8', fontSize: 12 }}>{r.referralCode}</code></td>
                        <td style={s.tdMuted}>{r.totalReferrals}</td>
                        <td style={s.td}><span style={{ color: '#10B981', fontWeight: 600 }}>{r.payingReferrals}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Subscriptions Tab */}
        {activeTab === 'subscriptions' && (
          <div style={s.card}>
            <h3 style={{ color: '#F0F6FF', fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
              Active Paid Subscriptions ({subscriptions.length})
            </h3>
            {subscriptions.length === 0 ? (
              <p style={{ color: '#4A6080', fontSize: 14, textAlign: 'center', padding: '40px 0' }}>No active paid subscriptions yet</p>
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
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: (planColors[sub.plan] || '#4A6080') + '30', color: planColors[sub.plan] || '#4A6080' }}>
                          {sub.plan}
                        </span>
                      </td>
                      <td style={s.td}>
                        <code style={{ background: '#1A2840', padding: '3px 8px', borderRadius: 6, color: '#4D8FE8', fontSize: 11 }}>
                          {sub.paystackRef || 'manual'}
                        </code>
                      </td>
                      <td style={s.tdMuted}>{new Date(sub.updatedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Failed Posts Tab */}
        {activeTab === 'failed' && (
          <div style={s.card}>
            <h3 style={{ color: '#F0F6FF', fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
              Failed Posts ({failedPosts.length})
            </h3>
            {failedPosts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <p style={{ fontSize: 32, marginBottom: 12 }}>✅</p>
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
                      <td style={{ padding: '12px', color: '#EF4444', fontSize: 12, maxWidth: 200 }}>
                        {post.errorMessage || 'Unknown error'}
                      </td>
                      <td style={s.tdMuted}>{new Date(post.updatedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* System Health Tab */}
        {activeTab === 'health' && health && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div style={s.card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <Activity size={18} color="#10B981" />
                <h3 style={{ color: '#F0F6FF', fontSize: 16, fontWeight: 700 }}>Scheduler Status</h3>
                <span style={{ marginLeft: 'auto', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: health.scheduler.status === 'healthy' ? '#064E3B' : '#451A03', color: health.scheduler.status === 'healthy' ? '#10B981' : '#F59E0B' }}>
                  {health.scheduler.status === 'healthy' ? '✅ Healthy' : '⚠️ Warning'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: 'Scheduled Posts', value: health.scheduler.scheduledPosts, color: '#2563EB' },
                  { label: 'Overdue (pending)', value: health.scheduler.pendingOverdue, color: health.scheduler.pendingOverdue > 0 ? '#F59E0B' : '#10B981' },
                  { label: 'Published Last Hour', value: health.scheduler.publishedLastHour, color: '#10B981' },
                  { label: 'Failed Last Hour', value: health.scheduler.failedLastHour, color: health.scheduler.failedLastHour > 0 ? '#EF4444' : '#10B981' },
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
                <Server size={18} color="#8B5CF6" />
                <h3 style={{ color: '#F0F6FF', fontSize: 16, fontWeight: 700 }}>Server Status</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: 'Memory Usage', value: `${health.memoryMB} MB` },
                  { label: 'Uptime', value: `${Math.floor(health.uptime / 3600)}h ${Math.floor((health.uptime % 3600) / 60)}m` },
                  { label: 'Active Social Accounts', value: health.accounts.totalActive },
                  { label: 'Unread Notifications', value: health.notifications.unread },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#8FA8C0', fontSize: 14 }}>{item.label}</span>
                    <span style={{ color: '#F0F6FF', fontSize: 16, fontWeight: 700 }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ ...s.card, gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <Clock size={16} color="#4A6080" />
                <span style={{ color: '#4A6080', fontSize: 13 }}>Last checked: {new Date(health.timestamp).toLocaleTimeString()}</span>
              </div>
              <p style={{ color: '#4A6080', fontSize: 12 }}>
                Cron job runs every 2 minutes. Overdue posts are picked up automatically. If overdue count stays high, check Railway logs for errors.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
