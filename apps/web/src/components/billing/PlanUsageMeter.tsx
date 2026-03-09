'use client';

import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useRouter } from 'next/navigation';
import { Zap, Users, Share2, FileText, BarChart2 } from 'lucide-react';

const planBadgeColors: Record<string, string> = {
  FREE:       'bg-slate-100 text-slate-600',
  STARTER:    'bg-blue-100 text-blue-700',
  GROWTH:     'bg-violet-100 text-violet-700',
  AGENCY_PRO: 'bg-amber-100 text-amber-700',
};

const planDisplayNames: Record<string, string> = {
  FREE: 'Free', STARTER: 'Starter', GROWTH: 'Growth', AGENCY_PRO: 'Agency Pro',
};

function UsageBar({ label, used, max, icon: Icon, color }: any) {
  const isUnlimited = max === 999999;
  const percent = isUnlimited ? 0 : Math.min((used / max) * 100, 100);
  const isHigh = percent > 80;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${color}`} />
          <span className="text-sm font-medium text-slate-700">{label}</span>
        </div>
        <span className={`text-xs font-semibold ${isHigh ? 'text-red-600' : 'text-slate-500'}`}>
          {isUnlimited ? `${used} / Unlimited` : `${used} / ${max}`}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              percent > 90 ? 'bg-red-500' : percent > 75 ? 'bg-orange-400' : 'bg-blue-500'
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default function PlanUsageMeter() {
  const { data, loading } = usePlanLimits();
  const router = useRouter();

  if (loading) return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse">
      <div className="h-4 bg-slate-200 rounded w-32 mb-4" />
      <div className="space-y-3">
        {[1,2,3,4].map(i => <div key={i} className="h-8 bg-slate-100 rounded" />)}
      </div>
    </div>
  );

  if (!data) return null;

  const { plan, usage, limits } = data;
  const isAgencyPro = plan === 'AGENCY_PRO';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-800">Plan Usage</h3>
          <p className="text-xs text-slate-400 mt-0.5">Resets on the 1st of each month</p>
        </div>
        <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${planBadgeColors[plan]}`}>
          {planDisplayNames[plan]} Plan
        </span>
      </div>

      <div className="space-y-4">
        <UsageBar label="Posts this month" used={usage.postsThisMonth} max={limits.maxPostsPerMonth} icon={FileText} color="text-blue-500" />
        <UsageBar label="Social accounts"  used={usage.socialAccounts}  max={limits.maxSocialAccounts}  icon={Share2}    color="text-pink-500" />
        <UsageBar label="Team members"     used={usage.teamMembers}     max={limits.maxTeamMembers}     icon={Users}     color="text-green-500" />
        <UsageBar label="CRM clients"      used={usage.clients}         max={limits.maxClients}         icon={BarChart2} color="text-violet-500" />
      </div>

      <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2">
        {[
          { key: 'perPlatformEditorEnabled', label: 'Per-platform editor' },
          { key: 'bulkSchedulingEnabled',    label: 'Bulk scheduling' },
          { key: 'whiteLabelEnabled',        label: 'White-label' },
          { key: 'twitterEnabled',           label: 'Twitter/X' },
        ].map(({ key, label }) => (
          <span key={key} className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            (limits as any)[key] ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'
          }`}>
            {(limits as any)[key] ? '✅' : '🔒'} {label}
          </span>
        ))}
      </div>

      {!isAgencyPro && (
        <button
          onClick={() => router.push('/dashboard/settings?tab=plan')}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition"
        >
          <Zap className="w-4 h-4" />
          Upgrade for more features
        </button>
      )}
    </div>
  );
}
