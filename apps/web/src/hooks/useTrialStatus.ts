'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';

interface TrialStatus {
  plan: string;
  trialActive: boolean;
  trialDaysLeft: number;
  expired: boolean;
}

export function useTrialStatus() {
  const { workspace, token } = useAuthStore();
  const [status, setStatus] = useState<TrialStatus | null>(null);

  useEffect(() => {
    if (!workspace?.id || !token) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/billing/trial-status?workspaceId=${workspace.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(setStatus)
      .catch(console.error);
  }, [workspace?.id, token]);

  return status;
}
