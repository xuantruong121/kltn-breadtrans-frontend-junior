/**
 * Browser notifications (Web Push), per browser. Which state this browser is
 * in and what the account tab says about it. No React, no browser APIs.
 */

export type PushState = "unsupported" | "unconfigured" | "blocked" | "off" | "on";

/** The VAPID public key (base64url, no padding) as the bytes pushManager.subscribe wants. */
export function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padded = base64Url + "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  // Backed by a plain ArrayBuffer, which is what applicationServerKey accepts.
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export function pushState(input: {
  /** serviceWorker, PushManager and Notification all exist. */
  supported: boolean;
  /** https or localhost: push needs a secure context. */
  secure: boolean;
  vapidKey: string;
  permission: NotificationPermission;
  /** This browser holds a push subscription. */
  subscribed: boolean;
}): PushState {
  if (!input.supported || !input.secure) return "unsupported";
  if (!input.vapidKey) return "unconfigured";
  if (input.permission === "denied") return "blocked";
  return input.permission === "granted" && input.subscribed ? "on" : "off";
}

export function pushStateText(state: PushState): { status: string; help?: string } {
  switch (state) {
    case "unsupported":
      return {
        status: "Trình duyệt này không hỗ trợ thông báo.",
        help: "Hãy dùng Chrome, Edge hoặc Firefox bản mới trên máy tính hoặc Android.",
      };
    case "unconfigured":
      return { status: "Máy chủ chưa cấu hình thông báo trình duyệt." };
    case "blocked":
      return {
        status: "Bạn đã chặn thông báo của BreadTrans trên trình duyệt này.",
        help: "Bấm biểu tượng ổ khoá cạnh địa chỉ web, cho phép Thông báo, rồi tải lại trang.",
      };
    case "off":
      return { status: "Đang tắt trên trình duyệt này." };
    case "on":
      return { status: "Đang bật trên trình duyệt này." };
  }
}
