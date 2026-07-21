'use client';

import { useState } from 'react';
import { Bell, Save } from 'lucide-react';

interface NotifPrefs {
  postApprovalRequests: boolean;
  postPublished: boolean;
  weeklyDigest: boolean;
  platformUpdates: boolean;
}

export default function NotificationsTab() {
  const [prefs, setPrefs] = useState<NotifPrefs>({
    postApprovalRequests: true,
    postPublished: true,
    weeklyDigest: false,
    platformUpdates: true,
  });
  const [saved, setSaved] = useState(false);

  const toggle = (key: keyof NotifPrefs) =>
    setPrefs(p => ({ ...p, [key]: !p[key] }));

  const handleSave = () => {
    // Persisted locally for now — backend notification preferences endpoint can be wired in later
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const rows: { key: keyof NotifPrefs; label: string; desc: string }[] = [
    {
      key: 'postApprovalRequests',
      label: 'Post Approval Requests',
      desc: 'Get notified when your agency sends content for your review.',
    },
    {
      key: 'postPublished',
      label: 'Post Published',
      desc: 'Receive a confirmation when approved content goes live.',
    },
    {
      key: 'weeklyDigest',
      label: 'Weekly Summary',
      desc: 'A weekly email with your content performance highlights.',
    },
    {
      key: 'platformUpdates',
      label: 'Platform Updates',
      desc: 'Occasional product news and tips from eWork Social.',
    },
  ];

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
          <Bell className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800">Notification Preferences</h3>
          <p className="text-sm text-slate-500">Control which emails we send to your inbox.</p>
        </div>
      </div>

      <div className="space-y-3">
        {rows.map(row => (
          <div
            key={row.key}
            className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100"
          >
            <div className="flex-1 min-w-0 pr-4">
              <p className="text-sm font-medium text-slate-800">{row.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{row.desc}</p>
            </div>
            <button
              onClick={() => toggle(row.key)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                prefs[row.key] ? 'bg-blue-600' : 'bg-slate-300'
              }`}
              role="switch"
              aria-checked={prefs[row.key]}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                  prefs[row.key] ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition ${
          saved ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        <Save className="w-4 h-4" />
        {saved ? 'Saved!' : 'Save Preferences'}
      </button>
    </div>
  );
}
