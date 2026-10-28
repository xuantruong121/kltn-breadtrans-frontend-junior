/**
 * Word helpers for the Speaking practice page (highlighting the target text
 * against the recognised words). They live here because a Next.js page file
 * may export only its page component and route config: exporting them from
 * the page made `next build` fail its type check.
 */
export const normalizeWordForMatching = (word: string): string => {
  if (!word) return "";
  return word
    .toLowerCase()
    .replace(/[’‘ʼ]/g, "'")
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
};

export const WORD_TOKEN_REGEX =
  /[\p{L}\p{N}]+(?:['’‘ʼ\-][\p{L}\p{N}]+)*['’‘ʼ]?|[^\s\p{L}\p{N}]/gu;
export const IS_WORD_REGEX = /[\p{L}\p{N}]/u;
