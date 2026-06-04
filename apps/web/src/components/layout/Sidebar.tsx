'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import {
  LayoutDashboard, CalendarDays, Users, BarChart3,
  MessageSquareReply, Settings, LogOut, X, Menu,
  ChevronDown, Plus, Check, Building2,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';

const navItems = [
  { label: 'Dashboard',     href: '/dashboard',           icon: LayoutDashboard },
  { label: 'Scheduler',     href: '/dashboard/scheduler', icon: CalendarDays },
  { label: 'CRM & Clients', href: '/dashboard/crm',       icon: Users },
  { label: 'Analytics',     href: '/dashboard/analytics', icon: BarChart3 },
  { label: 'Auto-Responder',href: '/dashboard/responder', icon: MessageSquareReply },
  { label: 'Settings',      href: '/dashboard/settings',  icon: Settings },
];

export default function Sidebar({ onToggle }: { onToggle?: (open: boolean) => void }) {
  const pathname  = usePathname();
  const router    = useRouter();
  const { user, workspace, workspaces, setWorkspace, setWorkspaces, addWorkspace, logout } = useAuthStore();

  const [isOpen,        setIsOpen]        = useState(false);
  const [wsOpen,        setWsOpen]        = useState(false);
  const [showCreate,    setShowCreate]    = useState(false);
  const [newWsName,     setNewWsName]     = useState('');
  const [creating,      setCreating]      = useState(false);
  const [createError,   setCreateError]   = useState('');
  const wsRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => { logout(); router.push('/login'); };

  const toggle = (val: boolean) => { setIsOpen(val); onToggle?.(val); };

  // Close sidebar on route change (mobile)
  useEffect(() => { setIsOpen(false); }, [pathname]);

  // Close workspace dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wsRef.current && !wsRef.current.contains(e.target as Node)) {
        setWsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Load all workspaces on mount
  useEffect(() => {
    if (workspaces.length === 0) {
      api.get('/workspace/my').then(res => setWorkspaces(res.data)).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchWorkspace = (ws: typeof workspace) => {
    if (!ws || ws.id === workspace?.id) { setWsOpen(false); return; }
    setWorkspace(ws);
    setWsOpen(false);
    router.push('/dashboard');
  };

  const handleCreate = async () => {
    if (!newWsName.trim()) return;
    setCreating(true);
    setCreateError('');
    try {
      const res = await api.post('/workspace/create', { name: newWsName.trim() });
      addWorkspace(res.data);
      setWorkspace(res.data);
      setNewWsName('');
      setShowCreate(false);
      setWsOpen(false);
      router.push('/dashboard');
    } catch (err: any) {
      setCreateError(err?.response?.data?.message || 'Failed to create workspace');
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => toggle(!isOpen)}
        className="fixed top-4 left-4 z-[60] p-2 bg-slate-900 rounded-lg text-white lg:hidden"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-[45] lg:hidden" onClick={() => toggle(false)} />
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
          <Link href="/" className="flex items-center gap-2 no-underline mb-3">
            <img src="/icon.png" alt="eWork Social" className="w-8 h-8 rounded-lg object-cover" />
            <span className="text-white font-bold text-lg">eWork Social</span>
          </Link>

          {/* Workspace switcher */}
          <div ref={wsRef} className="relative">
            <button
              onClick={() => setWsOpen(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Building2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <div className="min-w-0 text-left">
                  <p className="text-slate-400 text-[10px] leading-none mb-0.5">Workspace</p>
                  <p className="text-white text-sm font-medium truncate">{workspace?.name}</p>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-500 flex-shrink-0 transition-transform ${wsOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {wsOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">

                {/* Workspace list */}
                <div className="py-1 max-h-48 overflow-y-auto">
                  {workspaces.length === 0 && workspace && (
                    <button
                      onClick={() => switchWorkspace(workspace)}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-700 transition-colors"
                    >
                      <span className="text-white text-sm truncate">{workspace.name}</span>
                      <Check className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                    </button>
                  )}
                  {workspaces.map(ws => (
                    <button
                      key={ws.id}
                      onClick={() => switchWorkspace(ws)}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-700 transition-colors"
                    >
                      <div className="min-w-0 text-left">
                        <p className="text-white text-sm truncate">{ws.name}</p>
                        <p className="text-slate-500 text-[10px]">{ws.isOwner ? 'Owner' : 'Member'}</p>
                      </div>
                      {ws.id === workspace?.id && (
                        <Check className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 ml-2" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Divider */}
                <div className="border-t border-slate-700" />

                {/* Create new workspace */}
                {!showCreate ? (
                  <button
                    onClick={() => setShowCreate(true)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-blue-400 hover:bg-slate-700 transition-colors text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    New workspace
                  </button>
                ) : (
                  <div className="p-3 space-y-2">
                    <input
                      type="text"
                      value={newWsName}
                      onChange={e => setNewWsName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleCreate()}
                      placeholder="Client or brand name"
                      autoFocus
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 outline-none focus:border-blue-500"
                    />
                    {createError && (
                      <p className="text-red-400 text-xs">{createError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={handleCreate}
                        disabled={creating || !newWsName.trim()}
                        className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        {creating ? 'Creating...' : 'Create'}
                      </button>
                      <button
                        onClick={() => { setShowCreate(false); setNewWsName(''); setCreateError(''); }}
                        className="flex-1 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
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
