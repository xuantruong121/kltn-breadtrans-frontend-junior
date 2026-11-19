import test from "node:test";
import assert from "node:assert/strict";
import {
  getNotificationActionLabel,
  groupNotificationsByDay,
  resolveNotificationAction,
  notificationIconKey,
  notificationTimeText,
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

test("a section anchor on an allowed route is kept", () => {
  // The weekly report opens the dashboard at the "Tuần này của bạn" card.
  assert.equal(resolveNotificationAction(item({ url: "/dashboard#week-plan" })), "/dashboard#week-plan");
  assert.equal(getNotificationActionLabel(item({ url: "/dashboard#week-plan" })), "Xem chi tiết");
  assert.equal(resolveNotificationAction(item({ url: "/reading/24#q3" })), "/reading/24#q3");
});

test("an anchor never makes an unknown route or an odd fragment pass", () => {
  assert.equal(resolveNotificationAction(item({ url: "/deleted-resource/1#week-plan" })), null);
  assert.equal(resolveNotificationAction(item({ url: "/dashboard#<img>" })), null);
  assert.equal(resolveNotificationAction(item({ url: "/dashboard#" })), null);
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

// Local wall-clock times, so the expectations hold in any time zone (CI runs in UTC).
const at = (day: number, hour: number, minute = 0, month = 10, year = 2026) =>
  new Date(year, month, day, hour, minute).toISOString();
const NOW = new Date(2026, 10, 19, 14, 0); // Thứ Năm 19/11/2026, 14:00

test("notification time reads as minutes, hours, days, then the date", () => {
  assert.equal(notificationTimeText(new Date(NOW.getTime() - 30_000).toISOString(), NOW), "Vừa xong");
  assert.equal(notificationTimeText(at(19, 13, 55), NOW), "5 phút trước");
  assert.equal(notificationTimeText(at(19, 11, 0), NOW), "3 giờ trước");
  assert.equal(notificationTimeText(at(17, 9, 0), NOW), "2 ngày trước");
  assert.equal(notificationTimeText(at(9, 9, 0), NOW), "09/11/2026");
  assert.equal(notificationTimeText("not a date", NOW), "");
});

test("notifications group by day: today, yesterday, then weekday and date", () => {
  const rows = [at(19, 10), at(19, 8), at(18, 20), at(17, 9), at(30, 9, 0, 11, 2025)].map((createdAt, id) => ({ id, createdAt }));
  const groups = groupNotificationsByDay(rows, NOW);
  assert.deepEqual(
    groups.map((group) => [group.label, group.items.map((row) => row.id)]),
    [
      ["Hôm nay", [0, 1]],
      ["Hôm qua", [2]],
      ["Thứ Ba, 17/11", [3]],
      ["Thứ Ba, 30/12/2025", [4]],
    ],
  );
  assert.equal(new Set(groups.map((group) => group.key)).size, groups.length);
});

test("a day split across the list stays one group, and odd dates do not break grouping", () => {
  const rows = [
    { id: 1, createdAt: at(19, 9) },
    { id: 2, createdAt: at(18, 9) },
    { id: 3, createdAt: at(19, 7) },
    { id: 4, createdAt: "" },
    { id: 5, createdAt: at(19, 15) },
  ];
  assert.deepEqual(
    groupNotificationsByDay(rows, NOW).map((group) => [group.label, group.items.map((row) => row.id)]),
    [
      ["Hôm nay", [1, 3, 5]],
      ["Hôm qua", [2]],
      ["Không rõ ngày", [4]],
    ],
  );
});
