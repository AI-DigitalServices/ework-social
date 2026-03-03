import api from '@/lib/api';

export async function getDashboardStatsAction(workspaceId: string) {
  const res = await api.get(`/analytics/dashboard?workspaceId=${workspaceId}`);
  return res.data;
}

export async function getPostActivityAction(workspaceId: string) {
  const res = await api.get(`/analytics/activity?workspaceId=${workspaceId}`);
  return res.data;
}

export async function getPipelineBreakdownAction(workspaceId: string) {
  const res = await api.get(`/analytics/pipeline?workspaceId=${workspaceId}`);
  return res.data;
}

export async function getPlatformBreakdownAction(workspaceId: string) {
  const res = await api.get(`/analytics/platforms?workspaceId=${workspaceId}`);
  return res.data;
}

export async function getRecentPostsAction(workspaceId: string) {
  const res = await api.get(`/analytics/recent-posts?workspaceId=${workspaceId}`);
  return res.data;
}
