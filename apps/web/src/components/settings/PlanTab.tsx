'use client';

import { Check, Zap } from 'lucide-react';

const plans = [
  {
    name: 'Free Trial',
    price: '$0',
    period: '7 days',
    color: 'border-slate-200',
    badge: '',
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
    price: '$5',
    period: '/month',
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
    price: '$12',
    period: '/month',
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
    price: '$29',
    period: '/month',
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
  const currentPlan = 'Free Trial';

  return (
    <div>
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-yellow-600" />
          <div>
            <p className="font-semibold text-yellow-800">You're on the Free Trial</p>
            <p className="text-yellow-600 text-sm">5 days remaining · Upgrade to keep access</p>
          </div>
        </div>
        <button className="px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 transition">
          Upgrade Now
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const isCurrent = plan.name === currentPlan;
          return (
            <div
              key={plan.name}
              className={`relative bg-white rounded-xl p-6 border-2 shadow-sm ${
                isCurrent ? 'border-blue-500' : plan.color
              }`}
            >
              {plan.badge && (
                <span className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 ${plan.badgeColor} text-white text-xs font-bold rounded-full`}>
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
                className={`w-full py-2.5 rounded-lg text-sm font-medium transition ${
                  isCurrent
                    ? 'bg-slate-100 text-slate-400 cursor-default'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
                disabled={isCurrent}
              >
                {isCurrent ? 'Current Plan' : `Upgrade to ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
