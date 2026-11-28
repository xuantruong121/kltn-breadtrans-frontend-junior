/**
 * New passwords (owner 2026-11-28, replacing the 2026-11-14 rule of 15
 * characters and no composition rules): at least 8 characters with a capital
 * letter, a digit and a special character. Mirrors the API's
 * password-policy.ts: keep the two in step.
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

const UPPERCASE = /\p{Lu}/u;
const DIGIT = /[0-9]/;
/** Punctuation and symbols; a space or a Vietnamese letter is not special. */
const SPECIAL = /[\p{P}\p{S}]/u;

/** Placeholder of a new-password box. */
export const PASSWORD_PLACEHOLDER = `Ít nhất ${PASSWORD_MIN_LENGTH} ký tự, có chữ hoa, số, ký hiệu`;

export const PASSWORD_RULE_MESSAGE = `Mật khẩu cần ít nhất ${PASSWORD_MIN_LENGTH} ký tự, gồm chữ hoa, số và ký tự đặc biệt.`;

/**
 * Shown under every new-password box. It names the rule and the kind of
 * symbol; it gives no example password, since a phrase shown to everyone gets
 * typed by some of them and is soon in attackers' lists.
 */
export const PASSWORD_HINT = `Ít nhất ${PASSWORD_MIN_LENGTH} ký tự, gồm chữ hoa, số và ký tự đặc biệt như ! @ # $ %. Đừng dùng lại mật khẩu của nơi khác; có thể dán từ trình quản lý mật khẩu.`;

/** What a candidate password still lacks, in the words the messages use. */
export function passwordMissing(password: string): string[] {
  const missing: string[] = [];
  if (password.length < PASSWORD_MIN_LENGTH) missing.push(`đủ ${PASSWORD_MIN_LENGTH} ký tự`);
  if (!UPPERCASE.test(password)) missing.push("chữ hoa");
  if (!DIGIT.test(password)) missing.push("số");
  if (!SPECIAL.test(password)) missing.push("ký tự đặc biệt");
  return missing;
}

/** The message for a new password that breaks the policy, or null. */
export function newPasswordProblem(password: string): string | null {
  if (password.length > PASSWORD_MAX_LENGTH) return `Mật khẩu tối đa ${PASSWORD_MAX_LENGTH} ký tự.`;
  const missing = passwordMissing(password);
  if (!missing.length) return null;
  return `${PASSWORD_RULE_MESSAGE.slice(0, -1)} (còn thiếu: ${missing.join(", ")}).`;
}
