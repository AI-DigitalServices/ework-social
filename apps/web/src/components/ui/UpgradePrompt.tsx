'use client';

import { Lock, Zap, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

const planColors: Record<string, { bg: string; text: string; badge: string }> = {
  GROWTH:     { bg: 'bg-violet-50 border-violet-200', text: 'text-violet-700', badge: 'bg-violet-100 text-violet-700' },
  AGENCY_PRO: { bg: 'bg-amber-50 border-amber-200',   text: 'text-amber-700',  badge: 'bg-amber-100 text-amber-700'  },
};

const planNames: Record<string, string> = {
  GROWTH: 'Growth',
  AGENCY_PRO: 'Agency Pro',
};

interface Props {
  feature: string;
  description?: string;
  requiredPlan?: 'GROWTH' | 'AGENCY_PRO';
  compact?: boolean;
}

export default function UpgradePrompt({ feature, description, requiredPlan = 'GROWTH', compact = false }: Props) {
  const router = useRouter();
  const colors = planColors[requiredPlan];
  const planName = planNames[requiredPlan];

  if (compact) {
    return (
      <button
        onClick={() => router.push('/dashboard/settings?tab=plan')}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${colors.bg} ${colors.text} hover:opacity-80 transition`}
      >
        <Lock className="w-3 h-3" />
        {planName}+ feature — Upgrade
        <ArrowRight className="w-3 h-3" />
      </button>
    );
  }

  return (
    <div className={`rounded-2xl border-2 border-dashed p-6 text-center ${colors.bg}`}>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${colors.badge}`}>
        <Lock className="w-6 h-6" />
      </div>
      <span className={`text-xs font-bold px-3 py-1 rounded-full ${colors.badge} mb-3 inline-block`}>
        {planName}+ Plan Required
      </span>
      <h3 className={`text-base font-bold mt-2 mb-1 ${colors.text}`}>{feature}</h3>
      {description && <p className="text-sm text-slate-500 mb-4 max-w-xs mx-auto">{description}</p>}
      <button
        onClick={() => router.push('/dashboard/settings?tab=plan')}
        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition ${
          requiredPlan === 'AGENCY_PRO' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-violet-600 hover:bg-violet-700'
        }`}
      >
        <Zap className="w-4 h-4" />
        Upgrade to {planName}
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
