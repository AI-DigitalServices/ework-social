'use client';

import { useState } from 'react';
import { X, Calendar, Save, FileText, Clock, Zap, ImagePlus, Trash2, Film, Sparkles, Smartphone, CheckCircle, Copy } from 'lucide-react';
import AiCaptionDrawer from '@/components/scheduler/AiCaptionDrawer';
import { updatePostAction, createPostAction } from '@/actions/scheduler.actions';
import { useAuthStore } from '@/store/auth.store';
import PlatformIcon from '@/components/ui/PlatformIcon';
import { uploadMedia } from '@/lib/supabase';

const platformLimits: Record<string, { limit: number }> = {
  TWITTER:   { limit: 280 },
  INSTAGRAM: { limit: 2200 },
  FACEBOOK:  { limit: 63206 },
  LINKEDIN:  { limit: 3000 },
  TIKTOK:    { limit: 2200 },
  YOUTUBE:   { limit: 5000 },
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
  INSTAGRAM: { times: ['09:00', '11:00', '13:00', '19:00'], days: 'Tue – Fri', tip: '9–11am & 7–9pm your local time' },
  FACEBOOK:  { times: ['09:00', '13:00', '15:00', '20:00'], days: 'Wed – Fri', tip: '1–4pm & 8pm your local time' },
  TWITTER:   { times: ['08:00', '12:00', '17:00', '21:00'], days: 'Mon – Thu', tip: '8–10am & 5–9pm your local time' },
  LINKEDIN:  { times: ['08:00', '10:00', '17:00', '18:00'], days: 'Tue – Thu', tip: '8–10am & 5–6pm your local time' },
  TIKTOK:    { times: ['07:00', '14:00', '19:00', '21:00'], days: 'Tue – Sat', tip: '7am, 2pm & 7–9pm your local time' },
  YOUTUBE:   { times: ['14:00', '15:00', '16:00', '17:00'], days: 'Thu – Sat', tip: '2–5pm your local time' },
};

const platformColors: Record<string, string> = {
  INSTAGRAM: 'from-purple-500 to-pink-500',
  FACEBOOK:  'from-blue-600 to-blue-700',
  TWITTER:   'from-sky-400 to-sky-500',
  LINKEDIN:  'from-blue-700 to-blue-800',
  TIKTOK:    'from-slate-800 to-slate-900',
  YOUTUBE:   'from-red-500 to-red-600',
  THREADS:   'from-slate-700 to-slate-800',
};

interface Props {
  post: any;
  accounts: any[];             // all workspace social accounts
  mode: 'edit' | 'duplicate';
  onClose: () => void;
  onSaved: () => void;
}

export default function EditPostModal({ post, accounts, mode, onClose, onSaved }: Props) {
  const { workspace } = useAuthStore();

  // Pre-fill from existing post
  const [selectedAccountId, setSelectedAccountId] = useState<string>(post.socialAccountId);
  const [content, setContent] = useState<string>(post.content || '');
  const [mediaUrls, setMediaUrls] = useState<string[]>(post.mediaUrls || []);
  const [scheduledAt, setScheduledAt] = useState<string>(
    post.scheduledAt ? new Date(post.scheduledAt).toISOString().slice(0, 16) : ''
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showBestTimes, setShowBestTimes] = useState(false);
  const [showAiDrawer, setShowAiDrawer] = useState(false);
  const [aspectWarnings, setAspectWarnings] = useState<string[]>([]);

  const activeAccount = accounts.find(a => a.id === selectedAccountId) || accounts[0];
  const activePlatform = activeAccount?.platform || 'INSTAGRAM';
  const limit = platformLimits[activePlatform]?.limit || 2200;
  const count = content.length;
  const isOver = count > limit;
  const isEmpty = !content.trim();
  const instagramSelected = activePlatform === 'INSTAGRAM';
  const instagramNeedsImage = instagramSelected && mediaUrls.length === 0;
  const bestTimeConfig = bestTimes[activePlatform];
  const previewGradient = platformColors[activePlatform] ?? 'from-slate-600 to-slate-700';
  const firstMedia = mediaUrls[0];
  const isVideo = firstMedia?.match(/\.(mp4|mov|avi|webm)$/i);

  const getCounterColor = () => {
    if (count > limit) return 'text-red-500';
    if (count > limit * 0.9) return 'text-orange-500';
    if (count > limit * 0.75) return 'text-yellow-500';
    return 'text-slate-400';
  };

  const getBarColor = () => {
    if (count > limit) return 'bg-red-500';
    if (count > limit * 0.9) return 'bg-orange-400';
    if (count > limit * 0.75) return 'bg-yellow-400';
    return 'bg-blue-500';
  };

  const checkAspectRatio = (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('video/')) { resolve(null); return; }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const ratio = img.width / img.height;
        URL.revokeObjectURL(url);
        resolve(ratio < 0.8 || ratio > 1.91
          ? `"${file.name}" is outside Instagram's accepted ratio range.`
          : null);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    });
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    setAspectWarnings([]);
    try {
      const urls = await Promise.all(files.map(f => uploadMedia(f, workspace!.id)));
      setMediaUrls(prev => [...prev, ...urls]);
      if (instagramSelected) {
        const warnings = (await Promise.all(files.map(checkAspectRatio))).filter(Boolean) as string[];
        if (warnings.length) setAspectWarnings(warnings);
      }
    } catch (err: any) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeMedia = (url: string) => {
    setMediaUrls(prev => prev.filter(u => u !== url));
    setAspectWarnings([]);
  };

  const applyBestTime = (time: string) => {
    const now = new Date();
    const [h, m] = time.split(':');
    now.setHours(parseInt(h), parseInt(m), 0);
    if (now < new Date()) now.setDate(now.getDate() + 1);
    setScheduledAt(now.toISOString().slice(0, 16));
    setShowBestTimes(false);
  };

  const handleSave = async () => {
    if (isEmpty || isOver || instagramNeedsImage) return;
    setSaving(true);
    try {
      if (mode === 'edit') {
        await updatePostAction(post.id, {
          content,
          mediaUrls,
          scheduledAt: scheduledAt || null,
          socialAccountId: selectedAccountId,
          status: scheduledAt ? 'SCHEDULED' : 'DRAFT',
        });
      } else {
        // Duplicate → create new DRAFT
        await createPostAction({
          workspaceId: workspace!.id,
          socialAccountId: selectedAccountId,
          content,
          mediaUrls,
          scheduledAt: scheduledAt || undefined,
          status: scheduledAt ? 'SCHEDULED' : 'DRAFT',
        });
      }
      onSaved();
      onClose();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save post');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex overflow-hidden" style={{ height: '92vh' }}>

        {/* ── LEFT: Editor ───────────────────────────────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0 border-r border-slate-100">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {mode === 'edit' ? 'Edit Post' : 'Duplicate Post'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {mode === 'edit' ? 'Update content, media, platform or schedule' : 'Adjust and save as a new draft'}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* Account / Platform selector */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Post to</label>
              <div className="flex flex-wrap gap-2">
                {accounts.map(account => {
                  const isSelected = selectedAccountId === account.id;
                  return (
                    <button key={account.id}
                      onClick={() => setSelectedAccountId(account.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 text-slate-600 hover:border-blue-300'
                      }`}
                    >
                      <PlatformIcon platform={account.platform} size="sm" />
                      {account.accountName}
                      {isSelected && <CheckCircle className="w-3.5 h-3.5 text-blue-500" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Platform tip */}
            {platformTips[activePlatform] && (
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                <PlatformIcon platform={activePlatform} size="sm" />
                <p className="text-xs text-blue-700"><strong>{activePlatform} tip:</strong> {platformTips[activePlatform]}</p>
              </div>
            )}

            {/* Content */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">Content</label>
                <button onClick={() => setShowAiDrawer(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-500 to-blue-500 text-white rounded-lg text-xs font-semibold hover:opacity-90 transition">
                  <Sparkles className="w-3 h-3" /> AI Write
                </button>
              </div>
              <div className="relative">
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  rows={7}
                  placeholder={`Write your ${activePlatform} caption...`}
                  className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 text-slate-900 placeholder-slate-400 bg-white resize-none transition ${
                    isOver ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'
                  }`}
                  style={{ color: '#0f172a' }}
                />
                <span className={`absolute bottom-3 right-3 text-xs font-semibold ${getCounterColor()}`}>
                  {count.toLocaleString()} / {limit.toLocaleString()}
                </span>
              </div>
              <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-300 ${getBarColor()}`}
                  style={{ width: `${Math.min((count / limit) * 100, 100)}%` }} />
              </div>
            </div>

            {/* Media */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Media</label>
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
                        <button onClick={() => removeMedia(url)}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
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
                    <><ImagePlus className="w-5 h-5 text-slate-400" /><span className="text-sm text-slate-500">Add or replace media</span><span className="text-xs text-slate-400 ml-auto">JPG, PNG, MP4, MOV</span></>
                  )}
                </label>
              </div>
            </div>

            {/* Instagram warnings */}
            {instagramSelected && (instagramNeedsImage || aspectWarnings.length > 0) && (
              <div className="space-y-2">
                {instagramNeedsImage && (
                  <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    <span className="text-lg">⚠️</span>
                    <p className="text-sm font-semibold text-amber-800">Instagram requires at least one image or video</p>
                  </div>
                )}
                {aspectWarnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <span className="text-lg">❌</span>
                    <div>
                      <p className="text-sm font-semibold text-red-800">Unsupported aspect ratio</p>
                      <p className="text-xs text-red-700 mt-0.5">{w}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

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
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 flex-shrink-0">
            <button onClick={onClose}
              className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition">
              <X className="w-4 h-4" /> Cancel
            </button>
            <button onClick={handleSave}
              disabled={saving || isEmpty || isOver || instagramNeedsImage || aspectWarnings.length > 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50">
              {saving ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
              ) : mode === 'edit' ? (
                <><Save className="w-4 h-4" /> Save Changes</>
              ) : (
                <><Copy className="w-4 h-4" /> Save as Duplicate</>
              )}
            </button>
          </div>
        </div>

        {/* ── RIGHT: Phone Preview ────────────────────────────────────────────── */}
        <div className="w-80 flex-shrink-0 bg-slate-50 flex flex-col items-center pt-4 pb-4 px-3">
          <div className="flex items-center gap-2 mb-3 self-start flex-shrink-0">
            <Smartphone className="w-4 h-4 text-slate-400" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Live Preview</p>
          </div>

          {/* Phone frame — fills height */}
          <div className="flex-1 flex flex-col w-full max-w-[240px] bg-slate-900 rounded-[2.5rem] p-2 shadow-2xl ring-1 ring-slate-700 overflow-hidden">
            <div className="w-14 h-4 bg-slate-900 rounded-full mx-auto mb-1 flex items-center justify-center flex-shrink-0">
              <div className="w-7 h-1 bg-slate-700 rounded-full" />
            </div>
            {/* Screen — scrollable inside phone */}
            <div className="flex-1 bg-white rounded-[1.8rem] overflow-hidden flex flex-col">
              <div className={`bg-gradient-to-r ${previewGradient} px-3 py-2.5 flex items-center gap-2 flex-shrink-0`}>
                {activeAccount && <PlatformIcon platform={activePlatform} size="sm" />}
                <span className="text-white text-xs font-semibold truncate">
                  {activeAccount?.accountName || 'Your Account'}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${previewGradient} flex items-center justify-center flex-shrink-0`}>
                    <span className="text-white text-xs font-bold">
                      {(activeAccount?.accountName || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800 leading-none">{activeAccount?.accountName || 'Your Account'}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Just now</p>
                  </div>
                </div>

                {firstMedia && !isVideo && (
                  <img src={firstMedia} alt="" className="w-full rounded-lg mb-2 object-cover" style={{ maxHeight: 140 }} />
                )}
                {firstMedia && isVideo && (
                  <div className="w-full rounded-lg mb-2 bg-slate-100 flex items-center justify-center" style={{ height: 100 }}>
                    <div className="w-10 h-10 bg-white/80 rounded-full flex items-center justify-center shadow">
                      <span style={{ fontSize: 14, marginLeft: 2 }}>▶</span>
                    </div>
                  </div>
                )}
                {mediaUrls.length > 1 && <p className="text-[10px] text-slate-400 mb-1">+{mediaUrls.length - 1} more</p>}

                {/* Full caption — no clamp, scrolls naturally inside phone */}
                {content ? (
                  <p className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-wrap">{content}</p>
                ) : (
                  <p className="text-[11px] text-slate-300 italic">Your caption will appear here...</p>
                )}

                {scheduledAt && (
                  <div className="mt-3 flex items-center gap-1 text-[10px] text-blue-500 bg-blue-50 px-2 py-1 rounded-full w-fit">
                    <Clock className="w-2.5 h-2.5" />
                    {new Date(scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}

                <div className="flex items-center gap-3 mt-3 pt-2 border-t border-slate-100">
                  <span className="text-[10px] text-slate-300">❤️ Like</span>
                  <span className="text-[10px] text-slate-300">💬 Comment</span>
                  <span className="text-[10px] text-slate-300">↗️ Share</span>
                </div>
              </div>
            </div>
          </div>

          {platformTips[activePlatform] && (
            <p className="mt-3 text-[10px] text-slate-400 text-center leading-relaxed flex-shrink-0 px-2">
              💡 {platformTips[activePlatform]}
            </p>
          )}
        </div>
      </div>

      {showAiDrawer && (
        <AiCaptionDrawer
          platform={activePlatform}
          currentContent={content}
          onApply={(caption) => setContent(caption)}
          onClose={() => setShowAiDrawer(false)}
        />
      )}
    </div>
  );
}
