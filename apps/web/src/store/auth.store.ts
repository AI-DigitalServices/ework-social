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
      setAuth: (user, workspace, token, refreshToken?) => {
        document.cookie = `auth-token=${token}; path=/; max-age=${15 * 60}`;
        set({ user, workspace, token, refreshToken: refreshToken || null });
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
        document.cookie = 'auth-token=; path=/; max-age=0';
        set({ user: null, workspace: null, workspaces: [], token: null, refreshToken: null });
      },
    }),
    { name: 'auth-storage' }
  )
);
