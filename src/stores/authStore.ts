import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

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

import { useGamificationStore } from "./gamificationStore";

const AUTH_STORAGE_KEY = "auth-storage-junior";
const AUTH_PERSISTENCE_MODE_KEY = "breadtrans:auth-persistence-mode";

const authStorage = {
  getItem: (name: string) => {
    if (typeof window === "undefined") return null;

    const useSessionStorage =
      window.sessionStorage.getItem(AUTH_PERSISTENCE_MODE_KEY) === "session";
    return (useSessionStorage ? window.sessionStorage : window.localStorage).getItem(
      name,
    );
  },
  setItem: (name: string, value: string) => {
    if (typeof window === "undefined") return;

    const useSessionStorage =
      window.sessionStorage.getItem(AUTH_PERSISTENCE_MODE_KEY) === "session";
    if (useSessionStorage) {
      window.sessionStorage.setItem(name, value);
      window.localStorage.removeItem(name);
    } else {
      window.localStorage.setItem(name, value);
      window.sessionStorage.removeItem(name);
    }
  },
  removeItem: (name: string) => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(name);
    window.sessionStorage.removeItem(name);
  },
};

/** Select where the current login session survives: tab refresh or browser restart. */
export function setAuthPersistenceMode(rememberMe: boolean) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    AUTH_PERSISTENCE_MODE_KEY,
    rememberMe ? "local" : "session",
  );
  if (rememberMe) {
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
  } else {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setAuth: (accessToken, refreshToken, user) =>
        set({ accessToken, refreshToken, user }),
      setProfile: (profile) =>
        set((state) => ({
          user: state.user ? { ...state.user, profile } : null,
        })),
      logout: () => {
        try {
          useGamificationStore.getState().reset();
        } catch {}
        set({ accessToken: null, refreshToken: null, user: null });
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => authStorage),
    },
  ),
);
