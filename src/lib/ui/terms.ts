/**
 * The name of each thing BreadTrans shows, and planName(). No imports, so
 * plain logic files (and their node tests) can use it; glossary.ts adds the
 * icons and re-exports these.
 */
export const TERMS = {
  currency: "Bánh Mì",
  streak: "chuỗi",
  streakShield: "khiên giữ chuỗi",
  learnerPoints: "XP",
  petPoints: "EXP",
  level: "Cấp",
  assistant: "Trợ lý Bánh Mì",
  listening: "Nghe",
  speaking: "Nói",
  reading: "Đọc",
  writing: "Viết",
  dictation: "Nghe chép",
  flashcard: "Flashcard",
  grammar: "Ngữ pháp",
  exams: "Luyện đề",
  quests: "Nhiệm vụ",
  pet: "Thú ảo",
  arena: "Đấu trường",
  shop: "Cửa hàng",
  ranking: "Bảng xếp hạng",
  badge: "huy hiệu",
  mistakes: "Sổ lỗi",
  notifications: "Thông báo",
  progress: "Tiến độ học tập",
  planFree: "Free",
  planPlus: "Plus",
  planPro: "Pro",
  /** The script of a listening exercise. */
  transcript: "Lời thoại",
  /** What the speech recogniser heard the learner say. */
  learnerSpeech: "Lời bạn nói",
  /** The /help page, in every menu and footer. */
  help: "Trợ giúp",
} as const;

export type Concept = keyof typeof TERMS;

/** "Gói Plus", "gói Pro": plan codes as they are written in text. */
export function planName(code: string | null | undefined): string {
  const upper = String(code ?? "").toUpperCase();
  return upper === "PRO" ? TERMS.planPro : upper === "PLUS" ? TERMS.planPlus : TERMS.planFree;
}
