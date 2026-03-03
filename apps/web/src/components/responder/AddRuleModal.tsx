'use client';

import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { createRuleAction } from '@/actions/responder.actions';
import { useAuthStore } from '@/store/auth.store';

const platforms = [
  { id: 'FACEBOOK', label: 'Facebook', icon: '📘' },
  { id: 'INSTAGRAM', label: 'Instagram', icon: '📸' },
  { id: 'TWITTER', label: 'Twitter/X', icon: '🐦' },
  { id: 'LINKEDIN', label: 'LinkedIn', icon: '💼' },
  { id: 'WHATSAPP', label: 'WhatsApp', icon: '💬' },
];

const triggerTypes = [
  { id: 'keyword', label: 'Keyword Match', desc: 'Trigger when message contains specific words' },
  { id: 'any_comment', label: 'Any Comment', desc: 'Trigger on every comment' },
  { id: 'any_dm', label: 'Any DM', desc: 'Trigger on every direct message' },
  { id: 'first_message', label: 'First Message', desc: 'Trigger only on first interaction' },
];

const responseTypes = [
  { id: 'comment', label: 'Reply to Comment' },
  { id: 'dm', label: 'Send DM' },
  { id: 'both', label: 'Both Comment + DM' },
];

const leadStages = [
  { id: '', label: "Don't update" },
  { id: 'CONTACTED', label: 'Move to Contacted' },
  { id: 'PROPOSAL', label: 'Move to Proposal' },
  { id: 'ACTIVE', label: 'Move to Active' },
];

interface Props {
  onClose: () => void;
  onCreated: (rule: any) => void;
}

export default function AddRuleModal({ onClose, onCreated }: Props) {
  const { workspace } = useAuthStore();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '',
    platform: 'FACEBOOK',
    triggerType: 'keyword',
    keywords: [''],
    responseMessage: '',
    responseType: 'comment',
    updateLeadStage: '',
    isActive: true,
  });
  const [loading, setLoading] = useState(false);

  const addKeyword = () => setForm({ ...form, keywords: [...form.keywords, ''] });
  const removeKeyword = (i: number) =>
    setForm({ ...form, keywords: form.keywords.filter((_, idx) => idx !== i) });
  const updateKeyword = (i: number, val: string) => {
    const kw = [...form.keywords];
    kw[i] = val;
    setForm({ ...form, keywords: kw });
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const rule = await createRuleAction({
        ...form,
        workspaceId: workspace!.id,
        keywords: form.keywords.filter(k => k.trim()),
        updateLeadStage: form.updateLeadStage || undefined,
      });
      onCreated(rule);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Create Auto-Responder Rule</h2>
            <p className="text-slate-500 text-sm mt-0.5">Step {step} of 3</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Progress */}
        <div className="flex gap-1 px-6 pt-4">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                s <= step ? 'bg-blue-600' : 'bg-slate-100'
              }`}
            />
          ))}
        </div>

        <div className="p-6 space-y-5">
          {/* Step 1 — Basic setup */}
          {step === 1 && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Rule Name
                </label>
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Welcome DM Reply"
                  style={{ color: '#0f172a' }}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Platform
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {platforms.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setForm({ ...form, platform: p.id })}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition ${
                        form.platform === p.id
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 text-slate-600 hover:border-blue-200'
                      }`}
                    >
                      <span>{p.icon}</span> {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Trigger Type
                </label>
                <div className="space-y-2">
                  {triggerTypes.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setForm({ ...form, triggerType: t.id })}
                      className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition ${
                        form.triggerType === t.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-blue-200'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 ${
                        form.triggerType === t.id
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-slate-300'
                      }`} />
                      <div>
                        <p className="text-sm font-medium text-slate-800">{t.label}</p>
                        <p className="text-xs text-slate-500">{t.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Step 2 — Keywords + Response */}
          {step === 2 && (
            <>
              {form.triggerType === 'keyword' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Keywords to watch for
                  </label>
                  <div className="space-y-2">
                    {form.keywords.map((kw, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          value={kw}
                          onChange={e => updateKeyword(i, e.target.value)}
                          placeholder={`Keyword ${i + 1} e.g. price, info, how much`}
                          style={{ color: '#0f172a' }}
                          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                        {form.keywords.length > 1 && (
                          <button
                            onClick={() => removeKeyword(i)}
                            className="p-2.5 text-red-400 hover:bg-red-50 rounded-xl transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={addKeyword}
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      <Plus className="w-4 h-4" /> Add keyword
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Auto-Response Message
                </label>
                <textarea
                  value={form.responseMessage}
                  onChange={e => setForm({ ...form, responseMessage: e.target.value })}
                  rows={4}
                  placeholder="Hi! Thanks for reaching out. We'll get back to you shortly..."
                  style={{ color: '#0f172a' }}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Tip: Use {'{name}'} to personalize with the commenter's name
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Response Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {responseTypes.map(r => (
                    <button
                      key={r.id}
                      onClick={() => setForm({ ...form, responseType: r.id })}
                      className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition ${
                        form.responseType === r.id
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 text-slate-600 hover:border-blue-200'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Step 3 — CRM Integration */}
          {step === 3 && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h4 className="font-semibold text-blue-800 mb-1">🔗 CRM Integration</h4>
                <p className="text-blue-600 text-sm">
                  Automatically update a lead's pipeline stage when this rule triggers.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  When triggered, update lead stage to:
                </label>
                <div className="space-y-2">
                  {leadStages.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setForm({ ...form, updateLeadStage: s.id })}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition ${
                        form.updateLeadStage === s.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-blue-200'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${
                        form.updateLeadStage === s.id
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-slate-300'
                      }`} />
                      <span className="text-sm font-medium text-slate-700">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <h4 className="font-semibold text-slate-700 mb-3 text-sm">Rule Summary</h4>
                <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Name</span>
                    <span className="font-medium">{form.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Platform</span>
                    <span className="font-medium">{form.platform}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Trigger</span>
                    <span className="font-medium">{form.triggerType}</span>
                  </div>
                  {form.keywords.filter(k => k).length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Keywords</span>
                      <span className="font-medium">{form.keywords.filter(k => k).join(', ')}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-400">Response</span>
                    <span className="font-medium">{form.responseType}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-100">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          <button
            onClick={() => step < 3 ? setStep(step + 1) : handleSubmit()}
            disabled={
              loading ||
              (step === 1 && !form.name) ||
              (step === 2 && !form.responseMessage.trim())
            }
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Creating...' : step < 3 ? 'Next →' : 'Create Rule'}
          </button>
        </div>
      </div>
    </div>
  );
}
