'use client';

import { useState } from 'react';
import { Trash2, Clock, CheckCircle, AlertCircle, FileText, MoreVertical, RefreshCw, Edit2, X, Send, ClipboardCheck } from 'lucide-react';
import { deletePostAction, retryPostAction, publishNowAction } from '@/actions/scheduler.actions';
import EditPostModal from '@/components/scheduler/EditPostModal';
import SendApprovalModal from '@/components/scheduler/SendApprovalModal';

const platformIcons: Record<string, string> = {
  FACEBOOK: '📘', INSTAGRAM: '📸', TWITTER: '🐦',
  LINKEDIN: '💼', TIKTOK: '🎵', YOUTUBE: '▶️', THREADS: '🧵',
};

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
  DRAFT:     { icon: FileText,      color: 'text-slate-500 bg-slate-100',  label: 'Draft' },
  SCHEDULED: { icon: Clock,         color: 'text-blue-600 bg-blue-100',    label: 'Scheduled' },
  PUBLISHED: { icon: CheckCircle,   color: 'text-green-600 bg-green-100',  label: 'Published' },
  FAILED:            { icon: AlertCircle,   color: 'text-red-600 bg-red-100',      label: 'Failed' },
  PENDING_APPROVAL:  { icon: ClipboardCheck, color: 'text-purple-600 bg-purple-100', label: 'Pending Approval' },
};

interface Props {
  post: any;
  accounts: any[];       // all workspace social accounts — needed for EditPostModal
  onDeleted?: (id: string) => void;
  onUpdate?: () => void;
}

export default function PostCard({ post, accounts, onDeleted, onUpdate }: Props) {
  const [deleting, setDeleting] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [publishingNow, setPublishingNow] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [editMode, setEditMode] = useState<'edit' | 'duplicate' | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  const status = statusConfig[post.status] || statusConfig.DRAFT;
  const StatusIcon = status.icon;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deletePostAction(post.id);
      onDeleted?.(post.id);
    } catch (err) { console.error(err); }
    finally { setDeleting(false); }
  };

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await retryPostAction(post.id);
      onUpdate?.();
    } catch (err) { console.error(err); }
    finally { setRetrying(false); }
  };

  const handlePublishNow = async () => {
    setPublishingNow(true);
    try {
      await publishNowAction(post.id);
      onUpdate?.();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to publish');
    } finally { setPublishingNow(false); }
  };

  return (
    <>
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
                <div className="absolute right-0 top-8 bg-white border border-slate-200 rounded-xl shadow-lg z-10 overflow-hidden min-w-[150px]">
                  {(post.status === 'DRAFT' || post.status === 'SCHEDULED') && (
                    <button onClick={() => { handlePublishNow(); setShowMenu(false); }} disabled={publishingNow}
                      className="flex items-center gap-2 px-4 py-2.5 text-green-600 hover:bg-green-50 text-sm w-full">
                      <Send className="w-4 h-4" /> {publishingNow ? 'Publishing...' : 'Publish Now'}
                    </button>
                  )}
                  {(post.status === 'DRAFT' || post.status === 'SCHEDULED') && (
                    <button onClick={() => { setShowApprovalModal(true); setShowMenu(false); }}
                      className="flex items-center gap-2 px-4 py-2.5 text-purple-600 hover:bg-purple-50 text-sm w-full">
                      <ClipboardCheck className="w-4 h-4" /> Send for Approval
                    </button>
                  )}
                  <button onClick={() => { setEditMode('edit'); setShowMenu(false); }}
                    className="flex items-center gap-2 px-4 py-2.5 text-slate-600 hover:bg-slate-50 text-sm w-full">
                    <Edit2 className="w-4 h-4" /> Edit
                  </button>
                  <button onClick={() => { setEditMode('duplicate'); setShowMenu(false); }}
                    className="flex items-center gap-2 px-4 py-2.5 text-slate-600 hover:bg-slate-50 text-sm w-full">
                    <X className="w-4 h-4 rotate-45" /> Duplicate
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

        {/* Content */}
        <p className="text-slate-700 text-sm leading-relaxed mb-3 line-clamp-3">{post.content}</p>

        {/* Media thumbnails */}
        {post.mediaUrls?.length > 0 && (
          <div className="flex gap-2 mb-3">
            {post.mediaUrls.slice(0, 3).map((url: string, i: number) => (
              url.match(/\.(mp4|mov|avi|webm)$/i) ? (
                <div key={i} className="relative w-16 h-16 bg-slate-900 rounded-lg border border-slate-100 flex items-center justify-center overflow-hidden">
                  <video src={url} className="w-full h-full object-cover" muted playsInline />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                      <span style={{ fontSize: 8, marginLeft: 1 }}>▶</span>
                    </div>
                  </div>
                </div>
              ) : (
                <img key={i} src={url} alt="" className="w-16 h-16 object-cover rounded-lg border border-slate-100" />
              )
            ))}
            {post.mediaUrls.length > 3 && (
              <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center text-xs text-slate-500 font-medium">
                +{post.mediaUrls.length - 3}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
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
      </div>

      {/* Full edit / duplicate modal */}
      {editMode && (
        <EditPostModal
          post={post}
          accounts={accounts}
          mode={editMode}
          onClose={() => setEditMode(null)}
          onSaved={() => { onUpdate?.(); setEditMode(null); }}
        />
      )}

      {/* Send for Approval modal */}
      {showApprovalModal && (
        <SendApprovalModal
          post={post}
          onClose={() => setShowApprovalModal(false)}
          onSent={() => { setShowApprovalModal(false); onUpdate?.(); }}
        />
      )}
    </>
  );
}
