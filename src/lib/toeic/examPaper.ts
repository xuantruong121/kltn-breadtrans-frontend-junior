/**
 * Pure helpers for the continuous TOEIC L&R exam paper: the paper's Part
 * structure, multi-document passages, the Listening master timeline and the
 * question navigator. No React, no I/O, so they are unit tested directly.
 */

export type PaperQuestion = { id: number; questionNumber: number };
export type PaperGroup<Q extends PaperQuestion = PaperQuestion> = {
  id: number;
  part: number;
  groupOrder: number;
  questions: Q[];
};

export type PaperPart<G extends PaperGroup> = {
  part: number;
  section: "LISTENING" | "READING";
  firstNumber: number;
  lastNumber: number;
  groups: G[];
};

export const PART_TITLES: Record<number, string> = {
  1: "Photographs · Mô tả hình ảnh",
  2: "Question–Response · Hỏi và đáp",
  3: "Conversations · Đoạn hội thoại",
  4: "Talks · Bài nói ngắn",
  5: "Incomplete Sentences · Hoàn thành câu",
  6: "Text Completion · Hoàn thành đoạn văn",
  7: "Reading Comprehension · Đọc hiểu",
};

/** Parts in ascending order; groups and questions in server order within each. */
export function buildPaperParts<G extends PaperGroup>(groups: G[]): PaperPart<G>[] {
  const byPart = new Map<number, G[]>();
  for (const group of groups) byPart.set(group.part, [...(byPart.get(group.part) ?? []), group]);
  return [...byPart.entries()]
    .sort(([a], [b]) => a - b)
    .map(([part, partGroups]) => {
      const sorted = [...partGroups].sort((a, b) => a.groupOrder - b.groupOrder);
      const numbers = sorted.flatMap((g) => g.questions.map((q) => q.questionNumber));
      return {
        part,
        section: part <= 4 ? ("LISTENING" as const) : ("READING" as const),
        firstNumber: Math.min(...numbers),
        lastNumber: Math.max(...numbers),
        groups: sorted.map((g) => ({
          ...g,
          questions: [...g.questions].sort((a, b) => a.questionNumber - b.questionNumber),
        })),
      };
    });
}

/** Questions of the paper in reading order (Part, group, number). */
export function paperQuestionOrder<G extends PaperGroup>(parts: PaperPart<G>[]) {
  return parts.flatMap((p) => p.groups.flatMap((g) => g.questions));
}

/**
 * Split a Part 6/7 passage into its documents. Multi-passage sets are
 * authored as "DOCUMENT 1 — EMAIL\n...\n\nDOCUMENT 2 — ...".
 */
export function splitPassageDocuments(text: string | null | undefined) {
  if (!text?.trim()) return [];
  const parts = text.split(/\n\s*\n(?=DOCUMENT\s+\d+)/i).map((p) => p.trim()).filter(Boolean);
  return parts.map((part) => {
    const [first, ...rest] = part.split("\n");
    const isHeading = /^(DOCUMENT\s+\d+|EMAIL|NOTICE|MEMO|ARTICLE|ADVERTISEMENT|SCHEDULE|REVIEW|LETTER|INVOICE|FORM|TEXT MESSAGE|CHAT)/i.test(first.trim());
    return isHeading ? { heading: first.trim(), body: rest.join("\n").trim() } : { heading: null, body: part };
  });
}

/** A Part 5 group carries only a section label ("PART 5 — …"), not a passage. */
export function isPassageWorthShowing(part: number, text: string | null | undefined) {
  if (part <= 4 || !text?.trim()) return false;
  return !/^PART\s+\d\b/i.test(text.trim()) || text.trim().length > 80;
}

export type MasterSegment = {
  kind: "INTRO" | "DIRECTIONS" | "GROUP" | "END";
  part?: number;
  groupId?: number;
  questionNumbers?: number[];
  start: number;
  end: number;
};

/** The segment playing at `seconds` (the last one that has started). */
export function segmentAt(timeline: MasterSegment[], seconds: number): MasterSegment | null {
  let found: MasterSegment | null = null;
  for (const segment of timeline) {
    if (segment.start <= seconds + 0.05) found = segment;
    else break;
  }
  return found;
}

/** Where the learner should seek to hear a group from its number cue. */
export function groupStart(timeline: MasterSegment[], groupId: number) {
  return timeline.find((s) => s.kind === "GROUP" && s.groupId === groupId)?.start ?? null;
}

export type NavigatorStatus = "current" | "answered" | "unanswered";

export function navigatorStatus(questionId: number, currentId: number | null, answers: Record<number, number>): NavigatorStatus {
  if (questionId === currentId) return "current";
  return answers[questionId] !== undefined ? "answered" : "unanswered";
}

/** Minutes and seconds only, minutes unbounded: 120:00, 117:17, 09:14. */
export function formatMinutes(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60).toString().padStart(2, "0");
  const s = (safe % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export type PlaybackSegment = { start: number; end: number };

/**
 * What to play from the Listening master. The whole recording for a full
 * paper; for a part practice, each selected Listening Part from its
 * directions to its last group (no exam introduction), in Part order.
 */
export function playbackSegments(timeline: MasterSegment[], duration: number, parts: number[] | null): PlaybackSegment[] {
  if (!parts || parts.length === 0) return [{ start: 0, end: duration }];
  return [...parts]
    .filter((p) => p >= 1 && p <= 4)
    .sort((a, b) => a - b)
    .flatMap((p) => {
      const directions = timeline.find((s) => s.kind === "DIRECTIONS" && s.part === p);
      const groups = timeline.filter((s) => s.kind === "GROUP" && s.part === p);
      if (!groups.length) return [];
      return [{ start: directions?.start ?? groups[0].start, end: groups[groups.length - 1].end }];
    });
}

export const segmentsDuration = (segments: PlaybackSegment[]) => segments.reduce((n, s) => n + (s.end - s.start), 0);

/** Learner-facing position (0..total) for a position in the master file. */
export function realToVirtual(segments: PlaybackSegment[], real: number) {
  let offset = 0;
  for (const s of segments) {
    if (real < s.start) return offset;
    if (real <= s.end) return offset + (real - s.start);
    offset += s.end - s.start;
  }
  return offset;
}

/** Master-file position for a learner-facing position. */
export function virtualToReal(segments: PlaybackSegment[], virtual: number) {
  let rest = Math.max(0, virtual);
  for (const s of segments) {
    const length = s.end - s.start;
    if (rest <= length) return s.start + rest;
    rest -= length;
  }
  return segments.length ? segments[segments.length - 1].end : 0;
}

/** Where playback continues after `real`: same spot, next segment start, or null at the end. */
export function nextPlayable(segments: PlaybackSegment[], real: number): number | null {
  for (const s of segments) {
    if (real < s.start) return s.start;
    if (real < s.end - 0.05) return real;
  }
  return null;
}

export function formatClock(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60).toString().padStart(2, "0");
  const s = (safe % 60).toString().padStart(2, "0");
  return h ? `${h}:${m}:${s}` : `${m}:${s}`;
}
