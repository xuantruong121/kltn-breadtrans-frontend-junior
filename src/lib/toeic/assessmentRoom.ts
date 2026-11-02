/**
 * The TOEIC Speaking & Writing and 4 Skills exam room runs one section after
 * another. These rules decide what the learner sees next and how each section
 * is split into tabs; the room itself only renders them.
 */

export type RoomGroup = {
  from: number;
  to: number;
  title: string;
  /** Time guidance for the group. The section clock is the only hard limit. */
  hint?: string;
};

export const SPEAKING_GROUPS: readonly RoomGroup[] = [
  { from: 1, to: 2, title: "Đọc to đoạn văn" },
  { from: 3, to: 4, title: "Mô tả bức tranh" },
  { from: 5, to: 7, title: "Trả lời câu hỏi" },
  { from: 8, to: 10, title: "Trả lời dựa trên thông tin" },
  { from: 11, to: 11, title: "Nêu ý kiến" },
];

export const WRITING_GROUPS: readonly RoomGroup[] = [
  { from: 1, to: 5, title: "Viết câu theo tranh", hint: "Gợi ý 8 phút cho 5 câu" },
  { from: 6, to: 7, title: "Trả lời e-mail", hint: "Gợi ý 10 phút mỗi e-mail" },
  { from: 8, to: 8, title: "Bài luận nêu ý kiến", hint: "Gợi ý 30 phút" },
];

/** One recording plus one retake per question. */
export const MAX_SPEAKING_TAKES = 2;

export const SECTION_LABEL: Record<string, string> = {
  LISTENING_READING: "Listening & Reading",
  SPEAKING: "Speaking",
  WRITING: "Writing",
};

export const SECTION_BRIEF: Record<string, string> = {
  LISTENING_READING: "200 câu trong 120 phút. Audio phát một mạch từ đầu phần Listening.",
  SPEAKING: "11 câu trong 20 phút. Mỗi câu có giới hạn thời gian trả lời, được thu lại 1 lần.",
  WRITING: "8 câu trong 60 phút. Bài viết tự lưu trên máy này cho đến khi nộp.",
};

export function groupLabel(group: RoomGroup): string {
  return group.from === group.to ? `Câu ${group.from}` : `Câu ${group.from}–${group.to}`;
}

export function groupIndexOf(groups: readonly RoomGroup[], questionNumber: number): number {
  return groups.findIndex((g) => questionNumber >= g.from && questionNumber <= g.to);
}

export function questionsOf(group: RoomGroup): number[] {
  return Array.from({ length: group.to - group.from + 1 }, (_, i) => group.from + i);
}

export function secondsLeft(deadlineAt: string | null | undefined, nowMs: number): number | null {
  if (!deadlineAt) return null;
  return Math.max(0, (Date.parse(deadlineAt) - nowMs) / 1000);
}

export function speakingTimeLabel(timing: {
  readingSeconds?: number;
  prepSeconds: number;
  responseSeconds: number;
}): string {
  const read = timing.readingSeconds ? `Đọc thông tin ${timing.readingSeconds} giây · ` : "";
  return `${read}Chuẩn bị ${timing.prepSeconds} giây · Trả lời ${timing.responseSeconds} giây`;
}

export type RoomComponent = {
  assessmentComponentId: number;
  kind: string;
  order: number;
  status: string;
  deadlineAt?: string | null;
  childAttemptId?: number | null;
  childStatus?: string | null;
};

export type RoomStep =
  | { kind: "DONE" }
  | { kind: "INTRO"; component: RoomComponent; previous: RoomComponent | null }
  | { kind: "ROOM"; component: RoomComponent }
  | { kind: "LISTENING_READING"; component: RoomComponent }
  /** The Listening & Reading paper is in, its section only has to be closed. */
  | { kind: "CLOSE_LISTENING_READING"; component: RoomComponent };

export function roomStep(attempt: { status: string; components: RoomComponent[] }): RoomStep {
  const ordered = [...attempt.components].sort((a, b) => a.order - b.order);
  const index = ordered.findIndex((c) => c.status !== "COMPLETED");
  if (attempt.status === "COMPLETED" || index < 0) return { kind: "DONE" };
  const component = ordered[index];
  if (component.status === "NOT_STARTED")
    return { kind: "INTRO", component, previous: ordered[index - 1] ?? null };
  if (component.kind !== "LISTENING_READING") return { kind: "ROOM", component };
  return component.childStatus === "SUBMITTED"
    ? { kind: "CLOSE_LISTENING_READING", component }
    : { kind: "LISTENING_READING", component };
}
