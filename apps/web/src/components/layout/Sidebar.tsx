'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import {
  LayoutDashboard, CalendarDays, Users, BarChart3,
  MessageSquareReply, Settings, LogOut, Zap, X, Menu,
} from 'lucide-react';
import { useState, useEffect } from 'react';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Scheduler', href: '/dashboard/scheduler', icon: CalendarDays },
  { label: 'CRM', href: '/dashboard/crm', icon: Users },
  { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { label: 'Auto-Responder', href: '/dashboard/responder', icon: MessageSquareReply },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export default function Sidebar({ onToggle }: { onToggle?: (open: boolean) => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, workspace, logout } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => { logout(); router.push('/login'); };

  const toggle = (val: boolean) => {
    setIsOpen(val);
    onToggle?.(val);
  };

  // Close on route change on mobile
  useEffect(() => { setIsOpen(false); }, [pathname]);

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => toggle(!isOpen)}
        className="fixed top-4 left-4 z-[60] p-2 bg-slate-900 rounded-lg text-white lg:hidden"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Overlay on mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[45] lg:hidden"
          onClick={() => toggle(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed left-0 top-0 h-screen w-64 bg-slate-900 flex flex-col z-50
        transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        {/* Logo */}
        <div className="px-6 py-6 border-b border-slate-700">
          <Link href="/" className="flex items-center gap-2 no-underline">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-lg">eWork Social</span>
          </Link>
          <div className="mt-3 px-3 py-2.5 bg-slate-800 rounded-lg">
            <p className="text-slate-400 text-xs mb-0.5">Workspace</p>
            <p className="text-white text-sm font-medium truncate">{workspace?.name}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="px-4 py-4 border-t border-slate-700">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800 mb-2">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.name}</p>
              <p className="text-slate-400 text-xs truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all w-full text-sm font-medium"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
