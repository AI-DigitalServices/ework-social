'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import { Sparkles, Loader2, CheckCircle2, AlertTriangle, KeyRound } from 'lucide-react';

type LlmStatus = {
  connected: boolean;
  provider: string | null;
  activeSource: 'workspace' | 'platform';
  ownKeyAllowed: boolean;
  monthlyRunLimit: number;
  planDisplay: string;
};

/**
 * Which Claude key the AI Agent runs on. The platform key is the default for
 * everyone; a workspace on Growth or above can switch to its own Anthropic key,
 * which removes the monthly agent-run cap because it bills their own account.
 */
export default function AgentKeyPanel() {
  const { workspace } = useAuthStore();
  const workspaceId = workspace?.id;

  const [status, setStatus] = useState<LlmStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'platform' | 'own'>('platform');
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(() => {
    if (!workspaceId) return;
    setLoading(true);
    api.get(`/integrations/${workspaceId}/llm`)
      .then(res => {
        setStatus(res.data);
        setMode(res.data?.connected ? 'own' : 'platform');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => { load(); }, [load]);

  const handleConnect = async () => {
    if (!workspaceId || !apiKey.trim()) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      await api.post(`/integrations/${workspaceId}/llm`, { apiKey: apiKey.trim() });
      setApiKey('');
      setSuccess('Your Claude key is connected. Agent runs now use your key and are not counted against the monthly limit.');
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
      await api.delete(`/integrations/${workspaceId}/llm`);
      setSuccess('Switched back to the platform key.');
      load();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not switch back.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="py-6 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline" /></div>;
  if (!status) return null;

  const limit = status.monthlyRunLimit;
  const limitText =
    limit >= 999999 ? 'unlimited agent runs' : limit > 0 ? `${limit} agent runs a month` : 'no agent runs';

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600" /> AI Agent key
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          The AI Agent and Brand Brain run on Claude. The platform key is included in your plan and needs no setup.
          You can switch to your own Anthropic key to remove the monthly run limit.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${status.connected ? 'bg-emerald-100' : 'bg-slate-100'}`}>
            <KeyRound className={`w-5 h-5 ${status.connected ? 'text-emerald-600' : 'text-slate-400'}`} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              {status.connected ? 'Your own Claude key is active' : 'Using the platform key'}
            </p>
            <p className="text-xs text-slate-500">
              {status.connected
                ? 'Agent runs bill your Anthropic account and are not counted against a monthly limit.'
                : `Included in your ${status.planDisplay} plan: ${limitText}.`}
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Key used by the AI Agent</label>
          <select
            value={mode}
            onChange={e => { setMode(e.target.value as 'platform' | 'own'); setError(''); setSuccess(''); }}
            disabled={busy}
            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500"
          >
            <option value="platform">Platform key (default, no setup)</option>
            <option value="own">My own Claude key (Growth and above)</option>
          </select>
        </div>

        {mode === 'platform' && status.connected && (
          <button
            onClick={handleDisconnect}
            disabled={busy}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-40 text-slate-700 text-sm font-semibold rounded-lg"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Switch back to the platform key
          </button>
        )}

        {mode === 'own' && !status.ownKeyAllowed && (
          <p className="text-xs text-amber-700 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Using your own Claude key is available on the Growth plan and above.
          </p>
        )}

        {mode === 'own' && status.ownKeyAllowed && (
          <div className="space-y-2">
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder={status.connected ? 'Paste a new key to replace the current one' : 'Paste your Anthropic API key (sk-ant-...)'}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 font-mono"
            />
            <p className="text-[11px] text-slate-400">
              Create a key at console.anthropic.com. It is checked with a test call, then stored encrypted. It is never
              shown again. If the key stops working, agent runs stop with a clear message; they never fall back to the platform key.
            </p>
            <button
              onClick={handleConnect}
              disabled={busy || !apiKey.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold rounded-lg"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {busy ? 'Checking the key' : status.connected ? 'Replace key' : 'Connect and check key'}
            </button>
          </div>
        )}

        {error && <p className="text-xs text-red-600 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> {error}</p>}
        {success && <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {success}</p>}
      </div>
    </div>
  );
}
