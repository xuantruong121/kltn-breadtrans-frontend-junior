/** Pure helpers for the grammar topic editor. */

export const GRAMMAR_LEVELS = [
  { value: "BEGINNER", label: "Cơ bản" },
  { value: "INTERMEDIATE", label: "Trung cấp" },
  { value: "ADVANCED", label: "Nâng cao" },
] as const;

export const grammarLevelLabel = (value?: string | null) =>
  GRAMMAR_LEVELS.find((level) => level.value === value)?.label ?? value ?? "";

/** Accepts a YouTube link (watch, youtu.be, embed, shorts) or a bare id. */
export function youtubeIdFrom(input: string): string {
  const value = input.trim();
  if (!value) return "";
  const match =
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/.exec(
      value,
    );
  if (match) return match[1];
  return /^[\w-]{11}$/.test(value) ? value : value;
}

type QuestionLike = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string | null;
};

export type ChecklistItem = { label: string; done: boolean };

const filled = (v?: string | null) => String(v ?? "").trim() !== "";

/** Mirrors the publish preflight (≥1 question, 4 options, a valid answer) plus authoring gaps. */
export function grammarChecklist(topic: {
  title: string;
  description: string;
  questions: QuestionLike[];
}): ChecklistItem[] {
  const n = topic.questions.length;
  const explained = topic.questions.filter((q) => filled(q.explanation)).length;
  const items: ChecklistItem[] = [
    { label: "Có tên chủ đề", done: filled(topic.title) },
    { label: "Có phần lý thuyết", done: filled(topic.description) },
    { label: "Có ít nhất 1 câu hỏi", done: n > 0 },
  ];
  if (n)
    items.push(
      {
        label: "Mỗi câu có 4 phương án và đáp án đúng",
        done: topic.questions.every(
          (q) =>
            q.options.length === 4 &&
            q.options.every(filled) &&
            q.correctIndex >= 0 &&
            q.correctIndex < 4,
        ),
      },
      { label: `Giải thích ${explained}/${n} câu`, done: explained === n },
    );
  return items;
}
