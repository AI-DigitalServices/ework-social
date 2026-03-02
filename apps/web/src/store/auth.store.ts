import { create } from 'zustand';

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
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, workspace: Workspace, accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  workspace: null,
  accessToken: null,
  isAuthenticated: false,

  setAuth: (user, workspace, accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    set({ user, workspace, accessToken, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, workspace: null, accessToken: null, isAuthenticated: false });
  },
}));
