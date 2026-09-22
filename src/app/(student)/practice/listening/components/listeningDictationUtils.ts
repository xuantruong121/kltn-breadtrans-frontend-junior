export type DictationDiffKind = "same" | "missing" | "extra" | "changed";

export interface DictationDiffToken {
  kind: DictationDiffKind;
  text: string;
}

export function normalizeDictationText(value?: string | null): string {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFKC")
    .replace(/[’‘]/g, "'")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en-US");
}

export function normalizeDictationToken(value?: string | null): string {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[’‘ʼ']/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

function tokenize(value?: string | null): string[] {
  return normalizeDictationText(value).split(" ").filter(Boolean);
}

/**
 * Normalizes user submitted text against expected canonical sentence.
 * Replaces case/punctuation of correctly matched prefix words with the canonical version,
 * and appends a trailing space if more words remain so the learner can continue typing.
 */
export function canonicalizeSubmittedDictation(
  expected?: string | null,
  submitted?: string | null,
): string {
  if (!submitted || typeof submitted !== "string") return "";
  const trimmedSubmitted = submitted.trim();
  if (trimmedSubmitted.length === 0) return "";
  if (!expected || typeof expected !== "string") return trimmedSubmitted;

  const expectedWords = expected.trim().split(/\s+/).filter(Boolean);
  const submittedWords = trimmedSubmitted.split(/\s+/).filter(Boolean);
  if (expectedWords.length === 0) return trimmedSubmitted;

  let allPrefixMatched = true;
  const normalizedWords: string[] = [];

  for (let i = 0; i < submittedWords.length; i += 1) {
    const subWord = submittedWords[i];
    const expWord = expectedWords[i];

    if (expWord && normalizeDictationToken(subWord) === normalizeDictationToken(expWord)) {
      normalizedWords.push(expWord);
    } else {
      allPrefixMatched = false;
      normalizedWords.push(subWord);
    }
  }

  const result = normalizedWords.join(" ");

  // If all typed words matched the prefix of the sentence and there are more words remaining,
  // add a trailing space so the learner can immediately type the next word.
  if (allPrefixMatched && submittedWords.length < expectedWords.length) {
    return result + " ";
  }

  return result;
}

/** Small deterministic word diff for learner feedback; it never mutates the original answer. */
export function diffDictationAnswer(expected?: string | null, submitted?: string | null): DictationDiffToken[] {
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

export function maskWord(value: string): string {
  return value.replace(/\S/g, "*");
}

/**
 * Builds progressive dictation answer display:
 * - Words correctly typed from left to right are marked as "correct" (green).
 * - At the first mistyped word (or the next word to type), the correct word is shown as "hint" (yellow highlight).
 * - All subsequent words after the error are NOT reported and remain masked as asterisks ("masked").
 * - When full answer is revealed, all words are shown as "answer".
 */
export function buildProgressiveAnswer(
  expected?: string | null,
  submitted?: string | null,
  showFullAnswer = false,
): Array<{ text: string; state: "correct" | "hint" | "masked" | "answer" }> {
  const expectedWords = (expected || "").trim().split(/\s+/).filter(Boolean);
  if (showFullAnswer) {
    return expectedWords.map((word) => ({ text: word, state: "answer" as const }));
  }
  const submittedWords = (submitted || "").trim().split(/\s+/).filter(Boolean);

  let firstMismatchIndex = -1;
  for (let i = 0; i < submittedWords.length; i += 1) {
    const subWord = submittedWords[i];
    const expWord = expectedWords[i];
    if (!expWord || normalizeDictationToken(subWord) !== normalizeDictationToken(expWord)) {
      firstMismatchIndex = i;
      break;
    }
  }

  const targetHighlightIndex =
    firstMismatchIndex !== -1
      ? firstMismatchIndex
      : submittedWords.length < expectedWords.length
        ? submittedWords.length
        : -1;

  const result: Array<{ text: string; state: "correct" | "hint" | "masked" | "answer" }> = [];

  for (let i = 0; i < expectedWords.length; i += 1) {
    const expWord = expectedWords[i];

    if (targetHighlightIndex !== -1 && i === targetHighlightIndex) {
      result.push({ text: expWord, state: "hint" as const });
    } else if (targetHighlightIndex !== -1 && i > targetHighlightIndex) {
      result.push({ text: maskWord(expWord), state: "masked" as const });
    } else if (firstMismatchIndex === -1 && i < submittedWords.length) {
      result.push({ text: expWord, state: "correct" as const });
    } else if (firstMismatchIndex !== -1 && i < firstMismatchIndex) {
      result.push({ text: expWord, state: "correct" as const });
    } else {
      result.push({ text: maskWord(expWord), state: "masked" as const });
    }
  }

  return result;
}
