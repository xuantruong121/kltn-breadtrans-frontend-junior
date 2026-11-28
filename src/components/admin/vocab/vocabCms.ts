/**
 * Pure helpers for the vocab deck editor: Quizlet-style paste, the publish
 * checklist and how ready a word is for each of the 4 learner steps.
 */
import { buildQuizOptions } from "../../../modules/vocab/utils/quizOptions.ts";
import { checklistBlocker, listPublishBlocker, missingItems } from "../publishBlocker.ts";
import { PRACTICE_LEVELS } from "../../../lib/learning-path/practiceLevel.ts";

/** "10", "9:00", "3.5": flashcards teach words, not numbers. */
export const isBareNumber = (word: string) => /^\d+([.,:]\d+)*$/.test(word.trim());

/** A deck's level: one of the four practice levels (owner 2026-11-27). */
export const VOCAB_LEVELS = PRACTICE_LEVELS;

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
  "article",
  "number",
  "modal verb",
  "proper noun",
] as const;

/** What each part of speech is called to the admin: "noun (danh từ)". Only the label; the stored value stays English. */
export const POS_LABEL_VI: Record<(typeof POS_OPTIONS)[number], string> = {
  noun: "danh từ",
  verb: "động từ",
  adjective: "tính từ",
  adverb: "trạng từ",
  phrase: "cụm từ",
  "phrasal verb": "cụm động từ",
  idiom: "thành ngữ",
  preposition: "giới từ",
  conjunction: "liên từ",
  pronoun: "đại từ",
  determiner: "hạn định từ",
  article: "mạo từ",
  number: "số từ",
  "modal verb": "động từ khuyết thiếu",
  "proper noun": "danh từ riêng",
};

/** "noun" becomes "noun (danh từ)"; a part of speech outside the list (from an external dictionary) is shown as it is. */
export function posLabel(pos: string): string {
  const vi = (POS_LABEL_VI as Record<string, string | undefined>)[pos];
  return vi ? `${pos} (${vi})` : pos;
}

/** The level an AI request takes: the deck's own, Cơ bản when it has none. */
export function aiDeckLevel(level?: string | null) {
  return level && (PRACTICE_LEVELS as readonly string[]).includes(level) ? level : "BASIC";
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
      else if (isBareNumber(word)) row.error = "Số không dùng làm từ vựng";
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

/**
 * Why the deck cannot be published yet, or null. Every checklist item is
 * required; the server's publish refuses the same (vocabDeckProblems).
 */
export const vocabPublishBlocker = (checklist: ChecklistItem[], unsaved: boolean) =>
  checklistBlocker(checklist, unsaved);

/** What the publish confirmation says once the check passed. */
export const vocabPublishConfirm = (checklist: ChecklistItem[]) =>
  `Đạt ${checklist.length}/${checklist.length} mục kiểm tra. Bộ từ sẽ hiện trong Flashcard của học viên.`;

/**
 * A deck card's publish blocker on the list: the server's rule for the
 * page's drafts; without it the card checks what it has (title, words).
 */
export function vocabListBlocker(deck: {
  title: string;
  wordCount: number;
  publicationStatus: string;
  publishProblems?: string[] | null;
}): string | null {
  return listPublishBlocker(deck, () =>
    missingItems([
      { label: "Có tên bộ từ", done: filled(deck.title) },
      { label: "Có ít nhất 1 từ", done: deck.wordCount > 0 },
    ]),
  );
}

export type DeckStats = {
  total: number;
  withIpa: number;
  withExample: number;
  distinctMeanings: number;
};

/** Words still without US phonetics: each one blocks publishing the deck. */
export const wordsWithoutIpa = <T extends { ipaUs?: string | null }>(words: T[]) =>
  words.filter((word) => !filled(word.ipaUs));

/** From the server's deck summary, so a large deck needs no full load. */
export function vocabDeckChecklist(deck: {
  title: string;
  stats: DeckStats;
}): ChecklistItem[] {
  const { total: n, withIpa, withExample, distinctMeanings } = deck.stats;
  const items: ChecklistItem[] = [
    { label: "Có tên bộ từ", done: filled(deck.title) },
    { label: "Có ít nhất 1 từ", done: n > 0 },
  ];
  if (!n) return items;
  items.push(
    { label: `Phiên âm ${withIpa}/${n} từ`, done: withIpa === n },
    { label: `Câu ví dụ ${withExample}/${n} từ`, done: withExample === n },
    {
      label: "Có ít nhất 4 từ khác nghĩa nhau",
      done: distinctMeanings >= 4,
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

/** A dictionary store entry (F13) as the admin API returns it. */
export type DictionaryEntry = {
  id: number;
  headword: string;
  displayWord: string;
  pos: string;
  ipaUs?: string | null;
  ipaUk?: string | null;
  audioUs?: string | null;
  audioUk?: string | null;
  meaningVi: string;
  exampleEn?: string | null;
  exampleVi?: string | null;
  collocations?: Array<{ phrase: string; meaningVi: string }> | null;
  source: "CURATED" | "EXTERNAL" | "AI";
  status: "APPROVED" | "PENDING_REVIEW" | "REJECTED";
  usedInDecks?: number;
};

export const DICTIONARY_STATUS: Record<
  DictionaryEntry["status"],
  { label: string; tone: string }
> = {
  APPROVED: { label: "Đã duyệt", tone: "bg-emerald-50 text-emerald-700" },
  PENDING_REVIEW: { label: "Chờ duyệt", tone: "bg-amber-50 text-amber-800" },
  REJECTED: { label: "Đã loại", tone: "bg-rose-50 text-rose-700" },
};

export const DICTIONARY_SOURCE: Record<DictionaryEntry["source"], string> = {
  CURATED: "Biên soạn",
  EXTERNAL: "Từ điển ngoài",
  AI: "AI",
};

/** An entry in the word form's shape, so one form edits decks and the store. */
export function entryToWord(entry: DictionaryEntry) {
  return {
    id: entry.id,
    word: entry.displayWord,
    meaning: entry.meaningVi,
    pos: entry.pos,
    ipaUs: entry.ipaUs,
    ipaUk: entry.ipaUk,
    audioUs: entry.audioUs,
    audioUk: entry.audioUk,
    exampleEn: entry.exampleEn,
    exampleVi: entry.exampleVi,
    collocations: entry.collocations,
    order: 0,
    usedInDecks: entry.usedInDecks,
  };
}

/** Warns that an edit reaches every deck (and lookup) sharing the entry. */
export function sharedEntryNote(usedInDecks?: number) {
  return usedInDecks && usedInDecks > 1
    ? `Từ này nằm trong ${usedInDecks} bộ. Sửa ở đây sẽ đổi ở cả ${usedInDecks} bộ và khi học viên tra từ.`
    : null;
}
