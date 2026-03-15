'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { getClientsAction } from '@/actions/crm.actions';
import PipelineBoard from '@/components/crm/PipelineBoard';
import AddClientModal from '@/components/crm/AddClientModal';
import ClientDetail from '@/components/crm/ClientDetail';
import { Plus, Users, TrendingUp, UserCheck, LayoutGrid, List, Zap } from 'lucide-react';
import AutomationTab from '@/components/crm/AutomationTab';

export default function CrmPage() {
  const { workspace } = useAuthStore();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [view, setView] = useState<'pipeline' | 'list' | 'automation'>('pipeline');

  useEffect(() => {
    if (workspace?.id) loadClients();
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
  };

  const handleStageUpdate = (clientId: string, stage: string) => {
    setClients(prev =>
      prev.map(c => c.id === clientId ? { ...c, stage } : c)
    );
  };

  const handleClientUpdate = (updated: any) => {
    setClients(prev =>
      prev.map(c => c.id === updated.id ? updated : c)
    );
  };

  const activeClients = clients.filter(c => c.stage === 'ACTIVE').length;
  const openLeads = clients.filter(c => ['LEAD', 'CONTACTED', 'PROPOSAL'].includes(c.stage)).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">CRM & Pipeline</h2>
          <p className="text-slate-500 mt-1">Manage your clients and track leads.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" />
          Add Client
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Clients', value: clients.length, icon: Users, color: 'text-blue-600 bg-blue-50' },
          { label: 'Active Clients', value: activeClients, icon: UserCheck, color: 'text-green-600 bg-green-50' },
          { label: 'Open Leads', value: openLeads, icon: TrendingUp, color: 'text-yellow-600 bg-yellow-50' },
        ].map(stat => {
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

      {/* View toggle */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setView('pipeline')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
            view === 'pipeline' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          Pipeline
        </button>
        <button
          onClick={() => setView('list')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
            view === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <List className="w-4 h-4" />
          List
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading clients...</div>
      ) : clients.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-16 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800 mb-2">No clients yet</h3>
          <p className="text-slate-500 mb-6">Add your first client to start tracking your pipeline.</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition"
          >
            Add Your First Client
          </button>
        </div>
      ) : view === 'automation' ? (
        <AutomationTab />
      ) : view === 'pipeline' ? (
        <PipelineBoard
          clients={clients}
          onClientClick={setSelectedClient}
          onStageUpdate={handleStageUpdate}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Client', 'Email', 'Phone', 'Tags', 'Stage'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {clients.map(client => (
                <tr
                  key={client.id}
                  className="hover:bg-slate-50 cursor-pointer transition"
                  onClick={() => setSelectedClient(client)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-800 text-sm">{client.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-sm">{client.email || '—'}</td>
                  <td className="px-4 py-3 text-slate-500 text-sm">{client.phone || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {client.tags?.slice(0, 2).map((tag: string) => (
                        <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      client.stage === 'ACTIVE' ? 'bg-green-100 text-green-600' :
                      client.stage === 'LEAD' ? 'bg-slate-100 text-slate-600' :
                      client.stage === 'CONTACTED' ? 'bg-blue-100 text-blue-600' :
                      client.stage === 'PROPOSAL' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {client.stage}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddClientModal
          onClose={() => setShowAddModal(false)}
          onAdded={handleClientAdded}
        />
      )}

      {selectedClient && (
        <ClientDetail
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
          onUpdate={handleClientUpdate}
        />
      )}
    </div>
  );
}
