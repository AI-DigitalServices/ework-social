'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { X, Search, Loader2, Film, Check } from 'lucide-react';

type Asset = {
  id: string;
  kind: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT';
  url: string;
  fileName?: string | null;
  tags: string[];
};

// Lets a post composer pull an existing Creative Hub asset instead of
// uploading a fresh file every time. Only IMAGE/VIDEO are shown — audio and
// documents aren't postable media.
export default function AssetPickerModal({
  workspaceId,
  onSelect,
  onClose,
}: {
  workspaceId: string;
  onSelect: (urls: string[]) => void;
  onClose: () => void;
}) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [imgs, vids] = await Promise.all([
        api.get(`/assets/${workspaceId}`, { params: { kind: 'IMAGE' } }),
        api.get(`/assets/${workspaceId}`, { params: { kind: 'VIDEO' } }),
      ]);
      setAssets([...(imgs.data || []), ...(vids.data || [])]);
    } catch {
      // best-effort — leave list empty on failure rather than blocking the composer
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = async () => {
    if (!query.trim()) { load(); return; }
    setSearching(true);
    try {
      const res = await api.get(`/assets/${workspaceId}/search`, { params: { q: query.trim() } });
      setAssets((res.data || []).filter((a: Asset) => a.kind === 'IMAGE' || a.kind === 'VIDEO'));
    } catch {
      // leave current list on failure
    } finally {
      setSearching(false);
    }
  };

  const toggle = (asset: Asset) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(asset.url)) next.delete(asset.url); else next.add(asset.url);
      return next;
    });
  };

  const confirm = () => {
    onSelect(Array.from(selected));
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Choose from Creative Hub</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
              placeholder="Search your assets..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading || searching ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : assets.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-16">No assets found. Upload some in Creative Hub first.</p>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {assets.map((asset) => {
                const isSelected = selected.has(asset.url);
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => toggle(asset)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition ${
                      isSelected ? 'border-blue-600' : 'border-transparent hover:border-slate-200'
                    }`}
                  >
                    {asset.kind === 'IMAGE' ? (
                      <img src={asset.url} alt={asset.fileName || ''} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                        <Film className="w-6 h-6 text-slate-400" />
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-4 border-t border-slate-100">
          <span className="text-xs text-slate-500">{selected.size} selected</span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-lg">
              Cancel
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={selected.size === 0}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg"
            >
              Add {selected.size > 0 ? `(${selected.size})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
