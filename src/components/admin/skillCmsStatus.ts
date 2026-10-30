/**
 * Pure status helpers for the skill CMS screens: the audio badge on a list
 * card and the checklist beside the editor. No I/O, so they are unit-tested.
 */

export type AudioBadge = {
  label: string;
  tone: "ok" | "pending" | "error" | "none";
};

const AUDIO_STATE: Record<string, [string, AudioBadge["tone"]]> = {
  PUBLISHED: ["đang dùng", "ok"],
  APPROVED: ["chờ xuất bản", "pending"],
  PREVIEW_READY: ["chờ duyệt", "pending"],
  GENERATING: ["đang tạo", "pending"],
  STALE: ["cũ", "pending"],
  FAILED: ["lỗi", "error"],
};

/** The newest recording of a quiz, as the list endpoint returns it. */
export function latestAudioBadge(
  artifact?: { version: number; status: string } | null,
): AudioBadge {
  if (!artifact) return { label: "Chưa có audio", tone: "none" };
  const [state, tone] = AUDIO_STATE[artifact.status] ?? [
    artifact.status,
    "pending",
  ];
  return { label: `Audio v${artifact.version} · ${state}`, tone };
}

export type ChecklistItem = { label: string; done: boolean };

/**
 * What a quiz still lacks before learners see it. Advisory: the publish
 * endpoint runs its own checks.
 */
export function publishChecklist(input: {
  domain: string;
  title: string;
  questions: Array<{ type?: string; content?: any }>;
  audioPublished?: boolean;
}): ChecklistItem[] {
  const mcqs = input.questions.filter((q) => q.type === "MULTIPLE_CHOICE");
  const items: ChecklistItem[] = [
    { label: "Có tiêu đề", done: input.title.trim().length > 0 },
    { label: "Có ít nhất 1 câu hỏi", done: input.questions.length > 0 },
    {
      label: "Câu trắc nghiệm đủ đáp án",
      done: mcqs.every((q) => {
        const options = Array.isArray(q.content?.options)
          ? q.content.options
          : [];
        const key = Number(q.content?.correctIndex);
        return (
          options.length >= 2 &&
          Number.isInteger(key) &&
          key >= 0 &&
          key < options.length
        );
      }),
    },
  ];
  if (input.domain === "listening") {
    items.push(
      {
        label: "Lời giải có tiếng Việt và English",
        done: mcqs.every((q) => {
          const explanation = q.content?.explanation;
          return (
            !!explanation &&
            typeof explanation === "object" &&
            String(explanation.vi ?? "").trim().length > 0 &&
            String(explanation.en ?? "").trim().length > 0
          );
        }),
      },
      {
        label: "Audio đã xuất bản cho học viên",
        done: input.audioPublished === true,
      },
    );
  }
  return items;
}
