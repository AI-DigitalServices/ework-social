import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

export interface PlanUsage {
  plan: string;
  limits: {
    maxSocialAccounts: number;
    maxPostsPerMonth: number;
    maxTeamMembers: number;
    maxClients: number;
    analyticsHistoryDays: number;
    watermarkEnabled: boolean;
    whiteLabelEnabled: boolean;
    apiAccessEnabled: boolean;
    bulkSchedulingEnabled: boolean;
    perPlatformEditorEnabled: boolean;
    autoResponder: string;
    allowedPlatforms: string[];
    twitterEnabled: boolean;
    automationEnabled: boolean;
    aiCaptionsPerMonth: number;
    aiHashtagsEnabled: boolean;
    aiRewriteEnabled: boolean;
  };
  usage: {
    socialAccounts: number;
    postsThisMonth: number;
    teamMembers: number;
    clients: number;
  };
  percentages: {
    socialAccounts: number;
    posts: number;
    teamMembers: number;
    clients: number;
  };
}

export function usePlanLimits() {
  const { workspace } = useAuthStore();
  const [data, setData] = useState<PlanUsage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspace?.id) return;
    api.get(`/billing/limits?workspaceId=${workspace.id}`)
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [workspace?.id]);

  const canUseFeature = (feature: keyof PlanUsage['limits']): boolean => {
    if (!data) return false;
    return !!data.limits[feature];
  };

  const isAtLimit = (resource: keyof PlanUsage['usage']): boolean => {
    if (!data) return false;
    const limitMap: Record<string, number> = {
      socialAccounts: data.limits.maxSocialAccounts,
      postsThisMonth: data.limits.maxPostsPerMonth,
      teamMembers: data.limits.maxTeamMembers,
      clients: data.limits.maxClients,
    };
    return data.usage[resource] >= limitMap[resource];
  };

  return { data, loading, canUseFeature, isAtLimit };
}
