'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Copy, CheckCircle, Users, TrendingUp, Link, Gift, Wallet, Star } from 'lucide-react';

export default function ReferralTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [paymentDetails, setPaymentDetails] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  useEffect(() => { loadReferrals(); }, []);

  const loadReferrals = async () => {
    try {
      const res = await api.get('/admin/my-referrals');
      setData(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const generateCode = async () => {
    setGenerating(true);
    try {
      const res = await api.post('/admin/generate-referral');
      setData((prev: any) => ({ ...prev, referralCode: res.data.code, referralLink: res.data.link }));
    } catch (err) { console.error(err); }
    finally { setGenerating(false); }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(data?.referralLink || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || !paymentDetails) return;
    setWithdrawing(true);
    try {
      await api.post('/admin/request-withdrawal', {
        amount: parseInt(withdrawAmount),
        paymentDetails,
      });
      setWithdrawSuccess(true);
      setShowWithdraw(false);
    } catch (err) { console.error(err); }
    finally { setWithdrawing(false); }
  };

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const isFoundingPartner = data?.isFoundingPartner;
  const commissionRate = data?.commissionRate || 20;

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Founding Partner Badge */}
      {isFoundingPartner && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-4 flex items-center gap-3">
          <Star className="w-6 h-6 text-white flex-shrink-0" />
          <div>
            <p className="text-white font-bold text-sm">Founding Partner Status</p>
            <p className="text-amber-100 text-xs">You earn 30% commission for 24 months on every referral</p>
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: '🔗', title: 'Share your link', desc: 'Send to agency owners & freelancers' },
          { icon: '✅', title: 'They sign up & pay', desc: 'Via your referral link' },
          { icon: '💰', title: `You earn ${commissionRate}%`, desc: isFoundingPartner ? 'For 24 months per referral' : 'For 12 months per referral' },
        ].map((step, i) => (
          <div key={i} className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
            <div className="text-2xl mb-2">{step.icon}</div>
            <p className="font-semibold text-slate-800 text-xs mb-1">{step.title}</p>
            <p className="text-slate-500 text-xs">{step.desc}</p>
          </div>
        ))}
      </div>

      {/* Referral link */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm">
          <Link className="w-4 h-4 text-blue-500" /> Your Referral Link
        </h3>
        {data?.referralLink ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <code className="text-blue-600 text-xs flex-1 truncate">{data.referralLink}</code>
              <button onClick={copyLink}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition flex-shrink-0 ${
                  copied ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}>
                {copied ? <><CheckCircle className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Code: <code className="bg-slate-100 px-2 py-0.5 rounded font-mono font-bold text-slate-700">{data.referralCode}</code>
            </p>
          </div>
        ) : (
          <button onClick={generateCode} disabled={generating}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50">
            <Gift className="w-4 h-4" />
            {generating ? 'Generating...' : 'Generate My Referral Link'}
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Referrals', value: data?.totalReferrals || 0, icon: Users, color: 'text-blue-600 bg-blue-100' },
          { label: 'Paying', value: data?.payingReferrals || 0, icon: CheckCircle, color: 'text-green-600 bg-green-100' },
          { label: 'Est. Commission', value: `₦${(data?.estimatedCommission || 0).toLocaleString()}`, icon: TrendingUp, color: 'text-purple-600 bg-purple-100' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${stat.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-xl font-bold text-slate-800">{stat.value}</p>
              <p className="text-slate-500 text-xs mt-0.5">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Withdrawal request */}
      {(data?.estimatedCommission || 0) >= 10000 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
              <Wallet className="w-4 h-4 text-green-500" /> Request Withdrawal
            </h3>
            <span className="text-xs text-slate-500">Min. ₦10,000</span>
          </div>

          {withdrawSuccess ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-green-700 font-semibold text-sm">Request submitted!</p>
              <p className="text-green-600 text-xs mt-1">We'll process your payment within 3-5 business days.</p>
            </div>
          ) : !showWithdraw ? (
            <button onClick={() => setShowWithdraw(true)}
              className="w-full py-3 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition">
              Request Withdrawal
            </button>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Amount (₦)</label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={e => setWithdrawAmount(e.target.value)}
                  placeholder="e.g. 15000"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Bank Account Details</label>
                <textarea
                  value={paymentDetails}
                  onChange={e => setPaymentDetails(e.target.value)}
                  placeholder="Bank name, account number, account name"
                  rows={3}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowWithdraw(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition">
                  Cancel
                </button>
                <button onClick={handleWithdraw} disabled={withdrawing || !withdrawAmount || !paymentDetails}
                  className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50">
                  {withdrawing ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Referrals list */}
      {data?.referrals?.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-xl p-5">
          <h3 className="font-bold text-slate-800 mb-4 text-sm">Your Referrals</h3>
          <div className="space-y-2">
            {data.referrals.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {r.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{r.name}</p>
                    <p className="text-slate-500 text-xs">{r.email}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  r.plan === 'FREE' ? 'bg-slate-100 text-slate-600' :
                  r.plan === 'STARTER' ? 'bg-green-100 text-green-700' :
                  r.plan === 'GROWTH' ? 'bg-purple-100 text-purple-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>{r.plan}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Commission rates */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-blue-800 mb-3">
          💡 Your Commission Rates ({commissionRate}% for {isFoundingPartner ? '24' : '12'} months)
        </p>
        <div className="grid grid-cols-3 gap-2 text-xs text-blue-700">
          {[
            { plan: 'Starter', amount: `₦${Math.round(2500 * commissionRate / 100).toLocaleString()}/mo` },
            { plan: 'Growth', amount: `₦${Math.round(6000 * commissionRate / 100).toLocaleString()}/mo` },
            { plan: 'Agency Pro', amount: `₦${Math.round(15000 * commissionRate / 100).toLocaleString()}/mo` },
          ].map((r, i) => (
            <div key={i} className="bg-white rounded-lg p-3 text-center">
              <p className="font-bold text-base text-blue-800">{r.amount}</p>
              <p>{r.plan}</p>
            </div>
          ))}
        </div>
        {!isFoundingPartner && (
          <p className="text-xs text-blue-600 mt-3">After 12 months: 10% residual commission ongoing.</p>
        )}
        <p className="text-xs text-blue-600 mt-2">Minimum withdrawal: ₦10,000 · Paid via Paystack transfer within 3-5 business days.</p>
      </div>
    </div>
  );
}
