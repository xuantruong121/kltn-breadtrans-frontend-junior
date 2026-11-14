/**
 * Keeps the tabs of one browser in step over a BroadcastChannel-like
 * transport. No React, no storage: the caller passes how to read and apply
 * the session, so the protocol is tested on its own.
 *
 * The refresh token is an HttpOnly cookie shared by every tab (owner
 * 2026-11-14), so a tab never hands over a refresh token. What travels:
 * - a fresh access token after a sign-in or refresh, so the other tabs of the
 *   same account use it instead of rotating the cookie again;
 * - a sign-out, so it ends the same account in every tab.
 */
export type AuthSyncMessage =
  | { type: "token"; from: string; userId: number; accessToken: string }
  | { type: "logout"; from: string; userId: number };

export interface AuthChannel {
  postMessage(message: AuthSyncMessage): void;
  onmessage: ((event: { data: AuthSyncMessage }) => void) | null;
  close(): void;
}

export function createAuthSync(deps: {
  channel: AuthChannel;
  tabId: string;
  /** The signed-in account of this tab, or null. */
  getUserId: () => number | null;
  /** Another tab of the same account has this access token. */
  adoptToken: (accessToken: string) => void;
  /** Another tab signed this account out. */
  remoteLogout: () => void;
}) {
  const { channel, tabId } = deps;

  channel.onmessage = (event) => {
    const message = event?.data;
    if (!message || message.from === tabId) return;
    const mine = deps.getUserId();
    // Another account's events never touch this tab.
    if (mine === null || mine !== message.userId) return;
    if (message.type === "token") deps.adoptToken(message.accessToken);
    else if (message.type === "logout") deps.remoteLogout();
  };

  return {
    announceToken(userId: number, accessToken: string) {
      channel.postMessage({ type: "token", from: tabId, userId, accessToken });
    },
    announceLogout(userId: number) {
      channel.postMessage({ type: "logout", from: tabId, userId });
    },
    dispose() {
      channel.onmessage = null;
      channel.close();
    },
  };
}
