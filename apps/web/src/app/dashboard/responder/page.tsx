'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { getRulesAction, getResponderStatsAction } from '@/actions/responder.actions';
import AddRuleModal from '@/components/responder/AddRuleModal';
import RuleCard from '@/components/responder/RuleCard';
import { Plus, Zap, ToggleRight, Activity, Share2 } from 'lucide-react';

export default function ResponderPage() {
  const { workspace } = useAuthStore();
  const [rules, setRules] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (workspace?.id) loadData();
  }, [workspace?.id]);

  const loadData = async () => {
    try {
      const [rulesData, statsData] = await Promise.all([
        getRulesAction(workspace!.id),
        getResponderStatsAction(workspace!.id),
      ]);
      setRules(rulesData);
      setStats(statsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRuleCreated = (rule: any) => {
    setRules(prev => [rule, ...prev]);
    setStats((prev: any) => prev ? {
      ...prev,
      totalRules: prev.totalRules + 1,
      activeRules: prev.activeRules + 1,
    } : prev);
  };

  const handleRuleToggled = (updated: any) => {
    setRules(prev => prev.map(r => r.id === updated.id ? updated : r));
  };

  const handleRuleDeleted = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
  };

  const statCards = [
    { label: 'Total Rules', value: stats?.totalRules ?? 0, icon: Zap, color: 'text-blue-600 bg-blue-100' },
    { label: 'Active Rules', value: stats?.activeRules ?? 0, icon: ToggleRight, color: 'text-green-600 bg-green-100' },
    { label: 'Total Triggers', value: stats?.totalTriggers ?? 0, icon: Activity, color: 'text-yellow-600 bg-yellow-100' },
    { label: 'Platforms', value: stats?.platforms ?? 0, icon: Share2, color: 'text-purple-600 bg-purple-100' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Auto-Responder</h2>
          <p className="text-slate-500 mt-1">
            Automate replies to comments and DMs across all platforms.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" />
          Create Rule
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {statCards.map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                <p className="text-slate-500 text-xs">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* How it works banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-5 mb-6 text-white">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold mb-1">How Auto-Responder Works</h3>
            <p className="text-blue-100 text-sm leading-relaxed">
              Create rules that watch for keywords or triggers on your connected social accounts.
              When triggered, eWork Social automatically sends your pre-written response —
              saving you hours of manual community management every day.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/20">
          {[
            { step: '1', label: 'Set trigger', desc: 'Keyword or event' },
            { step: '2', label: 'Write response', desc: 'Personalized message' },
            { step: '3', label: 'Goes live', desc: 'Replies automatically' },
          ].map(item => (
            <div key={item.step} className="flex items-center gap-3">
              <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                {item.step}
              </div>
              <div>
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="text-blue-200 text-xs">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rules */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading rules...</div>
      ) : rules.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-16 text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">No rules yet</h3>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto">
            Create your first auto-responder rule to start automating replies
            and saving time on community management.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition"
          >
            Create Your First Rule
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rules.map(rule => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onToggled={handleRuleToggled}
              onDeleted={handleRuleDeleted}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <AddRuleModal
          onClose={() => setShowModal(false)}
          onCreated={handleRuleCreated}
        />
      )}
    </div>
  );
}
