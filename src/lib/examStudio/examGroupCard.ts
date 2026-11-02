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

/** The actions that make sense for a Part; Parts 1, 2, 5 hold one question. */
export function groupActions(part: number, hasImage: boolean): GroupAction[] {
  const actions: GroupAction[] = [];
  if (part !== 5) actions.push("editContent");
  if (part === 1) {
    actions.push("findImage");
    if (hasImage) actions.push("questionFromImage");
  }
  if (part <= 4) actions.push("regenerateAudio");
  if (part === 5) actions.push("suggestQuestion");
  if ([3, 4, 6, 7].includes(part)) actions.push("addQuestion");
  actions.push("deleteGroup");
  return actions;
}

/** What "edit" opens for this Part. */
export function editContentLabel(part: number): string {
  if (part === 1) return "Sửa ảnh và audio";
  if (part <= 4) return "Sửa audio và lời thoại";
  return "Sửa đoạn văn";
}
