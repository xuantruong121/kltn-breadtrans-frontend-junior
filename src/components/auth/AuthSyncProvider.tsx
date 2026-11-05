"use client";

import { useEffect } from "react";
import { createAuthSync, type AuthChannel, type AuthSnapshot } from "@/lib/auth/authSync";
import { getAuthPersistenceMode, setAuthPersistenceMode, useAuthStore } from "@/stores/authStore";
import { useAuthSyncStore } from "@/stores/authSyncStore";

/** Longest wait for an open tab to answer before treating this tab as signed out. */
const ASK_TIMEOUT_MS = 400;

const tabId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** Keeps sign-in, token refresh and sign-out in step across this browser's tabs. Renders nothing. */
export function AuthSyncProvider() {
  useEffect(() => {
    const markSettled = useAuthSyncStore.getState().markSettled;
    if (typeof BroadcastChannel === "undefined") {
      markSettled();
      return;
    }
    const channel = new BroadcastChannel("breadtrans-auth");
    let applyingRemote = false;
    const snapshot = (): AuthSnapshot | null => {
      const s = useAuthStore.getState();
      return s.accessToken && s.refreshToken && s.user
        ? { accessToken: s.accessToken, refreshToken: s.refreshToken, user: s.user }
        : null;
    };
    const sync = createAuthSync({
      channel: channel as unknown as AuthChannel,
      tabId: tabId(),
      getAuth: snapshot,
      getMode: getAuthPersistenceMode,
      adopt: (auth, mode) => {
        applyingRemote = true;
        try {
          setAuthPersistenceMode(mode === "local");
          useAuthStore.getState().setAuth(auth.accessToken, auth.refreshToken, auth.user);
        } finally {
          applyingRemote = false;
        }
      },
      remoteLogout: () => {
        applyingRemote = true;
        try {
          useAuthStore.getState().logout();
          window.dispatchEvent(new Event("breadtrans:logout"));
        } finally {
          applyingRemote = false;
        }
      },
    });
    const unsubscribe = useAuthStore.subscribe((next, prev) => {
      if (applyingRemote) return;
      if (next.accessToken && next.accessToken !== prev.accessToken) sync.announce();
      else if (!next.user && prev.user) sync.announceLogout(prev.user.id);
    });
    void sync.askOthers(ASK_TIMEOUT_MS).finally(markSettled);
    return () => {
      unsubscribe();
      sync.dispose();
    };
  }, []);
  return null;
}
