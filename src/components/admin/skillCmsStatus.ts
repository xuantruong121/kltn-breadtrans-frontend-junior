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

/** Comprehension and dictation play one clip per question. */
export function questionAudioBadge(withAudio: number, total: number): AudioBadge {
  if (!total || !withAudio) return { label: "Chưa có audio", tone: "none" };
  return {
    label: `Audio ${withAudio}/${total} câu`,
    tone: withAudio === total ? "ok" : "pending",
  };
}

const PER_QUESTION_MODES = ["COMPREHENSION", "DICTATION"];

/** The audio badge a list card shows: per-question clips or the shared recording, by mode. */
export function audioBadgeFor(item: {
  bilingualContent?: unknown;
  questionsWithAudio?: number;
  _count?: { questions?: number };
  questions?: unknown[];
  listeningAudioArtifacts?: Array<{ version: number; status: string }>;
}): AudioBadge {
  const mode = (item.bilingualContent as { mode?: string } | null)?.mode;
  const clips = item.questionsWithAudio ?? 0;
  const latest = item.listeningAudioArtifacts?.[0];
  // A dialogue may play a clip on each question instead of one recording.
  if ((mode && PER_QUESTION_MODES.includes(mode)) || (!latest && clips > 0))
    return questionAudioBadge(
      clips,
      item._count?.questions ?? item.questions?.length ?? 0,
    );
  return latestAudioBadge(latest);
}

/** Career tracks, as the recommender reads them. */
export const CONTENT_TRACKS = [
  { value: "GENERAL", label: "Tổng quát" },
  { value: "IT_SOFTWARE", label: "Công nghệ thông tin" },
  { value: "OFFICE_BUSINESS", label: "Văn phòng – Kinh doanh" },
  { value: "SALES_CUSTOMER_SERVICE", label: "Bán hàng – CSKH" },
  { value: "HOSPITALITY_TOURISM", label: "Nhà hàng – Khách sạn – Du lịch" },
  { value: "STUDENT_ACADEMIC", label: "Sinh viên – Học thuật" },
];

/**
 * Admin copy for career tracks. The learner's onboarding asks "Bạn làm việc
 * hoặc học trong lĩnh vực nào?", so the admin says "lĩnh vực" too.
 */
export const TRACK_FIELD_COPY = {
  label: "Lĩnh vực",
  hint: "Bài được ưu tiên đề xuất cho học viên chọn lĩnh vực này. Tự lưu khi bấm.",
  lockedHint: "Lưu bài trước, sau đó chọn lĩnh vực.",
  untagged: "Chưa gắn lĩnh vực",
  saveError: "Chưa lưu được lĩnh vực",
} as const;

/** A list card's track line. */
export function trackNames(tracks?: string[]): string {
  const names = CONTENT_TRACKS.filter((t) => tracks?.includes(t.value)).map(
    (t) => t.label,
  );
  return names.length ? names.join(", ") : TRACK_FIELD_COPY.untagged;
}

export type ChecklistItem = { label: string; done: boolean };

/**
 * What a quiz still lacks before learners see it. Advisory: the publish
 * endpoint runs its own checks.
 */
export function publishChecklist(input: {
  domain: string;
  title: string;
  questions: Array<{
    type?: string;
    content?: any;
    audioAssets?: Array<{ isActive?: boolean }>;
  }>;
  audioPublished?: boolean;
  listeningMode?: string;
}): ChecklistItem[] {
  const mcqs = input.questions.filter((q) => q.type === "MULTIPLE_CHOICE");
  const withClip = input.questions.filter((q) =>
    (q.audioAssets ?? []).some((asset) => asset.isActive),
  ).length;
  const everyClip =
    input.questions.length > 0 && withClip === input.questions.length;
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
      PER_QUESTION_MODES.includes(input.listeningMode ?? "")
        ? {
            label: `Audio từng câu ${withClip}/${input.questions.length}`,
            done: everyClip,
          }
        : {
            label: "Audio đã xuất bản cho học viên",
            // Same rule as the server: one recording, or a clip per question.
            done: input.audioPublished === true || everyClip,
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
  bilingualContent?: unknown;
  questionsWithAudio?: number;
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
        audioBadgeFor(item).tone === filters.audio) &&
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

/**
 * Sentence-building exercises share the WRITING_PICTURE type without using
 * pictures. A new exercise has no questions yet, so it may still need one.
 */
export const writingUsesPictures = (
  type: string,
  questions: Array<{ content?: { imageUrl?: unknown } | null }> = [],
) =>
  type === "WRITING_PICTURE" &&
  (questions.length === 0 ||
    questions.some((question) => Boolean(question.content?.imageUrl)));

export const writingCardLabel = (item: {
  type?: string;
  thumbnailUrl?: string | null;
  writingKind?: string | null;
}) => {
  if (item.writingKind === "TRANSLATION") return "Dịch câu";
  if (item.type !== "WRITING_PICTURE") return "Viết email";
  return item.thumbnailUrl ? "Viết theo tranh" : "Viết câu";
};

/**
 * The form's "Dạng bài viết": a "Dịch câu" exercise is stored as WRITING_PICTURE,
 * so the form reads it from its sentences (owner 2026-11-14).
 */
export const writingFormType = (
  type: string,
  questions: Array<{ content?: { taskType?: unknown } | null }> = [],
) =>
  type === "WRITING_PICTURE" &&
  questions.some((q) => String(q.content?.taskType ?? "").toUpperCase() === "SENTENCE_TRANSLATION")
    ? "TRANSLATION"
    : type;

/** "giáo viên = teacher" lines into hints; a line without both sides is dropped. */
export function parseHintLines(text: string): Array<{ vi: string; en: string }> {
  return text
    .split("\n")
    .map((line) => {
      const at = line.indexOf("=");
      return at < 0 ? null : { vi: line.slice(0, at).trim(), en: line.slice(at + 1).trim() };
    })
    .filter((h): h is { vi: string; en: string } => Boolean(h && h.vi && h.en));
}

/** Stored hints back into the editor's lines. */
export const hintLines = (hints: unknown) =>
  Array.isArray(hints)
    ? hints
        .filter((h) => h && typeof h.vi === "string" && typeof h.en === "string")
        .map((h) => `${h.vi} = ${h.en}`)
        .join("\n")
    : "";
