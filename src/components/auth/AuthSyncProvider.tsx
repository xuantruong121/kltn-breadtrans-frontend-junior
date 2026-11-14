"use client";

import { useEffect } from "react";
import { createAuthSync, type AuthChannel } from "@/lib/auth/authSync";
import { refreshAccessToken } from "@/lib/auth/refreshSession";
import { useAuthStore } from "@/stores/authStore";
import { useAuthSyncStore } from "@/stores/authSyncStore";

const tabId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * Starts the session of this tab and keeps the tabs in step. The access token
 * lives in memory (owner 2026-11-14), so a tab that opens with a known user
 * first asks the refresh cookie for a token; route guards wait for that
 * ("settled") before sending anyone to /login. Afterwards a sign-in or refresh
 * is shared with the other tabs, and a sign-out ends the account in all of
 * them. Renders nothing.
 */
export function AuthSyncProvider() {
  useEffect(() => {
    const markSettled = useAuthSyncStore.getState().markSettled;
    let applyingRemote = false;

    const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("breadtrans-auth");
    const sync = channel
      ? createAuthSync({
          channel: channel as unknown as AuthChannel,
          tabId: tabId(),
          getUserId: () => useAuthStore.getState().user?.id ?? null,
          adoptToken: (accessToken) => {
            applyingRemote = true;
            try {
              useAuthStore.getState().setAccessToken(accessToken);
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
        })
      : null;

    const unsubscribe = useAuthStore.subscribe((next, prev) => {
      if (applyingRemote || !sync) return;
      if (next.user && next.accessToken && next.accessToken !== prev.accessToken)
        sync.announceToken(next.user.id, next.accessToken);
      else if (!next.user && prev.user) sync.announceLogout(prev.user.id);
    });

    // A known user without a token: renew from the cookie before the guards decide.
    const { user, accessToken } = useAuthStore.getState();
    if (user && !accessToken) {
      refreshAccessToken()
        .catch(() => {
          useAuthStore.getState().logout();
        })
        .finally(markSettled);
    } else {
      markSettled();
    }

    return () => {
      unsubscribe();
      sync?.dispose();
    };
  }, []);
  return null;
}
