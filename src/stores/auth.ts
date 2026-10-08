import { create } from 'zustand';
import type { User } from '@/types';

const tokenKey = 'cms_token';
const userKey = 'cms_user';

function readStoredUser(): User | null {
  try {
    const stored = localStorage.getItem(userKey);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

interface AuthState {
  token: string | null;
  user: User | null;
  setSession: (token: string, user: User) => void;
  setUser: (user: User) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem(tokenKey),
  user: readStoredUser(),
  setSession: (token, user) => {
    localStorage.setItem(tokenKey, token);
    localStorage.setItem(userKey, JSON.stringify(user));
    set({ token, user });
  },
  setUser: (user) => {
    localStorage.setItem(userKey, JSON.stringify(user));
    set({ user });
  },
  clear: () => {
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(userKey);
    set({ token: null, user: null });
  },
}));
