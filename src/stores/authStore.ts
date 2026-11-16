import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface User {
  id: number;
  email: string;
  role: string;
  profile?: any;
  /** The backend asks this account to accept the current terms (owner 2026-11-16). */
  consentRequired?: boolean;
}

interface AuthState {
  /** In memory only (owner 2026-11-14): page scripts can read storage, so no token is kept there. */
  accessToken: string | null;
  /** Who is signed in, kept for the first paint; the refresh cookie decides whether it is still valid. */
  user: User | null;
  setAuth: (accessToken: string, user: User) => void;
  setAccessToken: (accessToken: string) => void;
  setProfile: (profile: any) => void;
  markConsentAccepted: () => void;
  logout: () => void;
}

import { useGamificationStore } from "./gamificationStore";

export const AUTH_STORAGE_KEY = "auth-storage-junior";

/**
 * Leftovers of the old token storage: tokens in localStorage or
 * sessionStorage, the per-browser device id and the persistence mode. Removed
 * once; the refresh token now lives in an HttpOnly cookie.
 */
function forgetStoredTokens() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
    window.sessionStorage.removeItem("breadtrans:auth-persistence-mode");
    window.localStorage.removeItem("deviceId");
  } catch {
    // storage blocked: nothing was stored there either
  }
}
forgetStoredTokens();

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setAuth: (accessToken, user) => set({ accessToken, user }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setProfile: (profile) =>
        set((state) => ({
          user: state.user ? { ...state.user, profile } : null,
        })),
      markConsentAccepted: () =>
        set((state) => ({
          user: state.user ? { ...state.user, consentRequired: false } : null,
        })),
      logout: () => {
        try {
          useGamificationStore.getState().reset();
        } catch {}
        set({ accessToken: null, user: null });
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      // v2: only the user is stored; an older entry with tokens is reduced to its user.
      version: 2,
      storage: createJSONStorage(() => window.localStorage),
      partialize: (state) => ({ user: state.user }),
      migrate: (persisted) => ({ user: (persisted as { user?: User | null } | null)?.user ?? null }),
    },
  ),
);
