/** A signed-in device as the account page lists it (GET /auth/sessions). */
export interface AuthSessionView {
  deviceId: string;
  userAgent: string | null;
  createdAt: string;
  lastUsedAt: string;
  current: boolean;
}

/** "Chrome trên Windows" from a user agent; enough to recognise one's own devices. */
export function deviceLabel(userAgent: string | null | undefined): { browser: string; os: string; mobile: boolean } {
  const ua = userAgent ?? "";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /CriOS\/|Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Trình duyệt";
  const os = /iPhone|iPad|iPod/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Windows/.test(ua)
        ? "Windows"
        : /Mac OS X|Macintosh/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "thiết bị không rõ";
  return { browser, os, mobile: /Mobile|Android|iPhone|iPad/.test(ua) };
}

/** "5 phút trước", "Hôm qua"… for the last use of a session. */
export function lastUsedText(iso: string, now = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (minutes < 2) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.round(hours / 24);
  return days === 1 ? "Hôm qua" : `${days} ngày trước`;
}
