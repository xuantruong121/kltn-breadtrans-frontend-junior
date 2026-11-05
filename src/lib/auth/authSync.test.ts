import assert from "node:assert/strict";
import { test } from "node:test";
import { createAuthSync, type AuthChannel, type AuthSnapshot, type AuthSyncMessage, type PersistMode } from "./authSync.ts";

/** In-memory BroadcastChannel: a message reaches every other member, asynchronously. */
function hub() {
  const members: AuthChannel[] = [];
  return () => {
    const channel: AuthChannel = {
      onmessage: null,
      postMessage(message: AuthSyncMessage) {
        for (const other of members)
          if (other !== channel) queueMicrotask(() => other.onmessage?.({ data: structuredClone(message) }));
      },
      close() {
        members.splice(members.indexOf(channel), 1);
      },
    };
    members.push(channel);
    return channel;
  };
}

const session = (id: number, token: string): AuthSnapshot => ({
  accessToken: `a-${token}`,
  refreshToken: `r-${token}`,
  user: { id, email: `u${id}@x`, role: "STUDENT" },
});

function tab(join: () => AuthChannel, id: string, start: AuthSnapshot | null, mode: PersistMode) {
  const state = { auth: start, mode, loggedOut: false };
  const sync = createAuthSync({
    channel: join(),
    tabId: id,
    getAuth: () => state.auth,
    getMode: () => state.mode,
    adopt: (auth, m) => {
      state.auth = auth;
      state.mode = m;
    },
    remoteLogout: () => {
      state.auth = null;
      state.loggedOut = true;
    },
  });
  return { state, sync };
}

const tick = () => new Promise((r) => setTimeout(r, 5));

test("a new tab takes the session of an open tab that is not remembered", async () => {
  const join = hub();
  tab(join, "A", session(7, "1"), "session");
  const b = tab(join, "B", null, "local");
  assert.equal(await b.sync.askOthers(50), true);
  assert.deepEqual(b.state.auth, session(7, "1"));
  assert.equal(b.state.mode, "session");
});

test("with no open tab signed in, the new tab gives up after the timeout", async () => {
  const join = hub();
  tab(join, "A", null, "session");
  const b = tab(join, "B", null, "local");
  assert.equal(await b.sync.askOthers(20), false);
  assert.equal(b.state.auth, null);
});

test("a refresh in one tab reaches the other tabs of the same account", async () => {
  const join = hub();
  const a = tab(join, "A", session(7, "1"), "session");
  const b = tab(join, "B", session(7, "1"), "local");
  a.state.auth = session(7, "2");
  a.sync.announce();
  await tick();
  assert.deepEqual(b.state.auth, session(7, "2"));
  assert.equal(b.state.mode, "local", "a tab keeps its own persistence mode");
});

test("another account's sign-in is not adopted", async () => {
  const join = hub();
  const a = tab(join, "A", session(8, "9"), "session");
  const b = tab(join, "B", session(7, "1"), "session");
  a.sync.announce();
  await tick();
  assert.deepEqual(b.state.auth, session(7, "1"));
});

test("a sign-out ends the same account in the other tabs only", async () => {
  const join = hub();
  const a = tab(join, "A", session(7, "1"), "session");
  const b = tab(join, "B", session(7, "1"), "session");
  const c = tab(join, "C", session(8, "1"), "session");
  a.sync.announceLogout(7);
  await tick();
  assert.equal(b.state.loggedOut, true);
  assert.equal(c.state.loggedOut, false);
});

test("an answer meant for another tab, or arriving after the tab signed in, is ignored", async () => {
  const join = hub();
  tab(join, "A", session(7, "1"), "session");
  const b = tab(join, "B", null, "local");
  const c = tab(join, "C", session(9, "5"), "local");
  await b.sync.askOthers(50);
  await tick();
  assert.deepEqual(c.state.auth, session(9, "5"));
});
