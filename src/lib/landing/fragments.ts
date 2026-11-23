/**
 * Data of the landing's coded UI fragments (owner feedback #3 and #4, 23/11):
 * the six skills fragments and the five habit tiles in
 * src/components/landing/fragments/.
 *
 * Every value was read from kltn_db on 23/11/2026, from test accounts only.
 * Do not change or invent one: fragments.test.ts pins each value. Where a
 * test account has a weak personal number (a 0-1 day streak), the tile shows
 * the product's rule instead.
 *
 * No React and no I/O, so the tests run under the Node test runner.
 */
import { resolveWritingPlaceholder } from "../writing/writingExperienceLogic.ts";
import { scoreBand, type ScoreBand } from "./speakingDemo.ts";

// ---- Nói: speaking submission 304 ----------------------------------------

export type WordError = "None" | "Omission" | "Mispronunciation";
export type SpeakingWord = { text: string; accuracy: number; errorType: WordError };

/** The product's three score bands, plus an omitted word ("Bỏ sót"). */
export type WordBand = ScoreBand | "omit";

/**
 * Submission 304 (a test account) of exercise 137, from the set "Borrowing
 * Books from the University Library". `setLevel` is the set's code as stored;
 * the landing never shows it (no CEFR-like code on the page).
 */
export const SPEAKING_RESULT = {
  submissionId: 304,
  exerciseId: 137,
  title: "Borrowing Books from the University Library",
  setLevel: "A1",
  sentence: "The university library is open from Monday to Friday from eight in the morning until ten at night.",
  /** Out of 10. */
  overall: 7.8,
  accuracy: 73,
  fluency: 94,
  completeness: 78,
  words: [
    { text: "The", accuracy: 0, errorType: "Omission" },
    { text: "university", accuracy: 0, errorType: "Omission" },
    { text: "library", accuracy: 0, errorType: "Omission" },
    { text: "is", accuracy: 80, errorType: "None" },
    { text: "open", accuracy: 38, errorType: "Mispronunciation" },
    { text: "from", accuracy: 85, errorType: "None" },
    { text: "Monday", accuracy: 97, errorType: "None" },
    { text: "to", accuracy: 91, errorType: "None" },
    { text: "Friday", accuracy: 94, errorType: "None" },
    { text: "from", accuracy: 85, errorType: "None" },
    { text: "eight", accuracy: 97, errorType: "None" },
    { text: "in", accuracy: 80, errorType: "None" },
    { text: "the", accuracy: 91, errorType: "None" },
    { text: "morning", accuracy: 85, errorType: "None" },
    { text: "until", accuracy: 97, errorType: "None" },
    { text: "ten", accuracy: 94, errorType: "None" },
    { text: "at", accuracy: 97, errorType: "None" },
    { text: "night.", accuracy: 97, errorType: "None" },
  ] as SpeakingWord[],
};

/**
 * The band of a word: an omitted word is "Bỏ sót", the rest go by scoreBand.
 * The result screen's "Đạt chuẩn" also needs errorType "None" and isCorrect;
 * the words read from kltn_db carry no isCorrect, so this helper does not
 * model it. fragments.test.ts checks that every word of submission 304 at 80
 * or more has errorType "None", so the two agree on this data.
 */
export function bandOf(word: SpeakingWord): WordBand {
  if (word.errorType === "Omission") return "omit";
  return scoreBand(word.accuracy);
}

/** The score labels of the result screen (src/components/speaking/PronunciationReportCard.tsx). */
export const SPEAKING_SCORE_LABELS = {
  overall: "Điểm / 10",
  accuracy: "Độ chính xác",
  fluency: "Độ trôi chảy",
  completeness: "Độ hoàn thiện",
};

const BAND_NAMES: Record<WordBand, string> = {
  pass: "Đạt chuẩn",
  fix: "Cần chỉnh lại",
  fail: "Chưa đạt",
  omit: "Bỏ sót",
};

/** The four-item legend of the result screen, in its order and words (src/app/(student)/speaking/[id]/page.tsx). */
export const WORD_LEGEND: { band: WordBand; label: string }[] = [
  { band: "pass", label: "Đạt chuẩn (≥ 80%)" },
  { band: "fix", label: "Cần chỉnh lại (60-79%)" },
  { band: "fail", label: "Chưa đạt (< 60%)" },
  { band: "omit", label: "Bỏ sót" },
];

/** The band of a word in words, with its score unless it was omitted: "Chưa đạt (38%)", "Bỏ sót". */
export function wordBandLabel(word: SpeakingWord): string {
  const band = bandOf(word);
  return band === "omit" ? BAND_NAMES.omit : `${BAND_NAMES[band]} (${word.accuracy}%)`;
}

/** A chip shows no number; its title says the band and the score: "open: Chưa đạt (38%)", "The: Bỏ sót". */
export function wordTitle(word: SpeakingWord): string {
  return `${word.text}: ${wordBandLabel(word)}`;
}

// ---- Nghe, Đọc, Viết -----------------------------------------------------

export const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

/**
 * A quiz title as the landing shows it: without the set code (A1-C2) the
 * stored title carries, so no code reads as a CEFR level.
 * "Listening A2 — Everyday Communication" becomes "Listening — Everyday Communication".
 */
export function titleWithoutSetCode(title: string): string {
  return title.replace(/\s*\b[ABC][12]\b/g, "").replace(/\s{2,}/g, " ").trim();
}

/** Quiz 1, first question, as the learner sees it after answering. */
export const LISTENING_QUESTION = {
  quizId: 1,
  quiz: "Listening A2 — Everyday Communication",
  spoken: "The dentist can see you at two thirty on Thursday afternoon.",
  question: "When is the appointment?",
  options: ["Thursday at 3:30 P.M.", "Friday at 2:30 P.M.", "Thursday at 2:30 P.M.", "Wednesday at 2:00 P.M."],
  correctIndex: 2,
};

/** The app's label of a reading question type (src/lib/mistakes/mistakeView.ts). */
export const QUESTION_TYPE_LABELS = { DETAIL: "Chi tiết" } as const;

/** Quiz 2, first question, after answering. */
export const READING_QUESTION = {
  quizId: 2,
  quiz: "Reading A2 — Notices & Messages",
  passage:
    "NOTICE: The library will close at 5 P.M. this Friday for electrical maintenance. It will reopen at 9 A.M. on Saturday.",
  question: "Why will the library close early?",
  options: ["For a holiday", "For a staff meeting", "For electrical maintenance", "For book delivery"],
  correctIndex: 2,
  explanation: "The notice gives electrical maintenance as the reason.",
  questionType: "DETAIL" as keyof typeof QUESTION_TYPE_LABELS,
};

/** Quiz 4: the prompt card, before the learner writes anything. */
export const WRITING_PROMPT = {
  quizId: 4,
  quiz: "Writing B1 — Professional Email",
  taskType: "EMAIL",
  wordRange: [100, 130] as [number, number],
  prompt:
    "Bạn đã đăng ký một workshop vào thứ Sáu nhưng không thể tham dự. Viết email 100–130 từ cho ban tổ chức để xin chuyển sang buổi thứ Hai. Nêu lý do ngắn gọn và yêu cầu xác nhận.",
};

/** The answer box's placeholder, from the writing page's own helper for an EMAIL task. */
export const WRITING_PLACEHOLDER = resolveWritingPlaceholder({ taskType: WRITING_PROMPT.taskType });

/** The writing page's word counter: "0 / 130 từ" (src/app/(student)/writing/[id]/page.tsx). */
export function writingCounter(words: number, [, high]: [number, number]): string {
  return `${words} / ${high} từ`;
}

/** The writing page's target line under the answer box: "Mục tiêu 100–130 từ." */
export function writingTarget(range: [number, number]): string {
  return `Mục tiêu ${rangeLabel(range)} từ.`;
}

/** "100–130", with the en dash the writing page uses. */
export function rangeLabel([low, high]: [number, number]): string {
  return `${low}–${high}`;
}

// ---- Luyện đề TOEIC: exam 2 ----------------------------------------------

export type ExamSection = "listening" | "reading";
export type ExamPart = { part: number; section: ExamSection; questions: number };
export type Exam = { durationSeconds: number; parts: ExamPart[] };

/** Exam 2. No score and no other certificate is shown with it. */
export const TOEIC_EXAM = {
  examId: 2,
  title: "TOEIC 2 Skills: Listening & Reading — Đề luyện tập 01",
  source: "Theo cấu trúc TOEIC, do BreadTrans biên soạn",
  totalQuestions: 200,
  durationSeconds: 7200,
  /** The two ways to take it, in the app's words (src/modules/toeic/ToeicLrExamDetail.tsx). */
  fullTest: "Làm Full Test",
  pickParts: "Chọn Part muốn luyện",
  parts: [
    { part: 1, section: "listening", questions: 6 },
    { part: 2, section: "listening", questions: 25 },
    { part: 3, section: "listening", questions: 39 },
    { part: 4, section: "listening", questions: 30 },
    { part: 5, section: "reading", questions: 30 },
    { part: 6, section: "reading", questions: 16 },
    { part: 7, section: "reading", questions: 54 },
  ] as ExamPart[],
};

export function examMinutes(exam: Exam): number {
  return Math.round(exam.durationSeconds / 60);
}

export function partsOf(exam: Exam, section: ExamSection): ExamPart[] {
  return exam.parts.filter((p) => p.section === section);
}

export function sectionTotal(exam: Exam, section: ExamSection): number {
  return partsOf(exam, section).reduce((sum, p) => sum + p.questions, 0);
}

// ---- Flashcard -----------------------------------------------------------

/** Deck "Daily Routines & Time", first word. */
export const FLASHCARD = {
  deck: "Daily Routines & Time",
  word: "schedule",
  partOfSpeech: "noun",
  ipa: "/ˈskedʒ.uːl/",
  meaning: "lịch trình",
  example: "My schedule is quite busy on Mondays.",
  exampleVi: "Lịch trình của tôi khá bận vào thứ Hai.",
};

// ---- Habit tiles ---------------------------------------------------------

/**
 * student2's pet. The names are the app's own (src/modules/pet/types.ts):
 * the species, and its stage-1 form for level 1.
 */
export const PET = {
  speciesId: "foxy",
  speciesName: "Cáo Phim Ảnh",
  stageName: "Cáo Nhí Đeo Tai Nghe",
  level: 1,
  exp: 165,
  health: 100,
  satiety: 53,
  happiness: 100,
};

export type ShopItemType = "BADGE" | "AVATAR_FRAME" | "BOOST";

/** Three items of the real shop catalogue; prices in Bánh Mì. */
export const SHOP_ITEMS: { name: string; type: ShopItemType; price: number }[] = [
  { name: "Huy hiệu Ngôi Sao", type: "BADGE", price: 100 },
  { name: "Khung avatar Cam", type: "AVATAR_FRAME", price: 180 },
  { name: "Khiên giữ chuỗi", type: "BOOST", price: 250 },
];

export const SHOP_TYPE_LABELS: Record<ShopItemType, string> = {
  BADGE: "Huy hiệu",
  AVATAR_FRAME: "Khung avatar",
  BOOST: "Vật phẩm hỗ trợ",
};

/** The rule, not a personal count. The shield line follows the shield's own description in the shop. */
export const STREAK_RULES = [
  "Học ít nhất một bài mỗi ngày để giữ chuỗi.",
  "Lỡ một ngày? Khiên giữ chuỗi (250 Bánh Mì) tự được dùng để chuỗi không mất.",
];

export const WEEK_DAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const;

/** Index of a date's weekday in WEEK_DAYS (Monday 0, Sunday 6), in local time. */
export function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/** The duel format of src/modules/arena/components/ArenaHero.tsx, without the stakes. */
export const ARENA_DUEL = {
  title: "Song Đấu Từ Vựng",
  summary: "Ghép trận với một học viên khác, trả lời 10 câu từ vựng, 12 giây mỗi câu.",
  format: "1 đấu 1",
  questions: 10,
  secondsPerQuestion: 12,
  /** Plain initials, not invented names. */
  players: [
    { initial: "B", label: "Bạn" },
    { initial: "H", label: "Học viên" },
  ],
};

export type LeaderboardRow = { name: string; points: number; tier: string };

/** The test accounts only: other learners' names never appear on the landing. */
export const LEADERBOARD: LeaderboardRow[] = [
  { name: "Học viên BreadTrans 2", points: 1505, tier: "Bạch Kim" },
  { name: "Học viên BreadTrans 3", points: 878, tier: "Kim Cương" },
  { name: "Học viên BreadTrans 1", points: 125, tier: "Vàng" },
];

/** Rows ordered by points, highest first, with their rank. */
export function rankByPoints(rows: LeaderboardRow[]): (LeaderboardRow & { rank: number })[] {
  return [...rows].sort((a, b) => b.points - a.points).map((row, index) => ({ ...row, rank: index + 1 }));
}

// ---- Number formats ------------------------------------------------------

/** "7,8": a decimal comma, as Vietnamese text writes it. */
export function formatDecimal(value: number): string {
  return String(value).replace(".", ",");
}

/** "1.505": a dot between thousands, the same on the server and in every browser. */
export function formatThousands(value: number): string {
  return String(Math.trunc(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
