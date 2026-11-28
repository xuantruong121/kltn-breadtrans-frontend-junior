/**
 * What the admin's user form says about the password of another person
 * (owner 2026-11-28). The admin sends a reset link by e-mail; setting the
 * password directly is the second way, for accounts that cannot receive mail
 * (the demo accounts on @breadtrans.com). Pure: no I/O.
 */
import { newPasswordProblem } from "../../lib/auth/passwordPolicy.ts";

export type PasswordResetStatus = "SENT" | "COOLDOWN" | "UNDELIVERABLE" | "EMAIL_FAILED";
export type ResetNoticeTone = "success" | "warning" | "error";

/** The toast for the API's answer to "send the reset link". */
export function resetLinkNotice(
  status: string | undefined,
  email: string,
): { tone: ResetNoticeTone; text: string } {
  switch (status) {
    case "SENT":
      return { tone: "success", text: `Đã gửi email đặt lại mật khẩu tới ${email}.` };
    case "COOLDOWN":
      return { tone: "warning", text: "Vừa gửi cách đây chưa đến 1 phút. Thử lại sau." };
    case "UNDELIVERABLE":
      return {
        tone: "warning",
        text: `${email} là địa chỉ thử nghiệm, không nhận được thư. Dùng "Đặt mật khẩu trực tiếp" bên dưới.`,
      };
    default:
      return { tone: "error", text: "Không gửi được email. Thử lại sau hoặc đặt mật khẩu trực tiếp." };
  }
}

/**
 * The direct password is sent alone, by its own button, never with the
 * form's other fields: a browser that fills the box must not change a
 * password when the admin only edits a name.
 */
export function directPasswordProblem(password: string): string | null {
  const value = password.trim();
  if (!value) return "Nhập mật khẩu mới.";
  return newPasswordProblem(value);
}

export const DIRECT_PASSWORD_PAYLOAD = (password: string) => ({ password: password.trim() });
