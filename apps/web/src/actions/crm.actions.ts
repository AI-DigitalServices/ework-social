import api from '@/lib/api';

export async function getClientsAction(workspaceId: string) {
  const res = await api.get(`/crm/clients?workspaceId=${workspaceId}`);
  return res.data;
}

export async function createClientAction(data: {
  name: string;
  email?: string;
  phone?: string;
  tags?: string[];
  workspaceId: string;
}) {
  const res = await api.post('/crm/clients', data);
  return res.data;
}

export async function updateStageAction(clientId: string, stage: string) {
  const res = await api.patch(`/crm/clients/${clientId}/stage`, { stage });
  return res.data;
}

export async function deleteClientAction(clientId: string) {
  const res = await api.delete(`/crm/clients/${clientId}`);
  return res.data;
}

export async function addNoteAction(clientId: string, content: string) {
  const res = await api.post('/crm/notes', { clientId, content });
  return res.data;
}

export async function addTaskAction(clientId: string, title: string, dueDate?: string) {
  const res = await api.post('/crm/tasks', { clientId, title, dueDate });
  return res.data;
}

export async function toggleTaskAction(taskId: string) {
  const res = await api.patch(`/crm/tasks/${taskId}/toggle`);
  return res.data;
}

export async function getPipelineStatsAction(workspaceId: string) {
  const res = await api.get(`/crm/pipeline/${workspaceId}`);
  return res.data;
}
