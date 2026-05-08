'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

export type PlanTier = 'FREE' | 'STARTER' | 'GROWTH' | 'AGENCY_PRO';

const PLAN_RANK: Record<PlanTier, number> = {
  FREE: 0,
  STARTER: 1,
  GROWTH: 2,
  AGENCY_PRO: 3,
};

export function usePlan() {
  const { workspace } = useAuthStore();
  const [plan, setPlan] = useState<PlanTier>('FREE');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspace?.id) { setLoading(false); return; }
    api.get(`/billing/subscription?workspaceId=${workspace.id}`)
      .then(res => { if (res.data?.plan) setPlan(res.data.plan as PlanTier); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspace?.id]);

  const hasFeature = (minPlan: PlanTier): boolean =>
    PLAN_RANK[plan] >= PLAN_RANK[minPlan];

  return { plan, loading, hasFeature };
}
