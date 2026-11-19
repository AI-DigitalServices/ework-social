'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { Loader2, RefreshCw, RotateCcw } from 'lucide-react';

type Delivery = {
  id: string;
  event: string;
  status: number;
  state: 'SUCCESS' | 'RETRYING' | 'FAILED';
  attempts: number;
  error?: string | null;
  durationMs: number;
  nextRetryAt?: string | null;
  createdAt: string;
};

const STATE_STYLE: Record<string, string> = {
  SUCCESS: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  RETRYING: 'bg-amber-50 text-amber-700 border-amber-200',
  FAILED: 'bg-red-50 text-red-700 border-red-200',
};
const STATE_LABEL: Record<string, string> = {
  SUCCESS: 'Delivered',
  RETRYING: 'Retrying',
  FAILED: 'Failed',
};

function fmt(d?: string | null) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleString();
  } catch {
    return d;
  }
}

export default function WebhookDeliveries({ workspaceId, hookId }: { workspaceId: string; hookId: string }) {
  const [rows, setRows] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [resendingId, setResendingId] = useState('');
  const [note, setNote] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/webhooks/${workspaceId}/${hookId}/deliveries`)
      .then(res => setRows(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceId, hookId]);

  useEffect(() => { load(); }, [load]);

  const resend = async (id: string) => {
    setResendingId(id);
    try {
      const res = await api.post(`/webhooks/${workspaceId}/${hookId}/deliveries/${id}/resend`);
      setNote(prev => ({
        ...prev,
        [id]: res.data?.delivered ? 'Sent again - delivered' : 'Sent again - failed (HTTP ' + (res.data?.status ?? 0) + ')',
      }));
    } catch (err: any) {
      setNote(prev => ({ ...prev, [id]: err?.response?.data?.message || 'Could not resend.' }));
    } finally {
      setResendingId('');
      load();
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-slate-600">Recent deliveries (kept 14 days)</p>
        <button onClick={load} className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>
      {loading ? (
        <div className="py-3 text-center text-slate-400"><Loader2 className="w-4 h-4 animate-spin inline" /></div>
      ) : rows.length === 0 ? (
        <p className="text-[11px] text-slate-400">Nothing sent yet. Press Send test to see the first delivery here.</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map(r => (
            <div key={r.id} className="rounded-md border border-slate-100 bg-slate-50 px-2.5 py-1.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={'text-[10px] font-bold px-1.5 py-0.5 rounded border ' + (STATE_STYLE[r.state] || '')}>
                    {STATE_LABEL[r.state] || r.state}
                  </span>
                  <span className="text-[11px] font-mono text-slate-600 truncate">{r.event}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <span>HTTP {r.status}</span>
                  <span>{r.attempts} {r.attempts === 1 ? 'attempt' : 'attempts'}</span>
                  <span>{r.durationMs} ms</span>
                  <span>{fmt(r.createdAt)}</span>
                  {r.state === 'FAILED' && (
                    <button
                      onClick={() => resend(r.id)}
                      disabled={resendingId === r.id}
                      className="flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900 disabled:opacity-50"
                    >
                      {resendingId === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                      Resend
                    </button>
                  )}
                </div>
              </div>
              {r.state === 'RETRYING' && r.nextRetryAt && (
                <p className="text-[10px] text-amber-700 mt-0.5">Next retry about {fmt(r.nextRetryAt)}</p>
              )}
              {r.error && r.state !== 'SUCCESS' && <p className="text-[10px] text-red-600 mt-0.5 break-words">{r.error}</p>}
              {note[r.id] && <p className="text-[10px] font-semibold text-slate-600 mt-0.5">{note[r.id]}</p>}
              <p className="text-[9px] font-mono text-slate-300 mt-0.5">{r.id}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
