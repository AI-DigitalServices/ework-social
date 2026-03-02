'use client';

import { usePathname } from 'next/navigation';
import { Bell } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/scheduler': 'Post Scheduler',
  '/dashboard/crm': 'CRM & Pipeline',
  '/dashboard/analytics': 'Analytics',
  '/dashboard/responder': 'Auto-Responder',
  '/dashboard/settings': 'Settings',
};

export default function Header() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const title = pageTitles[pathname] || 'Dashboard';

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 fixed top-0 left-64 right-0 z-40">
      <div>
        <h1 className="text-xl font-bold text-slate-800">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}
