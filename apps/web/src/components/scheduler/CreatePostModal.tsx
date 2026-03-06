'use client';

import { useState } from 'react';
import { X, Calendar, Send, FileText, Clock, Zap } from 'lucide-react';
import { createPostAction } from '@/actions/scheduler.actions';
import { useAuthStore } from '@/store/auth.store';

const platformIcons: Record<string, string> = {
  FACEBOOK: '📘',
  INSTAGRAM: '📸',
  TWITTER: '🐦',
  LINKEDIN: '💼',
  TIKTOK: '🎵',
  YOUTUBE: '▶️',
};

// Platform character limits
const platformLimits: Record<string, { limit: number; label: string }> = {
  TWITTER:   { limit: 280,    label: 'Twitter/X limit' },
  INSTAGRAM: { limit: 2200,   label: 'Instagram caption limit' },
  FACEBOOK:  { limit: 63206,  label: 'Facebook limit' },
  LINKEDIN:  { limit: 3000,   label: 'LinkedIn limit' },
  TIKTOK:    { limit: 2200,   label: 'TikTok caption limit' },
  YOUTUBE:   { limit: 5000,   label: 'YouTube description limit' },
};

// Best posting times per platform (Lagos WAT = UTC+1)
const bestTimes: Record<string, { times: string[]; days: string; tip: string }> = {
  INSTAGRAM: {
    times: ['09:00', '11:00', '13:00', '19:00'],
    days: 'Tue – Fri',
    tip: 'Highest engagement: 9–11am & 7–9pm Lagos time',
  },
  FACEBOOK: {
    times: ['09:00', '13:00', '15:00', '20:00'],
    days: 'Wed – Fri',
    tip: 'Best reach: 1–4pm & 8pm Lagos time',
  },
  TWITTER: {
    times: ['08:00', '12:00', '17:00', '21:00'],
    days: 'Mon – Thu',
    tip: 'Peak engagement: 8–10am & 5–9pm Lagos time',
  },
  LINKEDIN: {
    times: ['08:00', '10:00', '17:00', '18:00'],
    days: 'Tue – Thu',
    tip: 'Professional hours: 8–10am & 5–6pm Lagos time',
  },
  TIKTOK: {
    times: ['07:00', '14:00', '19:00', '21:00'],
    days: 'Tue – Sat',
    tip: 'Viral window: 7am, 2pm & 7–9pm Lagos time',
  },
  YOUTUBE: {
    times: ['14:00', '15:00', '16:00', '17:00'],
    days: 'Thu – Sat',
    tip: 'Best views: 2–5pm Lagos time on weekends',
  },
};

interface Props {
  accounts: any[];
  onClose: () => void;
  onCreated: (post: any) => void;
}

export default function CreatePostModal({ accounts, onClose, onCreated }: Props) {
  const { workspace } = useAuthStore();
  const [form, setForm] = useState({
    content: '',
    socialAccountId: accounts[0]?.id || '',
    scheduledAt: '',
    status: 'DRAFT',
  });
  const [loading, setLoading] = useState(false);
  const [showBestTimes, setShowBestTimes] = useState(false);

  const selectedAccount = accounts.find(a => a.id === form.socialAccountId);
  const platform = selectedAccount?.platform || 'INSTAGRAM';
  const platformConfig = platformLimits[platform] || { limit: 2200, label: 'Character limit' };
  const charCount = form.content.length;
  const charLimit = platformConfig.limit;
  const charPercent = Math.min((charCount / charLimit) * 100, 100);
  const bestTimeConfig = bestTimes[platform];

  // Color logic for counter
  const getCounterColor = () => {
    if (charCount > charLimit) return 'text-red-500';
    if (charCount > charLimit * 0.9) return 'text-orange-500';
    if (charCount > charLimit * 0.75) return 'text-yellow-500';
    return 'text-slate-400';
  };

  const getBarColor = () => {
    if (charCount > charLimit) return 'bg-red-500';
    if (charCount > charLimit * 0.9) return 'bg-orange-400';
    if (charCount > charLimit * 0.75) return 'bg-yellow-400';
    return 'bg-blue-500';
  };

  const applyBestTime = (time: string) => {
    // Get today's date and apply the selected time
    const now = new Date();
    const [hours, minutes] = time.split(':');
    now.setHours(parseInt(hours), parseInt(minutes), 0);
    // If time already passed today, set for tomorrow
    if (now < new Date()) now.setDate(now.getDate() + 1);
    const formatted = now.toISOString().slice(0, 16);
    setForm({ ...form, scheduledAt: formatted });
    setShowBestTimes(false);
  };

  const handleSubmit = async (status: 'DRAFT' | 'SCHEDULED') => {
    if (!form.content.trim()) return;
    if (charCount > charLimit) return;
    setLoading(true);
    try {
      const post = await createPostAction({
        workspaceId: workspace!.id,
        socialAccountId: form.socialAccountId,
        content: form.content,
        scheduledAt: form.scheduledAt || undefined,
        status,
      });
      onCreated(post);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Create Post</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* Account selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Post to</label>
            <div className="flex flex-wrap gap-2">
              {accounts.map(account => (
                <button
                  key={account.id}
                  onClick={() => {
                    setForm({ ...form, socialAccountId: account.id });
                    setShowBestTimes(false);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition ${
                    form.socialAccountId === account.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-600 hover:border-blue-300'
                  }`}
                >
                  <span>{platformIcons[account.platform] || '📱'}</span>
                  {account.accountName}
                </button>
              ))}
            </div>
          </div>

          {/* Platform info banner */}
          {selectedAccount && (
            <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
              <span className="text-xl">{platformIcons[platform]}</span>
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-600">{platform} post guidelines</p>
                <p className="text-xs text-slate-400">Max {charLimit.toLocaleString()} characters · {platformConfig.label}</p>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                charCount > charLimit ? 'bg-red-100 text-red-600' :
                charCount > charLimit * 0.9 ? 'bg-orange-100 text-orange-600' :
                'bg-green-100 text-green-600'
              }`}>
                {charCount > charLimit ? `${charCount - charLimit} over limit` : 'Within limit'}
              </span>
            </div>
          )}

          {/* Content with live character counter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Content</label>
            <div className="relative">
              <textarea
                value={form.content}
                onChange={e => setForm({ ...form, content: e.target.value })}
                rows={5}
                placeholder={`Write your ${platform} post here...`}
                className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 text-slate-900 placeholder-slate-400 bg-white resize-none transition ${
                  charCount > charLimit
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-slate-200 focus:ring-blue-500'
                }`}
                style={{ color: '#0f172a' }}
              />
              {/* Character count badge */}
              <span className={`absolute bottom-3 right-3 text-xs font-semibold ${getCounterColor()}`}>
                {charCount.toLocaleString()} / {charLimit.toLocaleString()}
              </span>
            </div>

            {/* Progress bar */}
            <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${getBarColor()}`}
                style={{ width: `${charPercent}%` }}
              />
            </div>

            {/* Over limit warning */}
            {charCount > charLimit && (
              <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                ⚠️ Content exceeds {platform} limit by {(charCount - charLimit).toLocaleString()} characters. Please shorten your post.
              </p>
            )}

            {/* Approaching limit warning */}
            {charCount > charLimit * 0.9 && charCount <= charLimit && (
              <p className="text-orange-500 text-xs mt-1.5">
                ⚡ Approaching {platform} character limit — {(charLimit - charCount).toLocaleString()} characters remaining.
              </p>
            )}
          </div>

          {/* Post preview */}
          {form.content && selectedAccount && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider">
                Preview — {selectedAccount.accountName}
              </p>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {selectedAccount.accountName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{selectedAccount.accountName}</p>
                    <p className="text-xs text-slate-400">{platformIcons[platform]} {platform}</p>
                  </div>
                </div>
                <p className="text-slate-800 text-sm whitespace-pre-wrap">{form.content}</p>
              </div>
            </div>
          )}

          {/* Schedule + Best Times */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">
                Schedule for (optional)
              </label>
              {bestTimeConfig && (
                <button
                  onClick={() => setShowBestTimes(!showBestTimes)}
                  className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition"
                >
                  <Zap className="w-3 h-3" />
                  Best Times to Post
                </button>
              )}
            </div>

            <input
              type="datetime-local"
              value={form.scheduledAt}
              onChange={e => setForm({ ...form, scheduledAt: e.target.value })}
              className="px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white w-full"
            />

            {/* Best times dropdown */}
            {showBestTimes && bestTimeConfig && (
              <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <p className="text-sm font-semibold text-blue-800">
                    Best times for {platform} · {bestTimeConfig.days}
                  </p>
                </div>
                <p className="text-xs text-blue-600 mb-3">💡 {bestTimeConfig.tip}</p>
                <div className="flex flex-wrap gap-2">
                  {bestTimeConfig.times.map(time => (
                    <button
                      key={time}
                      onClick={() => applyBestTime(time)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-white border border-blue-200 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-600 hover:text-white hover:border-blue-600 transition"
                    >
                      <Clock className="w-3 h-3" />
                      {time}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-3">
                  * Times shown in West Africa Time (WAT/Lagos). Click to auto-fill schedule.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-100">
          <button
            onClick={() => handleSubmit('DRAFT')}
            disabled={loading || !form.content.trim() || charCount > charLimit}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            Save as Draft
          </button>
          <button
            onClick={() => handleSubmit(form.scheduledAt ? 'SCHEDULED' : 'DRAFT')}
            disabled={loading || !form.content.trim() || !form.socialAccountId || charCount > charLimit}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
            ) : form.scheduledAt ? (
              <><Calendar className="w-4 h-4" /> Schedule Post</>
            ) : (
              <><Send className="w-4 h-4" /> Post Now</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
