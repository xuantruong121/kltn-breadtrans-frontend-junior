export type DictationDiffKind = "same" | "missing" | "extra" | "changed";

export interface DictationDiffToken {
  kind: DictationDiffKind;
  text: string;
}

export function normalizeDictationText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[’‘]/g, "'")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en-US");
}

function tokenize(value: string): string[] {
  return normalizeDictationText(value).split(" ").filter(Boolean);
}

/** Small deterministic word diff for learner feedback; it never mutates the original answer. */
export function diffDictationAnswer(expected: string, submitted: string): DictationDiffToken[] {
  const target = tokenize(expected);
  const actual = tokenize(submitted);
  const rows = target.length + 1;
  const cols = actual.length + 1;
  const lcs = Array.from({ length: rows }, () => Array<number>(cols).fill(0));

  for (let i = target.length - 1; i >= 0; i -= 1) {
    for (let j = actual.length - 1; j >= 0; j -= 1) {
      lcs[i][j] = target[i] === actual[j]
        ? lcs[i + 1][j + 1] + 1
        : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const result: DictationDiffToken[] = [];
  let i = 0;
  let j = 0;
  while (i < target.length || j < actual.length) {
    if (i < target.length && j < actual.length && target[i] === actual[j]) {
      result.push({ kind: "same", text: target[i] });
      i += 1;
      j += 1;
    } else if (j < actual.length && (i === target.length || lcs[i][j + 1] >= lcs[i + 1][j])) {
      result.push({ kind: "extra", text: actual[j] });
      j += 1;
    } else {
      result.push({ kind: "missing", text: target[i] });
      i += 1;
    }
  }
  return result;
}
