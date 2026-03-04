'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { token } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !token) {
      router.push('/login');
    }
  }, [mounted, token, router]);

  if (!mounted) return null;
  if (!token) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <Header />
      <main className="ml-64 pt-16 min-h-screen">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
