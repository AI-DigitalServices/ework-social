'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import {
  Sparkles, Play, Power, Plus, Loader2, CheckCircle2, XCircle,
  Clock, Wrench, ChevronDown, ChevronUp, AlertTriangle,
} from 'lucide-react';

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

type Campaign = {
  id: string;
  goal: string;
  brief: string;
  platforms: string[];
  status: string;
  createdAt: string;
  tasks?: { id: string; type: string; status: string; payload: any }[];
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

  useEffect(() => { loadStatus(); loadCampaigns(); }, [loadStatus, loadCampaigns]);

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

  if (!workspaceId) return null;

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-900">AI Agent</h1>
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
