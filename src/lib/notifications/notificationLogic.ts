import type { NotificationItem } from "@/lib/api/services/notification.service";

/**
 * Only allow notification targets that are known learner destinations. This
 * prevents stored/legacy URLs from becoming an arbitrary redirect primitive.
 */
export function resolveNotificationAction(item: NotificationItem): string | null {
  const raw = item.url?.trim();
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return null;
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
  if (exactRoutes.includes(raw) || raw.startsWith("/hub?") || routePrefixes.some((prefix) => raw.startsWith(prefix))) return raw;
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
