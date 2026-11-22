/**
 * The hero's pronunciation demo (spec 6.3): one real sentence, its reference
 * audio and the word-by-word scores of one real submission.
 *
 * Source, read on 22/11/2026:
 * - exercise 137, from the A1 set "Borrowing Books from the University Library";
 * - submission 309, made by a test learner account;
 * - audioSrc is that exercise's public reference clip on R2 (about 92 KB).
 *
 * The clip stores no per-word timings, so the hero lights each run of words
 * by its share of the characters (litChunks), not by when the word is spoken.
 */

export type DemoWord = { word: string; score: number };

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
    { word: "The", score: 91 },
    { word: "university", score: 100 },
    { word: "library", score: 97 },
    { word: "is", score: 97 },
    { word: "open", score: 94 },
    { word: "from", score: 100 },
    { word: "Monday", score: 100 },
    { word: "to", score: 97 },
    { word: "Friday", score: 97 },
    { word: "from", score: 97 },
    { word: "eight", score: 97 },
    { word: "in", score: 97 },
    { word: "the", score: 94 },
    { word: "morning", score: 97 },
    { word: "until", score: 97 },
    { word: "ten", score: 91 },
    { word: "at", score: 97 },
    { word: "night.", score: 91 },
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
