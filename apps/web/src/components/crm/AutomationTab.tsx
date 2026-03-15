'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { Plus, Trash2, Mail, ToggleLeft, ToggleRight, Zap, Edit2, X, Save } from 'lucide-react';
import api from '@/lib/api';

const STAGES = [
  { value: 'LEAD', label: 'Lead', color: 'bg-slate-100 text-slate-600' },
  { value: 'CONTACTED', label: 'Contacted', color: 'bg-blue-100 text-blue-600' },
  { value: 'PROPOSAL', label: 'Proposal', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'ACTIVE', label: 'Active', color: 'bg-green-100 text-green-600' },
  { value: 'DORMANT', label: 'Dormant', color: 'bg-red-100 text-red-600' },
];

const DEFAULT_TEMPLATES: Record<string, { subject: string; body: string }> = {
  CONTACTED: {
    subject: 'Following up — {{workspace}}',
    body: `Hi {{name}},\n\nThank you for your interest! I wanted to follow up and learn more about your goals.\n\nWould you be available for a quick 15-minute call this week?\n\nLooking forward to connecting!\n\nBest regards,\n{{workspace}}`,
  },
  PROPOSAL: {
    subject: 'Your Proposal from {{workspace}}',
    body: `Hi {{name}},\n\nThank you for the opportunity to work together! I'm excited to share our proposal with you.\n\nPlease review and let me know if you have any questions or need adjustments.\n\nBest regards,\n{{workspace}}`,
  },
  ACTIVE: {
    subject: 'Welcome aboard, {{name}}! 🎉',
    body: `Hi {{name}},\n\nWelcome to the {{workspace}} family! We're thrilled to have you on board.\n\nOur team will be in touch shortly to kick things off. In the meantime, feel free to reach out if you need anything.\n\nExcited to work with you!\n\n{{workspace}}`,
  },
  DORMANT: {
    subject: 'We miss you, {{name}} 👋',
    body: `Hi {{name}},\n\nIt's been a while since we last connected, and we wanted to check in.\n\nIf your needs have changed or you'd like to revisit working together, we'd love to reconnect.\n\nJust reply to this email and let's chat!\n\nWarm regards,\n{{workspace}}`,
  },
};

export default function AutomationTab() {
  const { workspace } = useAuthStore();
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    triggerStage: 'CONTACTED',
    subject: DEFAULT_TEMPLATES.CONTACTED.subject,
    body: DEFAULT_TEMPLATES.CONTACTED.body,
    replyTo: '',
  });

  useEffect(() => {
    if (workspace?.id) loadRules();
  }, [workspace?.id]);

  const loadRules = async () => {
    try {
      const res = await api.get(`/crm/automations/${workspace!.id}`);
      setRules(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleStageChange = (stage: string) => {
    setForm(prev => ({
      ...prev,
      triggerStage: stage,
      subject: DEFAULT_TEMPLATES[stage]?.subject || prev.subject,
      body: DEFAULT_TEMPLATES[stage]?.body || prev.body,
    }));
  };

  const handleSave = async () => {
    if (!form.name || !form.subject || !form.body) return;
    setSaving(true);
    try {
      if (editingRule) {
        const res = await api.patch(`/crm/automations/${editingRule.id}`, form);
        setRules(prev => prev.map(r => r.id === editingRule.id ? res.data : r));
      } else {
        const res = await api.post('/crm/automations', { ...form, workspaceId: workspace!.id });
        setRules(prev => [res.data, ...prev]);
      }
      setShowCreate(false);
      setEditingRule(null);
      setForm({ name: '', triggerStage: 'CONTACTED', subject: DEFAULT_TEMPLATES.CONTACTED.subject, body: DEFAULT_TEMPLATES.CONTACTED.body, replyTo: '' });
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleToggle = async (rule: any) => {
    try {
      const res = await api.patch(`/crm/automations/${rule.id}`, { isActive: !rule.isActive });
      setRules(prev => prev.map(r => r.id === rule.id ? res.data : r));
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/crm/automations/${id}`);
      setRules(prev => prev.filter(r => r.id !== id));
    } catch (err) { console.error(err); }
  };

  const handleEdit = (rule: any) => {
    setEditingRule(rule);
    setForm({ name: rule.name, triggerStage: rule.triggerStage, subject: rule.subject, body: rule.body, replyTo: rule.replyTo || '' });
    setShowCreate(true);
  };

  const stageConfig = (stage: string) => STAGES.find(s => s.value === stage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Pipeline Email Automation</h3>
          <p className="text-slate-500 text-sm mt-0.5">Auto-send emails when a lead moves to a new stage</p>
        </div>
        <button onClick={() => { setShowCreate(true); setEditingRule(null); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition">
          <Plus className="w-4 h-4" /> New Automation
        </button>
      </div>

      {/* Template variables info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-blue-800 mb-1">📝 Available template variables:</p>
        <div className="flex flex-wrap gap-2 mt-2">
          {['{{name}}', '{{workspace}}', '{{stage}}'].map(v => (
            <code key={v} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-mono">{v}</code>
          ))}
        </div>
        <p className="text-xs text-blue-600 mt-2">These will be replaced with real contact/workspace data when the email is sent.</p>
      </div>

      {/* Create/Edit Form */}
      {showCreate && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-800">{editingRule ? 'Edit Automation' : 'New Automation'}</h4>
            <button onClick={() => { setShowCreate(false); setEditingRule(null); }} className="p-1.5 hover:bg-slate-100 rounded-lg">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          {/* Rule name */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Automation Name</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Send proposal follow-up"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Trigger stage */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Trigger — When lead moves to</label>
            <div className="flex flex-wrap gap-2">
              {STAGES.map(stage => (
                <button key={stage.value} onClick={() => handleStageChange(stage.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border-2 ${
                    form.triggerStage === stage.value ? 'border-blue-500 ' + stage.color : 'border-transparent ' + stage.color + ' opacity-60'
                  }`}>
                  {stage.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reply-to */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Reply-To Email <span className="text-slate-400 font-normal">(optional — your agency email)</span></label>
            <input value={form.replyTo} onChange={e => setForm(p => ({ ...p, replyTo: e.target.value }))}
              placeholder="hello@youragency.com"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Subject */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Email Subject</label>
            <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Body */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Email Body</label>
            <textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} rows={8}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono" />
          </div>

          <button onClick={handleSave} disabled={saving || !form.name || !form.subject || !form.body}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50">
            <Save className="w-4 h-4" />{saving ? 'Saving...' : editingRule ? 'Update Automation' : 'Create Automation'}
          </button>
        </div>
      )}

      {/* Rules list */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : rules.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-blue-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">No automations yet</h3>
          <p className="text-slate-500 text-sm mb-6">Create your first automation to start sending emails automatically when leads change stages.</p>
          <button onClick={() => setShowCreate(true)} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition">
            Create First Automation
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => {
            const stage = stageConfig(rule.triggerStage);
            return (
              <div key={rule.id} className={`bg-white border rounded-xl p-5 transition ${rule.isActive ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-800">{rule.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stage?.color}`}>
                          → {stage?.label}
                        </span>
                        {!rule.isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Paused</span>}
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5 truncate">{rule.subject}</p>
                      {rule.replyTo && <p className="text-xs text-slate-400 mt-0.5">Reply-to: {rule.replyTo}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                    <button onClick={() => handleToggle(rule)} className="p-1.5 hover:bg-slate-100 rounded-lg transition" title={rule.isActive ? 'Pause' : 'Activate'}>
                      {rule.isActive ? <ToggleRight className="w-5 h-5 text-blue-600" /> : <ToggleLeft className="w-5 h-5 text-slate-400" />}
                    </button>
                    <button onClick={() => handleEdit(rule)} className="p-1.5 hover:bg-slate-100 rounded-lg transition">
                      <Edit2 className="w-4 h-4 text-slate-400" />
                    </button>
                    <button onClick={() => handleDelete(rule.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition">
                      <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
