import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
  isVerified: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan?: string;
  isOwner?: boolean;
  role?: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
}

interface AuthState {
  user: User | null;
  workspace: Workspace | null;
  workspaces: Workspace[];
  token: string | null;
  refreshToken: string | null;
  setAuth: (user: User, workspace: Workspace, token: string, refreshToken?: string) => void;
  setWorkspace: (workspace: Workspace) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  addWorkspace: (workspace: Workspace) => void;
  setVerified: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      workspace: null,
      workspaces: [],
      token: null,
      refreshToken: null,
      setAuth: (user, workspace, token, _refreshToken?) => {
        document.cookie = `auth-token=${token}; path=/; max-age=${15 * 60}`;
        // Refresh token is NOT stored in JS-readable storage anymore — it lives
        // in the HttpOnly cookie set by the API. Keeping it out of localStorage
        // caps the blast radius of any XSS (completes security fix H-3).
        set({ user, workspace, token, refreshToken: null });
      },
      setWorkspace: (workspace) => set({ workspace }),
      setWorkspaces: (workspaces) => set({ workspaces }),
      addWorkspace: (workspace) =>
        set((state) => ({ workspaces: [...state.workspaces, workspace] })),
      setVerified: () =>
        set((state) => ({
          user: state.user ? { ...state.user, isVerified: true } : null,
        })),
      logout: () => {
        // Best-effort server-side logout: clears the HttpOnly refresh cookie and
        // revokes all refresh tokens for this user. Fire-and-forget so the UI
        // logs out instantly even if the network call fails.
        try {
          const token = (useAuthStore.getState() as AuthState).token;
          const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
          fetch(`${base}/auth/logout`, {
            method: 'POST',
            credentials: 'include',
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          }).catch(() => {});
        } catch {
          // ignore — always proceed to clear local state
        }
        document.cookie = 'auth-token=; path=/; max-age=0';
        set({ user: null, workspace: null, workspaces: [], token: null, refreshToken: null });
      },
    }),
    { name: 'auth-storage' }
  )
);
