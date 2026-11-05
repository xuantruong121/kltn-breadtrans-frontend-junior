/**
 * Keeps the login of the tabs of one browser in step, over a
 * BroadcastChannel-like transport. No React, no storage: the caller passes
 * how to read and apply the session, so the protocol is tested on its own.
 *
 * Why it is needed:
 * - Without "Ghi nhớ đăng nhập" the session lives in sessionStorage, which a
 *   tab opened with "Open in new tab" does not inherit. The new tab asks the
 *   open tabs and takes the session from one of them, so it stays signed in
 *   until the browser closes, which is what "not remembered" means.
 * - Every tab of the browser shares one deviceId, hence one refresh-token slot
 *   on the server, and the server drops the whole session when an old refresh
 *   token is replayed. A tab that refreshes or signs in therefore tells the
 *   others, and a sign-out ends the same account in every tab.
 */
export type AuthSnapshot = {
  accessToken: string;
  refreshToken: string;
  user: { id: number; email: string; role: string; profile?: unknown };
};

/** Where a tab keeps its session: this tab only, or every tab and restart. */
export type PersistMode = "session" | "local";

export type AuthSyncMessage =
  | { type: "ask"; from: string }
  | {
      type: "state";
      from: string;
      /** The tab that asked, or null for a broadcast after sign-in or refresh. */
      to: string | null;
      mode: PersistMode;
      auth: AuthSnapshot;
    }
  | { type: "logout"; from: string; userId: number };

export interface AuthChannel {
  postMessage(message: AuthSyncMessage): void;
  onmessage: ((event: { data: AuthSyncMessage }) => void) | null;
  close(): void;
}

export function createAuthSync(deps: {
  channel: AuthChannel;
  tabId: string;
  getAuth: () => AuthSnapshot | null;
  getMode: () => PersistMode;
  /** Take a session from another tab, kept the way `mode` says. */
  adopt: (auth: AuthSnapshot, mode: PersistMode) => void;
  /** Another tab signed this account out. */
  remoteLogout: () => void;
}) {
  const { channel, tabId } = deps;
  let waiting: ((found: boolean) => void) | null = null;

  channel.onmessage = (event) => {
    const message = event?.data;
    if (!message || message.from === tabId) return;

    if (message.type === "ask") {
      const auth = deps.getAuth();
      if (auth)
        channel.postMessage({ type: "state", from: tabId, to: message.from, mode: deps.getMode(), auth });
      return;
    }

    if (message.type === "state") {
      const mine = deps.getAuth();
      if (message.to !== null) {
        // An answer: only the tab that asked, and only while it has no session.
        if (message.to !== tabId || mine || !waiting) return;
        deps.adopt(message.auth, message.mode);
        const done = waiting;
        waiting = null;
        done(true);
        return;
      }
      // A sign-in or refresh elsewhere: follow it for the same account only,
      // keeping this tab's own persistence mode.
      if (
        mine &&
        mine.user.id === message.auth.user.id &&
        (mine.accessToken !== message.auth.accessToken || mine.refreshToken !== message.auth.refreshToken)
      )
        deps.adopt(message.auth, deps.getMode());
      return;
    }

    if (message.type === "logout") {
      const mine = deps.getAuth();
      if (mine && mine.user.id === message.userId) deps.remoteLogout();
    }
  };

  return {
    /** A tab without a session asks the open tabs; resolves true when one answered. */
    askOthers(timeoutMs: number): Promise<boolean> {
      if (deps.getAuth()) return Promise.resolve(true);
      return new Promise<boolean>((resolve) => {
        waiting = resolve;
        channel.postMessage({ type: "ask", from: tabId });
        setTimeout(() => {
          if (waiting === resolve) {
            waiting = null;
            resolve(false);
          }
        }, timeoutMs);
      });
    },
    /** This tab signed in or refreshed its tokens. */
    announce() {
      const auth = deps.getAuth();
      if (auth) channel.postMessage({ type: "state", from: tabId, to: null, mode: deps.getMode(), auth });
    },
    /** This tab signed the account out. */
    announceLogout(userId: number) {
      channel.postMessage({ type: "logout", from: tabId, userId });
    },
    dispose() {
      channel.onmessage = null;
      channel.close();
    },
  };
}
