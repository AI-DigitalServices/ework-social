'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { Save, Users, Crown, Plus, X, Trash2, Shield, Eye, Edit } from 'lucide-react';
import api from '@/lib/api';

const ROLES = [
  { value: 'ADMIN', label: 'Admin', icon: Shield, desc: 'Can manage everything except billing' },
  { value: 'EDITOR', label: 'Editor', icon: Edit, desc: 'Can create and edit posts and clients' },
  { value: 'VIEWER', label: 'Viewer', icon: Eye, desc: 'Can only view content' },
];

export default function WorkspaceTab() {
  const { user, workspace, token } = useAuthStore();
  const [name, setName] = useState(workspace?.name || '');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('EDITOR');
  const [inviting, setInviting] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (workspace?.id) loadMembers();
  }, [workspace?.id]);

  const loadMembers = async () => {
    try {
      const res = await api.get(`/workspace/${workspace!.id}/members`);
      setMembers(res.data);
    } catch (err) { console.error(err); }
    finally { setLoadingMembers(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/workspace/${workspace!.id}`, { name });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      showToast('success', 'Workspace name updated!');
    } catch (err) {
      showToast('error', 'Failed to save. Try again.');
    } finally { setSaving(false); }
  };

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    try {
      await api.post('/workspace/invite', {
        workspaceId: workspace!.id,
        email: inviteEmail,
        role: inviteRole,
      });
      setInviteSent(true);
      setInviteEmail('');
      showToast('success', `Invite sent to ${inviteEmail}!`);
      setTimeout(() => { setInviteSent(false); setShowInvite(false); }, 2000);
    } catch (err: any) {
      showToast('error', err?.response?.data?.message || 'Failed to send invite');
    } finally { setInviting(false); }
  };

  const handleRemove = async (userId: string, memberName: string) => {
    setRemoving(userId);
    try {
      await api.delete(`/workspace/${workspace!.id}/members/${userId}`);
      setMembers(prev => prev.filter(m => m.id !== userId));
      showToast('success', `${memberName} removed from workspace`);
    } catch (err: any) {
      showToast('error', err?.response?.data?.message || 'Failed to remove member');
    } finally { setRemoving(null); }
  };

  const getRoleConfig = (role: string) => ROLES.find(r => r.value === role) || ROLES[1];

  return (
    <div className="max-w-2xl space-y-6 relative">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-sm font-medium ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Workspace details */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-800 mb-6">Workspace Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Workspace Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Workspace Slug</label>
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-slate-200 bg-slate-50">
              <span className="text-slate-400 text-sm">eworksocial.com/</span>
              <span className="text-slate-700 text-sm font-medium">{workspace?.slug}</span>
            </div>
          </div>
          <button onClick={handleSave} disabled={saving}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition ${
              saved ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
            } disabled:opacity-50`}>
            <Save className="w-4 h-4" />
            {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Team members */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-slate-800">Team Members</h3>
          <button onClick={() => setShowInvite(!showInvite)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
            <Plus className="w-4 h-4" /> Invite Member
          </button>
        </div>

        {/* Invite form */}
        {showInvite && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-blue-800">Invite a team member</p>
              <button onClick={() => setShowInvite(false)} className="text-blue-400 hover:text-blue-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
              placeholder="colleague@agency.com"
              className="w-full px-4 py-2.5 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map(role => {
                const Icon = role.icon;
                return (
                  <button key={role.value} onClick={() => setInviteRole(role.value)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 text-xs font-medium transition ${
                      inviteRole === role.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-blue-300'
                    }`}>
                    <Icon className="w-4 h-4" />
                    {role.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-blue-600">{getRoleConfig(inviteRole).desc}</p>
            <button onClick={handleInvite} disabled={inviting || !inviteEmail || inviteSent}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50">
              {inviteSent ? '✅ Invite Sent!' : inviting ? 'Sending...' : 'Send Invite →'}
            </button>
          </div>
        )}

        {/* Members list */}
        <div className="space-y-3">
          {loadingMembers ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            members.map((member) => {
              const roleConfig = getRoleConfig(member.role);
              const RoleIcon = roleConfig.icon;
              return (
                <div key={member.id} className="flex items-center justify-between p-4 rounded-lg border border-slate-100 hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {member.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{member.name}</p>
                      <p className="text-slate-500 text-xs">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                      member.isOwner ? 'bg-yellow-100 text-yellow-700' :
                      member.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                      member.role === 'EDITOR' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {member.isOwner ? <Crown className="w-3 h-3" /> : <RoleIcon className="w-3 h-3" />}
                      {member.isOwner ? 'Owner' : roleConfig.label}
                    </span>
                    {!member.isOwner && member.id !== user?.id && (
                      <button onClick={() => handleRemove(member.id, member.name)}
                        disabled={removing === member.id}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        <p className="text-slate-400 text-xs mt-4">{members.length} of 15 team members used</p>
      </div>
    </div>
  );
}
