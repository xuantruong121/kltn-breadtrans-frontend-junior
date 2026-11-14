import assert from "node:assert/strict";
import test from "node:test";

import { createAuthSync, type AuthChannel, type AuthSyncMessage } from "./authSync.ts";

/** Channels of one browser: a message reaches every other channel. */
function bus() {
  const channels: AuthChannel[] = [];
  return () => {
    const channel: AuthChannel = {
      onmessage: null,
      postMessage(message: AuthSyncMessage) {
        for (const other of channels) if (other !== channel) other.onmessage?.({ data: message });
      },
      close() {},
    };
    channels.push(channel);
    return channel;
  };
}

function tab(open: () => AuthChannel, id: string, userId: number | null) {
  const state = { userId, token: null as string | null, loggedOut: false };
  const sync = createAuthSync({
    channel: open(),
    tabId: id,
    getUserId: () => state.userId,
    adoptToken: (t) => {
      state.token = t;
    },
    remoteLogout: () => {
      state.loggedOut = true;
      state.userId = null;
    },
  });
  return { state, sync };
}

test("a refreshed access token reaches the other tabs of the same account only", () => {
  const open = bus();
  const a = tab(open, "a", 7);
  const b = tab(open, "b", 7);
  const other = tab(open, "c", 9);
  a.sync.announceToken(7, "fresh");
  assert.equal(b.state.token, "fresh");
  assert.equal(other.state.token, null);
  assert.equal(a.state.token, null);
});

test("a sign-out ends the same account everywhere and leaves other accounts alone", () => {
  const open = bus();
  const a = tab(open, "a", 7);
  const b = tab(open, "b", 7);
  const other = tab(open, "c", 9);
  a.sync.announceLogout(7);
  assert.equal(b.state.loggedOut, true);
  assert.equal(other.state.loggedOut, false);
});

test("a signed-out tab ignores everything", () => {
  const open = bus();
  const a = tab(open, "a", 7);
  const out = tab(open, "b", null);
  a.sync.announceToken(7, "fresh");
  assert.equal(out.state.token, null);
});
