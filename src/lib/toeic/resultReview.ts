/**
 * Pure helpers for the TOEIC result and answer-review pages: answer filters,
 * Part grouping, the S&W task groups, and the Listening master segment of a
 * question group. No React, no I/O, so they are unit tested directly.
 */
import type { MasterSegment } from "./examPaper";

export type ReviewFilter = "ALL" | "CORRECT" | "INCORRECT" | "SKIPPED" | "FLAGGED";

export const REVIEW_FILTERS: Array<{ id: ReviewFilter; label: string }> = [
  { id: "ALL", label: "Tất cả" },
  { id: "CORRECT", label: "Đúng" },
  { id: "INCORRECT", label: "Sai" },
  { id: "SKIPPED", label: "Bỏ qua" },
  { id: "FLAGGED", label: "Đã đánh dấu" },
];

type Reviewable = { part: number; questionNumber: number; status: "CORRECT" | "INCORRECT" | "SKIPPED"; flagged: boolean };

export function filterReview<Q extends Reviewable>(questions: Q[], filter: ReviewFilter): Q[] {
  if (filter === "ALL") return questions;
  if (filter === "FLAGGED") return questions.filter((q) => q.flagged);
  return questions.filter((q) => q.status === filter);
}

/** Questions grouped by Part, Parts ascending, numbers ascending. */
export function groupByPart<Q extends Reviewable>(questions: Q[]) {
  const parts = [...new Set(questions.map((q) => q.part))].sort((a, b) => a - b);
  return parts.map((part) => ({
    part,
    questions: questions.filter((q) => q.part === part).sort((a, b) => a.questionNumber - b.questionNumber),
  }));
}

/** "1:05:12" past an hour, else "12:05"; null when unknown. */
export function formatDuration(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds < 0) return null;
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

export function formatAccuracy(accuracy: number | null | undefined) {
  return accuracy === null || accuracy === undefined ? "—" : `${accuracy.toFixed(2).replace(/\.?0+$/, "")}%`;
}

/** Start and end of a question group inside the Listening master, if present. */
export function groupSegment(timeline: MasterSegment[], groupId: number) {
  const segment = timeline.find((s) => s.kind === "GROUP" && s.groupId === groupId);
  return segment ? { start: segment.start, end: segment.end } : null;
}

export type TaskGroup = { from: number; to: number; label: string };

/** TOEIC Speaking task structure (11 tasks). */
export const SPEAKING_GROUPS: TaskGroup[] = [
  { from: 1, to: 2, label: "Đọc to đoạn văn" },
  { from: 3, to: 4, label: "Mô tả bức tranh" },
  { from: 5, to: 7, label: "Trả lời câu hỏi" },
  { from: 8, to: 10, label: "Trả lời câu hỏi dựa trên thông tin" },
  { from: 11, to: 11, label: "Trình bày quan điểm" },
];

/** TOEIC Writing task structure (8 tasks). */
export const WRITING_GROUPS: TaskGroup[] = [
  { from: 1, to: 5, label: "Viết câu dựa trên bức tranh" },
  { from: 6, to: 7, label: "Trả lời yêu cầu bằng văn bản" },
  { from: 8, to: 8, label: "Viết bài luận nêu quan điểm" },
];

/** Tasks placed in their structural groups; tasks past the last group go last. */
export function groupTasks<T extends { number: number }>(tasks: T[], groups: TaskGroup[]) {
  const grouped = groups
    .map((g) => ({
      ...g,
      range: g.from === g.to ? `Q${g.from}` : `Q${g.from}–${g.to}`,
      tasks: tasks.filter((t) => t.number >= g.from && t.number <= g.to),
    }))
    .filter((g) => g.tasks.length > 0);
  const last = groups.at(-1)?.to ?? 0;
  const rest = tasks.filter((t) => t.number > last);
  return rest.length ? [...grouped, { from: last + 1, to: rest.at(-1)!.number, label: "Câu khác", range: "Khác", tasks: rest }] : grouped;
}

export const TASK_STATUS_LABEL: Record<string, string> = {
  NOT_SUBMITTED: "Chưa làm",
  PENDING: "Đang chấm",
  FAILED: "Chấm lỗi",
  NO_SPEECH: "Không nhận ra lời nói",
  GRADED: "Đã chấm",
};
