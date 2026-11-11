import assert from "node:assert/strict";
import { test } from "node:test";
import { mergeServerMessages, type SyncMessage } from "./threadSync.ts";

const msg = (over: Partial<SyncMessage>): SyncMessage => ({
  id: 1,
  role: "user",
  content: "hi",
  timestamp: 1_000,
  ...over,
});

test("nothing new keeps the same array", () => {
  const existing = [msg({ id: 1 }), msg({ id: 2, role: "admin", content: "chào" })];
  assert.equal(mergeServerMessages(existing, [msg({ id: 1 }), msg({ id: 2, role: "admin", content: "chào" })]), existing);
});

test("a message the socket missed is added in time order", () => {
  const existing = [msg({ id: 1, timestamp: 1_000 }), msg({ id: 3, timestamp: 3_000 })];
  const merged = mergeServerMessages(existing, [
    msg({ id: 1, timestamp: 1_000 }),
    msg({ id: 2, role: "admin", content: "mình hỗ trợ bạn", timestamp: 2_000 }),
    msg({ id: 3, timestamp: 3_000 }),
  ]);
  assert.deepEqual(merged.map((m) => m.id), [1, 2, 3]);
});

test("a message still being sent is matched by its client id", () => {
  const existing = [msg({ id: "cmsg_1", clientMessageId: "cmsg_1", timestamp: 5_000 })];
  const merged = mergeServerMessages(existing, [msg({ id: 9, clientMessageId: "cmsg_1", timestamp: 5_100 })]);
  assert.equal(merged, existing);
});

test("the system line written on the socket event is not shown twice", () => {
  const line = "Quản trị viên đã tham gia trò chuyện. Trợ lý AI tạm dừng trả lời.";
  const existing = [msg({ id: "sys-123", role: "system", content: line, timestamp: 10_000 })];
  const merged = mergeServerMessages(existing, [msg({ id: 40, role: "system", content: line, timestamp: 9_500 })]);
  assert.equal(merged, existing);
});

test("the same words sent again later are a new message", () => {
  const existing = [msg({ id: 1, content: "alo", timestamp: 1_000 })];
  const merged = mergeServerMessages(existing, [
    msg({ id: 1, content: "alo", timestamp: 1_000 }),
    msg({ id: 2, content: "alo", timestamp: 60_000 }),
  ]);
  assert.equal(merged.length, 2);
});

test("numeric and string ids of one message match", () => {
  const existing = [msg({ id: "7" })];
  assert.equal(mergeServerMessages(existing, [msg({ id: 7 })]), existing);
});
