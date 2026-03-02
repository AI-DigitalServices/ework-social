'use client';

import { useState } from 'react';
import { updateStageAction } from '@/actions/crm.actions';
import { MoreHorizontal, Mail, Phone } from 'lucide-react';

const stages = [
  { id: 'LEAD', label: 'Lead', color: 'bg-slate-100 border-slate-200', dot: 'bg-slate-400' },
  { id: 'CONTACTED', label: 'Contacted', color: 'bg-blue-50 border-blue-200', dot: 'bg-blue-500' },
  { id: 'PROPOSAL', label: 'Proposal', color: 'bg-yellow-50 border-yellow-200', dot: 'bg-yellow-500' },
  { id: 'ACTIVE', label: 'Active', color: 'bg-green-50 border-green-200', dot: 'bg-green-500' },
  { id: 'DORMANT', label: 'Dormant', color: 'bg-red-50 border-red-200', dot: 'bg-red-400' },
];

interface Props {
  clients: any[];
  onClientClick: (client: any) => void;
  onStageUpdate: (clientId: string, stage: string) => void;
}

export default function PipelineBoard({ clients, onClientClick, onStageUpdate }: Props) {
  const getClientsForStage = (stageId: string) =>
    clients.filter(c => c.stage === stageId);

  const handleStageChange = async (clientId: string, newStage: string) => {
    await updateStageAction(clientId, newStage);
    onStageUpdate(clientId, newStage);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {stages.map(stage => {
        const stageClients = getClientsForStage(stage.id);
        return (
          <div key={stage.id} className="flex-shrink-0 w-64">
            <div className={`rounded-xl border ${stage.color} p-3`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${stage.dot}`} />
                  <span className="font-semibold text-slate-700 text-sm">
                    {stage.label}
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                  {stageClients.length}
                </span>
              </div>

              <div className="space-y-2 min-h-24">
                {stageClients.map(client => (
                  <div
                    key={client.id}
                    className="bg-white rounded-lg p-3 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition"
                    onClick={() => onClientClick(client)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <p className="font-semibold text-slate-800 text-sm leading-tight">
                          {client.name}
                        </p>
                      </div>
                    </div>

                    {client.email && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
                        <Mail className="w-3 h-3" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}

                    {client.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {client.tags.slice(0, 2).map((tag: string) => (
                          <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <select
                      value={client.stage}
                      onChange={e => { e.stopPropagation(); handleStageChange(client.id, e.target.value); }}
                      onClick={e => e.stopPropagation()}
                      className="mt-2 w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 text-slate-600 focus:outline-none"
                    >
                      {stages.map(s => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                ))}

                {stageClients.length === 0 && (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    No clients here
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
