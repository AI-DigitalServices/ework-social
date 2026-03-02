'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

export default function DashboardPage() {
  const router = useRouter();
  const { user, workspace, isAuthenticated, logout } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) router.push('/login');
  }, [isAuthenticated, router]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-blue-600">eWork Social</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-600 font-medium">{workspace?.name}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-slate-600 text-sm">👋 {user.name}</span>
          <button
            onClick={() => { logout(); router.push('/login'); }}
            className="text-sm text-red-500 hover:text-red-700 font-medium"
          >
            Logout
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          Welcome back, {user.name}! 👋
        </h1>
        <p className="text-slate-500 mb-10">
          Here's what's happening with {workspace?.name} today.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          {[
            { label: 'Scheduled Posts', value: '0', color: 'bg-blue-500' },
            { label: 'Active Clients', value: '0', color: 'bg-green-500' },
            { label: 'Open Leads', value: '0', color: 'bg-yellow-500' },
            { label: 'Social Accounts', value: '0', color: 'bg-purple-500' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <div className={`w-10 h-10 ${stat.color} rounded-lg mb-4`} />
              <p className="text-3xl font-bold text-slate-800">{stat.value}</p>
              <p className="text-slate-500 text-sm mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-100 text-center">
          <p className="text-4xl mb-4">🚀</p>
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            Your workspace is ready!
          </h2>
          <p className="text-slate-500 max-w-md mx-auto">
            Connect your first social media account to start scheduling posts and managing your clients.
          </p>
          <button className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition">
            Connect Social Account
          </button>
        </div>
      </main>
    </div>
  );
}
