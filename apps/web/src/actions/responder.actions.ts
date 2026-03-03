import api from '@/lib/api';

export async function getRulesAction(workspaceId: string) {
  const res = await api.get(`/responder/rules?workspaceId=${workspaceId}`);
  return res.data;
}

export async function createRuleAction(data: any) {
  const res = await api.post('/responder/rules', data);
  return res.data;
}

export async function toggleRuleAction(id: string) {
  const res = await api.patch(`/responder/rules/${id}/toggle`);
  return res.data;
}

export async function deleteRuleAction(id: string) {
  const res = await api.delete(`/responder/rules/${id}`);
  return res.data;
}

export async function getResponderStatsAction(workspaceId: string) {
  const res = await api.get(`/responder/stats?workspaceId=${workspaceId}`);
  return res.data;
}
