'use client';

import { useState } from 'react';
import { X, Calendar, Send, FileText } from 'lucide-react';
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
  const [charCount, setCharCount] = useState(0);

  const handleSubmit = async (status: 'DRAFT' | 'SCHEDULED') => {
    if (!form.content.trim()) return;
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

  const selectedAccount = accounts.find(a => a.id === form.socialAccountId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl">
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
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Post to
            </label>
            <div className="flex flex-wrap gap-2">
              {accounts.map(account => (
                <button
                  key={account.id}
                  onClick={() => setForm({ ...form, socialAccountId: account.id })}
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

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Content
            </label>
            <div className="relative">
              <textarea
                value={form.content}
                onChange={e => {
                  setForm({ ...form, content: e.target.value });
                  setCharCount(e.target.value.length);
                }}
                rows={5}
                placeholder="What do you want to share?"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
              />
              <span className={`absolute bottom-3 right-3 text-xs ${charCount > 280 ? 'text-red-500' : 'text-slate-400'}`}>
                {charCount}/280
              </span>
            </div>
          </div>

          {/* Preview */}
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
                    <p className="text-xs text-slate-400">
                      {platformIcons[selectedAccount.platform]} {selectedAccount.platform}
                    </p>
                  </div>
                </div>
                <p className="text-slate-700 text-sm whitespace-pre-wrap">{form.content}</p>
              </div>
            </div>
          )}

          {/* Schedule */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Schedule for (optional)
            </label>
            <input
              type="datetime-local"
              value={form.scheduledAt}
              onChange={e => setForm({ ...form, scheduledAt: e.target.value })}
              className="px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-100">
          <button
            onClick={() => handleSubmit('DRAFT')}
            disabled={loading || !form.content.trim()}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            Save as Draft
          </button>
          <button
            onClick={() => handleSubmit(form.scheduledAt ? 'SCHEDULED' : 'DRAFT')}
            disabled={loading || !form.content.trim() || !form.socialAccountId}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            {form.scheduledAt ? (
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
