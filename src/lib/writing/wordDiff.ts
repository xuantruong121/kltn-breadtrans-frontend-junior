/**
 * Word-by-word difference between two texts, for the before/after view of a
 * revised Writing answer. Longest common subsequence over words; spacing and
 * line breaks are not compared. Pure.
 */
export type DiffPart = { kind: "same" | "removed" | "added"; text: string };

const words = (text: string) => text.trim().split(/\s+/u).filter(Boolean);

/** Texts longer than this are shown side by side without marking words. */
export const WORD_DIFF_LIMIT = 1500;

export function wordDiff(before: string, after: string): DiffPart[] {
  const a = words(before);
  const b = words(after);
  if (a.length > WORD_DIFF_LIMIT || b.length > WORD_DIFF_LIMIT) {
    return [
      ...(a.length ? [{ kind: "removed" as const, text: a.join(" ") }] : []),
      ...(b.length ? [{ kind: "added" as const, text: b.join(" ") }] : []),
    ];
  }
  // lcs[i][j]: length of the longest common subsequence of a[i..] and b[j..].
  const lcs: Uint16Array[] = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const parts: DiffPart[] = [];
  const push = (kind: DiffPart["kind"], word: string) => {
    const last = parts[parts.length - 1];
    if (last?.kind === kind) last.text += ` ${word}`;
    else parts.push({ kind, text: word });
  };
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      push("same", a[i]);
      i += 1;
      j += 1;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      push("removed", a[i]);
      i += 1;
    } else {
      push("added", b[j]);
      j += 1;
    }
  }
  for (; i < a.length; i += 1) push("removed", a[i]);
  for (; j < b.length; j += 1) push("added", b[j]);
  return parts;
}

/** How many words were taken out and put in. */
export function diffCounts(parts: DiffPart[]) {
  const count = (kind: DiffPart["kind"]) =>
    parts.filter((p) => p.kind === kind).reduce((n, p) => n + words(p.text).length, 0);
  return { removed: count("removed"), added: count("added") };
}
