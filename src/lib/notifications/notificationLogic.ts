import type { NotificationItem } from "@/lib/api/services/notification.service";

/**
 * Only allow notification targets that are known learner destinations. This
 * prevents stored/legacy URLs from becoming an arbitrary redirect primitive.
 */
export function resolveNotificationAction(item: NotificationItem): string | null {
  const raw = item.url?.trim();
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return null;
  if (raw.startsWith("/practice")) return null;

  const exactRoutes = ["/dashboard", "/hub", "/flashcard", "/plans", "/account"];
  const routePrefixes = [
    "/reading/",
    "/writing/",
    "/speaking/",
    "/listening/",
    "/flashcard/",
    "/vocabulary/",
    "/courses/",
    "/my-courses/",
  ];
  if (exactRoutes.includes(raw) || routePrefixes.some((prefix) => raw.startsWith(prefix))) return raw;
  return null;
}

export function getNotificationActionLabel(item: NotificationItem): string | null {
  if (!resolveNotificationAction(item)) return null;
  if (item.type === "vocab_review") return "Ôn tập ngay";
  if (item.type === "streak") return "Học ngay";
  return "Xem chi tiết";
}
