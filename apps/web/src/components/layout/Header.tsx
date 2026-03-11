'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Bell, Settings, LogOut, User } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

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
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const title = pageTitles[pathname] || 'Dashboard';
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAvatar, setShowAvatar] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setShowAvatar(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => { logout(); router.push('/login'); };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 fixed top-0 left-0 lg:left-64 right-0 z-40">
      <div className="pl-12 lg:pl-0">
        <h1 className="text-lg md:text-xl font-bold text-slate-800">{title}</h1>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {/* Notification Bell */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => { setShowNotifications(!showNotifications); setShowAvatar(false); }}
            className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <span className="font-semibold text-slate-800 text-sm">Notifications</span>
                <span className="text-xs text-blue-600 cursor-pointer hover:underline">Mark all read</span>
              </div>
              <div className="divide-y divide-slate-100">
                <div className="px-4 py-3 hover:bg-slate-50 cursor-pointer">
                  <p className="text-sm text-slate-700 font-medium">Welcome to eWork Social! 🎉</p>
                  <p className="text-xs text-slate-400 mt-1">Complete your setup to get started</p>
                </div>
                <div className="px-4 py-3 hover:bg-slate-50 cursor-pointer">
                  <p className="text-sm text-slate-700 font-medium">Connect your social accounts</p>
                  <p className="text-xs text-slate-400 mt-1">Link Facebook & Instagram to start scheduling</p>
                </div>
                <div className="px-4 py-3 hover:bg-slate-50 cursor-pointer">
                  <p className="text-sm text-slate-700 font-medium">Your 7-day trial is active</p>
                  <p className="text-xs text-slate-400 mt-1">Explore all Pro features free</p>
                </div>
              </div>
              <div className="px-4 py-3 border-t border-slate-100 text-center">
                <span className="text-xs text-slate-400">No more notifications</span>
              </div>
            </div>
          )}
        </div>

        {/* Avatar dropdown */}
        <div ref={avatarRef} className="relative">
          <button
            onClick={() => { setShowAvatar(!showAvatar); setShowNotifications(false); }}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 transition"
          >
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <span className="hidden md:block text-sm font-medium text-slate-700">{user?.name?.split(' ')[0]}</span>
          </button>
          {showAvatar && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-800">{user?.name}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>
              <div className="py-1">
                <Link
                  href="/dashboard/settings"
                  onClick={() => setShowAvatar(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  Settings
                </Link>
                <Link
                  href="/dashboard/settings?tab=profile"
                  onClick={() => setShowAvatar(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  My Profile
                </Link>
                <div className="border-t border-slate-100 mt-1 pt-1">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition w-full text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
