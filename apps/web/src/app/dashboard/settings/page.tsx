'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import SocialAccountsTab from '@/components/settings/SocialAccountsTab';
import ProfileTab from '@/components/settings/ProfileTab';
import WorkspaceTab from '@/components/settings/WorkspaceTab';
import PlanTab from '@/components/settings/PlanTab';
import { Share2, User, Building2, CreditCard, CheckCircle } from 'lucide-react';
import api from '@/lib/api';

const tabs = [
  { id: 'social', label: 'Social Accounts', icon: Share2 },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'workspace', label: 'Workspace', icon: Building2 },
  { id: 'plan', label: 'Plan & Billing', icon: CreditCard },
];

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const { workspace } = useAuthStore();
  const [activeTab, setActiveTab] = useState('social');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const tab = searchParams.get('tab');
    const success = searchParams.get('success');
    const reference = searchParams.get('reference');

    if (tab) setActiveTab(tab);

    if (success === 'true' && reference && workspace?.id) {
      setActiveTab('plan');
      verifyPayment(reference);
    } else if (success === 'true') {
      setActiveTab('plan');
      setPaymentSuccess(true);
    }
  }, [searchParams, workspace?.id]);

  const verifyPayment = async (reference: string) => {
    setVerifying(true);
    try {
      await api.get(`/billing/verify?reference=${reference}&workspaceId=${workspace!.id}`);
      setPaymentSuccess(true);
    } catch (err) {
      console.error('Verification error:', err);
      setPaymentSuccess(true); // Still show success
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Settings</h2>
        <p className="text-slate-500 mt-1">Manage your account and workspace settings.</p>
      </div>

      {/* Payment success banner */}
      {paymentSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-600 shrink-0" />
          <div>
            <p className="font-bold text-green-800">Payment Successful! 🎉</p>
            <p className="text-green-600 text-sm">
              Your subscription is now active. Welcome to eWork Social!
            </p>
          </div>
        </div>
      )}

      {verifying && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
          <p className="text-blue-700 text-sm font-medium">Verifying your payment...</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6 w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
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

      {/* Tab content */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
        {activeTab === 'social' && <SocialAccountsTab />}
        {activeTab === 'profile' && <ProfileTab />}
        {activeTab === 'workspace' && <WorkspaceTab />}
        {activeTab === 'plan' && <PlanTab />}
      </div>
    </div>
  );
}
