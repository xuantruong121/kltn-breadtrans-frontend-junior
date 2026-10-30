"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  FileAudio,
  FilePlus2,
  Loader2,
  Plus,
  Search,
  Save,
  Send,
  Trash2,
  Upload,
  Volume2,
  X,
} from "lucide-react";

import toast from "react-hot-toast";
import axiosClient from "@/lib/api/axiosClient";
import ImageUploadField from "@/components/admin/ImageUploadField";
import RequiredMediaNotice from "@/components/admin/RequiredMediaNotice";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { getApiErrorMessage } from "@/lib/utils/apiError";

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
  questionType: string;
  segments: ListeningSegment[];
  taskType: string;
  level: string;
  imageUrl: string;
  keywords: string;
  wordMin: string;
  wordMax: string;
  sampleSentences: string;
};
type CmsFullDraft = {
  domain: "listening" | "reading";
  title: string;
  description: string;
  level: string;
  passage: string;
  sourceQuestion?: QuestionDraft;
  questions: QuestionDraft[];
};

const meta: Record<Domain, { label: string; type: string }> = {
  listening: { label: "Nghe", type: "LISTENING_PRACTICE" },
  reading: { label: "Đọc", type: "BILINGUAL_READING" },
  writing: { label: "Viết", type: "WRITING_EMAIL" },
};

const CONTENT_LEVEL_OPTIONS = ["A1", "A2", "B1", "B2", "C1"] as const;

/** The CEFR tag authored at the head of a title ("Hội thoại C1 — ..."); quizzes have no level column. */
function levelFromTitle(title?: string | null): string | null {
  const head = (title ?? "").split(" — ")[0].toUpperCase();
  const match = /\b([ABC][12])\b/.exec(head);
  return match && (CONTENT_LEVEL_OPTIONS as readonly string[]).includes(match[1]) ? match[1] : null;
}

const LISTENING_MODE_OPTIONS: Array<{
  value: ListeningMode;
  label: string;
}> = [
  { value: "COMPREHENSION", label: "Nghe hiểu" },
  { value: "DICTATION", label: "Chép chính tả" },
  { value: "DIALOGUE", label: "Hội thoại" },
];

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

const writingTypeLabel = (type: string) =>
  type === "WRITING_PICTURE" ? "Viết theo tranh" : "Viết email";

const writingTaskOptions = (quizType: string) =>
  quizType === "WRITING_PICTURE"
    ? [
        { value: "SENTENCE", label: "Viết câu theo tranh" },
        { value: "PICTURE_SENTENCE", label: "Mô tả tranh theo từ khóa" },
        { value: "DESCRIBE_PICTURE", label: "Mô tả tranh" },
      ]
    : [
        { value: "EMAIL", label: "Phản hồi email" },
        { value: "SHORT_MESSAGE", label: "Tin nhắn ngắn" },
        { value: "INVITATION", label: "Email mời" },
        { value: "REQUEST", label: "Email yêu cầu" },
        { value: "THANK_YOU", label: "Email cảm ơn" },
        { value: "STATUS_UPDATE", label: "Email cập nhật tình hình" },
        { value: "CUSTOMER_EMAIL", label: "Email chăm sóc khách hàng" },
        { value: "INFORMATION_REQUEST", label: "Email hỏi thông tin" },
        { value: "MEETING_FOLLOWUP", label: "Email theo dõi cuộc họp" },
        { value: "OPINION", label: "Bài luận nêu quan điểm" },
        { value: "PROPOSAL", label: "Bài viết đề xuất giải pháp" },
        { value: "ANALYTICAL_RESPONSE", label: "Bài phân tích" },
        { value: "ARGUMENT", label: "Bài lập luận" },
      ];

const readingQuestionTypeLabel = (type?: string) => {
  const labels: Record<string, string> = {
    DETAIL: "Chi tiết",
    PURPOSE: "Mục đích",
    INFERENCE: "Suy luận",
    MAIN_IDEA: "Ý chính",
    PROMOTION: "Thông tin quảng bá",
    VOCAB_IN_CONTEXT: "Từ vựng trong ngữ cảnh",
  };
  return labels[type ?? ""] ?? "Trắc nghiệm đọc hiểu";
};

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
  questionType: domain === "reading" ? "MAIN_IDEA" : "",
  segments: [emptySegment()],
  taskType: domain === "writing" ? "EMAIL" : "",
  level: "",
  imageUrl: "",
  keywords: "",
  wordMin: "",
  wordMax: "",
  sampleSentences: "",
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
      content.prompt ??
        content.text ??
        content.correctAnswer ??
        content.audioText ??
        "",
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
  };
}

/**
 * Stored transcript turns, reduced to the fields the CMS accepts. A question
 * that copies them stays identical to the quiz transcript, so the audio
 * builder dedupes it into the same recording.
 */
function transcriptForSave(segments: unknown): Array<Record<string, string>> {
  if (!Array.isArray(segments)) return [];
  return segments.flatMap((segment: any) => {
    const speaker = String(segment?.speaker ?? "").trim();
    const text = String(segment?.text ?? "").trim();
    if (!speaker || !text) return [];
    const turn: Record<string, string> = { speaker, text };
    for (const key of ["translation", "voiceKey", "speakerId"]) {
      const value = String(segment?.[key] ?? "").trim();
      if (value) turn[key] = value;
    }
    return [turn];
  });
}

/** Shared button looks: visible hover, press, keyboard focus and disabled states. */
const BTN_BASE =
  "inline-flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50";
const BTN_SECONDARY = `${BTN_BASE} border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 active:bg-slate-100`;
const BTN_PRIMARY = `${BTN_BASE} bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800`;
const BTN_SUCCESS = `${BTN_BASE} bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800`;
const BTN_DANGER = `${BTN_BASE} border border-rose-200 bg-white text-rose-600 hover:border-rose-300 hover:bg-rose-50 active:bg-rose-100`;
const BTN_AI = `${BTN_BASE} border border-amber-300 bg-amber-50 text-amber-900 hover:border-amber-400 hover:bg-amber-100 active:bg-amber-200`;

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
  const [items, setItems] = useState<any[]>([]);
  const [item, setItem] = useState<any | null>(null);
  const [artifacts, setArtifacts] = useState<any[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "DRAFT" | "PUBLISHED"
  >("ALL");
  const [listeningModeFilter, setListeningModeFilter] =
    useState<ListeningModeFilter>("ALL");
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
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
      initialQuestion.type =
        initialListeningMode === "COMPREHENSION"
          ? "MULTIPLE_CHOICE"
          : initialListeningMode;
    }
    return initialQuestion;
  });
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
    useState<
      Array<{
        prompt: string;
        options: string[];
        correctIndex: number;
        explanation: string;
        explanationEn?: string;
      }>
    >([]);
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
  // AI full draft: the listening form to write (was inferred from the
  // question being edited, so it silently produced dictation).
  const [fullDraftMode, setFullDraftMode] = useState<"DIALOGUE" | "DICTATION">(
    initialListeningMode === "DICTATION" ? "DICTATION" : "DIALOGUE",
  );
  // The "new question" editor is opened on demand; editing happens in place.
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [pendingFullDraftQuestions, setPendingFullDraftQuestions] = useState<
    QuestionDraft[]
  >([]);

  /**
   * The transcript a dialogue quiz plays, and its accent. Every MCQ added to
   * the quiz carries them, as published content does.
   */
  const quizListeningContext = () => {
    if (domain !== "listening" || selectedListeningMode === "DICTATION")
      return { transcript: [], accent: "US" };
    const holder = (item?.questions || []).find(
      (q: any) =>
        Array.isArray(q.content?.transcriptSegments) &&
        q.content.transcriptSegments.length > 0,
    );
    return {
      transcript: transcriptForSave(holder?.content?.transcriptSegments),
      accent: holder?.content?.accent === "UK" ? "UK" : "US",
    };
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
      if (draft.type === "DICTATION")
        content.correctAnswer = draft.prompt.trim();
      if (draft.type === "DIALOGUE")
        content.transcriptSegments = transcriptForSave(draft.segments);
      if (draft.type === "MULTIPLE_CHOICE" && listening.transcript.length) {
        content.transcriptSegments = listening.transcript;
        content.audioText = listening.transcript
          .map((turn) => turn.text)
          .join(" ");
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
        setReadingAiCandidates(data.candidates);
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

  const listeningMode = (): "DIALOGUE" | "DICTATION" =>
    question.type === "DIALOGUE" ? "DIALOGUE" : "DICTATION";

  const listeningSourceText = () =>
    question.type === "DIALOGUE"
      ? question.segments
          .filter((segment) => segment.text.trim())
          .map(
            (segment) =>
              `${segment.speaker.trim() || "Speaker"}: ${segment.text.trim()}`,
          )
          .join("\n")
      : question.prompt.trim();

  const handleSuggestListeningContent = async () => {
    setIsListeningContentAiLoading(true);
    try {
      const response: any = await axiosClient.post(
        "/admin/listening/ai/suggest-content",
        {
          mode: listeningMode(),
          level: form.level || "A2",
          topic: form.title.trim() || undefined,
          currentText: question.prompt.trim() || undefined,
          currentTurns: question.segments.filter((segment) =>
            segment.text.trim(),
          ),
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
        toast.error("Không nhận được transcript hợp lệ từ AI");
        return;
      }
      toast.success("Đã nhận transcript nháp. Hãy kiểm tra trước khi lưu.");
    } catch (error: any) {
      toast.error(
        getApiErrorMessage(error, "Không thể gợi ý nội dung nghe lúc này."),
      );
    } finally {
      setIsListeningContentAiLoading(false);
    }
  };

  const handleSuggestListeningQuestions = async () => {
    // A dialogue quiz asks about its own transcript, whatever is being edited.
    const quizTranscript = quizListeningContext().transcript;
    const sourceText = quizTranscript.length
      ? quizTranscript
          .map((turn) => `${turn.speaker}: ${turn.text}`)
          .join("\n")
      : listeningSourceText();
    if (!sourceText) {
      toast.error("Vui lòng nhập transcript trước khi tạo câu hỏi.");
      return;
    }
    setIsListeningQuestionsAiLoading(true);
    try {
      const response: any = await axiosClient.post(
        "/admin/listening/ai/suggest-questions",
        {
          mode: quizTranscript.length ? "DIALOGUE" : listeningMode(),
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
        },
      );
      const data = response?.data || response;
      if (!data?.prompt || !data?.taskType) {
        toast.error("Không nhận được đề bài Writing hợp lệ từ AI");
        return;
      }
      setWritingAiSuggestion(data);
      toast.success("Đã nhận đề bài Writing nháp. Hãy kiểm tra trước khi lưu.");
    } catch (error: any) {
      toast.error(
        getApiErrorMessage(error, "Không thể gợi ý đề bài Writing lúc này."),
      );
    } finally {
      setIsWritingAiLoading(false);
    }
  };

  const handleSuggestFullDraft = async () => {
    if (domain !== "listening" && domain !== "reading") return;
    const topic = form.title.trim();
    if (!topic) {
      toast.error(
        "Vui lòng nhập tiêu đề hoặc chủ đề trước khi soạn bản nháp.",
      );
      return;
    }
    try {
      const response: any = await axiosClient.post(
        `/admin/${domain}/ai/full-draft`,
        domain === "reading"
          ? {
              topic,
              level: form.level || "A2",
              targetLength: 180,
              count: fullDraftCount,
            }
          : {
              topic,
              level: form.level || "A2",
              mode: fullDraftMode,
              count: fullDraftCount,
            },
      );
      const data = response?.data || response;
      const questions = Array.isArray(data?.questions)
        ? data.questions.map((candidate: any) => ({
            ...emptyQuestion(domain),
            type: "MULTIPLE_CHOICE",
            prompt: String(candidate.prompt || ""),
            options: Array.isArray(candidate.options)
              ? candidate.options.join("\n")
              : "",
            correctIndex: String(candidate.correctIndex ?? ""),
            explanation: String(candidate.explanation || ""),
            explanationEn: String(candidate.explanationEn || ""),
            questionType: String(candidate.questionType || "MAIN_IDEA"),
          }))
        : [];
      if (!data?.title || !data?.description || !questions.length) {
        throw new Error("AI không trả về bản nháp hợp lệ.");
      }
      const sourceQuestion =
        domain === "listening"
          ? data.mode === "DIALOGUE"
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
            : {
                ...emptyQuestion(domain),
                type: "DICTATION",
                prompt: String(data.text || ""),
              }
          : undefined;
      setFullDraft({
        domain,
        title: String(data.title),
        description: String(data.description),
        level: String(data.level || form.level || "A2"),
        passage:
          domain === "reading"
            ? String(data.passage || "")
            : data.mode === "DICTATION"
              ? String(data.text || "")
              : (data.turns || [])
                  .map(
                    (turn: any) =>
                      `${turn.speaker || "Speaker"}: ${turn.text || ""}`,
                  )
                  .join("\n"),
        sourceQuestion,
        questions,
      });
      toast.success("Đã tạo bản nháp. Hãy xem lại trước khi áp dụng.");
    } catch (error: any) {
      toast.error(
        error instanceof Error && !("response" in error)
          ? error.message
          : getApiErrorMessage(error, "Không thể soạn bản nháp lúc này."),
      );
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

  const loadList = async () => {
    setLoading(true);
    try {
      setItems(
        unwrap<any[]>(await axiosClient.get(`/admin/skill-content/${domain}`)),
      );
    } catch (error: any) {
      toast.error(
        getApiErrorMessage(error, "Không thể tải nội dung CMS"),
      );
    } finally {
      setLoading(false);
    }
  };

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
      const metadata =
        data.bilingualContent && typeof data.bilingualContent === "object"
          ? data.bilingualContent
          : {};
      setContentMetadata(metadata);
      if (domain === "listening") {
        setSelectedListeningMode(normalizeListeningMode(metadata.mode));
        setFullDraftMode(
          normalizeListeningMode(metadata.mode) === "DICTATION"
            ? "DICTATION"
            : "DIALOGUE",
        );
        setQuestion((current) => ({
          ...current,
          type:
            normalizeListeningMode(metadata.mode) === "COMPREHENSION"
              ? "MULTIPLE_CHOICE"
              : normalizeListeningMode(metadata.mode),
        }));
      }
      setForm({
        title: data.title || "",
        description: data.description || "",
        level: data.level || levelFromTitle(data.title) || "A2",
        timeLimit: String(data.timeLimit ?? 15),
        passage: data.passage || data.theoryContent || "",
        type: data.type || meta[domain].type,
      });
      setPendingFullDraftQuestions([]);
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, "Không thể tải nội dung"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (mode === "list" ? loadList() : loadItem());
  }, [domain, mode, id]);

  const saveContent = async () => {
    if (!form.title.trim()) {
      toast.error("Cần nhập tiêu đề");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        ...form,
        timeLimit: Number(form.timeLimit) || undefined,
        type: domain === "writing" ? form.type : undefined,
        ...(domain === "listening"
          ? {
              bilingualContent: {
                ...contentMetadata,
                mode: selectedListeningMode,
                levels: [form.level],
                accents: contentMetadata.accents ?? ["US"],
              },
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
      // A dialogue draft is not saved as its own question: its turns go onto
      // every MCQ, as published quizzes store them. Saved one by one so the
      // questions keep the draft's order.
      const source = pendingFullDraftQuestions.find(
        (draft) => draft.type === "DIALOGUE",
      );
      const listening = {
        transcript: source ? transcriptForSave(source.segments) : [],
        accent: "US",
      };
      for (const draft of pendingFullDraftQuestions) {
        if (draft === source) continue;
        await axiosClient.post(
          domain === "listening"
            ? `/admin/skill-content/listening/${savedItem.id}/questions`
            : `/admin/skill-content/${domain}/${savedItem.id}/questions`,
          questionDraftPayload(draft, listening),
        );
      }
      toast.success("Đã lưu bản nháp");
      setPendingFullDraftQuestions([]);
      router.push(`/admin/${domain}/${savedItem.id}`);
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, "Lưu thất bại"));
    } finally {
      setBusy(false);
    }
  };

  const saveQuestion = async () => {
    if (!id || !question.prompt.trim()) {
      toast.error("Cần nhập đề bài hoặc transcript");
      return;
    }
    setBusy(true);
    try {
      if (domain === "writing") {
        const taskType = question.taskType.trim().toUpperCase();
        const pictureTask = form.type === "WRITING_PICTURE";
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
          domain === "listening" &&
          question.type === "DIALOGUE" &&
          transcriptForSave(question.segments).length < 2
        ) {
          toast.error("Dialogue cần ít nhất 2 lượt lời");
          return;
        }
        const payload = questionDraftPayload(question, quizListeningContext());
        if (question.id) {
          await axiosClient.patch(
            domain === "listening"
              ? `/admin/skill-content/listening/${id}/questions/${question.id}`
              : `/admin/skill-content/${domain}/${id}/questions/${question.id}`,
            payload,
          );
        } else {
          await axiosClient.post(
            domain === "listening"
              ? `/admin/skill-content/listening/${id}/questions`
              : `/admin/skill-content/${domain}/${id}/questions`,
            payload,
          );
        }
      }
      toast.success("Đã lưu câu hỏi");
      setQuestion(emptyQuestion(domain));
      setIsAddingQuestion(false);
      await loadItem();
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, "Lưu câu hỏi thất bại"));
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

  const publish = async (status: "DRAFT" | "PUBLISHED") => {
    if (!id) return;
    setBusy(true);
    try {
      const check = unwrap<any>(
        await axiosClient.get(`/admin/skill-content/${domain}/${id}/validate`),
      );
      if (!check.valid) {
        toast.error(check.errors.join("\n"));
        return;
      }
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
        getApiErrorMessage(error, "Không thể tải audio preview"),
      );
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
      toast.success(
        action === "validate"
          ? result.valid
            ? "Transcript hợp lệ"
            : "Transcript chưa hợp lệ"
          : "Đã cập nhật audio artifact",
      );
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

  const generateDialogueAudio = async (questionId: number) => {
    if (!id) return;
    setBusy(true);
    try {
      await axiosClient.post(
        `/admin/skill-content/listening/${id}/questions/${questionId}/audio-assets/generate-dialogue`,
      );
      toast.success("Đã sinh audio Dialogue");
      await loadItem();
    } catch (error: any) {
      toast.error(
        getApiErrorMessage(error, "Không thể sinh audio Dialogue"),
      );
    } finally {
      setBusy(false);
    }
  };

  if (loading)
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2 className="animate-spin text-slate-600" />
      </div>
    );

  if (mode === "list") {
    const visibleItems = items.filter((content) => {
      const query = searchTerm.trim().toLocaleLowerCase("vi");
      const searchable = [
        content.title,
        content.description,
        content.level,
        content.type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("vi");
      const status = content.publicationStatus || "DRAFT";
      const matchesListeningMode =
        domain !== "listening" ||
        listeningModeFilter === "ALL" ||
        getListeningMode(content) === listeningModeFilter;
      return (
        (!query || searchable.includes(query)) &&
        (statusFilter === "ALL" || status === statusFilter) &&
        matchesListeningMode
      );
    });

    return (
      <main className="mx-auto max-w-6xl space-y-6 p-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-slate-500">
              NỘI DUNG HỌC
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">
              {title}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Tạo, kiểm tra và xuất bản bài luyện cho học viên.
            </p>
          </div>
          {domain === "listening" ? (
            <div className="relative">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={isCreateMenuOpen}
                onClick={() => setIsCreateMenuOpen((current) => !current)}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
              >
                <FilePlus2 size={16} /> Thêm bài nghe <ChevronDown size={15} />
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
          ) : (
            <button
              type="button"
              onClick={() => router.push(`/admin/${domain}/new`)}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
            >
              <FilePlus2 size={16} /> Tạo bản nháp
            </button>
          )}
        </header>
        <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Tìm nội dung {meta[domain].label}</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
              aria-hidden="true"
            />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tìm theo tiêu đề, mô tả, trình độ..."
              className="min-h-11 w-full rounded-lg border border-slate-200 py-2 pl-10 pr-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            <span className="sr-only">Lọc theo trạng thái</span>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as "ALL" | "DRAFT" | "PUBLISHED",
                )
              }
              className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 sm:w-44"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="DRAFT">Bản nháp</option>
              <option value="PUBLISHED">Đã xuất bản</option>
            </select>
          </label>
        </section>
        {domain === "listening" && (
          <section
            aria-label="Lọc loại bài nghe"
            className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm"
          >
            <span className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Loại bài
            </span>
            <button
              type="button"
              onClick={() => setListeningModeFilter("ALL")}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${listeningModeFilter === "ALL" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}
            >
              Tất cả ({items.length})
            </button>
            {LISTENING_MODE_OPTIONS.map((option) => {
              const count = items.filter(
                (content) => getListeningMode(content) === option.value,
              ).length;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setListeningModeFilter(option.value)}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold ${listeningModeFilter === option.value ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}
                >
                  {option.label} ({count})
                </button>
              );
            })}
          </section>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {visibleItems.map((content) => (
            <article
              key={content.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-950">
                    {content.title}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {content.description || "Chưa có mô tả"}
                  </p>
                  {domain === "listening" && (
                    <span className="mt-2 inline-flex rounded-md bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700">
                      {
                        LISTENING_MODE_OPTIONS.find(
                          (option) =>
                            option.value === getListeningMode(content),
                        )?.label
                      }
                    </span>
                  )}
                </div>
                <span
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold ${content.publicationStatus === "PUBLISHED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                >
                  {publicationStatusLabel(content.publicationStatus)}
                </span>
              </div>
              <div className="mt-5 flex items-center justify-between text-xs text-slate-500">
                <span>
                  {content._count?.questions ?? content.questions?.length ?? 0}{" "}
                  câu hỏi
                </span>
                <button
                  onClick={() => router.push(`/admin/${domain}/${content.id}`)}
                  className="min-h-10 rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-800"
                >
                  Mở editor
                </button>
              </div>
            </article>
          ))}
          {items.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
              Chưa có nội dung {meta[domain].label}. Hãy tạo bản nháp đầu tiên
              để bắt đầu.
            </div>
          )}
          {items.length > 0 && visibleItems.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
              Không tìm thấy nội dung phù hợp. Hãy đổi từ khóa hoặc bộ lọc trạng
              thái.
            </div>
          )}
        </div>
      </main>
    );
  }

  const questions = item?.questions || [];
  const isWriting = domain === "writing";
  const isListening = domain === "listening";
  const writingTaskType = question.taskType.trim().toUpperCase();
  const isPictureWriting = isWriting && form.type === "WRITING_PICTURE";
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
  // A full draft replaces the whole quiz, so it is offered only while the
  // quiz has no questions; after that its form is fixed.
  const draftLocked =
    (isListening || domain === "reading") && questions.length > 0;
  const listeningTypeOptions = (
    [
      ["MULTIPLE_CHOICE", "Trắc nghiệm"],
      ["DICTATION", "Nghe chép"],
      ["DIALOGUE", "Hội thoại (lời thoại)"],
    ] as const
  ).filter(
    ([value]) =>
      !draftLocked ||
      value === question.type ||
      value ===
        (selectedListeningMode === "DICTATION" ? "DICTATION" : "MULTIPLE_CHOICE"),
  );
  /** The artifact that matches the current transcript, if any. */
  const currentArtifact = artifacts.find((artifact) => !artifact.isStale);

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
                if (isListening && !draftLocked) {
                  setSelectedListeningMode(
                    nextType === "DICTATION" || nextType === "DIALOGUE"
                      ? nextType
                      : "COMPREHENSION",
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
                <option value="WRITING">Writing</option>
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
                <option value="DETAIL">Chi tiết</option>
                <option value="PURPOSE">Mục đích</option>
                <option value="INFERENCE">Suy luận</option>
                <option value="MAIN_IDEA">Ý chính</option>
                <option value="PROMOTION">Thông tin quảng bá</option>
                <option value="VOCAB_IN_CONTEXT">Từ vựng trong ngữ cảnh</option>
              </select>
            </label>
          )}
          <div className="text-sm font-medium">
            <span className="flex items-center justify-between gap-3">
              <span>
                {isWriting ? "Đề bài / instruction" : "Nội dung / đề bài"}
              </span>
              {isWriting && (
                <button
                  type="button"
                  onClick={() => {
                    setWritingAiSuggestion(null);
                    setIsWritingAiOpen(true);
                  }}
                  className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-300"
                >
                  AI gợi ý đề bài Writing
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
                Task family
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
                Level
                <select
                  value={question.level}
                  onChange={(event) =>
                    setQuestion({ ...question, level: event.target.value })
                  }
                  className={inputClassName()}
                >
                  <option value="">Chưa chọn (dùng context)</option>
                  {CONTENT_LEVEL_OPTIONS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </label>
              {isPictureWriting && (
                <>
                  <div className="md:col-span-2">
                    <ImageUploadField
                      label="Hình ảnh miêu tả *"
                      value={question.imageUrl}
                      onChange={(url) =>
                        setQuestion({ ...question, imageUrl: url })
                      }
                      helperText="Tải lên ảnh mô tả cho bài luyện viết (PNG, JPG hoặc WEBP)."
                    />
                    {!question.imageUrl.trim() && <RequiredMediaNotice className="mt-2" />}
                  </div>
                  <label className="text-sm font-medium">
                    Keywords
                    <textarea
                      value={question.keywords}
                      onChange={(event) =>
                        setQuestion({
                          ...question,
                          keywords: event.target.value,
                        })
                      }
                      placeholder="Mỗi keyword một dòng"
                      className={`${inputClassName()} min-h-24`}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Sample sentences
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
              {!isPictureWriting && (
                <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  {isEssayWriting
                    ? "Essay / opinion constraints"
                    : "Email / message constraints"}
                </div>
              )}
              {(!isPictureWriting || writingTaskType === "SENTENCE") && (
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

          {(domain === "reading" ||
            (isListening && question.type === "MULTIPLE_CHOICE")) && (
            <>
              <label className="text-sm font-medium">
                Các phương án lựa chọn (mỗi dòng một phương án)
                <textarea
                  value={question.options}
                  onChange={(event) =>
                    setQuestion({ ...question, options: event.target.value })
                  }
                  placeholder="Phương án A&#10;Phương án B&#10;Phương án C&#10;Phương án D"
                  className={`${inputClassName()} min-h-24`}
                />
              </label>
              <label className="text-sm font-medium">
                Đáp án đúng
                <select
                  value={question.correctIndex || "0"}
                  onChange={(event) =>
                    setQuestion({
                      ...question,
                      correctIndex: event.target.value,
                    })
                  }
                  className={inputClassName()}
                >
                  {(() => {
                    const opts = question.options
                      .split("\n")
                      .map((v) => v.trim())
                      .filter(Boolean);
                    if (opts.length > 0) {
                      return opts.map((opt, idx) => (
                        <option key={idx} value={String(idx)}>
                          Phương án {String.fromCharCode(65 + idx)}:{" "}
                          {opt.slice(0, 45)}
                          {opt.length > 45 ? "..." : ""}
                        </option>
                      ));
                    }
                    return [
                      <option key="0" value="0">
                        Phương án A
                      </option>,
                      <option key="1" value="1">
                        Phương án B
                      </option>,
                      <option key="2" value="2">
                        Phương án C
                      </option>,
                      <option key="3" value="3">
                        Phương án D
                      </option>,
                    ];
                  })()}
                </select>
              </label>
            </>
          )}
          {isListening && question.type === "DIALOGUE" && (
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Transcript turns</label>
                <button
                  type="button"
                  onClick={() =>
                    setQuestion({
                      ...question,
                      segments: [...question.segments, emptySegment()],
                    })
                  }
                  className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold"
                >
                  <Plus size={14} /> Thêm lượt lời
                </button>
              </div>
              {question.segments.map((segment, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-lg bg-slate-50 p-3 md:grid-cols-[140px_1fr_1fr_auto]"
                >
                  <input
                    value={segment.speaker}
                    onChange={(event) =>
                      setQuestion({
                        ...question,
                        segments: question.segments.map((value, i) =>
                          i === index
                            ? { ...value, speaker: event.target.value }
                            : value,
                        ),
                      })
                    }
                    placeholder="Speaker"
                    className={inputClassName()}
                  />
                  <input
                    value={segment.text}
                    onChange={(event) =>
                      setQuestion({
                        ...question,
                        segments: question.segments.map((value, i) =>
                          i === index
                            ? { ...value, text: event.target.value }
                            : value,
                        ),
                      })
                    }
                    placeholder="English text"
                    className={inputClassName()}
                  />
                  <input
                    value={segment.translation}
                    onChange={(event) =>
                      setQuestion({
                        ...question,
                        segments: question.segments.map((value, i) =>
                          i === index
                            ? { ...value, translation: event.target.value }
                            : value,
                        ),
                      })
                    }
                    placeholder="Bản dịch (tuỳ chọn)"
                    className={inputClassName()}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setQuestion({
                        ...question,
                        segments: question.segments.filter(
                          (_, i) => i !== index,
                        ),
                      })
                    }
                    className="min-h-10 self-end rounded-lg border border-rose-200 px-3 text-rose-600"
                    aria-label="Xóa lượt lời"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
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
              Lời giải (English)
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
            onClick={() => void saveQuestion()}
            disabled={busy || !id}
            className={BTN_PRIMARY}
          >
            {question.id ? <CheckCircle2 size={16} /> : <Plus size={16} />}{" "}
            {question.id ? "Lưu câu hỏi" : "Thêm câu hỏi"}
          </button>
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
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <button
        onClick={() => router.push(`/admin/${domain}`)}
        className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-slate-500"
      >
        <ArrowLeft size={16} /> Danh sách
      </button>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-slate-500">
            {meta[domain].label}
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">
            {title}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Trạng thái: {publicationStatusLabel(item?.publicationStatus)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => void saveContent()}
            disabled={busy}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold"
          >
            <Save size={16} /> Lưu
          </button>
          <button
            onClick={() =>
              setPendingPublicationStatus(
                item?.publicationStatus === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
              )
            }
            disabled={busy}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            <Send size={16} />{" "}
            {item?.publicationStatus === "PUBLISHED"
              ? "Chuyển về bản nháp"
              : "Kiểm tra & xuất bản"}
          </button>
        </div>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-slate-950">Thông tin nội dung</h2>
          {(isListening || domain === "reading") && (
            <div className="flex flex-wrap items-center gap-2">
              {isListening &&
                (draftLocked ? (
                  <span className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600">
                    Dạng bài
                    <span className="font-semibold text-slate-900">
                      {selectedListeningMode === "DICTATION"
                        ? "Nghe chép"
                        : "Hội thoại + câu hỏi"}
                    </span>
                  </span>
                ) : (
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                    Dạng bài
                    <select
                      aria-label="Dạng bài nghe AI sẽ soạn"
                      value={fullDraftMode}
                      onChange={(event) => {
                        const next =
                          event.target.value === "DICTATION"
                            ? "DICTATION"
                            : "DIALOGUE";
                        setFullDraftMode(next);
                        // The quiz is saved in the form chosen here.
                        setSelectedListeningMode(next);
                      }}
                      className="min-h-10 rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-900"
                    >
                      <option value="DIALOGUE">Hội thoại + câu hỏi</option>
                      <option value="DICTATION">Nghe chép</option>
                    </select>
                  </label>
                ))}
              {!draftLocked && (
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                  Số câu hỏi
                  <input
                    aria-label={`Số câu trong bản nháp ${meta[domain].label}`}
                    type="number"
                    min={1}
                    max={10}
                    value={fullDraftCount}
                    onChange={(event) =>
                      setFullDraftCount(
                        Math.min(
                          10,
                          Math.max(1, Number(event.target.value) || 1),
                        ),
                      )
                    }
                    className="min-h-10 w-16 rounded-lg border border-slate-300 px-2 text-center text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </label>
              )}
              <button
                type="button"
                onClick={() => void handleSuggestFullDraft()}
                disabled={draftLocked}
                title={
                  draftLocked
                    ? "Bài đã có câu hỏi — dùng ‘Thêm câu hỏi bằng AI’"
                    : "Dùng Tiêu đề làm chủ đề và Trình độ bên dưới. Bản nháp hiện ra để xem lại trước khi áp dụng."
                }
                className={BTN_AI}
              >
                Soạn cả bài bằng AI
              </button>
            </div>
          )}
        </div>
        {draftLocked && (
          <p className="mt-2 text-sm text-slate-500">
            Bài đã có câu hỏi — dùng ‘Thêm câu hỏi bằng AI’ ở mục Câu hỏi.
          </p>
        )}
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium">
            Tiêu đề
            <input
              value={form.title}
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
              className={inputClassName()}
            />
          </label>
          <label className="text-sm font-medium">
            Trình độ tham chiếu / context
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
            <span className="mt-1 block text-[11px] font-normal text-slate-500">
              Dùng để định hướng nội dung AI; runtime vẫn lưu theo contract của
              từng domain.
            </span>
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
                    taskType: type === "WRITING_PICTURE" ? "SENTENCE" : "EMAIL",
                  }));
                }}
                className={inputClassName()}
              >
                <option value="WRITING_PICTURE">
                  {writingTypeLabel("WRITING_PICTURE")}
                </option>
                <option value="WRITING_EMAIL">
                  {writingTypeLabel("WRITING_EMAIL")}
                </option>
              </select>
            </label>
          )}
          {/* Reading only: a Listening question keeps its transcript in
              transcriptSegments, and this field is not saved for it. */}
          {domain === "reading" && (
            <div className="md:col-span-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  Đoạn đọc (Reading Passage)
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

      {isListening && (
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
            </div>
            <button
              type="button"
              onClick={() => void audioAction("validate")}
              disabled={busy || !id}
              className={BTN_SECONDARY}
            >
              <CheckCircle2 size={16} /> Kiểm tra lời thoại
            </button>
          </div>

          <ol className="mt-4 grid gap-2 text-sm sm:grid-cols-4">
            {[
              "Kiểm tra lời thoại",
              "Tạo audio",
              "Nghe & duyệt",
              "Xuất bản cho học viên",
            ].map((label, index) => {
              const step = !currentArtifact
                ? 1
                : currentArtifact.status === "PREVIEW_READY"
                  ? 2
                  : currentArtifact.status === "APPROVED"
                    ? 3
                    : 4;
              const done = index < step;
              return (
                <li
                  key={label}
                  className={`rounded-lg border px-3 py-2 ${
                    done
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : index === step
                        ? "border-blue-300 bg-blue-50 font-semibold text-blue-800"
                        : "border-slate-200 text-slate-500"
                  }`}
                >
                  {index + 1}. {label}
                </li>
              );
            })}
          </ol>

          {listeningTranscript.length > 0 && (
            <details className="mt-4 rounded-lg border border-slate-200" open>
              <summary className="cursor-pointer px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50">
                Lời thoại ({listeningTranscript.length} lượt)
              </summary>
              <ol className="space-y-2 border-t border-slate-100 px-4 py-3 text-sm">
                {listeningTranscript.map((turn, index) => (
                  <li key={index}>
                    <span className="font-semibold text-slate-900">
                      {turn.speaker}:
                    </span>{" "}
                    <span className="text-slate-800">{turn.text}</span>
                    {turn.translation && (
                      <span className="block text-slate-500">
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
                        void audioAction("approve", currentArtifact.id)
                      }
                      disabled={busy}
                      className={BTN_PRIMARY}
                    >
                      <CheckCircle2 size={16} /> Duyệt audio
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
                    : "Chưa có audio. Kiểm tra lời thoại rồi tạo audio (Azure TTS)."}
                </p>
                <button
                  type="button"
                  onClick={() => void audioAction("generate-preview")}
                  disabled={busy || !id}
                  className={BTN_PRIMARY}
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

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-slate-950">Câu hỏi</h2>
            <p className="mt-1 text-sm text-slate-600">
              {isListening && selectedListeningMode !== "DICTATION"
                ? "Câu hỏi về đoạn audio phía trên. Bấm Sửa để sửa ngay tại câu."
                : "Bấm Sửa để sửa ngay tại câu; câu mới thêm ở cuối danh sách."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {domain === "reading" && (
              <button
                type="button"
                onClick={() => {
                  setReadingAiCandidates([]);
                  setIsQuestionsAiOpen(true);
                }}
                title="AI đọc đoạn văn và gợi ý thêm câu hỏi; bạn chọn câu muốn thêm."
                className={BTN_AI}
              >
                Thêm câu hỏi bằng AI
              </button>
            )}
            {isListening && (
              <button
                type="button"
                title="AI đọc lời thoại hiện có và gợi ý thêm câu hỏi trắc nghiệm; bạn chọn câu muốn thêm."
                onClick={() => {
                  setListeningQuestionsAiCandidates([]);
                  setIsListeningQuestionsAiOpen(true);
                }}
                className={BTN_AI}
              >
                Thêm câu hỏi bằng AI
              </button>
            )}
            <span className="text-sm text-slate-500">
              {questions.length} câu
            </span>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {questions.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
              Chưa có câu hỏi nào. Dùng biểu mẫu bên dưới để thêm câu hỏi đầu
              tiên cho nội dung{" "}
              {isListening ? "Listening" : isWriting ? "Writing" : "Reading"}.
            </div>
          )}
          {questions.map((current: any, index: number) => (
            <div
              key={current.id}
              className={`rounded-lg border p-4 transition-colors ${
                question.id === current.id
                  ? "border-blue-400 ring-2 ring-blue-100"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    Câu {index + 1} ·{" "}
                    {isWriting
                      ? "Viết"
                      : isListening
                        ? (LISTENING_QUESTION_LABEL[current.type] ?? current.type)
                        : readingQuestionTypeLabel(
                            current.content?.questionType,
                          )}
                  </p>
                  <p className="mt-1 text-sm text-slate-900">
                    {questionToDraft(current).prompt || "Chưa có nội dung"}
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
              {/* Per-question audio belongs to dictation only; a dialogue
                  plays one continuous recording (Audio bài nghe above). */}
              {isListening && current.type === "DICTATION" && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <Volume2 size={14} />{" "}
                    {current.audioAssets?.length
                      ? `${current.audioAssets.length} bản audio`
                      : "Chưa có audio câu hỏi"}
                  </span>
                  <label className={BTN_SECONDARY}>
                    <Upload size={16} /> Tải audio câu này
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
                  {current.type === "DIALOGUE" && (
                    <button
                      onClick={() => void generateDialogueAudio(current.id)}
                      disabled={busy}
                      className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold"
                    >
                      <FileAudio size={14} /> Sinh audio Dialogue
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4">
          {!question.id && isAddingQuestion ? (
            <div className="rounded-lg border border-blue-300 bg-blue-50/30 p-4">
              <p className="text-sm font-semibold text-slate-900">Câu hỏi mới</p>
              {renderQuestionEditor()}
            </div>
          ) : (
            <button
              type="button"
              disabled={!id}
              onClick={() => {
                setQuestion({
                  ...emptyQuestion(domain),
                  ...(isListening && selectedListeningMode !== "DICTATION"
                    ? { type: "MULTIPLE_CHOICE" }
                    : {}),
                });
                setIsAddingQuestion(true);
              }}
              className={BTN_SECONDARY}
            >
              <Plus size={16} /> Thêm câu hỏi
            </button>
          )}
        </div>
      </section>

      {/* MODAL: LISTENING CONTENT REVIEW */}
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
                  Xem lại bản nháp{" "}
                  {fullDraft.domain === "reading" ? "Reading" : "Listening"}
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Xem lại, sửa hoặc bỏ bớt câu đề xuất trước khi áp dụng. Chưa ghi
                  database; CMS Save vẫn bắt buộc.
                </p>
              </div>
              <button
                type="button"
                aria-label="Đóng xem lại bản nháp"
                onClick={() => setFullDraft(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
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
              <label className="block text-xs font-semibold text-slate-700">
                {fullDraft.domain === "reading"
                  ? "Đoạn đọc"
                  : "Transcript / nội dung nguồn"}
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
              {fullDraft.sourceQuestion && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                  Full draft sẽ lưu transcript nguồn thành một câu{" "}
                  {fullDraft.sourceQuestion.type}; các câu hỏi bên dưới được lưu
                  thành candidate riêng. Không tạo audio.
                </p>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Question candidates (
                    {
                      fullDraft.questions.filter(
                        (candidate: any) => !candidate.excluded,
                      ).length
                    }
                    )
                  </h4>
                  <p className="mt-1 text-xs text-slate-500">
                    Có thể chỉnh sửa hoặc khôi phục candidate đã loại.
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
                        className="text-xs font-semibold text-slate-500 underline-offset-2 hover:text-slate-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                      >
                        {candidate.excluded ? "Khôi phục" : "Loại candidate"}
                      </button>
                    </div>
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
                        Giải thích (English)
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
                  const activeQuestions = fullDraft.questions.filter(
                    (candidate: any) =>
                      !candidate.excluded &&
                      candidate.prompt.trim() &&
                      candidate.options.split("\n").filter(Boolean).length ===
                        4,
                  );
                  if (
                    !fullDraft.title.trim() ||
                    !activeQuestions.length ||
                    (fullDraft.sourceQuestion?.type === "DICTATION" &&
                      !fullDraft.sourceQuestion.prompt.trim())
                  ) {
                    toast.error(
                      "Full draft cần tiêu đề, nguồn nội dung và ít nhất một câu hợp lệ.",
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
                  setPendingFullDraftQuestions([
                    ...(fullDraft.sourceQuestion
                      ? [fullDraft.sourceQuestion]
                      : []),
                    ...activeQuestions,
                  ]);
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
                <p className="text-xs font-semibold uppercase tracking-[.14em] text-amber-700">
                  Gợi ý biên soạn
                </p>
                <h3
                  id="listening-content-ai-title"
                  className="mt-1 text-lg font-bold text-slate-950"
                >
                  AI gợi ý nội dung nghe
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Transcript chỉ được đưa vào form hiện tại; audio artifact vẫn
                  do quy trình Production audio xử lý.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsListeningContentAiOpen(false)}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
                aria-label="Đóng gợi ý nội dung nghe"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-4 flex-1 overflow-y-auto">
              {!listeningContentAiSuggestion ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
                  Nhấn “Tạo gợi ý” để tạo transcript theo loại {listeningMode()}
                  .
                </div>
              ) : listeningContentAiSuggestion.mode === "DICTATION" ? (
                <label className="text-sm font-semibold text-slate-700">
                  Transcript Dictation
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
                          aria-label={`Speaker lượt ${index + 1}`}
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
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:opacity-50"
              >
                {isListeningContentAiLoading && (
                  <Loader2 size={14} className="animate-spin" />
                )}{" "}
                {listeningContentAiSuggestion
                  ? "AI gợi ý lại"
                  : "AI gợi ý nội dung"}
              </button>
              {listeningContentAiSuggestion && (
                <button
                  type="button"
                  onClick={() => {
                    const suggestion = listeningContentAiSuggestion;
                    setQuestion((current) =>
                      suggestion.mode === "DICTATION"
                        ? {
                            ...current,
                            type: "DICTATION",
                            prompt: suggestion.text || "",
                          }
                        : {
                            ...current,
                            type: "DIALOGUE",
                            prompt: (suggestion.turns || [])
                              .map((turn) => turn.text)
                              .join(" "),
                            segments: suggestion.turns || [],
                          },
                    );
                    setIsListeningContentAiOpen(false);
                    toast.success(
                      "Đã áp dụng transcript vào biểu mẫu. Bạn có thể chỉnh sửa trước khi lưu.",
                    );
                  }}
                  className="min-h-10 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  Áp dụng vào form
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
                <p className="text-xs font-semibold uppercase tracking-[.14em] text-slate-500">
                  Review trước khi lưu
                </p>
                <h3
                  id="listening-questions-ai-title"
                  className="mt-1 text-lg font-bold text-slate-950"
                >
                  AI gợi ý câu hỏi nghe nháp
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Câu hỏi được tạo từ transcript hiện tại, không tự thêm vào
                  database.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsListeningQuestionsAiOpen(false)}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
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
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50"
              >
                {isListeningQuestionsAiLoading && (
                  <Loader2 size={14} className="animate-spin" />
                )}{" "}
                {listeningQuestionsAiCandidates.length
                  ? "AI gợi ý lại"
                  : "AI gợi ý câu hỏi nháp"}
              </button>
            </div>
            <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
              {listeningQuestionsAiCandidates.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
                  Nhập transcript ở form trước, sau đó nhấn “AI gợi ý câu hỏi
                  nháp”.
                </div>
              ) : (
                listeningQuestionsAiCandidates.map((candidate, index) => (
                  <article
                    key={index}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-xs font-semibold text-slate-500">
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
                        className="text-xs font-semibold text-slate-400 transition-colors hover:text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-300"
                      >
                        Bỏ qua
                      </button>
                    </div>
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
                            className={`my-2 h-7 w-7 shrink-0 rounded-md text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-300 ${candidate.correctIndex === optionIndex ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
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
                      aria-label={`English explanation câu nghe ${index + 1}`}
                      placeholder="Explanation in English"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setQuestion({
                          ...emptyQuestion("listening"),
                          type: "MULTIPLE_CHOICE",
                          prompt: candidate.prompt,
                          options: candidate.options.join("\n"),
                          correctIndex: String(candidate.correctIndex),
                          explanation: candidate.explanation,
                          explanationEn: candidate.explanationEn ?? "",
                        });
                        setIsAddingQuestion(true);
                        setIsListeningQuestionsAiOpen(false);
                        toast.success(
                          "Đã áp dụng câu hỏi nghe vào biểu mẫu. Bạn có thể chỉnh sửa trước khi thêm.",
                        );
                      }}
                      className="mt-3 min-h-10 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    >
                      Áp dụng vào form
                    </button>
                  </article>
                ))
              )}
            </div>
            <div className="mt-4 flex justify-end border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setIsListeningQuestionsAiOpen(false)}
                className="min-h-10 rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                Đóng
              </button>
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
                <p className="text-xs font-semibold uppercase tracking-[.14em] text-amber-700">
                  Gợi ý biên soạn
                </p>
                <h3
                  id="writing-ai-title"
                  className="mt-1 text-lg font-bold text-slate-950"
                >
                  AI gợi ý đề bài Writing
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Chỉ sinh nội dung chữ; ảnh của Picture Task vẫn do bạn
                  chọn/tải lên.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsWritingAiOpen(false)}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
                aria-label="Đóng gợi ý Writing"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
              {!writingAiSuggestion ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
                  Nhấn “Tạo gợi ý” để tạo đề bài theo task family hiện tại.
                </div>
              ) : (
                <>
                  <label className="text-sm font-semibold text-slate-700">
                    Task family
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
                    Keywords / câu mẫu
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
                      placeholder="Mỗi dòng một keyword hoặc câu mẫu"
                    />
                  </label>
                </>
              )}
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => void handleSuggestWritingTask()}
                disabled={isWritingAiLoading}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:opacity-50"
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
                      "Đã áp dụng đề bài vào form Writing. Bạn có thể chỉnh sửa trước khi lưu.",
                    );
                  }}
                  className="min-h-10 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  Áp dụng vào form
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
                <p className="text-xs text-slate-500 mt-0.5">
                  Tạo đoạn đọc nháp dựa trên chủ đề và trình độ; chỉ áp dụng vào
                  form, chưa lưu hay xuất bản.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPassageAiOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
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
                  placeholder="e.g. Workplace Technology, Remote Work, Environmental Protection"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 outline-none focus:border-slate-400"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">
                  Trình độ:{" "}
                  <span className="font-semibold text-slate-700">
                    {form.level || "A2"}
                  </span>
                </span>
                <button
                  type="button"
                  disabled={
                    isPassageAiLoading ||
                    (!passageAiTopic.trim() && !form.title.trim())
                  }
                  onClick={handleSuggestPassage}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
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
                    <span className="text-[10px] text-slate-500 font-medium">
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
                      Áp dụng vào form
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
                <p className="text-xs text-slate-500 mt-0.5">
                  Sinh câu hỏi từ đoạn đọc hiện có trong form; kết quả chỉ là
                  bản nháp cho đến khi bạn áp dụng và lưu.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsQuestionsAiOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
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
                disabled={isQuestionsAiLoading || !form.passage.trim()}
                onClick={handleSuggestReadingQuestions}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-1.5 font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                {isQuestionsAiLoading ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : null}
                {readingAiCandidates.length > 0
                  ? "AI gợi ý lại"
                  : "AI gợi ý câu hỏi nháp"}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-xs">
              {readingAiCandidates.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400">
                  Nhấn "AI gợi ý câu hỏi nháp" để AI đọc đoạn văn hiện tại và
                  sinh các câu hỏi trắc nghiệm A/B/C/D kèm giải thích.
                </div>
              ) : (
                readingAiCandidates.map((candidate, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-bold text-slate-800">
                        Câu {idx + 1}{" "}
                        {candidate.questionType
                          ? `• ${candidate.questionType}`
                          : ""}
                        :
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setReadingAiCandidates((prev) =>
                            prev.filter((_, i) => i !== idx),
                          )
                        }
                        className="text-slate-400 hover:text-rose-600 text-[11px]"
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
                              className={`h-5 w-5 rounded text-[11px] font-bold flex items-center justify-center ${
                                isCorrect
                                  ? "bg-emerald-600 text-white"
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
                              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">
                                Đúng
                              </span>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
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
                          setQuestion({
                            ...emptyQuestion("reading"),
                            prompt: candidate.prompt,
                            options: candidate.options.join("\n"),
                            correctIndex: String(candidate.correctIndex),
                            explanation: candidate.explanation,
                            questionType: candidate.questionType || "MAIN_IDEA",
                          });
                          setIsQuestionsAiOpen(false);
                          toast.success(
                            "Đã áp dụng câu hỏi vào form câu hỏi. Bạn có thể kiểm tra và bấm Thêm câu hỏi.",
                          );
                        }}
                        className="rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
                      >
                        Áp dụng vào form
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

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <CheckCircle2 className="mr-2 inline-block" size={16} /> Draft không
        xuất hiện trên learner API; publish chỉ chạy sau preflight domain.
      </div>
      <ConfirmDialog
        open={pendingPublicationStatus !== null}
        title={
          pendingPublicationStatus === "PUBLISHED"
            ? "Xuất bản nội dung?"
            : "Chuyển về bản nháp?"
        }
        description={
          pendingPublicationStatus === "PUBLISHED"
            ? "Nội dung đã đạt kiểm tra sẽ hiển thị cho học viên."
            : "Nội dung sẽ được ẩn khỏi học viên nhưng vẫn giữ nguyên trong CMS để tiếp tục chỉnh sửa."
        }
        confirmLabel={
          pendingPublicationStatus === "PUBLISHED"
            ? "Xuất bản"
            : "Chuyển về bản nháp"
        }
        isPending={busy}
        onConfirm={() => {
          if (pendingPublicationStatus) {
            void publish(pendingPublicationStatus).then(() =>
              setPendingPublicationStatus(null),
            );
          }
        }}
        onCancel={() => setPendingPublicationStatus(null)}
      />
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
    </main>
  );
}
