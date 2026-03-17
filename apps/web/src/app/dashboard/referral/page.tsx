'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import { Copy, CheckCircle, Users, DollarSign, Link, Gift } from 'lucide-react';

export default function ReferralPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => { loadReferrals(); }, []);

  const loadReferrals = async () => {
    try {
      const res = await api.get('/admin/my-referrals');
      setData(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const generateCode = async () => {
    try {
      const res = await api.post('/admin/generate-referral');
      setData((prev: any) => ({ ...prev, referralCode: res.data.code, referralLink: res.data.link }));
    } catch (err) { console.error(err); }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(data?.referralLink || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="flex justify-center py-24">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Referral Program</h2>
        <p className="text-slate-500 mt-1">Invite agencies and earn 20% commission for 3 months</p>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: '🔗', title: 'Share your link', desc: 'Send your unique referral link to agency owners' },
          { icon: '✅', title: 'They sign up', desc: 'They register and start their free trial' },
          { icon: '💰', title: 'You earn', desc: '20% commission for 3 months per paying referral' },
        ].map((step, i) => (
          <div key={i} className="bg-white border border-slate-100 rounded-xl p-5 text-center shadow-sm">
            <div className="text-3xl mb-3">{step.icon}</div>
            <p className="font-semibold text-slate-800 text-sm mb-1">{step.title}</p>
            <p className="text-slate-500 text-xs">{step.desc}</p>
          </div>
        ))}
      </div>

      {/* Referral link */}
      <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Link className="w-5 h-5 text-blue-500" /> Your Referral Link
        </h3>
        {data?.referralLink ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <code className="text-blue-600 text-sm flex-1 truncate">{data.referralLink}</code>
              <button onClick={copyLink}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${copied ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                {copied ? <><CheckCircle className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
              </button>
            </div>
            <p className="text-xs text-slate-400">Your referral code: <code className="bg-slate-100 px-2 py-0.5 rounded font-mono font-bold text-slate-700">{data.referralCode}</code></p>
          </div>
        ) : (
          <button onClick={generateCode}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition">
            <Gift className="w-4 h-4" /> Generate My Referral Link
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Referrals', value: data?.totalReferrals || 0, icon: Users, color: 'text-blue-600 bg-blue-100' },
          { label: 'Paying Referrals', value: data?.payingReferrals || 0, icon: CheckCircle, color: 'text-green-600 bg-green-100' },
          { label: 'Est. Commission', value: `$${data?.estimatedCommission || 0}`, icon: DollarSign, color: 'text-purple-600 bg-purple-100' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${stat.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
              <p className="text-slate-500 text-sm mt-0.5">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Referrals list */}
      {data?.referrals?.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">Your Referrals</h3>
          <div className="space-y-3">
            {data.referrals.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {r.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{r.name}</p>
                    <p className="text-slate-500 text-xs">{r.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    r.plan === 'FREE' ? 'bg-slate-100 text-slate-600' :
                    r.plan === 'STARTER' ? 'bg-green-100 text-green-700' :
                    r.plan === 'GROWTH' ? 'bg-purple-100 text-purple-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>{r.plan}</span>
                  <span className="text-xs text-slate-400">
                    {new Date(r.joinedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Commission info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-blue-800 mb-2">💡 Commission Structure</p>
        <div className="grid grid-cols-3 gap-3 text-xs text-blue-700">
          <div className="bg-white rounded-lg p-3 text-center">
            <p className="font-bold text-base">$1/mo</p>
            <p>Starter referral</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center">
            <p className="font-bold text-base">$2.4/mo</p>
            <p>Growth referral</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center">
            <p className="font-bold text-base">$5.8/mo</p>
            <p>Agency Pro referral</p>
          </div>
        </div>
        <p className="text-xs text-blue-600 mt-3">Commission paid for 3 months per referral. Contact us to set up payout.</p>
      </div>
    </div>
  );
}
