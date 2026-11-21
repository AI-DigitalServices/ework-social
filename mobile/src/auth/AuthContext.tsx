import * as WebBrowser from 'expo-web-browser';
import { API_URL } from '../config';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  NetworkError,
  refreshAccessToken,
  request,
  setAccessToken,
  setUnauthorizedHandler,
} from '../api/client';
import {
  clearRefreshToken,
  clearWorkspaceId,
  getRefreshToken,
  getWorkspaceId,
  saveRefreshToken,
  saveWorkspaceId,
} from './storage';

export type Entitlements = {
  plan: string;
  planDisplay: string;
  isTrialing: boolean;
  trialDaysLeft: number | null;
  canWrite: boolean;
  readOnlyReason: string | null;
};

export type WorkspaceInfo = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  role: string;
  isOwner: boolean;
  entitlements: Entitlements | null;
};

export type AppConfig = {
  apiVersion: number;
  minSupportedAppVersion: string;
  user: { id: string; name: string; email: string; isVerified: boolean; avatar: string | null };
  workspaces: WorkspaceInfo[];
};

type AuthResponse = { accessToken: string; refreshToken: string };

export type AuthStatus = 'loading' | 'offline' | 'signedOut' | 'needsVerification' | 'ready';

type AuthValue = {
  status: AuthStatus;
  config: AppConfig | null;
  workspace: WorkspaceInfo | null;
  setActiveWorkspace: (id: string) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: { name: string; workspaceName: string; email: string; password: string }) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  retry: () => void;
  checkVerified: () => Promise<boolean>;
  resendVerification: () => Promise<void>;
};

const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  const applyConfig = useCallback(async (cfg: AppConfig) => {
    setConfig(cfg);
    const saved = await getWorkspaceId();
    const pick = cfg.workspaces.find((w) => w.id === saved) ?? cfg.workspaces[0] ?? null;
    setWorkspaceId(pick ? pick.id : null);
    setStatus(cfg.user.isVerified ? 'ready' : 'needsVerification');
  }, []);

  const loadConfig = useCallback(async () => {
    try {
      const cfg = await request<AppConfig>('/mobile/v1/app/config');
      await applyConfig(cfg);
    } catch (e: any) {
      console.log('[auth] config failed:', e?.status, e?.message);
      throw e;
    }
  }, [applyConfig]);

  const bootstrap = useCallback(async () => {
    setStatus('loading');
    try {
      const stored = await getRefreshToken();
      if (!stored) {
        setStatus('signedOut');
        return;
      }
      const token = await refreshAccessToken();
      if (!token) {
        setStatus('signedOut');
        return;
      }
      await loadConfig();
    } catch (err: any) {
      console.log('[auth] bootstrap failed:', err?.status, err?.message);
      setStatus(err instanceof NetworkError ? 'offline' : 'signedOut');
    }
  }, [loadConfig]);

  const clearSession = useCallback(async () => {
    setAccessToken(null);
    await clearRefreshToken();
    await clearWorkspaceId();
    setConfig(null);
    setWorkspaceId(null);
    setStatus('signedOut');
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      console.log('[auth] unauthorized, signing out');
      void clearSession();
    });
    void bootstrap();
    return () => setUnauthorizedHandler(null);
  }, [bootstrap, clearSession]);

  const persist = useCallback(async (r: AuthResponse) => {
    setAccessToken(r.accessToken);
    await saveRefreshToken(r.refreshToken);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const r = await request<AuthResponse>('/auth/login', {
        method: 'POST',
        body: { email: email.trim(), password },
        auth: false,
      });
      await persist(r);
      await loadConfig();
    },
    [persist, loadConfig],
  );

  const signUp = useCallback(
    async (input: { name: string; workspaceName: string; email: string; password: string }) => {
      const r = await request<AuthResponse>('/auth/register', {
        method: 'POST',
        body: {
          name: input.name.trim(),
          workspaceName: input.workspaceName.trim(),
          email: input.email.trim(),
          password: input.password,
        },
        auth: false,
      });
      await persist(r);
      await loadConfig();
    },
    [persist, loadConfig],
  );

  // Google: the browser sheet goes to the API, then Google, then back to the app's return link with a one-time
  // code. The code (not the tokens) travels in the link; one POST swaps it for the real tokens.
  const signInWithGoogle = useCallback(async () => {
    const result = await WebBrowser.openAuthSessionAsync(`${API_URL}/auth/google?client=app`, 'eworksocial://oauth-return');
    if (result.type !== 'success' || !result.url) return; // closed or cancelled: nothing to do
    if (/[?&]google_error=/.test(result.url)) throw new Error('Google sign-in did not finish. Please try again.');
    if (!/[?&]google=1/.test(result.url)) return;
    const code = /[?&]code=([^&#]+)/.exec(result.url)?.[1];
    if (!code) throw new Error('Google sign-in did not finish. Please try again.');
    const r = await request<AuthResponse>('/auth/google/app-exchange', {
      method: 'POST',
      body: { code: decodeURIComponent(code) },
      auth: false,
    });
    await persist(r);
    await loadConfig();
  }, [persist, loadConfig]);

  // Local sign-out only. The server's /auth/logout signs out EVERY device
  // (including the web app), so the phone never calls it.
  const signOut = useCallback(async () => {
    await clearSession();
  }, [clearSession]);

  const setActiveWorkspace = useCallback((id: string) => {
    setWorkspaceId(id);
    void saveWorkspaceId(id);
  }, []);

  const checkVerified = useCallback(async () => {
    const me = await request<{ isVerified: boolean }>('/auth/me');
    if (me.isVerified) {
      await loadConfig();
      return true;
    }
    return false;
  }, [loadConfig]);

  const resendVerification = useCallback(async () => {
    await request('/auth/resend-verification', { method: 'POST' });
  }, []);

  const workspace = useMemo(
    () => config?.workspaces.find((w) => w.id === workspaceId) ?? null,
    [config, workspaceId],
  );

  const value: AuthValue = {
    status,
    config,
    workspace,
    setActiveWorkspace,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    retry: () => void bootstrap(),
    checkVerified,
    resendVerification,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
