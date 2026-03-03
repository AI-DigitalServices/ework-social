'use client';

import { useState } from 'react';
import { Trash2, ToggleLeft, ToggleRight, Zap } from 'lucide-react';
import { toggleRuleAction, deleteRuleAction } from '@/actions/responder.actions';

const platformIcons: Record<string, string> = {
  FACEBOOK: '📘', INSTAGRAM: '📸', TWITTER: '🐦',
  LINKEDIN: '💼', WHATSAPP: '💬', TIKTOK: '🎵',
};

const triggerLabels: Record<string, string> = {
  keyword: 'Keyword Match',
  any_comment: 'Any Comment',
  any_dm: 'Any DM',
  first_message: 'First Message',
};

const responseLabels: Record<string, string> = {
  comment: 'Reply to Comment',
  dm: 'Send DM',
  both: 'Comment + DM',
};

interface Props {
  rule: any;
  onToggled: (rule: any) => void;
  onDeleted: (id: string) => void;
}

export default function RuleCard({ rule, onToggled, onDeleted }: Props) {
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      const updated = await toggleRuleAction(rule.id);
      onToggled(updated);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    await deleteRuleAction(rule.id);
    onDeleted(rule.id);
  };

  return (
    <div className={`bg-white rounded-xl border shadow-sm p-5 transition ${
      rule.isActive ? 'border-slate-100' : 'border-slate-100 opacity-60'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{platformIcons[rule.platform] || '📱'}</span>
          <div>
            <p className="font-semibold text-slate-800">{rule.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${rule.isActive ? 'bg-green-500' : 'bg-slate-300'}`} />
              <span className="text-xs text-slate-500">{rule.isActive ? 'Active' : 'Paused'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggle}
            disabled={loading}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition"
            title={rule.isActive ? 'Pause rule' : 'Activate rule'}
          >
            {rule.isActive
              ? <ToggleRight className="w-6 h-6 text-blue-600" />
              : <ToggleLeft className="w-6 h-6 text-slate-400" />
            }
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-400 w-20 shrink-0">Trigger</span>
          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
            {triggerLabels[rule.triggerType] || rule.triggerType}
          </span>
        </div>

        {rule.keywords?.length > 0 && (
          <div className="flex items-start gap-2 text-sm">
            <span className="text-slate-400 w-20 shrink-0">Keywords</span>
            <div className="flex flex-wrap gap-1">
              {rule.keywords.map((kw: string) => (
                <span key={kw} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-400 w-20 shrink-0">Response</span>
          <span className="text-slate-700 text-xs">{responseLabels[rule.responseType]}</span>
        </div>

        {rule.updateLeadStage && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400 w-20 shrink-0">CRM</span>
            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
              → {rule.updateLeadStage}
            </span>
          </div>
        )}
      </div>

      {/* Message preview */}
      <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
        <p className="text-xs text-slate-500 mb-1">Auto-response message:</p>
        <p className="text-sm text-slate-700 line-clamp-2">{rule.responseMessage}</p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-50">
        <Zap className="w-3.5 h-3.5 text-yellow-500" />
        <span className="text-xs text-slate-500">
          Triggered <span className="font-semibold text-slate-700">{rule.triggerCount}</span> times
        </span>
      </div>
    </div>
  );
}
