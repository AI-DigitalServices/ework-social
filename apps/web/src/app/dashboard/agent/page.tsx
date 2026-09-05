'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import {
  Sparkles, Play, Power, Plus, Loader2, CheckCircle2, XCircle,
  Clock, Wrench, ChevronDown, ChevronUp, AlertTriangle,
  Brain, Trash2, RefreshCw, Maximize2, Minimize2,
} from 'lucide-react';
import { libreBaskerville } from '@/lib/fonts';

const PLATFORM_OPTIONS = [
  'FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'TWITTER', 'TIKTOK', 'YOUTUBE', 'BLUESKY', 'THREADS',
];

type AgentRun = {
  id: string;
  campaignId?: string | null;
  trigger: string;
  model: string;
  toolCalls?: { tool: string; input: any; error?: string }[];
  tokensIn?: number;
  tokensOut?: number;
  costUsd?: number;
  outcome: 'SUCCESS' | 'FAILED' | 'NEEDS_APPROVAL';
  summary?: string | null;
  createdAt: string;
};

type CampaignTask = {
  id: string;
  type: string;
  status: string;
  payload: { content?: string; mediaUrls?: string[]; rationale?: string };
  postId?: string | null;
  post?: { id: string; status: string; scheduledAt?: string | null } | null;
};

type Campaign = {
  id: string;
  goal: string;
  brief: string;
  platforms: string[];
  status: string;
  createdAt: string;
  tasks?: CampaignTask[];
};

type Memory = {
  id: string;
  kind: string;
  content: string;
  sourceRef?: string | null;
  updatedAt: string;
};

const MEMORY_KINDS = ['BRAND', 'AUDIENCE', 'WINNING_CONTENT', 'CAMPAIGN_LEARNING'];
const MEMORY_KIND_LABEL: Record<string, string> = {
  BRAND: 'Brand voice',
  AUDIENCE: 'Audience',
  WINNING_CONTENT: 'What works',
  CAMPAIGN_LEARNING: 'Learnings',
};

export default function AgentPage() {
  const { workspace } = useAuthStore();
  const workspaceId = workspace?.id;

  const [agentEnabled, setAgentEnabled] = useState(false);
  const [agentPaused, setAgentPaused] = useState(false);
  const [recentRuns, setRecentRuns] = useState<AgentRun[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [statusActionLoading, setStatusActionLoading] = useState(false);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [goal, setGoal] = useState('');
  const [brief, setBrief] = useState('');
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [runningId, setRunningId] = useState<string | null>(null);
  const [runError, setRunError] = useState<Record<string, string>>({});
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
  const [expandedRuns, setExpandedRuns] = useState(false);

  // Approval loop: per-task inline edits, chosen schedule time, and busy/error state
  const [taskEdits, setTaskEdits] = useState<Record<string, { content: string; scheduledAt: string }>>({});
  const [taskBusy, setTaskBusy] = useState<Record<string, 'approve' | 'reject' | ''>>({});
  const [taskError, setTaskError] = useState<Record<string, string>>({});
  const [expandedDrafts, setExpandedDrafts] = useState<Record<string, boolean>>({});

  // Brand Brain (workspace memory)
  const [memories, setMemories] = useState<Memory[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [memoryError, setMemoryError] = useState('');
  const [showAddMemory, setShowAddMemory] = useState(false);
  const [newMemoryKind, setNewMemoryKind] = useState('BRAND');
  const [newMemoryContent, setNewMemoryContent] = useState('');

  const loadStatus = useCallback(() => {
    if (!workspaceId) return;
    api.get(`/agent/${workspaceId}/status`)
      .then(res => {
        setAgentEnabled(!!res.data.agentEnabled);
        setAgentPaused(!!res.data.agentPaused);
        setRecentRuns(res.data.recentRuns || []);
      })
      .catch(() => {})
      .finally(() => setLoadingStatus(false));
  }, [workspaceId]);

  const loadCampaigns = useCallback(() => {
    if (!workspaceId) return;
    api.get(`/agent/${workspaceId}/campaigns`)
      .then(res => setCampaigns(res.data || []))
      .catch(() => {});
  }, [workspaceId]);

  const loadMemory = useCallback(() => {
    if (!workspaceId) return;
    api.get(`/agent/${workspaceId}/memory`)
      .then(res => setMemories(res.data || []))
      .catch(() => {});
  }, [workspaceId]);

  useEffect(() => { loadStatus(); loadCampaigns(); loadMemory(); }, [loadStatus, loadCampaigns, loadMemory]);

  const toggleEnabled = async () => {
    if (!workspaceId) return;
    setStatusActionLoading(true);
    try {
      if (!agentEnabled) {
        await api.post(`/agent/${workspaceId}/enable`);
      } else if (agentPaused) {
        await api.post(`/agent/${workspaceId}/resume`);
      } else {
        await api.post(`/agent/${workspaceId}/pause`);
      }
      loadStatus();
    } finally {
      setStatusActionLoading(false);
    }
  };

  const togglePlatform = (p: string) => {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const handleCreate = async () => {
    if (!workspaceId || !goal.trim() || !brief.trim() || platforms.length === 0) {
      setCreateError('Goal, brief, and at least one platform are required.');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      await api.post(`/agent/${workspaceId}/campaigns`, { goal: goal.trim(), brief: brief.trim(), platforms });
      setGoal(''); setBrief(''); setPlatforms([]);
      setShowCreateForm(false);
      loadCampaigns();
    } catch (err: any) {
      setCreateError(err?.response?.data?.message || 'Failed to create campaign.');
    } finally {
      setCreating(false);
    }
  };

  const handleRun = async (campaignId: string) => {
    if (!workspaceId) return;
    setRunningId(campaignId);
    setRunError(prev => ({ ...prev, [campaignId]: '' }));
    try {
      await api.post(`/agent/${workspaceId}/campaigns/${campaignId}/run`, { trigger: 'manual' });
      setExpandedCampaign(campaignId);
      loadStatus();
      loadCampaigns();
    } catch (err: any) {
      setRunError(prev => ({ ...prev, [campaignId]: err?.response?.data?.message || 'Run failed.' }));
    } finally {
      setRunningId(null);
    }
  };

  const handleApprove = async (task: CampaignTask) => {
    if (!workspaceId) return;
    const edit = taskEdits[task.id];
    setTaskBusy(prev => ({ ...prev, [task.id]: 'approve' }));
    setTaskError(prev => ({ ...prev, [task.id]: '' }));
    try {
      await api.post(`/agent/${workspaceId}/tasks/${task.id}/approve`, {
        // Only send fields the reviewer actually changed; empty scheduledAt = now
        ...(edit?.scheduledAt ? { scheduledAt: new Date(edit.scheduledAt).toISOString() } : {}),
        ...(edit?.content != null && edit.content !== task.payload?.content ? { content: edit.content } : {}),
      });
      loadCampaigns();
    } catch (err: any) {
      setTaskError(prev => ({ ...prev, [task.id]: err?.response?.data?.message || 'Approve failed.' }));
    } finally {
      setTaskBusy(prev => ({ ...prev, [task.id]: '' }));
    }
  };

  const handleReject = async (taskId: string) => {
    if (!workspaceId) return;
    setTaskBusy(prev => ({ ...prev, [taskId]: 'reject' }));
    setTaskError(prev => ({ ...prev, [taskId]: '' }));
    try {
      await api.post(`/agent/${workspaceId}/tasks/${taskId}/reject`);
      loadCampaigns();
    } catch (err: any) {
      setTaskError(prev => ({ ...prev, [taskId]: err?.response?.data?.message || 'Reject failed.' }));
    } finally {
      setTaskBusy(prev => ({ ...prev, [taskId]: '' }));
    }
  };

  const handleSeedMemory = async () => {
    if (!workspaceId) return;
    setSeeding(true);
    setMemoryError('');
    try {
      await api.post(`/agent/${workspaceId}/memory/seed`);
      loadMemory();
    } catch (err: any) {
      setMemoryError(err?.response?.data?.message || 'Could not build Brand Brain.');
    } finally {
      setSeeding(false);
    }
  };

  const handleAddMemory = async () => {
    if (!workspaceId || !newMemoryContent.trim()) return;
    setMemoryError('');
    try {
      await api.post(`/agent/${workspaceId}/memory`, { kind: newMemoryKind, content: newMemoryContent.trim() });
      setNewMemoryContent('');
      setShowAddMemory(false);
      loadMemory();
    } catch (err: any) {
      setMemoryError(err?.response?.data?.message || 'Could not add memory.');
    }
  };

  const handleDeleteMemory = async (memoryId: string) => {
    if (!workspaceId) return;
    try {
      await api.delete(`/agent/${workspaceId}/memory/${memoryId}`);
      loadMemory();
    } catch {
      /* non-critical */
    }
  };

  if (!workspaceId) return null;

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-blue-600" />
            <h1 className={`text-3xl font-bold text-slate-900 ${libreBaskerville.className}`}>AI Agent</h1>
            <span className="text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Beta — Shadow Mode</span>
          </div>
          <p className="text-slate-500 text-sm mt-1 max-w-xl">
            Give it a campaign brief and it proposes draft posts based on your analytics and inbox activity.
            It can never publish or schedule anything on its own — every draft waits for your review.
          </p>
        </div>
      </div>

      {/* Status / kill switch card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            !agentEnabled ? 'bg-slate-100' : agentPaused ? 'bg-amber-100' : 'bg-emerald-100'
          }`}>
            <Power className={`w-5 h-5 ${
              !agentEnabled ? 'text-slate-400' : agentPaused ? 'text-amber-600' : 'text-emerald-600'
            }`} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {loadingStatus ? 'Checking status…' : !agentEnabled ? 'Agent is off' : agentPaused ? 'Agent is paused' : 'Agent is on'}
            </p>
            <p className="text-xs text-slate-500">
              {!agentEnabled
                ? 'Nothing runs until you enable it for this workspace.'
                : agentPaused
                ? 'Enabled, but paused — runs are blocked until resumed.'
                : 'You can trigger a run on any campaign below.'}
            </p>
          </div>
        </div>
        <button
          onClick={toggleEnabled}
          disabled={statusActionLoading || loadingStatus}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
            !agentEnabled
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : agentPaused
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          {statusActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : !agentEnabled ? 'Enable Agent' : agentPaused ? 'Resume' : 'Pause'}
        </button>
      </div>

      {/* Brand Brain */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
              <Brain className="w-4 h-4 text-blue-600" /> Brand Brain
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              What the agent knows about your brand before it drafts. Build it from your own published
              posts and clients, then edit anything by hand.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowAddMemory(v => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 px-2.5 py-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
            <button
              onClick={handleSeedMemory}
              disabled={seeding}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {seeding ? 'Building…' : memories.length ? 'Rebuild from my data' : 'Build from my data'}
            </button>
          </div>
        </div>

        {memoryError && (
          <p className="text-xs text-red-600 flex items-center gap-1 mb-3"><AlertTriangle className="w-3.5 h-3.5" /> {memoryError}</p>
        )}

        {showAddMemory && (
          <div className="mb-4 p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <div className="flex gap-2 flex-wrap">
              {MEMORY_KINDS.map(k => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setNewMemoryKind(k)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                    newMemoryKind === k ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
                  }`}
                >
                  {MEMORY_KIND_LABEL[k]}
                </button>
              ))}
            </div>
            <textarea
              value={newMemoryContent}
              onChange={e => setNewMemoryContent(e.target.value)}
              rows={2}
              placeholder="e.g. We speak warmly and directly; avoid corporate jargon; always end with a clear CTA."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 resize-none"
            />
            <div className="flex gap-2">
              <button onClick={handleAddMemory} disabled={!newMemoryContent.trim()} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold rounded-lg">Save</button>
              <button onClick={() => { setShowAddMemory(false); setNewMemoryContent(''); }} className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg">Cancel</button>
            </div>
          </div>
        )}

        {memories.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">
            No brand memory yet — click <span className="font-semibold">Build from my data</span> to learn your voice from your published posts and clients.
          </p>
        ) : (
          <div className="space-y-2">
            {memories.map(m => (
              <div key={m.id} className="group flex items-start gap-3 rounded-lg border border-slate-200 px-3 py-2">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 shrink-0 mt-0.5">
                  {MEMORY_KIND_LABEL[m.kind] || m.kind}
                </span>
                <p className="text-xs text-slate-600 leading-relaxed flex-1">{m.content}</p>
                <button
                  onClick={() => handleDeleteMemory(m.id)}
                  className="text-slate-300 hover:text-red-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete this memory"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Campaigns */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Campaigns</h2>
          <button
            onClick={() => setShowCreateForm(v => !v)}
            className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            <Plus className="w-4 h-4" /> New Campaign
          </button>
        </div>

        {showCreateForm && (
          <div className="mb-5 p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Goal</label>
              <input
                type="text"
                value={goal}
                onChange={e => setGoal(e.target.value)}
                placeholder="e.g. Grow engagement on our product launch"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Brief</label>
              <textarea
                value={brief}
                onChange={e => setBrief(e.target.value)}
                placeholder="Describe what you want the agent to do — audience, tone, key points..."
                rows={3}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Platforms</label>
              <div className="flex flex-wrap gap-2">
                {PLATFORM_OPTIONS.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePlatform(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      platforms.includes(p)
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    {p.charAt(0) + p.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
            {createError && (
              <p className="text-xs text-red-600 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> {createError}</p>
            )}
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleCreate}
                disabled={creating}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {creating ? 'Creating…' : 'Create Campaign'}
              </button>
              <button
                onClick={() => { setShowCreateForm(false); setCreateError(''); }}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {campaigns.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">No campaigns yet — create one to give the agent a brief.</p>
        ) : (
          <div className="space-y-3">
            {campaigns.map(c => {
              const isExpanded = expandedCampaign === c.id;
              const latestRun = recentRuns.find(r => r.campaignId === c.id);
              return (
                <div key={c.id} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="p-4 flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-900">{c.goal}</p>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{c.status}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{c.brief}</p>
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {c.platforms.map(p => (
                          <span key={p} className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{p}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleRun(c.id)}
                        disabled={!agentEnabled || agentPaused || runningId === c.id}
                        title={!agentEnabled ? 'Enable the agent first' : agentPaused ? 'Agent is paused' : ''}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        {runningId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                        {runningId === c.id ? 'Running…' : 'Run Agent'}
                      </button>
                      {latestRun && (
                        <button
                          onClick={() => setExpandedCampaign(isExpanded ? null : c.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-700"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {runError[c.id] && (
                    <div className="px-4 pb-3 -mt-1">
                      <p className="text-xs text-red-600 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> {runError[c.id]}</p>
                    </div>
                  )}

                  {/* Proposed drafts — the approval loop */}
                  {(() => {
                    const drafts = (c.tasks || []).filter(t => t.type === 'CONTENT_DRAFT');
                    if (drafts.length === 0) return null;
                    return (
                      <div className="border-t border-slate-200 p-4 space-y-3">
                        <p className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Proposed drafts — your review
                        </p>
                        {drafts.map(t => {
                          const busy = taskBusy[t.id];
                          const edit = taskEdits[t.id];
                          const contentVal = edit?.content ?? t.payload?.content ?? '';
                          const setEdit = (patch: Partial<{ content: string; scheduledAt: string }>) =>
                            setTaskEdits(prev => ({
                              ...prev,
                              [t.id]: {
                                content: prev[t.id]?.content ?? t.payload?.content ?? '',
                                scheduledAt: prev[t.id]?.scheduledAt ?? '',
                                ...patch,
                              },
                            }));

                          if (t.status === 'APPROVED') {
                            return (
                              <div key={t.id} className="text-xs bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span className="text-emerald-700 font-semibold">Scheduled</span>
                                {t.post?.scheduledAt && (
                                  <span className="text-emerald-600">· {new Date(t.post.scheduledAt).toLocaleString()}</span>
                                )}
                                <span className="text-slate-400">· find it in Scheduler</span>
                              </div>
                            );
                          }
                          if (t.status === 'REJECTED') {
                            return (
                              <div key={t.id} className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex items-center gap-2 text-slate-500">
                                <XCircle className="w-3.5 h-3.5 shrink-0" /> Rejected · draft kept in Scheduler → Drafts
                              </div>
                            );
                          }
                          // PROPOSED (or other) → editable + actions
                          const isDraftExpanded = !!expandedDrafts[t.id];
                          return (
                            <div key={t.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                {t.payload?.rationale ? (
                                  <p className="text-[11px] text-slate-500 italic flex-1">Why: {t.payload.rationale}</p>
                                ) : <span className="flex-1" />}
                                <button
                                  onClick={() => setExpandedDrafts(prev => ({ ...prev, [t.id]: !prev[t.id] }))}
                                  className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 shrink-0"
                                  title={isDraftExpanded ? 'Collapse' : 'Expand to full composer'}
                                >
                                  {isDraftExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                                  {isDraftExpanded ? 'Collapse' : 'Expand'}
                                </button>
                              </div>
                              <textarea
                                value={contentVal}
                                onChange={e => setEdit({ content: e.target.value })}
                                rows={isDraftExpanded ? 16 : 4}
                                className={`w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500 resize-y transition-all ${
                                  isDraftExpanded ? 'text-sm leading-relaxed whitespace-pre-wrap' : 'text-xs'
                                }`}
                              />
                              {isDraftExpanded && (
                                <p className="text-[10px] text-slate-400 text-right">{contentVal.length} characters</p>
                              )}
                              <div className="flex items-end gap-2 flex-wrap">
                                <div>
                                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">Schedule (leave blank = post now)</label>
                                  <input
                                    type="datetime-local"
                                    value={edit?.scheduledAt ?? ''}
                                    onChange={e => setEdit({ scheduledAt: e.target.value })}
                                    className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500"
                                  />
                                </div>
                                <button
                                  onClick={() => handleApprove(t)}
                                  disabled={!!busy}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors"
                                >
                                  {busy === 'approve' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                  Approve &amp; Schedule
                                </button>
                                <button
                                  onClick={() => handleReject(t.id)}
                                  disabled={!!busy}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 text-slate-600 text-xs font-semibold rounded-lg transition-colors"
                                >
                                  {busy === 'reject' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                                  Reject
                                </button>
                              </div>
                              {taskError[t.id] && (
                                <p className="text-[11px] text-red-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {taskError[t.id]}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {isExpanded && latestRun && (
                    <div className="border-t border-slate-200 bg-slate-50 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        {latestRun.outcome === 'SUCCESS' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : latestRun.outcome === 'FAILED' ? (
                          <XCircle className="w-4 h-4 text-red-600" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-600" />
                        )}
                        <span className="text-xs font-semibold text-slate-700">{latestRun.outcome}</span>
                        {latestRun.costUsd != null && (
                          <span className="text-xs text-slate-400">· ${latestRun.costUsd.toFixed(4)}</span>
                        )}
                        <span className="text-xs text-slate-400">· {new Date(latestRun.createdAt).toLocaleString()}</span>
                      </div>
                      {latestRun.summary && (
                        <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">{latestRun.summary}</p>
                      )}
                      {!!latestRun.toolCalls?.length && (
                        <div>
                          <p className="text-[10px] font-bold uppercase text-slate-400 mb-1.5 flex items-center gap-1">
                            <Wrench className="w-3 h-3" /> Tool calls
                          </p>
                          <div className="space-y-1">
                            {latestRun.toolCalls.map((tc, i) => (
                              <div key={i} className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
                                <span className="font-mono font-semibold text-slate-700">{tc.tool}</span>
                                {tc.error && <span className="text-red-600 ml-2">error: {tc.error}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <p className="text-[10px] text-slate-400">
                        Draft posts from this run appear in Scheduler → Drafts for your review — nothing is published automatically.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Audit log */}
      {recentRuns.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <button onClick={() => setExpandedRuns(v => !v)} className="flex items-center justify-between w-full">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Recent Runs (Audit Log)</h2>
            {expandedRuns ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          {expandedRuns && (
            <div className="mt-3 space-y-2">
              {recentRuns.map(r => (
                <div key={r.id} className="flex items-center justify-between text-xs border-b border-slate-100 py-2 last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    {r.outcome === 'SUCCESS' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : r.outcome === 'FAILED' ? (
                      <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    )}
                    <span className="text-slate-600 truncate">{r.trigger} · {r.model}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400 shrink-0">
                    {r.costUsd != null && <span>${r.costUsd.toFixed(4)}</span>}
                    <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
