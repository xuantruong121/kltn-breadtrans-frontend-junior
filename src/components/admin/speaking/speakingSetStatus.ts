/**
 * Pure helpers for the Speaking set editor: the publish checklist, the set
 * overview counts and readable server validation messages. No I/O.
 */

export type ChecklistItem = { label: string; done: boolean };

type ExerciseLike = {
  id?: number;
  title?: string | null;
  targetText?: string | null;
  taskType?: string | null;
  difficulty?: string | null;
  imageUrl?: string | null;
  stimulusId?: number | null;
  audioUrl?: string | null;
};

const filled = (value?: string | null) => String(value ?? "").trim() !== "";

/**
 * What the set still lacks before learners see it: the same blocking checks
 * the server runs at publish. Reference audio is not one of them (see
 * referenceAudioWarning).
 */
export function speakingSetChecklist(set: {
  title: string;
  exercises: ExerciseLike[];
}): ChecklistItem[] {
  const items: ChecklistItem[] = [
    { label: "Có tên bộ luyện", done: filled(set.title) },
    { label: "Có ít nhất 1 câu luyện", done: set.exercises.length > 0 },
  ];
  if (!set.exercises.length) return items;
  items.push(
    {
      label: "Mỗi câu có tiêu đề và câu mẫu",
      done: set.exercises.every((e) => filled(e.title) && filled(e.targetText)),
    },
    {
      label: "Bài mô tả tranh có ảnh",
      done: set.exercises
        .filter((e) => e.taskType === "DESCRIBE_PICTURE")
        .every((e) => filled(e.imageUrl)),
    },
    {
      label: "Bài dựa trên thông tin có thông tin dùng chung",
      done: set.exercises
        .filter((e) => e.taskType === "RESPOND_USING_INFORMATION")
        .every((e) => e.stimulusId != null),
    },
  );
  return items;
}

/**
 * Reference audio is optional help: the learner page plays it from "Nghe câu
 * mẫu" and shows "Audio mẫu chưa khả dụng" without it, and the server
 * publishes a set without it. So a missing clip is a warning, never a failed
 * checklist item (QA 2026-11-22: the checklist and the server disagreed).
 */
export function referenceAudioWarning(exercises: ExerciseLike[]): string | null {
  const missing = exercises.filter((e) => !filled(e.audioUrl)).length;
  return missing ? `Thiếu audio mẫu: ${missing} câu` : null;
}

/** Counts of one field, most frequent first. */
export function countBy(
  exercises: ExerciseLike[],
  key: "taskType" | "difficulty",
): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const exercise of exercises) {
    const value = String(exercise[key] ?? "");
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

/** "Câu #42: …" (older servers: "Exercise #42: …") becomes "Câu 2: …" by the exercise's position. */
export function describeValidationError(
  error: string,
  exercises: Array<{ id?: number }>,
): string {
  return error.replace(/^(?:Exercise|Câu) #(\d+)/, (match, id) => {
    const index = exercises.findIndex((e) => e.id === Number(id));
    return index < 0 ? match : `Câu ${index + 1}`;
  });
}
