/**
 * Why a password reset link cannot be used, or null while it may still work
 * (owner 2026-11-21, 2026-11-28). Pure, for the Node test runner. The reset
 * page hides the form and offers a new link instead of letting the learner
 * type a password that the server will refuse.
 */

export const RESET_LINK_INCOMPLETE =
  "Liên kết đặt lại mật khẩu không đầy đủ. Hãy mở lại liên kết trong email, hoặc gửi một liên kết mới.";

export const RESET_LINK_EXPIRED =
  "Liên kết này đã hết hạn hoặc đã được dùng. Mỗi liên kết chỉ dùng được một lần, trong 15 phút.";

/** The server issues 32 random bytes as hex: anything else was cut or changed on the way. */
const RESET_TOKEN_SHAPE = /^[0-9a-f]{64}$/;

export function resetLinkProblem(token: string, status?: number | null): string | null {
  if (!RESET_TOKEN_SHAPE.test(token.trim())) return RESET_LINK_INCOMPLETE;
  // The server answers 401 for an unknown, used or expired token.
  if (status === 401) return RESET_LINK_EXPIRED;
  return null;
}

/**
 * The answer of POST /auth/reset-password/check, which looks at the link
 * without using it. Only a clear `valid: false` closes the form; a missing or
 * odd answer (old server, network error) leaves it open, because sending the
 * password still asks the server and is the final check.
 */
export function resetCheckProblem(answer: unknown): string | null {
  if (typeof answer === "object" && answer !== null && (answer as { valid?: unknown }).valid === false) {
    return RESET_LINK_EXPIRED;
  }
  return null;
}
