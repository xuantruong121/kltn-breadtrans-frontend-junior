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

  return sectionOrder
    .map((s) => groups[s.key])
    .filter((g) => g && g.questions.length > 0);
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
