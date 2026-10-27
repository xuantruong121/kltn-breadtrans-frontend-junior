/**
 * Mirror of the backend rule in `src/common/utils/vietnam-phone.util.ts`, so a
 * form can reject a bad number before it sends any update. The server still
 * validates; keep both regexes identical.
 */
const VIETNAM_PHONE_REGEX = /^(?:\+84|84|0)(3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-9])([0-9]{7})$/;

export function isValidVietnamPhone(input: string): boolean {
  if (!input) return false;
  return VIETNAM_PHONE_REGEX.test(input.replace(/[\s\-().]/g, ""));
}
