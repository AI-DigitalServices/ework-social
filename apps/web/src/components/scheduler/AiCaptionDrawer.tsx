'use client';

import { useState } from 'react';
import { Sparkles, X, Copy, Check, Lock, RefreshCw, Hash, Wand2 } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';

const TONES = ['Professional', 'Casual', 'Humorous', 'Inspirational', 'Urgent', 'Storytelling'];

const REWRITE_INSTRUCTIONS = [
  'Make it more professional',
  'Make it more casual and fun',
  'Make it shorter',
  'Make it more engaging',
  'Add more emotion',
  'Make it sound more African',
];

interface Props {
  platform: string;
  currentContent: string;
  clientName?: string;
  onApply: (caption: string) => void;
  onClose: () => void;
}

export default function AiCaptionDrawer({ platform, currentContent, clientName, onApply, onClose }: Props) {
  const { workspace } = useAuthStore();
  const router = useRouter();
  const { data: planData } = usePlanLimits();
  const [tab, setTab] = useState<'generate' | 'hashtags' | 'rewrite'>('generate');
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('Professional');
  const [captions, setCaptions] = useState<string[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [rewritten, setRewritten] = useState('');
  const [rewriteInstruction, setRewriteInstruction] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [error, setError] = useState('');

  const canUseAI = (planData?.limits?.aiCaptionsPerMonth ?? 0) > 0;
  const canUseHashtags = planData?.limits?.aiHashtagsEnabled ?? false;
  const canUseRewrite = planData?.limits?.aiRewriteEnabled ?? false;
  const planName = planData?.plan || 'FREE';

  const handleGenerate = async () => {
    if (!workspace?.id || !topic.trim()) return;
    setLoading(true);
    setError('');
    setCaptions([]);
    try {
      const res = await api.post('/ai/captions', {
        workspaceId: workspace.id,
        topic: topic.trim(),
        platform,
        tone,
        clientName,
      });
      setCaptions(res.data.captions);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to generate captions');
    } finally {
      setLoading(false);
    }
  };

  const handleHashtags = async () => {
    if (!workspace?.id || !currentContent.trim()) return;
    setLoading(true);
    setError('');
    setHashtags([]);
    try {
      const res = await api.post('/ai/hashtags', {
        workspaceId: workspace.id,
        content: currentContent,
        platform,
      });
      setHashtags(res.data.hashtags);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to generate hashtags');
    } finally {
      setLoading(false);
    }
  };

  const handleRewrite = async () => {
    if (!workspace?.id || !currentContent.trim() || !rewriteInstruction) return;
    setLoading(true);
    setError('');
    setRewritten('');
    try {
      const res = await api.post('/ai/rewrite', {
        workspaceId: workspace.id,
        content: currentContent,
        instruction: rewriteInstruction,
        platform,
      });
      setRewritten(res.data.rewritten);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to rewrite post');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const applyHashtagsToContent = () => {
    const hashtagString = '\n\n' + hashtags.join(' ');
    onApply(currentContent + hashtagString);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-blue-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">AI Writing Assistant</h3>
              <p className="text-xs text-slate-500">Powered by Claude AI · {platform}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/80 rounded-lg transition">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Plan gate for FREE users */}
        {!canUseAI && (
          <div className="m-5 p-5 bg-gradient-to-br from-violet-50 to-blue-50 border border-violet-200 rounded-xl text-center">
            <div className="w-12 h-12 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6 text-violet-600" />
            </div>
            <h4 className="font-bold text-slate-800 mb-1">AI Features Locked</h4>
            <p className="text-sm text-slate-500 mb-4">
              Upgrade to Starter or above to access AI caption generation, hashtag suggestions, and post rewriting.
            </p>
            <button
              onClick={() => { onClose(); router.push('/dashboard/settings?tab=plan'); }}
              className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition"
            >
              Upgrade Plan →
            </button>
          </div>
        )}

        {canUseAI && (
          <>
            {/* Tabs */}
            <div className="flex border-b border-slate-100 px-5 pt-3 gap-1">
              {[
                { id: 'generate', label: '✨ Generate', available: true },
                { id: 'hashtags', label: '# Hashtags', available: canUseHashtags },
                { id: 'rewrite', label: '✏️ Rewrite', available: canUseRewrite },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => t.available && setTab(t.id as any)}
                  className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition ${
                    tab === t.id
                      ? 'border-violet-600 text-violet-700 bg-violet-50'
                      : t.available
                      ? 'border-transparent text-slate-500 hover:text-slate-700'
                      : 'border-transparent text-slate-300 cursor-not-allowed'
                  }`}
                >
                  {t.label}
                  {!t.available && <Lock className="w-3 h-3" />}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Generate Tab */}
              {tab === 'generate' && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 block">
                      What do you want to post about?
                    </label>
                    <textarea
                      value={topic}
                      onChange={e => setTopic(e.target.value)}
                      rows={3}
                      placeholder={`e.g. "New product launch for our Lagos restaurant" or "Client testimonial about our services"`}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-900 placeholder-slate-400 text-sm resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 block">Tone</label>
                    <div className="flex flex-wrap gap-2">
                      {TONES.map(t => (
                        <button
                          key={t}
                          onClick={() => setTone(t)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                            tone === t
                              ? 'bg-violet-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-violet-50 hover:text-violet-700'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleGenerate}
                    disabled={loading || !topic.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
                  >
                    {loading ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating...</>
                    ) : (
                      <><Sparkles className="w-4 h-4" /> Generate 3 Captions</>
                    )}
                  </button>

                  {captions.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Choose a caption</p>
                      {captions.map((caption, i) => (
                        <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-4 hover:border-violet-300 transition group">
                          <p className="text-sm text-slate-800 whitespace-pre-wrap mb-3">{caption}</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => { onApply(caption); onClose(); }}
                              className="flex-1 py-2 bg-violet-600 text-white rounded-lg text-xs font-semibold hover:bg-violet-700 transition"
                            >
                              Use This Caption
                            </button>
                            <button
                              onClick={() => copyToClipboard(caption, i)}
                              className="px-3 py-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-100 transition"
                            >
                              {copiedIndex === i ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={handleGenerate}
                        className="w-full flex items-center justify-center gap-2 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-medium hover:bg-slate-50 transition"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Hashtags Tab */}
              {tab === 'hashtags' && (
                <>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                    <p className="text-xs text-blue-700">
                      <strong>Current post content</strong> will be analysed to suggest the best hashtags.
                      {!currentContent.trim() && <span className="text-orange-600"> Write your post content first.</span>}
                    </p>
                  </div>

                  <button
                    onClick={handleHashtags}
                    disabled={loading || !currentContent.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
                  >
                    {loading ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Analysing...</>
                    ) : (
                      <><Hash className="w-4 h-4" /> Generate Hashtags</>
                    )}
                  </button>

                  {hashtags.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Suggested Hashtags</p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {hashtags.map((tag, i) => (
                          <span key={i} className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs font-medium">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <button
                        onClick={applyHashtagsToContent}
                        className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
                      >
                        Add to Post
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Rewrite Tab */}
              {tab === 'rewrite' && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 block">
                      How should it be rewritten?
                    </label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {REWRITE_INSTRUCTIONS.map(inst => (
                        <button
                          key={inst}
                          onClick={() => setRewriteInstruction(inst)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                            rewriteInstruction === inst
                              ? 'bg-green-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-green-50 hover:text-green-700'
                          }`}
                        >
                          {inst}
                        </button>
                      ))}
                    </div>
                    <input
                      value={rewriteInstruction}
                      onChange={e => setRewriteInstruction(e.target.value)}
                      placeholder="Or type a custom instruction..."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500 text-slate-900 placeholder-slate-400 text-sm"
                    />
                  </div>

                  <button
                    onClick={handleRewrite}
                    disabled={loading || !currentContent.trim() || !rewriteInstruction.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
                  >
                    {loading ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Rewriting...</>
                    ) : (
                      <><Wand2 className="w-4 h-4" /> Rewrite Post</>
                    )}
                  </button>

                  {rewritten && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                      <p className="text-xs font-semibold text-green-700 mb-2">Rewritten Version</p>
                      <p className="text-sm text-slate-800 whitespace-pre-wrap mb-3">{rewritten}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { onApply(rewritten); onClose(); }}
                          className="flex-1 py-2 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition"
                        >
                          Use Rewritten Version
                        </button>
                        <button
                          onClick={() => copyToClipboard(rewritten, 99)}
                          className="px-3 py-2 border border-green-200 rounded-lg text-green-600 hover:bg-green-100 transition"
                        >
                          {copiedIndex === 99 ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
