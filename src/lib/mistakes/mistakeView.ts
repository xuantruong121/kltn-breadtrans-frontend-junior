/**
 * How a mistake of the notebook is shown: its skill label, where to redo it
 * and what to hand the tutor. Pure; the server sends ids, addresses are built
 * here.
 */
import type { MistakeDetail, MistakeItem, MistakeSkill } from "../api/services/mistakes.service.ts";

export const MISTAKE_SKILL_LABEL: Record<MistakeSkill, string> = {
  LISTENING: "Nghe",
  SPEAKING: "Nói",
  READING: "Đọc",
  WRITING: "Viết",
  GRAMMAR: "Ngữ pháp",
  TOEIC: "Luyện đề",
};

const READING_TAG: Record<string, string> = {
  MAIN_IDEA: "Ý chính",
  DETAIL: "Chi tiết",
  INFERENCE: "Suy luận",
  PURPOSE: "Mục đích",
  VOCAB_IN_CONTEXT: "Từ vựng trong ngữ cảnh",
  PROMOTION: "Thông tin khuyến mãi",
};

/** A skill from the address bar (`?skill=reading`), or undefined for "all". */
export function parseMistakeSkill(value: string | null | undefined): MistakeSkill | undefined {
  const skill = value?.trim().toUpperCase();
  return skill && skill in MISTAKE_SKILL_LABEL ? (skill as MistakeSkill) : undefined;
}

/** The tag a learner can read, or null when the stored code means nothing to them. */
export function mistakeTagLabel(item: Pick<MistakeItem, "skill" | "tag">): string | null {
  if (!item.tag) return null;
  if (item.skill === "READING") return READING_TAG[item.tag] ?? null;
  return item.tag;
}

/** Where the learner can do the item again, with the words for the link. */
export function mistakeRedoLink(
  item: Pick<MistakeItem, "skill" | "sourceType"> & { detail: Pick<MistakeDetail, "ref"> },
): { href: string; label: string } | null {
  const ref = item.detail.ref;
  switch (item.sourceType) {
    case "QUIZ_QUESTION":
      if (!ref.quizId) return null;
      return item.skill === "LISTENING"
        ? { href: `/listening/${ref.quizId}`, label: "Làm lại bài nghe" }
        : { href: `/reading/${ref.quizId}`, label: "Làm lại bài đọc" };
    case "TOEIC_QUESTION":
      return ref.attemptId
        ? {
            href: `/toeic/review/${ref.attemptId}${ref.questionNumber ? `#q-${ref.questionNumber}` : ""}`,
            label: "Xem trong bài làm",
          }
        : null;
    case "GRAMMAR_QUESTION":
      return { href: "/grammar", label: "Mở phần ngữ pháp" };
    case "WRITING_CORRECTION":
      return ref.submissionId ? { href: `/writing/submissions/${ref.submissionId}`, label: "Xem bài viết" } : null;
    case "SPEAKING_WORD":
      return ref.exerciseId ? { href: `/speaking/${ref.exerciseId}`, label: "Luyện nói lại" } : null;
    default:
      return null;
  }
}

export type MistakeTutorContext = {
  sourceType: "TOEIC_ATTEMPT" | "QUIZ_SUBMISSION" | "GRAMMAR_ATTEMPT";
  sourceId: number;
  questionId?: number;
  label: string;
};

/** The ids the tutor needs to read the item on the server; null when it cannot. */
export function mistakeTutorContext(
  item: Pick<MistakeItem, "skill" | "sourceType"> & { detail: Pick<MistakeDetail, "ref" | "title"> },
): MistakeTutorContext | null {
  const { ref, title } = item.detail;
  const label = `Lỗi ${MISTAKE_SKILL_LABEL[item.skill].toLowerCase()}: ${title}`;
  if (item.sourceType === "QUIZ_QUESTION" && ref.submissionId && ref.questionId)
    return { sourceType: "QUIZ_SUBMISSION", sourceId: ref.submissionId, questionId: ref.questionId, label };
  if (item.sourceType === "WRITING_CORRECTION" && ref.submissionId)
    return { sourceType: "QUIZ_SUBMISSION", sourceId: ref.submissionId, label };
  if (item.sourceType === "TOEIC_QUESTION" && ref.attemptId && ref.questionId)
    return { sourceType: "TOEIC_ATTEMPT", sourceId: ref.attemptId, questionId: ref.questionId, label };
  if (item.sourceType === "GRAMMAR_QUESTION" && ref.attemptId && ref.questionId)
    return { sourceType: "GRAMMAR_ATTEMPT", sourceId: ref.attemptId, questionId: ref.questionId, label };
  return null;
}

const LETTERS = ["A", "B", "C", "D", "E", "F"];
export const optionLetter = (index: number) => LETTERS[index] ?? String(index + 1);

/** "B. in" for a stored choice, or null when nothing was chosen. */
export function choiceText(options: string[] | undefined, index: number | null | undefined): string | null {
  if (index === null || index === undefined || !options || index < 0 || index >= options.length) return null;
  return `${optionLetter(index)}. ${options[index]}`;
}

/** The line under the open count: how the notebook closes a mistake. */
export function progressLabel(item: Pick<MistakeItem, "correctStreak" | "detail">, resolveAfter: number): string | null {
  if (!item.detail.answerable) return null;
  return `Đã trả lời đúng ${Math.min(item.correctStreak, resolveAfter)}/${resolveAfter} lần`;
}
