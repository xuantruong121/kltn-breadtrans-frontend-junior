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
  const normalized = value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[’‘ʼ`]/g, "'")
    .replace(/[^\p{L}\p{N}']/gu, "")
    .replace(/(?<![\p{L}\p{N}])'+|'+(?![\p{L}\p{N}])/gu, "");
  return normalized === "dont" ? "don't" : normalized;
}

const STANDARD_CONTRACTIONS: Record<string, string[]> = {
  "we're": ["we", "are"],
  "you're": ["you", "are"],
  "they're": ["they", "are"],
  "we've": ["we", "have"],
  "i've": ["i", "have"],
  "they've": ["they", "have"],
  "we'll": ["we", "will"],
  "i'll": ["i", "will"],
  "they'll": ["they", "will"],
  "can't": ["cannot"],
  "won't": ["will", "not"],
  "don't": ["do", "not"],
  "doesn't": ["does", "not"],
  "didn't": ["did", "not"],
  "isn't": ["is", "not"],
  "aren't": ["are", "not"],
  "wasn't": ["was", "not"],
  "weren't": ["were", "not"],
  "hasn't": ["has", "not"],
  "haven't": ["have", "not"],
  "hadn't": ["had", "not"],
  "let's": ["let", "us"],
  // Apostrophe-free forms remain compatible with STANDARD's punctuation policy.
  lets: ["let", "us"],
  its: ["it", "is"],
};

const AMBIGUOUS_CONTRACTIONS: Record<string, [string[], string[]]> = {
  "i'd": [
    ["i", "would"],
    ["i", "had"],
  ],
  "we'd": [
    ["we", "would"],
    ["we", "had"],
  ],
  "they'd": [
    ["they", "would"],
    ["they", "had"],
  ],
  "he's": [
    ["he", "is"],
    ["he", "has"],
  ],
  "she's": [
    ["she", "is"],
    ["she", "has"],
  ],
  "it's": [
    ["it", "is"],
    ["it", "has"],
  ],
  "that's": [
    ["that", "is"],
    ["that", "has"],
  ],
  "there's": [
    ["there", "is"],
    ["there", "has"],
  ],
};

function looksLikePastParticiple(token?: string): boolean {
  if (!token) return false;
  return (
    /(?:ed|en)$/.test(token) ||
    ["gone", "done", "seen", "been", "had", "made", "left", "read"].includes(
      token,
    )
  );
}

function expandStandardToken(token: string, nextToken?: string): string[] {
  const direct = STANDARD_CONTRACTIONS[token];
  if (direct) return direct;
  const ambiguous = AMBIGUOUS_CONTRACTIONS[token];
  if (!ambiguous) return [token];
  return looksLikePastParticiple(nextToken) ? ambiguous[1] : ambiguous[0];
}

function tokenize(value?: string | null): string[] {
  // STANDARD feedback compares lexical words, not punctuation/capitalization.
  // Keep this aligned with the backend comparator so the UI does not mark a
  // punctuation-only difference as missing/extra content.
  const rawTokens = normalizeDictationText(value)
    .replace(/[’‘ʼ`]/g, "'")
    .replace(/[^\p{L}\p{N}']+/gu, " ")
    .replace(/(?<![\p{L}\p{N}])'+|'+(?![\p{L}\p{N}])/gu, " ")
    .split(/\s+/)
    .map((word) => normalizeDictationToken(word))
    .filter(Boolean);
  return rawTokens.flatMap((word, index) =>
    expandStandardToken(word, rawTokens[index + 1]),
  );
}

/**
 * Normalizes user submitted text against expected canonical sentence.
 * Replaces case/punctuation of correctly matched prefix words with the canonical version,
 * and appends a trailing space if more words remain so the learner can continue typing.
 */
function tokensMatch(subWord: string, expWord: string): boolean {
  if (subWord === expWord) return true;
  const normSub = normalizeDictationToken(subWord);
  const normExp = normalizeDictationToken(expWord);
  if (normSub === normExp) return true;
  const strippedSub = normSub.replace(/'/g, "");
  const strippedExp = normExp.replace(/'/g, "");
  return strippedSub.length > 0 && strippedSub === strippedExp;
}

/**
 * Normalizes user submitted text against expected canonical sentence.
 * Replaces case/punctuation of correctly matched prefix words with the canonical version,
 * while preserving any unresolved/mismatched words for editing.
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

  let mismatchFound = false;
  const normalizedWords: string[] = [];

  for (let i = 0; i < submittedWords.length; i += 1) {
    const subWord = submittedWords[i];
    const expWord = expectedWords[i];

    if (!mismatchFound && expWord && tokensMatch(subWord, expWord)) {
      normalizedWords.push(expWord);
    } else {
      mismatchFound = true;
      normalizedWords.push(subWord);
    }
  }

  return normalizedWords.join(" ");
}

export interface DictationDiffToken {
  kind: DictationDiffKind;
  text: string;
  originalSubmittedText?: string;
}

/** Small deterministic word diff for learner feedback; it never mutates the original answer. */
export function diffDictationAnswer(
  expected?: string | null,
  submitted?: string | null,
): DictationDiffToken[] {
  const target = tokenize(expected);
  const actual = tokenize(submitted);
  const rows = target.length + 1;
  const cols = actual.length + 1;
  const lcs = Array.from({ length: rows }, () => Array<number>(cols).fill(0));

  for (let i = target.length - 1; i >= 0; i -= 1) {
    for (let j = actual.length - 1; j >= 0; j -= 1) {
      lcs[i][j] =
        target[i] === actual[j]
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
    } else if (
      j < actual.length &&
      (i === target.length || lcs[i][j + 1] >= lcs[i + 1][j])
    ) {
      result.push({ kind: "extra", text: actual[j] });
      j += 1;
    } else {
      result.push({ kind: "missing", text: target[i] });
      i += 1;
    }
  }
  return result;
}

export function getLexicalLetterCount(word?: string | null): number {
  if (!word) return 0;
  return word.replace(/[^A-Za-z]/g, "").length;
}

export function maskExpectedWord(canonicalToken?: string | null): string {
  if (!canonicalToken) return "***";
  const letterCount = getLexicalLetterCount(canonicalToken);
  const asterisks = "*".repeat(letterCount > 0 ? letterCount : 1);
  const trailingPunctMatch = canonicalToken.match(/([.,!?:;]+)$/);
  const trailingPunct = trailingPunctMatch ? trailingPunctMatch[1] : "";
  return `${asterisks}${trailingPunct}`;
}

export function maskWord(value?: string | null): string {
  if (!value) return "***";
  return maskExpectedWord(value);
}

/** Keeps transcript navigation independent from the Dictation question cursor. */
export function clampTranscriptIndex(index: number, length: number): number {
  if (length <= 0) return -1;
  if (!Number.isFinite(index)) return 0;
  return Math.min(Math.max(Math.trunc(index), 0), length - 1);
}

export function moveTranscriptIndex(
  currentIndex: number,
  direction: -1 | 1,
  length: number,
): number {
  return clampTranscriptIndex(
    (currentIndex >= 0 ? currentIndex : 0) + direction,
    length,
  );
}

export interface TranscriptTimingItem {
  startMs?: number | null;
  endMs?: number | null;
  speakerTurnId?: string | null;
}

export interface TranscriptPlaybackState {
  /** The chunk currently spoken, or the last chunk while between adjacent chunks. */
  activeChunkIndex: number;
  /** The grouped speaker contribution that owns the visual active window. */
  activeSpeakerTurnId: string | null;
}

/**
 * Resolve one deterministic Full Transcript cursor. Chunk bookmarks remain
 * authoritative for Dictation playback; the transcript uses HOLD_PREVIOUS
 * presentation semantics across short gaps so a speaker-turn card cannot flash.
 */
export function resolveTranscriptPlaybackState(
  currentTimeMs: number,
  items: TranscriptTimingItem[],
): TranscriptPlaybackState {
  if (!Number.isFinite(currentTimeMs) || items.length === 0) {
    return { activeChunkIndex: -1, activeSpeakerTurnId: null };
  }

  const exactIndex = items.findIndex(
    (item) =>
      Number.isFinite(item.startMs) &&
      Number.isFinite(item.endMs) &&
      currentTimeMs >= Number(item.startMs) &&
      currentTimeMs < Number(item.endMs),
  );

  if (exactIndex >= 0) {
    return {
      activeChunkIndex: exactIndex,
      activeSpeakerTurnId: items[exactIndex].speakerTurnId ?? null,
    };
  }

  // Keep the previous chunk/turn visually active until the next authoritative
  // chunk begins. The media `ended` handler clears the final tail explicitly.
  let previousIndex = -1;
  for (let index = 0; index < items.length; index += 1) {
    const startMs = Number(items[index].startMs);
    if (!Number.isFinite(startMs) || startMs > currentTimeMs) break;
    previousIndex = index;
  }

  if (previousIndex < 0) {
    return { activeChunkIndex: -1, activeSpeakerTurnId: null };
  }

  return {
    activeChunkIndex: previousIndex,
    activeSpeakerTurnId: items[previousIndex].speakerTurnId ?? null,
  };
}

/** Backward-compatible chunk cursor helper. */
export function resolveActiveTranscriptIndex(
  currentTimeMs: number,
  items: TranscriptTimingItem[],
): number {
  return resolveTranscriptPlaybackState(currentTimeMs, items).activeChunkIndex;
}

export interface ProgressiveAnswerToken {
  text: string;
  state: "correct" | "wrong" | "missing" | "extra" | "hint" | "masked" | "answer";
  originalWord?: string;
}

const COMMON_PREPOSITIONS = new Set([
  "to", "at", "in", "on", "for", "by", "with", "from", "about",
  "into", "through", "after", "before", "under", "between", "among",
  "of", "off", "over", "up", "down", "out",
]);

const COMMON_DETERMINERS = new Set([
  "a", "an", "the", "this", "that", "these", "those",
  "my", "your", "his", "her", "their", "our", "its",
]);

const COMMON_AUXILIARIES = new Set([
  "do", "does", "did", "have", "has", "had",
  "is", "am", "are", "was", "were", "will", "would",
  "can", "could", "should", "must",
]);

export interface ProgressiveDictationFeedback {
  isCorrect: boolean;
  verifiedPrefix: string;
  nextWordMask: string;
  remainingMasks: string[];
  nextErrorType: "WRONG" | "MISSING" | "EXTRA" | null;
  hint: string | null;
  wordAccuracy: number;
}

function generateProgressiveRelativeHint(
  canonicalTokens: string[],
  normSubmittedTokens: string[],
  matchedCanonicalCount: number,
  subIndex: number,
  nextErrorType: "WRONG" | "MISSING" | "EXTRA",
): string {
  if (normSubmittedTokens.length === 0) {
    return "Hãy nghe kỹ phần đầu câu.";
  }

  const prevCanonical =
    matchedCanonicalCount > 0
      ? canonicalTokens[matchedCanonicalCount - 1].replace(/[^A-Za-z]/g, "")
      : null;

  if (nextErrorType === "EXTRA") {
    if (prevCanonical) {
      return `Có một từ thừa ngay sau “${prevCanonical}”. Hãy nghe lại phần này.`;
    }
    return "Có từ thừa ở đầu câu trả lời, hãy nghe lại và lược bỏ.";
  }

  if (matchedCanonicalCount >= canonicalTokens.length) {
    return "Có từ thừa ở cuối câu trả lời, hãy nghe lại và lược bỏ.";
  }

  const nextCanonical = canonicalTokens[matchedCanonicalCount];
  const nextExpWords = tokenize(nextCanonical);
  const nextExpWord = nextExpWords[0] ?? "";
  const currentSubWord =
    subIndex < normSubmittedTokens.length ? normSubmittedTokens[subIndex] : "";

  if (COMMON_PREPOSITIONS.has(nextExpWord)) {
    if (prevCanonical) {
      return `Kiểm tra từ nối ngay sau “${prevCanonical}”.`;
    }
    return "Kiểm tra giới từ hoặc từ nối ở vị trí này.";
  }

  if (COMMON_DETERMINERS.has(nextExpWord)) {
    return "Kiểm tra mạo từ (a, an, the) hoặc từ hạn định ở vị trí này.";
  }

  if (COMMON_AUXILIARIES.has(nextExpWord)) {
    return "Kiểm tra trợ động từ hoặc dạng viết tắt (auxiliary verb).";
  }

  if (currentSubWord) {
    const baseExp = nextExpWord.replace(/(?:ing|ed|es|s)$/, "");
    const baseSub = currentSubWord.replace(/(?:ing|ed|es|s)$/, "");
    if (baseExp.length >= 3 && baseExp === baseSub) {
      if (nextExpWord.endsWith("s") || nextExpWord.endsWith("es")) {
        if (
          prevCanonical &&
          ["he", "she", "it"].includes(prevCanonical.toLowerCase())
        ) {
          return `Kiểm tra dạng động từ với chủ ngữ “${prevCanonical}”.`;
        }
        return "Kiểm tra dạng động từ theo chủ ngữ (chú ý ngôi và số ít / số nhiều).";
      }
      if (nextExpWord.endsWith("ed")) {
        return "Chú ý thì của động từ (kiểm tra âm đuôi quá khứ -ed).";
      }
      if (nextExpWord.endsWith("ing")) {
        return "Chú ý dạng động từ ở vị trí tiếp theo.";
      }
      return "Chú ý phụ âm cuối hoặc dạng biến đổi của từ.";
    }
  }

  if (nextExpWord.endsWith("ed") || looksLikePastParticiple(nextExpWord)) {
    return "Câu đang nói về một hành động trong quá khứ, hãy chú ý thì của động từ.";
  }

  if (
    prevCanonical &&
    ["he", "she", "it"].includes(prevCanonical.toLowerCase()) &&
    (nextExpWord.endsWith("s") || nextExpWord.endsWith("es"))
  ) {
    return `Kiểm tra dạng động từ với chủ ngữ “${prevCanonical}”.`;
  }

  if (prevCanonical) {
    return `Nghe kỹ lại phần ngay sau “${prevCanonical}”.`;
  }

  return "Hãy nghe kỹ phần đầu câu.";
}

export function calculateProgressiveDictationFeedback(
  expected?: string | null,
  submitted?: string | null,
): ProgressiveDictationFeedback {
  const trimmedExpected = String(expected ?? "").trim();
  const trimmedSubmitted = String(submitted ?? "").trim();

  const canonicalTokens = trimmedExpected.split(/\s+/).filter(Boolean);
  const normSubmittedTokens = tokenize(trimmedSubmitted);
  const normExpectedTokens = tokenize(trimmedExpected);

  const isCorrect =
    normSubmittedTokens.length === normExpectedTokens.length &&
    normSubmittedTokens.every((t, i) => t === normExpectedTokens[i]);

  let wordAccuracy = 0;
  if (canonicalTokens.length > 0) {
    let matchedCount = 0;
    for (
      let i = 0;
      i < Math.min(normExpectedTokens.length, normSubmittedTokens.length);
      i += 1
    ) {
      if (normExpectedTokens[i] === normSubmittedTokens[i]) matchedCount += 1;
    }
    wordAccuracy = Math.round(
      (matchedCount /
        Math.max(normExpectedTokens.length, normSubmittedTokens.length)) *
        100,
    );
  }

  if (isCorrect) {
    return {
      isCorrect: true,
      verifiedPrefix: trimmedExpected,
      nextWordMask: "",
      remainingMasks: [],
      nextErrorType: null,
      hint: null,
      wordAccuracy: 100,
    };
  }

  let subIndex = 0;
  let matchedCanonicalCount = 0;

  for (let idx = 0; idx < canonicalTokens.length; idx += 1) {
    const canonicalToken = canonicalTokens[idx];
    const expNorm = tokenize(canonicalToken);

    if (
      expNorm.length > 0 &&
      subIndex + expNorm.length <= normSubmittedTokens.length &&
      expNorm.every((token, k) => normSubmittedTokens[subIndex + k] === token)
    ) {
      matchedCanonicalCount += 1;
      subIndex += expNorm.length;
    } else {
      break;
    }
  }

  const verifiedTokens = canonicalTokens.slice(0, matchedCanonicalCount);
  const verifiedPrefix = verifiedTokens.join(" ");

  let nextWordMask = "";
  let remainingMasks: string[] = [];
  let nextErrorType: "WRONG" | "MISSING" | "EXTRA" = "WRONG";

  if (matchedCanonicalCount < canonicalTokens.length) {
    const nextCanonicalToken = canonicalTokens[matchedCanonicalCount];
    nextWordMask = maskExpectedWord(nextCanonicalToken);

    const remainingTokens = canonicalTokens.slice(matchedCanonicalCount + 1);
    remainingMasks = remainingTokens.map((t) => maskExpectedWord(t));

    if (subIndex >= normSubmittedTokens.length) {
      nextErrorType = "MISSING";
    } else {
      const nextExpectedToken = tokenize(nextCanonicalToken)[0];
      const remainingSubmitted = normSubmittedTokens.slice(subIndex);
      const foundLater = remainingSubmitted.includes(nextExpectedToken);
      nextErrorType = foundLater ? "EXTRA" : "WRONG";
    }
  } else {
    nextErrorType = "EXTRA";
    nextWordMask = "";
  }

  const hint = generateProgressiveRelativeHint(
    canonicalTokens,
    normSubmittedTokens,
    matchedCanonicalCount,
    subIndex,
    nextErrorType,
  );

  return {
    isCorrect: false,
    verifiedPrefix,
    nextWordMask,
    remainingMasks,
    nextErrorType,
    hint,
    wordAccuracy,
  };
}

export function generateSafeRelativeDictationHint(
  expected?: string | null,
  submitted?: string | null,
  _tokens?: DictationDiffToken[],
): string {
  const feedback = calculateProgressiveDictationFeedback(expected, submitted);
  return (
    feedback.hint ||
    "Lắng nghe kỹ câu trong audio và nhập những gì bạn nghe được."
  );
}

/**
 * Builds progressive dictation answer tokens:
 * - When full answer is revealed: all canonical words with state 'answer'.
 * - When checking: longest verified prefix (state 'correct') + ONLY ONE next unresolved word mask (state 'masked').
 * - VISIBLE_MASK_COUNT = 1 always. Downstream words/masks are NEVER returned.
 */
export function buildProgressiveAnswer(
  expected?: string | null,
  submitted?: string | null,
  showFullAnswer = false,
  revealMaskedWords = false,
  serverTokens?: Array<{
    status: "CORRECT" | "WRONG" | "MISSING" | "EXTRA";
    text?: string;
  }>,
  serverVerifiedPrefix?: string,
  serverNextWordMask?: string,
): ProgressiveAnswerToken[] {
  const trimmedExpected = (expected || "").trim();
  const expectedWords = trimmedExpected.split(/\s+/).filter(Boolean);

  if (showFullAnswer || revealMaskedWords) {
    return expectedWords.map((word) => ({
      text: word,
      state: "answer" as const,
    }));
  }

  // 1. Authoritative server response: verifiedPrefix + nextWordMask
  if (
    serverVerifiedPrefix !== undefined &&
    serverNextWordMask !== undefined
  ) {
    const tokens: ProgressiveAnswerToken[] = [];
    if (serverVerifiedPrefix.trim().length > 0) {
      const prefixWords = serverVerifiedPrefix
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      for (const w of prefixWords) {
        tokens.push({ text: w, state: "correct" });
      }
    }
    if (serverNextWordMask) {
      tokens.push({ text: serverNextWordMask, state: "masked" });
    }
    return tokens;
  }

  // 2. Client-side deterministic calculation from expected text
  if (trimmedExpected) {
    const feedback = calculateProgressiveDictationFeedback(
      trimmedExpected,
      submitted,
    );
    if (feedback.isCorrect) {
      return expectedWords.map((word) => ({
        text: word,
        state: "correct" as const,
      }));
    }

    const tokens: ProgressiveAnswerToken[] = [];
    if (feedback.verifiedPrefix) {
      const prefixWords = feedback.verifiedPrefix
        .split(/\s+/)
        .filter(Boolean);
      for (const w of prefixWords) {
        tokens.push({ text: w, state: "correct" });
      }
    }
    if (feedback.nextWordMask) {
      tokens.push({ text: feedback.nextWordMask, state: "masked" });
    }
    return tokens;
  }

  // 3. Fallback: serverTokens provided without expected text:
  // Render verified prefix tokens up to first non-correct token, then exactly ONE mask, then STOP.
  if (serverTokens && serverTokens.length > 0) {
    const tokens: ProgressiveAnswerToken[] = [];
    for (const tok of serverTokens) {
      if (tok.status === "CORRECT") {
        tokens.push({ text: tok.text ?? "", state: "correct" });
      } else {
        tokens.push({
          text: tok.text && tok.text.includes("*") ? tok.text : "***",
          state: "masked",
        });
        break;
      }
    }
    return tokens;
  }

  return [];
}
