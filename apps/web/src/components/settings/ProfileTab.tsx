'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { Save } from 'lucide-react';

export default function ProfileTab() {
  const { user } = useAuthStore();
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-lg">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-800 mb-6">Profile Information</h3>

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-slate-800">{user?.name}</p>
            <p className="text-slate-500 text-sm">{user?.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              placeholder="Leave blank to keep current"
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition ${
              saved
                ? 'bg-green-500 text-white'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <Save className="w-4 h-4" />
            {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
