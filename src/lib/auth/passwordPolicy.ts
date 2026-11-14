/**
 * New passwords: at least 15 characters (owner 2026-11-14, NIST SP
 * 800-63B-4), no rules about symbols. Mirrors the API's password-policy.ts.
 */
export const PASSWORD_MIN_LENGTH = 15;
export const PASSWORD_MAX_LENGTH = 128;
export const PASSWORD_LENGTH_MESSAGE = `Mật khẩu cần ít nhất ${PASSWORD_MIN_LENGTH} ký tự.`;
export const PASSWORD_HINT = `Ít nhất ${PASSWORD_MIN_LENGTH} ký tự. Dễ nhớ nhất là một cụm 3–4 từ, ví dụ "mèo đen thích ăn bánh mì".`;

/** The message for a new password that breaks the policy, or null. */
export function newPasswordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return PASSWORD_LENGTH_MESSAGE;
  if (password.length > PASSWORD_MAX_LENGTH) return `Mật khẩu tối đa ${PASSWORD_MAX_LENGTH} ký tự.`;
  return null;
}
