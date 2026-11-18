'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import HelpTip from '@/components/settings/HelpTip';
import { Inbox, Loader2, Plus, Trash2, AlertTriangle, Copy, RefreshCw } from 'lucide-react';

type Link = {
  id: string;
  name: string;
  token: string;
  enabled: boolean;
  defaultTags: string[];
  redirectUrl?: string | null;
  lastUsedAt?: string | null;
  submissionCount: number;
  createdAt: string;
};

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : 'never');

function htmlSnippet(url: string) {
  return [
    `<form action="${url}" method="POST">`,
    '  <input name="name" placeholder="Your name" required>',
    '  <input name="email" type="email" placeholder="Email" required>',
    '  <input name="phone" placeholder="Phone">',
    '  <textarea name="message" placeholder="How can we help?"></textarea>',
    '  <input name="_gotcha" style="display:none" tabindex="-1" autocomplete="off">',
    '  <button type="submit">Send</button>',
    '</form>',
  ].join('\n');
}

export default function LeadCapturePanel() {
  const { workspace } = useAuthStore();
  const workspaceId = workspace?.id;
  const { loading: planLoading, canUseFeature } = usePlanLimits();
  const allowed = !planLoading && canUseFeature('automationEnabled');

  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [tags, setTags] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  const apiBase = (api.defaults.baseURL || '').replace(/\/$/, '');
  const urlFor = (l: Link) => `${apiBase}/public/v1/capture/${l.token}`;

  const load = useCallback(() => {
    if (!workspaceId || !allowed) return;
    setLoading(true);
    api.get(`/lead-capture/${workspaceId}`)
      .then(res => { setLinks(res.data || []); setForbidden(false); })
      .catch((err: any) => { if (err?.response?.status === 403) setForbidden(true); })
      .finally(() => setLoading(false));
  }, [workspaceId, allowed]);

  useEffect(() => { load(); }, [load]);

  const copy = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(''), 1500);
  };

  const fail = (err: any, fallback: string) => {
    const msg = err?.response?.data?.message;
    setError(Array.isArray(msg) ? msg.join(' ') : msg || fallback);
  };

  const handleCreate = async () => {
    if (!workspaceId || !name.trim()) return;
    setBusy(true); setError('');
    try {
      await api.post(`/lead-capture/${workspaceId}`, {
        name: name.trim(),
        defaultTags: tags.split(',').map(t => t.trim()).filter(Boolean),
        redirectUrl: redirectUrl.trim() || undefined,
      });
      setName(''); setTags(''); setRedirectUrl(''); setShowAdd(false);
      load();
    } catch (err: any) {
      fail(err, 'Could not create the form link.');
    } finally {
      setBusy(false);
    }
  };

  const handleToggle = async (l: Link) => {
    if (!workspaceId) return;
    await api.patch(`/lead-capture/${workspaceId}/${l.id}`, { enabled: !l.enabled }).catch(() => {});
    load();
  };

  const handleRotate = async (l: Link) => {
    if (!workspaceId) return;
    if (!confirm('Create a new address for this form? The current address stops working straight away, so update your website form afterwards.')) return;
    await api.post(`/lead-capture/${workspaceId}/${l.id}/rotate`).catch((err: any) => fail(err, 'Could not rotate.'));
    load();
  };

  const handleDelete = async (l: Link) => {
    if (!workspaceId) return;
    if (!confirm(`Delete the form link "${l.name}"? Forms using it will stop sending leads.`)) return;
    await api.delete(`/lead-capture/${workspaceId}/${l.id}`).catch(() => {});
    load();
  };

  const shell = 'max-w-2xl space-y-4 mt-10 pt-8 border-t border-slate-200';

  const header = (
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div>
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Inbox className="w-5 h-5 text-blue-600" /> Website lead capture
          <HelpTip title="How does lead capture work?">
            <p>
              Each form link is a private web address. When a contact form on your website sends its answers to
              that address, eWork Social adds the person to your CRM as a new lead with the source set to Website,
              and runs any automations connected to new leads.
            </p>
            <p>
              If the same email submits again, no duplicate is created. The new message is added as a note on the
              existing contact.
            </p>
            <p>
              It understands the usual field names (name, email, phone, company, message) from WordPress form
              plugins, Elementor, Contact Form 7 and plain HTML forms. Anything else the form collects is saved in
              the contact note.
            </p>
            <p>
              Keep the address private. If it leaks, use Rotate to get a new one. Add a hidden field named
              _gotcha to your form to catch spam bots.
            </p>
          </HelpTip>
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          Send contact-form submissions from your website straight into your CRM.
        </p>
      </div>
      {allowed && !forbidden && (
        <button
          onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg"
        >
          <Plus className="w-4 h-4" /> Add form link
        </button>
      )}
    </div>
  );

  if (planLoading) return <div className={shell}><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;

  if (!allowed) {
    return (
      <div className={shell}>
        {header}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Website lead capture is included with the Growth plan and above.{' '}
          <a href="/dashboard/settings?tab=plan" className="font-semibold underline">See plans</a>
        </div>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className={shell}>
        {header}
        <p className="text-sm text-slate-500">Only workspace owners and admins can manage lead capture links.</p>
      </div>
    );
  }

  return (
    <div className={shell}>
      {header}

      {showAdd && (
        <div className="rounded-xl border border-slate-200 p-4 space-y-3">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Name, for example Contact page form"
            maxLength={60}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500"
          />
          <input
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder="Optional tags for these leads, separated by commas"
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500"
          />
          <input
            value={redirectUrl}
            onChange={e => setRedirectUrl(e.target.value)}
            placeholder="Optional thank-you page, for example https://yoursite.com/thanks"
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 font-mono"
          />
          <p className="text-[11px] text-slate-400">
            The thank-you page is used when a visitor submits a normal HTML form. Leave it empty if you send from Make, n8n or a form plugin.
          </p>
          {error && <p className="text-xs text-red-600 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> {error}</p>}
          <button
            onClick={handleCreate}
            disabled={busy || !name.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold rounded-lg"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create
          </button>
        </div>
      )}

      {!showAdd && error && <p className="text-xs text-red-600 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> {error}</p>}

      {loading ? (
        <div className="py-6 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline" /></div>
      ) : links.length === 0 ? (
        <p className="text-sm text-slate-500 py-4">No form links yet. Add one, then point your website form at its address.</p>
      ) : (
        <div className="space-y-3">
          {links.map(l => (
            <div key={l.id} className={`rounded-lg border p-3 space-y-2 ${l.enabled ? 'border-slate-200' : 'border-slate-100 bg-slate-50'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-700 truncate">{l.name}</p>
                  <p className="text-[11px] text-slate-400">
                    {l.enabled ? 'Active' : 'Paused'} · {l.submissionCount} submissions · last used {fmt(l.lastUsedAt)}
                    {l.defaultTags.length > 0 ? ` · tags: ${l.defaultTags.join(', ')}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => handleToggle(l)} className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 px-2">
                    {l.enabled ? 'Pause' : 'Resume'}
                  </button>
                  <button onClick={() => handleRotate(l)} title="Get a new address" className="p-1.5 text-slate-400 hover:text-blue-600">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(l)} title="Delete" className="p-1.5 text-slate-300 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <code className="flex-1 text-[11px] bg-slate-50 border border-slate-200 rounded px-2 py-1 break-all">{urlFor(l)}</code>
                <button onClick={() => copy(urlFor(l), `url-${l.id}`)} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs font-semibold">
                  <Copy className="w-4 h-4" /> {copied === `url-${l.id}` ? 'Copied' : 'Copy'}
                </button>
              </div>

              <details className="text-xs text-slate-600">
                <summary className="cursor-pointer font-semibold text-blue-600">How to connect your form</summary>
                <div className="mt-2 space-y-3">
                  <div>
                    <p className="font-semibold text-slate-700">WordPress, Elementor, Gravity Forms, WPForms</p>
                    <p>
                      Add a Webhook action to your form and paste the address above as the webhook URL. Method POST.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700">Make or n8n</p>
                    <p>
                      Add an HTTP request step, method POST, paste the address, and send the form fields as JSON
                      or as form data. Field names such as name, email, phone, company and message are recognised.
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-slate-700">Plain HTML form</p>
                      <button onClick={() => copy(htmlSnippet(urlFor(l)), `html-${l.id}`)} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold">
                        <Copy className="w-3.5 h-3.5" /> {copied === `html-${l.id}` ? 'Copied' : 'Copy code'}
                      </button>
                    </div>
                    <pre className="mt-1 bg-slate-50 border border-slate-200 rounded p-2 overflow-x-auto text-[11px]">{htmlSnippet(urlFor(l))}</pre>
                  </div>
                </div>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
