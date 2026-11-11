import assert from "node:assert/strict";
import test from "node:test";

import {
  composerHeight,
  distanceFromBottom,
  isNearBottom,
  jumpButtonLabel,
  scrollActionFor,
  sendsOnKey,
  type ListChange,
} from "./chatScroll.ts";

const change = (over: Partial<ListChange>): ListChange => ({
  placed: true,
  previousCount: 5,
  count: 6,
  prepended: false,
  lastIsMine: false,
  nearBottom: true,
  ...over,
});

test("the reader is at the bottom within 80 px of the end", () => {
  assert.equal(distanceFromBottom({ scrollTop: 400, clientHeight: 300, scrollHeight: 760 }), 60);
  assert.equal(isNearBottom({ scrollTop: 400, clientHeight: 300, scrollHeight: 760 }), true);
  assert.equal(isNearBottom({ scrollTop: 100, clientHeight: 300, scrollHeight: 760 }), false);
  // A bounce past the end is still the bottom.
  assert.equal(distanceFromBottom({ scrollTop: 470, clientHeight: 300, scrollHeight: 760 }), 0);
});

test("opening the panel lands on the latest message, even when the messages arrive late", () => {
  // Opened with nothing loaded yet: nothing to do.
  assert.equal(scrollActionFor(change({ placed: false, previousCount: 0, count: 0 })), "NONE");
  // The messages arrive: jump to the end, whoever wrote the last one.
  assert.equal(scrollActionFor(change({ placed: false, previousCount: 0, count: 20 })), "JUMP_TO_BOTTOM");
  // Opened with messages already in memory.
  assert.equal(scrollActionFor(change({ placed: false, previousCount: 20, count: 20 })), "JUMP_TO_BOTTOM");
});

test("a new message is followed only by a reader at the bottom, or when it is their own", () => {
  assert.equal(scrollActionFor(change({ nearBottom: true })), "FOLLOW");
  assert.equal(scrollActionFor(change({ nearBottom: false, lastIsMine: true })), "FOLLOW");
  assert.equal(scrollActionFor(change({ nearBottom: false })), "COUNT_UNSEEN");
});

test("loading older messages keeps what is on screen in place", () => {
  assert.equal(scrollActionFor(change({ prepended: true, previousCount: 20, count: 70 })), "KEEP_POSITION");
  assert.equal(scrollActionFor(change({ prepended: true, placed: false, count: 70 })), "KEEP_POSITION");
});

test("a list that did not grow moves nothing", () => {
  assert.equal(scrollActionFor(change({ previousCount: 6, count: 6 })), "NONE");
  assert.equal(scrollActionFor(change({ previousCount: 7, count: 6 })), "NONE");
});

test("the jump button says how many messages are not seen yet", () => {
  assert.equal(jumpButtonLabel(0), "Tin mới nhất");
  assert.equal(jumpButtonLabel(3), "Tin mới nhất (3)");
  assert.equal(jumpButtonLabel(150), "Tin mới nhất (99+)");
});

test("Enter sends, Shift+Enter does not, and neither does the Enter of an input method", () => {
  assert.equal(sendsOnKey({ key: "Enter", shiftKey: false }), true);
  assert.equal(sendsOnKey({ key: "Enter", shiftKey: true }), false);
  assert.equal(sendsOnKey({ key: "a", shiftKey: false }), false);
  // Telex / VNI confirming a word.
  assert.equal(sendsOnKey({ key: "Enter", shiftKey: false, isComposing: true }), false);
  assert.equal(sendsOnKey({ key: "Enter", shiftKey: false, isComposing: false, keyCode: 229 }), false);
});

test("the message box grows with its text up to four lines", () => {
  assert.equal(composerHeight(20, 20, 24), 44);
  assert.equal(composerHeight(64, 20, 24), 64);
  assert.equal(composerHeight(400, 20, 24), 104);
  // Never shorter than one line.
  assert.equal(composerHeight(0, 20, 24), 44);
});
