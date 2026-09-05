'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import { Webhook, Loader2, Plus, Trash2, AlertTriangle, CheckCircle2, Send, Copy } from 'lucide-react';

type Hook = {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
  lastStatus?: number | null;
  lastFiredAt?: string | null;
  secretHint?: string;
};

const EVENTS = [
  { id: 'post.published', label: 'Post published' },
  { id: 'post.failed', label: 'Post failed' },
  { id: 'lead.created', label: 'New lead (CRM)' },
  { id: 'inbox.message', label: 'New inbox message' },
];

export default function WebhooksPanel() {
  const { workspace } = useAuthStore();
  const workspaceId = workspace?.id;

  const [hooks, setHooks] = useState<Hook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>(['post.published']);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [newSecret, setNewSecret] = useState('');

  const load = useCallback(() => {
    if (!workspaceId) return;
    setLoading(true);
    api.get(`/webhooks/${workspaceId}`)
      .then(res => setHooks(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => { load(); }, [load]);

  const toggleEvent = (id: string) =>
    setEvents(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]);

  const handleCreate = async () => {
    if (!workspaceId || !url.trim() || events.length === 0) return;
    setBusy(true); setError(''); setNewSecret('');
    try {
      const res = await api.post(`/webhooks/${workspaceId}`, { url: url.trim(), events });
      setNewSecret(res.data?.secret || '');
      setUrl(''); setEvents(['post.published']); setShowAdd(false);
      load();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not create webhook.');
    } finally {
      setBusy(false);
    }
  };

  const handleTest = async (id: string) => {
    if (!workspaceId) return;
    try {
      const res = await api.post(`/webhooks/${workspaceId}/${id}/test`);
      load();
      alert(res.data?.delivered ? `Test delivered (HTTP ${res.data.status})` : `Test failed (HTTP ${res.data?.status ?? 0})`);
    } catch { alert('Test failed'); }
  };

  const handleToggle = async (h: Hook) => {
    if (!workspaceId) return;
    await api.patch(`/webhooks/${workspaceId}/${h.id}`, { enabled: !h.enabled }).catch(() => {});
    load();
  };

  const handleDelete = async (id: string) => {
    if (!workspaceId) return;
    if (!confirm('Delete this webhook?')) return;
    await api.delete(`/webhooks/${workspaceId}/${id}`).catch(() => {});
    load();
  };

  return (
    <div className="max-w-2xl space-y-4 mt-10 pt-8 border-t border-slate-200">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Webhook className="w-5 h-5 text-blue-600" /> Webhooks
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Send events to Zapier, Make, n8n, or any HTTPS endpoint. Each delivery is signed
            (<code className="text-xs">X-EWork-Signature</code>, HMAC-SHA256).
          </p>
        </div>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg"
        >
          <Plus className="w-4 h-4" /> Add webhook
        </button>
      </div>

      {newSecret && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs">
          <p className="font-semibold text-emerald-700 mb-1 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Webhook created — copy your signing secret now (shown once):</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white border border-emerald-200 rounded px-2 py-1 break-all">{newSecret}</code>
            <button onClick={() => navigator.clipboard?.writeText(newSecret)} className="text-emerald-600 hover:text-emerald-800"><Copy className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="rounded-xl border border-slate-200 p-4 space-y-3">
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://hooks.zapier.com/hooks/catch/..."
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 font-mono"
          />
          <div className="flex flex-wrap gap-2">
            {EVENTS.map(ev => (
              <button
                key={ev.id}
                type="button"
                onClick={() => toggleEvent(ev.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                  events.includes(ev.id) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
                }`}
              >
                {ev.label}
              </button>
            ))}
          </div>
          {error && <p className="text-xs text-red-600 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> {error}</p>}
          <button
            onClick={handleCreate}
            disabled={busy || !url.trim() || events.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold rounded-lg"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-6 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline" /></div>
      ) : hooks.length === 0 ? (
        <p className="text-sm text-slate-500 py-4">No webhooks yet. Add one to connect an automation tool.</p>
      ) : (
        <div className="space-y-2">
          {hooks.map(h => (
            <div key={h.id} className="rounded-lg border border-slate-200 p-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-mono text-slate-700 truncate">{h.url}</p>
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  {h.events.map(e => (
                    <span key={e} className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{e}</span>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {h.enabled ? 'Enabled' : 'Disabled'}
                  {h.lastStatus != null && ` · last delivery HTTP ${h.lastStatus}`}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => handleTest(h.id)} title="Send test" className="p-1.5 text-slate-400 hover:text-blue-600"><Send className="w-4 h-4" /></button>
                <button onClick={() => handleToggle(h)} className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 px-2">{h.enabled ? 'Disable' : 'Enable'}</button>
                <button onClick={() => handleDelete(h.id)} title="Delete" className="p-1.5 text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
