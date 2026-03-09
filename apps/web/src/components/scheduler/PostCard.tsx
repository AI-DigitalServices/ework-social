'use client';

import { useState } from 'react';
import { Trash2, Clock, CheckCircle, AlertCircle, FileText, MoreVertical } from 'lucide-react';
import { deletePostAction } from '@/actions/scheduler.actions';

const platformIcons: Record<string, string> = {
  FACEBOOK: '📘',
  INSTAGRAM: '📸',
  TWITTER: '🐦',
  LINKEDIN: '💼',
  TIKTOK: '🎵',
  YOUTUBE: '▶️',
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
  const [deleting, setDeleting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const status = statusConfig[post.status] || statusConfig.DRAFT;
  const StatusIcon = status.icon;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deletePostAction(post.id);
      onDeleted?.(post.id);
        onUpdate?.();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{platformIcons[post.socialAccount?.platform] || '📱'}</span>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              {post.socialAccount?.accountName}
            </p>
            <p className="text-xs text-slate-400">{post.socialAccount?.platform}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
            <StatusIcon className="w-3 h-3" />
            {status.label}
          </span>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition"
            >
              <MoreVertical className="w-4 h-4 text-slate-400" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-8 bg-white border border-slate-200 rounded-xl shadow-lg z-10 overflow-hidden">
                <button
                  onClick={() => { handleDelete(); setShowMenu(false); }}
                  className="flex items-center gap-2 px-4 py-2.5 text-red-500 hover:bg-red-50 text-sm w-full"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <p className="text-slate-700 text-sm leading-relaxed mb-3 line-clamp-3">
        {post.content}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-50">
        {post.scheduledAt ? (
          <div className="flex items-center gap-1.5 text-xs text-blue-600">
            <Clock className="w-3.5 h-3.5" />
            {new Date(post.scheduledAt).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </div>
        ) : (
          <span className="text-xs text-slate-400">No schedule set</span>
        )}
        {post.client && (
          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
            {post.client.name}
          </span>
        )}
      </div>
    </div>
  );
}

