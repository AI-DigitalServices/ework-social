'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { createClientAction } from '@/actions/crm.actions';
import { useAuthStore } from '@/store/auth.store';
import { useCurrencyStore, CURRENCY_SYMBOLS } from '@/store/currency.store';

interface Props {
  onClose: () => void;
  onAdded: (client: any) => void;
}

const INPUT_CLS = 'w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-900 placeholder-slate-400 bg-white';
const LABEL_CLS = 'block text-xs font-medium text-slate-600 mb-1';

export default function AddClientModal({ onClose, onAdded }: Props) {
  const { workspace } = useAuthStore();
  const { currency } = useCurrencyStore();
  const currencySymbol = CURRENCY_SYMBOLS[currency];

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    tags: '',
    source: 'MANUAL',
    stage: 'LEAD',
    dealValue: '',
    nextFollowUpAt: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Full name is required.'); return; }
    setError('');
    setLoading(true);
    try {
      const client = await createClientAction({
        name: form.name.trim(),
        email: form.email || undefined,
        phone: form.phone || undefined,
        company: form.company || undefined,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        source: form.source || 'MANUAL',
        stage: form.stage || 'LEAD',
        dealValue: form.dealValue ? parseFloat(form.dealValue) : undefined,
        nextFollowUpAt: form.nextFollowUpAt || undefined,
        workspaceId: workspace!.id,
      });
      onAdded(client);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || 'Failed to add contact. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-800">Add New Contact</h2>
            <p className="text-xs text-slate-400 mt-0.5">Fill in as much or as little as you have</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 overflow-y-auto flex-1">

          {/* Error banner */}
          {error && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{error}</div>
          )}

          {/* Row: Name + Company */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>Full Name <span className="text-red-400">*</span></label>
              <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
                className={INPUT_CLS} placeholder="Jane Doe" required />
            </div>
            <div>
              <label className={LABEL_CLS}>Company / Brand</label>
              <input type="text" value={form.company} onChange={e => set('company', e.target.value)}
                className={INPUT_CLS} placeholder="Acme Ltd" />
            </div>
          </div>

          {/* Row: Email + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                className={INPUT_CLS} placeholder="jane@acme.com" />
            </div>
            <div>
              <label className={LABEL_CLS}>Phone</label>
              <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                className={INPUT_CLS} placeholder="+234 800 000 0000" />
            </div>
          </div>

          {/* Row: Stage + Source */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>Pipeline Stage</label>
              <select value={form.stage} onChange={e => set('stage', e.target.value)} className={INPUT_CLS}>
                <option value="LEAD">Lead</option>
                <option value="CONTACTED">Contacted</option>
                <option value="PROPOSAL">Proposal</option>
                <option value="ACTIVE">Active Client</option>
                <option value="DORMANT">Dormant</option>
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Lead Source</label>
              <select value={form.source} onChange={e => set('source', e.target.value)} className={INPUT_CLS}>
                <option value="MANUAL">Manual</option>
                <option value="WEBSITE">Website</option>
                <option value="REFERRAL">Referral</option>
                <option value="INSTAGRAM_DM">Instagram DM</option>
                <option value="INSTAGRAM_COMMENT">Instagram Comment</option>
                <option value="FACEBOOK_DM">Facebook DM</option>
                <option value="FACEBOOK_COMMENT">Facebook Comment</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          {/* Row: Deal Value + Next Follow-up */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>Deal Value ({currencySymbol})</label>
              <input type="number" value={form.dealValue} onChange={e => set('dealValue', e.target.value)}
                className={INPUT_CLS} placeholder="0" min="0" step="any" />
            </div>
            <div>
              <label className={LABEL_CLS}>Next Follow-up</label>
              <input type="date" value={form.nextFollowUpAt} onChange={e => set('nextFollowUpAt', e.target.value)}
                className={INPUT_CLS} />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className={LABEL_CLS}>Tags <span className="text-slate-400 font-normal">(comma separated)</span></label>
            <input type="text" value={form.tags} onChange={e => set('tags', e.target.value)}
              className={INPUT_CLS} placeholder="e-commerce, fashion, lagos" />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50">
              {loading ? 'Adding...' : 'Add Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
