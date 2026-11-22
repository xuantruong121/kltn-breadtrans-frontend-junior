/**
 * A phonetic as the flashcard shows it: "/ˈæf.ə/" in one pair of slashes, or
 * null when the word has none. QA 2026-11-22: a missing UK phonetic showed a
 * "/UK/" placeholder styled like IPA; the card now shows nothing IPA-like.
 */
export function formatIpa(ipa?: string | null): string | null {
  const value = String(ipa ?? "").trim().replace(/^\/+|\/+$/g, "").trim();
  return value ? `/${value}/` : null;
}
