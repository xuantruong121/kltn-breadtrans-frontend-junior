import test from "node:test";
import assert from "node:assert/strict";
import {
  getNotificationActionLabel,
  resolveNotificationAction,
  notificationIconKey,
} from "./notificationLogic.ts";

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

test("each kind of notification has its own icon", () => {
  const cases: Array<[string, string]> = [
    ["vocab_review", "flashcard"],
    ["streak", "streak"],
    ["study_reminder", "streak"],
    ["streak_shield_used", "shield"],
    ["plan_streak_freeze", "shield"],
    ["weekly_report:2026-11-09", "report"],
    ["plan_expiry:12:7", "plan"],
    ["trial:4", "plan"],
    ["market_plus:abc", "plan"],
    ["winback:9", "gift"],
    ["referral_reward:3:7", "gift"],
    ["MARKET_ORDER_RESULT", "shop"],
    ["NEW_MESSAGE", "message"],
    ["SUGGESTION_RESPONSE", "suggestion"],
    ["ISSUE_REPORT_RESULT", "issue"],
    ["something_new", "other"],
  ];
  for (const [type, key] of cases) assert.equal(notificationIconKey(type), key, type);
  assert.equal(notificationIconKey(null), "other");
});

test("the study reminder about mistakes opens the notebook", () => {
  assert.equal(
    resolveNotificationAction({ id: 1, type: "study_reminder", title: "t", body: "b", url: "/mistakes", isRead: false, createdAt: "" } as never),
    "/mistakes",
  );
});
