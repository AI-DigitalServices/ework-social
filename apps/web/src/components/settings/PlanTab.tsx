'use client';

import { useState, useEffect } from 'react';
import { Check, Zap, Loader } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import PlanUsageMeter from '@/components/billing/PlanUsageMeter';

const plans = [
  {
    name: 'Free Trial',
    price: '₦0',
    period: '7 days',
    planCode: null,
    color: 'border-slate-200',
    features: [
      '3 social accounts',
      'Facebook + Instagram only',
      '50 posts/month',
      '1 workspace',
      '1 team member',
      '7-day analytics',
    ],
  },
  {
    name: 'Starter',
    price: '₦5,000',
    period: '/month',
    planCode: process.env.NEXT_PUBLIC_PAYSTACK_STARTER_PLAN,
    color: 'border-blue-200',
    badge: 'Most Popular',
    badgeColor: 'bg-blue-600',
    features: [
      '10 social accounts',
      '4 platforms',
      '200 posts/month',
      'Basic CRM',
      'Remove watermark',
      '30-day analytics',
      'Basic AI captions',
    ],
  },
  {
    name: 'Growth',
    price: '₦12,000',
    period: '/month',
    planCode: process.env.NEXT_PUBLIC_PAYSTACK_GROWTH_PLAN,
    color: 'border-green-200',
    badge: 'Best Value',
    badgeColor: 'bg-green-600',
    features: [
      '30 social accounts',
      '6 platforms',
      '2,000 posts/month',
      'Full CRM + pipeline',
      '5 team members',
      'Bulk scheduling',
      '6-month analytics',
      'Advanced auto-responder',
    ],
  },
  {
    name: 'Agency Pro',
    price: '₦29,000',
    period: '/month',
    planCode: process.env.NEXT_PUBLIC_PAYSTACK_AGENCY_PRO_PLAN,
    color: 'border-purple-200',
    badge: 'For Agencies',
    badgeColor: 'bg-purple-600',
    features: [
      '100 social accounts',
      'All platforms (10+)',
      '10,000 posts/month',
      'Unlimited clients',
      '15 team members',
      'White-label dashboard',
      '12-month analytics',
      'Full rules engine',
      'API access',
      'Priority support',
    ],
  },
];

export default function PlanTab() {
  const { user, workspace } = useAuthStore();
  const [currentPlan, setCurrentPlan] = useState('FREE');
  const [loading, setLoading] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState('');

  useEffect(() => {
    if (workspace?.id) loadSubscription();
  }, [workspace?.id]);

  const loadSubscription = async () => {
    try {
      const res = await api.get(`/billing/subscription?workspaceId=${workspace!.id}`);
      if (res.data?.plan) setCurrentPlan(res.data.plan);
    } catch {
      // Silently fail - default to FREE
    }
  };

  const handleUpgrade = async (planCode: string, planName: string) => {
    setCheckoutError('');
    setLoading(planName);
    try {
      const res = await api.post('/billing/checkout', {
        priceId: planCode,
        workspaceId: workspace!.id,
        userId: user!.id,
      });
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (err: any) {
      setCheckoutError(
        err.response?.data?.message || 'Checkout failed. Please try again.'
      );
    } finally {
      setLoading(null);
    }
  };

  const isCurrentPlan = (planName: string) => {
    if (planName === 'Free Trial' && currentPlan === 'FREE') return true;
    if (planName === 'Starter' && currentPlan === 'STARTER') return true;
    if (planName === 'Growth' && currentPlan === 'GROWTH') return true;
    if (planName === 'Agency Pro' && currentPlan === 'AGENCY_PRO') return true;
    return false;
  };

  return (
    <div>
      {checkoutError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6 text-sm">
          {checkoutError}
        </div>
      )}

      {currentPlan === 'FREE' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-8 flex items-center gap-3">
          <Zap className="w-5 h-5 text-yellow-600 shrink-0" />
          <div>
            <p className="font-semibold text-yellow-800">You're on the Free Trial</p>
            <p className="text-yellow-600 text-sm">Upgrade to keep access after your trial ends</p>
          </div>
        </div>
      )}

      {currentPlan !== 'FREE' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-8 flex items-center gap-3">
          <Check className="w-5 h-5 text-green-600 shrink-0" />
          <div>
            <p className="font-semibold text-green-800">Active {currentPlan} subscription</p>
            <p className="text-green-600 text-sm">Thank you for subscribing to eWork Social!</p>
          </div>
        </div>
      )}

      <PlanUsageMeter />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const isCurrent = isCurrentPlan(plan.name);
          const isLoadingThis = loading === plan.name;

          return (
            <div
              key={plan.name}
              className={`relative bg-white rounded-xl p-6 border-2 shadow-sm ${
                isCurrent ? 'border-blue-500' : plan.color
              }`}
            >
              {plan.badge && (
                <span className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 ${plan.badgeColor} text-white text-xs font-bold rounded-full whitespace-nowrap`}>
                  {plan.badge}
                </span>
              )}
              {isCurrent && (
                <span className="absolute -top-3 right-4 px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full">
                  Current
                </span>
              )}

              <h3 className="font-bold text-slate-800 text-lg">{plan.name}</h3>
              <div className="flex items-baseline gap-1 my-3">
                <span className="text-3xl font-bold text-slate-800">{plan.price}</span>
                <span className="text-slate-500 text-sm">{plan.period}</span>
              </div>

              <ul className="space-y-2 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-slate-600">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => {
                  if (plan.planCode && !isCurrent && !isLoadingThis) {
                    handleUpgrade(plan.planCode, plan.name);
                  }
                }}
                disabled={isCurrent || !plan.planCode || isLoadingThis}
                className={`w-full py-2.5 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${
                  isCurrent
                    ? 'bg-slate-100 text-slate-400 cursor-default'
                    : !plan.planCode
                    ? 'bg-slate-100 text-slate-400 cursor-default'
                    : isLoadingThis
                    ? 'bg-blue-400 text-white cursor-wait'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isLoadingThis ? (
                  <><Loader className="w-4 h-4 animate-spin" /> Redirecting...</>
                ) : isCurrent ? (
                  'Current Plan'
                ) : !plan.planCode ? (
                  'Free Trial'
                ) : (
                  `Upgrade to ${plan.name}`
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
