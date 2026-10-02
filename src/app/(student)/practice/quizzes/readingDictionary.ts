const READING_WORD_PATTERN = /^[\p{L}]+(?:['-][\p{L}]+)*$/u;

/**
 * Converts a browser text selection into one safe dictionary lookup token.
 * Surrounding punctuation is discarded, while apostrophes and hyphens inside
 * a word remain part of the lookup identity (e.g. don't, well-known).
 */
export function extractReadingDictionaryWord(
  selection: string,
  maxLength = 64,
): string | null {
  const normalized = selection
    .normalize("NFKC")
    .replace(/[’‘ʼ]/g, "'")
    .trim()
    .replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");

  if (!normalized || normalized.length > maxLength) return null;
  return READING_WORD_PATTERN.test(normalized) ? normalized : null;
}
