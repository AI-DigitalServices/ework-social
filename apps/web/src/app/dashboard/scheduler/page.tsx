'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { getPostsAction, getSocialAccountsAction, createMockAccountAction } from '@/actions/scheduler.actions';
import PostCard from '@/components/scheduler/PostCard';
import CreatePostModal from '@/components/scheduler/CreatePostModal';
import CalendarView from '@/components/scheduler/CalendarView';
import {
  Plus, LayoutGrid, Calendar, Clock, CheckCircle,
  FileText, Share2, Zap,
} from 'lucide-react';

export default function SchedulerPage() {
  const { workspace } = useAuthStore();
  const [posts, setPosts] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [view, setView] = useState<'grid' | 'calendar'>('grid');
  const [filter, setFilter] = useState('ALL');
  const [addingMock, setAddingMock] = useState(false);

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

  const handleAddMockAccount = async (platform: string) => {
    setAddingMock(true);
    try {
      const account = await createMockAccountAction(
        workspace!.id,
        platform,
        `@myagency_${platform.toLowerCase()}`
      );
      setAccounts(prev => [...prev, account]);
    } catch (err) {
      console.error(err);
    } finally {
      setAddingMock(false);
    }
  };

  const handlePostCreated = (post: any) => {
    setPosts(prev => [post, ...prev]);
  };

  const handlePostDeleted = (id: string) => {
    setPosts(prev => prev.filter(p => p.id !== id));
  };

  const filteredPosts = filter === 'ALL'
    ? posts
    : posts.filter(p => p.status === filter);

  const stats = [
    { label: 'Total Posts', value: posts.length, icon: FileText, color: 'text-slate-600 bg-slate-100' },
    { label: 'Scheduled', value: posts.filter(p => p.status === 'SCHEDULED').length, icon: Clock, color: 'text-blue-600 bg-blue-100' },
    { label: 'Published', value: posts.filter(p => p.status === 'PUBLISHED').length, icon: CheckCircle, color: 'text-green-600 bg-green-100' },
    { label: 'Drafts', value: posts.filter(p => p.status === 'DRAFT').length, icon: FileText, color: 'text-yellow-600 bg-yellow-100' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Post Scheduler</h2>
          <p className="text-slate-500 mt-1">Create and schedule posts across all platforms.</p>
        </div>
        <button
          onClick={() => accounts.length > 0 ? setShowCreateModal(true) : null}
          disabled={accounts.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Create Post
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                <p className="text-slate-500 text-xs">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* No accounts state */}
      {accounts.length === 0 && !loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Share2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-blue-800">No social accounts connected</p>
              <p className="text-blue-600 text-sm">Add a demo account to start creating posts</p>
            </div>
          </div>
          <div className="flex gap-2">
            {['FACEBOOK', 'INSTAGRAM'].map(platform => (
              <button
                key={platform}
                onClick={() => handleAddMockAccount(platform)}
                disabled={addingMock}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
              >
                {platform === 'FACEBOOK' ? '📘' : '📸'} Add {platform}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Connected accounts */}
      {accounts.length > 0 && (
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {accounts.map(account => (
            <div key={account.id} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-sm">
              <span>{account.platform === 'FACEBOOK' ? '📘' : account.platform === 'INSTAGRAM' ? '📸' : '📱'}</span>
              <span className="font-medium text-slate-700">{account.accountName}</span>
              <span className="w-2 h-2 bg-green-400 rounded-full" />
            </div>
          ))}
        </div>
      )}

      {/* View controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'DRAFT', label: 'Drafts' },
            { id: 'SCHEDULED', label: 'Scheduled' },
            { id: 'PUBLISHED', label: 'Published' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                filter === f.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView('grid')}
            className={`p-2 rounded-lg transition ${view === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`p-2 rounded-lg transition ${view === 'calendar' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
          >
            <Calendar className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading posts...</div>
      ) : view === 'calendar' ? (
        <CalendarView posts={posts} />
      ) : filteredPosts.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-16 text-center">
          <Zap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800 mb-2">No posts yet</h3>
          <p className="text-slate-500 mb-6">
            {accounts.length === 0
              ? 'Connect a social account first to create posts.'
              : 'Create your first post to get started.'}
          </p>
          {accounts.length > 0 && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition"
            >
              Create Your First Post
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPosts.map(post => (
            <PostCard key={post.id} post={post} onDeleted={handlePostDeleted} />
          ))}
        </div>
      )}

      {/* Modal */}
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
