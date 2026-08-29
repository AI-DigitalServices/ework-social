'use client';

import { libreBaskerville } from '@/lib/fonts';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import { uploadMedia } from '@/lib/supabase';
import {
  Image as ImageIcon, Video, Music, FileText, Upload, Search, Loader2, X, Trash2, Sparkles,
} from 'lucide-react';

type Asset = {
  id: string;
  kind: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT';
  source: 'UPLOADED' | 'GENERATED';
  url: string;
  fileName?: string | null;
  mimeType?: string | null;
  tags: string[];
  createdAt: string;
};

function inferKind(mimeType: string): Asset['kind'] {
  if (mimeType.startsWith('image/')) return 'IMAGE';
  if (mimeType.startsWith('video/')) return 'VIDEO';
  if (mimeType.startsWith('audio/')) return 'AUDIO';
  return 'DOCUMENT';
}

const KIND_ICON: Record<Asset['kind'], any> = {
  IMAGE: ImageIcon, VIDEO: Video, AUDIO: Music, DOCUMENT: FileText,
};

export default function CreativeHubPage() {
  const { workspace } = useAuthStore();
  const workspaceId = workspace?.id;

  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [kindFilter, setKindFilter] = useState<string>('');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadAssets = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const params: any = {};
      if (kindFilter) params.kind = kindFilter;
      const res = await api.get(`/assets/${workspaceId}`, { params });
      setAssets(res.data || []);
    } catch (err) {
      console.error('Failed to load assets:', err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, kindFilter]);

  useEffect(() => { setLoading(true); loadAssets(); }, [loadAssets]);

  const handleSearch = async () => {
    if (!workspaceId) return;
    if (!query.trim()) { loadAssets(); return; }
    setSearching(true);
    try {
      const res = await api.get(`/assets/${workspaceId}/search`, { params: { q: query.trim() } });
      setAssets(res.data || []);
    } catch (err) {
      showToast('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || !workspaceId) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const url = await uploadMedia(file, workspaceId);
        const kind = inferKind(file.type);
        const res = await api.post(`/assets/${workspaceId}`, {
          url, fileName: file.name, mimeType: file.type, sizeBytes: file.size, kind,
        });
        setAssets(prev => [res.data, ...prev]);
      }
      showToast('Uploaded ✓ — tags are generating in the background');
      // Auto-tagging/embedding run async server-side; refresh once they've
      // likely landed so tags show up without the user having to refresh.
      setTimeout(loadAssets, 5000);
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (asset: Asset) => {
    if (!workspaceId) return;
    if (!confirm(`Delete "${asset.fileName || 'this asset'}"? This can't be undone.`)) return;
    try {
      await api.delete(`/assets/${workspaceId}/${asset.id}`);
      setAssets(prev => prev.filter(a => a.id !== asset.id));
      showToast('Deleted ✓');
    } catch {
      showToast('Delete failed');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {toast && (
        <div className="fixed top-6 right-6 bg-slate-900 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-blue-600" />
            <h1 className={`text-3xl font-bold text-slate-900 ${libreBaskerville.className}`}>Creative Hub</h1>
          </div>
          <p className="text-slate-500 text-sm mt-1 max-w-xl">
            Every marketing asset in one searchable library — uploads and AI-generated output alike, auto-tagged on the way in.
          </p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !workspaceId}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-6 mb-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            placeholder="Search by meaning — e.g. 'blue summer sale graphic'"
            className="w-full pl-9 pr-9 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); loadAssets(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={handleSearch}
          disabled={searching}
          className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
        >
          {searching ? 'Searching...' : 'Search'}
        </button>
      </div>

      <div className="flex items-center gap-2 mb-6">
        {['', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT'].map((k) => (
          <button
            key={k || 'all'}
            onClick={() => setKindFilter(k)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              kindFilter === k
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {k || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : assets.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No assets yet. Upload your first image, video, or document to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {assets.map((asset) => {
            const Icon = KIND_ICON[asset.kind];
            return (
              <div key={asset.id} className="group relative bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="aspect-square bg-slate-50 flex items-center justify-center">
                  {asset.kind === 'IMAGE' ? (
                    <img src={asset.url} alt={asset.fileName || ''} className="w-full h-full object-cover" />
                  ) : (
                    <Icon className="w-10 h-10 text-slate-300" />
                  )}
                </div>
                <button
                  onClick={() => handleDelete(asset)}
                  className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </button>
                {asset.source === 'GENERATED' && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    <Sparkles className="w-2.5 h-2.5" /> AI
                  </div>
                )}
                <div className="p-2.5">
                  <p className="text-xs font-semibold text-slate-700 truncate">{asset.fileName || 'Untitled'}</p>
                  {asset.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {asset.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 mt-1.5">Tagging...</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
