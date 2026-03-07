'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { getPostsAction, getSocialAccountsAction } from '@/actions/scheduler.actions';
import PostCard from '@/components/scheduler/PostCard';
import CreatePostModal from '@/components/scheduler/CreatePostModal';
import CalendarView from '@/components/scheduler/CalendarView';
import { Plus, LayoutGrid, Calendar, Clock, CheckCircle, FileText, Share2, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SchedulerPage() {
  const { workspace } = useAuthStore();
  const router = useRouter();
  const [posts, setPosts] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [view, setView] = useState<'grid' | 'calendar'>('grid');
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    if (workspace?.id) loadData();
  }, [workspace?.id]);

  const loadData = async () => {
    try {
      const [postsData, accountsData] = await Promise.all([
        getPostsAction(workspace!.id),
        getSocialAccountsAction(workspace!.id),
      ]);
      setPosts(postsData);
      setAccounts(accountsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePostCreated = (post: any) => {
    setPosts(prev => [post, ...prev]);
  };

  const filteredPosts = filter === 'ALL' ? posts : posts.filter(p => p.status === filter);

  const stats = {
    total: posts.length,
    scheduled: posts.filter(p => p.status === 'SCHEDULED').length,
    published: posts.filter(p => p.status === 'PUBLISHED').length,
    drafts: posts.filter(p => p.status === 'DRAFT').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Post Scheduler</h1>
          <p className="text-slate-500 text-sm mt-1">Create and schedule posts across your connected accounts</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            <button onClick={() => setView('grid')} className={`p-2 rounded-lg transition ${view === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => setView('calendar')} className={`p-2 rounded-lg transition ${view === 'calendar' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
              <Calendar className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={accounts.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Create Post
          </button>
        </div>
      </div>

      {/* No accounts warning */}
      {accounts.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Share2 className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-amber-800">No social accounts connected</p>
              <p className="text-amber-700 text-sm mt-0.5">Connect your Facebook or Instagram account to start scheduling posts.</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/dashboard/settings?tab=social')}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 transition flex-shrink-0"
          >
            <Settings className="w-4 h-4" />
            Connect Account
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Posts', value: stats.total, icon: FileText, color: 'text-slate-600', bg: 'bg-slate-50' },
          { label: 'Scheduled', value: stats.scheduled, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Published', value: stats.published, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Drafts', value: stats.drafts, icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(stat => (
          <div key={stat.label} className={`${stat.bg} rounded-xl p-4 border border-slate-100`}>
            <div className="flex items-center gap-3">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
              <div>
                <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Connected accounts bar */}
      {accounts.length > 0 && (
        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Posting to:</p>
          <div className="flex flex-wrap gap-2">
            {accounts.map(account => (
              <span key={account.id} className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-700">
                {account.platform === 'FACEBOOK' ? '📘' : account.platform === 'INSTAGRAM' ? '📸' : '📱'}
                {account.accountName}
              </span>
            ))}
          </div>
          <button
            onClick={() => router.push('/dashboard/settings?tab=social')}
            className="ml-auto text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            Manage →
          </button>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        {['ALL', 'DRAFT', 'SCHEDULED', 'PUBLISHED', 'FAILED'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              filter === status ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300'
            }`}
          >
            {status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
            {status !== 'ALL' && (
              <span className="ml-1.5 text-xs opacity-75">
                ({posts.filter(p => p.status === status).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {view === 'calendar' ? (
        <CalendarView posts={filteredPosts} />
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-slate-400" />
          </div>
          <p className="font-semibold text-slate-700">No posts yet</p>
          <p className="text-slate-400 text-sm mt-1">
            {accounts.length === 0 ? 'Connect a social account first' : 'Create your first post to get started'}
          </p>
          {accounts.length > 0 && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition"
            >
              Create First Post
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPosts.map(post => (
            <PostCard key={post.id} post={post} onUpdate={loadData} />
          ))}
        </div>
      )}

      {/* Create Post Modal */}
      {showCreateModal && (
        <CreatePostModal
          accounts={accounts}
          onClose={() => setShowCreateModal(false)}
          onCreated={handlePostCreated}
        />
      )}
    </div>
  );
}
