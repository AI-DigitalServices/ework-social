import api from '@/lib/api';

export async function getPostsAction(workspaceId: string) {
  const res = await api.get(`/scheduler/posts?workspaceId=${workspaceId}`);
  return res.data;
}

export async function createPostAction(data: any) {
  const res = await api.post('/scheduler/posts', data);
  return res.data;
}

export async function updatePostAction(id: string, data: any) {
  const res = await api.patch(`/scheduler/posts/${id}`, data);
  return res.data;
}

export async function deletePostAction(id: string) {
  const res = await api.delete(`/scheduler/posts/${id}`);
  return res.data;
}

export async function getSocialAccountsAction(workspaceId: string) {
  const res = await api.get(`/scheduler/accounts?workspaceId=${workspaceId}`);
  return res.data;
}

export async function createMockAccountAction(workspaceId: string, platform: string, accountName: string) {
  const res = await api.post('/scheduler/accounts/mock', { workspaceId, platform, accountName });
  return res.data;
}
