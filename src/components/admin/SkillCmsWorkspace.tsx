"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, Circle, FileAudio, FileStack, Loader2, Plus, Save, Send, Trash2, Upload, Volume2, X } from "lucide-react";

import toast from "react-hot-toast";
import axiosClient from "@/lib/api/axiosClient";
import DocumentImportButton from "@/components/admin/DocumentImportButton";
import ImageUploadField from "@/components/admin/ImageUploadField";
import RequiredMediaNotice from "@/components/admin/RequiredMediaNotice";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import { BTN_AI, BTN_DANGER, BTN_DARK, BTN_PRIMARY, BTN_SECONDARY, BTN_SUCCESS } from "./cmsButtons";
import {
  audioBadgeFor,
  CMS_LEVELS,
  cmsLevelFromTitle,
  contentLevel,
  publishChecklist,
  writingCardLabel,
  writingFormType,
  writingQuizType,
  defaultWritingTaskType,
  WRITING_FORM_KINDS,
  WRITING_KIND_LABEL,
  writingDraftKind,
  parseHintLines,
  hintLines,
  writingUsesPictures,
  fullDraftQuestionFields,
  fullDraftQuestionReady,
  listeningFormLocked,
  aiCandidateQuestionFields,
  aiCandidateReady,
  aiShortfallNotice,
  answeredQuestions,
  audioStepsDone,
  clampDraftCount,
  comprehensionCandidate,
  DICTATION_MIN_SENTENCES,
  fullDraftCountRange,
  isTranscriptHolder,
  joinTitleHead,
  normalizeReadingQuestionType,
  publishCheckView,
  questionSaveProblem,
  READING_QUESTION_TYPE_LABEL,
  readingQuestionTypeLabel,
  splitTitleHead,
  WRITING_TASK_LABEL,
  writingKindOfForm,
  type AiQuestionCandidate,
  type ListFilters,
} from "./skillCmsStatus";
import {
  dialogueForSave,
  dialogueMetadata,
  dialogueQuestionContent,
  dialogueSavePlan,
  dialogueSource,
  dialogueTurns,
  dialogueTurnsProblem,
  emptyTurn,
  renameSpeaker,
  transcriptForSave,
  type DialogueTurn,
} from "./listeningDialogue";
import { AdminImageThumb } from "./AdminImageThumb";
import { AdminPageHeader } from "./AdminPageHeader";
import { AdminListToolbar } from "./AdminListToolbar";
import { kindOptionLabel } from "./adminListToolbarLogic";
import { ADMIN_CARD_GRID } from "./cmsStyles";
import { TranslationReviewPanel, TRANSLATION_REVIEW_KEYS } from "./TranslationReviewPanel";
import { WritingAiDraftPanel } from "./WritingAiDraftPanel";
import { AiCreateDialog } from "./AiCreateDialog";
import { translationReviewService } from "@/lib/api/services/translation-review.service";
import {
  quizDisplayTitle,
  quizIdsMatchingTitle,
} from "@/lib/catalog/displayTitles";
import { TrackTagField } from "./TrackTagField";
import { trackNames } from "@/lib/learning-path/tracks";
import { useAdminLearningTracks } from "@/lib/learning-path/useLearningTracks";
import {
  comprehensionSpokenContent,
  listeningExchangeText,
} from "@/lib/listening/listeningExchange";
import { Pagination } from "@/components/ui";
import { useAdminList } from "./useAdminList";
import { ADMIN_PAGE_SIZES } from "./adminList";

type Domain = "listening" | "reading" | "writing";
type ListeningMode = "COMPREHENSION" | "DICTATION" | "DIALOGUE";
type ListeningModeFilter = "ALL" | ListeningMode;
type ListeningSegment = {
  speaker: string;
  text: string;
  translation: string;
};
type QuestionDraft = {
  id?: number;
  type: string;
  prompt: string;
  options: string;
  correctIndex: string;
  /** Vietnamese. */
  explanation: string;
  /** English; listening explanations are stored as { vi, en }. */
  explanationEn: string;
  /** Comprehension: the sentence the learner hears. */
  audioText: string;
  questionType: string;
  segments: ListeningSegment[];
  taskType: string;
  level: string;
  imageUrl: string;
  keywords: string;
  wordMin: string;
  wordMax: string;
  sampleSentences: string;
  /** "Dịch câu": accepted English answers, one per line. */
  acceptedAnswers: string;
  /** "Dịch câu": "từ = word" lines. */
  hints: string;
  grammarTip: string;
};
type CmsFullDraft = {
  domain: "listening" | "reading";
  title: string;
  description: string;
  level: string;
  passage: string;
  /** Listening: the form drafted. "Nghe hiểu" has no shared source; each question keeps its sentence. */
  listeningMode?: ListeningMode;
  sourceQuestion?: QuestionDraft;
  questions: QuestionDraft[];
  /** "Nghe chép": one sentence per dictation item, editable and excludable. */
  sentences?: Array<{ text: string; excluded?: boolean }>;
  /** "AI chỉ trả về X/Y câu" when the AI sent fewer items than asked for. */
  shortfall?: string | null;
};

const meta: Record<Domain, { label: string; type: string }> = {
  listening: { label: "Nghe", type: "LISTENING_PRACTICE" },
  reading: { label: "Đọc", type: "BILINGUAL_READING" },
  writing: { label: "Viết", type: "WRITING_EMAIL" },
};

const CONTENT_LEVEL_OPTIONS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

/** The CEFR tag authored at the head of a title ("Hội thoại C1 — ..."); quizzes have no level column. */
function levelFromTitle(title?: string | null): string | null {
  const level = cmsLevelFromTitle(title);
  return level && (CONTENT_LEVEL_OPTIONS as readonly string[]).includes(level)
    ? level
    : null;
}

const NO_FILTERS: Omit<ListFilters, "query" | "status"> = {
  level: "ALL",
  audio: "ALL",
  sort: "NEWEST",
};

const LISTENING_MODE_OPTIONS: Array<{
  value: ListeningMode;
  label: string;
}> = [
  { value: "COMPREHENSION", label: "Nghe hiểu" },
  { value: "DICTATION", label: "Nghe chép" },
  { value: "DIALOGUE", label: "Hội thoại" },
];

/** Nghe's own filter in the toolbar: how far each bài's audio has got. */
const AUDIO_FILTER_OPTIONS: Array<{ value: ListFilters["audio"]; label: string }> = [
  { value: "ok", label: "Đang dùng" },
  { value: "pending", label: "Chờ duyệt / xuất bản" },
  { value: "none", label: "Chưa có audio" },
  { value: "error", label: "Lỗi" },
];

/** What a dictation item shows the learner; the sentence itself is the answer. */
const DICTATION_INSTRUCTION = "Nghe và chép lại câu bạn vừa nghe.";

/** Under each "Câu nghe" field: how to write a two-voice exchange. */
const EXCHANGE_HINT =
  "Hai người nói: viết mỗi lượt một dòng, bắt đầu bằng A: hoặc B: (hoặc Nam:, Nữ:).";

/** How each listening form is named in the editor. */
const LISTENING_MODE_LABEL: Record<ListeningMode, string> = {
  DIALOGUE: "Hội thoại + câu hỏi",
  COMPREHENSION: "Nghe hiểu (câu ngắn)",
  DICTATION: "Nghe chép",
};

function normalizeListeningMode(value: unknown): ListeningMode {
  return value === "DICTATION" || value === "DIALOGUE"
    ? value
    : "COMPREHENSION";
}

function getListeningMode(content: any): ListeningMode {
  const metadata =
    content?.bilingualContent && typeof content.bilingualContent === "object"
      ? content.bilingualContent
      : {};
  return normalizeListeningMode(metadata.mode);
}

const publicationStatusLabel = (status?: string) =>
  status === "PUBLISHED" ? "Đã xuất bản" : "Bản nháp";

const writingTaskOptions = (quizType: string) =>
  (quizType === "TRANSLATION"
    ? ["SENTENCE_TRANSLATION"]
    : quizType === "SENTENCE"
      ? ["SENTENCE"]
      : quizType === "WRITING_PICTURE"
        ? ["PICTURE_SENTENCE", "DESCRIBE_PICTURE", "SENTENCE"]
        : [
            "EMAIL",
            "SHORT_MESSAGE",
            "INVITATION",
            "REQUEST",
            "THANK_YOU",
            "STATUS_UPDATE",
            "CUSTOMER_EMAIL",
            "INFORMATION_REQUEST",
            "MEETING_FOLLOWUP",
            "OPINION",
            "PROPOSAL",
            "ANALYTICAL_RESPONSE",
            "ARGUMENT",
          ]
  ).map((value) => ({ value, label: WRITING_TASK_LABEL[value] }));

const emptySegment = (): ListeningSegment => ({
  speaker: "",
  text: "",
  translation: "",
});
const emptyQuestion = (domain: Domain): QuestionDraft => ({
  type:
    domain === "listening"
      ? "DICTATION"
      : domain === "writing"
        ? "WRITING"
        : "MULTIPLE_CHOICE",
  prompt: "",
  options: "",
  correctIndex: "",
  explanation: "",
  explanationEn: "",
  audioText: "",
  questionType: domain === "reading" ? "MAIN_IDEA" : "",
  segments: [emptySegment()],
  taskType: domain === "writing" ? "EMAIL" : "",
  level: "",
  imageUrl: "",
  keywords: "",
  wordMin: "",
  wordMax: "",
  sampleSentences: "",
  acceptedAnswers: "",
  hints: "",
  grammarTip: "",
});

function unwrap<T>(value: any): T {
  return (value?.data ?? value) as T;
}

function questionToDraft(question: any): QuestionDraft {
  const content =
    question?.content && typeof question.content === "object"
      ? question.content
      : {};
  const range = Array.isArray(content.wordRange) ? content.wordRange : [];
  return {
    ...emptyQuestion(question?.type === "WRITING" ? "writing" : "listening"),
    id: question.id,
    type: question.type || "MULTIPLE_CHOICE",
    prompt: String(
      question?.type === "DICTATION"
        ? (content.correctAnswer ?? content.audioText ?? content.text ?? "")
        : (content.prompt ??
            content.text ??
            content.correctAnswer ??
            content.audioText ??
            ""),
    ),
    options: Array.isArray(content.options) ? content.options.join("\n") : "",
    correctIndex:
      content.correctIndex === undefined ? "" : String(content.correctIndex),
    explanation:
      typeof content.explanation === "string"
        ? content.explanation
        : String(content.explanation?.vi ?? ""),
    explanationEn:
      typeof content.explanation === "object"
        ? String(content.explanation?.en ?? "")
        : "",
    // A comprehension exchange loads back as its "A: …" / "B: …" lines.
    audioText:
      (question?.type === "MULTIPLE_CHOICE"
        ? listeningExchangeText(content.transcriptSegments)
        : null) ?? String(content.audioText ?? ""),
    questionType: String(content.questionType ?? "MAIN_IDEA"),
    segments: Array.isArray(content.transcriptSegments)
      ? content.transcriptSegments.map((segment: any) => ({
          speaker: String(segment?.speaker ?? segment?.speakerId ?? ""),
          text: String(segment?.text ?? ""),
          translation: String(segment?.translation ?? ""),
        }))
      : [emptySegment()],
    taskType: String(content.taskType ?? "EMAIL"),
    level: String(content.level ?? ""),
    imageUrl: String(content.imageUrl ?? ""),
    keywords: Array.isArray(content.keywords)
      ? content.keywords.join("\n")
      : Array.isArray(content.requiredKeywords)
        ? content.requiredKeywords.join("\n")
        : "",
    wordMin: range[0] === undefined ? "" : String(range[0]),
    wordMax: range[1] === undefined ? "" : String(range[1]),
    sampleSentences: Array.isArray(content.sampleSentences)
      ? content.sampleSentences.join("\n")
      : "",
    acceptedAnswers: Array.isArray(content.acceptedAnswers)
      ? content.acceptedAnswers.join("\n")
      : "",
    hints: hintLines(content.hints),
    grammarTip: String(content.grammarTip ?? ""),
  };
}

/** A listening question's type in each form: a "Hội thoại" quiz asks multiple-choice questions. */
const listeningQuestionType = (mode: ListeningMode) =>
  mode === "DICTATION" ? "DICTATION" : "MULTIPLE_CHOICE";

const AUDIO_DOT: Record<string, string> = {
  ok: "bg-emerald-500",
  pending: "bg-amber-500",
  error: "bg-rose-500",
  none: "bg-slate-300",
};


const LISTENING_QUESTION_LABEL: Record<string, string> = {
  MULTIPLE_CHOICE: "Trắc nghiệm",
  DICTATION: "Nghe chép",
  DIALOGUE: "Hội thoại",
};

/** Listening artifact status in Vietnamese, for the audio steps. */
const ARTIFACT_STATUS_LABEL: Record<string, string> = {
  PREVIEW_READY: "Chờ nghe & duyệt",
  APPROVED: "Đã duyệt, chờ xuất bản",
  PUBLISHED: "Đang dùng cho học viên",
  STALE: "Cũ (nội dung đã đổi)",
  FAILED: "Lỗi",
};

function inputClassName(): string {
  return "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200";
}

export default function SkillCmsWorkspace({
  domain,
  mode = "list",
}: {
  domain: Domain;
  mode?: "list" | "edit";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ id?: string }>();
  const id = mode === "edit" ? params?.id : undefined;
  const initialListeningMode = normalizeListeningMode(searchParams.get("mode"));
  const [item, setItem] = useState<any | null>(null);
  const [artifacts, setArtifacts] = useState<any[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  // Whole-item delete (owner 2026-11-17): drafts that no learner worked on.
  const [pendingDeleteItem, setPendingDeleteItem] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "DRAFT" | "PUBLISHED"
  >("ALL");
  const [listeningModeFilter, setListeningModeFilter] =
    useState<ListeningModeFilter>("ALL");
  const [listFilters, setListFilters] =
    useState<Omit<ListFilters, "query" | "status">>(NO_FILTERS);
  const [writingTypeFilter, setWritingTypeFilter] = useState("ALL");
  const [trackFilter, setTrackFilter] = useState("ALL");
  // Names, order and on/off of the tracks: the filter and each card's track line.
  const { data: adminTracks = [] } = useAdminLearningTracks();
  // The list screen loads one page; search, filters and sort run on the server.
  const list = useAdminList<
    any,
    {
      total: number;
      published: number;
      modes: Record<ListeningMode, number>;
      levels: string[];
      /** Viết: bài per kind (TRANSLATION, PICTURE, SENTENCE, EMAIL), once the API sends it. */
      kinds?: Partial<Record<string, number>>;
    }
  >({
    key: `admin-skill-content-${domain}`,
    url: `/admin/skill-content/${domain}`,
    search: searchTerm,
    filters: {
      status: statusFilter,
      level: listFilters.level,
      audio: listFilters.audio,
      sort: listFilters.sort,
      mode: domain === "listening" ? listeningModeFilter : undefined,
      kind: domain === "writing" ? writingTypeFilter : undefined,
      track: trackFilter,
      titleIds: quizIdsMatchingTitle(searchTerm).join(",") || undefined,
    },
    enabled: mode === "list",
  });
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  // Writing: "Duyệt câu dịch" is a tab of this page, with counts per exercise (owner 2026-11-19).
  const writingView = domain === "writing" && searchParams.get("tab") === "review" ? "review" : "practice";
  const reviewQuizId = Number(searchParams.get("quiz")) || undefined;
  const { data: reviewSummary } = useQuery({
    queryKey: TRANSLATION_REVIEW_KEYS.summary,
    queryFn: translationReviewService.summary,
    enabled: domain === "writing" && mode === "list",
  });
  const openWritingView = (view: "practice" | "review", quiz?: number) =>
    router.replace(
      view === "review" ? `/admin/writing?tab=review${quiz ? `&quiz=${quiz}` : ""}` : "/admin/writing",
      { scroll: false },
    );
  const [pendingPublicationStatus, setPendingPublicationStatus] = useState<
    "DRAFT" | "PUBLISHED" | null
  >(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    level: "A2",
    timeLimit: "15",
    passage: "",
    type: meta[domain].type,
  });
  const [question, setQuestion] = useState<QuestionDraft>(() => {
    const initialQuestion = emptyQuestion(domain);
    if (domain === "listening") {
      initialQuestion.type = listeningQuestionType(initialListeningMode);
    }
    return initialQuestion;
  });
  // "Hội thoại": the quiz's one conversation. A save copies it into every
  // question (listeningDialogue.ts); `dialogueEdited` says the admin changed it.
  const [dialogue, setDialogue] = useState<DialogueTurn[]>(() => [emptyTurn()]);
  const [dialogueEdited, setDialogueEdited] = useState(false);
  const [contentMetadata, setContentMetadata] = useState<
    Record<string, unknown>
  >({});
  const [selectedListeningMode, setSelectedListeningMode] =
    useState<ListeningMode>(initialListeningMode);

  // Contextual AI state: Reading
  const [isPassageAiOpen, setIsPassageAiOpen] = useState(false);
  const [isPassageAiLoading, setIsPassageAiLoading] = useState(false);
  const [passageAiTopic, setPassageAiTopic] = useState("");
  const [passageAiSuggestion, setPassageAiSuggestion] = useState<{
    title: string;
    passage: string;
  } | null>(null);

  const [isQuestionsAiOpen, setIsQuestionsAiOpen] = useState(false);
  const [isQuestionsAiLoading, setIsQuestionsAiLoading] = useState(false);
  const [readingAiCount, setReadingAiCount] = useState(3);
  const [readingAiCandidates, setReadingAiCandidates] = useState<
    Array<{
      prompt: string;
      options: string[];
      correctIndex: number;
      explanation: string;
      questionType?: string;
    }>
  >([]);

  // Contextual AI state: Listening / Writing. Suggestions remain local until the existing save action.
  const [isListeningContentAiOpen, setIsListeningContentAiOpen] =
    useState(false);
  // What "AI gợi ý" writes: the conversation, or the sentence of a dictation item.
  const [listeningContentAiMode, setListeningContentAiMode] = useState<
    "DIALOGUE" | "DICTATION"
  >("DICTATION");
  const [isListeningContentAiLoading, setIsListeningContentAiLoading] =
    useState(false);
  const [listeningContentAiSuggestion, setListeningContentAiSuggestion] =
    useState<{
      mode: "DIALOGUE" | "DICTATION";
      text?: string;
      turns?: ListeningSegment[];
    } | null>(null);
  const [isListeningQuestionsAiOpen, setIsListeningQuestionsAiOpen] =
    useState(false);
  const [isListeningQuestionsAiLoading, setIsListeningQuestionsAiLoading] =
    useState(false);
  const [listeningQuestionsAiCount, setListeningQuestionsAiCount] = useState(3);
  const [listeningQuestionsAiCandidates, setListeningQuestionsAiCandidates] =
    useState<AiQuestionCandidate[]>([]);
  /** "AI chỉ trả về X/Y câu" for the last AI question draft, Nghe or Đọc. */
  const [aiQuestionsShortfall, setAiQuestionsShortfall] = useState<string | null>(null);
  // The stored title's head ("Listening B1"): the server adds it from the
  // level; the field edits the rest and it is put back on save.
  const [titleHead, setTitleHead] = useState("");
  // Step 1 of the audio steps: done once "Kiểm tra lời thoại" passed.
  const [transcriptChecked, setTranscriptChecked] = useState(false);
  // "Kiểm tra & xuất bản": the server's check, shown before any publish.
  const [publishCheck, setPublishCheck] = useState<{ valid: boolean; errors: string[] } | null>(null);
  const [isWritingAiOpen, setIsWritingAiOpen] = useState(false);
  const [isWritingAiLoading, setIsWritingAiLoading] = useState(false);
  const [writingAiSuggestion, setWritingAiSuggestion] = useState<{
    taskType: string;
    prompt: string;
    scenario?: string;
    recipient?: string;
    context?: string;
    wordRange?: [number, number];
    keywords?: string[];
    sampleSentences?: string[];
  } | null>(null);
  const [fullDraft, setFullDraft] = useState<CmsFullDraft | null>(null);
  const [fullDraftCount, setFullDraftCount] = useState(5);
  // "Soạn cả bài bằng AI" is running (owner 2026-11-24: it showed nothing for
  // the 10-30 s the AI takes, and could be clicked again).
  const [fullDraftBusy, setFullDraftBusy] = useState(false);
  const [documentText, setDocumentText] = useState("");
  const [dictationTopic, setDictationTopic] = useState("");
  const [isDictationAiLoading, setIsDictationAiLoading] = useState(false);
  // The "new question" editor is opened on demand; editing happens in place.
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [titleError, setTitleError] = useState(false);
  // Opened from "Tạo bằng AI" on the list (owner 2026-11-19): the AI drafts from the title.
  const aiStart =
    mode !== "list" && !id && (domain === "listening" || domain === "reading") && searchParams.get("ai") === "1";
  // Writing AI (owner 2026-11-19): the create dialog on the list, the draft panel in the editor.
  const [writingAiCreating, setWritingAiCreating] = useState(false);
  const [writingAi, setWritingAi] = useState<{ count: number; auto: boolean } | null>(null);
  const [questionPreview, setQuestionPreview] = useState<{
    questionId: number;
    url: string;
  } | null>(null);
  const [audioBatch, setAudioBatch] = useState<{
    done: number;
    total: number;
  } | null>(null);
  // A Listening lesson saved from "Soạn cả bài bằng AI" gets its audio at once
  // (owner 2026-11-24): set on save, run when the saved lesson has loaded.
  const [autoAudio, setAutoAudio] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkLines, setBulkLines] = useState("");
  const [pendingFullDraftQuestions, setPendingFullDraftQuestions] = useState<
    QuestionDraft[]
  >([]);

  /**
   * The transcript a dialogue quiz plays, and its accent. Every MCQ added to
   * the quiz carries them, as published content does.
   */
  const quizListeningContext = () => {
    // Only a dialogue quiz shares one conversation; comprehension and
    // dictation questions each carry their own sentence and clip.
    if (domain !== "listening" || selectedListeningMode !== "DIALOGUE")
      return { transcript: [], accent: "US" };
    // The conversation as edited; turns keep the voices they were stored with.
    const source = dialogueSource(item?.questions, contentMetadata);
    return {
      transcript: dialogueForSave(dialogue, source.segments),
      accent: source.accent,
    };
  };

  /**
   * "Hội thoại": the saved questions get the conversation (dialogueSavePlan),
   * and a legacy turns question goes once its turns are in the questions.
   */
  const syncDialogueQuestions = async (
    quizId: number | string,
    saved: any[],
    conversation: Array<Record<string, string>>,
  ) => {
    if (domain !== "listening" || selectedListeningMode !== "DIALOGUE") return;
    const plan = dialogueSavePlan({
      questions: saved,
      conversation,
      edited: dialogueEdited,
      hasAttempts: Number(item?._count?.submissions) > 0,
    });
    for (const questionId of plan.update)
      await axiosClient.patch(
        `/admin/skill-content/listening/${quizId}/questions/${questionId}`,
        { type: "MULTIPLE_CHOICE", content: dialogueQuestionContent(conversation) },
      );
    for (const questionId of plan.remove)
      await axiosClient.delete(
        `/admin/skill-content/listening/${quizId}/questions/${questionId}`,
      );
    setDialogueEdited(false);
  };

  /** A question in the published shape. */
  const questionDraftPayload = (
    draft: QuestionDraft,
    listening: {
      transcript: Array<Record<string, string>>;
      accent: string;
    } = { transcript: [], accent: "US" },
  ) => {
    const explanationVi = draft.explanation.trim();
    const explanationEn = draft.explanationEn.trim();
    const content: Record<string, unknown> = {
      text: draft.prompt.trim(),
      prompt: draft.prompt.trim(),
      explanation:
        domain === "listening" && explanationEn
          ? { ...(explanationVi ? { vi: explanationVi } : {}), en: explanationEn }
          : explanationVi || undefined,
    };
    if (domain === "reading") {
      content.passage = form.passage.trim();
      content.questionType = draft.questionType || "MAIN_IDEA";
    }
    if (domain === "listening") {
      if (draft.type === "DICTATION") {
        const sentence = draft.prompt.trim();
        delete content.prompt;
        content.text = DICTATION_INSTRUCTION;
        content.correctAnswer = sentence;
        content.audioText = sentence;
        content.level = form.level;
        content.skill = "LISTENING";
        // An item read from the stitched recording keeps its one turn in step.
        const turns = draft.segments.filter((segment) => segment.speaker.trim());
        if (turns.length === 1)
          content.transcriptSegments = [
            {
              speaker: turns[0].speaker.trim(),
              text: sentence,
              ...(turns[0].translation.trim()
                ? { translation: turns[0].translation.trim() }
                : {}),
            },
          ];
      }
      // A "Hội thoại" question has no sentence of its own: it asks about the conversation.
      if (
        draft.type === "MULTIPLE_CHOICE" &&
        selectedListeningMode !== "DIALOGUE" &&
        draft.audioText.trim()
      ) {
        // An exchange also stores its turns; a sentence saves as before.
        Object.assign(
          content,
          comprehensionSpokenContent(draft.audioText, draft.segments),
        );
        content.level = form.level;
        content.skill = "LISTENING";
        if (draft.imageUrl.trim()) content.imageUrl = draft.imageUrl.trim();
      }
      // Every "Hội thoại" question carries the conversation, even an emptied
      // one, so the copies never differ.
      if (draft.type === "MULTIPLE_CHOICE" && selectedListeningMode === "DIALOGUE") {
        Object.assign(content, dialogueQuestionContent(listening.transcript));
        content.accent = listening.accent;
        content.level = form.level;
        content.skill = "LISTENING";
      }
    }
    if (
      (domain === "reading" ||
        (domain === "listening" && draft.type === "MULTIPLE_CHOICE")) &&
      draft.options.trim()
    ) {
      content.options = draft.options
        .split("\n")
        .map((value) => value.trim())
        .filter(Boolean);
      content.correctIndex = Number(draft.correctIndex);
    }
    return { type: draft.type, content };
  };

  const handleSuggestPassage = async () => {
    const topic = passageAiTopic.trim() || form.title.trim();
    if (!topic) {
      toast.error("Vui lòng nhập chủ đề cho bài đọc");
      return;
    }
    setIsPassageAiLoading(true);
    try {
      const res: any = await axiosClient.post(
        "/admin/reading/ai/suggest-passage",
        {
          topic,
          level: form.level || "A2",
          targetLength: 180,
        },
      );
      const data = res?.data || res;
      setPassageAiSuggestion(data);
      toast.success("Đã nhận gợi ý đoạn đọc từ AI");
    } catch (err: any) {
      toast.error(
        getApiErrorMessage(err, "Không thể lấy gợi ý đoạn đọc từ AI."),
      );
    } finally {
      setIsPassageAiLoading(false);
    }
  };

  const handleSuggestReadingQuestions = async () => {
    if (!form.passage.trim()) {
      toast.error("Vui lòng nhập hoặc có đoạn đọc trước khi tạo câu hỏi");
      return;
    }
    setIsQuestionsAiLoading(true);
    try {
      const res: any = await axiosClient.post(
        "/admin/reading/ai/suggest-questions",
        {
          passage: form.passage.trim(),
          level: form.level || "A2",
          count: Number(readingAiCount),
        },
      );
      const data = res?.data || res;
      if (Array.isArray(data?.candidates)) {
        setReadingAiCandidates(
          data.candidates.map((candidate: any) => ({
            ...candidate,
            questionType: normalizeReadingQuestionType(candidate?.questionType),
          })),
        );
        setAiQuestionsShortfall(aiShortfallNotice(data.candidates.length, Number(readingAiCount)));
        toast.success(`AI đã gợi ý ${data.candidates.length} câu hỏi đọc hiểu`);
      } else {
        toast.error("Không nhận được câu hỏi hợp lệ từ AI");
      }
    } catch (err: any) {
      toast.error(
        getApiErrorMessage(err, "Không thể tạo câu hỏi đọc hiểu lúc này."),
      );
    } finally {
      setIsQuestionsAiLoading(false);
    }
  };

  /** "AI gợi ý lời thoại" beside the conversation, "AI gợi ý câu nghe chép" beside the sentence. */
  const openListeningContentAi = (target: "DIALOGUE" | "DICTATION") => {
    setListeningContentAiMode(target);
    setListeningContentAiSuggestion(null);
    setIsListeningContentAiOpen(true);
  };

  const handleSuggestListeningContent = async () => {
    setIsListeningContentAiLoading(true);
    try {
      const response: any = await axiosClient.post(
        "/admin/listening/ai/suggest-content",
        listeningContentAiMode === "DIALOGUE"
          ? {
              mode: "DIALOGUE",
              level: form.level || "A2",
              topic: form.title.trim() || undefined,
              currentTurns: transcriptForSave(dialogue).map(({ speaker, text, translation }) => ({
                speaker,
                text,
                ...(translation ? { translation } : {}),
              })),
            }
          : {
              mode: "DICTATION",
              level: form.level || "A2",
              topic: form.title.trim() || undefined,
              currentText: question.prompt.trim() || undefined,
              currentTurns: [],
            },
      );
      const data = response?.data || response;
      if (data?.mode === "DIALOGUE" && Array.isArray(data.turns)) {
        setListeningContentAiSuggestion({
          mode: "DIALOGUE",
          turns: data.turns.map((turn: any) => ({
            speaker: String(turn.speaker || ""),
            text: String(turn.text || ""),
            translation: String(turn.translation || ""),
          })),
        });
      } else if (data?.mode === "DICTATION" && typeof data.text === "string") {
        setListeningContentAiSuggestion({ mode: "DICTATION", text: data.text });
      } else {
        toast.error("Không nhận được lời thoại hợp lệ từ AI");
        return;
      }
      toast.success("Đã nhận lời thoại nháp. Hãy kiểm tra trước khi lưu.");
    } catch (error: any) {
      toast.error(
        getApiErrorMessage(error, "Không thể gợi ý nội dung nghe lúc này."),
      );
    } finally {
      setIsListeningContentAiLoading(false);
    }
  };

  /**
   * "Nghe hiểu" has no shared transcript to ask about: the AI drafts new
   * items, each with its own sentence, from the quiz's title and level
   * (QA 2026-11-22: the button asked for a transcript and sent nothing).
   */
  const handleSuggestComprehensionItems = async () => {
    const topic = form.title.trim();
    if (!topic) {
      toast.error("Nhập tiêu đề (chủ đề) của bài trước khi nhờ AI soạn câu.");
      return;
    }
    const count = Number(listeningQuestionsAiCount);
    setIsListeningQuestionsAiLoading(true);
    try {
      const data = unwrap<any>(
        await axiosClient.post("/admin/listening/ai/full-draft", {
          topic,
          level: form.level || "A2",
          mode: "COMPREHENSION",
          count,
        }),
      );
      const candidates = (Array.isArray(data?.questions) ? data.questions : []).map(
        (question: any) => comprehensionCandidate(question ?? {}),
      );
      if (!candidates.length) {
        toast.error("AI không trả về câu nghe hiểu hợp lệ.");
        return;
      }
      setListeningQuestionsAiCandidates(candidates);
      setAiQuestionsShortfall(aiShortfallNotice(candidates.length, count));
      toast.success(`AI đã soạn ${candidates.length} câu nghe hiểu nháp.`);
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, "Không thể soạn câu nghe hiểu lúc này."));
    } finally {
      setIsListeningQuestionsAiLoading(false);
    }
  };

  const handleSuggestListeningQuestions = async () => {
    if (selectedListeningMode === "COMPREHENSION") {
      await handleSuggestComprehensionItems();
      return;
    }
    // A dialogue quiz asks about its own conversation, as edited.
    const sourceText = quizListeningContext()
      .transcript.map((turn) => `${turn.speaker}: ${turn.text}`)
      .join("\n");
    if (!sourceText) {
      toast.error("Vui lòng nhập lời thoại trước khi tạo câu hỏi.");
      return;
    }
    setIsListeningQuestionsAiLoading(true);
    try {
      const response: any = await axiosClient.post(
        "/admin/listening/ai/suggest-questions",
        {
          mode: "DIALOGUE",
          sourceText,
          level: form.level || "A2",
          count: Number(listeningQuestionsAiCount),
        },
      );
      const data = response?.data || response;
      if (!Array.isArray(data?.candidates)) {
        toast.error("Không nhận được câu hỏi nghe hợp lệ từ AI");
        return;
      }
      setListeningQuestionsAiCandidates(data.candidates);
      setAiQuestionsShortfall(
        aiShortfallNotice(data.candidates.length, Number(listeningQuestionsAiCount)),
      );
      toast.success(`AI đã gợi ý ${data.candidates.length} câu hỏi nghe nháp.`);
    } catch (error: any) {
      toast.error(
        getApiErrorMessage(error, "Không thể tạo câu hỏi nghe lúc này."),
      );
    } finally {
      setIsListeningQuestionsAiLoading(false);
    }
  };

  const handleSuggestWritingTask = async () => {
    setIsWritingAiLoading(true);
    try {
      const response: any = await axiosClient.post(
        "/admin/writing/ai/suggest-task",
        {
          taskType: question.taskType.trim() || "EMAIL",
          level: question.level.trim() || form.level || "A2",
          topic: form.title.trim() || undefined,
          currentPrompt: question.prompt.trim() || undefined,
          wordMin: question.wordMin ? Number(question.wordMin) : undefined,
          wordMax: question.wordMax ? Number(question.wordMax) : undefined,
          sourceText: documentText || undefined,
        },
      );
      const data = response?.data || response;
      if (!data?.prompt || !data?.taskType) {
        toast.error("Không nhận được đề bài viết hợp lệ từ AI");
        return;
      }
      setWritingAiSuggestion(data);
      toast.success("Đã nhận đề bài viết nháp. Hãy kiểm tra trước khi lưu.");
    } catch (error: any) {
      toast.error(
        getApiErrorMessage(error, "Không thể gợi ý đề bài viết lúc này."),
      );
    } finally {
      setIsWritingAiLoading(false);
    }
  };

  const handleSuggestDictationLines = async () => {
    const topic = dictationTopic.trim() || form.title.trim();
    if (!topic && !documentText) {
      toast.error("Nhập chủ đề hoặc chọn tài liệu trước.");
      return;
    }
    setIsDictationAiLoading(true);
    try {
      const response: any = await axiosClient.post(
        "/admin/listening/ai/dictation-lines",
        {
          topic: topic || "Theo tài liệu",
          level: form.level || "A2",
          count: 20,
          sourceText: documentText || undefined,
        },
      );
      const data = response?.data || response;
      if (!data?.sentences?.length) {
        toast.error("AI không trả về câu hợp lệ.");
        return;
      }
      setBulkLines(data.sentences.join("\n"));
      toast.success("Đã có các câu nháp. Xem lại rồi bấm Thêm.");
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, "Không thể soạn câu lúc này."));
    } finally {
      setIsDictationAiLoading(false);
    }
  };

  const handleSuggestFullDraft = async () => {
    if (domain !== "listening" && domain !== "reading") return;
    // The title without its level head: the topic the AI writes about.
    const topic = form.title.trim();
    if (!topic) {
      toast.error(
        "Vui lòng nhập tiêu đề hoặc chủ đề trước khi soạn bản nháp.",
      );
      return;
    }
    const count = clampDraftCount(
      fullDraftCount,
      fullDraftCountRange(domain === "listening" ? selectedListeningMode : undefined),
    );
    if (fullDraftBusy) return;
    setFullDraftBusy(true);
    try {
      const response: any = await axiosClient.post(
        `/admin/${domain}/ai/full-draft`,
        domain === "reading"
          ? {
              topic,
              level: form.level || "A2",
              targetLength: 180,
              count,
              sourceText: documentText || undefined,
            }
          : {
              topic,
              level: form.level || "A2",
              // The form chosen in "Dạng bài", which the quiz is saved as
              // (inferring it from the question being edited once produced
              // dictation silently).
              mode: selectedListeningMode,
              // "Nghe chép": sentences, 20 to 30.
              count,
              sourceText: documentText || undefined,
            },
      );
      const data = response?.data || response;
      const comprehension =
        domain === "listening" && data?.mode === "COMPREHENSION";
      // "Nghe chép" comes back as sentences, one dictation item each (QA 2026-11-22).
      const dictation = domain === "listening" && data?.mode === "DICTATION";
      const sentences: string[] = dictation && Array.isArray(data?.sentences)
        ? data.sentences.map((line: unknown) => String(line ?? "").trim()).filter(Boolean)
        : [];
      const questions = Array.isArray(data?.questions)
        ? data.questions.map((candidate: any) => ({
            ...emptyQuestion(domain),
            ...fullDraftQuestionFields(candidate ?? {}),
          }))
        : [];
      if (dictation) {
        if (!data?.title || !sentences.length)
          throw new Error("AI không trả về câu nghe chép hợp lệ.");
        setFullDraft({
          domain,
          // The admin's own title stays (owner 2026-11-24): the AI wrote
          // English titles over Vietnamese ones.
          title: topic || String(data.title),
          description: String(data.description || ""),
          level: String(data.level || form.level || "A2"),
          passage: "",
          listeningMode: "DICTATION",
          questions: [],
          sentences: sentences.map((text) => ({ text })),
          shortfall: aiShortfallNotice(sentences.length, count),
        });
        toast.success("Đã tạo bản nháp. Hãy xem lại trước khi áp dụng.");
        return;
      }
      if (!data?.title || !data?.description || !questions.length) {
        throw new Error("AI không trả về bản nháp hợp lệ.");
      }
      // "Nghe hiểu" has no shared source: each question keeps its own sentence.
      // A dialogue's turns go onto every question when the quiz is saved.
      const sourceQuestion =
        domain === "listening" && !comprehension
          ? {
              ...emptyQuestion(domain),
              type: "DIALOGUE",
              prompt: "",
              segments: (data.turns || []).map((turn: any) => ({
                speaker: String(turn.speaker || ""),
                text: String(turn.text || ""),
                translation: String(turn.translation || ""),
              })),
            }
          : undefined;
      setFullDraft({
        domain,
        // The admin's own title stays (owner 2026-11-24).
        title: topic || String(data.title),
        description: String(data.description),
        level: String(data.level || form.level || "A2"),
        passage:
          domain === "reading"
            ? String(data.passage || "")
            : comprehension
              ? ""
              : (data.turns || [])
                  .map((turn: any) => `${turn.speaker || "A"}: ${turn.text || ""}`)
                  .join("\n"),
        listeningMode:
          domain !== "listening"
            ? undefined
            : comprehension
              ? "COMPREHENSION"
              : "DIALOGUE",
        sourceQuestion,
        questions,
        shortfall: aiShortfallNotice(questions.length, count),
      });
      toast.success("Đã tạo bản nháp. Hãy xem lại trước khi áp dụng.");
    } catch (error: any) {
      toast.error(
        error instanceof Error && !("response" in error)
          ? error.message
          : getApiErrorMessage(error, "Không thể soạn bản nháp lúc này."),
      );
    } finally {
      setFullDraftBusy(false);
    }
  };

  const title = useMemo(
    () =>
      mode === "list"
        ? `Nội dung ${meta[domain].label}`
        : id
          ? `Chỉnh sửa nội dung ${meta[domain].label}`
          : `Tạo nội dung ${meta[domain].label}`,
    [domain, id, mode],
  );

  /**
   * The form's "Dạng bài viết" for a loaded exercise: the kind saved with it
   * (the backend's writingKind), or, for an older one, read from its sentences.
   */
  const formTypeOf = (data: any) =>
    writingFormType(data.type || meta[domain].type, data.questions, data.writingKind);

  const loadItem = async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [detail, audio] = await Promise.all([
        axiosClient.get(`/admin/skill-content/${domain}/${id}`),
        domain === "listening"
          ? axiosClient.get(`/admin/skill-content/listening/${id}/audio`)
          : Promise.resolve([]),
      ]);
      const data = unwrap<any>(detail);
      setItem(data);
      setArtifacts(domain === "listening" ? unwrap<any[]>(audio) : []);
      // A reload may follow an edit to the transcript: check it again.
      setTranscriptChecked(false);
      const metadata =
        data.bilingualContent && typeof data.bilingualContent === "object"
          ? data.bilingualContent
          : {};
      setContentMetadata(metadata);
      if (domain === "listening") {
        setSelectedListeningMode(normalizeListeningMode(metadata.mode));
        setQuestion((current) => ({
          ...current,
          type: listeningQuestionType(normalizeListeningMode(metadata.mode)),
        }));
        // A legacy turns question, the questions' copy or the quiz's draft.
        setDialogue(dialogueTurns(dialogueSource(data.questions, metadata).segments));
        setDialogueEdited(false);
      }
      const { head, body } = splitTitleHead(data.title);
      setTitleHead(head);
      setForm({
        title: body,
        description: data.description || "",
        level: data.level || levelFromTitle(data.title) || "A2",
        timeLimit: String(data.timeLimit ?? 15),
        passage: data.passage || data.theoryContent || "",
        type: formTypeOf(data),
      });
      setPendingFullDraftQuestions([]);
      // A new lesson saved from an AI draft arrives with ?audio=1.
      if (domain === "listening" && searchParams.get("audio") === "1") {
        setAutoAudio(true);
        router.replace(`/admin/listening/${data.id}`, { scroll: false });
      }
      // Saved from /new with "Lưu và thêm câu hỏi": open the first question of the right kind.
      if (domain === "writing" && searchParams.get("add") === "1") {
        const formType = formTypeOf(data);
        setQuestion({ ...emptyQuestion(domain), taskType: defaultWritingTaskType(formType) });
        setIsAddingQuestion(true);
        router.replace(`/admin/writing/${data.id}`, { scroll: false });
      }
      // Created from "Tạo bằng AI": the draft panel opens and asks the AI at once.
      if (domain === "writing" && Number(searchParams.get("ai")) > 0) {
        setWritingAi({ count: Number(searchParams.get("ai")), auto: true });
        router.replace(`/admin/writing/${data.id}`, { scroll: false });
      }
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, "Không thể tải nội dung"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads the item the route names
    if (mode !== "list") void loadItem();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadItem is rebuilt each render; reload only when the route changes
  }, [domain, mode, id]);

  /** `addQuestion`: a new Writing exercise is saved, then its first question opens (owner 2026-11-19). */
  const saveContent = async (options: { addQuestion?: boolean } = {}) => {
    if (!form.title.trim()) {
      setTitleError(true);
      document.getElementById("cms-title")?.focus();
      return;
    }
    setBusy(true);
    try {
      // "Hội thoại": the conversation goes into every question. The quiz
      // keeps it only while no question does (the server drops it on publish).
      const listening = quizListeningContext();
      const savedQuestions: any[] = item?.questions || [];
      const carried = [...savedQuestions, ...pendingFullDraftQuestions].some(
        (question) => question.type === "MULTIPLE_CHOICE",
      );
      const payload = {
        ...form,
        // The head the server added stays; the server moves its level if it changed.
        title: joinTitleHead(titleHead, form.title),
        timeLimit: Number(form.timeLimit) || undefined,
        // "Dịch câu" and "Viết câu" are stored as WRITING_PICTURE ("Dịch câu" in its own topic).
        type: domain === "writing" ? writingQuizType(form.type) : undefined,
        // The kind is saved with the exercise, so an empty one reopens as itself.
        writingKind: domain === "writing" ? writingKindOfForm(form.type) : undefined,
        ...(domain === "listening"
          ? {
              bilingualContent: dialogueMetadata(
                {
                  ...contentMetadata,
                  mode: selectedListeningMode,
                  levels: [form.level],
                  accents: contentMetadata.accents ?? ["US"],
                },
                listening.transcript,
                carried,
              ),
            }
          : {}),
      };
      const saved = id
        ? await axiosClient.patch(
            `/admin/skill-content/${domain}/${id}`,
            payload,
          )
        : await axiosClient.post(`/admin/skill-content/${domain}`, payload);
      const savedItem = unwrap<any>(saved);
      // A dialogue's turns go onto every MCQ, as published quizzes store
      // them. Saved one by one so the questions keep the draft's order.
      for (const draft of pendingFullDraftQuestions) {
        await axiosClient.post(
          domain === "listening"
            ? `/admin/skill-content/listening/${savedItem.id}/questions`
            : `/admin/skill-content/${domain}/${savedItem.id}/questions`,
          questionDraftPayload(draft, listening),
        );
      }
      await syncDialogueQuestions(savedItem.id, savedQuestions, listening.transcript);
      toast.success("Đã lưu bản nháp");
      // An AI lesson goes on to make its audio (owner 2026-11-24).
      const makeAudio = domain === "listening" && pendingFullDraftQuestions.length > 0;
      setPendingFullDraftQuestions([]);
      router.push(
        `/admin/${domain}/${savedItem.id}${options.addQuestion ? "?add=1" : makeAudio && !id ? "?audio=1" : ""}`,
      );
      // Saved in place: the route does not change, so reload the stored item.
      if (id) {
        await loadItem();
        if (makeAudio) setAutoAudio(true);
      }
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, "Lưu thất bại"));
    } finally {
      setBusy(false);
    }
  };

  const saveQuestion = async (withAudio = false) => {
    if (!id) return;
    // A "Hội thoại" turns question needs its turns, not a prompt.
    const problem = questionSaveProblem(domain, question);
    if (problem) {
      toast.error(problem);
      return;
    }
    setBusy(true);
    try {
      if (domain === "writing") {
        const taskType = question.taskType.trim().toUpperCase();
        const pictureTask = form.type === "WRITING_PICTURE";
        const translationTask = taskType === "SENTENCE_TRANSLATION";
        const essayTask = [
          "PROPOSAL",
          "OPINION",
          "ESSAY",
          "OPINION_ESSAY",
          "ANALYTICAL_RESPONSE",
          "ARGUMENT",
        ].includes(taskType);
        const payload = {
          type: "WRITING",
          prompt: question.prompt.trim(),
          taskType: question.taskType.trim() || undefined,
          level: question.level.trim() || undefined,
          imageUrl: pictureTask
            ? question.imageUrl.trim() || undefined
            : undefined,
          keywords: pictureTask
            ? question.keywords
                .split("\n")
                .map((value) => value.trim())
                .filter(Boolean)
            : undefined,
          wordRange:
            !translationTask &&
            (!pictureTask || taskType === "SENTENCE") &&
            question.wordMin &&
            question.wordMax
              ? [Number(question.wordMin), Number(question.wordMax)]
              : essayTask && question.wordMin && question.wordMax
                ? [Number(question.wordMin), Number(question.wordMax)]
                : undefined,
          sampleSentences: pictureTask
            ? question.sampleSentences
                .split("\n")
                .map((value) => value.trim())
                .filter(Boolean)
            : undefined,
          explanation: question.explanation.trim() || undefined,
          ...(translationTask
            ? {
                acceptedAnswers: question.acceptedAnswers
                  .split("\n")
                  .map((value) => value.trim())
                  .filter(Boolean),
                hints: parseHintLines(question.hints),
                grammarTip: question.grammarTip.trim(),
              }
            : {}),
        };
        if (question.id) {
          await axiosClient.patch(
            `/admin/skill-content/writing/${id}/questions/${question.id}`,
            payload,
          );
        } else {
          await axiosClient.post(
            `/admin/skill-content/writing/${id}/questions`,
            payload,
          );
        }
      } else {
        if (
          domain === "reading" ||
          (domain === "listening" && question.type === "MULTIPLE_CHOICE")
        ) {
          const filled = question.options.split("\n").map((v) => v.trim());
          while (filled.length && !filled[filled.length - 1]) filled.pop();
          if (filled.length < 4 || filled.some((v) => !v)) {
            toast.error("Điền đủ 4 phương án A, B, C, D");
            return;
          }
          if (
            question.correctIndex === "" ||
            Number(question.correctIndex) >= filled.length
          ) {
            toast.error("Chọn đáp án đúng");
            return;
          }
        }
        const listening = quizListeningContext();
        const payload = questionDraftPayload(question, listening);
        const saved = question.id
          ? await axiosClient.patch(
              domain === "listening"
                ? `/admin/skill-content/listening/${id}/questions/${question.id}`
                : `/admin/skill-content/${domain}/${id}/questions/${question.id}`,
              payload,
            )
          : await axiosClient.post(
              domain === "listening"
                ? `/admin/skill-content/listening/${id}/questions`
                : `/admin/skill-content/${domain}/${id}/questions`,
              payload,
            );
        // The other questions get the same conversation, so the recording reads it once.
        await syncDialogueQuestions(
          id,
          (item?.questions || []).filter((current: any) => current.id !== question.id),
          listening.transcript,
        );
        if (withAudio) {
          const savedId = question.id ?? unwrap<{ id: number }>(saved)?.id;
          if (savedId) await generateQuestionAudio(savedId);
        }
      }
      toast.success("Đã lưu câu hỏi");
      if (isListening && !withAudio && item?.publicationStatus === "PUBLISHED") {
        toast(
          "Bài đang xuất bản: nếu đã đổi câu đọc, học viên chưa nghe được cho tới khi tạo lại audio.",
          { icon: "!" },
        );
      }
      setQuestion(emptyQuestion(domain));
      setIsAddingQuestion(false);
      await loadItem();
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, "Lưu câu hỏi thất bại"));
    } finally {
      setBusy(false);
    }
  };

  /** The reviewed AI candidates go in as questions, in the hand-written shape. */
  const addAiCandidates = async () => {
    if (!id) return;
    const needsAudioText = selectedListeningMode === "COMPREHENSION";
    const ready = listeningQuestionsAiCandidates.filter((candidate) =>
      aiCandidateReady(candidate, needsAudioText),
    );
    if (!ready.length) return;
    setBusy(true);
    let added = 0;
    try {
      const context = quizListeningContext();
      for (const candidate of ready) {
        await axiosClient.post(
          `/admin/skill-content/listening/${id}/questions`,
          questionDraftPayload(
            { ...emptyQuestion("listening"), ...aiCandidateQuestionFields(candidate) },
            context,
          ),
        );
        added++;
      }
      await syncDialogueQuestions(id, item?.questions || [], context.transcript);
      toast.success(`Đã thêm ${added} câu vào bài.`);
      setListeningQuestionsAiCandidates([]);
      setIsListeningQuestionsAiOpen(false);
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, `Đã thêm ${added} câu; câu tiếp theo chưa lưu được.`));
    } finally {
      setBusy(false);
    }
    await loadItem();
  };

  const removeItem = async () => {
    if (!id) return;
    setBusy(true);
    try {
      await axiosClient.delete(`/admin/skill-content/${domain}/${id}`);
      toast.success("Đã xóa bài");
      setPendingDeleteItem(false);
      router.push(`/admin/${domain}`);
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, "Không thể xóa bài"));
      setPendingDeleteItem(false);
    } finally {
      setBusy(false);
    }
  };

  const removeQuestion = async (questionId: number) => {
    if (!id) return;
    setBusy(true);
    try {
      await axiosClient.delete(
        `/admin/skill-content/${domain}/${id}/questions/${questionId}`,
      );
      toast.success("Đã xóa câu hỏi");
      setPendingDeleteId(null);
      await loadItem();
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, "Không thể xóa"));
    } finally {
      setBusy(false);
    }
  };

  /**
   * "Kiểm tra & xuất bản": the server's check runs first and its result is
   * shown; publishing is offered only when it passes (QA 2026-11-22: the
   * button asked "Xuất bản nội dung?" before checking anything).
   */
  const runPublishCheck = async () => {
    if (!id) return;
    setBusy(true);
    try {
      const check = unwrap<any>(
        await axiosClient.get(`/admin/skill-content/${domain}/${id}/validate`),
      );
      setPublishCheck({
        valid: check?.valid === true,
        errors: Array.isArray(check?.errors) ? check.errors.map(String) : [],
      });
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, "Không kiểm tra được bài lúc này."));
    } finally {
      setBusy(false);
    }
  };

  /** The publish endpoint runs the same check again before it publishes. */
  const publish = async (status: "DRAFT" | "PUBLISHED") => {
    if (!id) return;
    setBusy(true);
    try {
      await axiosClient.post(`/admin/skill-content/${domain}/${id}/publish`, {
        status,
      });
      toast.success(
        status === "PUBLISHED" ? "Đã xuất bản" : "Đã chuyển về bản nháp",
      );
      await loadItem();
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, "Không thể xuất bản"));
    } finally {
      setBusy(false);
    }
  };

  const refreshArtifacts = async () => {
    if (!id || domain !== "listening") return;
    setArtifacts(
      unwrap<any[]>(
        await axiosClient.get(`/admin/skill-content/listening/${id}/audio`),
      ),
    );
  };

  const previewArtifact = async (artifactId: number) => {
    if (!id) return;
    setBusy(true);
    try {
      const response = await axiosClient.get(
        `/admin/skill-content/listening/${id}/audio/${artifactId}/preview`,
        { responseType: "blob" },
      );
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(response as unknown as Blob));
    } catch (error: any) {
      toast.error(
        getApiErrorMessage(error, "Không thể tải audio nghe thử"),
      );
    } finally {
      setBusy(false);
    }
  };

  /** After listening to the preview: approve and publish in one step. */
  const applyArtifact = async (artifactId: number) => {
    if (!id) return;
    setBusy(true);
    try {
      const base = `/admin/skill-content/listening/${id}/audio/${artifactId}`;
      await axiosClient.post(`${base}/approve`);
      await axiosClient.post(`${base}/publish`);
      toast.success("Học viên đã nghe được audio mới.");
      await refreshArtifacts();
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, "Không thể áp dụng audio"));
    } finally {
      setBusy(false);
    }
  };

  const audioAction = async (
    action: "validate" | "generate-preview" | "approve" | "publish",
    artifactId?: number,
  ) => {
    if (!id) return;
    setBusy(true);
    try {
      const path = artifactId
        ? `/admin/skill-content/listening/${id}/audio/${artifactId}/${action}`
        : `/admin/skill-content/listening/${id}/audio/${action}`;
      const response = await (action === "validate" ||
      action === "generate-preview"
        ? axiosClient.post(path)
        : axiosClient.post(path));
      const result = unwrap<any>(response);
      if (action === "validate") setTranscriptChecked(result?.valid === true);
      const done: Record<typeof action, string> = {
        validate: result?.valid ? "Lời thoại hợp lệ" : "Lời thoại chưa hợp lệ",
        "generate-preview": "Đã tạo audio nghe thử",
        approve: "Đã duyệt audio",
        publish: "Đã xuất bản audio cho học viên",
      };
      if (action === "validate" && !result?.valid) toast.error(done.validate);
      else toast.success(done[action]);
      await refreshArtifacts();
    } catch (error: any) {
      toast.error(
        getApiErrorMessage(error, "Không thể thực hiện thao tác audio"),
      );
    } finally {
      setBusy(false);
    }
  };

  const uploadQuestionAudio = async (questionId: number, file?: File) => {
    if (!id || !file) return;
    const body = new FormData();
    body.append("file", file);
    setBusy(true);
    try {
      await axiosClient.post(
        `/admin/skill-content/listening/${id}/questions/${questionId}/audio-assets`,
        body,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      toast.success("Đã tải audio câu hỏi lên R2");
      await loadItem();
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, "Không thể tải audio lên"));
    } finally {
      setBusy(false);
    }
  };

  /** Azure reads the question's own sentence; the new clip becomes active. */
  const generateQuestionAudio = async (questionId: number, quiet = false) => {
    if (!id) return false;
    try {
      await axiosClient.post(
        `/admin/skill-content/listening/${id}/questions/${questionId}/audio-assets/generate`,
      );
      if (!quiet) toast.success("Đã tạo audio cho câu này");
      return true;
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, "Không thể tạo audio câu này"));
      return false;
    }
  };

  const playQuestionAudio = async (questionId: number) => {
    if (!id) return;
    try {
      const response = await axiosClient.get(
        `/quizzes/${id}/questions/${questionId}/audio`,
        { responseType: "blob" },
      );
      if (questionPreview) URL.revokeObjectURL(questionPreview.url);
      setQuestionPreview({
        questionId,
        url: URL.createObjectURL(response as unknown as Blob),
      });
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, "Không thể phát audio câu này"));
    }
  };

  /** One request at a time, so a failure stops cleanly and shows where. */
  const generateMissingAudio = async (questionIds: number[]) => {
    setBusy(true);
    let made = 0;
    for (const [index, questionId] of questionIds.entries()) {
      setAudioBatch({ done: index, total: questionIds.length });
      if (!(await generateQuestionAudio(questionId, true))) break;
      made++;
    }
    setAudioBatch(null);
    setBusy(false);
    if (made) toast.success(`Đã tạo audio cho ${made} câu`);
    await loadItem();
  };

  /** "Hội thoại": check the conversation, then make the audio to listen to before approving. */
  const makeDialogueAudio = async () => {
    if (!id) return;
    setBusy(true);
    try {
      const base = `/admin/skill-content/listening/${id}/audio`;
      const check = unwrap<any>(await axiosClient.post(`${base}/validate`));
      setTranscriptChecked(check?.valid === true);
      if (!check?.valid) {
        toast.error("Lời thoại chưa hợp lệ nên chưa tạo được audio. Hãy sửa rồi tạo lại.");
        return;
      }
      await axiosClient.post(`${base}/generate-preview`);
      toast.success("Đã tạo audio nghe thử cho hội thoại");
      await refreshArtifacts();
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, "Không thể tạo audio"));
    } finally {
      setBusy(false);
    }
  };

  // The saved AI lesson makes its audio once it has loaded: one clip per
  // question for "Nghe hiểu" and "Nghe chép", the conversation for "Hội thoại".
  useEffect(() => {
    if (!autoAudio || loading || busy || !id || domain !== "listening") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- runs once per save, then clears
    setAutoAudio(false);
    if (selectedListeningMode === "DIALOGUE") {
      void makeDialogueAudio();
      return;
    }
    const missing = ((item?.questions ?? []) as any[])
      .filter((q) => !(q.audioAssets ?? []).some((asset: any) => asset.isActive))
      .map((q) => q.id as number);
    if (missing.length) void generateMissingAudio(missing);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the helpers are rebuilt each render; run when the saved lesson is ready
  }, [autoAudio, loading, busy, id, domain, item, selectedListeningMode]);

  /** Dictation: one sentence per line becomes one item, in order. */
  const addDictationLines = async () => {
    if (!id) return;
    const lines = bulkLines
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) return;
    setBusy(true);
    try {
      for (const line of lines) {
        await axiosClient.post(
          `/admin/skill-content/listening/${id}/questions`,
          {
            type: "DICTATION",
            content: {
              text: DICTATION_INSTRUCTION,
              correctAnswer: line,
              audioText: line,
              level: form.level,
              skill: "LISTENING",
            },
          },
        );
      }
      toast.success(`Đã thêm ${lines.length} câu nghe chép`);
      setBulkLines("");
      setIsBulkOpen(false);
      await loadItem();
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, "Không thể thêm các câu"));
      await loadItem();
    } finally {
      setBusy(false);
    }
  };

  // The list keeps its header and toolbar while the first page loads: its
  // spinner sits where the cards go.
  if (mode === "edit" && loading)
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2 className="animate-spin text-slate-600" />
      </div>
    );

  if (mode === "list") {
    const visibleItems = list.items;
    const totalItems = list.facets?.total ?? 0;
    const filtersActive =
      searchTerm.trim() !== "" ||
      statusFilter !== "ALL" ||
      listeningModeFilter !== "ALL" ||
      writingTypeFilter !== "ALL" ||
      trackFilter !== "ALL" ||
      listFilters.level !== "ALL" ||
      listFilters.audio !== "ALL";
    const levelsPresent = CMS_LEVELS.filter((level) =>
      (list.facets?.levels ?? []).includes(level),
    );
    const setFilter = <K extends keyof typeof listFilters>(
      key: K,
      value: (typeof listFilters)[K],
    ) => setListFilters((current) => ({ ...current, [key]: value }));

    const publishedCount = list.facets?.published ?? 0;
    // "Dạng bài": Nghe's three forms or Viết's four kinds, with their counts.
    const kindFilter =
      domain === "listening"
        ? {
            value: listeningModeFilter,
            onChange: (value: string) => setListeningModeFilter(value as ListeningModeFilter),
            options: LISTENING_MODE_OPTIONS.map((option) => ({
              value: option.value,
              label: kindOptionLabel(option.label, list.facets?.modes?.[option.value]),
            })),
          }
        : domain === "writing"
          ? {
              value: writingTypeFilter,
              onChange: setWritingTypeFilter,
              options: Object.entries(WRITING_KIND_LABEL).map(([kind, label]) => ({
                value: kind,
                label: kindOptionLabel(label, list.facets?.kinds?.[kind]),
              })),
            }
          : undefined;

    // Full canvas width. Cards fill the canvas in as many 320px-minimum
    // columns as fit (1 on a phone, 2 on a tablet, 3 at 1440, 4 at 1920),
    // with one 16px gutter both ways: n x card + (n - 1) x 16 = canvas.
    return (
      <div className="space-y-6 p-6">
        <AdminPageHeader
          title={title}
          stats={
            list.facets
              ? `${totalItems} bài · ${publishedCount} đã xuất bản · ${totalItems - publishedCount} bản nháp`
              : undefined
          }
          ai={
            domain === "writing"
              ? { label: "Tạo bằng AI", onClick: () => setWritingAiCreating(true) }
              : { label: "Tạo bằng AI", href: `/admin/${domain}/new?ai=1` }
          }
          create={
            domain === "listening"
              ? undefined
              : { label: domain === "reading" ? "Tạo bài đọc" : "Tạo bài viết", href: `/admin/${domain}/new` }
          }
          createSlot={
            domain === "listening" ? (
            <div className="relative">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={isCreateMenuOpen}
                onClick={() => setIsCreateMenuOpen((current) => !current)}
                className={BTN_DARK}
              >
                <Plus size={16} aria-hidden="true" /> Tạo bài nghe <ChevronDown size={15} aria-hidden="true" />
              </button>
              {isCreateMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 z-10 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
                >
                  {LISTENING_MODE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsCreateMenuOpen(false);
                        router.push(
                          `/admin/listening/new?mode=${option.value}`,
                        );
                      }}
                      className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      {option.value === "DIALOGUE"
                        ? "Bài nghe hội thoại"
                        : `Bài ${option.label.toLowerCase()}`}
                    </button>
                  ))}
                </div>
              )}
            </div>
            ) : undefined
          }
        />

        {writingAiCreating && (
          <AiCreateDialog
            title="Tạo bài Viết bằng AI"
            nameLabel="Chủ đề"
            namePlaceholder="Ví dụ: Email xin nghỉ phép"
            countLabel="Số câu"
            maxCount={10}
            defaultCount={5}
            levels={["A1", "A2", "B1", "B2", "C1"].map((level) => ({ value: level, label: level }))}
            kinds={[
              { value: "EMAIL", label: "Viết email" },
              { value: "TRANSLATION", label: "Dịch câu" },
            ]}
            onClose={() => setWritingAiCreating(false)}
            onCreate={async ({ name, level, count, kind }) => {
              try {
                const translation = kind === "TRANSLATION";
                const created = unwrap<any>(
                  await axiosClient.post("/admin/skill-content/writing", {
                    title: name,
                    description: "",
                    level,
                    timeLimit: 15,
                    passage: "",
                    type: writingQuizType(translation ? "TRANSLATION" : "WRITING_EMAIL"),
                    writingKind: translation ? "TRANSLATION" : "EMAIL",
                  }),
                );
                router.push(`/admin/writing/${created.id}?ai=${count}`);
              } catch (error) {
                toast.error(getApiErrorMessage(error, "Không tạo được bài nháp."));
              }
            }}
          />
        )}

        {domain === "writing" && (
          <div role="tablist" aria-label="Trang Viết" className="flex gap-6 border-b border-slate-200">
            {(
              [
                ["practice", "Bài luyện viết"],
                ["review", "Duyệt câu dịch"],
              ] as const
            ).map(([view, label]) => (
              <button
                key={view}
                type="button"
                role="tab"
                aria-selected={writingView === view}
                onClick={() => openWritingView(view)}
                className={`-mb-px border-b-2 pb-2.5 text-sm font-semibold transition-colors ${
                  writingView === view
                    ? "border-slate-950 text-slate-950"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                {label}
                {view === "review" && (reviewSummary?.total ?? 0) > 0 && (
                  <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-bold tabular-nums text-amber-800">
                    {reviewSummary?.total}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {writingView === "review" ? (
          <TranslationReviewPanel quizId={reviewQuizId} onClearQuiz={() => openWritingView("review")} />
        ) : (
        <>
        <AdminListToolbar
          content={domain}
          searchLabel={`Tìm nội dung ${meta[domain].label}`}
          search={searchTerm}
          onSearchChange={setSearchTerm}
          kind={kindFilter}
          status={{ value: statusFilter, onChange: setStatusFilter }}
          level={{
            value: listFilters.level,
            onChange: (value) => setFilter("level", value),
            options: levelsPresent.map((level) => ({ value: level, label: level })),
          }}
          track={{ value: trackFilter, onChange: setTrackFilter, tracks: adminTracks }}
          extra={
            domain === "listening"
              ? {
                  label: "Audio",
                  value: listFilters.audio,
                  onChange: (value) => setFilter("audio", value as ListFilters["audio"]),
                  options: AUDIO_FILTER_OPTIONS,
                }
              : undefined
          }
          sort={{ value: listFilters.sort, onChange: (value) => setFilter("sort", value) }}
          total={list.facets?.total}
          matched={list.total}
          fetching={list.isFetching}
          filtersActive={filtersActive}
          onClearFilters={() => {
            setSearchTerm("");
            setStatusFilter("ALL");
            setListeningModeFilter("ALL");
            setWritingTypeFilter("ALL");
            setTrackFilter("ALL");
            setListFilters((current) => ({
              ...NO_FILTERS,
              sort: current.sort,
            }));
          }}
        />

        {list.isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-slate-500" size={32} />
          </div>
        ) : (
        <>
        <div className={ADMIN_CARD_GRID}>
          {visibleItems.map((content) => {
            const level = contentLevel(content);
            // The same Vietnamese title learners read; the stored one keeps
            // the level tag the API needs.
            const cardTitle = quizDisplayTitle(content.id, content.title ?? "");
            const published = content.publicationStatus === "PUBLISHED";
            const audio = audioBadgeFor(content);
            const pendingReview = domain === "writing" ? (reviewSummary?.byQuiz[String(content.id)] ?? 0) : 0;
            return (
              <div key={content.id} className="flex h-full flex-col">
              <Link
                href={`/admin/${domain}/${content.id}`}
                className={`group flex flex-1 flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                  pendingReview > 0 ? "rounded-b-none" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  {level && (
                    <span className="flex-none rounded-md bg-blue-50 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-blue-800">
                      {level}
                    </span>
                  )}
                  {domain === "writing" && (
                    <span className="truncate text-xs text-slate-600 dark:text-slate-400">
                      {writingCardLabel(content)}
                    </span>
                  )}
                  {domain === "listening" && (
                    <span className="truncate text-xs text-slate-600 dark:text-slate-400">
                      {
                        LISTENING_MODE_OPTIONS.find(
                          (option) =>
                            option.value === getListeningMode(content),
                        )?.label
                      }
                    </span>
                  )}
                  <span
                    className={`ml-auto flex-none whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold ${
                      published
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-800"
                    }`}
                  >
                    {publicationStatusLabel(content.publicationStatus)}
                  </span>
                </div>
                <div className="mt-3 flex items-start gap-3">
                  {content.thumbnailUrl && (
                    <AdminImageThumb
                      src={content.thumbnailUrl}
                      alt={cardTitle}
                      className="h-16 w-20"
                    />
                  )}
                  <div className="min-w-0">
                    <h2 className="line-clamp-2 font-semibold text-slate-950">
                      {cardTitle}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                      {content.description || "Chưa có mô tả"}
                    </p>
                  </div>
                </div>
                <p className="mt-2 truncate text-sm text-slate-600 dark:text-slate-400">
                  {trackNames(content.tracks, adminTracks)}
                </p>
                <div className="mt-auto pt-4">
                  <div className="flex items-center gap-3 border-t border-slate-100 pt-3 text-sm text-slate-600">
                    <span className="flex-none tabular-nums">
                      {content._count?.questions ??
                        content.questions?.length ??
                        0}{" "}
                      câu hỏi
                    </span>
                    {domain === "listening" && (
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        <span
                          aria-hidden="true"
                          className={`size-1.5 flex-none rounded-full ${AUDIO_DOT[audio.tone]}`}
                        />
                        <span className="truncate">{audio.label}</span>
                      </span>
                    )}
                    <span className="ml-auto inline-flex flex-none items-center gap-1 font-semibold text-slate-900 group-hover:text-blue-700">
                      Mở <ArrowRight size={14} aria-hidden="true" />
                    </span>
                  </div>
                </div>
              </Link>
              {pendingReview > 0 && (
                <Link
                  href={`/admin/writing?tab=review&quiz=${content.id}`}
                  className="rounded-b-xl border border-t-0 border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100"
                >
                  {pendingReview} câu dịch chờ duyệt
                </Link>
              )}
              </div>
            );
          })}
          {totalItems === 0 && (
            <p className="col-span-full text-sm text-slate-600">
              Chưa có nội dung {meta[domain].label}. Hãy tạo bản nháp đầu tiên
              để bắt đầu.
            </p>
          )}
          {totalItems > 0 && visibleItems.length === 0 && (
            <p className="col-span-full text-sm text-slate-600">
              Không tìm thấy nội dung phù hợp. Hãy đổi từ khóa hoặc bộ lọc.
            </p>
          )}
        </div>
        <Pagination
          currentPage={list.page}
          totalPages={list.totalPages}
          totalItems={list.total}
          pageSize={list.pageSize}
          onPageChange={list.setPage}
          onPageSizeChange={list.setPageSize}
          pageSizeOptions={ADMIN_PAGE_SIZES}
          alwaysShow
        />
        </>
        )}
        </>
        )}
      </div>
    );
  }

  const questions = item?.questions || [];
  const isWriting = domain === "writing";
  const isListening = domain === "listening";
  const writingTaskType = question.taskType.trim().toUpperCase();
  const isTranslationWriting = isWriting && writingTaskType === "SENTENCE_TRANSLATION";
  const isPictureWriting = isWriting && form.type === "WRITING_PICTURE";
  const needsPicture =
    isPictureWriting && writingUsesPictures(form.type, questions);
  const isEssayWriting =
    isWriting &&
    [
      "PROPOSAL",
      "OPINION",
      "ESSAY",
      "OPINION_ESSAY",
      "ANALYTICAL_RESPONSE",
      "ARGUMENT",
    ].includes(writingTaskType);


  // The dialogue a listening quiz plays: its questions share one transcript.
  const listeningTranscript = (questions.find(
    (q: any) =>
      Array.isArray(q.content?.transcriptSegments) &&
      q.content.transcriptSegments.length > 0,
  )?.content?.transcriptSegments ?? []) as Array<{
    speaker: string;
    text: string;
    translation?: string;
  }>;
  /** An edit to the conversation; the next save copies it into every question. */
  const editDialogue = (turns: DialogueTurn[]) => {
    setDialogue(turns.length ? turns : [emptyTurn()]);
    setDialogueEdited(true);
  };
  const editTurn = (index: number, turn: DialogueTurn) =>
    editDialogue(dialogue.map((current, i) => (i === index ? turn : current)));
  // Shown once something is typed: an empty new conversation is not an error.
  const dialogueProblem = dialogue.some((turn) => turn.speaker.trim() || turn.text.trim())
    ? dialogueTurnsProblem(dialogue)
    : null;
  // A full draft replaces the whole quiz, so it is offered only while the
  // quiz has no questions; after that its form is fixed.
  const draftLocked =
    (isListening || domain === "reading") && questions.length > 0;
  // An applied AI draft waits for Lưu and is saved in the form chosen then:
  // the form is fixed from the moment it is applied (owner 2026-11-22).
  const pendingDraft = pendingFullDraftQuestions.length > 0;
  const modeLocked =
    isListening &&
    listeningFormLocked(questions.length, pendingFullDraftQuestions.length);
  // A "Hội thoại" quiz asks multiple-choice questions; its turns are the
  // conversation above, not a question of their own.
  const listeningTypeOptions = (
    [
      ["MULTIPLE_CHOICE", "Trắc nghiệm"],
      ["DICTATION", "Nghe chép"],
    ] as Array<[string, string]>
  ).filter(
    ([value]) =>
      (selectedListeningMode !== "DIALOGUE" || value === "MULTIPLE_CHOICE") &&
      (!draftLocked ||
        value === question.type ||
        value === listeningQuestionType(selectedListeningMode)),
  );
  /** The artifact that matches the current transcript, if any. */
  const currentArtifact = artifacts.find((artifact) => !artifact.isStale);
  // Same items as the server's check (GET :domain/:id/validate).
  const checklist = publishChecklist({
    domain,
    title: form.title,
    levelTagged: Boolean(cmsLevelFromTitle(item?.title)),
    questions,
    audioPublished: currentArtifact?.status === "PUBLISHED",
    listeningMode: selectedListeningMode,
    quizType: item?.type,
  });
  const publishView = publishCheck ? publishCheckView(checklist, publishCheck) : null;
  // A hand-made dialogue's transcript holder is not a question: not counted, not numbered.
  const answered = answeredQuestions(domain, questions);
  const questionLabel = (current: any) =>
    isListening && isTranscriptHolder(current)
      ? "Lời thoại"
      : `Câu ${answered.indexOf(current) + 1}`;
  const draftCountRange = fullDraftCountRange(isListening ? selectedListeningMode : undefined);
  const draftCount = clampDraftCount(fullDraftCount, draftCountRange);
  // Comprehension and dictation play one clip per question.
  const perQuestionAudio =
    isListening && selectedListeningMode !== "DIALOGUE";
  const questionsWithoutAudio = questions
    .filter(
      (q: any) =>
        !(q.audioAssets ?? []).some((asset: any) => asset.isActive),
    )
    .map((q: any) => q.id as number);

  // One row per option, A-D at least; blank rows stay so their letters hold.
  const optionRows = question.options.split("\n");
  while (optionRows.length < 4) optionRows.push("");
  /** The question form, shown inside the card being edited or as "Câu hỏi mới". */
  const renderQuestionEditor = () => (
      <>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium">
            Loại câu
            <select
              value={question.type}
              onChange={(event) => {
                const nextType = event.target.value;
                setQuestion({ ...question, type: nextType });
                // "Hội thoại" is picked in "Dạng bài"; its questions are multiple-choice only.
                if (isListening && !modeLocked && selectedListeningMode !== "DIALOGUE") {
                  setSelectedListeningMode(
                    nextType === "DICTATION" ? "DICTATION" : "COMPREHENSION",
                  );
                }
              }}
              className={inputClassName()}
            >
              {isListening ? (
                listeningTypeOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))
              ) : isWriting ? (
                <option value="WRITING">Bài viết</option>
              ) : (
                <option value="MULTIPLE_CHOICE">Trắc nghiệm</option>
              )}
            </select>
          </label>
          {domain === "reading" && (
            <label className="text-sm font-medium">
              Dạng câu hỏi đọc hiểu
              <select
                value={question.questionType || "MAIN_IDEA"}
                onChange={(event) =>
                  setQuestion({
                    ...question,
                    questionType: event.target.value,
                  })
                }
                className={inputClassName()}
              >
                {Object.entries(READING_QUESTION_TYPE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="text-sm font-medium">
            <span className="flex items-center justify-between gap-3">
              <span>
                {isTranslationWriting
                  ? "Câu tiếng Việt (học viên dịch câu này sang tiếng Anh)"
                  : isWriting
                  ? "Đề bài"
                  : isListening && question.type === "DICTATION"
                    ? "Câu cần chép (học viên nghe rồi chép câu này)"
                    : "Nội dung / đề bài"}
              </span>
              {isWriting && !isTranslationWriting && (
                <button
                  type="button"
                  onClick={() => {
                    setWritingAiSuggestion(null);
                    setIsWritingAiOpen(true);
                  }}
                  className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-300"
                >
                  AI gợi ý đề bài
                </button>
              )}
              {isListening && question.type === "DICTATION" && (
                <button
                  type="button"
                  onClick={() => openListeningContentAi("DICTATION")}
                  className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-300"
                >
                  AI gợi ý câu nghe chép
                </button>
              )}
            </span>
            <textarea
              value={question.prompt}
              onChange={(event) =>
                setQuestion({ ...question, prompt: event.target.value })
              }
              className={`${inputClassName()} min-h-24`}
            />
          </div>

          {isWriting && (
            <>
              <label className="text-sm font-medium">
                Dạng đề
                <select
                  value={question.taskType}
                  onChange={(event) =>
                    setQuestion({ ...question, taskType: event.target.value })
                  }
                  className={inputClassName()}
                >
                  {writingTaskOptions(form.type).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium">
                Trình độ của câu
                <select
                  value={question.level}
                  onChange={(event) =>
                    setQuestion({ ...question, level: event.target.value })
                  }
                  className={inputClassName()}
                >
                  <option value="">Theo trình độ của bài</option>
                  {CONTENT_LEVEL_OPTIONS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </label>
              {isPictureWriting && (
                <>
                  {needsPicture && <div className="md:col-span-2">
                    <ImageUploadField
                      label="Hình ảnh miêu tả *"
                      value={question.imageUrl}
                      onChange={(url) =>
                        setQuestion({ ...question, imageUrl: url })
                      }
                      helperText="Tải lên ảnh mô tả cho bài luyện viết (PNG, JPG hoặc WEBP)."
                    />
                    {!question.imageUrl.trim() && <RequiredMediaNotice className="mt-2" />}
                  </div>}
                  <label className="text-sm font-medium">
                    Từ khoá
                    <textarea
                      value={question.keywords}
                      onChange={(event) =>
                        setQuestion({
                          ...question,
                          keywords: event.target.value,
                        })
                      }
                      placeholder="Mỗi từ khoá một dòng"
                      className={`${inputClassName()} min-h-24`}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Câu mẫu
                    <textarea
                      value={question.sampleSentences}
                      onChange={(event) =>
                        setQuestion({
                          ...question,
                          sampleSentences: event.target.value,
                        })
                      }
                      placeholder="Mỗi câu một dòng"
                      className={`${inputClassName()} min-h-24`}
                    />
                  </label>
                </>
              )}
              {isTranslationWriting && (
                <>
                  <label className="text-sm font-medium md:col-span-2">
                    Đáp án tiếng Anh được chấp nhận *
                    <textarea
                      value={question.acceptedAnswers}
                      onChange={(event) =>
                        setQuestion({ ...question, acceptedAnswers: event.target.value })
                      }
                      placeholder={"Mỗi đáp án một dòng, ít nhất 2 câu\nMy mother is a teacher.\nMy mom is a teacher."}
                      className={`${inputClassName()} min-h-24`}
                    />
                    <span className="mt-1 block text-xs font-normal text-slate-600">
                      Không cần ghi các biến thể hoa/thường, dấu câu hay dạng rút gọn (I'm = I am): hệ thống tự coi là một.
                    </span>
                  </label>
                  <label className="text-sm font-medium">
                    Gợi ý từ vựng *
                    <textarea
                      value={question.hints}
                      onChange={(event) =>
                        setQuestion({ ...question, hints: event.target.value })
                      }
                      placeholder={"Mỗi dòng: từ tiếng Việt = từ tiếng Anh\ngiáo viên = teacher"}
                      className={`${inputClassName()} min-h-24`}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Lưu ý ngữ pháp *
                    <textarea
                      value={question.grammarTip}
                      onChange={(event) =>
                        setQuestion({ ...question, grammarTip: event.target.value })
                      }
                      placeholder="Một câu tiếng Việt, ví dụ: Nói nghề nghiệp cần a/an trước tên nghề."
                      className={`${inputClassName()} min-h-24`}
                    />
                  </label>
                </>
              )}
              {!isPictureWriting && !isTranslationWriting && (
                <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  {isEssayWriting
                    ? "Bài luận: đặt số từ tối thiểu và tối đa bên dưới."
                    : "Email, tin nhắn: đặt số từ tối thiểu và tối đa bên dưới."}
                </div>
              )}
              {!isTranslationWriting && (!isPictureWriting || writingTaskType === "SENTENCE") && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-sm font-medium">
                    Từ tối thiểu
                    <input
                      type="number"
                      min="1"
                      value={question.wordMin}
                      onChange={(event) =>
                        setQuestion({
                          ...question,
                          wordMin: event.target.value,
                        })
                      }
                      className={inputClassName()}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Từ tối đa
                    <input
                      type="number"
                      min="1"
                      value={question.wordMax}
                      onChange={(event) =>
                        setQuestion({
                          ...question,
                          wordMax: event.target.value,
                        })
                      }
                      className={inputClassName()}
                    />
                  </label>
                </div>
              )}
            </>
          )}

          {isListening &&
            question.type === "MULTIPLE_CHOICE" &&
            selectedListeningMode === "COMPREHENSION" && (
              <>
                <label className="text-sm font-medium md:col-span-2">
                  Câu nghe (học viên nghe câu này)
                  <textarea
                    value={question.audioText}
                    onChange={(event) =>
                      setQuestion({ ...question, audioText: event.target.value })
                    }
                    placeholder="Ví dụ: The next bus to the city center leaves in fifteen minutes."
                    className={`${inputClassName()} min-h-16`}
                  />
                  <span className="mt-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    {EXCHANGE_HINT}
                  </span>
                  <span className="mt-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Đổi câu nghe thì audio cũ ngừng dùng; tạo lại audio sau khi lưu.
                  </span>
                </label>
                <div className="md:col-span-2">
                  <ImageUploadField
                    label="Ảnh minh hoạ (tuỳ chọn)"
                    value={question.imageUrl}
                    onChange={(imageUrl) => setQuestion({ ...question, imageUrl })}
                    helperText="Dùng cho câu hỏi về tranh."
                  />
                </div>
              </>
            )}
          {(domain === "reading" ||
            (isListening && question.type === "MULTIPLE_CHOICE")) && (
            <>
              <fieldset className="md:col-span-2">
                <legend className="text-sm font-medium">
                  Phương án và đáp án đúng
                </legend>
                <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
                  Điền 4 phương án, bấm nút tròn ở phương án đúng.
                </p>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  {optionRows.map((value, index) => {
                    const letter = String.fromCharCode(65 + index);
                    const correct = question.correctIndex === String(index);
                    return (
                      <div
                        key={index}
                        className={`flex items-center gap-2 rounded-lg border px-3 transition-colors ${
                          correct
                            ? "border-emerald-400 bg-emerald-50/60 ring-1 ring-emerald-200"
                            : "border-slate-300 bg-white focus-within:border-slate-500"
                        }`}
                      >
                        <label className="flex flex-none cursor-pointer items-center gap-2 py-2">
                          <input
                            type="radio"
                            name={`correct-${question.id ?? "new"}`}
                            checked={correct}
                            onChange={() =>
                              setQuestion({
                                ...question,
                                correctIndex: String(index),
                              })
                            }
                            aria-label={`Phương án ${letter} là đáp án đúng`}
                            className="size-4 cursor-pointer accent-emerald-600"
                          />
                          <span className="w-4 text-sm font-semibold text-slate-700">
                            {letter}
                          </span>
                        </label>
                        <input
                          value={value}
                          onChange={(event) => {
                            const rows = [...optionRows];
                            rows[index] = event.target.value;
                            setQuestion({ ...question, options: rows.join("\n") });
                          }}
                          placeholder={`Phương án ${letter}`}
                          aria-label={`Nội dung phương án ${letter}`}
                          className="min-h-10 min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none"
                        />
                        {correct && (
                          <span className="flex-none text-xs font-semibold text-emerald-700">
                            Đúng
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </fieldset>
            </>
          )}
          <label
            className={`text-sm font-medium ${isListening ? "" : "md:col-span-2"}`}
          >
            {isListening ? "Lời giải (tiếng Việt)" : "Ghi chú / giải thích"}
            <textarea
              value={question.explanation}
              onChange={(event) =>
                setQuestion({ ...question, explanation: event.target.value })
              }
              className={`${inputClassName()} min-h-20`}
            />
          </label>
          {isListening && (
            <label className="text-sm font-medium">
              Lời giải (tiếng Anh)
              <textarea
                value={question.explanationEn}
                onChange={(event) =>
                  setQuestion({ ...question, explanationEn: event.target.value })
                }
                className={`${inputClassName()} min-h-20`}
              />
            </label>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void saveQuestion(false)}
            disabled={busy}
            className={`${BTN_PRIMARY} ${id ? "" : "invisible"}`}
          >
            {question.id ? <CheckCircle2 size={16} /> : <Plus size={16} />}{" "}
            {question.id ? "Lưu câu hỏi" : "Thêm câu hỏi"}
          </button>
          {isListening && perQuestionAudio && (
            <button
              type="button"
              onClick={() => void saveQuestion(true)}
              disabled={busy}
              className={`${BTN_AI} ${id ? "" : "invisible"}`}
            >
              <FileAudio size={16} /> Lưu và tạo audio
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setQuestion(emptyQuestion(domain));
              setIsAddingQuestion(false);
            }}
            className={BTN_SECONDARY}
          >
            Hủy
          </button>
        </div>
      </>
  );

  return (
    <div className="space-y-6 p-6">
      <button
        onClick={() => router.push(`/admin/${domain}`)}
        className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400"
      >
        <ArrowLeft size={16} /> Danh sách
      </button>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">
            {item?.title ? quizDisplayTitle(item.id, item.title) : title}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Trạng thái: {publicationStatusLabel(item?.publicationStatus)} ·{" "}
            {checklist.filter((entry) => entry.done).length}/{checklist.length}{" "}
            mục sẵn sàng
          </p>
          {Number(item?._count?.submissions) > 0 && (
            <p className="mt-1 text-sm text-amber-700">
              Bài đã có lượt làm: sửa được nội dung và đáp án, điểm cũ giữ
              nguyên; không thêm, xoá câu hoặc lựa chọn.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => void saveContent()}
            disabled={busy}
            className={BTN_SECONDARY}
          >
            <Save size={16} /> Lưu
          </button>
          {/* A quiz not saved yet has nothing to check or publish. */}
          {id && (
            <button
              onClick={() =>
                item?.publicationStatus === "PUBLISHED"
                  ? setPendingPublicationStatus("DRAFT")
                  : void runPublishCheck()
              }
              disabled={busy}
              className={BTN_SUCCESS}
            >
              <Send size={16} />{" "}
              {item?.publicationStatus === "PUBLISHED"
                ? "Chuyển về bản nháp"
                : "Kiểm tra & xuất bản"}
            </button>
          )}
          {/* Only a draft nobody has worked on can go; the API checks again. */}
          {id &&
            item?.publicationStatus !== "PUBLISHED" &&
            !(Number(item?._count?.submissions) > 0) && (
              <button
                onClick={() => setPendingDeleteItem(true)}
                disabled={busy}
                className={BTN_DANGER}
              >
                <Trash2 size={16} /> Xóa bài
              </button>
            )}
        </div>
      </header>

      {/* Two columns from 1280px: the work on the left; the audio and the
          publish checklist in a 400px rail that stays in view (24px gap). */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px] xl:items-start [&>*]:min-w-0">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-start-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold text-slate-950">Thông tin nội dung</h2>
            {aiStart && (
              <p className="w-full text-sm text-amber-800">
                Nhập tiêu đề (chủ đề) và trình độ bên dưới, rồi bấm “Soạn cả bài bằng AI”.
              </p>
            )}
            {isWriting && id && writingDraftKind(form.type) && (
              <button type="button" onClick={() => setWritingAi({ count: 5, auto: false })} className={BTN_AI}>
                <FileStack size={16} aria-hidden="true" /> Soạn bằng AI
              </button>
            )}
            {(isListening || domain === "reading") && (
              <div className="flex flex-wrap items-center gap-2">
                {isListening &&
                  (modeLocked ? (
                    <span className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600">
                      Dạng bài
                      <span className="font-semibold text-slate-900">
                        {LISTENING_MODE_LABEL[selectedListeningMode]}
                      </span>
                    </span>
                  ) : (
                    <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                      Dạng bài
                      <select
                        aria-label="Dạng bài nghe AI sẽ soạn"
                        value={selectedListeningMode}
                        onChange={(event) => {
                          const next = normalizeListeningMode(
                            event.target.value,
                          );
                          // The quiz is saved, and the AI drafts, in the form chosen here.
                          setSelectedListeningMode(next);
                        }}
                        className="min-h-10 rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-900"
                      >
                        <option value="DIALOGUE">
                          {LISTENING_MODE_LABEL.DIALOGUE}
                        </option>
                        <option value="COMPREHENSION">
                          {LISTENING_MODE_LABEL.COMPREHENSION}
                        </option>
                        <option value="DICTATION">
                          {LISTENING_MODE_LABEL.DICTATION}
                        </option>
                      </select>
                    </label>
                  ))}
                {!draftLocked && (
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                    {/* "Nghe chép" counts sentences, 20 to 30; the others count questions. */}
                    {draftCountRange.label}
                    <select
                      aria-label={`${draftCountRange.label} trong bản nháp ${meta[domain].label}`}
                      value={draftCount}
                      onChange={(event) => setFullDraftCount(Number(event.target.value))}
                      className="min-h-10 rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-400"
                    >
                      {Array.from(
                        { length: draftCountRange.max - draftCountRange.min + 1 },
                        (_, index) => draftCountRange.min + index,
                      ).map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {!draftLocked && <DocumentImportButton onText={setDocumentText} />}
                <button
                  type="button"
                  onClick={() => void handleSuggestFullDraft()}
                  disabled={fullDraftBusy}
                  aria-busy={fullDraftBusy}
                                    title={
                    draftLocked
                      ? "Bài đã có câu hỏi — dùng ‘Thêm câu hỏi bằng AI’"
                      : "Dùng Tiêu đề làm chủ đề và Trình độ bên dưới. Bản nháp hiện ra để xem lại trước khi áp dụng."
                  }
                  className={`${BTN_AI} ${draftLocked ? "invisible" : ""}`}
                >
                  {fullDraftBusy ? (
                    <>
                      <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                      Đang soạn bài…
                    </>
                  ) : (
                    "Soạn cả bài bằng AI"
                  )}
                </button>
              </div>
            )}
          </div>
          {fullDraftBusy && (
            <p role="status" className="mt-2 text-sm text-amber-800 dark:text-amber-300">
              AI đang soạn bài {meta[domain].label.toLowerCase()}, thường mất 10–30 giây. Bản nháp sẽ hiện ra để xem lại.
            </p>
          )}
          {draftLocked && (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Bài đã có câu hỏi — dùng ‘Thêm câu hỏi bằng AI’ ở mục Câu hỏi.
            </p>
          )}
          {isListening && pendingDraft && !draftLocked && (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              {/* A dialogue's turns are in the conversation, not a question of their own. */}
              Đã áp dụng {pendingFullDraftQuestions.length}{" "}
              câu từ bản nháp AI, dạng{" "}
              {LISTENING_MODE_LABEL[selectedListeningMode]}. Bấm Lưu để lưu bài, hoặc{" "}
              <button
                type="button"
                onClick={() => setPendingFullDraftQuestions([])}
                className="cursor-pointer rounded-md font-semibold text-slate-900 underline underline-offset-4 hover:text-slate-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                bỏ bản nháp
              </button>{" "}
              để đổi dạng bài.
            </p>
          )}
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium">
              Tiêu đề
              <input
                id="cms-title"
                // The page opened from "Tạo bằng AI": the AI drafts from this title.
                autoFocus={aiStart}
                value={form.title}
                aria-invalid={titleError || undefined}
                aria-describedby={titleError ? "cms-title-error" : undefined}
                onChange={(event) => {
                  setForm({ ...form, title: event.target.value });
                  if (titleError) setTitleError(false);
                }}
                className={inputClassName()}
              />
              {titleError && (
                <span id="cms-title-error" className="mt-1 block text-xs font-normal text-rose-700">
                  Cần nhập tiêu đề trước khi lưu.
                </span>
              )}
            </label>
            <label className="text-sm font-medium">
              Trình độ
              <select
                value={form.level}
                onChange={(event) =>
                  setForm({ ...form, level: event.target.value })
                }
                className={inputClassName()}
              >
                {CONTENT_LEVEL_OPTIONS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium md:col-span-2">
              Mô tả
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                className={`${inputClassName()} min-h-20`}
              />
            </label>
            {/* Keyed by id: a new item becomes taggable once saved. */}
            <TrackTagField
              key={item?.id ?? "new"}
              variant="inline"
              domain={domain}
              id={item?.id}
              tracks={item?.tracks ?? []}
              listKey={`admin-skill-content-${domain}`}
            />
            {isWriting && (
              <label className="text-sm font-medium">
                Dạng bài viết
                <select
                  value={form.type}
                  onChange={(event) => {
                    const type = event.target.value;
                    setForm({ ...form, type });
                    setQuestion((current) => ({
                      ...current,
                      taskType: defaultWritingTaskType(type),
                    }));
                  }}
                  className={inputClassName()}
                >
                  {WRITING_FORM_KINDS.map((kind) => (
                    <option key={kind.value} value={kind.value}>
                      {kind.label}
                    </option>
                  ))}
                </select>
                {form.type === "WRITING_PICTURE" && (
                  <span className="mt-1 block text-xs font-normal text-slate-600">
                    Mỗi câu có một tranh; tải ảnh khi thêm câu hỏi.
                  </span>
                )}
              </label>
            )}
            {/* "Hội thoại": the one conversation of the quiz. Lưu copies it
                into every question; the recording is made from those copies. */}
            {isListening && selectedListeningMode === "DIALOGUE" && (
              <div className="md:col-span-2 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">Lời thoại</p>
                    <p className="mt-0.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                      Một đoạn hội thoại cho cả bài, mọi câu hỏi dùng chung. Bấm Lưu để lưu vào từng câu hỏi.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openListeningContentAi("DIALOGUE")}
                      className="inline-flex min-h-10 items-center rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-300"
                    >
                      AI gợi ý lời thoại
                    </button>
                    <button
                      type="button"
                      onClick={() => editDialogue([...dialogue, emptyTurn()])}
                      className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold"
                    >
                      <Plus size={14} /> Thêm lượt lời
                    </button>
                  </div>
                </div>
                {dialogue.map((turn, index) => (
                  <div
                    key={index}
                    className="grid gap-3 rounded-lg bg-slate-50 p-3 md:grid-cols-[140px_1fr_1fr_auto]"
                  >
                    <input
                      value={turn.speaker}
                      onChange={(event) => editTurn(index, renameSpeaker(turn, event.target.value))}
                      placeholder="Người nói (A, B)"
                      aria-label={`Người nói lượt ${index + 1}`}
                      className={inputClassName()}
                    />
                    <input
                      value={turn.text}
                      onChange={(event) => editTurn(index, { ...turn, text: event.target.value })}
                      placeholder="Câu tiếng Anh"
                      aria-label={`Câu tiếng Anh lượt ${index + 1}`}
                      className={inputClassName()}
                    />
                    <input
                      value={turn.translation}
                      onChange={(event) => editTurn(index, { ...turn, translation: event.target.value })}
                      placeholder="Bản dịch (tuỳ chọn)"
                      aria-label={`Bản dịch lượt ${index + 1}`}
                      className={inputClassName()}
                    />
                    <button
                      type="button"
                      onClick={() => editDialogue(dialogue.filter((_, i) => i !== index))}
                      className="min-h-10 self-end rounded-lg border border-rose-200 px-3 text-rose-700 dark:text-rose-400"
                      aria-label={`Xóa lượt lời ${index + 1}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {dialogueProblem && (
                  <p className="text-sm font-medium text-amber-800">{dialogueProblem}</p>
                )}
                {questions.some(isTranscriptHolder) && (
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Lời thoại này đang lưu theo cách cũ, tách khỏi câu hỏi. Bấm Lưu để chép vào từng câu hỏi.
                  </p>
                )}
              </div>
            )}
            {/* Reading only: a Listening question keeps its transcript in
                transcriptSegments, and this field is not saved for it. */}
            {domain === "reading" && (
              <div className="md:col-span-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    Đoạn đọc
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setPassageAiTopic(form.title);
                      setPassageAiSuggestion(null);
                      setIsPassageAiOpen(true);
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white hover:bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 transition-colors"
                  >
                    AI gợi ý đoạn đọc
                  </button>
                </div>
                <textarea
                  value={form.passage}
                  onChange={(event) =>
                    setForm({ ...form, passage: event.target.value })
                  }
                  className={`${inputClassName()} min-h-40 leading-relaxed`}
                  placeholder="Nhập hoặc dán nội dung đoạn văn tiếng Anh tại đây..."
                />
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-6 xl:sticky xl:top-6 xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto">
          {isListening && selectedListeningMode !== "COMPREHENSION" && (
            <section
              aria-labelledby="listening-audio-heading"
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2
                    id="listening-audio-heading"
                    className="font-semibold text-slate-950"
                  >
                    Audio bài nghe
                  </h2>
                  <p className="mt-1 max-w-2xl text-sm text-slate-600">
                    {selectedListeningMode === "DICTATION"
                      ? "Bài nghe chép: mỗi câu có audio riêng ở danh sách câu hỏi; audio dưới đây ghép cả bài."
                      : "Một đoạn audio liền mạch cho cả bài, tạo từ lời thoại. Học viên nghe rồi trả lời các câu hỏi bên dưới."}
                  </p>
                  {!id && (
                    <p className="mt-1 text-sm font-medium text-slate-700">Lưu bài trước, sau đó tạo audio.</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void audioAction("validate")}
                  disabled={busy}
                  className={`${BTN_SECONDARY} ${id ? "" : "invisible"}`}
                >
                  <CheckCircle2 size={16} /> Kiểm tra lời thoại
                </button>
              </div>

              <ol className="mt-4 grid gap-2 text-sm sm:grid-cols-4 xl:grid-cols-2">
                {[
                  "Kiểm tra lời thoại",
                  "Tạo audio",
                  "Nghe & duyệt",
                  "Xuất bản cho học viên",
                ].map((label, index) => {
                  // Nothing is done on a new quiz: step 1 waits for "Kiểm tra lời thoại".
                  const step = audioStepsDone(currentArtifact?.status, transcriptChecked);
                  const done = index < step;
                  return (
                    <li
                      key={label}
                      className={`rounded-lg border px-3 py-2 ${
                        done
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : index === step
                            ? "border-blue-300 bg-blue-50 font-semibold text-blue-800"
                            : "border-slate-200 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {index + 1}. {label}
                    </li>
                  );
                })}
              </ol>

              {listeningTranscript.length > 0 &&
              selectedListeningMode === "DIALOGUE" && (
                <details className="mt-4 rounded-lg border border-slate-200" open>
                  <summary className="cursor-pointer px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50">
                    Lời thoại ({listeningTranscript.length} lượt)
                  </summary>
                  <ol className="space-y-2 border-t border-slate-100 px-4 py-3 text-sm xl:max-h-80 xl:overflow-y-auto">
                    {listeningTranscript.map((turn, index) => (
                      <li key={index}>
                        <span className="font-semibold text-slate-900">
                          {turn.speaker}:
                        </span>{" "}
                        <span className="text-slate-800">{turn.text}</span>
                        {turn.translation && (
                          <span className="block text-slate-600 dark:text-slate-400">
                            {turn.translation}
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                </details>
              )}

              <div className="mt-4 rounded-lg border border-slate-200 p-4">
                {currentArtifact ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        Audio v{currentArtifact.version} ·{" "}
                        {ARTIFACT_STATUS_LABEL[currentArtifact.status] ??
                          currentArtifact.status}
                      </p>
                      <p className="mt-0.5 text-sm text-slate-600">
                        {currentArtifact.durationMs
                          ? `${Math.round(currentArtifact.durationMs / 1000)} giây`
                          : "Chưa có thời lượng"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {currentArtifact.r2Key && (
                        <button
                          type="button"
                          onClick={() => void previewArtifact(currentArtifact.id)}
                          disabled={busy}
                          className={BTN_SECONDARY}
                        >
                          <Volume2 size={16} /> Nghe thử
                        </button>
                      )}
                      {currentArtifact.status === "PREVIEW_READY" && (
                        <button
                          type="button"
                          onClick={() =>
                            void applyArtifact(currentArtifact.id)
                          }
                          disabled={busy}
                          className={BTN_PRIMARY}
                        >
                          <CheckCircle2 size={16} /> Áp dụng audio cho học viên
                        </button>
                      )}
                      {currentArtifact.status === "APPROVED" && (
                        <button
                          type="button"
                          onClick={() =>
                            void audioAction("publish", currentArtifact.id)
                          }
                          disabled={busy}
                          className={BTN_SUCCESS}
                        >
                          Xuất bản audio
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-slate-600">
                      {artifacts.length
                        ? "Lời thoại đã đổi sau lần tạo audio gần nhất. Tạo lại audio để học viên nghe đúng nội dung."
                        : questions.length > 0 && questionsWithoutAudio.length === 0
                          ? "Bài đang dùng audio riêng cho từng câu. Chỉ tạo khi muốn thay bằng một bản ghi cho cả bài (Azure TTS)."
                          : "Chưa có audio. Kiểm tra lời thoại rồi tạo audio (Azure TTS)."}
                    </p>
                    <button
                      type="button"
                      onClick={() => void audioAction("generate-preview")}
                      disabled={busy}
                      className={`${BTN_PRIMARY} ${id ? "" : "invisible"}`}
                    >
                      <FileAudio size={16} /> Tạo audio
                    </button>
                  </div>
                )}
                {previewUrl && (
                  <audio
                    controls
                    autoPlay
                    className="mt-3 w-full"
                    src={previewUrl}
                    aria-label="Nghe thử audio bài nghe"
                  >
                    Nghe thử audio
                  </audio>
                )}
              </div>

              {artifacts.length > 1 && (
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer text-slate-600 hover:text-slate-900">
                    Lịch sử audio ({artifacts.length} bản)
                  </summary>
                  <ul className="mt-2 space-y-1 text-slate-600">
                    {artifacts.map((artifact) => (
                      <li key={artifact.id}>
                        v{artifact.version} ·{" "}
                        {ARTIFACT_STATUS_LABEL[artifact.status] ?? artifact.status}
                        {artifact.isStale ? " · cũ" : " · hiện tại"}
                        {artifact.durationMs
                          ? ` · ${Math.round(artifact.durationMs / 1000)} giây`
                          : ""}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </section>
          )}

          <section
            aria-labelledby="publish-checklist-heading"
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2
                id="publish-checklist-heading"
                className="font-semibold text-slate-950"
              >
                Trước khi xuất bản
              </h2>
              <span className="text-sm tabular-nums text-slate-600 dark:text-slate-400">
                {checklist.filter((entry) => entry.done).length}/{checklist.length}
              </span>
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              {checklist.map((entry) => (
                <li key={entry.label} className="flex items-center gap-2">
                  {entry.done ? (
                    <CheckCircle2
                      size={16}
                      className="flex-none text-emerald-600"
                      aria-hidden="true"
                    />
                  ) : (
                    <Circle
                      size={16}
                      className="flex-none text-slate-300"
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={
                      entry.done ? "text-slate-600" : "font-medium text-slate-900"
                    }
                  >
                    {entry.label}
                  </span>
                  <span className="sr-only">
                    {entry.done ? "(đã xong)" : "(chưa xong)"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </aside>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-start-1">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-slate-950">Câu hỏi</h2>
              <p className="mt-1 text-sm text-slate-600">
                {isListening && selectedListeningMode === "DIALOGUE"
                  ? "Câu hỏi về đoạn hội thoại (audio ở cột bên). Bấm Sửa để sửa ngay tại câu."
                  : isListening && selectedListeningMode === "COMPREHENSION"
                    ? "Mỗi câu có câu nghe và audio riêng. Bấm Sửa để sửa ngay tại câu."
                    : isListening
                      ? "Mỗi câu là một câu nghe chép có audio riêng."
                      : "Bấm Sửa để sửa ngay tại câu; câu mới thêm ở cuối danh sách."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Questions are added to a saved bài only. */}
              {domain === "reading" && id && (
                <button
                  type="button"
                  onClick={() => {
                    setReadingAiCandidates([]);
                    setAiQuestionsShortfall(null);
                    setIsQuestionsAiOpen(true);
                  }}
                  title="AI đọc đoạn văn và gợi ý thêm câu hỏi; bạn chọn câu muốn thêm."
                  className={BTN_AI}
                >
                  Thêm câu hỏi bằng AI
                </button>
              )}
              {isListening && selectedListeningMode !== "DICTATION" && id && (
                <button
                  type="button"
                  title={
                    selectedListeningMode === "COMPREHENSION"
                      ? "AI soạn câu nghe mới theo tiêu đề và trình độ của bài; bạn chọn câu muốn thêm."
                      : "AI đọc lời thoại hiện có và gợi ý thêm câu hỏi trắc nghiệm; bạn chọn câu muốn thêm."
                  }
                  onClick={() => {
                    setListeningQuestionsAiCandidates([]);
                    setAiQuestionsShortfall(null);
                    setIsListeningQuestionsAiOpen(true);
                  }}
                  className={BTN_AI}
                >
                  Thêm câu hỏi bằng AI
                </button>
              )}
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {answered.length} câu
              </span>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {answered.length === 0 && (
              <p className="text-sm text-slate-600">
                Chưa có câu hỏi nào. Dùng biểu mẫu bên dưới để thêm câu hỏi đầu
                tiên cho bài {isListening ? "nghe" : isWriting ? "viết" : "đọc"}.
              </p>
            )}
            {/* A legacy turns question's turns are in the conversation above. */}
            {(isListening && selectedListeningMode === "DIALOGUE" ? answered : questions).map((current: any, index: number) => (
              <div
                key={current.id}
                className={`rounded-lg border p-4 transition-colors ${
                  question.id === current.id
                    ? "border-blue-400 ring-2 ring-blue-100"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                {/* Wraps on phones: beside the buttons the prompt was squeezed to 53px at 320px (responsive crawl 2026-11-10). */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  {current.content?.imageUrl && (
                    <AdminImageThumb
                      src={current.content.imageUrl}
                      alt={`Ảnh câu ${index + 1}`}
                      className="h-16 w-20"
                    />
                  )}
                  <div className="min-w-0 flex-[1_1_12rem]">
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                      {/* The transcript holder is "Lời thoại", not a numbered question. */}
                      {isListening && isTranscriptHolder(current)
                        ? questionLabel(current)
                        : `${questionLabel(current)} · ${
                            isWriting
                              ? "Viết"
                              : isListening
                                ? (LISTENING_QUESTION_LABEL[current.type] ?? current.type)
                                : readingQuestionTypeLabel(current.content?.questionType)
                          }`}
                    </p>
                    <p className="mt-1 text-sm text-slate-900">
                      {isListening && isTranscriptHolder(current)
                        ? transcriptForSave(current.content?.transcriptSegments)
                            .map((turn) => `${turn.speaker}: ${turn.text}`)
                            .join(" ") || "Chưa có lượt lời"
                        : questionToDraft(current).prompt || "Chưa có nội dung"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingQuestion(false);
                        setQuestion(questionToDraft(current));
                      }}
                      disabled={question.id === current.id}
                      className={BTN_SECONDARY}
                    >
                      {question.id === current.id ? "Đang sửa" : "Sửa"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDeleteId(current.id)}
                      className={BTN_DANGER}
                      aria-label="Xóa câu hỏi"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {question.id === current.id && renderQuestionEditor()}
                {/* Comprehension and dictation play one clip per question; a
                    dialogue plays the one recording in the side card. */}
                {perQuestionAudio &&
                  (() => {
                    const active = (current.audioAssets ?? []).find(
                      (asset: any) => asset.isActive,
                    );
                    return (
                      <div className="mt-3 border-t border-slate-100 pt-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                            <span
                              aria-hidden="true"
                              className={`size-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-amber-500"}`}
                            />
                            {active
                              ? `Audio v${active.version}`
                              : "Cần tạo audio"}
                          </span>
                          {active && (
                            <button
                              type="button"
                              onClick={() => void playQuestionAudio(current.id)}
                              className={BTN_SECONDARY}
                            >
                              <Volume2 size={16} /> Nghe thử
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busy}
                            onClick={async () => {
                              setBusy(true);
                              await generateQuestionAudio(current.id);
                              setBusy(false);
                              await loadItem();
                            }}
                            title="Azure đọc câu này; bản mới thay bản cũ."
                            className={BTN_SECONDARY}
                          >
                            <FileAudio size={16} />{" "}
                            {active ? "Tạo lại audio" : "Tạo audio"}
                          </button>
                          <label className={`${BTN_SECONDARY} cursor-pointer`}>
                            <Upload size={16} /> Tải audio lên
                            <input
                              type="file"
                              accept="audio/*"
                              className="sr-only"
                              onChange={(event) =>
                                void uploadQuestionAudio(
                                  current.id,
                                  event.target.files?.[0],
                                )
                              }
                            />
                          </label>
                        </div>
                        {questionPreview &&
                          questionPreview.questionId === current.id && (
                          <audio
                            controls
                            autoPlay
                            src={questionPreview.url}
                            className="mt-2 w-full"
                            aria-label={`Audio câu ${index + 1}`}
                          />
                        )}
                      </div>
                    );
                  })()}
              </div>
            ))}
          </div>

          {perQuestionAudio && questions.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <span className="tabular-nums">
                {questions.length - questionsWithoutAudio.length}/
                {questions.length} câu có audio
              </span>
              {audioBatch ? (
                <span className="inline-flex items-center gap-2 tabular-nums">
                  <Loader2 size={14} className="animate-spin" /> Đang tạo{" "}
                  {audioBatch.done + 1}/{audioBatch.total}
                </span>
              ) : (
                questionsWithoutAudio.length > 0 && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void generateMissingAudio(questionsWithoutAudio)}
                    className={BTN_SECONDARY}
                  >
                    <FileAudio size={16} /> Tạo audio cho {questionsWithoutAudio.length} câu còn thiếu
                  </button>
                )
              )}
            </div>
          )}

          {isListening && selectedListeningMode === "DICTATION" && id && (
            <div className="mt-4">
              {isBulkOpen ? (
                <div className="rounded-lg border border-blue-300 bg-blue-50/30 p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <input
                      aria-label="Chủ đề các câu nghe chép"
                      value={dictationTopic}
                      onChange={(event) => setDictationTopic(event.target.value)}
                      placeholder="Chủ đề, ví dụ: đặt lịch hẹn"
                      className="min-h-10 min-w-48 flex-1 rounded-lg border border-slate-300 px-3 text-sm"
                    />
                    <DocumentImportButton onText={setDocumentText} />
                    <button
                      type="button"
                      disabled={isDictationAiLoading}
                      onClick={() => void handleSuggestDictationLines()}
                      className={BTN_AI}
                    >
                      {isDictationAiLoading && (
                        <Loader2 size={14} className="animate-spin" />
                      )}
                      AI soạn 20 câu
                    </button>
                  </div>
                  <label className="block text-sm font-semibold text-slate-900">
                    Thêm nhiều câu nghe chép
                    <span className="mt-0.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
                      Mỗi dòng một câu tiếng Anh; các câu được thêm theo thứ tự.
                    </span>
                    <textarea
                      value={bulkLines}
                      onChange={(event) => setBulkLines(event.target.value)}
                      rows={6}
                      placeholder={"Can you send me the report by Friday?\nThe meeting has been moved to Tuesday."}
                      className={`${inputClassName()} mt-2`}
                    />
                  </label>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void addDictationLines()}
                      className={`${BTN_PRIMARY} ${!bulkLines.trim() ? "invisible" : ""}`}
                    >
                      <Plus size={16} /> Thêm{" "}
                      {bulkLines.split("\n").filter((l) => l.trim()).length} câu
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsBulkOpen(false)}
                      className={BTN_SECONDARY}
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsBulkOpen(true)}
                  className={BTN_SECONDARY}
                >
                  <Plus size={16} /> Thêm nhiều câu
                </button>
              )}
            </div>
          )}

          <div className="mt-4 border-t border-slate-100 pt-4">
            {!question.id && isAddingQuestion ? (
              <div className="rounded-lg border border-blue-300 bg-blue-50/30 p-4">
                <p className="text-sm font-semibold text-slate-900">Câu hỏi mới</p>
                {renderQuestionEditor()}
              </div>
            ) : !id && domain !== "writing" ? (
              <p className="text-sm font-medium text-slate-700">Lưu bài trước, sau đó thêm câu hỏi.</p>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  // A Writing exercise is saved first, then opens its first question.
                  if (!id) {
                    void saveContent({ addQuestion: true });
                    return;
                  }
                  setQuestion({
                    ...emptyQuestion(domain),
                    ...(isListening && selectedListeningMode !== "DICTATION"
                      ? { type: "MULTIPLE_CHOICE" }
                      : {}),
                    ...(domain === "writing"
                      ? { taskType: defaultWritingTaskType(form.type) }
                      : {}),
                  });
                  setIsAddingQuestion(true);
                }}
                className={BTN_SECONDARY}
              >
                <Plus size={16} /> {!id && domain === "writing" ? "Lưu và thêm câu hỏi" : "Thêm câu hỏi"}
              </button>
            )}
          </div>
        </section>
      </div>

      {/* MODAL: LISTENING CONTENT REVIEW */}
      {writingAi && id && writingDraftKind(form.type) && (
        <WritingAiDraftPanel
          quizId={Number(id)}
          // The title without its level head ("Writing B1 — "): the AI's topic.
          topic={form.title.trim()}
          level={form.level}
          kind={writingDraftKind(form.type) as "EMAIL" | "TRANSLATION"}
          initialCount={writingAi.count}
          autoStart={writingAi.auto}
          onUseDescription={(description) => setForm((current) => ({ ...current, description }))}
          onClose={() => setWritingAi(null)}
          onSaved={() => loadItem()}
        />
      )}
      {fullDraft && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cms-full-draft-title"
            className="max-h-[calc(100dvh-2rem)] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
              <div>
                <h3
                  id="cms-full-draft-title"
                  className="text-base font-bold text-slate-900"
                >
                  Xem lại bản nháp bài{" "}
                  {fullDraft.domain === "reading" ? "đọc" : "nghe"}
                </h3>
                <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-400">
                  Xem lại, sửa hoặc bỏ bớt câu đề xuất trước khi áp dụng. Bản nháp
                  chưa được lưu: áp dụng xong, bấm Lưu để lưu bài.
                </p>
              </div>
              <button
                type="button"
                aria-label="Đóng xem lại bản nháp"
                onClick={() => setFullDraft(null)}
                className="rounded-lg p-1 text-slate-600 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:text-slate-400"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4 py-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-700">
                  Tiêu đề
                  <input
                    value={fullDraft.title}
                    onChange={(event) =>
                      setFullDraft((current) =>
                        current
                          ? { ...current, title: event.target.value }
                          : current,
                      )
                    }
                    className={inputClassName()}
                  />
                </label>
                <label className="text-xs font-semibold text-slate-700">
                  Trình độ
                  <select
                    value={fullDraft.level}
                    onChange={(event) =>
                      setFullDraft((current) =>
                        current
                          ? { ...current, level: event.target.value }
                          : current,
                      )
                    }
                    className={inputClassName()}
                  >
                    {CONTENT_LEVEL_OPTIONS.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block text-xs font-semibold text-slate-700">
                Mô tả
                <textarea
                  rows={3}
                  value={fullDraft.description}
                  onChange={(event) =>
                    setFullDraft((current) =>
                      current
                        ? { ...current, description: event.target.value }
                        : current,
                    )
                  }
                  className={`${inputClassName()} min-h-20`}
                />
              </label>
              {fullDraft.shortfall && (
                <p className="text-sm font-medium text-amber-800">{fullDraft.shortfall}</p>
              )}
              {fullDraft.listeningMode === "DICTATION" ? (
                <p className="text-sm leading-5 text-slate-600 dark:text-slate-400">
                  Mỗi câu là một câu nghe chép, có audio riêng tạo sau khi lưu. Bài cần ít nhất{" "}
                  {DICTATION_MIN_SENTENCES} câu để xuất bản.
                </p>
              ) : fullDraft.listeningMode === "COMPREHENSION" ? (
                <p className="text-sm leading-5 text-slate-600 dark:text-slate-400">
                  Mỗi câu hỏi có câu nghe riêng. Sau khi lưu, tạo audio cho từng câu.
                </p>
              ) : (
                <label className="block text-xs font-semibold text-slate-700">
                  {fullDraft.domain === "reading"
                    ? "Đoạn đọc"
                    : "Lời thoại / nội dung nguồn"}
                  <textarea
                    rows={fullDraft.domain === "reading" ? 8 : 6}
                    value={fullDraft.passage}
                    onChange={(event) =>
                      setFullDraft((current) => {
                        if (!current) return current;
                        const sourceQuestion =
                          current.sourceQuestion?.type === "DICTATION"
                            ? {
                                ...current.sourceQuestion,
                                prompt: event.target.value,
                              }
                            : current.sourceQuestion;
                        return {
                          ...current,
                          passage: event.target.value,
                          sourceQuestion,
                        };
                      })
                    }
                    className={`${inputClassName()} min-h-32 ${fullDraft.domain === "reading" ? "leading-relaxed" : "font-mono"}`}
                  />
                </label>
              )}
              {fullDraft.sourceQuestion && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-5 text-amber-900">
                  Lời thoại đi kèm mỗi câu hỏi bên dưới. Audio cho cả bài được tạo sau khi lưu.
                </p>
              )}
              {fullDraft.sentences ? (
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Câu nghe chép ({fullDraft.sentences.filter((sentence) => !sentence.excluded).length})
                  </h4>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Có thể sửa từng câu, hoặc loại câu không dùng.
                  </p>
                  <ol className="mt-3 space-y-2">
                    {fullDraft.sentences.map((sentence, index) => (
                      <li
                        key={index}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                          sentence.excluded ? "border-slate-200 bg-slate-50 opacity-60" : "border-slate-200 bg-white"
                        }`}
                      >
                        <span className="w-7 flex-none text-xs font-semibold tabular-nums text-slate-600">
                          {index + 1}.
                        </span>
                        <input
                          disabled={sentence.excluded}
                          value={sentence.text}
                          aria-label={`Câu nghe chép ${index + 1}`}
                          lang="en"
                          onChange={(event) =>
                            setFullDraft((current) =>
                              current?.sentences
                                ? {
                                    ...current,
                                    sentences: current.sentences.map((item, itemIndex) =>
                                      itemIndex === index ? { ...item, text: event.target.value } : item,
                                    ),
                                  }
                                : current,
                            )
                          }
                          className="min-h-10 min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none disabled:cursor-not-allowed"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setFullDraft((current) =>
                              current?.sentences
                                ? {
                                    ...current,
                                    sentences: current.sentences.map((item, itemIndex) =>
                                      itemIndex === index ? { ...item, excluded: !item.excluded } : item,
                                    ),
                                  }
                                : current,
                            )
                          }
                          className="flex-none text-xs font-semibold text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                        >
                          {sentence.excluded ? "Khôi phục" : "Loại câu này"}
                        </button>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : (
              <>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Câu hỏi đề xuất (
                    {
                      fullDraft.questions.filter(
                        (candidate: any) => !candidate.excluded,
                      ).length
                    }
                    )
                  </h4>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Có thể sửa từng câu, hoặc khôi phục câu đã loại.
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {fullDraft.questions.map((candidate: any, index) => (
                  <div
                    key={`${candidate.prompt}-${index}`}
                    className={`rounded-xl border p-3 ${candidate.excluded ? "border-slate-200 bg-slate-50 opacity-60" : "border-slate-200 bg-white"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold text-slate-600">
                        Câu {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setFullDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  questions: current.questions.map(
                                    (item: any, itemIndex) =>
                                      itemIndex === index
                                        ? { ...item, excluded: !item.excluded }
                                        : item,
                                  ),
                                }
                              : current,
                          )
                        }
                        className="text-xs font-semibold text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:text-slate-400"
                      >
                        {candidate.excluded ? "Khôi phục" : "Loại câu này"}
                      </button>
                    </div>
                    {fullDraft.listeningMode === "COMPREHENSION" && (
                      <label className="mt-3 block text-xs font-semibold text-slate-700">
                        Câu nghe (học viên nghe câu này)
                        <textarea
                          disabled={candidate.excluded}
                          rows={Math.max(2, candidate.audioText.split("\n").length)}
                          value={candidate.audioText}
                          onChange={(event) =>
                            setFullDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    questions: current.questions.map(
                                      (item: any, itemIndex) =>
                                        itemIndex === index
                                          ? {
                                              ...item,
                                              audioText: event.target.value,
                                            }
                                          : item,
                                    ),
                                  }
                                : current,
                            )
                          }
                          className={`${inputClassName()} min-h-16 disabled:cursor-not-allowed`}
                        />
                        <span className="mt-1 block font-medium text-slate-600">
                          {EXCHANGE_HINT}
                        </span>
                      </label>
                    )}
                    <label className="mt-3 block text-xs font-semibold text-slate-700">
                      Đề bài
                      <textarea
                        disabled={candidate.excluded}
                        rows={2}
                        value={candidate.prompt}
                        onChange={(event) =>
                          setFullDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  questions: current.questions.map(
                                    (item: any, itemIndex) =>
                                      itemIndex === index
                                        ? {
                                            ...item,
                                            prompt: event.target.value,
                                          }
                                        : item,
                                  ),
                                }
                              : current,
                          )
                        }
                        className={`${inputClassName()} min-h-16 disabled:cursor-not-allowed`}
                      />
                    </label>
                    <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_120px]">
                      <label className="text-xs font-semibold text-slate-700">
                        4 lựa chọn, mỗi dòng một lựa chọn
                        <textarea
                          disabled={candidate.excluded}
                          rows={4}
                          value={candidate.options}
                          onChange={(event) =>
                            setFullDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    questions: current.questions.map(
                                      (item: any, itemIndex) =>
                                        itemIndex === index
                                          ? {
                                              ...item,
                                              options: event.target.value,
                                            }
                                          : item,
                                    ),
                                  }
                                : current,
                            )
                          }
                          className={`${inputClassName()} font-mono disabled:cursor-not-allowed`}
                        />
                      </label>
                      <label className="text-xs font-semibold text-slate-700">
                        Đáp án đúng (0–3)
                        <input
                          disabled={candidate.excluded}
                          type="number"
                          min={0}
                          max={3}
                          value={candidate.correctIndex}
                          onChange={(event) =>
                            setFullDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    questions: current.questions.map(
                                      (item: any, itemIndex) =>
                                        itemIndex === index
                                          ? {
                                              ...item,
                                              correctIndex: event.target.value,
                                            }
                                          : item,
                                    ),
                                  }
                                : current,
                            )
                          }
                          className={`${inputClassName()} disabled:cursor-not-allowed`}
                        />
                      </label>
                    </div>
                    <label className="mt-3 block text-xs font-semibold text-slate-700">
                      Giải thích
                      {fullDraft.domain === "listening" ? " (tiếng Việt)" : ""}
                      <textarea
                        disabled={candidate.excluded}
                        rows={2}
                        value={candidate.explanation}
                        onChange={(event) =>
                          setFullDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  questions: current.questions.map(
                                    (item: any, itemIndex) =>
                                      itemIndex === index
                                        ? {
                                            ...item,
                                            explanation: event.target.value,
                                          }
                                        : item,
                                  ),
                                }
                              : current,
                          )
                        }
                        className={`${inputClassName()} disabled:cursor-not-allowed`}
                      />
                    </label>
                    {fullDraft.domain === "listening" && (
                      <label className="mt-3 block text-xs font-semibold text-slate-700">
                        Giải thích (tiếng Anh)
                        <textarea
                          disabled={candidate.excluded}
                          rows={2}
                          value={candidate.explanationEn}
                          onChange={(event) =>
                            setFullDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    questions: current.questions.map(
                                      (item: any, itemIndex) =>
                                        itemIndex === index
                                          ? {
                                              ...item,
                                              explanationEn: event.target.value,
                                            }
                                          : item,
                                    ),
                                  }
                                : current,
                            )
                          }
                          className={`${inputClassName()} disabled:cursor-not-allowed`}
                        />
                      </label>
                    )}
                  </div>
                ))}
              </div>
              </>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setFullDraft(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Bỏ qua
              </button>
              <button
                type="button"
                onClick={() => {
                  // "Nghe chép": each kept sentence becomes one dictation item.
                  const activeQuestions = fullDraft.sentences
                    ? fullDraft.sentences
                        .filter((sentence) => !sentence.excluded && sentence.text.trim())
                        .map((sentence) => ({
                          ...emptyQuestion("listening"),
                          type: "DICTATION",
                          prompt: sentence.text.trim(),
                        }))
                    : fullDraft.questions.filter(
                        (candidate: any) =>
                          !candidate.excluded &&
                          fullDraftQuestionReady(candidate, fullDraft.listeningMode),
                      );
                  if (!fullDraft.title.trim() || !activeQuestions.length) {
                    toast.error(
                      "Bản nháp cần tiêu đề và ít nhất một câu hợp lệ.",
                    );
                    return;
                  }
                  setForm((current) => ({
                    ...current,
                    title: fullDraft.title,
                    description: fullDraft.description,
                    level: fullDraft.level,
                    passage: fullDraft.passage,
                  }));
                  // A dialogue's turns fill the conversation, which Lưu copies into each question.
                  if (fullDraft.sourceQuestion) {
                    setDialogue(dialogueTurns(fullDraft.sourceQuestion.segments));
                    setDialogueEdited(true);
                  }
                  setPendingFullDraftQuestions(activeQuestions);
                  setFullDraft(null);
                  toast.success(
                    "Đã áp dụng bản nháp vào biểu mẫu. Chưa có dữ liệu nào được lưu.",
                  );
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
              >
                Áp dụng vào biểu mẫu <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {isListeningContentAiOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="listening-content-ai-title"
        >
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-amber-100 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3
                  id="listening-content-ai-title"
                  className="text-lg font-bold text-slate-950"
                >
                  {listeningContentAiMode === "DIALOGUE" ? "AI gợi ý lời thoại" : "AI gợi ý câu nghe chép"}
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {listeningContentAiMode === "DIALOGUE"
                    ? "Gợi ý chỉ được điền vào lời thoại của bài; bấm Lưu để giữ lại. Audio được tạo sau khi lưu."
                    : "Gợi ý chỉ được điền vào biểu mẫu; bấm lưu câu để giữ lại. Audio được tạo sau khi lưu."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsListeningContentAiOpen(false)}
                className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:text-slate-400"
                aria-label="Đóng gợi ý lời thoại"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-4 flex-1 overflow-y-auto">
              {!listeningContentAiSuggestion ? (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Bấm “AI gợi ý” để AI viết{" "}
                  {listeningContentAiMode === "DIALOGUE" ? "lời thoại" : "một câu nghe chép tiếng Anh"} theo
                  tiêu đề và trình độ của bài.
                </p>
              ) : listeningContentAiSuggestion.mode === "DICTATION" ? (
                <label className="text-sm font-semibold text-slate-700">
                  Câu nghe chép
                  <textarea
                    value={listeningContentAiSuggestion.text || ""}
                    onChange={(event) =>
                      setListeningContentAiSuggestion((current) =>
                        current
                          ? { ...current, text: event.target.value }
                          : current,
                      )
                    }
                    className={`${inputClassName()} min-h-36`}
                  />
                </label>
              ) : (
                <div className="space-y-3">
                  {(listeningContentAiSuggestion.turns || []).map(
                    (turn, index) => (
                      <div
                        key={index}
                        className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[120px_1fr]"
                      >
                        <input
                          value={turn.speaker}
                          onChange={(event) =>
                            setListeningContentAiSuggestion((current) =>
                              current
                                ? {
                                    ...current,
                                    turns: current.turns?.map(
                                      (item, itemIndex) =>
                                        itemIndex === index
                                          ? {
                                              ...item,
                                              speaker: event.target.value,
                                            }
                                          : item,
                                    ),
                                  }
                                : current,
                            )
                          }
                          className={inputClassName()}
                          aria-label={`Người nói lượt ${index + 1}`}
                        />
                        <input
                          value={turn.text}
                          onChange={(event) =>
                            setListeningContentAiSuggestion((current) =>
                              current
                                ? {
                                    ...current,
                                    turns: current.turns?.map(
                                      (item, itemIndex) =>
                                        itemIndex === index
                                          ? {
                                              ...item,
                                              text: event.target.value,
                                            }
                                          : item,
                                    ),
                                  }
                                : current,
                            )
                          }
                          className={inputClassName()}
                          aria-label={`Nội dung lượt ${index + 1}`}
                        />
                        <input
                          value={turn.translation}
                          onChange={(event) =>
                            setListeningContentAiSuggestion((current) =>
                              current
                                ? {
                                    ...current,
                                    turns: current.turns?.map(
                                      (item, itemIndex) =>
                                        itemIndex === index
                                          ? {
                                              ...item,
                                              translation: event.target.value,
                                            }
                                          : item,
                                    ),
                                  }
                                : current,
                            )
                          }
                          className={`${inputClassName()} md:col-start-2`}
                          aria-label={`Bản dịch lượt ${index + 1}`}
                          placeholder="Bản dịch (tuỳ chọn)"
                        />
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => void handleSuggestListeningContent()}
                disabled={isListeningContentAiLoading}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:cursor-wait"
              >
                {isListeningContentAiLoading && (
                  <Loader2 size={14} className="animate-spin" />
                )}{" "}
                {listeningContentAiSuggestion ? "AI gợi ý lại" : "AI gợi ý"}
              </button>
              {listeningContentAiSuggestion && (
                <button
                  type="button"
                  onClick={() => {
                    const suggestion = listeningContentAiSuggestion;
                    // The turns fill the quiz's conversation; a sentence fills the dictation item.
                    if (suggestion.mode === "DICTATION")
                      setQuestion((current) => ({
                        ...current,
                        type: "DICTATION",
                        prompt: suggestion.text || "",
                      }));
                    else editDialogue(dialogueTurns(suggestion.turns));
                    setIsListeningContentAiOpen(false);
                    toast.success(
                      "Đã điền gợi ý vào biểu mẫu. Bạn có thể chỉnh sửa trước khi lưu.",
                    );
                  }}
                  className="min-h-10 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  Áp dụng vào biểu mẫu
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsListeningContentAiOpen(false)}
                className="min-h-10 rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: LISTENING QUESTIONS REVIEW */}
      {isListeningQuestionsAiOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="listening-questions-ai-title"
        >
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3
                  id="listening-questions-ai-title"
                  className="text-lg font-bold text-slate-950"
                >
                  {selectedListeningMode === "COMPREHENSION"
                    ? "AI soạn câu nghe hiểu nháp"
                    : "AI gợi ý câu hỏi nghe nháp"}
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {selectedListeningMode === "COMPREHENSION"
                    ? "Mỗi câu có câu nghe riêng, soạn theo tiêu đề và trình độ của bài. Xem lại trước khi thêm vào bài."
                    : "Câu hỏi được tạo từ lời thoại của bài. Xem lại trước khi thêm vào bài."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsListeningQuestionsAiOpen(false)}
                className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:text-slate-400"
                aria-label="Đóng tạo câu hỏi nghe"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-4 flex items-center gap-3 text-sm">
              <label
                htmlFor="listening-ai-count"
                className="font-semibold text-slate-700"
              >
                Số câu
              </label>
              <select
                id="listening-ai-count"
                value={listeningQuestionsAiCount}
                onChange={(event) =>
                  setListeningQuestionsAiCount(Number(event.target.value))
                }
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={5}>5</option>
              </select>
              <button
                type="button"
                onClick={() => void handleSuggestListeningQuestions()}
                disabled={isListeningQuestionsAiLoading}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-wait"
              >
                {isListeningQuestionsAiLoading && (
                  <Loader2 size={14} className="animate-spin" />
                )}{" "}
                {listeningQuestionsAiCandidates.length
                  ? "AI gợi ý lại"
                  : "AI gợi ý câu hỏi nháp"}
              </button>
            </div>
            {aiQuestionsShortfall && listeningQuestionsAiCandidates.length > 0 && (
              <p className="mt-3 text-sm font-medium text-amber-800">{aiQuestionsShortfall}</p>
            )}
            <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
              {listeningQuestionsAiCandidates.length === 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {selectedListeningMode === "COMPREHENSION"
                    ? "Bấm “AI gợi ý câu hỏi nháp” để AI soạn câu nghe mới theo tiêu đề và trình độ của bài."
                    : "Bấm “AI gợi ý câu hỏi nháp” để AI đặt câu hỏi về lời thoại của bài."}
                </p>
              ) : (
                listeningQuestionsAiCandidates.map((candidate, index) => (
                  <article
                    key={index}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Câu {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setListeningQuestionsAiCandidates((current) =>
                            current.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                          )
                        }
                        className="text-xs font-semibold text-slate-600 transition-colors hover:text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-300 dark:text-slate-400"
                      >
                        Bỏ qua
                      </button>
                    </div>
                    {candidate.audioText !== undefined && (
                      <label className="mt-2 block text-xs font-semibold text-slate-700">
                        Câu nghe (học viên nghe câu này)
                        <textarea
                          rows={Math.max(2, candidate.audioText.split("\n").length)}
                          value={candidate.audioText}
                          lang="en"
                          onChange={(event) =>
                            setListeningQuestionsAiCandidates((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, audioText: event.target.value } : item,
                              ),
                            )
                          }
                          className={`${inputClassName()} min-h-16`}
                        />
                        <span className="mt-1 block font-medium text-slate-600">{EXCHANGE_HINT}</span>
                      </label>
                    )}
                    <input
                      value={candidate.prompt}
                      onChange={(event) =>
                        setListeningQuestionsAiCandidates((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, prompt: event.target.value }
                              : item,
                          ),
                        )
                      }
                      className={`${inputClassName()} mt-2`}
                      aria-label={`Đề bài câu nghe ${index + 1}`}
                    />
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      {candidate.options.map((option, optionIndex) => (
                        <div
                          key={optionIndex}
                          className={`flex items-center gap-2 rounded-lg border bg-white px-2 ${candidate.correctIndex === optionIndex ? "border-emerald-400 ring-1 ring-emerald-200" : "border-slate-200"}`}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setListeningQuestionsAiCandidates((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, correctIndex: optionIndex }
                                    : item,
                                ),
                              )
                            }
                            className={`my-2 h-7 w-7 shrink-0 rounded-md text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-300 ${candidate.correctIndex === optionIndex ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                            aria-label={`Chọn phương án ${optionIndex + 1} là đáp án đúng`}
                          >
                            {String.fromCharCode(65 + optionIndex)}
                          </button>
                          <input
                            value={option}
                            onChange={(event) =>
                              setListeningQuestionsAiCandidates((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? {
                                        ...item,
                                        options: item.options.map(
                                          (value, valueIndex) =>
                                            valueIndex === optionIndex
                                              ? event.target.value
                                              : value,
                                        ),
                                      }
                                    : item,
                                ),
                              )
                            }
                            className="min-w-0 flex-1 bg-transparent py-2 text-sm text-slate-800 outline-none"
                            aria-label={`Phương án ${optionIndex + 1} câu ${index + 1}`}
                          />
                        </div>
                      ))}
                    </div>
                    <textarea
                      value={candidate.explanation}
                      onChange={(event) =>
                        setListeningQuestionsAiCandidates((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, explanation: event.target.value }
                              : item,
                          ),
                        )
                      }
                      className={`${inputClassName()} mt-2 min-h-16`}
                      aria-label={`Giải thích câu nghe ${index + 1}`}
                      placeholder="Giải thích bằng tiếng Việt"
                    />
                    <textarea
                      value={candidate.explanationEn ?? ""}
                      onChange={(event) =>
                        setListeningQuestionsAiCandidates((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, explanationEn: event.target.value }
                              : item,
                          ),
                        )
                      }
                      className={`${inputClassName()} mt-2 min-h-16`}
                      aria-label={`Giải thích tiếng Anh câu nghe ${index + 1}`}
                      placeholder="Giải thích bằng tiếng Anh"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        // The editor opens with the candidate, ready to save.
                        setQuestion({
                          ...emptyQuestion("listening"),
                          ...aiCandidateQuestionFields(candidate),
                        });
                        setIsAddingQuestion(true);
                        setIsListeningQuestionsAiOpen(false);
                        toast.success(
                          "Đã điền câu hỏi vào biểu mẫu. Bạn có thể chỉnh sửa trước khi thêm.",
                        );
                      }}
                      className="mt-3 min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    >
                      Sửa trong biểu mẫu
                    </button>
                  </article>
                ))
              )}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setIsListeningQuestionsAiOpen(false)}
                className="min-h-10 rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                Đóng
              </button>
              {/* Shown only when there is something complete to add. */}
              {(() => {
                const ready = listeningQuestionsAiCandidates.filter((candidate) =>
                  aiCandidateReady(candidate, selectedListeningMode === "COMPREHENSION"),
                ).length;
                return ready > 0 ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void addAiCandidates()}
                    className="min-h-10 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  >
                    Thêm {ready} câu vào bài
                  </button>
                ) : null;
              })()}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: WRITING TASK REVIEW */}
      {isWritingAiOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="writing-ai-title"
        >
          <div className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-2xl border border-amber-100 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3
                  id="writing-ai-title"
                  className="text-lg font-bold text-slate-950"
                >
                  AI gợi ý đề bài
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  AI chỉ soạn phần chữ; ảnh của câu theo tranh vẫn do bạn chọn hoặc
                  tải lên.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsWritingAiOpen(false)}
                className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:text-slate-400"
                aria-label="Đóng gợi ý đề bài"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
              {!writingAiSuggestion ? (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Bấm “AI gợi ý đề bài” để AI soạn đề theo dạng đề đang chọn.
                </p>
              ) : (
                <>
                  <label className="text-sm font-semibold text-slate-700">
                    Dạng đề
                    <select
                      value={writingAiSuggestion.taskType}
                      onChange={(event) =>
                        setWritingAiSuggestion((current) =>
                          current
                            ? { ...current, taskType: event.target.value }
                            : current,
                        )
                      }
                      className={inputClassName()}
                    >
                      {writingTaskOptions(form.type).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-semibold text-slate-700">
                    Đề bài
                    <textarea
                      value={writingAiSuggestion.prompt}
                      onChange={(event) =>
                        setWritingAiSuggestion((current) =>
                          current
                            ? { ...current, prompt: event.target.value }
                            : current,
                        )
                      }
                      className={`${inputClassName()} min-h-32`}
                    />
                  </label>
                  <label className="text-sm font-semibold text-slate-700">
                    Bối cảnh / người nhận
                    <input
                      value={
                        writingAiSuggestion.context ||
                        writingAiSuggestion.recipient ||
                        writingAiSuggestion.scenario ||
                        ""
                      }
                      onChange={(event) =>
                        setWritingAiSuggestion((current) =>
                          current
                            ? { ...current, context: event.target.value }
                            : current,
                        )
                      }
                      className={inputClassName()}
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-sm font-semibold text-slate-700">
                      Từ tối thiểu
                      <input
                        type="number"
                        value={writingAiSuggestion.wordRange?.[0] ?? ""}
                        onChange={(event) =>
                          setWritingAiSuggestion((current) =>
                            current
                              ? {
                                  ...current,
                                  wordRange: [
                                    Number(event.target.value),
                                    current.wordRange?.[1] || 0,
                                  ],
                                }
                              : current,
                          )
                        }
                        className={inputClassName()}
                      />
                    </label>
                    <label className="text-sm font-semibold text-slate-700">
                      Từ tối đa
                      <input
                        type="number"
                        value={writingAiSuggestion.wordRange?.[1] ?? ""}
                        onChange={(event) =>
                          setWritingAiSuggestion((current) =>
                            current
                              ? {
                                  ...current,
                                  wordRange: [
                                    current.wordRange?.[0] || 0,
                                    Number(event.target.value),
                                  ],
                                }
                              : current,
                          )
                        }
                        className={inputClassName()}
                      />
                    </label>
                  </div>
                  <label className="text-sm font-semibold text-slate-700">
                    Từ khoá / câu mẫu
                    <textarea
                      value={[
                        ...(writingAiSuggestion.keywords || []),
                        ...(writingAiSuggestion.sampleSentences || []),
                      ].join("\n")}
                      onChange={(event) =>
                        setWritingAiSuggestion((current) =>
                          current
                            ? {
                                ...current,
                                keywords: event.target.value
                                  .split("\n")
                                  .filter(Boolean),
                              }
                            : current,
                        )
                      }
                      className={`${inputClassName()} min-h-24`}
                      placeholder="Mỗi dòng một từ khoá hoặc câu mẫu"
                    />
                  </label>
                </>
              )}
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
              <DocumentImportButton onText={setDocumentText} />
              <button
                type="button"
                onClick={() => void handleSuggestWritingTask()}
                disabled={isWritingAiLoading}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:cursor-wait"
              >
                {isWritingAiLoading && (
                  <Loader2 size={14} className="animate-spin" />
                )}{" "}
                {writingAiSuggestion ? "AI gợi ý lại" : "AI gợi ý đề bài"}
              </button>
              {writingAiSuggestion && (
                <button
                  type="button"
                  onClick={() => {
                    const suggestion = writingAiSuggestion;
                    setQuestion((current) => ({
                      ...current,
                      taskType: suggestion.taskType,
                      prompt: suggestion.prompt,
                      wordMin: suggestion.wordRange?.[0]
                        ? String(suggestion.wordRange[0])
                        : current.wordMin,
                      wordMax: suggestion.wordRange?.[1]
                        ? String(suggestion.wordRange[1])
                        : current.wordMax,
                      keywords:
                        suggestion.keywords?.join("\n") || current.keywords,
                      sampleSentences:
                        suggestion.sampleSentences?.join("\n") ||
                        current.sampleSentences,
                    }));
                    setIsWritingAiOpen(false);
                    toast.success(
                      "Đã điền đề bài vào biểu mẫu. Bạn có thể chỉnh sửa trước khi lưu.",
                    );
                  }}
                  className="min-h-10 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  Áp dụng vào biểu mẫu
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsWritingAiOpen(false)}
                className="min-h-10 rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AI READING PASSAGE SUGGESTION */}
      {isPassageAiOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div
            className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reading-passage-ai-title"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3
                  id="reading-passage-ai-title"
                  className="font-bold text-slate-900"
                >
                  AI gợi ý đoạn đọc
                </h3>
                <p className="text-sm text-slate-600 mt-0.5 dark:text-slate-400">
                  Tạo đoạn đọc nháp dựa trên chủ đề và trình độ; chỉ áp dụng vào
                  form, chưa lưu hay xuất bản.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPassageAiOpen(false)}
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:text-slate-400"
                aria-label="Đóng gợi ý đoạn đọc"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Chủ đề bài đọc *
                </label>
                <input
                  type="text"
                  value={passageAiTopic}
                  onChange={(e) => setPassageAiTopic(e.target.value)}
                  placeholder="Ví dụ: công nghệ nơi làm việc, làm việc từ xa, bảo vệ môi trường"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 outline-none focus:border-slate-400"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">
                  Trình độ:{" "}
                  <span className="font-semibold text-slate-700">
                    {form.level || "A2"}
                  </span>
                </span>
                <button
                  type="button"
                  disabled={isPassageAiLoading}
                  onClick={handleSuggestPassage}
                  className={`inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800 disabled:cursor-wait transition-colors ${!passageAiTopic.trim() && !form.title.trim() ? "invisible" : ""}`}
                >
                  {isPassageAiLoading ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : null}
                  {passageAiSuggestion ? "AI gợi ý lại" : "AI gợi ý đoạn đọc"}
                </button>
              </div>

              {passageAiSuggestion && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2.5 max-h-60 overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <span className="font-bold text-slate-800">
                      {passageAiSuggestion.title}
                    </span>
                    <span className="text-xs text-slate-600 font-medium dark:text-slate-400">
                      Bản nháp AI
                    </span>
                  </div>
                  <p className="text-slate-700 whitespace-pre-line leading-relaxed">
                    {passageAiSuggestion.passage}
                  </p>
                  <div className="flex justify-end pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({
                          ...prev,
                          passage: passageAiSuggestion.passage,
                          title: prev.title.trim()
                            ? prev.title
                            : passageAiSuggestion.title,
                        }));
                        setIsPassageAiOpen(false);
                        toast.success(
                          "Đã áp dụng đoạn đọc vào biểu mẫu. Bạn có thể chỉnh sửa trước khi lưu.",
                        );
                      }}
                      className="rounded bg-slate-900 px-3 py-1.5 font-semibold text-white hover:bg-slate-800 transition-colors"
                    >
                      Áp dụng vào biểu mẫu
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPassageAiOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AI READING QUESTIONS GENERATION & REVIEW */}
      {isQuestionsAiOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div
            className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reading-questions-ai-title"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3
                  id="reading-questions-ai-title"
                  className="font-bold text-slate-900"
                >
                  AI gợi ý câu hỏi đọc hiểu
                </h3>
                <p className="text-sm text-slate-600 mt-0.5 dark:text-slate-400">
                  Sinh câu hỏi từ đoạn đọc hiện có trong form; kết quả chỉ là
                  bản nháp cho đến khi bạn áp dụng và lưu.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsQuestionsAiOpen(false)}
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:text-slate-400"
                aria-label="Đóng gợi ý câu hỏi đọc hiểu"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <label className="font-semibold text-slate-700">
                Số câu hỏi:
              </label>
              <select
                value={readingAiCount}
                onChange={(e) => setReadingAiCount(Number(e.target.value))}
                disabled={isQuestionsAiLoading}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-800 outline-none"
              >
                <option value={1}>1 câu</option>
                <option value={2}>2 câu</option>
                <option value={3}>3 câu (khuyến nghị)</option>
                <option value={5}>5 câu</option>
              </select>
              <button
                type="button"
                disabled={isQuestionsAiLoading}
                onClick={handleSuggestReadingQuestions}
                className={`inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-1.5 font-semibold text-white hover:bg-slate-800 disabled:cursor-wait transition-colors ${!form.passage.trim() ? "invisible" : ""}`}
              >
                {isQuestionsAiLoading ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : null}
                {readingAiCandidates.length > 0
                  ? "AI gợi ý lại"
                  : "AI gợi ý câu hỏi nháp"}
              </button>
            </div>

            {aiQuestionsShortfall && readingAiCandidates.length > 0 && (
              <p className="text-sm font-medium text-amber-800">{aiQuestionsShortfall}</p>
            )}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-xs">
              {readingAiCandidates.length === 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Bấm “AI gợi ý câu hỏi nháp” để AI đọc đoạn văn hiện tại và
                  soạn câu hỏi trắc nghiệm A/B/C/D kèm giải thích.
                </p>
              ) : (
                readingAiCandidates.map((candidate, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-bold text-slate-800">
                        Câu {idx + 1} · {readingQuestionTypeLabel(candidate.questionType)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setReadingAiCandidates((prev) =>
                            prev.filter((_, i) => i !== idx),
                          )
                        }
                        className="text-slate-600 hover:text-rose-600 text-xs dark:text-slate-400"
                      >
                        Bỏ qua
                      </button>
                    </div>
                    <input
                      type="text"
                      value={candidate.prompt}
                      onChange={(e) => {
                        const val = e.target.value;
                        setReadingAiCandidates((prev) =>
                          prev.map((c, i) =>
                            i === idx ? { ...c, prompt: val } : c,
                          ),
                        );
                      }}
                      className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      {candidate.options.map((opt, optIdx) => {
                        const letter =
                          ["A", "B", "C", "D"][optIdx] || String(optIdx);
                        const isCorrect = candidate.correctIndex === optIdx;
                        return (
                          <div
                            key={optIdx}
                            className={`flex items-center gap-1.5 rounded border px-2 py-1.5 bg-white ${
                              isCorrect
                                ? "border-emerald-500 ring-1 ring-emerald-200"
                                : "border-slate-200"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setReadingAiCandidates((prev) =>
                                  prev.map((c, i) =>
                                    i === idx
                                      ? { ...c, correctIndex: optIdx }
                                      : c,
                                  ),
                                );
                              }}
                              className={`h-5 w-5 rounded text-xs font-bold flex items-center justify-center ${
                                isCorrect
                                  ? "bg-emerald-700 text-white"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                              title="Đặt làm đáp án đúng"
                            >
                              {letter}
                            </button>
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const val = e.target.value;
                                setReadingAiCandidates((prev) =>
                                  prev.map((c, i) =>
                                    i === idx
                                      ? {
                                          ...c,
                                          options: c.options.map((o, oi) =>
                                            oi === optIdx ? val : o,
                                          ),
                                        }
                                      : c,
                                  ),
                                );
                              }}
                              className="flex-1 bg-transparent text-xs text-slate-800 outline-none"
                            />
                            {isCorrect ? (
                              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">
                                Đúng
                              </span>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-0.5 dark:text-slate-400">
                        Giải thích:
                      </label>
                      <input
                        type="text"
                        value={candidate.explanation}
                        onChange={(e) => {
                          const val = e.target.value;
                          setReadingAiCandidates((prev) =>
                            prev.map((c, i) =>
                              i === idx ? { ...c, explanation: val } : c,
                            ),
                          );
                        }}
                        className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none"
                      />
                    </div>
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          // The editor opens as "Câu hỏi mới" with the candidate,
                          // ready to save (QA 2026-11-22: it was thrown away).
                          setQuestion({
                            ...emptyQuestion("reading"),
                            prompt: candidate.prompt,
                            options: candidate.options.join("\n"),
                            correctIndex: String(candidate.correctIndex),
                            explanation: candidate.explanation,
                            questionType: normalizeReadingQuestionType(candidate.questionType),
                          });
                          setIsAddingQuestion(true);
                          setIsQuestionsAiOpen(false);
                          toast.success(
                            "Đã điền câu hỏi vào biểu mẫu. Kiểm tra rồi bấm Thêm câu hỏi.",
                          );
                        }}
                        className="rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
                      >
                        Áp dụng vào biểu mẫu
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsQuestionsAiOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={pendingDeleteItem}
        title="Xóa bài này?"
        description="Bài bản nháp và toàn bộ câu hỏi của nó sẽ bị xóa vĩnh viễn. Bài đã có học viên làm thì không xóa được."
        confirmLabel="Xóa bài"
        isPending={busy}
        onConfirm={() => void removeItem()}
        onCancel={() => setPendingDeleteItem(false)}
      />

      {/* Publishing goes through the check below; only "Chuyển về bản nháp" asks here. */}
      <ConfirmDialog
        open={pendingPublicationStatus === "DRAFT"}
        title="Chuyển về bản nháp?"
        description="Nội dung sẽ được ẩn khỏi học viên nhưng vẫn giữ nguyên trong CMS để tiếp tục chỉnh sửa."
        confirmLabel="Chuyển về bản nháp"
        isPending={busy}
        onConfirm={() => {
          void publish("DRAFT").then(() => setPendingPublicationStatus(null));
        }}
        onCancel={() => setPendingPublicationStatus(null)}
      />
      {publishView && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="publish-check-title"
        >
          <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
            <h2 id="publish-check-title" className="font-semibold text-slate-950">
              {publishView.canPublish ? "Bài đã đạt kiểm tra" : "Bài chưa đạt kiểm tra"}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {publishView.canPublish
                ? "Mọi mục đều đạt. Xuất bản để học viên thấy bài này?"
                : "Sửa các mục chưa đạt rồi kiểm tra lại."}
            </p>
            {publishView.failed.length > 0 && (
              <>
                <h3 className="mt-4 text-sm font-semibold text-slate-900">Chưa đạt</h3>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {publishView.failed.map((label) => (
                    <li key={label} className="flex items-start gap-2 text-slate-900">
                      <X size={16} className="mt-0.5 flex-none text-rose-600" aria-hidden="true" />
                      {label}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {publishView.details.length > 0 && (
              <>
                <h3 className="mt-4 text-sm font-semibold text-slate-900">Chi tiết từ máy chủ</h3>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {publishView.details.map((line) => (
                    <li key={line} className="flex items-start gap-2 text-slate-800">
                      <X size={16} className="mt-0.5 flex-none text-rose-600" aria-hidden="true" />
                      {line}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {publishView.passed.length > 0 && (
              <>
                <h3 className="mt-4 text-sm font-semibold text-slate-900">Đã đạt</h3>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {publishView.passed.map((label) => (
                    <li key={label} className="flex items-start gap-2 text-slate-600">
                      <CheckCircle2 size={16} className="mt-0.5 flex-none text-emerald-600" aria-hidden="true" />
                      {label}
                    </li>
                  ))}
                </ul>
              </>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setPublishCheck(null)} className={BTN_SECONDARY}>
                {publishView.canPublish ? "Hủy" : "Đóng"}
              </button>
              {/* Offered only when everything passed. */}
              {publishView.canPublish && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void publish("PUBLISHED").then(() => setPublishCheck(null))}
                  className={BTN_SUCCESS}
                >
                  <Send size={16} aria-hidden="true" /> Xuất bản
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {pendingDeleteId !== null && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-question-title"
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h2
              id="delete-question-title"
              className="font-semibold text-slate-950"
            >
              Xóa câu hỏi?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Thao tác chỉ được thực hiện khi nội dung chưa có lịch sử làm bài.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setPendingDeleteId(null)}
                className="min-h-10 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={() => void removeQuestion(pendingDeleteId)}
                disabled={busy}
                className="min-h-10 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
