'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Mail, Phone, Building2, Globe, MapPin, Tag,
  DollarSign, Calendar, CalendarCheck, Edit3, Plus, Check,
  Instagram, Facebook, Twitter, Linkedin, Youtube, Clock,
  Activity, StickyNote, ListTodo, Zap, MoreHorizontal,
  ChevronRight, TrendingUp, Lock, User,
} from 'lucide-react';
import api from '@/lib/api';
import {
  addNoteAction, addTaskAction, toggleTaskAction,
  updateClientAction, updateStageAction, getActivityLogAction,
} from '@/actions/crm.actions';
import { usePlan } from '@/hooks/usePlan';
import { useCurrencyStore, CURRENCY_SYMBOLS } from '@/store/currency.store';

// ─── helpers ──────────────────────────────────────────────────────────────────

const STAGE_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  LEAD:      { label: 'Lead',      color: 'bg-slate-100 text-slate-600',   dot: 'bg-slate-400' },
  CONTACTED: { label: 'Contacted', color: 'bg-blue-100 text-blue-600',     dot: 'bg-blue-500'  },
  PROPOSAL:  { label: 'Proposal',  color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500'},
  ACTIVE:    { label: 'Active',    color: 'bg-green-100 text-green-700',   dot: 'bg-green-500' },
  DORMANT:   { label: 'Dormant',   color: 'bg-red-100 text-red-600',       dot: 'bg-red-400'   },
};

const SOURCE_LABEL: Record<string, string> = {
  MANUAL: 'Manual', INSTAGRAM_DM: 'Instagram DM',
  INSTAGRAM_COMMENT: 'Instagram Comment', FACEBOOK_DM: 'Facebook DM',
  FACEBOOK_COMMENT: 'Facebook Comment', REFERRAL: 'Referral',
  WEBSITE: 'Website', OTHER: 'Other',
};

const PLATFORM_ICON: Record<string, React.ReactNode> = {
  INSTAGRAM: <Instagram className="w-5 h-5" />,
  FACEBOOK:  <Facebook  className="w-5 h-5" />,
  TWITTER:   <Twitter   className="w-5 h-5" />,
  LINKEDIN:  <Linkedin  className="w-5 h-5" />,
  YOUTUBE:   <Youtube   className="w-5 h-5" />,
  TIKTOK:    <span className="text-sm font-bold">TK</span>,
  BLUESKY:   <span className="text-sm font-bold">BS</span>,
  THREADS:   <span className="text-sm font-bold">TH</span>,
};

const PLATFORM_COLOR: Record<string, string> = {
  INSTAGRAM: 'bg-gradient-to-br from-pink-500 to-purple-600 text-white',
  FACEBOOK:  'bg-blue-600 text-white',
  TWITTER:   'bg-black text-white',
  LINKEDIN:  'bg-blue-700 text-white',
  YOUTUBE:   'bg-red-600 text-white',
  TIKTOK:    'bg-black text-white',
  BLUESKY:   'bg-sky-500 text-white',
  THREADS:   'bg-slate-900 text-white',
};

const ACTIVITY_ICONS: Record<string, string> = {
  NOTE_ADDED: '📝', STAGE_CHANGED: '🔄', DM_RECEIVED: '💬',
  COMMENT_RECEIVED: '💭', TASK_CREATED: '✅', TASK_COMPLETED: '🎉',
  EMAIL_SENT: '📧', DEAL_UPDATED: '💰', ASSIGNED: '👤', CREATED: '⭐',
};

// ─── component ────────────────────────────────────────────────────────────────

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { plan } = usePlan();
  const canViewActivity = ['GROWTH', 'AGENCY_PRO'].includes(plan);
  const canEditFull     = ['GROWTH', 'AGENCY_PRO'].includes(plan);
  const { currency } = useCurrencyStore();
  const currencySymbol = CURRENCY_SYMBOLS[currency];

  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'notes' | 'tasks' | 'activity'>('notes');

  // inline edit state
  const [editingNote, setEditingNote] = useState('');
  const [editingTask, setEditingTask] = useState('');
  const [editingDetails, setEditingDetails] = useState(false);
  const [editForm, setEditForm] = useState({ company: '', dealValue: '', nextFollowUpAt: '', email: '', phone: '', website: '' });
  const [saving, setSaving] = useState(false);

  // stage quick-change
  const [stageMenuOpen, setStageMenuOpen] = useState(false);

  // Initial load
  useEffect(() => {
    if (id) loadClient();
  }, [id]);

  // Live polling — refresh notes, tasks, activity every 15 seconds
  useEffect(() => {
    if (!id) return;
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/crm/clients/${id}`);
        setClient(res.data);
      } catch { /* silent */ }
    }, 15_000);
    return () => clearInterval(interval);
  }, [id]);

  const loadClient = async () => {
    try {
      const res = await api.get(`/crm/clients/${id}`);
      setClient(res.data);
      const c = res.data;
      setEditForm({
        company: c.company ?? '',
        dealValue: c.dealValue?.toString() ?? '',
        nextFollowUpAt: c.nextFollowUpAt ? c.nextFollowUpAt.split('T')[0] : '',
        email: c.email ?? '',
        phone: c.phone ?? '',
        website: (c.socialProfiles as any)?.website ?? '',
      });
    } catch { router.push('/dashboard/crm'); }
    finally { setLoading(false); }
  };

  const handleAddNote = async () => {
    if (!editingNote.trim()) return;
    const note = await addNoteAction(id, editingNote);
    setClient((c: any) => ({ ...c, notes: [note, ...c.notes] }));
    setEditingNote('');
  };

  const handleAddTask = async () => {
    if (!editingTask.trim()) return;
    const task = await addTaskAction(id, editingTask);
    setClient((c: any) => ({ ...c, tasks: [task, ...c.tasks] }));
    setEditingTask('');
  };

  const handleToggleTask = async (taskId: string) => {
    const task = await toggleTaskAction(taskId);
    setClient((c: any) => ({ ...c, tasks: c.tasks.map((t: any) => t.id === taskId ? task : t) }));
  };

  const handleStageChange = async (stage: string) => {
    setStageMenuOpen(false);
    await updateStageAction(id, stage);
    setClient((c: any) => ({ ...c, stage }));
  };

  const handleSaveDetails = async () => {
    setSaving(true);
    try {
      await updateClientAction(id, {
        email: editForm.email || undefined,
        phone: editForm.phone || undefined,
        company: editForm.company || undefined,
        dealValue: editForm.dealValue ? parseFloat(editForm.dealValue) : undefined,
        nextFollowUpAt: editForm.nextFollowUpAt || undefined,
      });
      setClient((c: any) => ({
        ...c,
        email: editForm.email || c.email,
        phone: editForm.phone || c.phone,
        company: editForm.company || null,
        dealValue: editForm.dealValue ? parseFloat(editForm.dealValue) : null,
        nextFollowUpAt: editForm.nextFollowUpAt ? new Date(editForm.nextFollowUpAt).toISOString() : null,
      }));
      setEditingDetails(false);
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-96">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!client) return null;

  const stage = STAGE_CONFIG[client.stage] ?? STAGE_CONFIG.LEAD;
  const igProfile = (client.socialProfiles as any)?.instagram;
  const initials = client.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="pb-12">
      {/* ── breadcrumb + back ── */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <button onClick={() => router.push('/dashboard/crm')}
          className="flex items-center gap-1.5 hover:text-blue-600 transition">
          <ArrowLeft className="w-4 h-4" /> CRM & Clients
        </button>
        <ChevronRight className="w-4 h-4" />
        <span className="text-slate-400">Clients</span>
        <ChevronRight className="w-4 h-4" />
        <span className="text-slate-800 font-medium">{client.name}</span>
      </div>

      {/* ── page header ── */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          {igProfile?.profilePictureUrl ? (
            <img src={igProfile.profilePictureUrl} alt={client.name}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-md" />
          ) : (
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-md">
              {initials}
            </div>
          )}
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-800">{client.name}</h1>
              {/* Stage badge with dropdown */}
              <div className="relative">
                <button onClick={() => setStageMenuOpen(o => !o)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold cursor-pointer ${stage.color}`}>
                  <span className={`w-2 h-2 rounded-full ${stage.dot}`} />
                  {stage.label}
                  <span className="ml-0.5 opacity-60">▾</span>
                </button>
                {stageMenuOpen && (
                  <div className="absolute top-8 left-0 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-20 min-w-36">
                    {Object.entries(STAGE_CONFIG).map(([key, cfg]) => (
                      <button key={key} onClick={() => handleStageChange(key)}
                        className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2 hover:bg-slate-50 ${client.stage === key ? 'opacity-50' : ''}`}>
                        <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
              {client.company && <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{client.company}</span>}
              <span>Added {new Date(client.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              <span>Last updated {new Date(client.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setEditingDetails(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition">
            <Edit3 className="w-4 h-4" /> Edit Client
          </button>
          <button className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition">
            <MoreHorizontal className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>

      {/* ── main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── LEFT column ── */}
        <div className="lg:col-span-1 space-y-5">

          {/* About card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-4">About {client.name}</h3>
            <div className="space-y-3">
              {[
                { icon: <Mail className="w-4 h-4" />, label: 'Email',   value: client.email,   href: `mailto:${client.email}` },
                { icon: <Phone className="w-4 h-4" />, label: 'Phone',  value: client.phone },
                { icon: <Building2 className="w-4 h-4" />, label: 'Company', value: client.company },
                {
                  icon: <TrendingUp className="w-4 h-4" />, label: 'Source',
                  value: SOURCE_LABEL[client.source] ?? client.source,
                },
                {
                  icon: <DollarSign className="w-4 h-4" />, label: 'Deal Value',
                  value: client.dealValue != null ? `${currencySymbol}${Number(client.dealValue).toLocaleString()}` : null,
                  valueClass: 'text-emerald-600 font-semibold',
                },
                {
                  icon: <CalendarCheck className="w-4 h-4" />, label: 'Next Follow-up',
                  value: client.nextFollowUpAt ? new Date(client.nextFollowUpAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null,
                },
                {
                  icon: <Clock className="w-4 h-4" />, label: 'Last Contacted',
                  value: client.lastContactedAt ? new Date(client.lastContactedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null,
                },
              ].map(({ icon, label, value, href, valueClass }) => value ? (
                <div key={label} className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 flex-shrink-0">
                    {icon}
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">{label}</p>
                    {href
                      ? <a href={href} className={`text-sm text-blue-600 hover:underline ${valueClass ?? ''}`}>{value}</a>
                      : <p className={`text-sm text-slate-700 ${valueClass ?? ''}`}>{value}</p>
                    }
                  </div>
                </div>
              ) : null)}

              {/* Tags */}
              {client.tags?.filter((t: string) => !t.startsWith('ig:')).length > 0 && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 flex-shrink-0">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Tags</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {client.tags.filter((t: string) => !t.startsWith('ig:')).map((tag: string) => (
                        <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Instagram profile card */}
          {igProfile && (
            <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl border border-pink-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <Instagram className="w-4 h-4 text-pink-500" /> Instagram Profile
              </h3>
              <div className="flex items-center gap-3">
                {igProfile.profilePictureUrl && (
                  <img src={igProfile.profilePictureUrl} alt={igProfile.username}
                    className="w-12 h-12 rounded-full object-cover border-2 border-pink-200" />
                )}
                <div>
                  {igProfile.username && (
                    <a href={`https://instagram.com/${igProfile.username}`} target="_blank" rel="noopener noreferrer"
                      className="text-sm font-semibold text-pink-600 hover:underline">
                      @{igProfile.username}
                    </a>
                  )}
                  <p className="text-xs text-slate-400 mt-0.5">Enriched via Instagram API</p>
                </div>
              </div>
            </div>
          )}

          {/* Stats card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-3">Activity Stats</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total Posts', value: client._count?.posts ?? 0 },
                { label: 'Notes', value: client.notes?.length ?? 0 },
                { label: 'Tasks', value: client.tasks?.length ?? 0 },
                { label: 'Activities', value: client._count?.activities ?? client.activities?.length ?? 0 },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-slate-800">{value}</p>
                  <p className="text-xs text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT column ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Connected Social Platforms */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-700">Connected Social Platforms</h3>
                <p className="text-xs text-slate-400 mt-0.5">Workspace accounts used to manage {client.name}'s content</p>
              </div>
              <button onClick={() => router.push('/dashboard/settings?tab=social')}
                className="text-xs text-blue-600 hover:underline font-medium">+ Add Account</button>
            </div>

            {client.socialAccounts?.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                No social accounts connected yet.{' '}
                <button onClick={() => router.push('/dashboard/settings?tab=social')}
                  className="text-blue-600 hover:underline">Connect one →</button>
              </div>
            ) : (
              <div className="space-y-3">
                {client.socialAccounts?.map((acc: any) => (
                  <div key={acc.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${PLATFORM_COLOR[acc.platform] ?? 'bg-slate-200 text-slate-600'}`}>
                      {PLATFORM_ICON[acc.platform] ?? <span className="text-xs font-bold">{acc.platform[0]}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{acc.platform.charAt(0) + acc.platform.slice(1).toLowerCase()}</p>
                      <p className="text-xs text-slate-400 truncate">{acc.accountName}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                        {acc.postCount} post{acc.postCount !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Connected
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Posts */}
          {client.posts?.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-700">Recent Posts</h3>
                <button onClick={() => router.push(`/dashboard/scheduler?clientId=${id}`)}
                  className="text-xs text-blue-600 hover:underline font-medium">View all</button>
              </div>
              <div className="space-y-2">
                {client.posts.map((post: any) => (
                  <div key={post.id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs ${PLATFORM_COLOR[post.socialAccount?.platform] ?? 'bg-slate-200 text-slate-600'}`}>
                      {PLATFORM_ICON[post.socialAccount?.platform] ?? post.socialAccount?.platform?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 line-clamp-2">{post.content}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {post.socialAccount?.accountName} · {new Date(post.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                      post.status === 'PUBLISHED' ? 'bg-green-100 text-green-600' :
                      post.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-600' :
                      post.status === 'FAILED'    ? 'bg-red-100 text-red-600' :
                      'bg-slate-100 text-slate-500'
                    }`}>{post.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes / Tasks / Activity tabs */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex border-b border-slate-100">
              {[
                { key: 'notes',    label: 'Notes',    icon: <StickyNote className="w-4 h-4" />, count: client.notes?.length },
                { key: 'tasks',    label: 'Tasks',    icon: <ListTodo   className="w-4 h-4" />, count: client.tasks?.length },
                { key: 'activity', label: 'Activity', icon: <Activity   className="w-4 h-4" /> },
              ].map(({ key, label, icon, count }) => (
                <button key={key} onClick={() => setActiveTab(key as any)}
                  className={`flex items-center gap-2 flex-1 justify-center py-3 text-sm font-medium transition ${
                    activeTab === key
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}>
                  {icon} {label}
                  {count !== undefined && (
                    <span className="bg-slate-100 text-slate-500 text-xs px-1.5 py-0.5 rounded-full">{count}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="p-5">
              {/* Notes */}
              {activeTab === 'notes' && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <textarea value={editingNote} onChange={e => setEditingNote(e.target.value)}
                      placeholder="Add a note about this client..."
                      rows={2}
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                    <button onClick={handleAddNote}
                      className="px-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition self-start py-2">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {client.notes?.length === 0 && (
                    <p className="text-center text-slate-400 text-sm py-8">No notes yet. Add the first one above.</p>
                  )}
                  {client.notes?.map((note: any) => (
                    <div key={note.id} className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                      <p className="text-slate-700 text-sm whitespace-pre-wrap">{note.content}</p>
                      <p className="text-slate-400 text-xs mt-2">{new Date(note.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Tasks */}
              {activeTab === 'tasks' && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input value={editingTask} onChange={e => setEditingTask(e.target.value)}
                      placeholder="Add a task..."
                      onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <button onClick={handleAddTask}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {client.tasks?.length === 0 && (
                    <p className="text-center text-slate-400 text-sm py-8">No tasks yet.</p>
                  )}
                  {client.tasks?.map((task: any) => (
                    <div key={task.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
                      <button onClick={() => handleToggleTask(task.id)}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition flex-shrink-0 ${
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

              {/* Activity */}
              {activeTab === 'activity' && (
                !canViewActivity ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Lock className="w-8 h-8 text-slate-300 mb-3" />
                    <p className="text-sm font-medium text-slate-700 mb-1">Activity Log</p>
                    <p className="text-xs text-slate-400 max-w-xs mb-4">
                      Full activity history is available on the Growth plan. Every interaction — DMs, stage changes, notes, tasks — is logged automatically.
                    </p>
                    <a href="/dashboard/settings?tab=plan"
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition">
                      Upgrade to Growth →
                    </a>
                  </div>
                ) : client.activities?.length === 0 ? (
                  <p className="text-center text-slate-400 text-sm py-8">No activity recorded yet.</p>
                ) : (
                  <div className="space-y-1">
                    {client.activities?.map((a: any) => (
                      <div key={a.id} className="flex gap-3 p-2.5 hover:bg-slate-50 rounded-xl">
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
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Edit Details Modal ── */}
      {editingDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Edit Client Details</h3>
              <button onClick={() => setEditingDetails(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">✕</button>
            </div>
            <div className="p-5 space-y-3">
              {[
                { label: 'Email', key: 'email', type: 'email' },
                { label: 'Phone', key: 'phone', type: 'text' },
                { label: 'Company', key: 'company', type: 'text' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">{label}</label>
                  <input type={type} value={(editForm as any)[key]}
                    onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              {canEditFull && (
                <>
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Deal Value ({currencySymbol})</label>
                    <input type="number" value={editForm.dealValue}
                      onChange={e => setEditForm(f => ({ ...f, dealValue: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Next Follow-up Date</label>
                    <input type="date" value={editForm.nextFollowUpAt}
                      onChange={e => setEditForm(f => ({ ...f, nextFollowUpAt: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </>
              )}
              <div className="flex gap-2 pt-1">
                <button onClick={() => setEditingDetails(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50 transition">
                  Cancel
                </button>
                <button onClick={handleSaveDetails} disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
