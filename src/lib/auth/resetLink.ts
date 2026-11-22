/**
 * Why a password reset link cannot be used, or null while it may still work
 * (owner 2026-11-21). Pure, for the Node test runner. The reset page hides the
 * form and offers a new link instead of letting the learner type a password
 * that the server will refuse.
 */
export function resetLinkProblem(token: string, status?: number | null): string | null {
  if (!token.trim()) {
    return "Liên kết đặt lại mật khẩu không đầy đủ. Hãy mở lại liên kết trong email, hoặc gửi một liên kết mới.";
  }
  // The server answers 401 for an unknown, used or expired token.
  if (status === 401) {
    return "Liên kết này đã hết hạn hoặc đã được dùng. Mỗi liên kết chỉ dùng được một lần, trong 15 phút.";
  }
  return null;
}
