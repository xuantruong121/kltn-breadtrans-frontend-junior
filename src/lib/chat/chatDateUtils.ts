/**
 * Chat Date & Time Formatting Utilities
 * Standardized across Admin Messages and Student Support Chat
 */

function toValidDate(value: string | number | Date | undefined | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) return null;
  return date;
}

/**
 * Returns formatted time and date for message timestamp, e.g. "14:32 · 20/10/2026"
 */
export function formatMessageTimestamp(value?: string | number | Date | null): string {
  const date = toValidDate(value);
  if (!date) return "";

  const timePart = new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);

  const datePart = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);

  return `${timePart} · ${datePart}`;
}

/**
 * Returns full localized string for hover tooltip or accessible description
 * e.g. "14:32:05, Thứ Ba, ngày 20 tháng 10 năm 2026"
 */
export function formatMessageFullTooltip(value?: string | number | Date | null): string {
  const date = toValidDate(value);
  if (!date) return "";

  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

/**
 * Returns true if both values fall on the exact same calendar day, month, and year
 */
export function isSameCalendarDay(
  dateA?: string | number | Date | null,
  dateB?: string | number | Date | null,
): boolean {
  const d1 = toValidDate(dateA);
  const d2 = toValidDate(dateB);
  if (!d1 || !d2) return false;

  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Returns label for inter-day date dividers in chat history
 * e.g. "Hôm nay, 21/10/2026", "Hôm qua, 20/10/2026", or "20 tháng 10, 2026"
 */
export function formatDateDivider(value?: string | number | Date | null): string {
  const date = toValidDate(value);
  if (!date) return "";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffTime = today.getTime() - targetDay.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  const dateStr = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);

  if (diffDays === 0) {
    return `Hôm nay, ${dateStr}`;
  }

  if (diffDays === 1) {
    return `Hôm qua, ${dateStr}`;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/**
 * Compact timestamp for conversation previews in the sidebar list
 * e.g. "14:32" if today, "20/10" if this year, "20/10/2025" if different year
 */
export function formatListPreviewTime(value?: string | number | Date | null): string {
  const date = toValidDate(value);
  if (!date) return "";

  const now = new Date();
  if (isSameCalendarDay(date, now)) {
    return new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  }

  if (date.getFullYear() === now.getFullYear()) {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
    }).format(date);
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
