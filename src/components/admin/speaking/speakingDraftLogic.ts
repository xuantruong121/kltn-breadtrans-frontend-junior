/**
 * Applying a Speaking AI draft: which drafted exercises the server will save,
 * and adding them one by one without losing track of the ones refused. Pure:
 * the request and the error reader are passed in. No React, no axios.
 */
import { EXERCISE_LEVELS, TASK_TYPES } from "./speakingCmsShared.ts";

type DraftExercise = {
  title?: string | null;
  targetText?: string | null;
  taskType?: string | null;
  difficulty?: string | null;
  imageUrl?: string | null;
  stimulusId?: number | null;
};

/**
 * Why the server would refuse this exercise, or null when it saves. Mirrors
 * the exercise DTO and speaking-task-validation.ts on the server: a picture
 * task needs a verified image and an information task an information table,
 * which an AI draft does not bring (QA 2026-11-22).
 */
export function draftExerciseProblem(exercise: DraftExercise): string | null {
  if (!exercise.title?.trim()) return "Thiếu tiêu đề.";
  if (!exercise.targetText?.trim()) return "Thiếu câu mẫu.";
  if (!TASK_TYPES.some((task) => task.value === exercise.taskType))
    return "Loại bài không hợp lệ.";
  if (exercise.difficulty && !EXERCISE_LEVELS.includes(exercise.difficulty))
    return "Cấp độ câu không hợp lệ.";
  if (exercise.taskType === "DESCRIBE_PICTURE" && !exercise.imageUrl?.trim())
    return "Câu mô tả tranh cần ảnh đã được kiểm duyệt. Thêm câu này kèm ảnh sau khi tạo bộ.";
  if (exercise.taskType === "RESPOND_USING_INFORMATION" && !exercise.stimulusId)
    return "Câu trả lời dựa trên thông tin cần thông tin dùng chung. Thêm câu này sau khi tạo bộ.";
  return null;
}

export type DraftFailure = { title: string; reason: string };

type AddableExercise = {
  title: string;
  targetText: string;
  taskType: string;
  difficulty?: string;
};

/**
 * Adds the drafted exercises after the set's `existing` ones and returns the
 * ones the server refused, with the reason. It never throws: by now the set
 * exists, and a throw would leave the page as "chưa lưu" and let the admin
 * create the set twice. Each position counts only the exercises saved so
 * far, so one refusal does not push the next past the end of the set.
 */
export async function addDraftExercises(
  exercises: AddableExercise[],
  existing: number,
  post: (body: AddableExercise & { order: number }) => Promise<unknown>,
  reasonOf: (error: unknown) => string,
): Promise<DraftFailure[]> {
  const failures: DraftFailure[] = [];
  let saved = 0;
  for (const exercise of exercises) {
    try {
      await post({
        title: exercise.title.trim(),
        targetText: exercise.targetText.trim(),
        taskType: exercise.taskType,
        difficulty: exercise.difficulty,
        order: existing + saved + 1,
      });
      saved++;
    } catch (error) {
      failures.push({ title: exercise.title.trim(), reason: reasonOf(error) });
    }
  }
  return failures;
}

/** The toast after a partly saved draft, or null when every exercise was added. */
export function draftFailureToast(failures: DraftFailure[]): string | null {
  if (!failures.length) return null;
  return `${failures.length} câu từ bản nháp AI chưa được thêm. Xem lý do ở mục Câu luyện.`;
}

/**
 * True the first time only. "Thêm câu luyện bằng AI" asks for suggestions
 * from an effect, and React StrictMode runs a new effect twice in
 * development; the flag (a useRef) survives that, so one click is one request.
 */
export function takeOnce(flag: { current: boolean }): boolean {
  if (flag.current) return false;
  flag.current = true;
  return true;
}
