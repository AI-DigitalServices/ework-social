'use client';

import { useAuthStore } from '@/store/auth.store';
import {
  CalendarDays,
  Users,
  TrendingUp,
  Share2,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

const stats = [
  { label: 'Scheduled Posts', value: '0', icon: CalendarDays, color: 'bg-blue-500', href: '/dashboard/scheduler' },
  { label: 'Active Clients', value: '0', icon: Users, color: 'bg-green-500', href: '/dashboard/crm' },
  { label: 'Open Leads', value: '0', icon: TrendingUp, color: 'bg-yellow-500', href: '/dashboard/crm' },
  { label: 'Social Accounts', value: '0', icon: Share2, color: 'bg-purple-500', href: '/dashboard/settings' },
];

const quickActions = [
  { label: 'Schedule a Post', href: '/dashboard/scheduler', color: 'bg-blue-600' },
  { label: 'Add a Client', href: '/dashboard/crm', color: 'bg-green-600' },
  { label: 'View Analytics', href: '/dashboard/analytics', color: 'bg-purple-600' },
];

export default function DashboardPage() {
  const { user, workspace } = useAuthStore();

  return (
    <div>
      {/* Welcome */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800">
          Welcome back, {user?.name}! 👋
        </h2>
        <p className="text-slate-500 mt-1">
          Here's what's happening with {workspace?.name} today.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition group"
            >
              <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center mb-4`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-3xl font-bold text-slate-800">{stat.value}</p>
              <p className="text-slate-500 text-sm mt-1">{stat.label}</p>
            </Link>
          );
        })}
      </div>

      {/* Quick actions + Getting started */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="flex items-center justify-between p-4 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition group"
              >
                <span className="font-medium text-slate-700 group-hover:text-blue-700">
                  {action.label}
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-white">
          <h3 className="font-bold text-lg mb-2">🚀 Get Started</h3>
          <p className="text-blue-100 text-sm mb-6">
            Connect your first social account to unlock scheduling and analytics.
          </p>
          <div className="space-y-3 text-sm">
            {[
              'Connect social account',
              'Schedule your first post',
              'Add your first client',
            ].map((step, i) => (
              <div key={step} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </div>
                <span className="text-blue-100">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
