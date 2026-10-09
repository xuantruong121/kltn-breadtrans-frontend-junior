import test from "node:test";
import assert from "node:assert/strict";
import { getNotificationActionLabel, resolveNotificationAction } from "./notificationLogic.ts";

const item = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  userId: 10,
  type: "system",
  title: "Thông báo",
  body: "Nội dung",
  isRead: false,
  createdAt: "2026-10-09T00:00:00.000Z",
  ...overrides,
});

test("vocabulary reminders open the exact flashcard topic and use a useful CTA", () => {
  const notification = item({ type: "vocab_review", url: "/flashcard/12" });
  assert.equal(resolveNotificationAction(notification), "/flashcard/12");
  assert.equal(getNotificationActionLabel(notification), "Ôn tập ngay");
});

test("canonical skill routes are allowed and legacy practice routes are rejected", () => {
  assert.equal(resolveNotificationAction(item({ url: "/reading/24" })), "/reading/24");
  assert.equal(resolveNotificationAction(item({ url: "/writing/11" })), "/writing/11");
  assert.equal(resolveNotificationAction(item({ url: "/practice/reading/24" })), null);
});

test("external, protocol-relative and stale unknown targets fail safely", () => {
  assert.equal(resolveNotificationAction(item({ url: "https://example.com" })), null);
  assert.equal(resolveNotificationAction(item({ url: "//example.com" })), null);
  assert.equal(resolveNotificationAction(item({ url: "/deleted-resource/1" })), null);
});
