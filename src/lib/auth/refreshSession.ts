import axios from "axios";

import { useAuthStore } from "@/stores/authStore";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
/** Required by POST /auth/refresh: a cross-site form cannot set it. */
export const CSRF_HEADER = { "X-Requested-With": "breadtrans" } as const;

let inFlight: Promise<string> | null = null;

/**
 * A new access token from the HttpOnly refresh cookie (owner 2026-11-14).
 * One request at a time in this tab, and across tabs through the Web Locks
 * API: a tab that waited for the lock first checks whether another tab
 * already broadcast a fresh token (see AuthSyncProvider) before refreshing,
 * so tabs do not rotate the cookie under each other.
 *
 * `stale` is the token that was just rejected, if any. Throws when the
 * cookie is missing, expired or revoked.
 */
export function refreshAccessToken(stale?: string | null): Promise<string> {
  if (inFlight) return inFlight;
  inFlight = withLock(async () => {
    const current = useAuthStore.getState().accessToken;
    if (current && current !== stale) return current;
    const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true, headers: CSRF_HEADER });
    const data = res.data?.data ?? res.data;
    if (!data?.access_token) throw new Error("Phản hồi làm mới phiên không hợp lệ.");
    const state = useAuthStore.getState();
    if (data.user) state.setAuth(data.access_token, { ...data.user, profile: data.user.profile ?? state.user?.profile });
    else state.setAccessToken(data.access_token);
    return data.access_token as string;
  }).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

function withLock<T>(task: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== "undefined" ? (navigator as Navigator & { locks?: LockManager }).locks : undefined;
  return locks?.request ? (locks.request("breadtrans-auth-refresh", task) as Promise<T>) : task();
}
