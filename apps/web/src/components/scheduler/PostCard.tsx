'use client';

import { useState } from 'react';
import { Trash2, Clock, CheckCircle, AlertCircle, FileText, MoreVertical, RefreshCw, Copy, Edit2, X, Save, Image } from 'lucide-react';
import { deletePostAction, updatePostAction, createPostAction } from '@/actions/scheduler.actions';
import { useAuthStore } from '@/store/auth.store';

const platformIcons: Record<string, string> = {
  FACEBOOK: '📘', INSTAGRAM: '📸', TWITTER: '🐦',
  LINKEDIN: '💼', TIKTOK: '🎵', YOUTUBE: '▶️',
};

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
  DRAFT: { icon: FileText, color: 'text-slate-500 bg-slate-100', label: 'Draft' },
  SCHEDULED: { icon: Clock, color: 'text-blue-600 bg-blue-100', label: 'Scheduled' },
  PUBLISHED: { icon: CheckCircle, color: 'text-green-600 bg-green-100', label: 'Published' },
  FAILED: { icon: AlertCircle, color: 'text-red-600 bg-red-100', label: 'Failed' },
};

interface Props {
  post: any;
  onDeleted?: (id: string) => void;
  onUpdate?: () => void;
}

export default function PostCard({ post, onDeleted, onUpdate }: Props) {
  const { workspace } = useAuthStore();
  const [deleting, setDeleting] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [editSchedule, setEditSchedule] = useState(post.scheduledAt ? new Date(post.scheduledAt).toISOString().slice(0,16) : '');
  const [saving, setSaving] = useState(false);

  const status = statusConfig[post.status] || statusConfig.DRAFT;
  const StatusIcon = status.icon;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deletePostAction(post.id);
      if (onDeleted) onDeleted(post.id);
    } catch (err) { console.error(err); }
    finally { setDeleting(false); }
  };

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await updatePostAction(post.id, { status: 'SCHEDULED' });
      if (onUpdate) onUpdate();
    } catch (err) { console.error(err); }
    finally { setRetrying(false); }
  };

  const handleDuplicate = async () => {
    setDuplicating(true);
    try {
      await createPostAction({
        workspaceId: workspace!.id,
        socialAccountId: post.socialAccountId,
        content: post.content,
        mediaUrls: post.mediaUrls || [],
        status: 'DRAFT',
      });
      if (onUpdate) onUpdate();
    } catch (err) { console.error(err); }
    finally { setDuplicating(false); setShowMenu(false); }
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await updatePostAction(post.id, {
        content: editContent,
        scheduledAt: editSchedule || null,
        status: editSchedule ? 'SCHEDULED' : 'DRAFT',
      });
      setEditing(false);
      if (onUpdate) onUpdate();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{platformIcons[post.socialAccount?.platform] || '📱'}</span>
          <div>
            <p className="text-sm font-semibold text-slate-800">{post.socialAccount?.accountName}</p>
            <p className="text-xs text-slate-400">{post.socialAccount?.platform}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
            <StatusIcon className="w-3 h-3" />{status.label}
          </span>
          {/* Retry button for failed posts */}
          {post.status === 'FAILED' && (
            <button onClick={handleRetry} disabled={retrying}
              className="flex items-center gap-1 px-2.5 py-1 bg-orange-100 text-orange-600 rounded-full text-xs font-medium hover:bg-orange-200 transition disabled:opacity-50">
              <RefreshCw className={`w-3 h-3 ${retrying ? 'animate-spin' : ''}`} />
              {retrying ? 'Retrying...' : 'Retry'}
            </button>
          )}
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="p-1.5 hover:bg-slate-100 rounded-lg transition">
              <MoreVertical className="w-4 h-4 text-slate-400" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-8 bg-white border border-slate-200 rounded-xl shadow-lg z-10 overflow-hidden min-w-[140px]">
                <button onClick={() => { setEditing(true); setShowMenu(false); }}
                  className="flex items-center gap-2 px-4 py-2.5 text-slate-600 hover:bg-slate-50 text-sm w-full">
                  <Edit2 className="w-4 h-4" /> Edit
                </button>
                <button onClick={handleDuplicate} disabled={duplicating}
                  className="flex items-center gap-2 px-4 py-2.5 text-slate-600 hover:bg-slate-50 text-sm w-full">
                  <Copy className="w-4 h-4" /> {duplicating ? 'Duplicating...' : 'Duplicate'}
                </button>
                <button onClick={() => { handleDelete(); setShowMenu(false); }} disabled={deleting}
                  className="flex items-center gap-2 px-4 py-2.5 text-red-500 hover:bg-red-50 text-sm w-full">
                  <Trash2 className="w-4 h-4" /> {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit mode */}
      {editing ? (
        <div className="space-y-3">
          <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={4}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          <input type="datetime-local" value={editSchedule} onChange={e => setEditSchedule(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <div className="flex gap-2">
            <button onClick={handleSaveEdit} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50">
              <Save className="w-3.5 h-3.5" />{saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => setEditing(false)}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition">
              <X className="w-3.5 h-3.5" />Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-slate-700 text-sm leading-relaxed mb-3 line-clamp-3">{post.content}</p>
          {/* Media preview */}
          {post.mediaUrls?.length > 0 && (
            <div className="flex gap-2 mb-3">
              {post.mediaUrls.slice(0,3).map((url: string, i: number) => (
                <img key={i} src={url} alt="" className="w-16 h-16 object-cover rounded-lg border border-slate-100" />
              ))}
              {post.mediaUrls.length > 3 && (
                <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center text-xs text-slate-500 font-medium">
                  +{post.mediaUrls.length - 3}
                </div>
              )}
            </div>
          )}
          <div className="flex items-center justify-between pt-3 border-t border-slate-50">
            {post.scheduledAt ? (
              <div className="flex items-center gap-1.5 text-xs text-blue-600">
                <Clock className="w-3.5 h-3.5" />
                {new Date(post.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            ) : (
              <span className="text-xs text-slate-400">No schedule set</span>
            )}
            {post.client && (
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">{post.client.name}</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
