import api from '@/lib/api';

export async function getClientsAction(
  workspaceId: string,
  filters?: { stage?: string; source?: string; assignedToId?: string },
) {
  const params = new URLSearchParams({ workspaceId });
  if (filters?.stage) params.set('stage', filters.stage);
  if (filters?.source) params.set('source', filters.source);
  if (filters?.assignedToId) params.set('assignedToId', filters.assignedToId);
  const res = await api.get(`/crm/clients?${params.toString()}`);
  return res.data;
}

export async function createClientAction(data: {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  tags?: string[];
  stage?: string;
  source?: string;
  dealValue?: number;
  nextFollowUpAt?: string;
  assignedToId?: string;
  workspaceId: string;
}) {
  const res = await api.post('/crm/clients', data);
  return res.data;
}

export async function updateClientAction(
  clientId: string,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    tags?: string[];
    dealValue?: number;
    nextFollowUpAt?: string;
    assignedToId?: string | null;
  },
) {
  const res = await api.patch(`/crm/clients/${clientId}`, data);
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

export async function getActivityLogAction(clientId: string) {
  const res = await api.get(`/crm/clients/${clientId}/activity`);
  return res.data;
}

export async function exportContactsAction(workspaceId: string) {
  const res = await api.get(`/crm/clients/export/csv?workspaceId=${workspaceId}`, {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'contacts.csv';
  a.click();
  window.URL.revokeObjectURL(url);
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
