"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookOpen,
  Check,
  ClipboardCheck,
  Edit2,
  Layers,
  Loader2,
  Plus,
  Save,
  Send,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import axiosClient from "@/lib/api/axiosClient";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import ImageUploadField from "@/components/admin/ImageUploadField";
import MediaSearchPanel from "@/components/admin/MediaSearchPanel";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CourseAiWorkspaceDialog } from "@/components/admin/CourseAiWorkspaceDialog";

type Lesson = {
  id: number;
  title: string;
  slug: string;
  summary: string;
  order: number;
  status: "DRAFT" | "PUBLISHED";
  sections: any[];
  exercises: any[];
  media: any[];
};

type Studio = {
  course: {
    id: number;
    title: string;
    description: string | null;
    thumbnail: string | null;
    level: string | null;
    status: string;
  };
  lessons: Lesson[];
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export default function CourseCurriculumPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = Number(params?.id);

  const [studio, setStudio] = useState<Studio | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [isPublishConfirmOpen, setIsPublishConfirmOpen] = useState(false);
  const [isRevertCourseConfirmOpen, setIsRevertCourseConfirmOpen] =
    useState(false);
  const [isCourseAiWorkspaceOpen, setIsCourseAiWorkspaceOpen] = useState(false);

  // Course overview form
  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    level: "BEGINNER",
    thumbnail: "",
  });

  // Create lesson modal
  const [isCreateLessonOpen, setIsCreateLessonOpen] = useState(false);
  const [lessonForm, setLessonForm] = useState({
    title: "",
    slug: "",
    summary: "",
    learningObjectives: "",
  });
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [showAdvancedSlug, setShowAdvancedSlug] = useState(false);

  const [isCurriculumAiOpen, setIsCurriculumAiOpen] = useState(false);
  const [isCurriculumAiLoading, setIsCurriculumAiLoading] = useState(false);
  const [curriculumAiCandidateCourseId, setCurriculumAiCandidateCourseId] =
    useState<number | null>(null);
  const [curriculumAiCandidates, setCurriculumAiCandidates] = useState<
    Array<{
      title: string;
      summary: string;
      objectives: string[];
      sections: Array<{ type: string; heading: string; content: string }>;
    }>
  >([]);

  // Delete lesson dialog
  const [pendingDeleteLesson, setPendingDeleteLesson] = useState<{
    id: number;
    title: string;
  } | null>(null);

  const statusLabel = (status: string) =>
    status === "PUBLISHED" ? "Đã xuất bản" : "Bản nháp";
  const levelLabel = (level: string) =>
    ({
      BEGINNER: "Cơ bản (A1 – A2)",
      INTERMEDIATE: "Trung cấp (B1 – B2)",
      ADVANCED: "Nâng cao (C1 – C2)",
    })[level] || level;

  const load = async () => {
    setLoading(true);
    try {
      const data = (await axiosClient.get(
        `/admin/courses/${courseId}/studio`,
      )) as unknown as Studio;
      setStudio(data);
      setCourseForm({
        title: data.course.title,
        description: data.course.description || "",
        level: data.course.level || "BEGINNER",
        thumbnail: data.course.thumbnail || "",
      });
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Không thể tải Course Studio."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) void load();
  }, [courseId]);

  const saveCourse = async () => {
    setBusy(true);
    try {
      await axiosClient.patch(`/admin/courses/${courseId}/studio`, courseForm);
      toast.success("Đã lưu thông tin khóa học");
      await load();
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Lưu khóa học thất bại."));
    } finally {
      setBusy(false);
    }
  };

  const handleLessonTitleChange = (val: string) => {
    setLessonForm((prev) => ({
      ...prev,
      title: val,
      slug: slugManuallyEdited ? prev.slug : slugify(val),
    }));
  };

  const suggestCurriculum = async () => {
    if (!courseForm.title.trim()) {
      toast.error("Vui lòng nhập tên khóa học trước khi gợi ý chương trình.");
      return;
    }
    setIsCurriculumAiLoading(true);
    try {
      const response: any = await axiosClient.post(
        `/admin/courses/${courseId}/studio/ai/curriculum/generate`,
        {
          brief: courseForm.description.trim() || undefined,
          lessonCount: 3,
        },
      );
      const data = response?.data || response;
      const candidates = data?.candidate?.candidates;
      if (!Array.isArray(candidates) || candidates.length === 0) {
        toast.error("Không nhận được gợi ý bài học hợp lệ.");
        return;
      }
      setCurriculumAiCandidates(candidates);
      setCurriculumAiCandidateCourseId(data.candidate.candidateCourseId);
      toast.success(`Đã nhận ${candidates.length} gợi ý bài học nháp.`);
    } catch (e) {
      toast.error(
        getApiErrorMessage(e, "Không thể gợi ý chương trình học lúc này."),
      );
    } finally {
      setIsCurriculumAiLoading(false);
    }
  };

  const applyCurriculumCandidate = (candidate: {
    title: string;
    summary: string;
    objectives: string[];
    sections: Array<{ type: string; heading: string; content: string }>;
  }) => {
    setLessonForm({
      title: candidate.title,
      slug: slugify(candidate.title),
      summary: candidate.summary,
      learningObjectives: candidate.objectives.join("\n"),
    });
    setSlugManuallyEdited(false);
    setShowAdvancedSlug(false);
    setIsCurriculumAiOpen(false);
    setIsCreateLessonOpen(true);
    toast.success(
      "Đã đưa gợi ý vào form bài học. Hãy kiểm tra trước khi tạo bản nháp.",
    );
  };

  const applyWholeCurriculum = async () => {
    if (!curriculumAiCandidates.length) return;
    if (!curriculumAiCandidateCourseId) {
      toast.error(
        "Đề xuất của AI không hợp lệ. Hãy tạo lại đề xuất trước khi áp dụng.",
      );
      return;
    }
    setBusy(true);
    try {
      await axiosClient.post(
        `/admin/courses/${courseId}/studio/ai/curriculum/apply`,
        {
          candidateCourseId: curriculumAiCandidateCourseId,
          lessons: curriculumAiCandidates,
        },
      );
      toast.success(
        "Đã áp dụng curriculum vào Course Draft. Hãy mở từng bài để soạn nội dung và xuất bản thủ công.",
      );
      setCurriculumAiCandidates([]);
      setCurriculumAiCandidateCourseId(null);
      setIsCurriculumAiOpen(false);
      await load();
    } catch (e) {
      toast.error(
        getApiErrorMessage(e, "Không thể áp dụng curriculum vào Draft."),
      );
    } finally {
      setBusy(false);
    }
  };

  const addLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonForm.title.trim()) {
      toast.error("Vui lòng nhập tên bài học.");
      return;
    }
    const finalSlug = lessonForm.slug.trim() || slugify(lessonForm.title);
    if (!finalSlug) {
      toast.error("Vui lòng nhập định danh bài học (slug).");
      return;
    }

    setBusy(true);
    try {
      const lesson = (await axiosClient.post(
        `/admin/courses/${courseId}/studio/lessons`,
        {
          title: lessonForm.title.trim(),
          slug: finalSlug,
          summary:
            lessonForm.summary.trim() || "Tóm tắt bài học đang được cập nhật.",
          learningObjectives: lessonForm.learningObjectives
            .split("\n")
            .map((x) => x.trim())
            .filter(Boolean),
        },
      )) as any;

      setIsCreateLessonOpen(false);
      setLessonForm({
        title: "",
        slug: "",
        summary: "",
        learningObjectives: "",
      });
      setSlugManuallyEdited(false);
      setShowAdvancedSlug(false);
      toast.success("Đã tạo bài học bản nháp thành công!");
      router.push(`/admin/courses/${courseId}/lessons/${lesson.id}`);
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Tạo bài học thất bại."));
    } finally {
      setBusy(false);
    }
  };

  const reorderLesson = async (index: number, direction: "up" | "down") => {
    if (!studio) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= studio.lessons.length) return;

    const newLessons = [...studio.lessons];
    const [moved] = newLessons.splice(index, 1);
    newLessons.splice(targetIndex, 0, moved);

    setBusy(true);
    try {
      await axiosClient.patch(
        `/admin/courses/${courseId}/studio/lessons/reorder`,
        {
          ids: newLessons.map((l) => l.id),
        },
      );
      toast.success("Đã cập nhật thứ tự bài học");
      await load();
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Không thể đổi thứ tự bài học."));
    } finally {
      setBusy(false);
    }
  };

  const deleteLesson = async () => {
    if (!pendingDeleteLesson) return;
    setBusy(true);
    try {
      await axiosClient.delete(
        `/admin/courses/${courseId}/studio/lessons/${pendingDeleteLesson.id}`,
      );
      toast.success(`Đã xóa bài học: ${pendingDeleteLesson.title}`);
      setPendingDeleteLesson(null);
      await load();
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Xóa bài học thất bại."));
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    setBusy(true);
    try {
      const result: any = await axiosClient.get(
        `/admin/courses/${courseId}/studio/validate`,
      );
      if (!result.valid) {
        toast.error(result.errors.join("\n"));
        return;
      }
      await axiosClient.post(`/admin/courses/${courseId}/studio/publish`);
      toast.success("Đã xuất bản khóa học thành công!");
      await load();
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Chưa thể xuất bản."));
    } finally {
      setBusy(false);
    }
  };

  const validateCourse = async () => {
    setBusy(true);
    try {
      const result: any = await axiosClient.get(
        `/admin/courses/${courseId}/studio/validate`,
      );
      if (result.valid) toast.success("Khóa học đã sẵn sàng để xuất bản.");
      else
        toast.error(
          ["Chưa thể xuất bản:", ...(result.errors || [])].join("\n"),
        );
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Không thể kiểm tra khóa học."));
    } finally {
      setBusy(false);
    }
  };

  const revertCourseToDraft = async () => {
    setBusy(true);
    try {
      await axiosClient.post(`/admin/courses/${courseId}/revert-to-draft`);
      toast.success("Khóa học đã được chuyển về bản nháp.");
      setIsRevertCourseConfirmOpen(false);
      await load();
    } catch (e) {
      toast.error(
        getApiErrorMessage(e, "Không thể chuyển khóa học về bản nháp."),
      );
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto flex min-h-64 max-w-6xl items-center justify-center p-8">
        <Loader2 className="animate-spin text-slate-500" size={32} />
      </main>
    );
  }

  if (!studio) {
    return (
      <main className="mx-auto max-w-6xl p-8 text-center text-slate-500">
        Không tìm thấy khóa học.
      </main>
    );
  }

  const isCoursePublished = studio.course.status === "PUBLISHED";

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6 md:p-8">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/courses"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft size={14} /> Danh sách khóa học
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">
              {studio.course.title}
            </h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                studio.course.status === "PUBLISHED"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              {statusLabel(studio.course.status)}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Quản lý thông tin khóa học và lộ trình bài học.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCourseAiWorkspaceOpen(true)}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100 transition-colors disabled:opacity-50"
          >
            <ClipboardCheck size={15} /> AI hỗ trợ hoàn thiện
          </button>
          <button
            type="button"
            onClick={() => void validateCourse()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <Check size={15} /> Kiểm tra
          </button>
          <button
            onClick={saveCourse}
            disabled={busy || isCoursePublished}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <Save size={15} /> Lưu thông tin
          </button>
          {isCoursePublished ? (
            <button
              type="button"
              onClick={() => setIsRevertCourseConfirmOpen(true)}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
            >
              <Edit2 size={15} /> Chuyển về bản nháp
            </button>
          ) : (
            <button
              onClick={() => setIsPublishConfirmOpen(true)}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              <Send size={15} /> Xuất bản khóa học
            </button>
          )}
        </div>
      </div>

      {/* SECTION 1: COURSE OVERVIEW */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
        {isCoursePublished && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Khóa học đang được xuất bản và chỉ có thể xem. Chuyển về bản nháp để
            chỉnh sửa nội dung hoặc lộ trình.
          </div>
        )}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Settings2 size={18} className="text-slate-700" />
          <h2 className="font-semibold text-slate-900">Tổng quan khóa học</h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(17rem,1fr)]">
          <div className="grid gap-5">
            <div>
              <label className="text-sm font-semibold text-slate-800">
                Tên khóa học
              </label>
              <input
                type="text"
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-400"
                value={courseForm.title}
                disabled={isCoursePublished}
                onChange={(e) =>
                  setCourseForm({ ...courseForm, title: e.target.value })
                }
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-800">
                Trình độ khóa học
              </label>
              <select
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-400"
                value={courseForm.level}
                disabled={isCoursePublished}
                onChange={(e) =>
                  setCourseForm({ ...courseForm, level: e.target.value })
                }
              >
                <option value="BEGINNER">{levelLabel("BEGINNER")}</option>
                <option value="INTERMEDIATE">
                  {levelLabel("INTERMEDIATE")}
                </option>
                <option value="ADVANCED">{levelLabel("ADVANCED")}</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-800">
                Mô tả khóa học
              </label>
              <textarea
                rows={3}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-400"
                placeholder="Giới thiệu nội dung và đối tượng phù hợp cho khóa học..."
                value={courseForm.description}
                disabled={isCoursePublished}
                onChange={(e) =>
                  setCourseForm({ ...courseForm, description: e.target.value })
                }
              />
            </div>
          </div>
          <aside className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
            {!isCoursePublished && (
              <>
                <ImageUploadField
                  label="Ảnh bìa khóa học"
                  value={courseForm.thumbnail}
                  onChange={(url) =>
                    setCourseForm({ ...courseForm, thumbnail: url })
                  }
                  helperText="Tùy chọn. Khuyến nghị ảnh ngang 16:9, PNG, JPG hoặc WEBP."
                  compact
                />
                <MediaSearchPanel
                  searchUrl={`/admin/courses/${courseId}/studio/media/search`}
                  acceptUrl={`/admin/courses/${courseId}/studio/media/accept`}
                  generateUrl={`/admin/courses/${courseId}/studio/media/generate`}
                  generateAcceptUrl={`/admin/courses/${courseId}/studio/media/generate/accept`}
                  onAccepted={(data) =>
                    setCourseForm((current) => ({
                      ...current,
                      thumbnail: data.thumbnail || current.thumbnail,
                    }))
                  }
                />
              </>
            )}
          </aside>
        </div>
      </section>

      {/* SECTION 2: CURRICULUM */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-slate-700" />
            <div>
              <h2 className="font-semibold text-slate-900">Chương trình học</h2>
              <p className="text-xs text-slate-500">
                Thứ tự danh sách phản ánh lộ trình học viên trải nghiệm từ bài
                đầu đến bài cuối.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setCurriculumAiCandidates([]);
                setCurriculumAiCandidateCourseId(null);
                setIsCurriculumAiOpen(true);
              }}
              disabled={isCoursePublished}
              className="inline-flex min-h-10 items-center rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900 transition-colors hover:border-amber-300 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-300"
            >
              AI gợi ý chương trình học
            </button>
            <button
              type="button"
              onClick={() => {
                setLessonForm({
                  title: "",
                  slug: "",
                  summary: "",
                  learningObjectives: "",
                });
                setSlugManuallyEdited(false);
                setShowAdvancedSlug(false);
                setIsCreateLessonOpen(true);
              }}
              disabled={isCoursePublished}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <Plus size={15} /> Tạo bài học mới
            </button>
          </div>
        </div>

        {/* LESSONS LIST */}
        <div className="space-y-3">
          {studio.lessons.map((lesson, index) => (
            <div
              key={lesson.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-300 transition-colors"
            >
              {/* LEFT: ORDER & DETAILS */}
              <div className="flex items-center gap-3.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700">
                  #{index + 1}
                </span>

                <div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/courses/${courseId}/lessons/${lesson.id}`}
                      className="font-semibold text-slate-900 hover:text-blue-600 transition-colors"
                    >
                      {lesson.title}
                    </Link>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-semibold ${
                        lesson.status === "PUBLISHED"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {statusLabel(lesson.status)}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
                    <span
                      className={
                        lesson.sections.length
                          ? "text-emerald-700"
                          : "text-amber-700"
                      }
                    >
                      {lesson.sections.length ? "✓" : "○"} Nội dung{" "}
                      {lesson.sections.length}
                    </span>
                    <span
                      className={
                        lesson.exercises.length
                          ? "text-emerald-700"
                          : "text-amber-700"
                      }
                    >
                      {lesson.exercises.length ? "✓" : "○"} Bài luyện tập{" "}
                      {lesson.exercises.length}
                    </span>
                    <span className="text-slate-500">
                      {lesson.media.length ? "✓" : "○"} Hình minh họa
                    </span>
                    <span
                      className={
                        lesson.sections.length > 0 &&
                        lesson.exercises.some(
                          (exercise: any) =>
                            exercise.slug === "final-check" &&
                            exercise.questions?.length > 0,
                        )
                          ? "font-semibold text-emerald-700"
                          : "font-semibold text-amber-700"
                      }
                    >
                      {lesson.sections.length > 0 &&
                      lesson.exercises.some(
                        (exercise: any) =>
                          exercise.slug === "final-check" &&
                          exercise.questions?.length > 0,
                      )
                        ? "Sẵn sàng"
                        : "Chưa hoàn thiện"}
                    </span>
                  </div>
                </div>
              </div>

              {/* RIGHT: ACTION AFFORDANCES */}
              <div className="flex items-center gap-1.5">
                {/* Reorder buttons */}
                <button
                  type="button"
                  onClick={() => reorderLesson(index, "up")}
                  disabled={isCoursePublished || index === 0 || busy}
                  title="Di chuyển lên"
                  className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => reorderLesson(index, "down")}
                  disabled={
                    isCoursePublished ||
                    index === studio.lessons.length - 1 ||
                    busy
                  }
                  title="Di chuyển xuống"
                  className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                >
                  <ArrowDown size={14} />
                </button>

                {/* Edit Button */}
                <Link
                  href={`/admin/courses/${courseId}/lessons/${lesson.id}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  <Edit2 size={13} /> Chỉnh sửa bài học
                </Link>

                {/* Delete Button */}
                <button
                  type="button"
                  onClick={() =>
                    setPendingDeleteLesson({
                      id: lesson.id,
                      title: lesson.title,
                    })
                  }
                  disabled={busy || isCoursePublished}
                  title="Xóa bài học"
                  className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}

          {studio.lessons.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
              <Layers size={28} className="mx-auto mb-2 text-slate-300" />
              Khóa học chưa có bài học nào. Hãy nhấn &quot;Tạo bài học mới&quot;
              để thiết lập chương trình.
            </div>
          )}
        </div>
      </section>

      {/* CURRICULUM AI REVIEW: suggestions stay local until the existing create flow is submitted. */}
      {isCurriculumAiOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-amber-100 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.14em] text-amber-700">
                  Gợi ý biên soạn
                </p>
                <h3 className="mt-1 text-lg font-bold text-slate-950">
                  AI gợi ý chương trình học
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Bạn có thể xem lại từng bài. Áp dụng chỉ điền vào form tạo bài
                  học, chưa ghi dữ liệu.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCurriculumAiOpen(false)}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
                aria-label="Đóng gợi ý chương trình học"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
              {curriculumAiCandidates.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
                  Nhấn “Tạo gợi ý” để nhận các bài học theo trình độ và mô tả
                  khóa học hiện tại.
                </div>
              ) : (
                curriculumAiCandidates.map((candidate, index) => (
                  <article
                    key={`${candidate.title}-${index}`}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-xs font-semibold text-slate-500">
                        Bài gợi ý {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setCurriculumAiCandidates((current) =>
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
                      value={candidate.title}
                      onChange={(event) =>
                        setCurriculumAiCandidates((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, title: event.target.value }
                              : item,
                          ),
                        )
                      }
                      className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                      aria-label={`Tên bài gợi ý ${index + 1}`}
                    />
                    <textarea
                      value={candidate.summary}
                      onChange={(event) =>
                        setCurriculumAiCandidates((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, summary: event.target.value }
                              : item,
                          ),
                        )
                      }
                      className="mt-2 min-h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                      aria-label={`Tóm tắt bài gợi ý ${index + 1}`}
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      {candidate.sections?.length || 0} section plan sẽ được tạo
                      ở Draft; bạn vẫn có thể chỉnh sửa trong Course Studio.
                    </p>
                    <textarea
                      value={candidate.objectives.join("\n")}
                      onChange={(event) =>
                        setCurriculumAiCandidates((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...item,
                                  objectives: event.target.value.split("\n"),
                                }
                              : item,
                          ),
                        )
                      }
                      className="mt-2 min-h-24 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                      aria-label={`Mục tiêu bài gợi ý ${index + 1}`}
                      placeholder="Mỗi mục tiêu một dòng"
                    />
                    <button
                      type="button"
                      onClick={() => applyCurriculumCandidate(candidate)}
                      disabled={!candidate.title.trim()}
                      className="mt-3 min-h-10 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Áp dụng vào form bài học
                    </button>
                  </article>
                ))
              )}
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
              {curriculumAiCandidates.length > 0 && (
                <button
                  type="button"
                  onClick={() => void applyWholeCurriculum()}
                  disabled={busy}
                  className="min-h-10 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50"
                >
                  Áp dụng toàn bộ vào Draft
                </button>
              )}
              <button
                type="button"
                onClick={() => void suggestCurriculum()}
                disabled={isCurriculumAiLoading}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:opacity-50"
              >
                {isCurriculumAiLoading && (
                  <Loader2 size={14} className="animate-spin" />
                )}
                {curriculumAiCandidates.length
                  ? "AI gợi ý lại"
                  : "AI gợi ý chương trình"}
              </button>
              <button
                type="button"
                onClick={() => setIsCurriculumAiOpen(false)}
                className="min-h-10 rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE LESSON MODAL */}
      {isCreateLessonOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                Tạo bài học mới
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateLessonOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={addLesson} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Tên bài học *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyên âm cơ bản trong tiếng Anh"
                  value={lessonForm.title}
                  onChange={(e) => handleLessonTitleChange(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    Tóm tắt ngắn bài học
                  </label>
                </div>
                <textarea
                  rows={2}
                  placeholder="Mô tả tóm tắt nội dung học viên sẽ được trang bị trong bài..."
                  value={lessonForm.summary}
                  onChange={(e) =>
                    setLessonForm({ ...lessonForm, summary: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Mục tiêu học tập (Learning Objectives - mỗi dòng một mục tiêu)
                </label>
                <textarea
                  rows={3}
                  placeholder="Phân biệt cặp nguyên âm /i:/ và /ɪ/&#10;Phát âm chính xác 10 từ vựng thực tế"
                  value={lessonForm.learningObjectives}
                  onChange={(e) =>
                    setLessonForm({
                      ...lessonForm,
                      learningObjectives: e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-400"
                />
              </div>

              {/* ADVANCED SLUG */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdvancedSlug(!showAdvancedSlug)}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  {showAdvancedSlug
                    ? "− Ẩn tùy chọn nâng cao (slug)"
                    : "+ Tùy chọn nâng cao (slug URL)"}
                </button>
                {showAdvancedSlug && (
                  <div className="mt-2">
                    <label className="text-xs text-slate-500">
                      Định danh URL (slug):
                    </label>
                    <input
                      type="text"
                      value={lessonForm.slug}
                      onChange={(e) => {
                        setSlugManuallyEdited(true);
                        setLessonForm({ ...lessonForm, slug: e.target.value });
                      }}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-mono text-slate-800 outline-none focus:border-slate-500"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateLessonOpen(false)}
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
                    <Plus size={13} />
                  )}
                  Tạo bản nháp &amp; Mở editor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={isPublishConfirmOpen}
        title="Xuất bản khóa học?"
        description="Khóa học cùng các bài học đã xuất bản sẽ hiển thị cho học viên sau khi vượt qua kiểm tra nội dung."
        confirmLabel="Xuất bản khóa học"
        isPending={busy}
        onConfirm={() => {
          void publish().then(() => setIsPublishConfirmOpen(false));
        }}
        onCancel={() => setIsPublishConfirmOpen(false)}
      />
      <ConfirmDialog
        open={isRevertCourseConfirmOpen}
        title="Chuyển khóa học về bản nháp?"
        description="Khóa học sẽ tạm ngừng trạng thái xuất bản để bạn có thể chỉnh sửa. Các bài học đã hoàn thiện vẫn giữ nguyên trạng thái hiện tại."
        confirmLabel="Chuyển về bản nháp"
        isPending={busy}
        onConfirm={() => void revertCourseToDraft()}
        onCancel={() => setIsRevertCourseConfirmOpen(false)}
      />

      {/* CONFIRM DELETE LESSON */}
      {pendingDeleteLesson && (
        <ConfirmDialog
          open={true}
          title="Xóa bài học"
          description={`Bạn có chắc muốn xóa bài học "${pendingDeleteLesson.title}"? Mọi nội dung, section và bài tập bên trong sẽ bị loại bỏ.`}
          confirmLabel="Xác nhận xóa"
          onConfirm={deleteLesson}
          onCancel={() => setPendingDeleteLesson(null)}
        />
      )}
      <CourseAiWorkspaceDialog
        courseId={courseId}
        courseStatus={studio.course.status}
        open={isCourseAiWorkspaceOpen}
        onClose={() => setIsCourseAiWorkspaceOpen(false)}
        onApplied={() => void load()}
      />
    </main>
  );
}
