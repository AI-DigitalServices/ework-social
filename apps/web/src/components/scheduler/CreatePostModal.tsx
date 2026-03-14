'use client';

import { useState } from 'react';
import { X, Calendar, Send, FileText, Clock, Zap, CheckCircle, Copy, Lock, ImagePlus, Trash2, Film } from 'lucide-react';
import { createPostAction } from '@/actions/scheduler.actions';
import { useAuthStore } from '@/store/auth.store';
import PlatformIcon from '@/components/ui/PlatformIcon';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { uploadMedia } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const platformLimits: Record<string, { limit: number; label: string }> = {
  TWITTER:   { limit: 280,   label: 'Twitter/X' },
  INSTAGRAM: { limit: 2200,  label: 'Instagram' },
  FACEBOOK:  { limit: 63206, label: 'Facebook' },
  LINKEDIN:  { limit: 3000,  label: 'LinkedIn' },
  TIKTOK:    { limit: 2200,  label: 'TikTok' },
  YOUTUBE:   { limit: 5000,  label: 'YouTube' },
};

const platformTips: Record<string, string> = {
  TWITTER:   'Keep it punchy. Use hashtags wisely. Max 280 chars.',
  INSTAGRAM: 'Use emojis, line breaks & hashtags. First 125 chars show before "more".',
  FACEBOOK:  'Conversational tone works best. Ask questions to boost engagement.',
  LINKEDIN:  'Professional tone. Start with a hook. Add value before the CTA.',
  TIKTOK:    'Casual & fun. Use trending sounds references & hashtags.',
  YOUTUBE:   'Front-load keywords. Include timestamps & links in description.',
};

const bestTimes: Record<string, { times: string[]; days: string; tip: string }> = {
  INSTAGRAM: { times: ['09:00', '11:00', '13:00', '19:00'], days: 'Tue – Fri', tip: '9–11am & 7–9pm Lagos time' },
  FACEBOOK:  { times: ['09:00', '13:00', '15:00', '20:00'], days: 'Wed – Fri', tip: '1–4pm & 8pm Lagos time' },
  TWITTER:   { times: ['08:00', '12:00', '17:00', '21:00'], days: 'Mon – Thu', tip: '8–10am & 5–9pm Lagos time' },
  LINKEDIN:  { times: ['08:00', '10:00', '17:00', '18:00'], days: 'Tue – Thu', tip: '8–10am & 5–6pm Lagos time' },
  TIKTOK:    { times: ['07:00', '14:00', '19:00', '21:00'], days: 'Tue – Sat', tip: '7am, 2pm & 7–9pm Lagos time' },
  YOUTUBE:   { times: ['14:00', '15:00', '16:00', '17:00'], days: 'Thu – Sat', tip: '2–5pm Lagos time' },
};

interface Props {
  accounts: any[];
  onClose: () => void;
  onCreated: (post: any) => void;
}

export default function CreatePostModal({ accounts, onClose, onCreated }: Props) {
  const { workspace } = useAuthStore();
  const router = useRouter();
  const { data: planData } = usePlanLimits();
  const canUsePerPlatformEditor = planData?.limits?.perPlatformEditorEnabled ?? false;
  const isAtPostLimit = planData ? planData.usage.postsThisMonth >= planData.limits.maxPostsPerMonth : false;

  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(
    accounts.length > 0 ? [accounts[0].id] : []
  );
  const [contentMap, setContentMap] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<string>(accounts[0]?.id || '');
  const [scheduledAt, setScheduledAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [showBestTimes, setShowBestTimes] = useState(false);
  const [syncMode, setSyncMode] = useState(true);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const selectedAccounts = accounts.filter(a => selectedAccountIds.includes(a.id));
  const activeAccount = accounts.find(a => a.id === activeTab) || selectedAccounts[0];
  const activePlatform = activeAccount?.platform || 'INSTAGRAM';
  const activeContent = contentMap[activeTab] || '';
  const activeLimit = platformLimits[activePlatform]?.limit || 2200;
  const activeCount = activeContent.length;
  const bestTimeConfig = bestTimes[activePlatform];

  const toggleAccount = (accountId: string) => {
    const newIds = selectedAccountIds.includes(accountId)
      ? selectedAccountIds.length === 1 ? selectedAccountIds : selectedAccountIds.filter(id => id !== accountId)
      : [...selectedAccountIds, accountId];
    setSelectedAccountIds(newIds);
    if (!selectedAccountIds.includes(accountId)) setActiveTab(accountId);
  };

  const handleContentChange = (value: string) => {
    if (syncMode) {
      const newMap = { ...contentMap };
      selectedAccountIds.forEach(id => { newMap[id] = value; });
      setContentMap(newMap);
    } else {
      setContentMap(prev => ({ ...prev, [activeTab]: value }));
    }
  };

  const copyToAll = () => {
    const newMap = { ...contentMap };
    selectedAccountIds.forEach(id => { newMap[id] = activeContent; });
    setContentMap(newMap);
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = await Promise.all(files.map(f => uploadMedia(f, workspace!.id)));
      setMediaUrls(prev => [...prev, ...urls]);
    } catch (err: any) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeMedia = (url: string) => setMediaUrls(prev => prev.filter(u => u !== url));

  const applyBestTime = (time: string) => {
    const now = new Date();
    const [hours, minutes] = time.split(':');
    now.setHours(parseInt(hours), parseInt(minutes), 0);
    if (now < new Date()) now.setDate(now.getDate() + 1);
    setScheduledAt(now.toISOString().slice(0, 16));
    setShowBestTimes(false);
  };

  const getCounterColor = (count: number, limit: number) => {
    if (count > limit) return 'text-red-500';
    if (count > limit * 0.9) return 'text-orange-500';
    if (count > limit * 0.75) return 'text-yellow-500';
    return 'text-slate-400';
  };

  const getBarColor = (count: number, limit: number) => {
    if (count > limit) return 'bg-red-500';
    if (count > limit * 0.9) return 'bg-orange-400';
    if (count > limit * 0.75) return 'bg-yellow-400';
    return 'bg-blue-500';
  };

  const anyOver = selectedAccounts.some(a => (contentMap[a.id] || '').length > (platformLimits[a.platform]?.limit || 2200));
  const anyEmpty = selectedAccounts.some(a => !(contentMap[a.id] || '').trim());

  const handleSubmit = async (status: 'DRAFT' | 'SCHEDULED') => {
    if (anyOver || anyEmpty || isAtPostLimit) return;
    setLoading(true);
    try {
      const posts = await Promise.all(
        selectedAccountIds.map(accountId =>
          createPostAction({
            workspaceId: workspace!.id,
            socialAccountId: accountId,
            content: contentMap[accountId] || '',
            mediaUrls,
            scheduledAt: scheduledAt || undefined,
            status,
          })
        )
      );
      posts.forEach(post => onCreated(post));
      onClose();
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Create Post</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {selectedAccountIds.length} account{selectedAccountIds.length !== 1 ? 's' : ''} selected
              {planData && (
                <span className="ml-2 text-slate-400">
                  · {planData.usage.postsThisMonth}/{planData.limits.maxPostsPerMonth} posts this month
                </span>
              )}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Post limit warning */}
        {isAtPostLimit && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-red-700">Monthly post limit reached</p>
              <p className="text-xs text-red-600 mt-0.5">Upgrade your plan to post more this month.</p>
            </div>
            <button
              onClick={() => { onClose(); router.push('/dashboard/settings?tab=plan'); }}
              className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600 transition"
            >
              Upgrade
            </button>
          </div>
        )}

        <div className="p-6 space-y-5">

          {/* Account selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">Post to</label>
              <div className="flex items-center gap-2">
                <button onClick={() => setSelectedAccountIds(accounts.map(a => a.id))} className="text-xs text-blue-600 font-medium">All</button>
                <span className="text-slate-300">·</span>
                <button onClick={() => accounts.length > 0 && setSelectedAccountIds([accounts[0].id])} className="text-xs text-slate-500 font-medium">Clear</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {accounts.map(account => {
                const isSelected = selectedAccountIds.includes(account.id);
                const limit = platformLimits[account.platform]?.limit || 2200;
                const count = (contentMap[account.id] || '').length;
                const isOver = count > limit;
                return (
                  <button
                    key={account.id}
                    onClick={() => { toggleAccount(account.id); setActiveTab(account.id); }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition ${
                      isSelected
                        ? isOver ? 'border-red-400 bg-red-50 text-red-700' : 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 text-slate-600 hover:border-blue-300'
                    }`}
                  >
                    <PlatformIcon platform={account.platform} size="sm" />
                    {account.accountName}
                    {isSelected && count > 0 && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${isOver ? 'bg-red-200 text-red-700' : 'bg-blue-200 text-blue-700'}`}>
                        {count}
                      </span>
                    )}
                    {isSelected && <CheckCircle className={`w-3.5 h-3.5 ${isOver ? 'text-red-400' : 'text-blue-500'}`} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sync toggle — gated behind Growth+ */}
          {selectedAccounts.length > 1 && (
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  {syncMode ? '🔗 Synced content' : '✏️ Per-platform editing'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {syncMode ? 'All platforms share the same copy' : 'Customize content per platform'}
                </p>
              </div>
              {canUsePerPlatformEditor ? (
                <button
                  onClick={() => {
                    if (!syncMode) {
                      const newMap: Record<string, string> = {};
                      selectedAccountIds.forEach(id => { newMap[id] = activeContent; });
                      setContentMap(newMap);
                    }
                    setSyncMode(!syncMode);
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${syncMode ? 'bg-blue-600' : 'bg-slate-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${syncMode ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              ) : (
                <button
                  onClick={() => { onClose(); router.push('/dashboard/settings?tab=plan'); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-100 text-violet-700 rounded-lg text-xs font-semibold hover:bg-violet-200 transition"
                >
                  <Lock className="w-3 h-3" />
                  Growth+ feature
                </button>
              )}
            </div>
          )}

          {/* Platform tabs */}
          {selectedAccounts.length > 1 && !syncMode && canUsePerPlatformEditor && (
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
              {selectedAccounts.map(account => {
                const limit = platformLimits[account.platform]?.limit || 2200;
                const count = (contentMap[account.id] || '').length;
                const isOver = count > limit;
                const isEmpty = count === 0;
                return (
                  <button
                    key={account.id}
                    onClick={() => setActiveTab(account.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition whitespace-nowrap flex-shrink-0 ${
                      activeTab === account.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <PlatformIcon platform={account.platform} size="sm" />
                    {account.accountName}
                    <span className={`w-2 h-2 rounded-full ${isOver ? 'bg-red-500' : isEmpty ? 'bg-amber-400' : 'bg-green-500'}`} />
                  </button>
                );
              })}
            </div>
          )}

          {/* Platform tip */}
          {!syncMode && canUsePerPlatformEditor && platformTips[activePlatform] && (
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <PlatformIcon platform={activePlatform} size="sm" />
              <p className="text-xs text-blue-700"><strong>{activePlatform} tip:</strong> {platformTips[activePlatform]}</p>
            </div>
          )}

          {/* Content */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">
                {syncMode || !canUsePerPlatformEditor ? 'Content' : `Content for ${activeAccount?.accountName}`}
              </label>
              {!syncMode && canUsePerPlatformEditor && selectedAccounts.length > 1 && (
                <button onClick={copyToAll} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 font-medium transition">
                  <Copy className="w-3 h-3" /> Copy to all
                </button>
              )}
            </div>
            <div className="relative">
              <textarea
                value={activeContent}
                onChange={e => handleContentChange(e.target.value)}
                rows={5}
                disabled={isAtPostLimit}
                placeholder={isAtPostLimit ? 'Monthly limit reached — upgrade to post more' : `Write your ${activePlatform} post here...`}
                className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 text-slate-900 placeholder-slate-400 bg-white resize-none transition ${
                  activeCount > activeLimit ? 'border-red-300 focus:ring-red-500' :
                  isAtPostLimit ? 'border-slate-200 bg-slate-50 cursor-not-allowed' :
                  'border-slate-200 focus:ring-blue-500'
                }`}
                style={{ color: '#0f172a' }}
              />
              <span className={`absolute bottom-3 right-3 text-xs font-semibold ${getCounterColor(activeCount, activeLimit)}`}>
                {activeCount.toLocaleString()} / {activeLimit.toLocaleString()}
              </span>
            </div>
            <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-300 ${getBarColor(activeCount, activeLimit)}`}
                style={{ width: `${Math.min((activeCount / activeLimit) * 100, 100)}%` }} />
            </div>
          </div>

          {/* Per-platform summary */}
          {!syncMode && canUsePerPlatformEditor && selectedAccounts.length > 1 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">All Platforms</p>
              {selectedAccounts.map(account => {
                const limit = platformLimits[account.platform]?.limit || 2200;
                const count = (contentMap[account.id] || '').length;
                const isOver = count > limit;
                const isEmpty = count === 0;
                return (
                  <button key={account.id} onClick={() => setActiveTab(account.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition text-left ${
                      activeTab === account.id ? 'border-blue-300 bg-blue-50' :
                      isOver ? 'border-red-200 bg-red-50' :
                      isEmpty ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'
                    }`}
                  >
                    <PlatformIcon platform={account.platform} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold text-slate-700">{account.accountName}</p>
                        <span className={`text-xs font-bold ${isOver ? 'text-red-600' : isEmpty ? 'text-amber-600' : 'text-green-600'}`}>
                          {isEmpty ? 'Empty' : isOver ? `${count - limit} over` : `${limit - count} left`}
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${isOver ? 'bg-red-500' : isEmpty ? 'bg-amber-300' : 'bg-green-500'}`}
                          style={{ width: `${Math.min((count / limit) * 100, 100)}%` }} />
                      </div>
                    </div>
                    <span>{isOver ? '⚠️' : isEmpty ? '✏️' : '✅'}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Preview */}
          {activeContent && activeAccount && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider">Preview — {activeAccount.accountName}</p>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <PlatformIcon platform={activePlatform} size="md" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{activeAccount.accountName}</p>
                    <p className="text-xs text-slate-400">{activePlatform}</p>
                  </div>
                </div>
                <p className="text-slate-800 text-sm whitespace-pre-wrap">{activeContent}</p>
              </div>
            </div>
          )}

          {/* Media Upload */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Media (optional)</label>
            <div className="space-y-3">
              {mediaUrls.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {mediaUrls.map((url, i) => (
                    <div key={i} className="relative group">
                      {url.match(/\.(mp4|mov|avi|webm)$/i) ? (
                        <div className="w-20 h-20 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200">
                          <Film className="w-8 h-8 text-slate-400" />
                        </div>
                      ) : (
                        <img src={url} alt="" className="w-20 h-20 object-cover rounded-lg border border-slate-200" />
                      )}
                      <button onClick={() => removeMedia(url)} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <label className={`flex items-center gap-3 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition ${uploading ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50'}`}>
                <input type="file" accept="image/*,video/*" multiple onChange={handleMediaUpload} className="hidden" disabled={uploading} />
                {uploading ? (
                  <><div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /><span className="text-sm text-blue-600 font-medium">Uploading...</span></>
                ) : (
                  <><ImagePlus className="w-5 h-5 text-slate-400" /><span className="text-sm text-slate-500">Add images or videos</span><span className="text-xs text-slate-400 ml-auto">JPG, PNG, MP4, MOV</span></>
                )}
              </label>
            </div>
          </div>

          {/* Schedule */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">Schedule for (optional)</label>
              {bestTimeConfig && (
                <button onClick={() => setShowBestTimes(!showBestTimes)}
                  className="flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg transition">
                  <Zap className="w-3 h-3" /> Best Times
                </button>
              )}
            </div>
            <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
              className="px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white w-full" />
            {showBestTimes && bestTimeConfig && (
              <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <p className="text-sm font-semibold text-blue-800">{activePlatform} · {bestTimeConfig.days}</p>
                </div>
                <p className="text-xs text-blue-600 mb-3">💡 {bestTimeConfig.tip}</p>
                <div className="flex flex-wrap gap-2">
                  {bestTimeConfig.times.map(time => (
                    <button key={time} onClick={() => applyBestTime(time)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-white border border-blue-200 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-600 hover:text-white transition">
                      <Clock className="w-3 h-3" />{time}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-100">
          <button onClick={() => handleSubmit('DRAFT')} disabled={loading || anyEmpty || anyOver || isAtPostLimit}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition disabled:opacity-50">
            <FileText className="w-4 h-4" /> Save Draft{selectedAccountIds.length > 1 ? 's' : ''}
          </button>
          <button onClick={() => handleSubmit(scheduledAt ? 'SCHEDULED' : 'DRAFT')}
            disabled={loading || anyEmpty || anyOver || selectedAccountIds.length === 0 || isAtPostLimit}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50">
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating...</>
            ) : scheduledAt ? (
              <><Calendar className="w-4 h-4" /> Schedule ({selectedAccountIds.length})</>
            ) : (
              <><Send className="w-4 h-4" /> Post ({selectedAccountIds.length})</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
