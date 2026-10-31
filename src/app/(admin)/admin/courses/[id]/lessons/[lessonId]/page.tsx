"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ChevronDown,
  Check,
  CheckCircle2,
  CircleAlert,
  Edit2,
  Eye,
  FileText,
  Image as ImageIcon,
  Loader2,
  Plus,
  Save,
  PanelRight,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import axiosClient from "@/lib/api/axiosClient";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import MediaSearchPanel from "@/components/admin/MediaSearchPanel";
import {
  LessonAudioExamplesBlock,
  LessonExampleCard,
} from "@/components/course/LessonContentBlocks";
import {
  normalizeSectionContent,
  sectionToFormState,
  swapAt,
  toSectionContentPayload,
} from "@/lib/course/sectionContent";

const SECTION_TYPES = [
  { value: "INTRO", label: "Mở đầu" },
  { value: "THEORY", label: "Lý thuyết" },
  { value: "EXAMPLE", label: "Ví dụ" },
  { value: "VOCABULARY", label: "Từ vựng" },
  { value: "GRAMMAR", label: "Ngữ pháp" },
  { value: "TIP", label: "Lưu ý" },
  { value: "COMMON_MISTAKE", label: "Lỗi thường gặp" },
  { value: "SUMMARY", label: "Tổng kết" },
];

const sectionTypeLabel = (value?: string) =>
  SECTION_TYPES.find((item) => item.value === value)?.label || "Nội dung";

const SECTION_AI_ACTIONS = [
  { value: "EXPAND", label: "Viết chi tiết hơn" },
  { value: "SIMPLIFY", label: "Đơn giản hóa" },
  { value: "ADD_EXAMPLES", label: "Thêm ví dụ" },
  { value: "KEY_POINTS", label: "Gợi ý ý chính" },
] as const;

/** Reuses the same learner-compatible example/audio cards as the learner
 * lesson runtime, so Admin Live Preview and Canvas previews show the real
 * visual language instead of a plainer placeholder. */
function SectionContentPreview({
  content,
  sectionId = "preview",
}: {
  content: unknown;
  sectionId?: string | number;
}) {
  const normalized = normalizeSectionContent(content);
  return (
    <div className="space-y-2.5 text-sm leading-relaxed text-slate-700">
      {normalized.paragraphs.map((paragraph, index) => (
        <p key={`${paragraph}-${index}`} className="whitespace-pre-line">
          {paragraph}
        </p>
      ))}
      {normalized.bullets.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 marker:text-slate-400">
          {normalized.bullets.map((bullet, index) => (
            <li key={`${bullet}-${index}`}>{bullet}</li>
          ))}
        </ul>
      )}
      {normalized.examples.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {normalized.examples.map((example, index) => (
            <LessonExampleCard
              key={`${sectionId}-example-${index}`}
              index={index}
              example={example}
            />
          ))}
        </div>
      )}
      <LessonAudioExamplesBlock
        sectionId={sectionId}
        audioExamples={normalized.audioExamples}
      />
    </div>
  );
}

export default function V5LessonEditorPage() {
  const params = useParams();
  const courseId = Number(params?.id);
  const lessonId = Number(params?.lessonId);

  const [lesson, setLesson] = useState<any | null>(null);
  const [courseTitle, setCourseTitle] = useState("");
  const [courseStatus, setCourseStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [isPublishConfirmOpen, setIsPublishConfirmOpen] = useState(false);
  const [isRevertConfirmOpen, setIsRevertConfirmOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "sections" | "exercises" | "info" | "preview"
  >("info");
  const [isAiMenuOpen, setIsAiMenuOpen] = useState(false);
  const [validation, setValidation] = useState<{
    valid: boolean;
    errors: string[];
  } | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [sectionInsertIndex, setSectionInsertIndex] = useState<number | null>(
    null,
  );

  // Lesson Info Form
  const [infoForm, setInfoForm] = useState({
    title: "",
    summary: "",
    learningObjectives: "",
    requiresFinalCheck: true,
  });
  const [aiCandidate, setAiCandidate] = useState<any | null>(null);
  const [aiSelection, setAiSelection] = useState({
    sections: true,
    guidedPractice: true,
    finalCheck: true,
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [sectionAiMenuOpenId, setSectionAiMenuOpenId] = useState<number | null>(
    null,
  );
  const [sectionRefineLoadingId, setSectionRefineLoadingId] = useState<
    number | null
  >(null);
  const [sectionRefineCandidate, setSectionRefineCandidate] = useState<{
    sectionId: number;
    originalHeading: string;
    action: "EXPAND" | "SIMPLIFY" | "ADD_EXAMPLES" | "KEY_POINTS";
    section: any;
  } | null>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [collapsedSectionIds, setCollapsedSectionIds] = useState<Set<number>>(
    new Set(),
  );

  // Section drawer
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<any | null>(null);
  const [sectionForm, setSectionForm] = useState({
    type: "THEORY",
    heading: "",
    text: "",
    bullets: [] as string[],
    examples: [] as Array<{
      text: string;
      translation: string;
      explanation: string;
    }>,
    audioExamples: [] as Array<{
      term: string;
      ipa: string;
      meaning: string;
      audioUrl: string;
      accent: string;
    }>,
    isRequired: true,
  });
  const [sectionEditorTab, setSectionEditorTab] = useState<"edit" | "preview">(
    "edit",
  );
  const [isSectionFormDirty, setIsSectionFormDirty] = useState(false);
  const [isSectionCloseConfirmOpen, setIsSectionCloseConfirmOpen] =
    useState(false);

  // Question Modal
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [targetExercise, setTargetExercise] = useState<any | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);
  const [questionForm, setQuestionForm] = useState({
    prompt: "",
    optA: "",
    optB: "",
    optC: "",
    optD: "",
    correctAnswer: "A",
    explanation: "",
  });

  // Delete Confirmations
  const [pendingDeleteSection, setPendingDeleteSection] = useState<{
    id: number;
    heading: string;
  } | null>(null);
  const [pendingDeleteQuestion, setPendingDeleteQuestion] = useState<{
    exerciseId: number;
    questionId: number;
    prompt: string;
  } | null>(null);
  const [pendingDeleteExercise, setPendingDeleteExercise] = useState<{
    id: number;
    title: string;
  } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data: any = await axiosClient.get(
        `/admin/courses/${courseId}/studio`,
      );
      setCourseTitle(data.course?.title || "");
      setCourseStatus(data.course?.status || "");
      const found = data.lessons?.find((l: any) => l.id === lessonId);
      if (found) {
        setLesson(found);
        setInfoForm({
          title: found.title || "",
          summary: found.summary || "",
          learningObjectives: Array.isArray(found.learningObjectives)
            ? found.learningObjectives.join("\n")
            : "",
          requiresFinalCheck: found.requiresFinalCheck !== false,
        });
        setHasUnsavedChanges(false);
      }
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Không thể tải thông tin bài học."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseId && lessonId) void load();
  }, [courseId, lessonId]);

  useEffect(() => {
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges && !aiCandidate) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [aiCandidate, hasUnsavedChanges]);

  // SAVE LESSON INFO
  const saveLessonInfo = async () => {
    if (!infoForm.title.trim()) {
      toast.error("Vui lòng nhập tên bài học.");
      return;
    }
    setBusy(true);
    try {
      await axiosClient.patch(
        `/admin/courses/${courseId}/studio/lessons/${lessonId}`,
        {
          title: infoForm.title.trim(),
          summary: infoForm.summary.trim(),
          learningObjectives: infoForm.learningObjectives
            .split("\n")
            .map((x) => x.trim())
            .filter(Boolean),
          requiresFinalCheck: infoForm.requiresFinalCheck,
        },
      );
      toast.success("Đã lưu thông tin bài học!");
      setHasUnsavedChanges(false);
      await load();
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Lưu thông tin thất bại."));
    } finally {
      setBusy(false);
    }
  };

  const generateAiContent = async (
    scope:
      | "FULL"
      | "SECTIONS"
      | "GUIDED_PRACTICE"
      | "FINAL_CHECK"
      | "IMPROVE_SECTIONS" = "FULL",
  ) => {
    setIsAiMenuOpen(false);
    setAiLoading(true);
    try {
      const response: any = await axiosClient.post(
        `/admin/courses/${courseId}/studio/lessons/${lessonId}/ai/content/generate`,
        { scope },
      );
      const data = response?.data || response;
      if (!data?.candidate) throw new Error("missing candidate");
      setAiCandidate(data.candidate);
      setAiSelection({
        sections: Boolean(data.candidate.sections?.length),
        guidedPractice: Boolean(data.candidate.guidedPractice),
        finalCheck: Boolean(data.candidate.finalCheck),
      });
      setHasUnsavedChanges(false);
      toast.success("Đã tạo nội dung nháp. Hãy xem lại trước khi áp dụng.");
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Không thể tạo nội dung AI lúc này."));
    } finally {
      setAiLoading(false);
    }
  };

  const applyAiContent = async () => {
    if (!aiCandidate) return;
    const selectedCandidate = {
      candidateCourseId: aiCandidate.candidateCourseId,
      candidateLessonId: aiCandidate.candidateLessonId,
      ...(aiSelection.sections ? { sections: aiCandidate.sections || [] } : {}),
      ...(aiSelection.guidedPractice
        ? { guidedPractice: aiCandidate.guidedPractice }
        : {}),
      ...(aiSelection.finalCheck ? { finalCheck: aiCandidate.finalCheck } : {}),
    };
    if (
      !selectedCandidate.sections?.length &&
      !selectedCandidate.guidedPractice &&
      !selectedCandidate.finalCheck
    ) {
      toast.error("Hãy chọn ít nhất một phần đề xuất để áp dụng.");
      return;
    }
    setBusy(true);
    try {
      await axiosClient.post(
        `/admin/courses/${courseId}/studio/lessons/${lessonId}/ai/content/apply`,
        selectedCandidate,
      );
      toast.success("Đã áp dụng nội dung AI vào Lesson Draft.");
      setAiCandidate(null);
      setHasUnsavedChanges(false);
      await load();
    } catch (e) {
      toast.error(
        getApiErrorMessage(e, "Không thể áp dụng nội dung AI vào Draft."),
      );
    } finally {
      setBusy(false);
    }
  };

  // SECTION-LEVEL AI ASSIST — candidate-only; never mutates the Draft directly.
  const refineSection = async (
    section: any,
    action: "EXPAND" | "SIMPLIFY" | "ADD_EXAMPLES" | "KEY_POINTS",
  ) => {
    setSectionAiMenuOpenId(null);
    setSectionRefineLoadingId(section.id);
    try {
      const response: any = await axiosClient.post(
        `/admin/courses/${courseId}/studio/lessons/${lessonId}/ai/sections/${section.id}/refine`,
        { action },
      );
      const data = response?.data || response;
      const suggestion = data?.candidate?.sections?.[0];
      if (!suggestion) throw new Error("missing candidate");
      setSectionRefineCandidate({
        sectionId: section.id,
        originalHeading: section.heading,
        action,
        section: suggestion,
      });
      toast.success(
        "Đã tạo đề xuất AI cho mục này. Hãy xem lại trước khi áp dụng.",
      );
    } catch (e) {
      toast.error(
        getApiErrorMessage(e, "Không thể tạo đề xuất AI cho mục này."),
      );
    } finally {
      setSectionRefineLoadingId(null);
    }
  };

  const applySectionRefine = async () => {
    if (!sectionRefineCandidate) return;
    setBusy(true);
    try {
      await axiosClient.post(
        `/admin/courses/${courseId}/studio/lessons/${lessonId}/ai/content/apply`,
        {
          candidateCourseId: courseId,
          candidateLessonId: lessonId,
          sections: [sectionRefineCandidate.section],
        },
      );
      toast.success("Đã áp dụng đề xuất AI cho mục này.");
      setSectionRefineCandidate(null);
      await load();
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Không thể áp dụng đề xuất AI."));
    } finally {
      setBusy(false);
    }
  };

  // PUBLISH LESSON
  const publishLesson = async () => {
    setBusy(true);
    try {
      await axiosClient.post(
        `/admin/courses/${courseId}/studio/lessons/${lessonId}/publish`,
      );
      toast.success("Đã xuất bản bài học thành công!");
      setIsPublishConfirmOpen(false);
      await load();
    } catch (e) {
      toast.error(
        getApiErrorMessage(
          e,
          "Bài học chưa đủ điều kiện xuất bản (cần ít nhất 1 section và Final Check).",
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  const revertLessonToDraft = async () => {
    setBusy(true);
    try {
      await axiosClient.post(
        `/admin/courses/${courseId}/studio/lessons/${lessonId}/revert-to-draft`,
      );
      toast.success("Bài học đã được chuyển về bản nháp.");
      setIsRevertConfirmOpen(false);
      await load();
    } catch (e) {
      toast.error(
        getApiErrorMessage(e, "Không thể chuyển bài học về bản nháp."),
      );
    } finally {
      setBusy(false);
    }
  };

  const validateLesson = async () => {
    setBusy(true);
    try {
      const result: any = await axiosClient.get(
        `/admin/courses/${courseId}/studio/lessons/${lessonId}/validate`,
      );
      setValidation({
        valid: Boolean(result.valid),
        errors: result.errors || [],
      });
      if (result.valid) toast.success("Bài học đã sẵn sàng để xuất bản.");
      else toast.error("Bài học chưa đủ điều kiện xuất bản.");
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Không thể kiểm tra bài học."));
    } finally {
      setBusy(false);
    }
  };

  // SECTION ACTIONS
  const openAddSection = (insertIndex: number | null = null) => {
    setEditingSection(null);
    setSectionForm({
      type: "THEORY",
      heading: "",
      text: "",
      bullets: [],
      examples: [],
      audioExamples: [],
      isRequired: true,
    });
    setSectionInsertIndex(insertIndex);
    setSectionEditorTab("edit");
    setIsSectionFormDirty(false);
    setIsSectionModalOpen(true);
  };

  const openEditSection = (s: any) => {
    setEditingSection(s);
    setSectionForm(sectionToFormState(s));
    setSectionInsertIndex(null);
    setSectionEditorTab("edit");
    setIsSectionFormDirty(false);
    setIsSectionModalOpen(true);
  };

  /** Patches the section draft form and marks it dirty so a close attempt
   * can confirm before discarding edits. */
  const patchSectionForm = (patch: Partial<typeof sectionForm>) => {
    setIsSectionFormDirty(true);
    setSectionForm((current) => ({ ...current, ...patch }));
  };

  const requestCloseSectionModal = () => {
    if (isSectionFormDirty) {
      setIsSectionCloseConfirmOpen(true);
      return;
    }
    setIsSectionModalOpen(false);
  };

  const discardSectionModal = () => {
    setIsSectionCloseConfirmOpen(false);
    setIsSectionModalOpen(false);
  };

  const saveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionForm.heading.trim() || !sectionForm.text.trim()) {
      toast.error("Vui lòng nhập tiêu đề và nội dung section.");
      return;
    }

    setBusy(true);
    try {
      const content = toSectionContentPayload(
        {
          paragraphs: sectionForm.text
            .split(/\n{2,}/)
            .map((value) => value.trim())
            .filter(Boolean),
          bullets: sectionForm.bullets,
          examples: sectionForm.examples,
          audioExamples: sectionForm.audioExamples,
        },
        editingSection ? editingSection.content : undefined,
      );
      if (editingSection) {
        await axiosClient.patch(
          `/admin/courses/${courseId}/studio/lessons/${lessonId}/sections/${editingSection.id}`,
          {
            type: sectionForm.type,
            heading: sectionForm.heading.trim(),
            content,
            isRequired: sectionForm.isRequired,
          },
        );
        toast.success("Đã cập nhật mục nội dung!");
      } else {
        await axiosClient.post(
          `/admin/courses/${courseId}/studio/lessons/${lessonId}/sections`,
          {
            type: sectionForm.type,
            heading: sectionForm.heading.trim(),
            content,
            isRequired: sectionForm.isRequired,
            order: sectionInsertIndex ?? (lesson?.sections?.length || 0),
          },
        );
        toast.success("Đã thêm mục nội dung mới!");
      }
      setIsSectionFormDirty(false);
      setIsSectionModalOpen(false);
      setHasUnsavedChanges(false);
      await load();
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Lưu section thất bại."));
    } finally {
      setBusy(false);
    }
  };

  const reorderSection = async (index: number, direction: "up" | "down") => {
    if (!lesson?.sections) return;
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= lesson.sections.length) return;

    const newSections = [...lesson.sections];
    const [moved] = newSections.splice(index, 1);
    newSections.splice(targetIdx, 0, moved);

    setBusy(true);
    try {
      await axiosClient.patch(
        `/admin/courses/${courseId}/studio/lessons/${lessonId}/sections/reorder`,
        { ids: newSections.map((s) => s.id) },
      );
      toast.success("Đã cập nhật thứ tự section");
      await load();
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Không thể đổi thứ tự section."));
    } finally {
      setBusy(false);
    }
  };

  const deleteSection = async () => {
    if (!pendingDeleteSection) return;
    setBusy(true);
    try {
      await axiosClient.delete(
        `/admin/courses/${courseId}/studio/lessons/${lessonId}/sections/${pendingDeleteSection.id}`,
      );
      toast.success("Đã xóa mục nội dung!");
      setPendingDeleteSection(null);
      await load();
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Xóa section thất bại."));
    } finally {
      setBusy(false);
    }
  };

  const uploadLessonImage = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type)) {
      toast.error("Chỉ hỗ trợ ảnh PNG, JPG hoặc WEBP.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Kích thước ảnh không được vượt quá 10MB.");
      return;
    }
    setMediaUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploaded: any = await axiosClient.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = uploaded?.url || uploaded?.data?.url;
      if (!url) throw new Error("missing media url");
      await axiosClient.post(
        `/admin/courses/${courseId}/studio/lessons/${lessonId}/media`,
        {
          type: "image",
          url,
          altText: lesson?.title || "Hình minh họa bài học",
          provenance: "manual-upload",
        },
      );
      toast.success("Đã thêm hình minh họa cho bài học.");
      await load();
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Không thể tải hình minh họa."));
    } finally {
      setMediaUploading(false);
      if (mediaInputRef.current) mediaInputRef.current.value = "";
    }
  };

  const removeLessonMedia = async (mediaId: number) => {
    setBusy(true);
    try {
      await axiosClient.delete(
        `/admin/courses/${courseId}/studio/lessons/${lessonId}/media/${mediaId}`,
      );
      toast.success("Đã xóa hình minh họa.");
      await load();
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Không thể xóa hình minh họa."));
    } finally {
      setBusy(false);
    }
  };

  // EXERCISE ACTIONS
  const createStandardExercise = async (
    slug: "guided-practice" | "final-check",
  ) => {
    const isFinal = slug === "final-check";
    setBusy(true);
    try {
      await axiosClient.post(
        `/admin/courses/${courseId}/studio/lessons/${lessonId}/exercises`,
        {
          slug,
          type: "MULTIPLE_CHOICE",
          title: isFinal
            ? "Kiểm tra cuối bài (Final Check)"
            : "Luyện tập có hướng dẫn (Guided Practice)",
          prompt: isFinal
            ? "Hoàn thành các câu hỏi sau để kiểm tra mức độ nắm vững bài học."
            : "Thực hành ngay các kiến thức vừa học qua các câu hỏi củng cố.",
          content: {},
          required: true,
          order: isFinal ? 1 : 0,
        },
      );
      toast.success(
        isFinal ? "Đã khởi tạo Final Check" : "Đã khởi tạo Guided Practice",
      );
      await load();
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Không thể tạo bài luyện tập."));
    } finally {
      setBusy(false);
    }
  };

  const deleteExercise = async () => {
    if (!pendingDeleteExercise) return;
    setBusy(true);
    try {
      await axiosClient.delete(
        `/admin/courses/${courseId}/studio/lessons/${lessonId}/exercises/${pendingDeleteExercise.id}`,
      );
      toast.success("Đã xóa bài luyện tập!");
      setPendingDeleteExercise(null);
      await load();
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Xóa bài luyện tập thất bại."));
    } finally {
      setBusy(false);
    }
  };

  // QUESTION ACTIONS
  const openAddQuestion = (ex: any) => {
    setTargetExercise(ex);
    setEditingQuestion(null);
    setQuestionForm({
      prompt: "",
      optA: "",
      optB: "",
      optC: "",
      optD: "",
      correctAnswer: "A",
      explanation: "",
    });
    setIsQuestionModalOpen(true);
  };

  const openEditQuestion = (ex: any, q: any) => {
    setTargetExercise(ex);
    setEditingQuestion(q);
    const opts = Array.isArray(q.options) ? q.options : [];
    let correctLetter = "A";
    if (typeof q.correctAnswer === "string") {
      const ca = q.correctAnswer.trim();
      if (["A", "B", "C", "D"].includes(ca.toUpperCase())) {
        correctLetter = ca.toUpperCase();
      } else {
        const idx = opts.findIndex((o: any) => o === ca);
        if (idx >= 0) correctLetter = String.fromCharCode(65 + idx);
      }
    }
    setQuestionForm({
      prompt: q.prompt || "",
      optA: opts[0] || "",
      optB: opts[1] || "",
      optC: opts[2] || "",
      optD: opts[3] || "",
      correctAnswer: correctLetter,
      explanation: q.explanation || "",
    });
    setIsQuestionModalOpen(true);
  };

  const saveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetExercise) return;
    if (!questionForm.prompt.trim()) {
      toast.error("Vui lòng nhập nội dung câu hỏi.");
      return;
    }
    const options = [
      questionForm.optA.trim(),
      questionForm.optB.trim(),
      questionForm.optC.trim(),
      questionForm.optD.trim(),
    ].filter(Boolean);

    if (options.length < 2) {
      toast.error("Vui lòng nhập ít nhất 2 phương án lựa chọn.");
      return;
    }

    const correctIdx = ["A", "B", "C", "D"].indexOf(questionForm.correctAnswer);
    const chosenAnswer = options[correctIdx] || options[0];

    setBusy(true);
    try {
      if (editingQuestion) {
        await axiosClient.patch(
          `/admin/courses/${courseId}/studio/lessons/${lessonId}/exercises/${targetExercise.id}/questions/${editingQuestion.id}`,
          {
            prompt: questionForm.prompt.trim(),
            options,
            correctAnswer: chosenAnswer,
            explanation:
              questionForm.explanation.trim() || "Chưa có giải thích chi tiết.",
          },
        );
        toast.success("Đã cập nhật câu hỏi!");
      } else {
        await axiosClient.post(
          `/admin/courses/${courseId}/studio/lessons/${lessonId}/exercises/${targetExercise.id}/questions`,
          {
            prompt: questionForm.prompt.trim(),
            options,
            correctAnswer: chosenAnswer,
            explanation:
              questionForm.explanation.trim() || "Chưa có giải thích chi tiết.",
            order: targetExercise.questions?.length || 0,
          },
        );
        toast.success("Đã thêm câu hỏi mới!");
      }
      setIsQuestionModalOpen(false);
      await load();
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Lưu câu hỏi thất bại."));
    } finally {
      setBusy(false);
    }
  };

  const deleteQuestion = async () => {
    if (!pendingDeleteQuestion) return;
    setBusy(true);
    try {
      await axiosClient.delete(
        `/admin/courses/${courseId}/studio/lessons/${lessonId}/exercises/${pendingDeleteQuestion.exerciseId}/questions/${pendingDeleteQuestion.questionId}`,
      );
      toast.success("Đã xóa câu hỏi!");
      setPendingDeleteQuestion(null);
      await load();
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Xóa câu hỏi thất bại."));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto flex min-h-64 max-w-5xl items-center justify-center p-8">
        <Loader2 className="animate-spin text-slate-500" size={32} />
      </main>
    );
  }

  if (!lesson) {
    return (
      <main className="mx-auto max-w-5xl p-8 text-center text-slate-500">
        Không tìm thấy bài học.
      </main>
    );
  }

  const guidedPractice = lesson.exercises?.find(
    (x: any) => x.slug === "guided-practice",
  );
  const finalCheck = lesson.exercises?.find(
    (x: any) => x.slug === "final-check",
  );
  const isReadOnly =
    courseStatus === "PUBLISHED" || lesson.status === "PUBLISHED";

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      {/* HEADER */}
      <div className="sticky top-0 z-20 -mx-4 border-b border-slate-200 bg-slate-50/95 px-4 py-4 backdrop-blur md:-mx-8 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href={`/admin/courses/${courseId}/curriculum`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft size={14} /> Trở về:{" "}
              {courseTitle || "Chương trình học"}
            </Link>
            <div className="mt-2 flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">
                {lesson.title}
              </h1>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  lesson.status === "PUBLISHED"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
              >
                {lesson.status === "PUBLISHED" ? "Đã xuất bản" : "Bản nháp"}
              </span>
            </div>
            <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
              <span>
                {lesson.sections?.length || 0} mục nội dung ·{" "}
                {lesson.exercises?.length || 0} bài luyện tập
              </span>
              <span
                aria-live="polite"
                className={
                  hasUnsavedChanges
                    ? "font-semibold text-amber-700"
                    : "text-emerald-700"
                }
              >
                {hasUnsavedChanges ? "Có thay đổi chưa lưu" : "Đã lưu"}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsAiMenuOpen((open) => !open)}
                disabled={busy || aiLoading || isReadOnly}
                aria-expanded={isAiMenuOpen}
                aria-haspopup="menu"
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2 text-sm font-semibold text-amber-900 transition-colors hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:opacity-50"
              >
                {aiLoading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <PanelRight size={15} />
                )}
                AI hỗ trợ <ChevronDown size={14} aria-hidden="true" />
              </button>
              {isAiMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-lg"
                >
                  <p className="px-2 py-2 text-xs leading-relaxed text-slate-500">
                    {lesson.sections?.length && guidedPractice && finalCheck
                      ? "Bài học đã có nội dung và bài tập. Chỉ tạo đề xuất mới khi bạn muốn bổ sung một phần cụ thể."
                      : "AI tạo đề xuất để bạn xem lại trước khi áp dụng vào bản nháp."}
                  </p>
                  {!lesson.sections?.length && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => void generateAiContent("FULL")}
                      className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-800 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none"
                    >
                      Hoàn thiện bài học
                    </button>
                  )}
                  {!lesson.sections?.length && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => void generateAiContent("SECTIONS")}
                      className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none"
                    >
                      Gợi ý nội dung bài học
                    </button>
                  )}
                  {Boolean(lesson.sections?.length) && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => void generateAiContent("IMPROVE_SECTIONS")}
                      className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none"
                    >
                      Cải thiện nội dung bài học
                    </button>
                  )}
                  {!guidedPractice && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => void generateAiContent("GUIDED_PRACTICE")}
                      className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none"
                    >
                      Tạo Luyện tập có hướng dẫn
                    </button>
                  )}
                  {!finalCheck && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => void generateAiContent("FINAL_CHECK")}
                      className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none"
                    >
                      Tạo Kiểm tra cuối bài
                    </button>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsAiMenuOpen(false);
                      document.getElementById("lesson-media")?.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                    }}
                    className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none"
                  >
                    Tải ảnh minh họa riêng
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <Eye size={15} /> Xem trước
            </button>
            <button
              type="button"
              onClick={() => void validateLesson()}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <CheckCircle2 size={15} /> Kiểm tra
            </button>
            {lesson.status === "PUBLISHED" ? (
              <button
                type="button"
                onClick={() => setIsRevertConfirmOpen(true)}
                disabled={busy || courseStatus === "PUBLISHED"}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
              >
                <Edit2 size={15} /> Chuyển về bản nháp
              </button>
            ) : (
              <button
                onClick={() => setIsPublishConfirmOpen(true)}
                disabled={busy || courseStatus === "PUBLISHED"}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                <Check size={15} /> Xuất bản bài học
              </button>
            )}
          </div>
        </div>

        {isReadOnly && (
          <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {courseStatus === "PUBLISHED"
              ? "Khóa học đang được xuất bản. Hãy chuyển khóa học về bản nháp trước khi chỉnh sửa bài học."
              : "Bài học đang được xuất bản và ở chế độ chỉ đọc. Chuyển về bản nháp để chỉnh sửa nội dung, bài tập hoặc ảnh."}
          </section>
        )}
      </div>

      {validation && (
        <section
          aria-live="polite"
          className={`rounded-xl border p-4 ${validation.valid ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}
        >
          <div className="flex items-start gap-3">
            {validation.valid ? (
              <CheckCircle2 className="mt-0.5 text-emerald-700" size={18} />
            ) : (
              <CircleAlert className="mt-0.5 text-amber-700" size={18} />
            )}
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {validation.valid ? "Sẵn sàng xuất bản" : "Chưa thể xuất bản"}
              </h2>
              <p className="mt-1 text-sm text-slate-700">
                {validation.valid
                  ? "Có nội dung, bài luyện tập và đáp án hợp lệ. Ảnh minh họa là tùy chọn."
                  : "Hãy hoàn thiện các mục bên dưới trước khi xuất bản."}
              </p>
              {!validation.valid && (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                  {validation.errors.map((error, index) => (
                    <li key={`${error}-${index}`}>{error}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      )}

      {aiCandidate && (
        <section
          className="rounded-xl border border-amber-200 bg-amber-50/50 p-5 shadow-xs"
          aria-label="Review nội dung AI"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-amber-800">
                Đề xuất AI · chưa áp dụng
              </p>
              <h2 className="mt-1 text-base font-bold text-slate-900">
                Review nội dung bài học
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Chọn phần cần áp dụng. Nội dung chỉ được ghi vào bản nháp sau
                khi bạn xác nhận.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAiCandidate(null)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
              >
                Hủy đề xuất
              </button>
              <button
                type="button"
                onClick={() => void applyAiContent()}
                disabled={busy}
                className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                Áp dụng đã chọn
              </button>
            </div>
          </div>
          {Array.isArray(aiCandidate.warnings) &&
            aiCandidate.warnings.length > 0 && (
              <div className="mt-4 rounded-xl border border-amber-300 bg-white p-3">
                <p className="text-xs font-bold text-amber-800">
                  Ghi chú rà soát (không chặn việc áp dụng)
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                  {aiCandidate.warnings.map(
                    (warning: string, index: number) => (
                      <li key={`${warning}-${index}`}>{warning}</li>
                    ),
                  )}
                </ul>
              </div>
            )}
          {aiCandidate.pedagogyPlan && (
            <details className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
              <summary className="cursor-pointer text-xs font-bold text-slate-700">
                Kế hoạch sư phạm (tham khảo, không hiển thị cho học viên)
              </summary>
              <div className="mt-2 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
                {(
                  [
                    ["keyConcepts", "Ý chính"],
                    ["realWorldContexts", "Bối cảnh thực tế"],
                    ["commonMistakes", "Lỗi thường gặp"],
                    ["practiceCoverage", "Phần luyện tập bao phủ"],
                  ] as const
                ).map(([key, label]) => {
                  const items = aiCandidate.pedagogyPlan?.[key];
                  if (!Array.isArray(items) || !items.length) return null;
                  return (
                    <div key={key}>
                      <p className="text-xs font-semibold text-slate-500">
                        {label}
                      </p>
                      <ul className="mt-1 list-disc space-y-0.5 pl-4">
                        {items.map((item: string, index: number) => (
                          <li key={`${item}-${index}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </details>
          )}
          <div className="mt-4 space-y-3">
            {(aiCandidate.sections || []).map((section: any, index: number) => (
              <div
                key={`${section.heading}-${index}`}
                className="rounded-xl border border-slate-200 bg-white p-3"
              >
                {index === 0 && (
                  <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <input
                      type="checkbox"
                      checked={aiSelection.sections}
                      onChange={(event) =>
                        setAiSelection((current) => ({
                          ...current,
                          sections: event.target.checked,
                        }))
                      }
                    />
                    Áp dụng nội dung bài học ({aiCandidate.sections.length} mục)
                  </label>
                )}
                <div className="flex items-center justify-between gap-2">
                  <input
                    value={section.heading || ""}
                    onChange={(event) =>
                      setAiCandidate((current: any) => ({
                        ...current,
                        sections: current.sections.map(
                          (item: any, itemIndex: number) =>
                            itemIndex === index
                              ? { ...item, heading: event.target.value }
                              : item,
                        ),
                      }))
                    }
                    className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm font-semibold"
                    aria-label={`Tên section AI ${index + 1}`}
                  />
                  {section.sectionId && (
                    <span className="shrink-0 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                      Cập nhật mục hiện có
                    </span>
                  )}
                </div>
                <textarea
                  value={section.content || ""}
                  onChange={(event) =>
                    setAiCandidate((current: any) => ({
                      ...current,
                      sections: current.sections.map(
                        (item: any, itemIndex: number) =>
                          itemIndex === index
                            ? { ...item, content: event.target.value }
                            : item,
                      ),
                    }))
                  }
                  className="mt-2 min-h-20 w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
                  aria-label={`Nội dung section AI ${index + 1}`}
                />
                {(Boolean(section.bullets?.length) ||
                  Boolean(section.examples?.length)) && (
                  <div className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
                    {Boolean(section.bullets?.length) && (
                      <p>
                        {section.bullets.length} ý chính:{" "}
                        {section.bullets.join(" · ")}
                      </p>
                    )}
                    {Boolean(section.examples?.length) && (
                      <p className="mt-1">
                        {section.examples.length} ví dụ:{" "}
                        {section.examples
                          .map((example: any) => example.text)
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
            {(
              [
                ["guidedPractice", "Luyện tập có hướng dẫn"],
                ["finalCheck", "Kiểm tra cuối bài"],
              ] as const
            ).map(([key, label]) => {
              const exercise = aiCandidate[key];
              if (!exercise) return null;
              return (
                <div
                  key={key}
                  className="rounded-xl border border-slate-200 bg-white p-3"
                >
                  <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <input
                      type="checkbox"
                      checked={
                        key === "guidedPractice"
                          ? aiSelection.guidedPractice
                          : aiSelection.finalCheck
                      }
                      onChange={(event) =>
                        setAiSelection((current) => ({
                          ...current,
                          [key]: event.target.checked,
                        }))
                      }
                    />
                    Áp dụng {label}
                  </label>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-teal-700">
                    {label}
                  </p>
                  <input
                    value={exercise.title || ""}
                    onChange={(event) =>
                      setAiCandidate((current: any) => ({
                        ...current,
                        [key]: { ...current[key], title: event.target.value },
                      }))
                    }
                    className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm font-semibold"
                    aria-label={`Tiêu đề ${label}`}
                  />
                  <div className="mt-3 space-y-2">
                    {(exercise.questions || []).map(
                      (question: any, index: number) => (
                        <textarea
                          key={`${key}-${index}`}
                          value={question.prompt || ""}
                          onChange={(event) =>
                            setAiCandidate((current: any) => ({
                              ...current,
                              [key]: {
                                ...current[key],
                                questions: current[key].questions.map(
                                  (item: any, itemIndex: number) =>
                                    itemIndex === index
                                      ? { ...item, prompt: event.target.value }
                                      : item,
                                ),
                              },
                            }))
                          }
                          className="min-h-16 w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
                          aria-label={`${label} câu ${index + 1}`}
                        />
                      ),
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* NAVIGATION TABS */}
      <div className="flex gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab("info")}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
            activeTab === "info"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Thông tin bài học
        </button>
        <button
          onClick={() => setActiveTab("sections")}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
            activeTab === "sections"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Nội dung bài học ({lesson.sections?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("exercises")}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
            activeTab === "exercises"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Bài luyện tập ({lesson.exercises?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("preview")}
          className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
            activeTab === "preview"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Eye size={14} /> Xem trước bài học
        </button>
      </div>

      {/* TAB 1: SECTIONS */}
      {activeTab === "sections" && (
        <section
          className={`space-y-4 ${isReadOnly ? "pointer-events-none opacity-60" : ""}`}
        >
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_12rem]">
            <div className="space-y-4">
              <section
                id="lesson-media"
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Ảnh đại diện bài học
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      Tùy chọn. Dùng khi bài học cần một hình minh họa chung. Hỗ
                      trợ PNG, JPG và WEBP.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => mediaInputRef.current?.click()}
                    disabled={busy || mediaUploading || isReadOnly}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {mediaUploading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Upload size={14} />
                    )}{" "}
                    {mediaUploading ? "Đang tải..." : "Tải ảnh"}
                  </button>
                  <input
                    ref={mediaInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={uploadLessonImage}
                    disabled={busy || mediaUploading || isReadOnly}
                  />
                </div>
                {lesson.media?.length > 0 ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {lesson.media.map((media: any) => (
                      <figure
                        key={media.id}
                        className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                      >
                        <img
                          src={media.url}
                          alt={media.altText || "Hình minh họa bài học"}
                          className="aspect-video w-full object-cover"
                        />
                        <figcaption className="flex items-center justify-between gap-2 p-2">
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                            <ImageIcon size={13} /> Hình minh họa
                          </span>
                          <button
                            type="button"
                            onClick={() => void removeLessonMedia(media.id)}
                            disabled={busy || isReadOnly}
                            className="text-xs font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-50"
                          >
                            Xóa
                          </button>
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-slate-500">
                    Chưa có hình minh họa. Đây là phần tùy chọn.
                  </p>
                )}
                {!isReadOnly && (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <MediaSearchPanel
                      searchUrl={`/admin/courses/${courseId}/studio/lessons/${lessonId}/media/search`}
                      acceptUrl={`/admin/courses/${courseId}/studio/lessons/${lessonId}/media/accept`}
                      generateUrl={`/admin/courses/${courseId}/studio/lessons/${lessonId}/media/generate`}
                      generateAcceptUrl={`/admin/courses/${courseId}/studio/lessons/${lessonId}/media/generate/accept`}
                      onAccepted={() => void load()}
                      onUploadInstead={() => mediaInputRef.current?.click()}
                    />
                  </div>
                )}
              </section>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Nội dung bài học
                  </h2>
                  <p className="text-xs text-slate-500">
                    Soạn nội dung theo đúng thứ tự học viên sẽ trải nghiệm.
                  </p>
                </div>
                <button
                  onClick={() => openAddSection()}
                  disabled={isReadOnly}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
                >
                  <Plus size={14} /> Thêm nội dung
                </button>
              </div>

              <div className="space-y-3">
                {lesson.sections?.length > 0 && (
                  <button
                    type="button"
                    onClick={() => openAddSection(0)}
                    disabled={isReadOnly}
                    className="flex w-full items-center gap-2 py-1 text-xs font-semibold text-slate-500 before:h-px before:flex-1 before:bg-slate-200 after:h-px after:flex-1 after:bg-slate-200 hover:text-slate-800 disabled:opacity-50"
                    aria-label="Thêm nội dung trước mục đầu tiên"
                  >
                    <Plus size={14} /> Thêm nội dung
                  </button>
                )}
                {lesson.sections && lesson.sections.length > 0 ? (
                  lesson.sections.map((s: any, idx: number) => {
                    return (
                      <React.Fragment key={s.id}>
                        <div
                          id={`section-${s.id}`}
                          className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="flex h-6 w-6 items-center justify-center rounded bg-slate-100 text-xs font-bold text-slate-700">
                                #{idx + 1}
                              </span>
                              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                                {sectionTypeLabel(s.type)}
                              </span>
                              <h3 className="text-sm font-bold text-slate-900">
                                {s.heading}
                              </h3>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => reorderSection(idx, "up")}
                                disabled={idx === 0 || busy}
                                title="Di chuyển lên"
                                className="rounded border border-slate-200 p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                              >
                                <ArrowUp size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => reorderSection(idx, "down")}
                                disabled={
                                  idx === lesson.sections.length - 1 || busy
                                }
                                title="Di chuyển xuống"
                                className="rounded border border-slate-200 p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                              >
                                <ArrowDown size={13} />
                              </button>
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSectionAiMenuOpenId((current) =>
                                      current === s.id ? null : s.id,
                                    )
                                  }
                                  disabled={
                                    busy || sectionRefineLoadingId === s.id
                                  }
                                  aria-expanded={sectionAiMenuOpenId === s.id}
                                  aria-haspopup="menu"
                                  className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                                >
                                  {sectionRefineLoadingId === s.id ? (
                                    <Loader2
                                      size={12}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <PanelRight size={12} />
                                  )}
                                  AI hỗ trợ
                                </button>
                                {sectionAiMenuOpenId === s.id && (
                                  <div
                                    role="menu"
                                    className="absolute right-0 top-[calc(100%+0.25rem)] z-20 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
                                  >
                                    {SECTION_AI_ACTIONS.map((action) => (
                                      <button
                                        key={action.value}
                                        type="button"
                                        role="menuitem"
                                        onClick={() =>
                                          void refineSection(s, action.value)
                                        }
                                        className="w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none"
                                      >
                                        {action.label}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => openEditSection(s)}
                                className="inline-flex items-center gap-1 rounded border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                              >
                                <Edit2 size={12} /> Sửa
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setPendingDeleteSection({
                                    id: s.id,
                                    heading: s.heading,
                                  })
                                }
                                className="rounded border border-slate-200 p-1 text-slate-400 hover:text-rose-600 hover:border-rose-200"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          {(() => {
                            const normalized = normalizeSectionContent(
                              s.content,
                            );
                            const isCollapsed = collapsedSectionIds.has(s.id);
                            const counts = [
                              normalized.paragraphs.length
                                ? `${normalized.paragraphs.length} đoạn văn`
                                : null,
                              normalized.bullets.length
                                ? `${normalized.bullets.length} ý chính`
                                : null,
                              normalized.examples.length
                                ? `${normalized.examples.length} ví dụ`
                                : null,
                            ].filter(Boolean);
                            return (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCollapsedSectionIds((current) => {
                                      const next = new Set(current);
                                      if (next.has(s.id)) next.delete(s.id);
                                      else next.add(s.id);
                                      return next;
                                    })
                                  }
                                  className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700"
                                  aria-expanded={!isCollapsed}
                                >
                                  <ChevronDown
                                    size={13}
                                    className={`transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                                  />
                                  {counts.length
                                    ? counts.join(" · ")
                                    : "Chưa có nội dung"}
                                </button>
                                {!isCollapsed && (
                                  <SectionContentPreview
                                    content={s.content}
                                    sectionId={s.id}
                                  />
                                )}
                              </>
                            );
                          })()}

                          {(() => {
                            const refine = sectionRefineCandidate;
                            if (!refine || refine.sectionId !== s.id)
                              return null;
                            return (
                              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-xs font-bold text-amber-800">
                                    Đề xuất AI ·{" "}
                                    {
                                      SECTION_AI_ACTIONS.find(
                                        (action) =>
                                          action.value === refine.action,
                                      )?.label
                                    }{" "}
                                    · chưa áp dụng
                                  </p>
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setSectionRefineCandidate(null)
                                      }
                                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700"
                                    >
                                      Bỏ qua
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void applySectionRefine()}
                                      disabled={busy}
                                      className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
                                    >
                                      Áp dụng
                                    </button>
                                  </div>
                                </div>
                                <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3">
                                  <SectionContentPreview
                                    content={{
                                      paragraphs: refine.section.paragraphs,
                                      bullets: refine.section.bullets,
                                      examples: refine.section.examples,
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                        <button
                          type="button"
                          onClick={() => openAddSection(idx + 1)}
                          className="flex w-full items-center gap-2 py-1 text-xs font-semibold text-slate-500 before:h-px before:flex-1 before:bg-slate-200 after:h-px after:flex-1 after:bg-slate-200 hover:text-slate-800"
                          aria-label={`Thêm nội dung sau ${s.heading}`}
                        >
                          <Plus size={14} /> Thêm nội dung
                        </button>
                      </React.Fragment>
                    );
                  })
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
                    <FileText
                      size={28}
                      className="mx-auto mb-2 text-slate-300"
                    />
                    Bài học chưa có mục nội dung nào. Hãy nhấn &quot;Thêm mục
                    nội dung&quot; để soạn lý thuyết cho học viên.
                  </div>
                )}
              </div>

              <div className="space-y-3 border-t border-slate-200 pt-5">
                {[
                  {
                    exercise: guidedPractice,
                    title: "Luyện tập có hướng dẫn",
                    description: "Củng cố nội dung vừa học.",
                    tone: "border-blue-200 bg-blue-50/60",
                  },
                  {
                    exercise: finalCheck,
                    title: "Kiểm tra cuối bài",
                    description: "Đánh giá các mục tiêu của bài học.",
                    tone: "border-emerald-200 bg-emerald-50/60",
                  },
                ].map(({ exercise, title, description, tone }) => (
                  <section
                    key={title}
                    className={`rounded-xl border p-4 ${tone}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          {title}
                        </h3>
                        <p className="mt-1 text-xs text-slate-600">
                          {description}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900">
                          {exercise?.questions?.length || 0} câu
                        </p>
                        <button
                          type="button"
                          onClick={() => setActiveTab("exercises")}
                          className="mt-1 text-xs font-semibold text-slate-700 underline underline-offset-2"
                        >
                          Chỉnh sửa câu hỏi
                        </button>
                      </div>
                    </div>
                  </section>
                ))}
              </div>
            </div>
            <aside className="h-fit rounded-xl border border-slate-200 bg-white p-4 shadow-xs lg:sticky lg:top-28">
              <h2 className="text-sm font-bold text-slate-900">
                Cấu trúc bài học
              </h2>
              <nav
                aria-label="Cấu trúc bài học"
                className="mt-3 space-y-2 text-xs text-slate-600"
              >
                <a
                  href="#lesson-media"
                  className="block rounded-md px-2 py-1.5 hover:bg-slate-100"
                >
                  <span className="mr-1 text-slate-400">○</span>Ảnh minh họa
                </a>
                {lesson.sections.map((section: any, index: number) => (
                  <a
                    key={section.id}
                    href={`#section-${section.id}`}
                    className="block rounded-md px-2 py-1.5 hover:bg-slate-100"
                  >
                    <span className="mr-1 text-emerald-700">✓</span>
                    {index + 1}. {sectionTypeLabel(section.type)}
                  </a>
                ))}
                <button
                  type="button"
                  onClick={() => setActiveTab("exercises")}
                  className="block w-full rounded-md px-2 py-1.5 text-left hover:bg-slate-100"
                >
                  <span className="mr-1 text-emerald-700">✓</span>Luyện tập
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("exercises")}
                  className="block w-full rounded-md px-2 py-1.5 text-left hover:bg-slate-100"
                >
                  <span className="mr-1 text-emerald-700">✓</span>Kiểm tra cuối
                  bài
                </button>
              </nav>
            </aside>
          </div>
        </section>
      )}

      {/* TAB 2: EXERCISES */}
      {activeTab === "exercises" && (
        <section
          className={`space-y-6 ${isReadOnly ? "pointer-events-none opacity-60" : ""}`}
        >
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Bài luyện tập
            </h2>
            <p className="text-xs text-slate-500">
              Cấu trúc chuẩn của một bài học V5 gồm &quot;Luyện tập có hướng
              dẫn&quot; (Guided Practice) và &quot;Kiểm tra cuối bài&quot;
              (Final Check).
            </p>
          </div>

          {/* GUIDED PRACTICE CARD */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">
                  LUYỆN TẬP CÓ HƯỚNG DẪN
                </span>
                <h3 className="mt-1 text-base font-bold text-slate-900">
                  {guidedPractice
                    ? guidedPractice.title
                    : "Luyện tập có hướng dẫn"}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {guidedPractice
                    ? guidedPractice.prompt
                    : "Chưa khởi tạo bài luyện tập có hướng dẫn cho bài học này."}
                </p>
              </div>

              {guidedPractice ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openAddQuestion(guidedPractice)}
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
                  >
                    <Plus size={13} /> Thêm câu hỏi
                  </button>
                  <button
                    onClick={() =>
                      setPendingDeleteExercise({
                        id: guidedPractice.id,
                        title: guidedPractice.title,
                      })
                    }
                    className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:text-rose-600 hover:border-rose-200"
                    title="Xóa bài tập"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => createStandardExercise("guided-practice")}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Plus size={14} /> Khởi tạo Guided Practice
                </button>
              )}
            </div>

            {/* Questions in Guided Practice */}
            {guidedPractice && (
              <div className="space-y-3">
                {guidedPractice.questions &&
                guidedPractice.questions.length > 0 ? (
                  guidedPractice.questions.map((q: any, qIdx: number) => (
                    <div
                      key={q.id}
                      className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 text-xs space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2">
                          <span className="font-bold text-slate-800 bg-white border border-slate-200 px-1.5 py-0.5 rounded text-xs">
                            Câu {qIdx + 1}
                          </span>
                          <p className="text-sm font-semibold text-slate-900">
                            {q.prompt}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => openEditQuestion(guidedPractice, q)}
                            className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                          >
                            <Edit2 size={12} /> Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setPendingDeleteQuestion({
                                exerciseId: guidedPractice.id,
                                questionId: q.id,
                                prompt: q.prompt,
                              })
                            }
                            className="rounded border border-slate-200 bg-white p-1 text-slate-400 hover:text-rose-600 hover:border-rose-200"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Options */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {(Array.isArray(q.options) ? q.options : []).map(
                          (opt: string, optIdx: number) => {
                            const isCorrect =
                              opt === q.correctAnswer ||
                              String.fromCharCode(65 + optIdx) ===
                                String(q.correctAnswer).toUpperCase();
                            return (
                              <div
                                key={optIdx}
                                className={`rounded px-2.5 py-1.5 text-xs flex items-center justify-between ${
                                  isCorrect
                                    ? "bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold"
                                    : "bg-white text-slate-700 border border-slate-200"
                                }`}
                              >
                                <span>
                                  ({String.fromCharCode(65 + optIdx)}) {opt}
                                </span>
                                {isCorrect && (
                                  <Check
                                    size={13}
                                    className="text-emerald-600 shrink-0"
                                  />
                                )}
                              </div>
                            );
                          },
                        )}
                      </div>

                      {q.explanation && (
                        <p className="text-[11px] text-slate-500 italic bg-white p-2 rounded border border-slate-100">
                          Giải thích: {q.explanation}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="py-4 text-center text-xs text-slate-400 italic">
                    Chưa có câu hỏi nào trong bài luyện tập này. Nhấn &quot;+
                    Thêm câu hỏi&quot; để soạn.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* FINAL CHECK CARD */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <span className="rounded bg-teal-50 px-2 py-0.5 text-xs font-bold text-teal-700 border border-teal-200">
                  KIỂM TRA CUỐI BÀI · BẮT BUỘC ĐỂ XUẤT BẢN
                </span>
                <h3 className="mt-1 text-base font-bold text-slate-900">
                  {finalCheck ? finalCheck.title : "Kiểm tra cuối bài"}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {finalCheck
                    ? finalCheck.prompt
                    : "Chưa khởi tạo Final Check cho bài học này."}
                </p>
              </div>

              {finalCheck ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openAddQuestion(finalCheck)}
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
                  >
                    <Plus size={13} /> Thêm câu hỏi
                  </button>
                  <button
                    onClick={() =>
                      setPendingDeleteExercise({
                        id: finalCheck.id,
                        title: finalCheck.title,
                      })
                    }
                    className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:text-rose-600 hover:border-rose-200"
                    title="Xóa bài tập"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => createStandardExercise("final-check")}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Plus size={14} /> Khởi tạo Final Check
                </button>
              )}
            </div>

            {/* Questions in Final Check */}
            {finalCheck && (
              <div className="space-y-3">
                {finalCheck.questions && finalCheck.questions.length > 0 ? (
                  finalCheck.questions.map((q: any, qIdx: number) => (
                    <div
                      key={q.id}
                      className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 text-xs space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2">
                          <span className="font-bold text-slate-800 bg-white border border-slate-200 px-1.5 py-0.5 rounded text-xs">
                            Câu {qIdx + 1}
                          </span>
                          <p className="text-sm font-semibold text-slate-900">
                            {q.prompt}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => openEditQuestion(finalCheck, q)}
                            className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                          >
                            <Edit2 size={12} /> Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setPendingDeleteQuestion({
                                exerciseId: finalCheck.id,
                                questionId: q.id,
                                prompt: q.prompt,
                              })
                            }
                            className="rounded border border-slate-200 bg-white p-1 text-slate-400 hover:text-rose-600 hover:border-rose-200"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Options */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {(Array.isArray(q.options) ? q.options : []).map(
                          (opt: string, optIdx: number) => {
                            const isCorrect =
                              opt === q.correctAnswer ||
                              String.fromCharCode(65 + optIdx) ===
                                String(q.correctAnswer).toUpperCase();
                            return (
                              <div
                                key={optIdx}
                                className={`rounded px-2.5 py-1.5 text-xs flex items-center justify-between ${
                                  isCorrect
                                    ? "bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold"
                                    : "bg-white text-slate-700 border border-slate-200"
                                }`}
                              >
                                <span>
                                  ({String.fromCharCode(65 + optIdx)}) {opt}
                                </span>
                                {isCorrect && (
                                  <Check
                                    size={13}
                                    className="text-emerald-600 shrink-0"
                                  />
                                )}
                              </div>
                            );
                          },
                        )}
                      </div>

                      {q.explanation && (
                        <p className="text-[11px] text-slate-500 italic bg-white p-2 rounded border border-slate-100">
                          Giải thích: {q.explanation}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="py-4 text-center text-xs text-slate-400 italic">
                    Chưa có câu hỏi nào trong Final Check. Nhấn &quot;+ Thêm câu
                    hỏi&quot; để soạn.
                  </p>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* TAB 3: LESSON INFO */}
      {activeTab === "info" && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900">
            Thông tin bài học
          </h2>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700">
                Tên bài học *
              </label>
              <input
                type="text"
                value={infoForm.title}
                disabled={isReadOnly}
                onChange={(e) => {
                  setHasUnsavedChanges(true);
                  setInfoForm({ ...infoForm, title: e.target.value });
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-400"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">
                Tóm tắt nội dung
              </label>
              <textarea
                rows={3}
                value={infoForm.summary}
                disabled={isReadOnly}
                onChange={(e) => {
                  setHasUnsavedChanges(true);
                  setInfoForm({ ...infoForm, summary: e.target.value });
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-400"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">
                Mục tiêu học tập (mỗi dòng một mục tiêu)
              </label>
              <textarea
                rows={4}
                value={infoForm.learningObjectives}
                disabled={isReadOnly}
                onChange={(e) => {
                  setHasUnsavedChanges(true);
                  setInfoForm({
                    ...infoForm,
                    learningObjectives: e.target.value,
                  });
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-400"
              />
            </div>

            <label className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={infoForm.requiresFinalCheck}
                disabled={isReadOnly}
                onChange={(e) => {
                  setHasUnsavedChanges(true);
                  setInfoForm({
                    ...infoForm,
                    requiresFinalCheck: e.target.checked,
                  });
                }}
                className="mt-0.5"
              />
              <span>
                <span className="font-semibold text-slate-900">
                  Bài học này cần Kiểm tra cuối bài
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  Bỏ chọn nếu đây là bài học luyện tập không cần bài Kiểm tra
                  cuối bài để xuất bản.
                </span>
              </span>
            </label>

            <div className="pt-2">
              <button
                type="button"
                onClick={saveLessonInfo}
                disabled={busy || isReadOnly}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                <Save size={15} /> Lưu thay đổi
              </button>
            </div>
          </div>
        </section>
      )}

      {/* TAB 4: PREVIEW */}
      {activeTab === "preview" && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Xem trước giao diện học viên
            </span>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              {lesson.title}
            </h2>
            <p className="mt-1 text-sm text-slate-600">{lesson.summary}</p>
          </div>

          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              I. Nội dung bài giảng
            </h3>
            {lesson.sections && lesson.sections.length > 0 ? (
              lesson.sections.map((s: any, idx: number) => (
                <div
                  key={s.id}
                  className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-2"
                >
                  <span className="text-xs font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                    Phần {idx + 1}: {s.heading}
                  </span>
                  <SectionContentPreview content={s.content} sectionId={s.id} />
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic">
                Chưa có nội dung lý thuyết.
              </p>
            )}
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-base font-bold text-slate-900">
              II. Bài tập thực hành
            </h3>
            {lesson.exercises && lesson.exercises.length > 0 ? (
              lesson.exercises.map((ex: any) => (
                <div
                  key={ex.id}
                  className="rounded-lg border border-slate-200 p-4 space-y-3"
                >
                  <h4 className="text-sm font-bold text-slate-900">
                    {ex.title}
                  </h4>
                  <p className="text-xs text-slate-600">{ex.prompt}</p>
                  <p className="text-xs text-slate-500 font-medium">
                    Tổng số câu hỏi: {ex.questions?.length || 0} câu
                  </p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic">
                Chưa có bài tập thực hành.
              </p>
            )}
          </div>
        </section>
      )}

      {/* SECTION MODAL */}
      {isSectionModalOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/40"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="section-editor-title"
            className="flex h-full w-full max-w-2xl flex-col bg-white shadow-xl"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                requestCloseSectionModal();
              } else if (
                (event.ctrlKey || event.metaKey) &&
                event.key === "Enter"
              ) {
                event.preventDefault();
                void saveSection(event as unknown as React.FormEvent);
              }
            }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-5 sm:p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {sectionTypeLabel(sectionForm.type)}
                </p>
                <h3
                  id="section-editor-title"
                  className="mt-0.5 text-lg font-bold text-slate-900"
                >
                  {sectionForm.heading.trim() ||
                    (editingSection
                      ? "Chỉnh sửa mục nội dung"
                      : "Thêm mục nội dung mới")}
                </h3>
              </div>
              <button
                type="button"
                onClick={requestCloseSectionModal}
                className="shrink-0 text-slate-400 hover:text-slate-600"
                aria-label="Đóng trình chỉnh sửa"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex gap-1 border-b border-slate-100 px-5 pt-3 sm:px-6">
              <button
                type="button"
                onClick={() => setSectionEditorTab("edit")}
                className={`rounded-t-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  sectionEditorTab === "edit"
                    ? "border-b-2 border-slate-900 text-slate-900"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Soạn thảo
              </button>
              <button
                type="button"
                onClick={() => setSectionEditorTab("preview")}
                className={`rounded-t-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  sectionEditorTab === "preview"
                    ? "border-b-2 border-slate-900 text-slate-900"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Xem trước
              </button>
            </div>

            <form
              id="section-editor-form"
              onSubmit={saveSection}
              className="flex-1 overflow-y-auto p-5 sm:p-6"
            >
              {sectionEditorTab === "preview" ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <SectionContentPreview
                    content={toSectionContentPayload({
                      paragraphs: sectionForm.text
                        .split(/\n{2,}/)
                        .map((value) => value.trim())
                        .filter(Boolean),
                      bullets: sectionForm.bullets,
                      examples: sectionForm.examples,
                      audioExamples: sectionForm.audioExamples,
                    })}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">
                      Loại mục nội dung
                    </label>
                    <select
                      value={sectionForm.type}
                      onChange={(e) => {
                        setHasUnsavedChanges(true);
                        patchSectionForm({ type: e.target.value });
                      }}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-400"
                    >
                      {SECTION_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700">
                      Tiêu đề mục *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Quy tắc phát âm nguyên âm dài"
                      value={sectionForm.heading}
                      onChange={(e) => {
                        setHasUnsavedChanges(true);
                        patchSectionForm({ heading: e.target.value });
                      }}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-400"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700">
                      Nội dung chính *
                    </label>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Để trống một dòng giữa hai đoạn để tách thành nhiều đoạn
                      văn.
                    </p>
                    <textarea
                      rows={6}
                      required
                      placeholder="Soạn nội dung lý thuyết, ví dụ minh họa hoặc lời khuyên chi tiết..."
                      value={sectionForm.text}
                      onChange={(e) => {
                        setHasUnsavedChanges(true);
                        patchSectionForm({ text: e.target.value });
                      }}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-400"
                    />
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label className="text-xs font-semibold text-slate-700">
                        Ý chính dạng gạch đầu dòng
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          patchSectionForm({
                            bullets: [...sectionForm.bullets, ""],
                          })
                        }
                        className="text-xs font-semibold text-slate-700 underline underline-offset-2"
                      >
                        Thêm ý
                      </button>
                    </div>
                    {sectionForm.bullets.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-slate-200 px-3 py-2.5 text-xs text-slate-400">
                        Chưa có ý chính.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {sectionForm.bullets.map((bullet, index) => (
                          <div key={`bullet-${index}`} className="flex gap-2">
                            <div className="flex flex-col">
                              <button
                                type="button"
                                onClick={() =>
                                  index > 0 &&
                                  patchSectionForm({
                                    bullets: swapAt(
                                      sectionForm.bullets,
                                      index,
                                      index - 1,
                                    ),
                                  })
                                }
                                disabled={index === 0}
                                aria-label={`Di chuyển ý ${index + 1} lên`}
                                className="rounded border border-slate-200 px-1 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                              >
                                <ArrowUp size={11} />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  index < sectionForm.bullets.length - 1 &&
                                  patchSectionForm({
                                    bullets: swapAt(
                                      sectionForm.bullets,
                                      index,
                                      index + 1,
                                    ),
                                  })
                                }
                                disabled={
                                  index === sectionForm.bullets.length - 1
                                }
                                aria-label={`Di chuyển ý ${index + 1} xuống`}
                                className="rounded border border-slate-200 px-1 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                              >
                                <ArrowDown size={11} />
                              </button>
                            </div>
                            <input
                              value={bullet}
                              onChange={(e) =>
                                patchSectionForm({
                                  bullets: sectionForm.bullets.map(
                                    (item, itemIndex) =>
                                      itemIndex === index
                                        ? e.target.value
                                        : item,
                                  ),
                                })
                              }
                              placeholder="Ví dụ: Hello dùng trong tình huống thân mật"
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                patchSectionForm({
                                  bullets: sectionForm.bullets.filter(
                                    (_, itemIndex) => itemIndex !== index,
                                  ),
                                })
                              }
                              aria-label={`Xóa ý ${index + 1}`}
                              className="rounded-lg border border-slate-200 px-2 text-slate-500 hover:border-rose-200 hover:text-rose-600"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label className="text-xs font-semibold text-slate-700">
                        Ví dụ minh họa
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          patchSectionForm({
                            examples: [
                              ...sectionForm.examples,
                              { text: "", translation: "", explanation: "" },
                            ],
                          })
                        }
                        className="text-xs font-semibold text-slate-700 underline underline-offset-2"
                      >
                        Thêm ví dụ
                      </button>
                    </div>
                    {sectionForm.examples.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-slate-200 px-3 py-2.5 text-xs text-slate-400">
                        Chưa có ví dụ minh họa.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {sectionForm.examples.map((example, index) => (
                          <div
                            key={`example-${index}`}
                            className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                          >
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-xs font-medium text-slate-600">
                                Ví dụ {index + 1}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    index > 0 &&
                                    patchSectionForm({
                                      examples: swapAt(
                                        sectionForm.examples,
                                        index,
                                        index - 1,
                                      ),
                                    })
                                  }
                                  disabled={index === 0}
                                  aria-label={`Di chuyển ví dụ ${index + 1} lên`}
                                  className="rounded border border-slate-200 px-1 text-slate-500 hover:bg-white disabled:opacity-30"
                                >
                                  <ArrowUp size={11} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    index < sectionForm.examples.length - 1 &&
                                    patchSectionForm({
                                      examples: swapAt(
                                        sectionForm.examples,
                                        index,
                                        index + 1,
                                      ),
                                    })
                                  }
                                  disabled={
                                    index === sectionForm.examples.length - 1
                                  }
                                  aria-label={`Di chuyển ví dụ ${index + 1} xuống`}
                                  className="rounded border border-slate-200 px-1 text-slate-500 hover:bg-white disabled:opacity-30"
                                >
                                  <ArrowDown size={11} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    patchSectionForm({
                                      examples: sectionForm.examples.filter(
                                        (_, itemIndex) => itemIndex !== index,
                                      ),
                                    })
                                  }
                                  aria-label={`Xóa ví dụ ${index + 1}`}
                                  className="text-slate-400 hover:text-rose-600"
                                >
                                  <X size={15} />
                                </button>
                              </div>
                            </div>
                            <div className="grid gap-2">
                              <label className="text-xs font-medium text-slate-600">
                                Câu tiếng Anh / phiên âm
                                <input
                                  value={example.text}
                                  onChange={(e) =>
                                    patchSectionForm({
                                      examples: sectionForm.examples.map(
                                        (item, itemIndex) =>
                                          itemIndex === index
                                            ? { ...item, text: e.target.value }
                                            : item,
                                      ),
                                    })
                                  }
                                  placeholder={
                                    '"Nice to meet you." hoặc /naɪs tə miːt juː/'
                                  }
                                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                                />
                              </label>
                              <label className="text-xs font-medium text-slate-600">
                                Nghĩa tiếng Việt
                                <input
                                  value={example.translation}
                                  onChange={(e) =>
                                    patchSectionForm({
                                      examples: sectionForm.examples.map(
                                        (item, itemIndex) =>
                                          itemIndex === index
                                            ? {
                                                ...item,
                                                translation: e.target.value,
                                              }
                                            : item,
                                      ),
                                    })
                                  }
                                  placeholder={'"Rất vui được gặp bạn."'}
                                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                                />
                              </label>
                              <label className="text-xs font-medium text-slate-600">
                                Giải thích ngữ cảnh
                                <input
                                  value={example.explanation}
                                  onChange={(e) =>
                                    patchSectionForm({
                                      examples: sectionForm.examples.map(
                                        (item, itemIndex) =>
                                          itemIndex === index
                                            ? {
                                                ...item,
                                                explanation: e.target.value,
                                              }
                                            : item,
                                      ),
                                    })
                                  }
                                  placeholder={'"Dùng khi gặp ai đó lần đầu."'}
                                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                                />
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label className="text-xs font-semibold text-slate-700">
                        Audio mẫu phát âm
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          patchSectionForm({
                            audioExamples: [
                              ...sectionForm.audioExamples,
                              {
                                term: "",
                                ipa: "",
                                meaning: "",
                                audioUrl: "",
                                accent: "",
                              },
                            ],
                          })
                        }
                        className="text-xs font-semibold text-slate-700 underline underline-offset-2"
                      >
                        Thêm audio
                      </button>
                    </div>
                    {sectionForm.audioExamples.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-slate-200 px-3 py-2.5 text-xs text-slate-400">
                        Chưa có audio mẫu.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {sectionForm.audioExamples.map((item, index) => (
                          <div
                            key={`audio-example-${index}`}
                            className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                          >
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-xs font-medium text-slate-600">
                                Audio {index + 1}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    index > 0 &&
                                    patchSectionForm({
                                      audioExamples: swapAt(
                                        sectionForm.audioExamples,
                                        index,
                                        index - 1,
                                      ),
                                    })
                                  }
                                  disabled={index === 0}
                                  aria-label={`Di chuyển audio ${index + 1} lên`}
                                  className="rounded border border-slate-200 px-1 text-slate-500 hover:bg-white disabled:opacity-30"
                                >
                                  <ArrowUp size={11} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    index <
                                      sectionForm.audioExamples.length - 1 &&
                                    patchSectionForm({
                                      audioExamples: swapAt(
                                        sectionForm.audioExamples,
                                        index,
                                        index + 1,
                                      ),
                                    })
                                  }
                                  disabled={
                                    index ===
                                    sectionForm.audioExamples.length - 1
                                  }
                                  aria-label={`Di chuyển audio ${index + 1} xuống`}
                                  className="rounded border border-slate-200 px-1 text-slate-500 hover:bg-white disabled:opacity-30"
                                >
                                  <ArrowDown size={11} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    patchSectionForm({
                                      audioExamples:
                                        sectionForm.audioExamples.filter(
                                          (_, itemIndex) => itemIndex !== index,
                                        ),
                                    })
                                  }
                                  aria-label={`Xóa audio ${index + 1}`}
                                  className="text-slate-400 hover:text-rose-600"
                                >
                                  <X size={15} />
                                </button>
                              </div>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <label className="text-xs font-medium text-slate-600">
                                Từ / cụm từ
                                <input
                                  value={item.term}
                                  onChange={(e) =>
                                    patchSectionForm({
                                      audioExamples:
                                        sectionForm.audioExamples.map(
                                          (row, rowIndex) =>
                                            rowIndex === index
                                              ? { ...row, term: e.target.value }
                                              : row,
                                        ),
                                    })
                                  }
                                  placeholder="hello"
                                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                                />
                              </label>
                              <label className="text-xs font-medium text-slate-600">
                                Phiên âm
                                <input
                                  value={item.ipa}
                                  onChange={(e) =>
                                    patchSectionForm({
                                      audioExamples:
                                        sectionForm.audioExamples.map(
                                          (row, rowIndex) =>
                                            rowIndex === index
                                              ? { ...row, ipa: e.target.value }
                                              : row,
                                        ),
                                    })
                                  }
                                  placeholder="/həˈloʊ/"
                                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                                />
                              </label>
                              <label className="text-xs font-medium text-slate-600">
                                Nghĩa
                                <input
                                  value={item.meaning}
                                  onChange={(e) =>
                                    patchSectionForm({
                                      audioExamples:
                                        sectionForm.audioExamples.map(
                                          (row, rowIndex) =>
                                            rowIndex === index
                                              ? {
                                                  ...row,
                                                  meaning: e.target.value,
                                                }
                                              : row,
                                        ),
                                    })
                                  }
                                  placeholder="Xin chào"
                                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                                />
                              </label>
                              <label className="text-xs font-medium text-slate-600">
                                Giọng
                                <input
                                  value={item.accent}
                                  onChange={(e) =>
                                    patchSectionForm({
                                      audioExamples:
                                        sectionForm.audioExamples.map(
                                          (row, rowIndex) =>
                                            rowIndex === index
                                              ? {
                                                  ...row,
                                                  accent: e.target.value,
                                                }
                                              : row,
                                        ),
                                    })
                                  }
                                  placeholder="Anh-Mỹ"
                                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                                />
                              </label>
                              <label className="text-xs font-medium text-slate-600 sm:col-span-2">
                                URL âm thanh
                                <input
                                  value={item.audioUrl}
                                  onChange={(e) =>
                                    patchSectionForm({
                                      audioExamples:
                                        sectionForm.audioExamples.map(
                                          (row, rowIndex) =>
                                            rowIndex === index
                                              ? {
                                                  ...row,
                                                  audioUrl: e.target.value,
                                                }
                                              : row,
                                        ),
                                    })
                                  }
                                  placeholder="https://..."
                                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                                />
                              </label>
                            </div>
                            {item.audioUrl.trim() && (
                              <audio
                                className="mt-2 w-full"
                                controls
                                preload="none"
                                src={item.audioUrl}
                                aria-label={`Nghe thử audio ${item.term || index + 1}`}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </form>

            <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-100 bg-white p-4">
              <button
                type="button"
                onClick={requestCloseSectionModal}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                form="section-editor-form"
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Save size={13} />
                )}
                Lưu mục nội dung
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM CLOSE SECTION EDITOR WITHOUT SAVING */}
      {isSectionCloseConfirmOpen && (
        <ConfirmDialog
          open={true}
          title="Bỏ thay đổi?"
          description="Bạn có thay đổi chưa lưu. Bỏ thay đổi?"
          confirmLabel="Bỏ thay đổi"
          onConfirm={discardSectionModal}
          onCancel={() => setIsSectionCloseConfirmOpen(false)}
        />
      )}

      {/* QUESTION MODAL */}
      {isQuestionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {editingQuestion ? "Chỉnh sửa câu hỏi" : "Thêm câu hỏi mới"}
              </h3>
              <button
                type="button"
                onClick={() => setIsQuestionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={saveQuestion} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Nội dung câu hỏi (Prompt) *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Ví dụ: Chọn từ có phần gạch chân phát âm khác..."
                  value={questionForm.prompt}
                  onChange={(e) =>
                    setQuestionForm({ ...questionForm, prompt: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-400"
                />
              </div>

              {/* 4 Options */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">
                  Các phương án lựa chọn *
                </label>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-slate-100 text-xs font-bold text-slate-700">
                      A
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="Nội dung phương án A"
                      value={questionForm.optA}
                      onChange={(e) =>
                        setQuestionForm({
                          ...questionForm,
                          optA: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-slate-100 text-xs font-bold text-slate-700">
                      B
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="Nội dung phương án B"
                      value={questionForm.optB}
                      onChange={(e) =>
                        setQuestionForm({
                          ...questionForm,
                          optB: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-slate-100 text-xs font-bold text-slate-700">
                      C
                    </span>
                    <input
                      type="text"
                      placeholder="Nội dung phương án C (tùy chọn)"
                      value={questionForm.optC}
                      onChange={(e) =>
                        setQuestionForm({
                          ...questionForm,
                          optC: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-slate-100 text-xs font-bold text-slate-700">
                      D
                    </span>
                    <input
                      type="text"
                      placeholder="Nội dung phương án D (tùy chọn)"
                      value={questionForm.optD}
                      onChange={(e) =>
                        setQuestionForm({
                          ...questionForm,
                          optD: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Đáp án đúng *
                </label>
                <select
                  value={questionForm.correctAnswer}
                  onChange={(e) =>
                    setQuestionForm({
                      ...questionForm,
                      correctAnswer: e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-400"
                >
                  <option value="A">Phương án A</option>
                  <option value="B">Phương án B</option>
                  {questionForm.optC && <option value="C">Phương án C</option>}
                  {questionForm.optD && <option value="D">Phương án D</option>}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Giải thích đáp án
                </label>
                <textarea
                  rows={3}
                  placeholder="Giải thích vì sao phương án này chính xác..."
                  value={questionForm.explanation}
                  onChange={(e) =>
                    setQuestionForm({
                      ...questionForm,
                      explanation: e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsQuestionModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  {busy ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Save size={13} />
                  )}
                  Lưu câu hỏi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE SECTION */}
      {pendingDeleteSection && (
        <ConfirmDialog
          open={true}
          title="Xóa mục nội dung"
          description={`Bạn có chắc muốn xóa mục "${pendingDeleteSection.heading}" khỏi bài học?`}
          confirmLabel="Xác nhận xóa"
          onConfirm={deleteSection}
          onCancel={() => setPendingDeleteSection(null)}
        />
      )}

      {/* CONFIRM DELETE QUESTION */}
      {pendingDeleteQuestion && (
        <ConfirmDialog
          open={true}
          title="Xóa câu hỏi"
          description={`Bạn có chắc muốn xóa câu hỏi "${pendingDeleteQuestion.prompt}"?`}
          confirmLabel="Xác nhận xóa"
          onConfirm={deleteQuestion}
          onCancel={() => setPendingDeleteQuestion(null)}
        />
      )}

      {/* CONFIRM DELETE EXERCISE */}
      {pendingDeleteExercise && (
        <ConfirmDialog
          open={true}
          title="Xóa bài luyện tập"
          description={`Bạn có chắc muốn xóa bài luyện tập "${pendingDeleteExercise.title}"? Mọi câu hỏi bên trong sẽ bị xóa.`}
          confirmLabel="Xác nhận xóa"
          onConfirm={deleteExercise}
          onCancel={() => setPendingDeleteExercise(null)}
        />
      )}
      <ConfirmDialog
        open={isPublishConfirmOpen}
        title="Xuất bản bài học?"
        description="Bài học đạt điều kiện sẽ hiển thị cho học viên khi khóa học được xuất bản."
        confirmLabel="Xuất bản bài học"
        isPending={busy}
        onConfirm={publishLesson}
        onCancel={() => setIsPublishConfirmOpen(false)}
      />
      <ConfirmDialog
        open={isRevertConfirmOpen}
        title="Chuyển bài học về bản nháp?"
        description="Bài học sẽ trở lại trạng thái bản nháp để bạn có thể chỉnh sửa. Bạn cần xuất bản lại bài học trước khi xuất bản khóa học."
        confirmLabel="Chuyển về bản nháp"
        isPending={busy}
        onConfirm={() => void revertLessonToDraft()}
        onCancel={() => setIsRevertConfirmOpen(false)}
      />
    </main>
  );
}
