'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { getClientsAction, exportContactsAction } from '@/actions/crm.actions';
import PipelineBoard from '@/components/crm/PipelineBoard';
import AddClientModal from '@/components/crm/AddClientModal';
import { Plus, Users, TrendingUp, UserCheck, LayoutGrid, List, Zap, Download } from 'lucide-react';
import AutomationTab from '@/components/crm/AutomationTab';
import { usePlan } from '@/hooks/usePlan';
import { useCurrencyStore, CURRENCY_SYMBOLS } from '@/store/currency.store';

export default function CrmPage() {
  const { workspace } = useAuthStore();
  const router = useRouter();
  const { plan, hasFeature } = usePlan();
  const { currency } = useCurrencyStore();
  const currencySymbol = CURRENCY_SYMBOLS[currency];
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [view, setView] = useState<'pipeline' | 'list' | 'automation'>('pipeline');

  // Initial load
  useEffect(() => {
    if (!workspace?.id) return;
    getClientsAction(workspace.id)
      .then(data => setClients(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [workspace?.id]);

  // Live polling — auto-refresh every 12 seconds so new contacts from
  // auto-responder triggers appear without manual page refresh
  useEffect(() => {
    if (!workspace?.id) return;
    const workspaceId = workspace.id;
    const interval = setInterval(async () => {
      try {
        const data = await getClientsAction(workspaceId);
        setClients(data);
      } catch { /* silent */ }
    }, 12_000);
    return () => clearInterval(interval);
  }, [workspace?.id]);

  const loadClients = async () => {
    try {
      const data = await getClientsAction(workspace!.id);
      setClients(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClientAdded = (client: any) => {
    setClients(prev => [client, ...prev]);
    // Navigate straight to the new client's detail page
    router.push(`/dashboard/crm/${client.id}`);
  };

  const handleStageUpdate = (clientId: string, stage: string) => {
    setClients(prev =>
      prev.map(c => c.id === clientId ? { ...c, stage } : c)
    );
  };

  const handleClientClick = (client: any) => {
    router.push(`/dashboard/crm/${client.id}`);
  };

  const activeClients = clients.filter(c => c.stage === 'ACTIVE').length;
  const openLeads = clients.filter(c => ['LEAD', 'CONTACTED', 'PROPOSAL'].includes(c.stage)).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">CRM & Clients</h2>
          <p className="text-slate-500 mt-1">Manage your pipeline, contacts, and lead automations.</p>
        </div>
        <div className="flex items-center gap-2">
          {hasFeature('GROWTH') && (
            <button
              onClick={() => exportContactsAction(workspace!.id)}
              className="flex items-center gap-2 px-3 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition"
              title="Export contacts as CSV"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            Add Contact
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Contacts', value: clients.length, icon: Users, color: 'text-blue-600 bg-blue-50' },
          { label: 'Active Clients', value: activeClients, icon: UserCheck, color: 'text-green-600 bg-green-50' },
          { label: 'Open Leads', value: openLeads, icon: TrendingUp, color: 'text-yellow-600 bg-yellow-50' },
          {
            label: 'Pipeline Value',
            value: hasFeature('GROWTH')
              ? `${currencySymbol}${clients.reduce((s, c) => s + (c.dealValue ?? 0), 0).toLocaleString()}`
              : '—',
            icon: TrendingUp,
            color: 'text-emerald-600 bg-emerald-50',
          },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${stat.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-800">{stat.value}</p>
                <p className="text-slate-500 text-xs">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-2 mb-5 bg-white border border-slate-200 rounded-xl p-1 w-fit">
        {([
          { key: 'pipeline',   icon: <LayoutGrid className="w-4 h-4" />, label: 'Pipeline'    },
          { key: 'list',       icon: <List       className="w-4 h-4" />, label: 'All Clients' },
          { key: 'automation', icon: <Zap        className="w-4 h-4" />, label: 'Automations' },
        ] as const).map(({ key, icon, label }) => (
          <button key={key} onClick={() => setView(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              view === key ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
            }`}>
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {view === 'automation' ? (
        <AutomationTab />
      ) : loading ? (
        <div className="text-center py-16 text-slate-400">Loading clients...</div>
      ) : clients.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800 mb-2">No contacts yet</h3>
          <p className="text-slate-500 mb-6">Add your first contact to start tracking your pipeline.</p>
          <button onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition">
            Add Your First Contact
          </button>
        </div>
      ) : view === 'pipeline' ? (
        <PipelineBoard
          clients={clients}
          onClientClick={handleClientClick}
          onStageUpdate={handleStageUpdate}
        />
      ) : (
        /* All Clients list view */
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Contact', 'Company', 'Email', 'Deal Value', 'Tags', 'Stage', 'Source'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {clients.map(client => (
                <tr key={client.id}
                  className="hover:bg-blue-50/40 cursor-pointer transition group"
                  onClick={() => handleClientClick(client)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {(client.socialProfiles as any)?.instagram?.profilePictureUrl ? (
                        <img src={(client.socialProfiles as any).instagram.profilePictureUrl}
                          alt={client.name} className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                      ) : (
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-semibold text-slate-800 group-hover:text-blue-600 transition">{client.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{client.company || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{client.email || '—'}</td>
                  <td className="px-4 py-3 text-emerald-600 font-medium">
                    {client.dealValue != null ? `${currencySymbol}${Number(client.dealValue).toLocaleString()}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {client.tags?.filter((t: string) => !t.startsWith('ig:')).slice(0, 2).map((tag: string) => (
                        <span key={tag} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">{tag}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      client.stage === 'ACTIVE'    ? 'bg-green-100 text-green-600' :
                      client.stage === 'LEAD'      ? 'bg-slate-100 text-slate-600' :
                      client.stage === 'CONTACTED' ? 'bg-blue-100 text-blue-600'  :
                      client.stage === 'PROPOSAL'  ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-600'
                    }`}>{client.stage}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {client.source?.replace(/_/g, ' ') ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add contact modal */}
      {showAddModal && (
        <AddClientModal
          onClose={() => setShowAddModal(false)}
          onAdded={handleClientAdded}
        />
      )}
    </div>
  );
}
