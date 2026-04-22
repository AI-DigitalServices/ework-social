'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';

interface TrialStatus {
  plan: string;
  trialActive: boolean;
  trialDaysLeft: number;
  expired: boolean;
}

export function useTrialStatus() {
  const { workspace } = useAuthStore();
  const [status, setStatus] = useState<TrialStatus | null>(null);

  useEffect(() => {
    if (!workspace?.id) return;
    api.get(`/billing/trial-status?workspaceId=${workspace.id}`)
      .then(res => setStatus(res.data))
      .catch(console.error);
  }, [workspace?.id]);

  return status;
}
