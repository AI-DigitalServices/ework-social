'use client';

import { useState } from 'react';
import SocialAccountsTab from '@/components/settings/SocialAccountsTab';
import ProfileTab from '@/components/settings/ProfileTab';
import WorkspaceTab from '@/components/settings/WorkspaceTab';
import PlanTab from '@/components/settings/PlanTab';
import { Share2, User, Building2, CreditCard } from 'lucide-react';

const tabs = [
  { id: 'social', label: 'Social Accounts', icon: Share2 },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'workspace', label: 'Workspace', icon: Building2 },
  { id: 'plan', label: 'Plan & Billing', icon: CreditCard },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('social');

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Settings</h2>
        <p className="text-slate-500 mt-1">Manage your account and workspace settings.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-8">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'social' && <SocialAccountsTab />}
      {activeTab === 'profile' && <ProfileTab />}
      {activeTab === 'workspace' && <WorkspaceTab />}
      {activeTab === 'plan' && <PlanTab />}
    </div>
  );
}
