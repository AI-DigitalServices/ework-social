'use client';

import { useState, useEffect } from 'react';
import {
  X, Mail, Phone, Tag, Plus, Check, Building2, DollarSign,
  Instagram, Lock,
} from 'lucide-react';
import {
  addNoteAction, addTaskAction, toggleTaskAction,
  updateClientAction, getActivityLogAction,
} from '@/actions/crm.actions';
import type { PlanTier } from '@/hooks/usePlan';

interface Props {
  client: any;
  onClose: () => void;
  onUpdate: (client: any) => void;
  plan?: PlanTier;
}

type Tab = 'notes' | 'tasks' | 'activity' | 'details';

const STAGE_COLORS: Record<string, string> = {
  LEAD: 'bg-slate-100 text-slate-600',
  CONTACTED: 'bg-blue-100 text-blue-600',
  PROPOSAL: 'bg-yellow-100 text-yellow-700',
  ACTIVE: 'bg-green-100 text-green-700',
  DORMANT: 'bg-red-100 text-red-600',
};

const SOURCE_LABEL: Record<string, string> = {
  MANUAL: 'Manual',
  INSTAGRAM_DM: 'Instagram DM',
  INSTAGRAM_COMMENT: 'Instagram Comment',
  FACEBOOK_DM: 'Facebook DM',
  FACEBOOK_COMMENT: 'Facebook Comment',
  REFERRAL: 'Referral',
  WEBSITE: 'Website',
  OTHER: 'Other',
};

const ACTIVITY_ICONS: Record<string, string> = {
  NOTE_ADDED: '📝',
  STAGE_CHANGED: '🔄',
  DM_RECEIVED: '💬',
  COMMENT_RECEIVED: '💭',
  TASK_CREATED: '✅',
  TASK_COMPLETED: '🎉',
  EMAIL_SENT: '📧',
  DEAL_UPDATED: '💰',
  ASSIGNED: '👤',
  CREATED: '⭐',
};

export default function ClientDetail({ client, onClose, onUpdate, plan = 'FREE' }: Props) {
  const canViewActivity = ['GROWTH', 'AGENCY_PRO'].includes(plan);
  const canEditFull = ['GROWTH', 'AGENCY_PRO'].includes(plan);

  const [tab, setTab] = useState<Tab>('notes');
  const [noteText, setNoteText] = useState('');
  const [taskText, setTaskText] = useState('');
  const [localClient, setLocalClient] = useState(client);
  const [activities, setActivities] = useState<any[]>([]);
  const [activitiesLoaded, setActivitiesLoaded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    dealValue: client.dealValue?.toString() ?? '',
    company: client.company ?? '',
    nextFollowUpAt: client.nextFollowUpAt ? client.nextFollowUpAt.split('T')[0] : '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tab === 'activity' && !activitiesLoaded && canViewActivity) {
      getActivityLogAction(localClient.id)
        .then(data => { setActivities(data); setActivitiesLoaded(true); })
        .catch(console.error);
    }
  }, [tab, activitiesLoaded, localClient.id, canViewActivity]);

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    const note = await addNoteAction(localClient.id, noteText);
    const updated = { ...localClient, notes: [note, ...localClient.notes] };
    setLocalClient(updated); onUpdate(updated); setNoteText('');
  };

  const handleAddTask = async () => {
    if (!taskText.trim()) return;
    const task = await addTaskAction(localClient.id, taskText);
    const updated = { ...localClient, tasks: [task, ...localClient.tasks] };
    setLocalClient(updated); onUpdate(updated); setTaskText('');
  };

  const handleToggleTask = async (taskId: string) => {
    const task = await toggleTaskAction(taskId);
    const updated = {
      ...localClient,
      tasks: localClient.tasks.map((t: any) => t.id === taskId ? task : t),
    };
    setLocalClient(updated); onUpdate(updated);
  };

  const handleSaveDetails = async () => {
    setSaving(true);
    try {
      await updateClientAction(localClient.id, {
        company: editForm.company || undefined,
        dealValue: editForm.dealValue ? parseFloat(editForm.dealValue) : undefined,
        nextFollowUpAt: editForm.nextFollowUpAt || undefined,
      });
      const updated = {
        ...localClient,
        company: editForm.company,
        dealValue: editForm.dealValue ? parseFloat(editForm.dealValue) : null,
        nextFollowUpAt: editForm.nextFollowUpAt ? new Date(editForm.nextFollowUpAt).toISOString() : null,
      };
      setLocalClient(updated); onUpdate(updated); setEditMode(false);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const igProfile = (localClient.socialProfiles as any)?.instagram;

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'notes', label: 'Notes', count: localClient.notes?.length },
    { key: 'tasks', label: 'Tasks', count: localClient.tasks?.length },
    { key: 'details', label: 'Details' },
    { key: 'activity', label: 'Activity' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {igProfile?.profilePictureUrl ? (
              <img src={igProfile.profilePictureUrl} alt={localClient.name}
                className="w-11 h-11 rounded-full object-cover border border-slate-200" />
            ) : (
              <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-base font-bold">
                {localClient.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-800">{localClient.name}</h2>
                {igProfile?.username && (
                  <a href={`https://instagram.com/${igProfile.username}`} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-pink-500 hover:underline flex items-center gap-1">
                    <Instagram className="w-3 h-3" />
                    @{igProfile.username}
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STAGE_COLORS[localClient.stage]}`}>
                  {localClient.stage}
                </span>
                {localClient.source && localClient.source !== 'MANUAL' && (
                  <span className="text-xs text-slate-400">{SOURCE_LABEL[localClient.source] ?? localClient.source}</span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Quick info row */}
        <div className="px-5 py-2.5 border-b border-slate-100 flex flex-wrap gap-3">
          {localClient.email && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Mail className="w-3.5 h-3.5 text-slate-400" />{localClient.email}
            </div>
          )}
          {localClient.phone && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Phone className="w-3.5 h-3.5 text-slate-400" />{localClient.phone}
            </div>
          )}
          {localClient.company && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />{localClient.company}
            </div>
          )}
          {localClient.dealValue != null && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <DollarSign className="w-3.5 h-3.5" />₦{Number(localClient.dealValue).toLocaleString()}
            </div>
          )}
          {localClient.tags?.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              {localClient.tags.slice(0, 4).map((tag: string) => (
                <span key={tag} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">{tag}</span>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 overflow-x-auto">
          {tabs.map(({ key, label, count }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-shrink-0 px-4 py-2.5 text-xs font-medium transition whitespace-nowrap ${
                tab === key
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}>
              {label}
              {count !== undefined && (
                <span className="ml-1.5 bg-slate-100 text-slate-500 text-xs px-1.5 py-0.5 rounded-full">{count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Notes tab */}
          {tab === 'notes' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input value={noteText} onChange={e => setNoteText(e.target.value)}
                  placeholder="Add a note..." onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button onClick={handleAddNote}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {localClient.notes?.length === 0 && (
                <p className="text-center text-slate-400 text-sm py-8">No notes yet</p>
              )}
              {localClient.notes?.map((note: any) => (
                <div key={note.id} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <p className="text-slate-700 text-sm whitespace-pre-wrap">{note.content}</p>
                  <p className="text-slate-400 text-xs mt-1">{new Date(note.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}

          {/* Tasks tab */}
          {tab === 'tasks' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input value={taskText} onChange={e => setTaskText(e.target.value)}
                  placeholder="Add a task..." onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button onClick={handleAddTask}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {localClient.tasks?.length === 0 && (
                <p className="text-center text-slate-400 text-sm py-8">No tasks yet</p>
              )}
              {localClient.tasks?.map((task: any) => (
                <div key={task.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50">
                  <button onClick={() => handleToggleTask(task.id)}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
                      task.isDone ? 'bg-green-500 border-green-500' : 'border-slate-300 hover:border-green-400'
                    }`}>
                    {task.isDone && <Check className="w-3 h-3 text-white" />}
                  </button>
                  <span className={`text-sm flex-1 ${task.isDone ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                    {task.title}
                  </span>
                  {task.dueDate && (
                    <span className="text-xs text-slate-400">{new Date(task.dueDate).toLocaleDateString()}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Details tab */}
          {tab === 'details' && (
            <div className="space-y-4">
              {!canEditFull && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-lg px-3 py-2">
                  <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                  Editing deal value, company & follow-up date requires Growth plan or higher.
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Company</p>
                  {editMode ? (
                    <input value={editForm.company} onChange={e => setEditForm(f => ({ ...f, company: e.target.value }))}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  ) : (
                    <p className="text-sm text-slate-700 font-medium">{localClient.company || '—'}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Deal Value</p>
                  {editMode ? (
                    <input type="number" value={editForm.dealValue}
                      onChange={e => setEditForm(f => ({ ...f, dealValue: e.target.value }))}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  ) : (
                    <p className="text-sm text-emerald-600 font-medium">
                      {localClient.dealValue != null ? `₦${Number(localClient.dealValue).toLocaleString()}` : '—'}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Lead Source</p>
                  <p className="text-sm text-slate-700">{SOURCE_LABEL[localClient.source] ?? localClient.source ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Next Follow-up</p>
                  {editMode ? (
                    <input type="date" value={editForm.nextFollowUpAt}
                      onChange={e => setEditForm(f => ({ ...f, nextFollowUpAt: e.target.value }))}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  ) : (
                    <p className="text-sm text-slate-700">
                      {localClient.nextFollowUpAt ? new Date(localClient.nextFollowUpAt).toLocaleDateString() : '—'}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Last Contacted</p>
                  <p className="text-sm text-slate-700">
                    {localClient.lastContactedAt ? new Date(localClient.lastContactedAt).toLocaleDateString() : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Added</p>
                  <p className="text-sm text-slate-700">{new Date(localClient.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              {igProfile && (
                <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg p-3 border border-pink-100">
                  <p className="text-xs font-medium text-pink-700 mb-2 flex items-center gap-1.5">
                    <Instagram className="w-3.5 h-3.5" /> Instagram Profile
                  </p>
                  <div className="flex items-center gap-3">
                    {igProfile.profilePictureUrl && (
                      <img src={igProfile.profilePictureUrl} alt={igProfile.username}
                        className="w-10 h-10 rounded-full object-cover border border-pink-200" />
                    )}
                    <div>
                      {igProfile.username && (
                        <a href={`https://instagram.com/${igProfile.username}`} target="_blank" rel="noopener noreferrer"
                          className="text-sm text-pink-600 hover:underline">@{igProfile.username}</a>
                      )}
                      <p className="text-xs text-slate-500">ID: {igProfile.id}</p>
                    </div>
                  </div>
                </div>
              )}

              {canEditFull && (
                <div className="flex gap-2 pt-2">
                  {editMode ? (
                    <>
                      <button onClick={() => setEditMode(false)}
                        className="flex-1 px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition">
                        Cancel
                      </button>
                      <button onClick={handleSaveDetails} disabled={saving}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50">
                        {saving ? 'Saving…' : 'Save Changes'}
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setEditMode(true)}
                      className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm hover:bg-slate-50 transition">
                      Edit Details
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Activity tab */}
          {tab === 'activity' && (
            <div>
              {!canViewActivity ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Lock className="w-8 h-8 text-slate-300 mb-3" />
                  <p className="text-sm font-medium text-slate-700 mb-1">Activity Log</p>
                  <p className="text-xs text-slate-400 max-w-xs">
                    Full activity history is available on the Growth plan and above. Upgrade to see every interaction logged automatically.
                  </p>
                </div>
              ) : !activitiesLoaded ? (
                <p className="text-center text-slate-400 text-sm py-8">Loading…</p>
              ) : activities.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-8">No activity recorded yet</p>
              ) : (
                <div className="space-y-1">
                  {activities.map((a: any) => (
                    <div key={a.id} className="flex gap-3 p-2.5 hover:bg-slate-50 rounded-lg">
                      <span className="text-base w-6 text-center flex-shrink-0">{ACTIVITY_ICONS[a.type] ?? '•'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700">{a.description}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {a.user ? `${a.user.name} · ` : ''}{new Date(a.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
