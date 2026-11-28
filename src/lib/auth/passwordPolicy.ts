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

/**
 * The example shown as the placeholder of a new-password box (owner
 * 2026-11-28). A placeholder is grey sample text, not a value; it satisfies
 * the rule, which a test checks.
 */
export const PASSWORD_EXAMPLE = "BanhMi@2026";
export const PASSWORD_PLACEHOLDER = `Ví dụ: ${PASSWORD_EXAMPLE}`;

export const PASSWORD_RULE_MESSAGE = `Mật khẩu cần ít nhất ${PASSWORD_MIN_LENGTH} ký tự, gồm chữ hoa, số và ký tự đặc biệt.`;

/** Shown under every new-password box: the rule, short. The example is the placeholder. */
export const PASSWORD_HINT = `Ít nhất ${PASSWORD_MIN_LENGTH} ký tự, gồm chữ hoa, số và ký tự đặc biệt.`;

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
