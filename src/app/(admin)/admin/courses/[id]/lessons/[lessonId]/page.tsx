"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  CheckCircle2,
  Edit2,
  Eye,
  FileText,
  HelpCircle,
  Layers,
  Loader2,
  Plus,
  Save,
  Send,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import axiosClient from "@/lib/api/axiosClient";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const SECTION_TYPES = [
  { value: "THEORY", label: "Lý thuyết trọng tâm (THEORY)" },
  { value: "EXAMPLE", label: "Ví dụ minh họa (EXAMPLE)" },
  { value: "VOCABULARY", label: "Từ vựng then chốt (VOCABULARY)" },
  { value: "GRAMMAR", label: "Cấu trúc ngữ pháp (GRAMMAR)" },
  { value: "TIP", label: "Mẹo làm bài & Lưu ý (TIP)" },
  { value: "COMMON_MISTAKE", label: "Lỗi thường gặp (COMMON_MISTAKE)" },
  { value: "SUMMARY", label: "Tổng kết bài học (SUMMARY)" },
  { value: "INTRO", label: "Mở đầu bài học (INTRO)" },
];

export default function V5LessonEditorPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = Number(params?.id);
  const lessonId = Number(params?.lessonId);

  const [lesson, setLesson] = useState<any | null>(null);
  const [courseTitle, setCourseTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<"sections" | "exercises" | "info" | "preview">("sections");

  // Lesson Info Form
  const [infoForm, setInfoForm] = useState({
    title: "",
    summary: "",
    learningObjectives: "",
  });

  // Section Modal
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<any | null>(null);
  const [sectionForm, setSectionForm] = useState({
    type: "THEORY",
    heading: "",
    content: "",
    isRequired: true,
  });

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
  const [pendingDeleteSection, setPendingDeleteSection] = useState<{ id: number; heading: string } | null>(null);
  const [pendingDeleteQuestion, setPendingDeleteQuestion] = useState<{
    exerciseId: number;
    questionId: number;
    prompt: string;
  } | null>(null);
  const [pendingDeleteExercise, setPendingDeleteExercise] = useState<{ id: number; title: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data: any = await axiosClient.get(`/admin/courses/${courseId}/studio`);
      setCourseTitle(data.course?.title || "");
      const found = data.lessons?.find((l: any) => l.id === lessonId);
      if (found) {
        setLesson(found);
        setInfoForm({
          title: found.title || "",
          summary: found.summary || "",
          learningObjectives: Array.isArray(found.learningObjectives)
            ? found.learningObjectives.join("\n")
            : "",
        });
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

  // SAVE LESSON INFO
  const saveLessonInfo = async () => {
    if (!infoForm.title.trim()) {
      toast.error("Vui lòng nhập tên bài học.");
      return;
    }
    setBusy(true);
    try {
      await axiosClient.patch(`/admin/courses/${courseId}/studio/lessons/${lessonId}`, {
        title: infoForm.title.trim(),
        summary: infoForm.summary.trim(),
        learningObjectives: infoForm.learningObjectives
          .split("\n")
          .map((x) => x.trim())
          .filter(Boolean),
      });
      toast.success("Đã lưu thông tin bài học!");
      await load();
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Lưu thông tin thất bại."));
    } finally {
      setBusy(false);
    }
  };

  // PUBLISH LESSON
  const publishLesson = async () => {
    setBusy(true);
    try {
      await axiosClient.post(`/admin/courses/${courseId}/studio/lessons/${lessonId}/publish`);
      toast.success("Đã xuất bản bài học thành công!");
      await load();
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Bài học chưa đủ điều kiện xuất bản (cần ít nhất 1 section và Final Check)."));
    } finally {
      setBusy(false);
    }
  };

  // SECTION ACTIONS
  const openAddSection = () => {
    setEditingSection(null);
    setSectionForm({
      type: "THEORY",
      heading: "",
      content: "",
      isRequired: true,
    });
    setIsSectionModalOpen(true);
  };

  const openEditSection = (s: any) => {
    setEditingSection(s);
    const contentText = typeof s.content === "object" ? s.content?.text || JSON.stringify(s.content) : String(s.content || "");
    setSectionForm({
      type: s.type || "THEORY",
      heading: s.heading || "",
      content: contentText,
      isRequired: s.isRequired !== false,
    });
    setIsSectionModalOpen(true);
  };

  const saveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionForm.heading.trim() || !sectionForm.content.trim()) {
      toast.error("Vui lòng nhập tiêu đề và nội dung section.");
      return;
    }

    setBusy(true);
    try {
      if (editingSection) {
        await axiosClient.patch(
          `/admin/courses/${courseId}/studio/lessons/${lessonId}/sections/${editingSection.id}`,
          {
            type: sectionForm.type,
            heading: sectionForm.heading.trim(),
            content: { text: sectionForm.content.trim() },
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
            content: { text: sectionForm.content.trim() },
            isRequired: sectionForm.isRequired,
            order: (lesson?.sections?.length || 0),
          },
        );
        toast.success("Đã thêm mục nội dung mới!");
      }
      setIsSectionModalOpen(false);
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

  // EXERCISE ACTIONS
  const createStandardExercise = async (slug: "guided-practice" | "final-check") => {
    const isFinal = slug === "final-check";
    setBusy(true);
    try {
      await axiosClient.post(`/admin/courses/${courseId}/studio/lessons/${lessonId}/exercises`, {
        slug,
        type: "MULTIPLE_CHOICE",
        title: isFinal ? "Kiểm tra cuối bài (Final Check)" : "Luyện tập có hướng dẫn (Guided Practice)",
        prompt: isFinal
          ? "Hoàn thành các câu hỏi sau để kiểm tra mức độ nắm vững bài học."
          : "Thực hành ngay các kiến thức vừa học qua các câu hỏi củng cố.",
        content: {},
        required: true,
        order: isFinal ? 1 : 0,
      });
      toast.success(isFinal ? "Đã khởi tạo Final Check" : "Đã khởi tạo Guided Practice");
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
            explanation: questionForm.explanation.trim() || "Chưa có giải thích chi tiết.",
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
            explanation: questionForm.explanation.trim() || "Chưa có giải thích chi tiết.",
            order: (targetExercise.questions?.length || 0),
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

  const guidedPractice = lesson.exercises?.find((x: any) => x.slug === "guided-practice");
  const finalCheck = lesson.exercises?.find((x: any) => x.slug === "final-check");

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6 md:p-8">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href={`/admin/courses/${courseId}/curriculum`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft size={14} /> Trở về: {courseTitle || "Chương trình học"}
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{lesson.title}</h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                lesson.status === "PUBLISHED"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              {lesson.status}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {lesson.sections?.length || 0} mục nội dung · {lesson.exercises?.length || 0} bài luyện tập
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={publishLesson}
            disabled={busy || lesson.status === "PUBLISHED"}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            <Check size={15} /> Xuất bản bài học
          </button>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex gap-2 border-b border-slate-200 pb-1">
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
          onClick={() => setActiveTab("info")}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
            activeTab === "info"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Thông tin chung
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
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Mục nội dung bài giảng</h2>
              <p className="text-xs text-slate-500">
                Sắp xếp lý thuyết, ví dụ, từ vựng và lưu ý học viên sẽ đọc trước khi làm bài tập.
              </p>
            </div>
            <button
              onClick={openAddSection}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
            >
              <Plus size={14} /> Thêm mục nội dung (Section)
            </button>
          </div>

          <div className="space-y-3">
            {lesson.sections && lesson.sections.length > 0 ? (
              lesson.sections.map((s: any, idx: number) => {
                const typeLabel = SECTION_TYPES.find((t) => t.value === s.type)?.label || s.type;
                const contentText = typeof s.content === "object" ? s.content?.text || JSON.stringify(s.content) : String(s.content || "");

                return (
                  <div
                    key={s.id}
                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded bg-slate-100 text-xs font-bold text-slate-700">
                          #{idx + 1}
                        </span>
                        <span className="rounded bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">
                          {s.type}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900">{s.heading}</h3>
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
                          disabled={idx === lesson.sections.length - 1 || busy}
                          title="Di chuyển xuống"
                          className="rounded border border-slate-200 p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                        >
                          <ArrowDown size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditSection(s)}
                          className="inline-flex items-center gap-1 rounded border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <Edit2 size={12} /> Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDeleteSection({ id: s.id, heading: s.heading })}
                          className="rounded border border-slate-200 p-1 text-slate-400 hover:text-rose-600 hover:border-rose-200"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <p className="whitespace-pre-line text-sm text-slate-700 leading-relaxed font-sans">
                      {contentText}
                    </p>
                  </div>
                );
              })
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
                <FileText size={28} className="mx-auto mb-2 text-slate-300" />
                Bài học chưa có mục nội dung nào. Hãy nhấn &quot;Thêm mục nội dung&quot; để soạn lý thuyết cho học viên.
              </div>
            )}
          </div>
        </section>
      )}

      {/* TAB 2: EXERCISES */}
      {activeTab === "exercises" && (
        <section className="space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Bài tập thực hành V5</h2>
            <p className="text-xs text-slate-500">
              Cấu trúc chuẩn của một bài học V5 gồm &quot;Luyện tập có hướng dẫn&quot; (Guided Practice) và &quot;Kiểm tra cuối bài&quot; (Final Check).
            </p>
          </div>

          {/* GUIDED PRACTICE CARD */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">
                  PHASE 2 GUIDED PRACTICE
                </span>
                <h3 className="mt-1 text-base font-bold text-slate-900">
                  {guidedPractice ? guidedPractice.title : "Luyện tập có hướng dẫn"}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {guidedPractice ? guidedPractice.prompt : "Chưa khởi tạo bài luyện tập có hướng dẫn cho bài học này."}
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
                      setPendingDeleteExercise({ id: guidedPractice.id, title: guidedPractice.title })
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
                {guidedPractice.questions && guidedPractice.questions.length > 0 ? (
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
                          <p className="text-sm font-semibold text-slate-900">{q.prompt}</p>
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
                        {(Array.isArray(q.options) ? q.options : []).map((opt: string, optIdx: number) => {
                          const isCorrect =
                            opt === q.correctAnswer ||
                            String.fromCharCode(65 + optIdx) === String(q.correctAnswer).toUpperCase();
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
                              {isCorrect && <Check size={13} className="text-emerald-600 shrink-0" />}
                            </div>
                          );
                        })}
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
                    Chưa có câu hỏi nào trong bài luyện tập này. Nhấn &quot;+ Thêm câu hỏi&quot; để soạn.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* FINAL CHECK CARD */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <span className="rounded bg-violet-50 px-2 py-0.5 text-xs font-bold text-violet-700 border border-violet-200">
                  PHASE 2 FINAL CHECK (BẮT BUỘC ĐỂ XUẤT BẢN)
                </span>
                <h3 className="mt-1 text-base font-bold text-slate-900">
                  {finalCheck ? finalCheck.title : "Kiểm tra cuối bài"}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {finalCheck ? finalCheck.prompt : "Chưa khởi tạo Final Check cho bài học này."}
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
                      setPendingDeleteExercise({ id: finalCheck.id, title: finalCheck.title })
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
                          <p className="text-sm font-semibold text-slate-900">{q.prompt}</p>
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
                        {(Array.isArray(q.options) ? q.options : []).map((opt: string, optIdx: number) => {
                          const isCorrect =
                            opt === q.correctAnswer ||
                            String.fromCharCode(65 + optIdx) === String(q.correctAnswer).toUpperCase();
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
                              {isCorrect && <Check size={13} className="text-emerald-600 shrink-0" />}
                            </div>
                          );
                        })}
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
                    Chưa có câu hỏi nào trong Final Check. Nhấn &quot;+ Thêm câu hỏi&quot; để soạn.
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
          <h2 className="text-base font-bold text-slate-900">Thông tin bài học</h2>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700">Tên bài học *</label>
              <input
                type="text"
                value={infoForm.title}
                onChange={(e) => setInfoForm({ ...infoForm, title: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-400"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Tóm tắt nội dung</label>
              <textarea
                rows={3}
                value={infoForm.summary}
                onChange={(e) => setInfoForm({ ...infoForm, summary: e.target.value })}
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
                onChange={(e) =>
                  setInfoForm({ ...infoForm, learningObjectives: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-400"
              />
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={saveLessonInfo}
                disabled={busy}
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
            <h2 className="mt-1 text-2xl font-bold text-slate-900">{lesson.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{lesson.summary}</p>
          </div>

          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900">I. Nội dung bài giảng</h3>
            {lesson.sections && lesson.sections.length > 0 ? (
              lesson.sections.map((s: any, idx: number) => (
                <div key={s.id} className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-2">
                  <span className="text-xs font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                    Phần {idx + 1}: {s.heading}
                  </span>
                  <p className="whitespace-pre-line text-sm text-slate-800 leading-relaxed">
                    {typeof s.content === "object" ? s.content?.text || JSON.stringify(s.content) : s.content}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic">Chưa có nội dung lý thuyết.</p>
            )}
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-base font-bold text-slate-900">II. Bài tập thực hành</h3>
            {lesson.exercises && lesson.exercises.length > 0 ? (
              lesson.exercises.map((ex: any) => (
                <div key={ex.id} className="rounded-lg border border-slate-200 p-4 space-y-3">
                  <h4 className="text-sm font-bold text-slate-900">{ex.title}</h4>
                  <p className="text-xs text-slate-600">{ex.prompt}</p>
                  <p className="text-xs text-slate-500 font-medium">
                    Tổng số câu hỏi: {ex.questions?.length || 0} câu
                  </p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic">Chưa có bài tập thực hành.</p>
            )}
          </div>
        </section>
      )}

      {/* SECTION MODAL */}
      {isSectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {editingSection ? "Chỉnh sửa mục nội dung" : "Thêm mục nội dung mới"}
              </h3>
              <button
                type="button"
                onClick={() => setIsSectionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={saveSection} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700">Loại mục nội dung</label>
                <select
                  value={sectionForm.type}
                  onChange={(e) => setSectionForm({ ...sectionForm, type: e.target.value })}
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
                <label className="text-xs font-semibold text-slate-700">Tiêu đề mục (Heading) *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Quy tắc phát âm nguyên âm dài"
                  value={sectionForm.heading}
                  onChange={(e) => setSectionForm({ ...sectionForm, heading: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Nội dung hiển thị cho học viên *</label>
                <textarea
                  rows={6}
                  required
                  placeholder="Soạn nội dung lý thuyết, ví dụ minh họa hoặc lời khuyên chi tiết..."
                  value={sectionForm.content}
                  onChange={(e) => setSectionForm({ ...sectionForm, content: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isRequiredSec"
                  checked={sectionForm.isRequired}
                  onChange={(e) => setSectionForm({ ...sectionForm, isRequired: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                />
                <label htmlFor="isRequiredSec" className="text-xs text-slate-700 font-medium">
                  Học viên bắt buộc phải đọc qua phần này
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSectionModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  {busy ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  Lưu mục nội dung
                </button>
              </div>
            </form>
          </div>
        </div>
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
                <label className="text-xs font-semibold text-slate-700">Nội dung câu hỏi (Prompt) *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Ví dụ: Chọn từ có phần gạch chân phát âm khác..."
                  value={questionForm.prompt}
                  onChange={(e) => setQuestionForm({ ...questionForm, prompt: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-400"
                />
              </div>

              {/* 4 Options */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">Các phương án lựa chọn *</label>
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
                      onChange={(e) => setQuestionForm({ ...questionForm, optA: e.target.value })}
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
                      onChange={(e) => setQuestionForm({ ...questionForm, optB: e.target.value })}
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
                      onChange={(e) => setQuestionForm({ ...questionForm, optC: e.target.value })}
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
                      onChange={(e) => setQuestionForm({ ...questionForm, optD: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Đáp án đúng *</label>
                <select
                  value={questionForm.correctAnswer}
                  onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-400"
                >
                  <option value="A">Phương án A</option>
                  <option value="B">Phương án B</option>
                  {questionForm.optC && <option value="C">Phương án C</option>}
                  {questionForm.optD && <option value="D">Phương án D</option>}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Giải thích đáp án</label>
                <textarea
                  rows={3}
                  placeholder="Giải thích vì sao phương án này chính xác..."
                  value={questionForm.explanation}
                  onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
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
                  {busy ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
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
    </main>
  );
}
