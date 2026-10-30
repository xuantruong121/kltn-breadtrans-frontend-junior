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

/** CEFR tags in the order a learner meets them. */
export const CMS_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

/** The CEFR tag authored at the head of a title ("Hội thoại C1 — ..."). */
export function cmsLevelFromTitle(title?: string | null): string | null {
  const head = (title ?? "").split(" — ")[0].toUpperCase();
  return /\b([ABC][12])\b/.exec(head)?.[1] ?? null;
}

export type ListSort = "NEWEST" | "OLDEST" | "TITLE" | "LEVEL" | "FEWEST";

export type ListFilters = {
  query: string;
  status: "ALL" | "DRAFT" | "PUBLISHED";
  level: string;
  audio: "ALL" | AudioBadge["tone"];
  sort: ListSort;
};

type ListItem = {
  id: number;
  title?: string | null;
  description?: string | null;
  level?: string | null;
  type?: string | null;
  publicationStatus?: string | null;
  _count?: { questions?: number };
  questions?: unknown[];
  listeningAudioArtifacts?: Array<{ version: number; status: string }>;
};

export const contentLevel = (item: ListItem) =>
  cmsLevelFromTitle(item.title) ?? item.level ?? null;

/** The title as a card shows it: without the "Hội thoại C1 — " head. */
export const displayTitle = (item: { title?: string | null }) => {
  const title = String(item.title ?? "");
  return cmsLevelFromTitle(title) && title.includes(" — ")
    ? title.split(" — ").slice(1).join(" — ")
    : title;
};

const questionCount = (item: ListItem) =>
  item._count?.questions ?? item.questions?.length ?? 0;

const levelRank = (item: ListItem) => {
  const index = (CMS_LEVELS as readonly string[]).indexOf(
    contentLevel(item) ?? "",
  );
  return index < 0 ? CMS_LEVELS.length : index;
};

/** The admin list after search, filters and sort. `extra` adds a page-only filter. */
export function filterSkillContent<T extends ListItem>(
  items: T[],
  filters: ListFilters,
  extra: (item: T) => boolean = () => true,
): T[] {
  const query = filters.query.trim().toLocaleLowerCase("vi");
  const visible = items.filter((item) => {
    const searchable = [item.title, item.description, item.level, item.type]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("vi");
    return (
      (!query || searchable.includes(query)) &&
      (filters.status === "ALL" ||
        (item.publicationStatus || "DRAFT") === filters.status) &&
      (filters.level === "ALL" || contentLevel(item) === filters.level) &&
      (filters.audio === "ALL" ||
        latestAudioBadge(item.listeningAudioArtifacts?.[0]).tone ===
          filters.audio) &&
      extra(item)
    );
  });
  const by: Record<ListSort, (a: T, b: T) => number> = {
    NEWEST: (a, b) => b.id - a.id,
    OLDEST: (a, b) => a.id - b.id,
    TITLE: (a, b) => displayTitle(a).localeCompare(displayTitle(b), "vi"),
    LEVEL: (a, b) => levelRank(a) - levelRank(b) || b.id - a.id,
    FEWEST: (a, b) => questionCount(a) - questionCount(b) || b.id - a.id,
  };
  return visible.sort(by[filters.sort]);
}
