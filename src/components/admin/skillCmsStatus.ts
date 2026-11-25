/**
 * Pure status helpers for the skill CMS screens: the audio badge on a list
 * card and the checklist beside the editor. No I/O, so they are unit-tested.
 */
import { TERMS } from "../../lib/ui/terms.ts";
import { listeningExchangeText } from "../../lib/listening/listeningExchange.ts";

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
  /** A hand-made dialogue's transcript holder has an active clip (list API). */
  dialogueAudio?: boolean;
  _count?: { questions?: number };
  questions?: unknown[];
  listeningAudioArtifacts?: Array<{ version: number; status: string }>;
}): AudioBadge {
  const mode = (item.bilingualContent as { mode?: string } | null)?.mode;
  const clips = item.questionsWithAudio ?? 0;
  const latest = item.listeningAudioArtifacts?.[0];
  // A hand-made dialogue plays the clip on its transcript holder when it has
  // no shared recording (review 2026-11-22: it read "Chưa có audio").
  if (mode === "DIALOGUE" && !latest && item.dialogueAudio)
    return { label: "Audio lời thoại · đang dùng", tone: "ok" };
  // A dialogue may play a clip on each question instead of one recording.
  if ((mode && PER_QUESTION_MODES.includes(mode)) || (!latest && clips > 0))
    return questionAudioBadge(
      clips,
      item._count?.questions ?? item.questions?.length ?? 0,
    );
  return latestAudioBadge(latest);
}

/**
 * Admin copy for career tracks. The learner's onboarding asks "Bạn làm việc
 * hoặc học trong lĩnh vực nào?", so the admin says "lĩnh vực" too. The
 * tracks themselves come from the API (lib/learning-path/tracks.ts).
 */
export const TRACK_FIELD_COPY = {
  label: TERMS.track,
  hint: "Bài được ưu tiên đề xuất cho học viên chọn lĩnh vực này. Tự lưu khi bấm.",
  lockedHint: "Lưu bài trước, sau đó chọn lĩnh vực.",
  untagged: "Chưa gắn lĩnh vực",
  saveError: "Chưa lưu được lĩnh vực",
} as const;

export type ChecklistItem = { label: string; done: boolean };

type ChecklistQuestion = {
  type?: string;
  content?: any;
  audioAssets?: Array<{ isActive?: boolean }>;
};

/**
 * A hand-made "Hội thoại" used to keep its turns in a DIALOGUE question: the
 * transcript, not a question a learner answers. AI-made dialogue quizzes have
 * none, so counts leave it out and both read the same (QA 2026-11-22). The
 * editor now copies the turns into every question and deletes the holder on
 * save (listeningDialogue.ts); older quizzes may still have one.
 */
export const isTranscriptHolder = (question: { type?: string }) => question.type === "DIALOGUE";

/** The questions a learner answers: a listening quiz's transcript holder is not one. */
export const answeredQuestions = <T extends { type?: string }>(domain: string, questions: T[]) =>
  domain === "listening" ? questions.filter((question) => !isTranscriptHolder(question)) : questions;

/** "Nghe chép" needs this many sentences to publish, as the server checks. */
export const DICTATION_MIN_SENTENCES = 20;
export const DICTATION_MAX_SENTENCES = 30;

const PICTURE_TASKS = ["PICTURE", "PICTURE_SENTENCE", "DESCRIBE_PICTURE"];
const VIETNAMESE_LETTER = /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i;
const filled = (value: unknown) => typeof value === "string" && value.trim().length > 0;

const choiceComplete = (content: any) => {
  const key = content?.correctIndex;
  return (
    Array.isArray(content?.options) &&
    typeof key === "number" &&
    Number.isInteger(key) &&
    key >= 0 &&
    key < content.options.length
  );
};

const validTurns = (content: any) => {
  const turns = (Array.isArray(content?.transcriptSegments) ? content.transcriptSegments : []).filter(
    (turn: any) => filled(turn?.text) && (filled(turn?.speakerId) || filled(turn?.speaker)),
  );
  return turns.length >= 2 && new Set(turns.map((turn: any) => turn.speakerId || turn.speaker)).size >= 2;
};

const validWordRange = (range: unknown) =>
  Array.isArray(range) &&
  range.length === 2 &&
  range.every((value) => Number.isInteger(value) && value > 0) &&
  range[0] <= range[1];

/** A "Dịch câu" task as the server checks it (translationTaskIssues). */
const translationComplete = (content: any) => {
  const answers = (Array.isArray(content?.acceptedAnswers) ? content.acceptedAnswers : []).filter(filled);
  return (
    VIETNAMESE_LETTER.test(String(content?.prompt ?? content?.text ?? "")) &&
    answers.length >= 2 &&
    answers.every((answer: string) => !VIETNAMESE_LETTER.test(answer)) &&
    Array.isArray(content?.hints) &&
    content.hints.length > 0 &&
    filled(content?.grammarTip)
  );
};

/**
 * What a quiz still lacks before learners see it, item for item the rules
 * of GET :domain/:id/validate, which the publish endpoint runs again. Each
 * domain lists only its own items: Viết has no choice questions.
 */
export function publishChecklist(input: {
  domain: string;
  title: string;
  /** The saved title carries the level tag ("Listening B1 — "), which the server reads. */
  levelTagged: boolean;
  questions: ChecklistQuestion[];
  /** The quiz's recording matches its transcript and is published. */
  audioPublished?: boolean;
  listeningMode?: string;
  /** Viết: the quiz type, WRITING_EMAIL or WRITING_PICTURE. */
  quizType?: string;
}): ChecklistItem[] {
  const answered = answeredQuestions(input.domain, input.questions);
  const items: ChecklistItem[] = [
    { label: "Có tiêu đề", done: input.title.trim().length > 0 },
    { label: "Có trình độ", done: input.levelTagged },
    { label: "Có ít nhất 1 câu hỏi", done: answered.length > 0 },
  ];
  const choices = answered.filter((q) => input.domain === "reading" || q.type === "MULTIPLE_CHOICE");
  const choiceItem = {
    label: "Câu trắc nghiệm đủ đáp án",
    done: choices.length > 0 && choices.every((q) => choiceComplete(q.content)),
  };
  if (input.domain === "reading") items.push(choiceItem);
  if (input.domain === "writing") {
    const content = (q: ChecklistQuestion) => (q.content ?? {}) as any;
    const taskType = (q: ChecklistQuestion) => String(content(q).taskType ?? "").trim().toUpperCase();
    items.push({
      label: "Mỗi câu có đề bài",
      done:
        answered.length > 0 &&
        answered.every(
          (q) =>
            q.type === "WRITING" &&
            filled(content(q).prompt ?? content(q).text) &&
            (input.quizType !== "WRITING_EMAIL" || taskType(q) !== ""),
        ),
    });
    const pictures = answered.filter((q) => input.quizType === "WRITING_PICTURE" && PICTURE_TASKS.includes(taskType(q)));
    if (pictures.length)
      items.push({ label: "Câu theo tranh có ảnh", done: pictures.every((q) => filled(content(q).imageUrl)) });
    const translations = answered.filter((q) => taskType(q) === "SENTENCE_TRANSLATION");
    if (translations.length)
      items.push({
        label: "Câu dịch đủ đáp án, gợi ý và lưu ý ngữ pháp",
        done: translations.every((q) => translationComplete(content(q))),
      });
    const ranged = answered.filter((q) => content(q).wordRange !== undefined);
    if (ranged.length)
      items.push({ label: "Số từ tối thiểu, tối đa hợp lệ", done: ranged.every((q) => validWordRange(content(q).wordRange)) });
  }
  if (input.domain === "listening") {
    const dictation = answered.filter((q) => q.type === "DICTATION");
    const allDictation = answered.length > 0 && dictation.length === answered.length;
    if (input.listeningMode === "DICTATION" || allDictation)
      items.push({
        label: `Nghe chép cần ít nhất ${DICTATION_MIN_SENTENCES} câu (${dictation.length}/${DICTATION_MIN_SENTENCES})`,
        done: answered.length > 0 && (!allDictation || answered.length >= DICTATION_MIN_SENTENCES),
      });
    if (dictation.length)
      items.push({
        label: "Mỗi câu nghe chép có câu cần chép",
        done: dictation.every((q) =>
          [q.content?.correctAnswer, q.content?.audioText, q.content?.text, q.content?.prompt].some(filled),
        ),
      });
    if (input.listeningMode !== "DICTATION" || choices.length) items.push(choiceItem);
    // A legacy holder is checked itself; otherwise the conversation the
    // questions carry, the one the recording is made from (the server's rule).
    const holders = input.questions.filter(isTranscriptHolder);
    const carrier = input.questions.find(
      (q) => Array.isArray(q.content?.transcriptSegments) && q.content.transcriptSegments.length > 0,
    );
    if (holders.length || input.listeningMode === "DIALOGUE")
      items.push({
        label: "Lời thoại có ít nhất 2 lượt của 2 người nói",
        done: holders.length ? holders.every((q) => validTurns(q.content)) : validTurns(carrier?.content),
      });
    // A learner hears the question's own clip, or the published recording
    // when the question shares the conversation (the server's rule).
    const playable = (q: ChecklistQuestion) =>
      (q.audioAssets ?? []).some((asset) => asset.isActive) ||
      (input.audioPublished === true &&
        (typeof q.content?.targetTurnId === "string" ||
          (Array.isArray(q.content?.transcriptSegments) && q.content.transcriptSegments.length > 0)));
    const heard = answered.filter(playable).length;
    const audioDone = answered.length > 0 && input.questions.every(playable);
    items.push(
      PER_QUESTION_MODES.includes(input.listeningMode ?? "")
        ? { label: `Audio từng câu ${heard}/${answered.length}`, done: audioDone }
        : { label: "Audio đã xuất bản cho học viên", done: audioDone },
    );
  }
  return items;
}

/**
 * The result of "Kiểm tra & xuất bản" (QA 2026-11-22: it asked to publish
 * before checking anything). The server's check decides; the checklist
 * names each item. Publishing is offered only when both pass.
 */
export function publishCheckView(checklist: ChecklistItem[], server: { valid: boolean; errors?: string[] }) {
  const failed = checklist.filter((item) => !item.done).map((item) => item.label);
  return {
    passed: checklist.filter((item) => item.done).map((item) => item.label),
    failed,
    details: server.valid ? [] : (server.errors ?? []),
    canPublish: server.valid && failed.length === 0,
  };
}

/**
 * How many of the four audio steps (check, create, listen & approve,
 * publish) are done. A quiz with no recording has done none until its
 * transcript passed the check (QA 2026-11-22: step 1 showed done on an
 * empty new quiz).
 */
export function audioStepsDone(artifactStatus: string | undefined, transcriptChecked: boolean) {
  if (artifactStatus === "PUBLISHED") return 4;
  if (artifactStatus === "APPROVED") return 3;
  if (artifactStatus === "PREVIEW_READY") return 2;
  // Generating or failed: the transcript passed, the audio is not there yet.
  if (artifactStatus) return 1;
  return transcriptChecked ? 1 : 0;
}

/**
 * Why a question cannot be saved yet, or null. A "Hội thoại" quiz's turns
 * are not a question: the conversation editor checks them
 * (listeningDialogue.ts, dialogueTurnsProblem).
 */
export function questionSaveProblem(
  domain: string,
  question: { type: string; prompt: string },
): string | null {
  if (question.prompt.trim()) return null;
  return domain === "listening" && question.type === "DICTATION" ? "Cần nhập câu cần chép." : "Cần nhập đề bài.";
}

/**
 * The saved title is "Listening B1 — Ordering food": the server adds the head
 * from the level picked. The editor shows and edits the part after it, keeps
 * the head aside and puts it back on save, so a range head ("A1–A2") or a
 * custom one ("Hội thoại C1") is not rewritten. The AI topic is the part
 * after the head too (QA 2026-11-22: "Writing B1 — [QA] …" went to Gemini).
 */
export function splitTitleHead(title?: string | null): { head: string; body: string } {
  const text = String(title ?? "");
  const at = text.indexOf(" — ");
  if (at < 0 || !cmsLevelFromTitle(text)) return { head: "", body: text };
  return { head: text.slice(0, at), body: text.slice(at + 3) };
}

export const joinTitleHead = (head: string, body: string) =>
  head && body.trim() ? `${head} — ${body.trim()}` : body.trim();

/** "AI chỉ trả về X/Y câu" when the AI sent fewer items than asked for, else null. */
export const aiShortfallNotice = (received: number, requested: number) =>
  received < requested ? `AI chỉ trả về ${received}/${requested} câu.` : null;

/**
 * The count beside "Soạn cả bài bằng AI": questions for a dialogue, a
 * comprehension or a reading draft; sentences for "Nghe chép", 20 to 30.
 */
export function fullDraftCountRange(listeningMode?: string) {
  return listeningMode === "DICTATION"
    ? { min: DICTATION_MIN_SENTENCES, max: DICTATION_MAX_SENTENCES, label: "Số câu" }
    : { min: 1, max: 10, label: "Số câu hỏi" };
}

export const clampDraftCount = (count: number, range: { min: number; max: number }) =>
  Math.min(range.max, Math.max(range.min, Math.round(Number(count) || range.min)));

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
  dialogueAudio?: boolean;
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

/** The four Writing kinds the list filters by (owner 2026-11-19); the backend tags each row. */
export const WRITING_KIND_LABEL: Record<string, string> = {
  TRANSLATION: "Dịch câu",
  PICTURE: "Viết theo tranh",
  SENTENCE: "Viết câu",
  EMAIL: "Viết email",
};

export const writingCardLabel = (item: {
  type?: string;
  thumbnailUrl?: string | null;
  writingKind?: string | null;
}) => {
  if (item.writingKind && WRITING_KIND_LABEL[item.writingKind]) return WRITING_KIND_LABEL[item.writingKind];
  if (item.type !== "WRITING_PICTURE") return "Viết email";
  return item.thumbnailUrl ? "Viết theo tranh" : "Viết câu";
};

/**
 * The form's "Dạng bài viết". "Dịch câu", "Viết theo tranh" and "Viết câu" are
 * all stored as WRITING_PICTURE; the form keeps them apart.
 */
export const WRITING_FORM_KINDS = [
  { value: "WRITING_EMAIL", label: "Viết email" },
  { value: "TRANSLATION", label: "Dịch câu" },
  { value: "WRITING_PICTURE", label: "Viết theo tranh" },
  { value: "SENTENCE", label: "Viết câu" },
] as const;

/** The quiz type a form kind is saved as. */
export const writingQuizType = (formType: string) =>
  formType === "WRITING_EMAIL" ? "WRITING_EMAIL" : "WRITING_PICTURE";

/**
 * The task type a new question of this kind starts with. "Thêm câu hỏi" used
 * to start every task as EMAIL, so a picture task failed to save and a
 * translation task showed no translation fields (owner 2026-11-19).
 */
export const defaultWritingTaskType = (formType: string) =>
  formType === "TRANSLATION"
    ? "SENTENCE_TRANSLATION"
    : formType === "WRITING_PICTURE"
      ? "PICTURE_SENTENCE"
      : formType === "SENTENCE"
        ? "SENTENCE"
        : "EMAIL";

/** The form's "Dạng bài viết" for each kind the backend names. */
const FORM_TYPE_OF_KIND: Record<string, string> = {
  TRANSLATION: "TRANSLATION",
  PICTURE: "WRITING_PICTURE",
  SENTENCE: "SENTENCE",
};

/** The kind a form type is saved as (bilingualContent.writingKind on the backend). */
export const writingKindOfForm = (formType: string) =>
  formType === "TRANSLATION"
    ? "TRANSLATION"
    : formType === "SENTENCE"
      ? "SENTENCE"
      : formType === "WRITING_PICTURE"
        ? "PICTURE"
        : "EMAIL";

/**
 * The form's "Dạng bài viết": "Dịch câu", "Viết theo tranh" and "Viết câu"
 * are all stored as WRITING_PICTURE. The backend's kind comes first: it is
 * the kind saved with the exercise, so an empty "Viết câu" reopens as itself
 * (QA 2026-11-22). Without it the form reads the sentences (owner 2026-11-14).
 */
export const writingFormType = (
  type: string,
  questions: Array<{ content?: { taskType?: unknown; imageUrl?: unknown } | null }> = [],
  writingKind?: string | null,
) => {
  if (type !== "WRITING_PICTURE") return type;
  if (writingKind && FORM_TYPE_OF_KIND[writingKind]) return FORM_TYPE_OF_KIND[writingKind];
  const taskTypes = questions.map((q) => String(q.content?.taskType ?? "").toUpperCase());
  if (taskTypes.includes("SENTENCE_TRANSLATION")) return "TRANSLATION";
  // Plain sentences with no picture are "Viết câu".
  const plain =
    questions.length > 0 &&
    taskTypes.every((t) => t === "SENTENCE") &&
    questions.every((q) => !q.content?.imageUrl);
  return plain ? "SENTENCE" : type;
};

/** Each Writing task type in Vietnamese, for the editor and the AI draft panel. */
export const WRITING_TASK_LABEL: Record<string, string> = {
  SENTENCE_TRANSLATION: "Dịch câu Việt → Anh",
  SENTENCE: "Viết câu",
  PICTURE_SENTENCE: "Viết câu theo tranh (2 từ gợi ý)",
  DESCRIBE_PICTURE: "Mô tả tranh",
  EMAIL: "Phản hồi email",
  SHORT_MESSAGE: "Tin nhắn ngắn",
  INVITATION: "Email mời",
  REQUEST: "Email yêu cầu",
  THANK_YOU: "Email cảm ơn",
  STATUS_UPDATE: "Email cập nhật tình hình",
  CUSTOMER_EMAIL: "Email chăm sóc khách hàng",
  INFORMATION_REQUEST: "Email hỏi thông tin",
  MEETING_FOLLOWUP: "Email theo dõi cuộc họp",
  OPINION: "Bài luận nêu quan điểm",
  PROPOSAL: "Bài viết đề xuất giải pháp",
  ANALYTICAL_RESPONSE: "Bài phân tích",
  ARGUMENT: "Bài lập luận",
};

/** A task type as an admin reads it; an unknown code is called "Bài viết", never shown raw. */
export const writingTaskLabel = (taskType?: string | null) =>
  WRITING_TASK_LABEL[String(taskType ?? "").trim().toUpperCase()] ?? "Bài viết";

/** The Đọc question types, as the editor's select and the AI review name them. */
export const READING_QUESTION_TYPE_LABEL: Record<string, string> = {
  DETAIL: "Chi tiết",
  PURPOSE: "Mục đích",
  INFERENCE: "Suy luận",
  MAIN_IDEA: "Ý chính",
  PROMOTION: "Thông tin quảng bá",
  VOCAB_IN_CONTEXT: "Từ vựng trong ngữ cảnh",
};

/** "detail" or "Main idea" in the stored form; anything else is MAIN_IDEA, the editor's default. */
export const normalizeReadingQuestionType = (value?: unknown) => {
  const type = String(value ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  return READING_QUESTION_TYPE_LABEL[type] ? type : "MAIN_IDEA";
};

export const readingQuestionTypeLabel = (type?: unknown) =>
  READING_QUESTION_TYPE_LABEL[String(type ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_")] ??
  "Trắc nghiệm đọc hiểu";

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

/**
 * Which AI draft a Writing kind can ask for (owner 2026-11-19): email and
 * "Dịch câu" only. A picture exercise needs real photographs; "Viết câu" has
 * no AI draft yet.
 */
export const writingDraftKind = (formType: string): "EMAIL" | "TRANSLATION" | null =>
  formType === "TRANSLATION" ? "TRANSLATION" : formType === "WRITING_EMAIL" ? "EMAIL" : null;

/** One task from POST /admin/writing/ai/full-draft, as the backend checked it. */
export type WritingDraftTask = {
  taskType: string;
  prompt: string;
  wordRange?: [number, number];
  explanation?: string;
  acceptedAnswers?: string[];
  hints?: Array<{ vi: string; en: string }>;
  grammarTip?: string;
};

/** One question from POST /admin/{listening,reading}/ai/full-draft. */
export type FullDraftCandidate = {
  prompt?: unknown;
  options?: unknown;
  correctIndex?: unknown;
  explanation?: unknown;
  explanationEn?: unknown;
  questionType?: unknown;
  /** "Nghe hiểu (câu ngắn)": the sentence the learner hears for this question. */
  audioText?: unknown;
  /** "Nghe hiểu (câu ngắn)", an exchange: 2-3 turns of speakers A and B. */
  turns?: unknown;
};

/**
 * The editor fields an AI full-draft question fills. A "Nghe hiểu" question
 * brings its own sentence in audioText, the field a hand-written one fills,
 * so it saves the same way and its clip is made per question. An exchange
 * fills that field as "A: …" / "B: …" lines, which save as its turns.
 */
export function fullDraftQuestionFields(candidate: FullDraftCandidate) {
  return {
    type: "MULTIPLE_CHOICE",
    prompt: String(candidate.prompt || ""),
    options: Array.isArray(candidate.options) ? candidate.options.join("\n") : "",
    correctIndex: String(candidate.correctIndex ?? ""),
    explanation: String(candidate.explanation || ""),
    explanationEn: String(candidate.explanationEn || ""),
    audioText:
      listeningExchangeText(candidate.turns) ?? String(candidate.audioText || "").trim(),
    questionType: normalizeReadingQuestionType(candidate.questionType),
  };
}

/** One candidate in the "Thêm câu hỏi bằng AI" review, as the admin edits it. */
export type AiQuestionCandidate = {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  explanationEn?: string;
  /** "Nghe hiểu": the sentence, or the "A: …" / "B: …" exchange, the learner hears. */
  audioText?: string;
};

/**
 * "Thêm câu hỏi bằng AI" in a "Nghe hiểu" quiz drafts new items from the
 * quiz's topic and level (POST listening/ai/full-draft, COMPREHENSION):
 * each candidate brings its own sentence (QA 2026-11-22: the button asked
 * for a transcript this form does not have).
 */
export const comprehensionCandidate = (question: FullDraftCandidate): AiQuestionCandidate => {
  const fields = fullDraftQuestionFields(question);
  return {
    prompt: fields.prompt,
    options: fields.options ? fields.options.split("\n") : [],
    correctIndex: Number(fields.correctIndex),
    explanation: fields.explanation,
    explanationEn: fields.explanationEn,
    audioText: fields.audioText,
  };
};

/**
 * The editor fields of a reviewed candidate: saved through the same payload
 * as a hand-written question. A candidate without a sentence of its own
 * asks about the quiz's dialogue.
 */
export const aiCandidateQuestionFields = (candidate: AiQuestionCandidate) => ({
  type: "MULTIPLE_CHOICE",
  prompt: candidate.prompt.trim(),
  options: candidate.options.map((option) => option.trim()).join("\n"),
  correctIndex: String(candidate.correctIndex),
  explanation: candidate.explanation.trim(),
  explanationEn: String(candidate.explanationEn ?? "").trim(),
  audioText: String(candidate.audioText ?? "").trim(),
});

/** A candidate that can be added: a prompt, 4 options, a key, and in "Nghe hiểu" its sentence. */
export const aiCandidateReady = (candidate: AiQuestionCandidate, needsAudioText: boolean) =>
  Boolean(candidate.prompt.trim()) &&
  candidate.options.length === 4 &&
  candidate.options.every((option) => option.trim()) &&
  Number.isInteger(candidate.correctIndex) &&
  candidate.correctIndex >= 0 &&
  candidate.correctIndex < 4 &&
  (!needsAudioText || Boolean(String(candidate.audioText ?? "").trim()));

/**
 * Whether a reviewed draft question can be applied: a prompt and 4 options,
 * and in "Nghe hiểu" the sentence it plays.
 */
export const fullDraftQuestionReady = (
  question: { prompt: string; options: string; audioText: string },
  listeningMode?: string,
) =>
  Boolean(question.prompt.trim()) &&
  question.options.split("\n").filter(Boolean).length === 4 &&
  (listeningMode !== "COMPREHENSION" || Boolean(question.audioText.trim()));

/**
 * The listening form ("Dạng bài") is fixed once the quiz has questions: saved
 * ones, or ones applied from an AI draft and waiting for Lưu, which are saved
 * in the form chosen when Lưu is pressed (owner 2026-11-22).
 */
export const listeningFormLocked = (savedQuestions: number, pendingDraftQuestions: number) =>
  savedQuestions > 0 || pendingDraftQuestions > 0;

/** The body that saves a picked AI task as a question of the exercise. */
export function writingDraftQuestion(task: WritingDraftTask, level?: string) {
  const translation = task.taskType === "SENTENCE_TRANSLATION";
  return {
    type: "WRITING",
    prompt: task.prompt,
    taskType: task.taskType,
    ...(level ? { level } : {}),
    ...(translation
      ? {
          acceptedAnswers: task.acceptedAnswers ?? [],
          hints: task.hints ?? [],
          grammarTip: task.grammarTip ?? "",
        }
      : {
          ...(task.wordRange ? { wordRange: task.wordRange } : {}),
          ...(task.explanation ? { explanation: task.explanation } : {}),
        }),
  };
}

/**
 * The form's name shown before a Listening title (owner 2026-11-25), the head
 * the server stores it under: "Hội thoại", "Nghe chép" or "Nghe hiểu".
 */
export function listeningTitlePrefix(mode: string | null | undefined): string {
  if (mode === "DIALOGUE") return "Hội thoại";
  if (mode === "DICTATION") return "Nghe chép";
  return "Nghe hiểu";
}

/**
 * The description an AI lesson draft carries (owner 2026-11-25): what the
 * admin already typed stays, as the title does; the AI's sentence only fills
 * an empty box.
 */
export function draftDescription(typed: string | null | undefined, drafted: unknown): string {
  const own = (typed ?? "").trim();
  return own || String(drafted ?? "").trim();
}

/**
 * What to do after "Áp dụng vào biểu mẫu" (owner 2026-11-25: nothing said
 * that Lưu comes next). A Listening lesson makes its audio once saved.
 */
export function draftSaveHint(domain: string): string {
  return domain === "listening"
    ? "Bấm Lưu để lưu bài. Audio sẽ tự tạo sau khi lưu."
    : "Bấm Lưu để lưu bài.";
}
