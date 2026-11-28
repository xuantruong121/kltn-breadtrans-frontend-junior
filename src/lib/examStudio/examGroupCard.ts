/**
 * Wording and actions of one question group on the exam page. Pure, so it is
 * unit tested without rendering.
 */

type LabelGroup = {
  part: number;
  questions?: Array<{ questionNumber: number }>;
};

const PART_NAMES: Record<number, string> = {
  1: "Mô tả ảnh",
  2: "Hỏi đáp",
  3: "Hội thoại",
  4: "Bài nói",
  5: "Điền câu",
  6: "Điền đoạn văn",
  7: "Đọc hiểu",
};

/** "Câu 32–34", or "Câu 7" for a single question. */
export function questionRangeLabel(group: LabelGroup): string {
  const numbers = (group.questions ?? []).map((q) => q.questionNumber);
  if (!numbers.length) return "Chưa có câu";
  const first = Math.min(...numbers);
  const last = Math.max(...numbers);
  return first === last ? `Câu ${first}` : `Câu ${first}–${last}`;
}

/** "Part 3 · Hội thoại · Câu 32–34": what the group is, in one line. */
export function examGroupLabel(group: LabelGroup): string {
  return `Part ${group.part} · ${PART_NAMES[group.part] ?? ""} · ${questionRangeLabel(group)}`;
}

/** Prompts every item of a Part shares; they say nothing about this item. */
export function isFixedPrompt(text: string | null | undefined): boolean {
  return /^Choose the (sentence that best (describes the photograph|completes blank)|best (response|option for blank))/i.test(
    text?.trim() ?? "",
  );
}

export type GroupAction =
  | "editContent"
  | "findImage"
  | "questionFromImage"
  | "regenerateAudio"
  | "suggestQuestion"
  | "addQuestion"
  | "deleteGroup";

/** Parts whose group holds exactly one question. */
const ONE_QUESTION_PARTS = [1, 2, 5];

/**
 * Whether a question can be written by hand in this group now. Parts 1, 2
 * and 5 hold one question, so only while it is empty; Part 1 needs its
 * picture first, since the four statements describe it (QA 2026-11-22: these
 * Parts had no manual path at all).
 */
export function canAddQuestion(part: number, hasImage: boolean, questionCount: number): boolean {
  if (ONE_QUESTION_PARTS.includes(part) && questionCount > 0) return false;
  return part !== 1 || hasImage;
}

/**
 * Parts 1 and 2 build their audio from the question (the statements, or the
 * prompt and responses), so there is no audio to make before it exists.
 */
export const canBuildAudio = (part: number, questionCount: number) =>
  part <= 4 && (part > 2 || questionCount > 0);

/** The actions that make sense for a group of this Part, now. */
export function groupActions(part: number, hasImage: boolean, questionCount: number): GroupAction[] {
  const actions: GroupAction[] = [];
  if (part !== 5) actions.push("editContent");
  if (part === 1) {
    actions.push("findImage");
    if (hasImage) actions.push("questionFromImage");
  }
  if (canBuildAudio(part, questionCount)) actions.push("regenerateAudio");
  if (part === 5) actions.push("suggestQuestion");
  if (canAddQuestion(part, hasImage, questionCount)) actions.push("addQuestion");
  actions.push("deleteGroup");
  return actions;
}

/**
 * What an empty group says, with the reason when its manual add is hidden.
 * Null when the group has a question.
 */
export function emptyGroupNote(part: number, hasImage: boolean, questionCount: number): string | null {
  if (questionCount > 0) return null;
  if (part === 1 && !hasImage)
    return "Nhóm này chưa có câu hỏi. Thêm ảnh trước (Tìm ảnh hoặc Tải ảnh lên), rồi soạn câu hỏi.";
  if (part === 2)
    return "Nhóm này chưa có câu hỏi. Ghi câu hỏi nghe trong Lời thoại, thêm câu trả lời, rồi tạo audio.";
  return "Nhóm này chưa có câu hỏi.";
}

/**
 * The Part filter after a group is added: it moves to the new group's Part so
 * the group is in view; "Tất cả" already shows it.
 */
export const partFilterAfterAdd = (current: number | "all", addedPart: number): number | "all" =>
  current === "all" ? "all" : addedPart;

/** What "edit" opens for this Part. */
export function editContentLabel(part: number): string {
  if (part === 1) return "Sửa ảnh và audio";
  if (part <= 4) return "Sửa audio và lời thoại";
  return "Sửa đoạn văn";
}

/**
 * A Part 5 AI candidate that can be added as it is: a sentence, four filled
 * options and a key among them (the add-all button skips any other).
 */
export function part5CandidateReady(candidate: {
  prompt: string;
  options: string[];
  correctIndex: number;
}): boolean {
  return (
    Boolean(candidate.prompt.trim()) &&
    candidate.options.length === 4 &&
    candidate.options.every((option) => option.trim()) &&
    Number.isInteger(candidate.correctIndex) &&
    candidate.correctIndex >= 0 &&
    candidate.correctIndex < 4
  );
}
