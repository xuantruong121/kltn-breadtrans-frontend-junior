"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosClient from "@/lib/api/axiosClient";
import toast from "react-hot-toast";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Edit,
  XCircle,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  FileText,
  Video,
  BookOpen,
  Send,
  HelpCircle,
  Save,
  Loader2,
  ExternalLink,
  Lock,
  RotateCcw,
  Check,
  AlertCircle,
  X,
} from "lucide-react";

type Material = {
  id: number;
  lessonId: number;
  title: string;
  fileUrl: string;
  fileType: string | null;
};

type Lesson = {
  id: number;
  courseId: number;
  title: string;
  description: string | null;
  order: number;
  videoUrl: string | null;
  materials?: Material[];
};

type Course = {
  id: number;
  title: string;
  description: string | null;
  thumbnail: string | null;
  level: string | null;
  status: "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "REJECTED";
  teacherId: number;
  lessons?: Lesson[];
  quizzes?: any[];
  classes?: any[];
};

const LEVEL_OPTIONS = [
  { value: "BEGINNER", label: "Cơ bản (Beginner)" },
  { value: "INTERMEDIATE", label: "Trung cấp (Intermediate)" },
  { value: "ADVANCED", label: "Nâng cao (Advanced)" },
];

export default function CourseEditStudioPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const courseId = Number(params?.id);

  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [isDirty, setIsDirty] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Form State (Step 1)
  const [basicForm, setBasicForm] = useState({
    title: "",
    level: "BEGINNER",
    description: "",
    thumbnail: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Curriculum Modals (Step 2)
  const [lessonModal, setLessonModal] = useState<{
    isOpen: boolean;
    mode: "CREATE" | "EDIT";
    lessonId?: number;
    title: string;
    description: string;
    videoUrl: string;
  }>({
    isOpen: false,
    mode: "CREATE",
    title: "",
    description: "",
    videoUrl: "",
  });

  const [materialModal, setMaterialModal] = useState<{
    isOpen: boolean;
    mode: "CREATE" | "EDIT";
    lessonId?: number;
    materialId?: number;
    title: string;
    fileUrl: string;
    fileType: string;
  }>({
    isOpen: false,
    mode: "CREATE",
    title: "",
    fileUrl: "",
    fileType: "PDF",
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: "LESSON" | "MATERIAL";
    id: number;
    name: string;
  }>({
    isOpen: false,
    type: "LESSON",
    id: 0,
    name: "",
  });

  // Query course data
  const { data: course, isLoading, isError } = useQuery<Course>({
    queryKey: ["teacher-course-detail", courseId],
    queryFn: async () => {
      const res: any = await axiosClient.get(`/courses/${courseId}`);
      return res?.data || res;
    },
    enabled: !isNaN(courseId),
  });

  // Sync basic form on initial fetch
  useEffect(() => {
    if (course) {
      setBasicForm({
        title: course.title || "",
        level: course.level || "BEGINNER",
        description: course.description || "",
        thumbnail: course.thumbnail || "",
      });
      setIsDirty(false);
    }
  }, [course]);

  // Derived state
  const isPendingReview = course?.status === "PENDING_REVIEW";
  const isPublished = course?.status === "PUBLISHED";
  const isRejected = course?.status === "REJECTED";
  const isDraft = course?.status === "DRAFT";

  const ongoingClassCount = useMemo(() => {
    return (
      course?.classes?.filter((c: any) => c.status === "ONGOING")?.length || 0
    );
  }, [course]);

  // ----------------------------------------------------
  // MUTATIONS
  // ----------------------------------------------------

  // Update Basic Info (Step 1)
  const updateCourseMutation = useMutation({
    mutationFn: async (payload: Partial<Course>) => {
      return await axiosClient.patch(`/courses/${courseId}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["teacher-course-detail", courseId],
      });
      queryClient.invalidateQueries({ queryKey: ["teacher-my-courses"] });
      setIsDirty(false);
      toast.success("Đã lưu thông tin khóa học thành công!");
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || "Cập nhật thông tin thất bại.",
      );
    },
  });

  // Revert to Draft Mutation
  const revertToDraftMutation = useMutation({
    mutationFn: async () => {
      return await axiosClient.post(`/courses/${courseId}/revert-to-draft`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["teacher-course-detail", courseId],
      });
      queryClient.invalidateQueries({ queryKey: ["teacher-my-courses"] });
      toast.success("Khóa học đã được chuyển về Bản nháp để chỉnh sửa.");
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message ||
          "Không thể chuyển về Bản nháp. Khóa học có thể đang có lớp học diễn ra.",
      );
    },
  });

  // Submit for Review Mutation (Step 3)
  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      return await axiosClient.post(`/courses/${courseId}/submit-review`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["teacher-course-detail", courseId],
      });
      queryClient.invalidateQueries({ queryKey: ["teacher-my-courses"] });
      toast.success("Đã gửi khóa học để Admin phê duyệt!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Gửi duyệt thất bại.");
    },
  });

  // Create Lesson Mutation
  const createLessonMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      videoUrl?: string;
    }) => {
      return await axiosClient.post(`/courses/${courseId}/lessons`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["teacher-course-detail", courseId],
      });
      setLessonModal((prev) => ({ ...prev, isOpen: false }));
      toast.success("Thêm bài học mới thành công!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Thêm bài học thất bại.");
    },
  });

  // Update Lesson Mutation
  const updateLessonMutation = useMutation({
    mutationFn: async ({
      lessonId,
      data,
    }: {
      lessonId: number;
      data: { title?: string; description?: string; videoUrl?: string };
    }) => {
      return await axiosClient.patch(`/courses/lessons/${lessonId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["teacher-course-detail", courseId],
      });
      setLessonModal((prev) => ({ ...prev, isOpen: false }));
      toast.success("Cập nhật bài học thành công!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Cập nhật bài học thất bại.");
    },
  });

  // Delete Lesson Mutation
  const deleteLessonMutation = useMutation({
    mutationFn: async (lessonId: number) => {
      return await axiosClient.delete(`/courses/lessons/${lessonId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["teacher-course-detail", courseId],
      });
      setDeleteConfirm((prev) => ({ ...prev, isOpen: false }));
      toast.success("Đã xóa bài học!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Xóa bài học thất bại.");
    },
  });

  // Reorder Lessons Mutation
  const reorderLessonsMutation = useMutation({
    mutationFn: async (lessonIds: number[]) => {
      return await axiosClient.post(`/courses/${courseId}/lessons/reorder`, {
        lessonIds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["teacher-course-detail", courseId],
      });
      toast.success("Đã cập nhật thứ tự bài học.");
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || "Sắp xếp bài học thất bại.",
      );
    },
  });

  // Create Material Mutation
  const createMaterialMutation = useMutation({
    mutationFn: async ({
      lessonId,
      data,
    }: {
      lessonId: number;
      data: { title: string; fileUrl: string; fileType?: string };
    }) => {
      return await axiosClient.post(
        `/courses/lessons/${lessonId}/materials`,
        data,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["teacher-course-detail", courseId],
      });
      setMaterialModal((prev) => ({ ...prev, isOpen: false }));
      toast.success("Đã thêm tài liệu học tập!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Thêm tài liệu thất bại.");
    },
  });

  // Update Material Mutation
  const updateMaterialMutation = useMutation({
    mutationFn: async ({
      materialId,
      data,
    }: {
      materialId: number;
      data: { title?: string; fileUrl?: string; fileType?: string };
    }) => {
      return await axiosClient.patch(
        `/courses/materials/${materialId}`,
        data,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["teacher-course-detail", courseId],
      });
      setMaterialModal((prev) => ({ ...prev, isOpen: false }));
      toast.success("Đã cập nhật tài liệu học tập!");
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || "Cập nhật tài liệu thất bại.",
      );
    },
  });

  // Delete Material Mutation
  const deleteMaterialMutation = useMutation({
    mutationFn: async (materialId: number) => {
      return await axiosClient.delete(`/courses/materials/${materialId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["teacher-course-detail", courseId],
      });
      setDeleteConfirm((prev) => ({ ...prev, isOpen: false }));
      toast.success("Đã xóa tài liệu học tập!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Xóa tài liệu thất bại.");
    },
  });

  // ----------------------------------------------------
  // HANDLERS
  // ----------------------------------------------------

  const validateBasicForm = () => {
    const errors: Record<string, string> = {};
    if (!basicForm.title.trim()) {
      errors.title = "Tiêu đề khóa học là bắt buộc.";
    } else if (basicForm.title.trim().length < 5) {
      errors.title = "Tiêu đề khóa học phải có ít nhất 5 ký tự.";
    }

    if (!basicForm.description.trim()) {
      errors.description = "Mô tả khóa học là bắt buộc.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveBasicInfo = async (continueToNext = false) => {
    if (!validateBasicForm()) return;

    // If published, only send description and thumbnail
    const payload: Partial<Course> = isPublished
      ? {
          description: basicForm.description.trim(),
          thumbnail: basicForm.thumbnail.trim() || undefined,
        }
      : {
          title: basicForm.title.trim(),
          level: basicForm.level,
          description: basicForm.description.trim(),
          thumbnail: basicForm.thumbnail.trim() || undefined,
        };

    updateCourseMutation.mutate(payload, {
      onSuccess: () => {
        if (continueToNext) {
          setActiveStep(2);
        }
      },
    });
  };

  const handleMoveLesson = (index: number, direction: "UP" | "DOWN") => {
    if (!course?.lessons) return;
    const lessons = [...course.lessons];
    const targetIndex = direction === "UP" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= lessons.length) return;

    // Swap
    const temp = lessons[index];
    lessons[index] = lessons[targetIndex];
    lessons[targetIndex] = temp;

    const lessonIds = lessons.map((l) => l.id);
    reorderLessonsMutation.mutate(lessonIds);
  };

  const handleBackNavigation = () => {
    if (isDirty) {
      setShowExitConfirm(true);
    } else {
      router.push(`/teacher/courses/${courseId}`);
    }
  };

  // Checklist for Step 3
  const checklist = useMemo(() => {
    const hasTitle = !!course?.title && course.title.trim().length >= 5;
    const hasDesc = !!course?.description && course.description.trim().length > 0;
    const lessons = course?.lessons || [];
    const hasLessons = lessons.length > 0;
    const lessonsHaveContent =
      hasLessons &&
      lessons.every(
        (l) => (l.materials && l.materials.length > 0) || !!l.videoUrl,
      );

    return {
      hasTitle,
      hasDesc,
      hasLessons,
      lessonsHaveContent,
      canSubmit: hasTitle && hasDesc && hasLessons && isDraft,
    };
  }, [course, isDraft]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-slate-400 mb-3" size={36} />
        <p className="text-slate-500 text-sm font-medium">
          Đang tải thông tin khóa học...
        </p>
      </div>
    );
  }

  if (isError || !course) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center">
        <AlertCircle size={48} className="mx-auto text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          Không tìm thấy khóa học
        </h2>
        <p className="text-slate-500 text-sm mb-6">
          Khóa học không tồn tại hoặc bạn không có quyền truy cập vào tài nguyên này.
        </p>
        <Link
          href="/teacher/courses"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800"
        >
          <ArrowLeft size={16} /> Quay lại danh sách khóa học
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBackNavigation}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              title="Quay lại chi tiết khóa học"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Course Studio
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                    isDraft
                      ? "bg-slate-100 text-slate-700 border-slate-200"
                      : isPendingReview
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : isPublished
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}
                >
                  {isDraft
                    ? "Bản nháp"
                    : isPendingReview
                      ? "Chờ duyệt"
                      : isPublished
                        ? "Đã xuất bản"
                        : "Bị từ chối"}
                </span>
              </div>
              <h1 className="text-base font-bold text-slate-900 truncate max-w-xs sm:max-w-md">
                {course.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/teacher/courses/${courseId}`}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            >
              <ExternalLink size={13} />
              Xem trang khóa học
            </Link>

            {isDraft && activeStep === 1 && (
              <button
                onClick={() => handleSaveBasicInfo(false)}
                disabled={updateCourseMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
              >
                {updateCourseMutation.isPending ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Save size={13} />
                )}
                Lưu thay đổi
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        {/* Status Alerts */}
        {isPendingReview && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-amber-800">
            <Clock size={20} className="shrink-0 text-amber-600 mt-0.5" />
            <div className="text-sm">
              <h4 className="font-semibold mb-0.5">
                Khóa học đang chờ Quản trị viên duyệt
              </h4>
              <p className="text-amber-700 leading-relaxed text-xs">
                Nội dung hiện đã được khóa để bảo đảm quá trình thẩm định. Bạn có
                thể rút lại về Bản nháp nếu muốn tiếp tục chỉnh sửa.
              </p>
              <div className="mt-3">
                <button
                  onClick={() => revertToDraftMutation.mutate()}
                  disabled={revertToDraftMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-amber-800 border border-amber-300 rounded-lg text-xs font-semibold hover:bg-amber-100 transition-colors shadow-xs"
                >
                  <RotateCcw size={12} />
                  Rút lại về Bản nháp
                </button>
              </div>
            </div>
          </div>
        )}

        {isPublished && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start justify-between gap-4 text-emerald-800 flex-wrap">
            <div className="flex items-start gap-3">
              <CheckCircle2
                size={20}
                className="shrink-0 text-emerald-600 mt-0.5"
              />
              <div className="text-sm">
                <h4 className="font-semibold mb-0.5">Khóa học đã xuất bản</h4>
                <p className="text-emerald-700 text-xs leading-relaxed max-w-2xl">
                  Bạn có thể cập nhật ảnh bìa và mô tả trực tiếp. Nếu cần thay
                  đổi tiêu đề hoặc giáo trình học thuật, vui lòng chuyển khóa học
                  về Bản nháp (chỉ cho phép khi không có lớp học nào đang diễn
                  ra).
                </p>
              </div>
            </div>

            {ongoingClassCount > 0 ? (
              <span
                className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-xs font-medium border border-slate-200 shrink-0 cursor-not-allowed"
                title="Khóa học đang có lớp diễn ra, không thể sửa giáo trình"
              >
                Đang có {ongoingClassCount} lớp ONGOING (Khóa sửa giáo trình)
              </span>
            ) : (
              <button
                onClick={() => {
                  if (
                    confirm(
                      "Chuyển khóa học về Bản nháp để sửa giáo trình? Sau khi sửa bạn sẽ cần gửi duyệt lại.",
                    )
                  ) {
                    revertToDraftMutation.mutate();
                  }
                }}
                disabled={revertToDraftMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-colors shadow-xs shrink-0"
              >
                <RotateCcw size={13} />
                Chuyển về Bản nháp để sửa giáo trình
              </button>
            )}
          </div>
        )}

        {isRejected && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start justify-between gap-4 text-rose-800 flex-wrap">
            <div className="flex items-start gap-3">
              <XCircle size={20} className="shrink-0 text-rose-600 mt-0.5" />
              <div className="text-sm">
                <h4 className="font-semibold mb-0.5">
                  Khóa học bị từ chối phê duyệt
                </h4>
                <p className="text-rose-700 text-xs leading-relaxed">
                  Khóa học chưa đạt tiêu chuẩn kiểm định của Quản trị viên. Bạn
                  hãy hoàn thiện giáo trình và nộp lại để được xem xét.
                </p>
              </div>
            </div>

            <button
              onClick={() => revertToDraftMutation.mutate()}
              disabled={revertToDraftMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-rose-800 border border-rose-300 rounded-lg text-xs font-semibold hover:bg-rose-100 transition-colors shadow-xs shrink-0"
            >
              <RotateCcw size={13} />
              Chuyển về Bản nháp để hoàn thiện
            </button>
          </div>
        )}

        {/* Stepper Header */}
        <div className="bg-white rounded-xl border border-slate-200 p-2 mb-6 shadow-xs">
          <div className="grid grid-cols-3 gap-2">
            {[
              { step: 1, title: "1. Thông tin chung", icon: BookOpen },
              { step: 2, title: "2. Giáo trình", icon: FileText },
              { step: 3, title: "3. Kiểm tra & Nộp", icon: CheckCircle2 },
            ].map((s) => {
              const Icon = s.icon;
              const isActive = activeStep === s.step;
              const isCompleted = activeStep > s.step;

              return (
                <button
                  key={s.step}
                  onClick={() => setActiveStep(s.step as any)}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-slate-900 text-white shadow-xs"
                      : isCompleted
                        ? "text-slate-700 hover:bg-slate-100"
                        : "text-slate-400 hover:bg-slate-50"
                  }`}
                >
                  <Icon size={16} />
                  <span className="hidden sm:inline">{s.title}</span>
                  <span className="sm:hidden">{s.step}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ============================================================ */}
        {/* STEP 1: BASIC INFORMATION */}
        {/* ============================================================ */}
        {activeStep === 1 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
            <div className="border-b border-slate-100 pb-4 mb-6">
              <h2 className="text-lg font-bold text-slate-900">
                Thông tin cơ bản của khóa học
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Thiết lập các thuộc tính nhận diện và phân loại trình độ học thuật
                cho khóa học.
              </p>
            </div>

            <div className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tiêu đề khóa học <span className="text-rose-500">*</span>
                  {isPublished && (
                    <span className="ml-2 text-[11px] font-normal text-slate-400">
                      (Đã khóa trên khóa học đã xuất bản)
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  disabled={isPendingReview || isPublished}
                  value={basicForm.title}
                  onChange={(e) => {
                    setBasicForm({ ...basicForm, title: e.target.value });
                    setIsDirty(true);
                    if (formErrors.title) {
                      setFormErrors({ ...formErrors, title: "" });
                    }
                  }}
                  placeholder="Ví dụ: Luyện thi IELTS Writing Task 2 Nâng Cao"
                  className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border rounded-lg outline-none transition-all disabled:bg-slate-100 disabled:text-slate-500 ${
                    formErrors.title
                      ? "border-rose-400 focus:border-rose-500 bg-rose-50/30"
                      : "border-slate-200 focus:border-amber-500 focus:bg-white"
                  }`}
                />
                {formErrors.title && (
                  <p className="text-xs text-rose-500 mt-1 font-medium">
                    {formErrors.title}
                  </p>
                )}
              </div>

              {/* Level */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Trình độ học thuật <span className="text-rose-500">*</span>
                  {isPublished && (
                    <span className="ml-2 text-[11px] font-normal text-slate-400">
                      (Đã khóa trên khóa học đã xuất bản)
                    </span>
                  )}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {LEVEL_OPTIONS.map((opt) => {
                    const isSelected = basicForm.level === opt.value;
                    const disabled = isPendingReview || isPublished;
                    return (
                      <button
                        type="button"
                        key={opt.value}
                        disabled={disabled}
                        onClick={() => {
                          setBasicForm({ ...basicForm, level: opt.value });
                          setIsDirty(true);
                        }}
                        className={`p-3 rounded-xl text-left border text-xs font-medium transition-all ${
                          isSelected
                            ? "bg-amber-50/60 border-amber-400 text-amber-900 shadow-xs"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
                      >
                        <div className="font-semibold text-slate-900 mb-0.5">
                          {opt.label}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Mã hệ thống: {opt.value}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mô tả khóa học <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  disabled={isPendingReview}
                  value={basicForm.description}
                  onChange={(e) => {
                    setBasicForm({ ...basicForm, description: e.target.value });
                    setIsDirty(true);
                    if (formErrors.description) {
                      setFormErrors({ ...formErrors, description: "" });
                    }
                  }}
                  placeholder="Mô tả mục tiêu đầu ra, lộ trình học tập và đối tượng học viên phù hợp..."
                  className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border rounded-lg outline-none transition-all disabled:bg-slate-100 disabled:text-slate-500 ${
                    formErrors.description
                      ? "border-rose-400 focus:border-rose-500 bg-rose-50/30"
                      : "border-slate-200 focus:border-amber-500 focus:bg-white"
                  }`}
                />
                {formErrors.description && (
                  <p className="text-xs text-rose-500 mt-1 font-medium">
                    {formErrors.description}
                  </p>
                )}
              </div>

              {/* Thumbnail URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Đường dẫn ảnh bìa (Thumbnail URL)
                </label>
                <div className="flex gap-4 items-start">
                  <div className="flex-1">
                    <input
                      type="url"
                      disabled={isPendingReview}
                      value={basicForm.thumbnail}
                      onChange={(e) => {
                        setBasicForm({
                          ...basicForm,
                          thumbnail: e.target.value,
                        });
                        setIsDirty(true);
                      }}
                      placeholder="https://images.unsplash.com/... hoặc link ảnh hợp lệ"
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-amber-500 focus:bg-white transition-all disabled:bg-slate-100"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Khuyến nghị tỷ lệ 16:9, dung lượng nhẹ, độ phân giải tối
                      thiểu 800x450px.
                    </p>
                  </div>
                  <div className="w-24 h-16 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                    {basicForm.thumbnail ? (
                      <img
                        src={basicForm.thumbnail}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <BookOpen size={20} className="text-slate-300" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="border-t border-slate-100 pt-6 mt-8 flex items-center justify-between">
              <button
                type="button"
                onClick={handleBackNavigation}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
              >
                Hủy bỏ
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={updateCourseMutation.isPending || isPendingReview}
                  onClick={() => handleSaveBasicInfo(false)}
                  className="px-4 py-2 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
                >
                  {updateCourseMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveBasicInfo(true)}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  Tiếp tục sang Giáo trình →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 2: CURRICULUM BUILDER */}
        {/* ============================================================ */}
        {activeStep === 2 && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Cấu trúc giáo trình học thuật
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Xây dựng danh sách bài giảng, video hướng dẫn và tài liệu học
                  tập đính kèm.
                </p>
              </div>

              {!isPendingReview && !isPublished && (
                <button
                  onClick={() =>
                    setLessonModal({
                      isOpen: true,
                      mode: "CREATE",
                      title: "",
                      description: "",
                      videoUrl: "",
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  <Plus size={14} /> Thêm bài học mới
                </button>
              )}
            </div>

            {/* Lessons List */}
            {course.lessons && course.lessons.length > 0 ? (
              <div className="space-y-4">
                {course.lessons.map((lesson, idx) => {
                  const hasMaterials =
                    lesson.materials && lesson.materials.length > 0;
                  return (
                    <div
                      key={lesson.id}
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs transition-all hover:border-slate-300"
                    >
                      {/* Lesson Header */}
                      <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                        <div className="flex items-start gap-3">
                          <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <div>
                            <h3 className="font-bold text-slate-900 text-sm">
                              {lesson.title}
                            </h3>
                            {lesson.description && (
                              <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">
                                {lesson.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Reorder and Lesson Actions */}
                        {!isPendingReview && !isPublished && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              disabled={idx === 0}
                              onClick={() => handleMoveLesson(idx, "UP")}
                              className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors disabled:opacity-30"
                              title="Di chuyển lên"
                            >
                              <ChevronUp size={15} />
                            </button>
                            <button
                              disabled={idx === (course.lessons?.length || 1) - 1}
                              onClick={() => handleMoveLesson(idx, "DOWN")}
                              className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors disabled:opacity-30"
                              title="Di chuyển xuống"
                            >
                              <ChevronDown size={15} />
                            </button>
                            <button
                              onClick={() =>
                                setLessonModal({
                                  isOpen: true,
                                  mode: "EDIT",
                                  lessonId: lesson.id,
                                  title: lesson.title,
                                  description: lesson.description || "",
                                  videoUrl: lesson.videoUrl || "",
                                })
                              }
                              className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100 transition-colors ml-1"
                              title="Chỉnh sửa bài học"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() =>
                                setDeleteConfirm({
                                  isOpen: true,
                                  type: "LESSON",
                                  id: lesson.id,
                                  name: lesson.title,
                                })
                              }
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                              title="Xóa bài học"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Video URL */}
                      <div className="mt-3 flex items-center gap-2 text-xs">
                        <Video size={14} className="text-slate-400 shrink-0" />
                        {lesson.videoUrl ? (
                          <a
                            href={lesson.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline truncate max-w-lg"
                          >
                            {lesson.videoUrl}
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">
                            Chưa gắn video bài giảng
                          </span>
                        )}
                      </div>

                      {/* Materials Section */}
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                            <FileText size={13} className="text-slate-400" />
                            Tài liệu đính kèm ({lesson.materials?.length || 0})
                          </span>

                          {!isPendingReview && !isPublished && (
                            <button
                              onClick={() =>
                                setMaterialModal({
                                  isOpen: true,
                                  mode: "CREATE",
                                  lessonId: lesson.id,
                                  title: "",
                                  fileUrl: "",
                                  fileType: "PDF",
                                })
                              }
                              className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1"
                            >
                              <Plus size={12} /> Thêm tài liệu
                            </button>
                          )}
                        </div>

                        {hasMaterials ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                            {lesson.materials?.map((mat) => (
                              <div
                                key={mat.id}
                                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                              >
                                <div className="flex items-center gap-2 min-w-0 pr-2">
                                  <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-bold text-[10px]">
                                    {mat.fileType || "FILE"}
                                  </span>
                                  <a
                                    href={mat.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium text-slate-800 hover:text-blue-600 truncate"
                                  >
                                    {mat.title}
                                  </a>
                                </div>

                                {!isPendingReview && !isPublished && (
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      onClick={() =>
                                        setMaterialModal({
                                          isOpen: true,
                                          mode: "EDIT",
                                          lessonId: lesson.id,
                                          materialId: mat.id,
                                          title: mat.title,
                                          fileUrl: mat.fileUrl,
                                          fileType: mat.fileType || "PDF",
                                        })
                                      }
                                      className="p-1 text-slate-400 hover:text-slate-700 rounded"
                                      title="Sửa tài liệu"
                                    >
                                      <Edit size={12} />
                                    </button>
                                    <button
                                      onClick={() =>
                                        setDeleteConfirm({
                                          isOpen: true,
                                          type: "MATERIAL",
                                          id: mat.id,
                                          name: mat.title,
                                        })
                                      }
                                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                      title="Xóa tài liệu"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-3 text-center bg-slate-50/50 rounded-lg text-slate-400 text-xs">
                            Chưa có tài liệu đính kèm cho bài học này.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
                <FileText size={40} className="mx-auto text-slate-300 mb-3" />
                <h3 className="font-bold text-slate-800 text-base mb-1">
                  Chưa có bài học nào trong giáo trình
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mb-5">
                  Hãy bắt đầu xây dựng giáo trình bằng cách thêm các bài giảng đầu
                  tiên kèm bài giảng video hoặc tài liệu PDF/DOCX.
                </p>
                {!isPendingReview && !isPublished && (
                  <button
                    onClick={() =>
                      setLessonModal({
                        isOpen: true,
                        mode: "CREATE",
                        title: "",
                        description: "",
                        videoUrl: "",
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                  >
                    <Plus size={14} /> Thêm bài học đầu tiên
                  </button>
                )}
              </div>
            )}

            {/* Stepper Footer */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between shadow-xs">
              <button
                onClick={() => setActiveStep(1)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                ← Quay lại Thông tin chung
              </button>

              <button
                onClick={() => setActiveStep(3)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                Tiếp tục sang Kiểm tra & Nộp →
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 3: REVIEW & SUBMIT */}
        {/* ============================================================ */}
        {activeStep === 3 && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
              <div className="border-b border-slate-100 pb-4 mb-6">
                <h2 className="text-lg font-bold text-slate-900">
                  Kiểm tra & Gửi phê duyệt
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Rà soát tổng quan các tiêu chuẩn chất lượng học thuật trước khi
                  gửi tới Ban Quản Trị để phê duyệt xuất bản.
                </p>
              </div>

              {/* Summary Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-xs text-slate-400 font-medium mb-1">
                    Trình độ & Phân loại
                  </div>
                  <div className="text-base font-bold text-slate-900">
                    {course.level || "Chưa gắn"}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Trạng thái: {course.status}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-xs text-slate-400 font-medium mb-1">
                    Tổng số bài học
                  </div>
                  <div className="text-base font-bold text-slate-900">
                    {course.lessons?.length || 0} Bài học
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Thứ tự đã được chuẩn hóa
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-xs text-slate-400 font-medium mb-1">
                    Tài liệu học tập
                  </div>
                  <div className="text-base font-bold text-slate-900">
                    {course.lessons?.reduce(
                      (acc, l) => acc + (l.materials?.length || 0),
                      0,
                    ) || 0}{" "}
                    Tài liệu
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Đính kèm bài giảng
                  </div>
                </div>
              </div>

              {/* Checklist */}
              <div className="border border-slate-200 rounded-xl overflow-hidden mb-8">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-semibold text-xs text-slate-700">
                  Tiêu chuẩn đánh giá điều kiện nộp duyệt
                </div>
                <div className="divide-y divide-slate-100 text-xs">
                  <div className="px-4 py-3 flex items-center justify-between">
                    <span className="font-medium text-slate-700">
                      Tiêu đề khóa học hợp lệ (tối thiểu 5 ký tự)
                    </span>
                    {checklist.hasTitle ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                        <Check size={14} /> Hợp lệ
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-500 font-semibold">
                        <X size={14} /> Chưa đạt
                      </span>
                    )}
                  </div>

                  <div className="px-4 py-3 flex items-center justify-between">
                    <span className="font-medium text-slate-700">
                      Mô tả khóa học đầy đủ mục tiêu & đối tượng
                    </span>
                    {checklist.hasDesc ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                        <Check size={14} /> Hợp lệ
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-500 font-semibold">
                        <X size={14} /> Chưa đạt
                      </span>
                    )}
                  </div>

                  <div className="px-4 py-3 flex items-center justify-between">
                    <span className="font-medium text-slate-700">
                      Giáo trình có ít nhất 1 bài học
                    </span>
                    {checklist.hasLessons ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                        <Check size={14} /> Đạt ({course.lessons?.length || 0}{" "}
                        bài học)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-500 font-semibold">
                        <X size={14} /> Cần bổ sung
                      </span>
                    )}
                  </div>

                  <div className="px-4 py-3 flex items-center justify-between">
                    <span className="font-medium text-slate-700">
                      Các bài học có video hoặc tài liệu học tập
                    </span>
                    {checklist.lessonsHaveContent ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                        <Check size={14} /> Đã có tài liệu
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
                        <AlertTriangle size={14} /> Khuyến nghị bổ sung thêm
                      </span>
                    )}
                  </div>

                  <div className="px-4 py-3 flex items-center justify-between bg-slate-50/50">
                    <span className="font-medium text-slate-700">
                      Trạng thái hiện tại cho phép nộp duyệt
                    </span>
                    <span className="font-semibold text-slate-900">
                      {course.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveStep(1)}
                    className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                  >
                    Sửa Thông tin chung
                  </button>
                  <button
                    onClick={() => setActiveStep(2)}
                    className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                  >
                    Sửa Giáo trình
                  </button>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => router.push(`/teacher/courses/${courseId}`)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Lưu bản nháp & Thoát
                  </button>

                  {isDraft && (
                    <button
                      disabled={
                        !checklist.canSubmit || submitReviewMutation.isPending
                      }
                      onClick={() => {
                        if (
                          confirm(
                            "Gửi khóa học này tới Admin phê duyệt? Sau khi gửi, nội dung sẽ được khóa để thẩm định.",
                          )
                        ) {
                          submitReviewMutation.mutate();
                        }
                      }}
                      className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
                    >
                      {submitReviewMutation.isPending ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Send size={14} />
                      )}
                      Gửi duyệt khóa học
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* MODAL: CREATE / EDIT LESSON */}
      {/* ============================================================ */}
      {lessonModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">
                {lessonModal.mode === "CREATE"
                  ? "Thêm bài học mới"
                  : "Chỉnh sửa bài học"}
              </h3>
              <button
                onClick={() =>
                  setLessonModal((prev) => ({ ...prev, isOpen: false }))
                }
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!lessonModal.title.trim()) {
                  toast.error("Tiêu đề bài học là bắt buộc.");
                  return;
                }
                if (lessonModal.mode === "CREATE") {
                  createLessonMutation.mutate({
                    title: lessonModal.title.trim(),
                    description: lessonModal.description.trim() || undefined,
                    videoUrl: lessonModal.videoUrl.trim() || undefined,
                  });
                } else if (lessonModal.lessonId) {
                  updateLessonMutation.mutate({
                    lessonId: lessonModal.lessonId,
                    data: {
                      title: lessonModal.title.trim(),
                      description: lessonModal.description.trim() || undefined,
                      videoUrl: lessonModal.videoUrl.trim() || undefined,
                    },
                  });
                }
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tiêu đề bài học <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={lessonModal.title}
                  onChange={(e) =>
                    setLessonModal({ ...lessonModal, title: e.target.value })
                  }
                  placeholder="Ví dụ: Bài 1: Tổng quan chiến lược làm bài Task 2"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mô tả bài học
                </label>
                <textarea
                  rows={3}
                  value={lessonModal.description}
                  onChange={(e) =>
                    setLessonModal({
                      ...lessonModal,
                      description: e.target.value,
                    })
                  }
                  placeholder="Nội dung chính hoặc hướng dẫn bài học..."
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Đường dẫn Video bài giảng (YouTube / Vimeo / Cloud)
                </label>
                <input
                  type="url"
                  value={lessonModal.videoUrl}
                  onChange={(e) =>
                    setLessonModal({ ...lessonModal, videoUrl: e.target.value })
                  }
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setLessonModal((prev) => ({ ...prev, isOpen: false }))
                  }
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={
                    createLessonMutation.isPending ||
                    updateLessonMutation.isPending
                  }
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {createLessonMutation.isPending ||
                  updateLessonMutation.isPending ? (
                    <Loader2 size={14} className="animate-spin inline mr-1" />
                  ) : null}
                  {lessonModal.mode === "CREATE"
                    ? "Tạo bài học"
                    : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: CREATE / EDIT MATERIAL */}
      {/* ============================================================ */}
      {materialModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">
                {materialModal.mode === "CREATE"
                  ? "Thêm tài liệu học tập"
                  : "Chỉnh sửa tài liệu"}
              </h3>
              <button
                onClick={() =>
                  setMaterialModal((prev) => ({ ...prev, isOpen: false }))
                }
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (
                  !materialModal.title.trim() ||
                  !materialModal.fileUrl.trim()
                ) {
                  toast.error("Vui lòng điền đầy đủ tiêu đề và đường dẫn file.");
                  return;
                }
                if (
                  materialModal.mode === "CREATE" &&
                  materialModal.lessonId
                ) {
                  createMaterialMutation.mutate({
                    lessonId: materialModal.lessonId,
                    data: {
                      title: materialModal.title.trim(),
                      fileUrl: materialModal.fileUrl.trim(),
                      fileType: materialModal.fileType,
                    },
                  });
                } else if (
                  materialModal.mode === "EDIT" &&
                  materialModal.materialId
                ) {
                  updateMaterialMutation.mutate({
                    materialId: materialModal.materialId,
                    data: {
                      title: materialModal.title.trim(),
                      fileUrl: materialModal.fileUrl.trim(),
                      fileType: materialModal.fileType,
                    },
                  });
                }
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tên tài liệu <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={materialModal.title}
                  onChange={(e) =>
                    setMaterialModal({
                      ...materialModal,
                      title: e.target.value,
                    })
                  }
                  placeholder="Ví dụ: Slide Bài giảng Unit 1 (PDF)"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Định dạng tài liệu
                </label>
                <select
                  value={materialModal.fileType}
                  onChange={(e) =>
                    setMaterialModal({
                      ...materialModal,
                      fileType: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-amber-500 focus:bg-white"
                >
                  <option value="PDF">Tài liệu PDF</option>
                  <option value="DOCX">Văn bản Word (.docx)</option>
                  <option value="XLSX">Bảng tính Excel (.xlsx)</option>
                  <option value="MP3">Tệp Audio / Nghe (.mp3)</option>
                  <option value="LINK">Liên kết web / Drive</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Đường dẫn tài liệu (File URL) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  value={materialModal.fileUrl}
                  onChange={(e) =>
                    setMaterialModal({
                      ...materialModal,
                      fileUrl: e.target.value,
                    })
                  }
                  placeholder="https://drive.google.com/... hoặc link tải"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setMaterialModal((prev) => ({ ...prev, isOpen: false }))
                  }
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={
                    createMaterialMutation.isPending ||
                    updateMaterialMutation.isPending
                  }
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {createMaterialMutation.isPending ||
                  updateMaterialMutation.isPending ? (
                    <Loader2 size={14} className="animate-spin inline mr-1" />
                  ) : null}
                  {materialModal.mode === "CREATE"
                    ? "Thêm tài liệu"
                    : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: DELETE CONFIRMATION */}
      {/* ============================================================ */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle size={22} />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1">
              Xác nhận xóa {deleteConfirm.type === "LESSON" ? "bài học" : "tài liệu"}?
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              Bạn có chắc chắn muốn xóa &ldquo;
              <span className="font-semibold text-slate-800">
                {deleteConfirm.name}
              </span>
              &rdquo;?{" "}
              {deleteConfirm.type === "LESSON"
                ? "Tất cả tài liệu đính kèm bên trong bài học này cũng sẽ bị xóa. Thao tác này không thể hoàn tác."
                : "Hành động này không thể hoàn tác."}
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() =>
                  setDeleteConfirm((prev) => ({ ...prev, isOpen: false }))
                }
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={
                  deleteLessonMutation.isPending ||
                  deleteMaterialMutation.isPending
                }
                onClick={() => {
                  if (deleteConfirm.type === "LESSON") {
                    deleteLessonMutation.mutate(deleteConfirm.id);
                  } else {
                    deleteMaterialMutation.mutate(deleteConfirm.id);
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50"
              >
                {deleteLessonMutation.isPending ||
                deleteMaterialMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin inline mr-1" />
                ) : null}
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: UNSAVED CHANGES GUARD */}
      {/* ============================================================ */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <AlertCircle size={22} />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1">
              Bạn có thay đổi chưa lưu
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              Bạn đang có những chỉnh sửa chưa được lưu vào hệ thống. Nếu rời đi
              bây giờ, những thay đổi này sẽ bị mất.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Ở lại chỉnh sửa
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExitConfirm(false);
                  router.push(`/teacher/courses/${courseId}`);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                Rời đi không lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
