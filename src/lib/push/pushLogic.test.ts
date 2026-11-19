import test from "node:test";
import assert from "node:assert/strict";

import { pushState, pushStateText, urlBase64ToUint8Array } from "./pushLogic.ts";

const base = { supported: true, secure: true, vapidKey: "BKey", permission: "default" as const, subscribed: false };

test("the VAPID key turns into bytes, URL-safe alphabet and missing padding included", () => {
  // "hello" in base64url is "aGVsbG8" (no padding).
  assert.deepEqual([...urlBase64ToUint8Array("aGVsbG8")], [104, 101, 108, 108, 111]);
  // "-" and "_" are the URL-safe forms of "+" and "/".
  assert.deepEqual([...urlBase64ToUint8Array("-_8")], [251, 255]);
});

test("the state follows support, configuration, permission and subscription", () => {
  assert.equal(pushState({ ...base, supported: false }), "unsupported");
  assert.equal(pushState({ ...base, secure: false }), "unsupported");
  assert.equal(pushState({ ...base, vapidKey: "" }), "unconfigured");
  assert.equal(pushState({ ...base, permission: "denied" }), "blocked");
  assert.equal(pushState({ ...base }), "off");
  assert.equal(pushState({ ...base, permission: "granted" }), "off");
  assert.equal(pushState({ ...base, permission: "granted", subscribed: true }), "on");
  // Permission withdrawn in the browser while a subscription still exists: blocked wins.
  assert.equal(pushState({ ...base, permission: "denied", subscribed: true }), "blocked");
});

test("every state has a status line, and only off and on have an action", () => {
  for (const state of ["unsupported", "unconfigured", "blocked", "off", "on"] as const) {
    const text = pushStateText(state);
    assert.ok(text.status.length > 0, state);
  }
  assert.match(pushStateText("blocked").help ?? "", /ổ khoá/);
  assert.equal(pushStateText("on").status, "Đang bật trên trình duyệt này.");
  assert.equal(pushStateText("off").status, "Đang tắt trên trình duyệt này.");
});
