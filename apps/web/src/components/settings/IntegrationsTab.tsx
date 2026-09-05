'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import { Plug, Loader2, CheckCircle2, AlertTriangle, Trash2, KeyRound } from 'lucide-react';
import WebhooksPanel from '@/components/settings/WebhooksPanel';

type Status = {
  connected: boolean;
  provider: string | null;
  platformFallback: boolean;
  activeSource: 'workspace' | 'platform' | 'none';
};

const PROVIDERS = [
  { id: 'voyage', label: 'Voyage AI', hint: 'Anthropic-recommended embeddings. Get a key at voyageai.com.' },
  { id: 'openai', label: 'OpenAI', hint: 'Embeddings + image generation (gpt-image-1). Get a key at platform.openai.com.' },
  { id: 'gemini', label: 'Google Gemini', hint: 'Embeddings + image generation. Get a key at aistudio.google.com.' },
];

export default function IntegrationsTab() {
  const { workspace } = useAuthStore();
  const workspaceId = workspace?.id;

  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState('voyage');
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(() => {
    if (!workspaceId) return;
    setLoading(true);
    api.get(`/integrations/${workspaceId}/ai`)
      .then(res => setStatus(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => { load(); }, [load]);

  const handleConnect = async () => {
    if (!workspaceId || !apiKey.trim()) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      const res = await api.post(`/integrations/${workspaceId}/ai`, { provider, apiKey: apiKey.trim() });
      setApiKey('');
      setSuccess(`Connected ${provider}. Re-embedded ${res.data?.reembedded ?? 0} memories.`);
      load();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not connect the key.');
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    if (!workspaceId) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      await api.delete(`/integrations/${workspaceId}/ai`);
      setSuccess('Disconnected — back to the platform default.');
      load();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not disconnect.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="py-10 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline" /></div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Plug className="w-5 h-5 text-blue-600" /> AI Integrations
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          Connect your own AI provider key for semantic Brand Brain memory. When connected, embeddings
          run on <span className="font-semibold">your</span> account and quota instead of the platform default.
        </p>
      </div>

      {/* Current status */}
      <div className="rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${status?.connected ? 'bg-emerald-100' : 'bg-slate-100'}`}>
            <KeyRound className={`w-5 h-5 ${status?.connected ? 'text-emerald-600' : 'text-slate-400'}`} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              {status?.connected ? `Your ${status.provider} key is active` : 'Using platform default'}
            </p>
            <p className="text-xs text-slate-500">
              {status?.activeSource === 'workspace'
                ? 'Embeddings run on your own key.'
                : status?.activeSource === 'platform'
                ? 'Embeddings run on the platform Voyage key (no cost to you).'
                : 'No embeddings configured — memory falls back to keyword matching.'}
            </p>
          </div>
        </div>
        {status?.connected && (
          <button
            onClick={handleDisconnect}
            disabled={busy}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-40 text-slate-600 text-sm font-semibold rounded-lg"
          >
            <Trash2 className="w-4 h-4" /> Disconnect
          </button>
        )}
      </div>

      {/* Connect form */}
      <div className="rounded-xl border border-slate-200 p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-700">{status?.connected ? 'Replace key' : 'Connect a key'}</p>
        <div className="flex gap-2 flex-wrap">
          {PROVIDERS.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setProvider(p.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                provider === p.id ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400">{PROVIDERS.find(p => p.id === provider)?.hint}</p>
        <input
          type="password"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder={`Paste your ${provider} API key`}
          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 font-mono"
        />
        <p className="text-[11px] text-slate-400">
          Your key is validated with a test call, then stored encrypted. It is never shown again or sent to anyone but the provider.
        </p>
        {error && <p className="text-xs text-red-600 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> {error}</p>}
        {success && <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {success}</p>}
        <button
          onClick={handleConnect}
          disabled={busy || !apiKey.trim()}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold rounded-lg"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          {busy ? 'Validating…' : 'Connect & validate'}
        </button>
      </div>

      {/* Outbound webhooks (Zapier / Make / n8n) */}
      <WebhooksPanel />
    </div>
  );
}
