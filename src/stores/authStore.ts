import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  email: string;
  role: string;
  profile?: any;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  setAuth: (accessToken: string, refreshToken: string, user: User) => void;
  setProfile: (profile: any) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setAuth: (accessToken, refreshToken, user) => set({ accessToken, refreshToken, user }),
      setProfile: (profile) => set((state) => ({ user: state.user ? { ...state.user, profile } : null })),
      logout: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    {
      name: 'auth-storage-junior', // unique name
    }
  )
);
