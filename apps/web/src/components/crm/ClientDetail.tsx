'use client';

import { useState } from 'react';
import { X, Mail, Phone, Tag, Plus, Check } from 'lucide-react';
import { addNoteAction, addTaskAction, toggleTaskAction } from '@/actions/crm.actions';

interface Props {
  client: any;
  onClose: () => void;
  onUpdate: (client: any) => void;
}

export default function ClientDetail({ client, onClose, onUpdate }: Props) {
  const [tab, setTab] = useState<'notes' | 'tasks'>('notes');
  const [noteText, setNoteText] = useState('');
  const [taskText, setTaskText] = useState('');
  const [localClient, setLocalClient] = useState(client);

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    const note = await addNoteAction(localClient.id, noteText);
    const updated = { ...localClient, notes: [note, ...localClient.notes] };
    setLocalClient(updated);
    onUpdate(updated);
    setNoteText('');
  };

  const handleAddTask = async () => {
    if (!taskText.trim()) return;
    const task = await addTaskAction(localClient.id, taskText);
    const updated = { ...localClient, tasks: [task, ...localClient.tasks] };
    setLocalClient(updated);
    onUpdate(updated);
    setTaskText('');
  };

  const handleToggleTask = async (taskId: string) => {
    const task = await toggleTaskAction(taskId);
    const updated = {
      ...localClient,
      tasks: localClient.tasks.map((t: any) => t.id === taskId ? task : t),
    };
    setLocalClient(updated);
    onUpdate(updated);
  };

  const stageColors: Record<string, string> = {
    LEAD: 'bg-slate-100 text-slate-600',
    CONTACTED: 'bg-blue-100 text-blue-600',
    PROPOSAL: 'bg-yellow-100 text-yellow-600',
    ACTIVE: 'bg-green-100 text-green-600',
    DORMANT: 'bg-red-100 text-red-600',
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white text-lg font-bold">
              {localClient.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">{localClient.name}</h2>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stageColors[localClient.stage]}`}>
                {localClient.stage}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Contact info */}
        <div className="px-6 py-3 border-b border-slate-100 flex flex-wrap gap-4">
          {localClient.email && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Mail className="w-4 h-4 text-slate-400" />
              {localClient.email}
            </div>
          )}
          {localClient.phone && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Phone className="w-4 h-4 text-slate-400" />
              {localClient.phone}
            </div>
          )}
          {localClient.tags?.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className="w-4 h-4 text-slate-400" />
              {localClient.tags.map((tag: string) => (
                <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          {['notes', 'tasks'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t as any)}
              className={`flex-1 py-3 text-sm font-medium transition ${
                tab === t
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
              <span className="ml-2 text-xs bg-slate-100 px-2 py-0.5 rounded-full">
                {t === 'notes' ? localClient.notes?.length || 0 : localClient.tasks?.length || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'notes' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="Add a note..."
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                />
                <button
                  onClick={handleAddNote}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {localClient.notes?.length === 0 && (
                <p className="text-center text-slate-400 text-sm py-8">No notes yet</p>
              )}
              {localClient.notes?.map((note: any) => (
                <div key={note.id} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <p className="text-slate-700 text-sm">{note.content}</p>
                  <p className="text-slate-400 text-xs mt-1">
                    {new Date(note.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}

          {tab === 'tasks' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  value={taskText}
                  onChange={e => setTaskText(e.target.value)}
                  placeholder="Add a task..."
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                />
                <button
                  onClick={handleAddTask}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {localClient.tasks?.length === 0 && (
                <p className="text-center text-slate-400 text-sm py-8">No tasks yet</p>
              )}
              {localClient.tasks?.map((task: any) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50"
                >
                  <button
                    onClick={() => handleToggleTask(task.id)}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
                      task.isDone
                        ? 'bg-green-500 border-green-500'
                        : 'border-slate-300 hover:border-green-400'
                    }`}
                  >
                    {task.isDone && <Check className="w-3 h-3 text-white" />}
                  </button>
                  <span className={`text-sm flex-1 ${task.isDone ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                    {task.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
