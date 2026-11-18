'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import HelpTip from '@/components/settings/HelpTip';
import { KeyRound, Loader2, Plus, Trash2, AlertTriangle, CheckCircle2, Copy } from 'lucide-react';

type ApiKeyRow = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt?: string | null;
  expiresAt?: string | null;
  revokedAt?: string | null;
  createdAt: string;
};

const SCOPES = [
  { id: 'clients:read', label: 'Read contacts', hint: 'List and view contacts, notes and tasks' },
  { id: 'clients:write', label: 'Create and update contacts', hint: 'Add contacts, move pipeline stages, add notes and tasks' },
  { id: 'posts:read', label: 'Read posts and accounts', hint: 'List posts and connected social accounts' },
  { id: 'posts:write', label: 'Create drafts and scheduled posts', hint: 'Cannot publish instantly, only draft or schedule' },
];

function statusOf(k: ApiKeyRow): 'Active' | 'Revoked' | 'Expired' {
  if (k.revokedAt) return 'Revoked';
  if (k.expiresAt && new Date(k.expiresAt).getTime() < Date.now()) return 'Expired';
  return 'Active';
}

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : 'never');

export default function ApiKeysPanel() {
  const { workspace } = useAuthStore();
  const workspaceId = workspace?.id;
  const { loading: planLoading, canUseFeature } = usePlanLimits();
  const allowed = !planLoading && canUseFeature('apiAccessEnabled');

  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>(['clients:read', 'clients:write']);
  const [expiry, setExpiry] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [newKey, setNewKey] = useState('');
  const [copied, setCopied] = useState('');

  const apiBase = (api.defaults.baseURL || '').replace(/\/$/, '');

  const load = useCallback(() => {
    if (!workspaceId || !allowed) return;
    setLoading(true);
    api.get(`/api-keys/${workspaceId}`)
      .then(res => { setKeys(res.data || []); setForbidden(false); })
      .catch((err: any) => { if (err?.response?.status === 403) setForbidden(true); })
      .finally(() => setLoading(false));
  }, [workspaceId, allowed]);

  useEffect(() => { load(); }, [load]);

  const copy = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(''), 1500);
  };

  const toggleScope = (id: string) =>
    setScopes(prev => (prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]));

  const handleCreate = async () => {
    if (!workspaceId || !name.trim() || scopes.length === 0) return;
    setBusy(true); setError(''); setNewKey('');
    try {
      const res = await api.post(`/api-keys/${workspaceId}`, {
        name: name.trim(),
        scopes,
        expiresInDays: expiry ? Number(expiry) : undefined,
      });
      setNewKey(res.data?.key || '');
      setName(''); setScopes(['clients:read', 'clients:write']); setExpiry(''); setShowAdd(false);
      load();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(' ') : msg || 'Could not create the key.');
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = async (k: ApiKeyRow) => {
    if (!workspaceId) return;
    if (!confirm(`Revoke the key "${k.name}"? Any automation using it will stop working immediately.`)) return;
    await api.delete(`/api-keys/${workspaceId}/${k.id}`).catch(() => {});
    load();
  };

  const header = (
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div>
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-blue-600" /> API keys
          <HelpTip title="What are API keys?">
            <p>
              Webhooks let eWork Social tell Make, n8n or Zapier when something happens. API keys work the other
              way round: they let those tools do things inside eWork Social, such as add a contact, move a deal
              to a new stage, add a note or task, or schedule a post.
            </p>
            <p>
              Create a key, choose what it is allowed to do, and paste it into your tool as a Bearer token in the
              Authorization header. In Make or n8n use an HTTP request module pointed at the address shown after
              you create a key.
            </p>
            <p>
              The full key is shown only once. If you lose it, revoke it and create a new one. Each key is
              limited to 120 requests per minute.
            </p>
          </HelpTip>
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          Let Make, n8n, Zapier or your own code read and update your CRM and schedule posts.
        </p>
      </div>
      {allowed && !forbidden && (
        <button
          onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg"
        >
          <Plus className="w-4 h-4" /> Create key
        </button>
      )}
    </div>
  );

  const shell = 'max-w-2xl space-y-4 mt-10 pt-8 border-t border-slate-200';

  if (planLoading) {
    return <div className={shell}><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;
  }

  if (!allowed) {
    return (
      <div className={shell}>
        {header}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          API keys are included with the Agency Pro plan and above.{' '}
          <a href="/dashboard/settings?tab=plan" className="font-semibold underline">See plans</a>
        </div>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className={shell}>
        {header}
        <p className="text-sm text-slate-500">Only workspace owners and admins can manage API keys.</p>
      </div>
    );
  }

  const testCmd = newKey ? `curl ${apiBase}/public/v1/me -H "Authorization: Bearer ${newKey}"` : '';

  return (
    <div className={shell}>
      {header}

      {newKey && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs space-y-2">
          <p className="font-semibold text-emerald-700 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Key created. Copy it now, it will not be shown again:
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white border border-emerald-200 rounded px-2 py-1 break-all">{newKey}</code>
            <button onClick={() => copy(newKey, 'key')} className="text-emerald-600 hover:text-emerald-800 flex items-center gap-1">
              <Copy className="w-4 h-4" /> {copied === 'key' ? 'Copied' : ''}
            </button>
          </div>
          <p className="text-emerald-700">Test it from Terminal, or use the same address and header in Make or n8n:</p>
          <div className="flex items-start gap-2">
            <code className="flex-1 bg-white border border-emerald-200 rounded px-2 py-1 break-all">{testCmd}</code>
            <button onClick={() => copy(testCmd, 'cmd')} className="text-emerald-600 hover:text-emerald-800 flex items-center gap-1">
              <Copy className="w-4 h-4" /> {copied === 'cmd' ? 'Copied' : ''}
            </button>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="rounded-xl border border-slate-200 p-4 space-y-3">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Name, for example Make scenario or n8n workflow"
            maxLength={60}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500"
          />
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-slate-600">Allowed to</p>
            {SCOPES.map(s => (
              <label key={s.id} className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={scopes.includes(s.id)} onChange={() => toggleScope(s.id)} className="mt-1" />
                <span>
                  {s.label}
                  <span className="block text-[11px] text-slate-400">{s.hint}</span>
                </span>
              </label>
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>Expires</span>
            <select value={expiry} onChange={e => setExpiry(e.target.value)} className="px-2 py-1 border border-slate-300 rounded-lg bg-white text-sm">
              <option value="">Never</option>
              <option value="30">In 30 days</option>
              <option value="90">In 90 days</option>
              <option value="365">In 1 year</option>
            </select>
          </div>
          {error && <p className="text-xs text-red-600 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> {error}</p>}
          <button
            onClick={handleCreate}
            disabled={busy || !name.trim() || scopes.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold rounded-lg"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create key
          </button>
        </div>
      )}

      {!showAdd && error && <p className="text-xs text-red-600 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> {error}</p>}

      {loading ? (
        <div className="py-6 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline" /></div>
      ) : keys.length === 0 ? (
        <p className="text-sm text-slate-500 py-4">No API keys yet. Create one to connect an automation tool.</p>
      ) : (
        <div className="space-y-2">
          {keys.map(k => {
            const status = statusOf(k);
            return (
              <div key={k.id} className={`rounded-lg border p-3 flex items-start justify-between gap-3 ${status === 'Active' ? 'border-slate-200' : 'border-slate-100 bg-slate-50'}`}>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-700 truncate">{k.name}</p>
                  <p className="text-xs font-mono text-slate-500">{k.prefix}…</p>
                  <div className="flex gap-1.5 mt-1 flex-wrap">
                    {k.scopes.map(s => (
                      <span key={s} className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{s}</span>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {status} · created {fmt(k.createdAt)} · last used {fmt(k.lastUsedAt)}
                    {k.expiresAt ? ` · expires ${fmt(k.expiresAt)}` : ''}
                  </p>
                </div>
                {status === 'Active' && (
                  <button onClick={() => handleRevoke(k)} title="Revoke key" className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-red-500 px-2 py-1">
                    <Trash2 className="w-4 h-4" /> Revoke
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
