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

export type SkillStateLabel = { label: string; tone: "done" | "pending" | "failed" | "missing" | "skipped" };

export function describeSkillState(
  state: string | null | undefined,
  counts?: { tasksSkipped?: number; itemsTotal?: number } | null,
): SkillStateLabel {
  if (state === "COMPLETE") return { label: "Đã có điểm", tone: "done" };
  if (state === "PENDING_GRADING") return { label: "Đang chấm", tone: "pending" };
  if (state === "GRADING_FAILED") return { label: "Chấm chưa thành công", tone: "failed" };
  const skipped = counts?.tasksSkipped ?? 0;
  if (skipped > 0)
    return {
      label: skipped === counts?.itemsTotal ? "Đã bỏ qua" : `Bỏ qua ${skipped}/${counts?.itemsTotal} bài`,
      tone: "skipped",
    };
  return { label: "Chưa đủ bài làm", tone: "missing" };
}

/**
 * Front-end marker for "the learner chose to skip this Writing task". It is
 * sent to the server as the empty string, which the server records as an
 * explicit skip; it is never graded and never scored as 0.
 */
export const WRITING_SKIPPED = "__WRITING_SKIPPED__";

export function toSubmissionAnswers(answers: Record<string, number | string>): Record<string, number | string> {
  return Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, v === WRITING_SKIPPED ? "" : v]));
}

/** Productive tasks the learner skipped, for the pre-submit confirmation. */
export function countSkippedTasks(questions: DiagnosticTaskQuestion[], answers: Record<string, number | string>) {
  let speaking = 0;
  let writing = 0;
  for (const q of questions) {
    const a = answers[q.id];
    if (isSpeakingTask(q) && a === "SKIPPED") speaking += 1;
    else if (isWritingTask(q) && a === WRITING_SKIPPED) writing += 1;
  }
  return { speaking, writing };
}

/**
 * The passage span a Reading question points at, for bolding it.
 *
 * Deterministic and conservative: only a phrase the question quotes is
 * considered, and only when it can be placed exactly once.
 *   - `"X" in "Y"` (e.g. "it" in "it feels worse"): Y must occur once in the
 *     passage; X is the first occurrence inside it.
 *   - `"X"`: X must occur once in the passage (whole words, any case).
 * Anything ambiguous returns null. Answer options are never consulted.
 */
export function findReferenceHighlight(
  question: string,
  passage: string,
): { start: number; end: number } | null {
  const quoted = [...question.matchAll(/["“”']([^"“”']{1,80})["“”']/g)].map((m) => m[1].trim()).filter(Boolean);
  if (!quoted.length) return null;
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const occurrences = (needle: string, hay: string) =>
    [...hay.matchAll(new RegExp(`(?<![A-Za-z])${escape(needle)}(?![A-Za-z])`, "gi"))].map((m) => m.index as number);

  if (quoted.length >= 2) {
    const [target, context] = quoted;
    const at = occurrences(context, passage);
    if (at.length !== 1) return null;
    const inner = occurrences(target, passage.slice(at[0], at[0] + context.length));
    if (!inner.length) return null;
    const start = at[0] + inner[0];
    return { start, end: start + target.length };
  }
  const at = occurrences(quoted[0], passage);
  if (at.length !== 1) return null;
  return { start: at[0], end: at[0] + quoted[0].length };
}

/**
 * A learner-facing message for a failed Speaking/Writing request. Raw
 * transport text ("Request failed with status code 400") is never shown.
 */
export function learnerErrorMessage(error: unknown): string {
  const e = error as { response?: { status?: number; data?: { message?: unknown } }; code?: string; message?: string };
  if (e?.message === "MIC_DENIED") return "Chưa được cấp quyền sử dụng micro. Hãy kiểm tra quyền truy cập và thử lại.";
  if (e?.message === "MIC_UNAVAILABLE") return "Không thể dùng micro trên thiết bị này. Hãy kiểm tra micro và thử lại.";
  if (e?.message === "EMPTY_RECORDING") return "Không thể sử dụng bản ghi này. Vui lòng ghi âm lại.";
  const status = e?.response?.status;
  const raw = e?.response?.data?.message;
  const text = Array.isArray(raw) ? raw.join(" ") : typeof raw === "string" ? raw : "";
  if (!e?.response) return "Không thể tải bản ghi âm lên. Kiểm tra kết nối và thử lại.";
  if (status === 429) return "Có quá nhiều yêu cầu. Vui lòng thử lại sau.";
  if (status === 503 || status === 502) return "Dịch vụ chấm bài đang tạm thời gián đoạn. Bạn có thể thử lại sau.";
  if (status === 400) {
    if (/Thời lượng|ngắn|dài/i.test(text)) return "Không thể xác nhận bản ghi âm. Vui lòng ghi âm lại.";
    if (/rỗng|Định dạng|Không đọc được|10MB/i.test(text)) return "Không thể sử dụng bản ghi này. Vui lòng ghi âm lại.";
    if (/hoàn tất/i.test(text)) return "Bài đánh giá đã được nộp nên không thể thay đổi phần này.";
  }
  if (status === 401 || status === 403) return "Phiên làm bài không còn hợp lệ. Hãy tải lại trang và đăng nhập lại.";
  return "Không thể lưu bản ghi âm. Vui lòng thử lại.";
}

/**
 * Local draft of an unfinished attempt (objective choices and Writing text),
 * so returning to the attempt does not lose them. Speaking is not kept here:
 * its recordings are stored on the server. Storage failures are ignored.
 */
export function draftKey(attemptId: number) {
  return `breadtrans:diagnostic-draft:${attemptId}`;
}

export function parseDraft(raw: string | null): Record<string, number | string> {
  if (!raw) return {};
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).filter(
        ([k, v]) => /^\d+$/.test(k) && (typeof v === "number" || typeof v === "string"),
      ),
    ) as Record<string, number | string>;
  } catch {
    return {};
  }
}
