'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Users, TrendingUp, DollarSign, BarChart3, CheckCircle, AlertCircle, RefreshCw, Globe, Crown } from 'lucide-react';

const ADMIN_EMAILS = ['admin@eworksocial.com', 'eworksocial@gmail.com', 'aiservices.agent@gmail.com'];

export default function AdminPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!token) { router.push('/login'); return; }
    if (user && !ADMIN_EMAILS.includes(user.email)) { router.push('/dashboard'); return; }
    if (user && ADMIN_EMAILS.includes(user.email)) loadKpi();
  }, [hasHydrated, token, user]);

  const loadKpi = async () => {
    setLoading(true);
    try {
      const [kpiRes, refRes] = await Promise.all([
        api.get('/admin/kpi'),
        api.get('/admin/referrals'),
      ]);
      setData({ ...kpiRes.data, referrals: refRes.data });
      setLastRefresh(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) return (
    <div style={{ minHeight: '100vh', background: '#080C14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 40, height: 40, border: '4px solid #2563EB', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const statCards = [
    { label: 'Total Users', value: data.users.total, sub: `+${data.users.today} today`, icon: Users, color: '#2563EB', bg: '#1E3A5F' },
    { label: 'New This Week', value: data.users.thisWeek, sub: `${data.users.growthRate > 0 ? '+' : ''}${data.users.growthRate}% vs last month`, icon: TrendingUp, color: '#10B981', bg: '#064E3B' },
    { label: 'Paying Users', value: data.revenue.payingUsers, sub: `of ${data.users.total} total`, icon: Crown, color: '#F59E0B', bg: '#451A03' },
    { label: 'MRR', value: `$${data.revenue.mrr}`, sub: `ARR: $${data.revenue.arr}`, icon: DollarSign, color: '#8B5CF6', bg: '#2E1065' },
    { label: 'Total Posts', value: data.product.totalPosts, sub: `${data.product.postsThisMonth} this month`, icon: BarChart3, color: '#06B6D4', bg: '#0C4A6E' },
    { label: 'Publish Rate', value: `${data.product.publishSuccessRate}%`, sub: `${data.product.failedPosts} failed`, icon: CheckCircle, color: '#10B981', bg: '#064E3B' },
    { label: 'Social Accounts', value: data.product.totalSocialAccounts, sub: 'connected', icon: Globe, color: '#F59E0B', bg: '#451A03' },
    { label: 'Total Clients', value: data.product.totalClients, sub: 'in CRM', icon: Users, color: '#EC4899', bg: '#500724' },
  ];

  const planColors: Record<string, string> = {
    FREE: '#4A6080', TRIAL: '#2563EB', STARTER: '#10B981', GROWTH: '#8B5CF6', AGENCY_PRO: '#F59E0B',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080C14', fontFamily: 'Inter, sans-serif', padding: '40px 24px' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; }`}</style>

      {/* Header */}
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, background: '#2563EB', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⚡</div>
              <h1 style={{ color: '#F0F6FF', fontSize: 24, fontWeight: 700 }}>Founder Dashboard</h1>
            </div>
            <p style={{ color: '#4A6080', fontSize: 13 }}>Last refreshed: {lastRefresh.toLocaleTimeString()}</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={loadKpi} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#0C1524', border: '1px solid #1A2840', borderRadius: 10, color: '#6B8299', cursor: 'pointer', fontSize: 13 }}>
              <RefreshCw size={14} /> Refresh
            </button>
            <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#2563EB', borderRadius: 10, color: 'white', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
              → App Dashboard
            </a>
          </div>
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 40 }}>
          {statCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <div key={i} style={{ background: '#0C1524', border: '1px solid #1A2840', borderRadius: 16, padding: '24px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div style={{ width: 36, height: 36, background: card.bg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={18} color={card.color} />
                  </div>
                </div>
                <p style={{ color: '#F0F6FF', fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{card.value}</p>
                <p style={{ color: '#6B8299', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{card.label}</p>
                <p style={{ color: '#4A6080', fontSize: 11 }}>{card.sub}</p>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 40 }}>
          {/* Plan breakdown */}
          <div style={{ background: '#0C1524', border: '1px solid #1A2840', borderRadius: 16, padding: 24 }}>
            <h3 style={{ color: '#F0F6FF', fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Plan Breakdown</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Object.entries(data.revenue.planBreakdown).map(([plan, count]: any) => (
                <div key={plan} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: planColors[plan] || '#4A6080' }} />
                    <span style={{ color: '#8FA8C0', fontSize: 14 }}>{plan}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 80, height: 6, background: '#1A2840', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${data.users.total > 0 ? (count / data.users.total) * 100 : 0}%`, height: '100%', background: planColors[plan] || '#4A6080', borderRadius: 3 }} />
                    </div>
                    <span style={{ color: '#F0F6FF', fontSize: 14, fontWeight: 600, minWidth: 20, textAlign: 'right' }}>{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* User stats */}
          <div style={{ background: '#0C1524', border: '1px solid #1A2840', borderRadius: 16, padding: 24 }}>
            <h3 style={{ color: '#F0F6FF', fontSize: 16, fontWeight: 700, marginBottom: 20 }}>User Growth</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { label: 'Today', value: data.users.today, color: '#2563EB' },
                { label: 'This Week', value: data.users.thisWeek, color: '#10B981' },
                { label: 'This Month', value: data.users.thisMonth, color: '#8B5CF6' },
                { label: 'Last Month', value: data.users.lastMonth, color: '#F59E0B' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#8FA8C0', fontSize: 14 }}>{item.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 80, height: 6, background: '#1A2840', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${data.users.total > 0 ? (item.value / data.users.total) * 100 : 0}%`, height: '100%', background: item.color, borderRadius: 3 }} />
                    </div>
                    <span style={{ color: '#F0F6FF', fontSize: 16, fontWeight: 700, minWidth: 30, textAlign: 'right' }}>{item.value}</span>
                  </div>
                </div>
              ))}
              <div style={{ borderTop: '1px solid #1A2840', paddingTop: 16, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#8FA8C0', fontSize: 14 }}>Growth Rate</span>
                <span style={{ color: data.users.growthRate >= 0 ? '#10B981' : '#EF4444', fontSize: 16, fontWeight: 700 }}>
                  {data.users.growthRate >= 0 ? '+' : ''}{data.users.growthRate}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent signups */}
        <div style={{ background: '#0C1524', border: '1px solid #1A2840', borderRadius: 16, padding: 24 }}>
          <h3 style={{ color: '#F0F6FF', fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Recent Signups</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1A2840' }}>
                  {['Name', 'Email', 'Plan', 'Verified', 'Joined'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#4A6080', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.recentUsers.map((u: any) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #0F1E2E' }}>
                    <td style={{ padding: '12px', color: '#E8F0FA', fontSize: 14, fontWeight: 500 }}>{u.name}</td>
                    <td style={{ padding: '12px', color: '#6B8299', fontSize: 13 }}>{u.email}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: planColors[u.plan] + '30', color: planColors[u.plan] || '#4A6080' }}>
                        {u.plan}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      {u.isVerified
                        ? <CheckCircle size={16} color="#10B981" />
                        : <AlertCircle size={16} color="#F59E0B" />}
                    </td>
                    <td style={{ padding: '12px', color: '#4A6080', fontSize: 12 }}>
                      {new Date(u.joinedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Referral Program */}
        <div style={{ background: '#0C1524', border: '1px solid #1A2840', borderRadius: 16, padding: 24, marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ color: '#F0F6FF', fontSize: 16, fontWeight: 700 }}>Referral Program</h3>
            <span style={{ color: '#4A6080', fontSize: 13 }}>{data.referrals?.length || 0} active referrers</span>
          </div>
          {data.referrals?.length === 0 ? (
            <p style={{ color: '#4A6080', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>No referrals yet — share your referral links!</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1A2840' }}>
                  {['Referrer', 'Code', 'Total', 'Paying'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#4A6080', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.referrals?.map((r: any) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #0F1E2E' }}>
                    <td style={{ padding: '12px', color: '#E8F0FA', fontSize: 14 }}>{r.name}</td>
                    <td style={{ padding: '12px' }}>
                      <code style={{ background: '#1A2840', padding: '3px 8px', borderRadius: 6, color: '#4D8FE8', fontSize: 12 }}>{r.referralCode}</code>
                    </td>
                    <td style={{ padding: '12px', color: '#6B8299', fontSize: 14 }}>{r.totalReferrals}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ color: '#10B981', fontWeight: 600, fontSize: 14 }}>{r.payingReferrals}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}
