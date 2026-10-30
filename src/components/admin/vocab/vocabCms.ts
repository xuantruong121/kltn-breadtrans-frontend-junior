/**
 * Pure helpers for the vocab deck editor: Quizlet-style paste, the publish
 * checklist and how ready a word is for each of the 4 learner steps.
 */
import { buildQuizOptions } from "../../../modules/vocab/utils/quizOptions.ts";

export const VOCAB_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export const POS_OPTIONS = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "phrase",
  "phrasal verb",
  "idiom",
  "preposition",
  "conjunction",
  "pronoun",
  "determiner",
] as const;

/** The AI endpoints take the course scale, not CEFR. */
export function cefrToCourseLevel(level?: string | null) {
  if (level === "A1" || level === "A2") return "BEGINNER";
  if (level === "C1" || level === "C2") return "ADVANCED";
  return "INTERMEDIATE";
}

export type PastedWord = {
  line: number;
  word: string;
  meaning: string;
  pos: string;
  exampleEn: string;
  exampleVi: string;
  error?: string;
  duplicate?: boolean;
};

function splitLine(line: string): string[] {
  if (line.includes("\t")) return line.split("\t");
  if (line.includes("|")) return line.split("|");
  const dash = line.indexOf(" - ");
  if (dash > 0) return [line.slice(0, dash), line.slice(dash + 3)];
  const comma = line.indexOf(",");
  if (comma > 0) return [line.slice(0, comma), line.slice(comma + 1)];
  return [line];
}

/**
 * One word per line: `word | meaning | pos | example | example meaning`.
 * Tab (a spreadsheet copy) or `|` give all columns; ` - ` or the first comma
 * split word from meaning only, as Quizlet's import does.
 */
export function parseVocabPaste(
  text: string,
  existingWords: string[] = [],
): PastedWord[] {
  const known = new Set(existingWords.map((w) => w.trim().toLowerCase()));
  const seen = new Set<string>();
  return text
    .split("\n")
    .map((raw, index) => ({ raw: raw.trim(), line: index + 1 }))
    .filter(({ raw }) => raw)
    .map(({ raw, line }) => {
      const [word = "", meaning = "", pos = "", exampleEn = "", exampleVi = ""] =
        splitLine(raw).map((cell) => cell.trim());
      const posLower = pos.toLowerCase();
      const key = word.toLowerCase();
      const row: PastedWord = {
        line,
        word,
        meaning,
        pos: posLower || "noun",
        exampleEn,
        exampleVi,
        duplicate: known.has(key) || seen.has(key),
      };
      seen.add(key);
      if (!word || !meaning) row.error = "Thiếu từ hoặc nghĩa";
      else if (posLower && !(POS_OPTIONS as readonly string[]).includes(posLower))
        row.error = `Loại từ "${pos}" không có trong danh sách`;
      return row;
    });
}

type WordLike = {
  id: number;
  word: string;
  meaning: string;
  ipaUs?: string | null;
  exampleEn?: string | null;
  audioUs?: string | null;
};

export type ChecklistItem = { label: string; done: boolean };

const filled = (v?: string | null) => String(v ?? "").trim() !== "";

export function vocabDeckChecklist(deck: {
  title: string;
  words: WordLike[];
}): ChecklistItem[] {
  const n = deck.words.length;
  const items: ChecklistItem[] = [
    { label: "Có tên bộ từ", done: filled(deck.title) },
    { label: "Có ít nhất 1 từ", done: n > 0 },
  ];
  if (!n) return items;
  const ipa = deck.words.filter((w) => filled(w.ipaUs)).length;
  const examples = deck.words.filter((w) => filled(w.exampleEn)).length;
  const meanings = new Set(deck.words.map((w) => w.meaning.trim())).size;
  items.push(
    {
      label: "Mỗi từ có nghĩa tiếng Việt",
      done: deck.words.every((w) => filled(w.meaning)),
    },
    { label: `Phiên âm ${ipa}/${n} từ`, done: ipa === n },
    { label: `Câu ví dụ ${examples}/${n} từ`, done: examples === n },
    {
      label: "Ít nhất 4 nghĩa khác nhau cho bước Trắc nghiệm",
      done: meanings >= 4,
    },
  );
  return items;
}

export type StageReadiness = {
  stage: "FLASHCARD" | "QUIZ" | "TYPING" | "SPEAKING";
  label: string;
  ready: boolean;
  note?: string;
};

/** What each learner step will show for this word, and what is missing. */
export function wordStageReadiness(
  word: WordLike,
  words: WordLike[],
): StageReadiness[] {
  const missing = [
    !filled(word.ipaUs) && "phiên âm",
    !filled(word.exampleEn) && "câu ví dụ",
  ].filter(Boolean);
  const { fallbackCount } = buildQuizOptions(word, words);
  return [
    {
      stage: "FLASHCARD",
      label: "Lật thẻ",
      ready: filled(word.meaning),
      note: missing.length ? `Thiếu ${missing.join(" và ")}` : undefined,
    },
    {
      stage: "QUIZ",
      label: "Trắc nghiệm",
      ready: fallbackCount === 0,
      note: fallbackCount
        ? `Bộ chưa đủ nghĩa khác nhau: ${fallbackCount} phương án sai lấy từ danh sách chung`
        : undefined,
    },
    {
      stage: "TYPING",
      label: "Gõ từ",
      ready: filled(word.word),
      note: /\s/.test(word.word.trim())
        ? "Cụm nhiều chữ: học viên phải gõ đủ cả cụm"
        : undefined,
    },
    {
      stage: "SPEAKING",
      label: "Nói",
      ready: true,
      note: filled(word.audioUs)
        ? undefined
        : "Chưa có audio: học viên nghe giọng máy của trình duyệt",
    },
  ];
}
