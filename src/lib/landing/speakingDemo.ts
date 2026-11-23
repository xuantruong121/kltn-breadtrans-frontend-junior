/**
 * The hero's pronunciation demo (spec 6.3): one real sentence, its reference
 * audio and the word-by-word scores of one real submission.
 *
 * Source, read on 22/11/2026:
 * - exercise 137, from the A1 set "Borrowing Books from the University Library";
 * - submission 309, made by a test learner account;
 * - audioSrc is that exercise's public reference clip on R2 (about 92 KB).
 * Each word's errorType was read from kltn_db (read-only) on 23/11/2026: all 18 are "None".
 *
 * The clip stores no per-word timings, so the hero lights each run of words
 * by its share of the characters (litChunks), not by when the word is spoken.
 */

/** A word's error type as the speaking scores store it. */
export type WordError = "None" | "Omission" | "Mispronunciation";

export type DemoWord = { word: string; score: number; errorType: WordError };

export type SpeakingDemo = {
  exerciseId: 137;
  submissionId: 309;
  audioSrc: string;
  sentence: string;
  /** Overall score out of 10. */
  overall: 9.6;
  accuracy: 96;
  fluency: 94;
  completeness: 100;
  /** The 18 words of the sentence in order, each with its score out of 100. */
  words: DemoWord[];
};

export const DEMO: SpeakingDemo = {
  exerciseId: 137,
  submissionId: 309,
  audioSrc: "https://pub-ecd236c9754a4b7cb22ab82189e6ded2.r2.dev/catalog/speaking/reference/137.v2.mp3",
  sentence: "The university library is open from Monday to Friday from eight in the morning until ten at night.",
  overall: 9.6,
  accuracy: 96,
  fluency: 94,
  completeness: 100,
  words: [
    { word: "The", score: 91, errorType: "None" },
    { word: "university", score: 100, errorType: "None" },
    { word: "library", score: 97, errorType: "None" },
    { word: "is", score: 97, errorType: "None" },
    { word: "open", score: 94, errorType: "None" },
    { word: "from", score: 100, errorType: "None" },
    { word: "Monday", score: 100, errorType: "None" },
    { word: "to", score: 97, errorType: "None" },
    { word: "Friday", score: 97, errorType: "None" },
    { word: "from", score: 97, errorType: "None" },
    { word: "eight", score: 97, errorType: "None" },
    { word: "in", score: 97, errorType: "None" },
    { word: "the", score: 94, errorType: "None" },
    { word: "morning", score: 97, errorType: "None" },
    { word: "until", score: 97, errorType: "None" },
    { word: "ten", score: 91, errorType: "None" },
    { word: "at", score: 97, errorType: "None" },
    { word: "night.", score: 91, errorType: "None" },
  ],
};

/** A run of consecutive words; `weight` is its number of characters. */
export type WordChunk = { words: DemoWord[]; weight: number };

const weightOf = (words: DemoWord[]) => words.reduce((sum, w) => sum + w.word.length, 0);

/**
 * Split `words` into `count` runs of nearly equal length in characters,
 * keeping the order and giving every run at least one word. Asking for more
 * runs than there are words gives one word per run.
 */
export function chunkWords(words: DemoWord[], count: number): WordChunk[] {
  const runs = Math.min(Math.floor(count), words.length);
  if (!(runs > 0)) return [];

  // ends[i] = characters in words[0..i-1]
  const ends = [0];
  for (const w of words) ends.push(ends[ends.length - 1] + w.word.length);
  const total = ends[words.length];

  const chunks: WordChunk[] = [];
  let start = 0;
  for (let k = 0; k < runs; k++) {
    let end = words.length;
    if (k < runs - 1) {
      // Cut nearest the even target, leaving at least one word per later run.
      const target = (total * (k + 1)) / runs;
      const last = words.length - (runs - k - 1);
      end = start + 1;
      for (let i = start + 2; i <= last; i++) {
        if (Math.abs(ends[i] - target) < Math.abs(ends[end] - target)) end = i;
      }
    }
    const run = words.slice(start, end);
    chunks.push({ words: run, weight: weightOf(run) });
    start = end;
  }
  return chunks;
}

/**
 * How many runs are lit at `currentTime` of a clip `duration` seconds long:
 * a run lights once playback passes the share of characters before it.
 * 0 at the start, all of them at the end, and 0 while the duration is unknown.
 */
export function litChunks(currentTime: number, duration: number, chunks: WordChunk[]): number {
  if (!Number.isFinite(currentTime) || !Number.isFinite(duration) || duration <= 0) return 0;
  const ratio = Math.min(1, Math.max(0, currentTime / duration));
  if (ratio <= 0) return 0;
  if (ratio >= 1) return chunks.length;

  const total = chunks.reduce((sum, c) => sum + c.weight, 0);
  const progress = ratio * total;
  let lit = 0;
  let before = 0;
  for (const chunk of chunks) {
    if (before >= progress) break;
    lit++;
    before += chunk.weight;
  }
  return lit;
}

/** For each word, in sentence order, the index of the run it belongs to (the hero's chip to cut map). */
export function runOfEachWord(chunks: WordChunk[]): number[] {
  return chunks.flatMap((chunk, run) => chunk.words.map(() => run));
}

/**
 * The run being read when `lit` of `runs` runs are lit: the last lit one, whose
 * chips the hero highlights. -1 (nothing highlighted) when no run is lit yet or
 * `lit` is not a whole count from 1 to `runs`.
 */
export function readingRun(lit: number, runs: number): number {
  if (!Number.isInteger(lit) || lit < 1 || lit > runs) return -1;
  return lit - 1;
}

/** The three score bands of the speaking result screen (src/lib/speaking/speakingPracticeLogic.ts, getAccuracyTier). */
export type ScoreBand = "pass" | "fix" | "fail";

/**
 * The band of a word score out of 100, by the product's thresholds:
 * 80 and up "Đạt chuẩn", 60-79 "Cần chỉnh lại", under 60 "Chưa đạt".
 */
export function scoreBand(score: number): ScoreBand {
  if (score >= 80) return "pass";
  if (score >= 60) return "fix";
  return "fail";
}

/** The band names of the speaking result screen's legend. */
export const SCORE_BAND_LABEL: Record<ScoreBand, string> = {
  pass: "Đạt chuẩn",
  fix: "Cần chỉnh lại",
  fail: "Chưa đạt",
};

/**
 * Whether a word counts as "Đạt chuẩn", as the result screen counts it
 * (src/app/(student)/speaking/[id]/page.tsx): a score of 80 or more and
 * errorType "None". The screen also needs isCorrect; the words read from
 * kltn_db carry none, so this helper does not model it.
 */
export function passesStandard(word: Pick<DemoWord, "score" | "errorType">): boolean {
  return scoreBand(word.score) === "pass" && word.errorType === "None";
}

/** A word as its chip shows it: without the sentence's closing punctuation. */
export function chipText(word: Pick<DemoWord, "word" | "score">): string {
  return word.word.replace(/[.,!?;:]+$/, "");
}

/**
 * What a chip's title and screen-reader text add, since the chip itself shows
 * no digits: the band and the score, as the speaking result fragment does.
 */
export function chipBandLabel(word: Pick<DemoWord, "word" | "score">): string {
  return `${SCORE_BAND_LABEL[scoreBand(word.score)]} (${word.score}%)`;
}
