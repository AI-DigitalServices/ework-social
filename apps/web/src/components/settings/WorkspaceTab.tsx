'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { Save, Users, Crown } from 'lucide-react';

const teamMembers = [
  { name: 'Test User', email: 'test@eworksocial.com', role: 'Owner', avatar: 'T' },
];

export default function WorkspaceTab() {
  const { workspace } = useAuthStore();
  const [name, setName] = useState(workspace?.name || '');
  const [saved, setSaved] = useState(false);

  return (
    <div className="max-w-2xl space-y-6">
      {/* Workspace details */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-800 mb-6">Workspace Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Workspace Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Workspace Slug
            </label>
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-slate-200 bg-slate-50">
              <span className="text-slate-400 text-sm">eworksocial.com/</span>
              <span className="text-slate-700 text-sm font-medium">{workspace?.slug}</span>
            </div>
          </div>
          <button
            onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition ${
              saved ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <Save className="w-4 h-4" />
            {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Team members */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-slate-800">Team Members</h3>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
            <Users className="w-4 h-4" />
            Invite Member
          </button>
        </div>
        <div className="space-y-3">
          {teamMembers.map((member) => (
            <div
              key={member.email}
              className="flex items-center justify-between p-4 rounded-lg border border-slate-100 hover:bg-slate-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {member.avatar}
                </div>
                <div>
                  <p className="font-medium text-slate-800 text-sm">{member.name}</p>
                  <p className="text-slate-500 text-xs">{member.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                  <Crown className="w-3 h-3" />
                  {member.role}
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-slate-400 text-xs mt-4">
          1 of 15 team members used · Upgrade to add more
        </p>
      </div>
    </div>
  );
}
