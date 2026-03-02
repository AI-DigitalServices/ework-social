'use client';

import { useState } from 'react';
import { CheckCircle, Plus, Trash2, ExternalLink } from 'lucide-react';

const platforms = [
  {
    id: 'facebook',
    name: 'Facebook',
    description: 'Pages, posts, analytics & auto-responder',
    color: 'bg-blue-600',
    textColor: 'text-blue-600',
    borderColor: 'border-blue-200',
    bgLight: 'bg-blue-50',
    icon: '📘',
    phase: 1,
  },
  {
    id: 'instagram',
    name: 'Instagram',
    description: 'Feed, Reels, Stories & DM auto-responder',
    color: 'bg-pink-500',
    textColor: 'text-pink-600',
    borderColor: 'border-pink-200',
    bgLight: 'bg-pink-50',
    icon: '📸',
    phase: 1,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Company pages & personal profiles',
    color: 'bg-blue-700',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-300',
    bgLight: 'bg-blue-50',
    icon: '💼',
    phase: 2,
  },
  {
    id: 'twitter',
    name: 'Twitter / X',
    description: 'Tweets, threads & analytics',
    color: 'bg-slate-800',
    textColor: 'text-slate-800',
    borderColor: 'border-slate-300',
    bgLight: 'bg-slate-50',
    icon: '🐦',
    phase: 2,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    description: 'Video posts & analytics',
    color: 'bg-black',
    textColor: 'text-slate-900',
    borderColor: 'border-slate-300',
    bgLight: 'bg-slate-50',
    icon: '🎵',
    phase: 2,
  },
  {
    id: 'youtube',
    name: 'YouTube',
    description: 'Videos, shorts & channel analytics',
    color: 'bg-red-600',
    textColor: 'text-red-600',
    borderColor: 'border-red-200',
    bgLight: 'bg-red-50',
    icon: '▶️',
    phase: 3,
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    description: 'Pins, boards & analytics',
    color: 'bg-red-500',
    textColor: 'text-red-500',
    borderColor: 'border-red-200',
    bgLight: 'bg-red-50',
    icon: '📌',
    phase: 3,
  },
  {
    id: 'threads',
    name: 'Threads',
    description: 'Posts & engagement',
    color: 'bg-slate-900',
    textColor: 'text-slate-900',
    borderColor: 'border-slate-300',
    bgLight: 'bg-slate-50',
    icon: '🧵',
    phase: 3,
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'Broadcasts & auto-responder',
    color: 'bg-green-500',
    textColor: 'text-green-600',
    borderColor: 'border-green-200',
    bgLight: 'bg-green-50',
    icon: '💬',
    phase: 3,
  },
  {
    id: 'telegram',
    name: 'Telegram',
    description: 'Channel posts & bot auto-responder',
    color: 'bg-sky-500',
    textColor: 'text-sky-600',
    borderColor: 'border-sky-200',
    bgLight: 'bg-sky-50',
    icon: '✈️',
    phase: 4,
  },
  {
    id: 'reddit',
    name: 'Reddit',
    description: 'Subreddit posts & community management',
    color: 'bg-orange-500',
    textColor: 'text-orange-600',
    borderColor: 'border-orange-200',
    bgLight: 'bg-orange-50',
    icon: '🤖',
    phase: 4,
  },
];

interface ConnectedAccount {
  platformId: string;
  accountName: string;
  connectedAt: string;
}

export default function SocialAccountsTab() {
  const [connected, setConnected] = useState<ConnectedAccount[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);

  const handleConnect = async (platformId: string) => {
    setConnecting(platformId);
    // Simulate OAuth flow
    await new Promise((r) => setTimeout(r, 1500));
    const platform = platforms.find((p) => p.id === platformId);
    setConnected((prev) => [
      ...prev,
      {
        platformId,
        accountName: `@myagency_${platformId}`,
        connectedAt: new Date().toLocaleDateString(),
      },
    ]);
    setConnecting(null);
  };

  const handleDisconnect = (platformId: string) => {
    setConnected((prev) => prev.filter((a) => a.platformId !== platformId));
  };

  const isConnected = (platformId: string) =>
    connected.some((a) => a.platformId === platformId);

  const getAccount = (platformId: string) =>
    connected.find((a) => a.platformId === platformId);

  const phases = [1, 2, 3, 4];
  const phaseLabels: Record<number, string> = {
    1: '🚀 Phase 1 — Available Now',
    2: '⚡ Phase 2 — Coming Soon',
    3: '🌍 Phase 3 — Roadmap',
    4: '🔮 Phase 4 — Future',
  };

  return (
    <div className="space-y-8">
      {/* Connected count */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="font-semibold text-blue-800">
            {connected.length} of 10 accounts connected
          </p>
          <p className="text-blue-600 text-sm mt-0.5">
            Your current plan allows up to 10 social accounts
          </p>
        </div>
        <div className="w-32 h-2 bg-blue-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all"
            style={{ width: `${(connected.length / 10) * 100}%` }}
          />
        </div>
      </div>

      {/* Platforms by phase */}
      {phases.map((phase) => {
        const phasePlatforms = platforms.filter((p) => p.phase === phase);
        return (
          <div key={phase}>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
              {phaseLabels[phase]}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {phasePlatforms.map((platform) => {
                const account = getAccount(platform.id);
                const connected_ = isConnected(platform.id);
                const isConnecting = connecting === platform.id;
                const isLocked = phase > 1;

                return (
                  <div
                    key={platform.id}
                    className={`border rounded-xl p-5 transition-all ${
                      connected_
                        ? `${platform.borderColor} ${platform.bgLight}`
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{platform.icon}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-800">
                              {platform.name}
                            </p>
                            {connected_ && (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                          </div>
                          <p className="text-slate-500 text-xs mt-0.5">
                            {platform.description}
                          </p>
                          {account && (
                            <p className={`text-xs font-medium mt-1 ${platform.textColor}`}>
                              {account.accountName} · Connected {account.connectedAt}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {connected_ ? (
                          <>
                            <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
                              <ExternalLink className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDisconnect(platform.id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => !isLocked && handleConnect(platform.id)}
                            disabled={isConnecting || isLocked}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                              isLocked
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : isConnecting
                                ? 'bg-blue-100 text-blue-600 cursor-wait'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                          >
                            {isLocked ? (
                              '🔒 Coming Soon'
                            ) : isConnecting ? (
                              'Connecting...'
                            ) : (
                              <>
                                <Plus className="w-3 h-3" />
                                Connect
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
