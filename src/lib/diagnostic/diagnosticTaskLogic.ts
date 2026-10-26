import { DIAGNOSTIC_SPEAKING_MAX_DURATION_MS } from "./diagnosticSpeakingRecorderLogic.ts";

/** The task fields the backend sends for every Entry Diagnostic question. */
export interface DiagnosticTaskQuestion {
  id: number;
  section?: string;
  skill?: string;
  questionType?: string;
  taskType?: string | null;
  productive?: boolean;
  responseSeconds?: number | null;
  prepSeconds?: number | null;
  wordMin?: number | null;
  wordMax?: number | null;
}

const SECTION_LABELS: Record<string, string> = {
  LISTENING: "Nghe",
  READING: "Đọc",
  SPEAKING: "Nói",
  WRITING: "Viết",
  LANGUAGE_USE: "Ngữ pháp & Từ vựng",
};

export function isSpeakingTask(q: DiagnosticTaskQuestion): boolean {
  return q.taskType === "SPEAKING_RESPONSE" || (q.section === "SPEAKING" && q.questionType === "OPEN_TEXT");
}

export function isWritingTask(q: DiagnosticTaskQuestion): boolean {
  return q.taskType === "WRITING_RESPONSE" || (q.questionType === "OPEN_TEXT" && !isSpeakingTask(q));
}

/**
 * What the administered form actually contains, counted from its own items.
 * Replaces hard-coded figures ("52 nhiệm vụ, 48 trắc nghiệm") that described a
 * form no learner is given.
 */
export function describeForm(questions: DiagnosticTaskQuestion[]) {
  const productive = questions.filter((q) => isSpeakingTask(q) || isWritingTask(q));
  const parts: Array<{ section: string; label: string; count: number }> = [];
  for (const q of questions) {
    const section = isSpeakingTask(q) ? "SPEAKING" : isWritingTask(q) ? "WRITING" : (q.section ?? q.skill ?? "OTHER");
    const existing = parts.find((p) => p.section === section);
    if (existing) existing.count += 1;
    else parts.push({ section, label: SECTION_LABELS[section] ?? section, count: 1 });
  }
  return {
    total: questions.length,
    objective: questions.length - productive.length,
    speaking: productive.filter(isSpeakingTask).length,
    writing: productive.filter(isWritingTask).length,
    parts,
  };
}

/** The server's per-task response limit; the generic cap only for legacy tasks. */
export function speakingLimitMs(q: DiagnosticTaskQuestion): number {
  return Number.isInteger(q.responseSeconds) && (q.responseSeconds as number) > 0
    ? (q.responseSeconds as number) * 1000
    : DIAGNOSTIC_SPEAKING_MAX_DURATION_MS;
}

/** Identical to the backend's countDiagnosticWords. */
export function countWords(value: string): number {
  return value.trim() ? value.trim().split(/\s+/u).length : 0;
}

export type WritingGuidance = { tone: "neutral" | "below" | "within" | "above"; message: string } | null;

/**
 * The stated word range is GUIDANCE (WRT_RUBRIC_V3), never a submission gate,
 * so the message informs without blocking.
 */
export function writingGuidance(words: number, min?: number | null, max?: number | null): WritingGuidance {
  const hasMin = Number.isInteger(min);
  const hasMax = Number.isInteger(max);
  if (!hasMin && !hasMax) return null;
  const range = hasMin && hasMax ? `${min}–${max} từ` : hasMin ? `ít nhất ${min} từ` : `tối đa ${max} từ`;
  if (words === 0) return { tone: "neutral", message: `Gợi ý độ dài: ${range}.` };
  if (hasMin && words < (min as number)) return { tone: "below", message: `${words} từ · gợi ý ${range}. Bài ngắn hơn gợi ý vẫn được chấm.` };
  if (hasMax && words > (max as number)) return { tone: "above", message: `${words} từ · gợi ý ${range}.` };
  return { tone: "within", message: `${words} từ · trong khoảng gợi ý ${range}.` };
}

const CRITERION_LABELS: Record<string, string> = {
  task_fulfilment: "Hoàn thành yêu cầu",
  task_achievement: "Hoàn thành yêu cầu",
  intelligibility: "Độ dễ hiểu",
  fluency: "Độ trôi chảy",
  language_use: "Sử dụng ngôn ngữ",
  organisation: "Tổ chức ý",
  vocabulary: "Từ vựng",
  grammar: "Ngữ pháp",
};

export function formatCriterionName(key: string): string {
  return CRITERION_LABELS[key] ?? key;
}

export type SkillStateLabel = { label: string; tone: "done" | "pending" | "failed" | "missing" };

export function describeSkillState(state: string | null | undefined): SkillStateLabel {
  if (state === "COMPLETE") return { label: "Đã có điểm", tone: "done" };
  if (state === "PENDING_GRADING") return { label: "Đang chấm", tone: "pending" };
  if (state === "GRADING_FAILED") return { label: "Chấm chưa thành công", tone: "failed" };
  return { label: "Chưa đủ bài làm", tone: "missing" };
}
