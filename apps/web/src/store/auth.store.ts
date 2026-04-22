import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
  isVerified: boolean;
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
}

interface AuthState {
  user: User | null;
  workspace: Workspace | null;
  token: string | null;
  refreshToken: string | null;
  setAuth: (user: User, workspace: Workspace, token: string, refreshToken?: string) => void;
  setVerified: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      workspace: null,
      token: null,
      refreshToken: null,
      setAuth: (user, workspace, token, refreshToken?) => {
        document.cookie = `auth-token=${token}; path=/; max-age=${15 * 60}`;
        set({ user, workspace, token, refreshToken: refreshToken || null });
      },
      setVerified: () =>
        set((state) => ({
          user: state.user ? { ...state.user, isVerified: true } : null,
        })),
      logout: () => {
        document.cookie = 'auth-token=; path=/; max-age=0';
        set({ user: null, workspace: null, token: null, refreshToken: null });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
