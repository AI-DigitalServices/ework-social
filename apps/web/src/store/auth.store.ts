import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
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
  setAuth: (user: User, workspace: Workspace, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      workspace: null,
      token: null,
      setAuth: (user, workspace, token) => {
        // Also set cookie for middleware
        document.cookie = `auth-token=${token}; path=/; max-age=${7 * 24 * 60 * 60}`;
        set({ user, workspace, token });
      },
      logout: () => {
        // Clear cookie
        document.cookie = 'auth-token=; path=/; max-age=0';
        set({ user: null, workspace: null, token: null });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
