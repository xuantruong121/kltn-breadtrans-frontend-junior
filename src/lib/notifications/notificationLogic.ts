import type { NotificationItem } from "@/lib/api/services/notification.service";

/**
 * Only allow notification targets that are known learner destinations. This
 * prevents stored/legacy URLs from becoming an arbitrary redirect primitive.
 */
export function resolveNotificationAction(item: NotificationItem): string | null {
  const url = item.url?.trim();
  if (!url) return null;
  // An optional section anchor ("/dashboard#week-plan"): letters, digits and dashes only.
  const hashAt = url.indexOf("#");
  const raw = hashAt === -1 ? url : url.slice(0, hashAt);
  if (hashAt !== -1 && !/^[a-z0-9-]+$/i.test(url.slice(hashAt + 1))) return null;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return null;
  if (raw.startsWith("/practice")) return null;

  const exactRoutes = ["/dashboard", "/hub", "/flashcard", "/plans", "/account", "/messages", "/mistakes"];
  const routePrefixes = [
    "/reading/",
    "/writing/",
    "/speaking/",
    "/listening/",
    "/flashcard/",
    "/vocabulary/",
  ];
  if (exactRoutes.includes(raw) || raw.startsWith("/hub?") || routePrefixes.some((prefix) => raw.startsWith(prefix))) return url;
  return null;
}

export function getNotificationActionLabel(item: NotificationItem): string | null {
  if (!resolveNotificationAction(item)) return null;
  if (item.type === "vocab_review") return "Ôn tập ngay";
  if (item.type === "streak") return "Học ngay";
  if (item.type === "streak_shield_used") return "Học ngay";
  if (item.type === "study_reminder") return "Học ngay";
  return "Xem chi tiết";
}

export type NotificationIconKey =
  | "flashcard"
  | "streak"
  | "shield"
  | "report"
  | "plan"
  | "gift"
  | "shop"
  | "message"
  | "suggestion"
  | "issue"
  | "other";

/**
 * The icon of a notification, from its type (the part before ":"), so the
 * kind is seen at a glance without an emoji in the title (glossary.ts).
 */
export function notificationIconKey(type: string | null | undefined): NotificationIconKey {
  const kind = String(type ?? "").split(":")[0];
  switch (kind) {
    case "vocab_review":
      return "flashcard";
    case "streak":
    case "study_reminder":
      return "streak";
    case "streak_shield_used":
    case "plan_streak_freeze":
      return "shield";
    case "weekly_report":
      return "report";
    case "plan_expiry":
    case "trial":
    case "market_plus":
      return "plan";
    case "winback":
    case "referral_reward":
      return "gift";
    case "MARKET_ORDER_RESULT":
      return "shop";
    case "NEW_MESSAGE":
      return "message";
    case "SUGGESTION_RESPONSE":
      return "suggestion";
    case "ISSUE_REPORT_RESULT":
      return "issue";
    default:
      return "other";
  }
}

const WEEKDAYS = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const DAY_MS = 24 * 60 * 60 * 1000;
const pad = (value: number) => String(value).padStart(2, "0");
const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

/** "Vừa xong", "5 phút trước" … "6 ngày trước", then dd/mm/yyyy. Empty for a date that cannot be read. */
export function notificationTimeText(value: string, now: Date = new Date()): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/**
 * The time on a row that already sits under its day heading: today reads as
 * "3 giờ trước", an older day only needs the clock time ("20:05").
 */
export function notificationRowTime(value: string, now: Date = new Date()): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  if (startOfDay(date).getTime() >= startOfDay(now).getTime()) return notificationTimeText(value, now);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export interface NotificationDayGroup<T> {
  key: string;
  label: string;
  items: T[];
}

function dayLabel(date: Date, now: Date): string {
  const daysAgo = Math.round((startOfDay(now).getTime() - startOfDay(date).getTime()) / DAY_MS);
  // A clock slightly ahead of this device still reads as today.
  if (daysAgo <= 0) return "Hôm nay";
  if (daysAgo === 1) return "Hôm qua";
  const year = date.getFullYear() === now.getFullYear() ? "" : `/${date.getFullYear()}`;
  return `${WEEKDAYS[date.getDay()]}, ${pad(date.getDate())}/${pad(date.getMonth() + 1)}${year}`;
}

/**
 * Notifications grouped by the local day they arrived, in the order the list
 * already has (newest first from the API). A day seen twice stays one group.
 */
export function groupNotificationsByDay<T extends { createdAt: string }>(
  items: T[],
  now: Date = new Date(),
): NotificationDayGroup<T>[] {
  const groups = new Map<string, NotificationDayGroup<T>>();
  for (const item of items) {
    const date = new Date(item.createdAt);
    const valid = !Number.isNaN(date.getTime());
    const key = valid ? `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}` : "unknown";
    let group = groups.get(key);
    if (!group) {
      group = { key, label: valid ? dayLabel(date, now) : "Không rõ ngày", items: [] };
      groups.set(key, group);
    }
    group.items.push(item);
  }
  return [...groups.values()];
}
