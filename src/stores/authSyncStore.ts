import { create } from "zustand";

/**
 * Whether this tab has finished asking the other open tabs for a session.
 * Route guards wait for it before sending a signed-out tab to /login, so a tab
 * opened with "Open in new tab" is not redirected while the answer is on its way.
 */
export const useAuthSyncStore = create<{ settled: boolean; markSettled: () => void }>((set) => ({
  settled: false,
  markSettled: () => set({ settled: true }),
}));
