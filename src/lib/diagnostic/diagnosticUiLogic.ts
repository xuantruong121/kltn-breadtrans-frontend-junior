export interface DiagnosticUiQuestion {
  id: number;
  skill?: string;
  section?: string;
  order?: number;
}

export function getUnansweredQuestionIndexes(
  questions: DiagnosticUiQuestion[],
  answers: Record<string, number | string>,
): number[] {
  return questions.reduce<number[]>((indexes, question, index) => {
    const answer = answers[question.id];
    if (answer === undefined || (typeof answer === "string" && !answer.trim()))
      indexes.push(index);
    return indexes;
  }, []);
}

export function resolveReviewAnswer(
  options: unknown,
  correctIndex: unknown,
): string | null {
  if (!Array.isArray(options) || !Number.isInteger(correctIndex)) return null;
  const index = correctIndex as number;
  const value = options[index];
  return index >= 0 && index < options.length && typeof value === "string"
    ? value
    : null;
}

export type ClozeSegment =
  | { type: "text"; text: string }
  | { type: "blank" };

export function parseClozeQuestionSegments(prompt: string): ClozeSegment[] {
  if (!prompt) return [];
  const blankRegex = /_{2,}|-{2,}/g;
  const segments: ClozeSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = blankRegex.exec(prompt)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        text: prompt.substring(lastIndex, match.index),
      });
    }
    segments.push({ type: "blank" });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < prompt.length) {
    segments.push({
      type: "text",
      text: prompt.substring(lastIndex),
    });
  }

  return segments;
}

export function formatSkillName(skill: string): string {
  const normalized = (skill || "").trim();
  const map: Record<string, string> = {
    Grammar: "Ngữ pháp",
    Vocabulary: "Từ vựng",
    Reading: "Đọc hiểu",
    Listening: "Nghe hiểu",
    Speaking: "Nói",
    Writing: "Viết",
    LANGUAGE_USE: "Ngữ pháp & Từ vựng",
    READING: "Đọc hiểu",
    LISTENING: "Nghe hiểu",
    SPEAKING: "Nói",
    WRITING: "Viết",
  };
  return map[normalized] ?? normalized;
}

export interface SectionQuestionGroup {
  key: string;
  title: string;
  startIndex: number;
  questions: Array<{ index: number; id: number }>;
}

export function groupQuestionsBySection(
  questions: Array<{ id: number; skill?: string; section?: string }>,
): SectionQuestionGroup[] {
  const sectionOrder = [
    { key: "LANGUAGE_USE", title: "Ngữ pháp & Từ vựng" },
    { key: "READING", title: "Đọc hiểu" },
    { key: "LISTENING", title: "Nghe hiểu" },
    { key: "SPEAKING", title: "Kỹ năng Nói" },
    { key: "WRITING", title: "Kỹ năng Viết" },
  ];

  const groups: Record<string, SectionQuestionGroup> = {};
  sectionOrder.forEach((sec) => {
    groups[sec.key] = {
      key: sec.key,
      title: sec.title,
      startIndex: -1,
      questions: [],
    };
  });

  questions.forEach((q, index) => {
    const sec = q.section ?? q.skill ?? "LANGUAGE_USE";
    let key = "LANGUAGE_USE";
    if (sec === "READING" || sec === "Reading") key = "READING";
    else if (sec === "LISTENING" || sec === "Listening") key = "LISTENING";
    else if (sec === "SPEAKING" || sec === "Speaking") key = "SPEAKING";
    else if (sec === "WRITING" || sec === "Writing") key = "WRITING";

    if (!groups[key]) {
      groups[key] = {
        key,
        title: formatSkillName(key),
        startIndex: index,
        questions: [],
      };
    }
    if (groups[key].startIndex === -1) {
      groups[key].startIndex = index;
    }
    groups[key].questions.push({ index, id: q.id });
  });

  // Sections appear in the assessment's own order (where each one starts),
  // never in a fixed list: V2 runs Listening, Reading, Speaking, Writing,
  // then Language Use.
  return sectionOrder
    .map((s) => groups[s.key])
    .filter((g) => g && g.questions.length > 0)
    .sort((a, b) => a.startIndex - b.startIndex);
}

/**
 * Present a placement band to the learner.
 *
 * The active Entry Diagnostic is 20 objective multiple-choice items with no
 * listening audio and no productive speaking or writing, and its backend
 * result is an internal three-band scale (Starter / Foundation /
 * Intermediate). This function used to convert those bands into CEFR labels -
 * Starter to "Pre-A1", Foundation to "A2", Intermediate to "B1" - which
 * presented the learner with a CEFR classification nothing in this project
 * has validated. The internal band is now shown faithfully instead.
 *
 * A genuine CEFR string still passes through: the section/band scorer returns
 * real CEFR bands, so when the backend itself reports one it is localized
 * rather than rewritten. No CEFR code is ever invented here.
 */
/**
 * Dashboard badge for the latest entry diagnostic. A four-skill attempt stores
 * the marker FOUR_SKILL_PROFILE as its level, which is not a level at all: the
 * badge then only says the diagnostic was done.
 */
export function diagnosticBadgeLabel(level?: string | null): string | null {
  const trimmed = (level || "").trim();
  if (!trimmed) return null;
  if (trimmed === "FOUR_SKILL_PROFILE") return "Đã làm kiểm tra đầu vào";
  return `Trình độ: ${formatPlacementLevel(trimmed)}`;
}

export function formatPlacementLevel(level?: string | null): string {
  const trimmed = (level || "").trim();
  if (!trimmed) return "Chưa xác định";

  // Internal bands of the active form: shown as themselves, with a short
  // descriptor. Deliberately no CEFR code.
  const lower = trimmed.toLowerCase();
  if (lower.includes("starter")) return "Starter – Mới bắt đầu";
  if (lower === "foundation") return "Foundation – Cơ bản";
  if (lower === "intermediate") return "Intermediate – Trung cấp";

  // Genuine CEFR results reported by the backend, localized as before.
  if (
    trimmed === "Pre-A1 / Beginner foundation needed" ||
    trimmed === "Pre-A1"
  ) {
    return "Pre-A1 – Cần củng cố nền tảng";
  }
  if (trimmed === "A1") return "A1 – Sơ cấp";
  if (trimmed === "A2") return "A2 – Sơ trung cấp";
  if (trimmed === "B1") return "B1 – Trung cấp";
  if (trimmed === "B2") return "B2 – Trung cấp trên";
  if (
    trimmed === "A1 — đang tiến tới A2" ||
    trimmed === "A1 – Đang tiến tới A2"
  ) {
    return "A1 – Đang tiến tới A2";
  }
  if (
    trimmed === "A2 — đang tiến tới B1" ||
    trimmed === "A2 – Đang tiến tới B1"
  ) {
    return "A2 – Đang tiến tới B1";
  }
  if (
    trimmed === "B1 — đang tiến tới B2" ||
    trimmed === "B1 – Đang tiến tới B2"
  ) {
    return "B1 – Đang tiến tới B2";
  }
  return trimmed;
}

/** How often the saved result is re-read while grading may still change it. */
export const RESULT_POLL_MS = 3000;
/** A first read right after submit can predate the queued tasks; keep polling this long. */
export const RESULT_SUBMIT_GRACE_MS = 20_000;

type PollableResult = {
  productivePending?: boolean;
  fourSkill?: {
    state?: string;
    observed?: {
      speaking?: { tasks?: Array<{ status: string }> };
      writing?: { tasks?: Array<{ status: string }> };
    };
  } | null;
} | null | undefined;

/**
 * Polling interval for the latest Diagnostic result, or false to stop.
 * Polls while any Speaking/Writing task is still being graded, and for a short
 * grace window after this learner submitted, so one early read cannot freeze
 * the page on a stale "not graded" state.
 */
export function resultPollInterval(
  result: PollableResult,
  submittedAtMs: number | null,
  nowMs: number,
): number | false {
  if (submittedAtMs !== null && nowMs - submittedAtMs < RESULT_SUBMIT_GRACE_MS) return RESULT_POLL_MS;
  return isResultGrading(result) ? RESULT_POLL_MS : false;
}

const PENDING_TASK = new Set(["SUBMITTED", "GRADING_PENDING"]);
const FINISHED_TASK = new Set(["GRADED", "GRADING_FAILED"]);

function productiveTasks(result: PollableResult) {
  return [
    ...(result?.fourSkill?.observed?.speaking?.tasks ?? []),
    ...(result?.fourSkill?.observed?.writing?.tasks ?? []),
  ];
}

/** True while any submitted Speaking/Writing task is still being graded. */
export function isResultGrading(result: PollableResult): boolean {
  if (!result) return false;
  if (result.productivePending || result.fourSkill?.state === "PENDING_GRADING") return true;
  return productiveTasks(result).some((task) => PENDING_TASK.has(task.status));
}

/** Submitted Speaking/Writing tasks whose grading has finished, out of those submitted (skips excluded). */
export function gradingProgress(result: PollableResult): { done: number; total: number } {
  const submitted = productiveTasks(result).filter(
    (task) => PENDING_TASK.has(task.status) || FINISHED_TASK.has(task.status),
  );
  return { done: submitted.filter((task) => FINISHED_TASK.has(task.status)).length, total: submitted.length };
}

type SkillSummarySource = {
  strengths?: string[];
  weaknesses?: string[];
  advice?: {
    profile: { assessed: string[]; strongest: string[]; weakest: string[]; balanced: boolean };
  } | null;
};

/**
 * Strong and weak skills for the profile summary. Four-skill results carry
 * them in `advice.profile` (the older `strengths`/`weaknesses` lists come back
 * empty for them); older results keep their own lists.
 */
export function summarizeSkillStanding(result: SkillSummarySource): {
  strong: string[];
  weak: string[];
  balanced: boolean;
} {
  const profile = result.advice?.profile;
  if (profile) {
    if (profile.assessed.length < 2) return { strong: [], weak: [], balanced: false };
    return profile.balanced
      ? { strong: [], weak: [], balanced: true }
      : { strong: profile.strongest, weak: profile.weakest, balanced: false };
  }
  return { strong: result.strengths ?? [], weak: result.weaknesses ?? [], balanced: false };
}
