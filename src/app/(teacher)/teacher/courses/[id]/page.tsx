"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosClient from "@/lib/api/axiosClient";
import toast from "react-hot-toast";
import Link from "next/link";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import {
  ArrowLeft,
  BookOpen,
  Edit,
  Plus,
  Users,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Video,
  ExternalLink,
  RotateCcw,
  Loader2,
  GraduationCap,
  Layers,
  HelpCircle,
  X,
  Lock,
} from "lucide-react";

type Material = {
  id: number;
  title: string;
  fileUrl: string;
  fileType: string | null;
};

type Lesson = {
  id: number;
  title: string;
  description: string | null;
  order: number;
  videoUrl: string | null;
  materials?: Material[];
};

type ClassItem = {
  id: number;
  name: string;
  status: string;
  capacity?: number;
  _count?: { enrollments: number };
  startDate: string | null;
  endDate: string | null;
  meetingLink: string | null;
};

type Course = {
  id: number;
  title: string;
  description: string | null;
  thumbnail: string | null;
  level: string | null;
  status: "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "REJECTED";
  createdAt: string;
  lessons?: Lesson[];
  quizzes?: any[];
  classes?: ClassItem[];
};

const STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string; icon: any }
> = {
  DRAFT: {
    label: "Bản nháp",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    icon: Edit,
  },
  PENDING_REVIEW: {
    label: "Đang chờ Admin duyệt",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Clock,
  },
  PUBLISHED: {
    label: "Đã xuất bản",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
  REJECTED: {
    label: "Cần chỉnh sửa",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    icon: XCircle,
  },
};

export default function TeacherCourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const courseId = Number(params?.id);

  const [activeTab, setActiveTab] = useState<"syllabus" | "classes">("syllabus");
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [showRevertModal, setShowRevertModal] = useState(false);
  const [classForm, setClassForm] = useState({
    name: "",
    startDate: "",
    endDate: "",
    capacity: 30,
    tuitionFeeVnd: 0,
    meetingLink: "",
  });

  const { data: course, isLoading, isError } = useQuery<Course>({
    queryKey: ["teacher-course-detail", courseId],
    queryFn: async () => {
      const res: any = await axiosClient.get(`/courses/${courseId}`);
      return res?.data || res;
    },
    enabled: !isNaN(courseId),
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
      setShowRevertModal(false);
      toast.success("Khóa học đã được chuyển về Bản nháp để chỉnh sửa.");
    },
    onError: (err: any) => {
      toast.error(
        getApiErrorMessage(
          err,
          "Không thể chuyển về Bản nháp. Khóa học có thể đang có lớp học diễn ra.",
        ),
      );
    },
  });

  // Create Class Mutation (Only allowed if Course is PUBLISHED)
  const createClassMutation = useMutation({
    mutationFn: async (data: typeof classForm) => {
      return await axiosClient.post(`/courses/${courseId}/classes`, {
        ...data,
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
        meetingLink: data.meetingLink || undefined,
        capacity: Number(data.capacity) || 30,
        tuitionFeeVnd: Number(data.tuitionFeeVnd) || 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["teacher-course-detail", courseId],
      });
      setShowCreateClassModal(false);
      setClassForm({
        name: "",
        startDate: "",
        endDate: "",
        capacity: 30,
        tuitionFeeVnd: 0,
        meetingLink: "",
      });
      toast.success("Mở lớp học mới thành công!");
    },
    onError: (err: any) => {
      toast.error(getApiErrorMessage(err, "Tạo lớp học thất bại."));
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-slate-400 mb-3" size={36} />
        <p className="text-slate-500 text-sm font-medium">
          Đang tải chi tiết khóa học...
        </p>
      </div>
    );
  }

  if (isError || !course) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center">
        <AlertTriangle size={48} className="mx-auto text-amber-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          Không tìm thấy thông tin khóa học
        </h2>
        <p className="text-slate-500 text-sm mb-6">
          Khóa học này không tồn tại hoặc bạn không có quyền truy cập.
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

  const statusConfig = STATUS_CONFIG[course.status] || STATUS_CONFIG.DRAFT;
  const StatusIcon = statusConfig.icon;
  const isPendingReview = course.status === "PENDING_REVIEW";
  const isPublished = course.status === "PUBLISHED";
  const isRejected = course.status === "REJECTED";
  const isDraft = course.status === "DRAFT";

  const ongoingClasses =
    course.classes?.filter((c) => c.status === "ONGOING") || [];

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <Link
            href="/teacher/courses"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-4"
          >
            <ArrowLeft size={14} /> Danh sách khóa học
          </Link>

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                {course.thumbnail ? (
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <BookOpen size={36} className="text-slate-300" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold border ${statusConfig.badgeClass}`}
                  >
                    <StatusIcon size={12} />
                    {statusConfig.label}
                  </span>
                  <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {course.level || "Chưa gắn trình độ"}
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                  {course.title}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 max-w-3xl leading-relaxed line-clamp-2">
                  {course.description || "Chưa có mô tả cho khóa học này."}
                </p>

                <div className="flex items-center gap-4 text-xs text-slate-400 mt-3">
                  <span className="flex items-center gap-1">
                    <Layers size={13} /> {course.lessons?.length || 0} bài học
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={13} /> {course.classes?.length || 0} lớp học
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={13} />{" "}
                    {new Date(course.createdAt).toLocaleDateString("vi-VN")}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 self-start flex-wrap">
              {isDraft && (
                <Link
                  href={`/teacher/courses/${courseId}/edit`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  <Edit size={14} /> Chỉnh sửa khóa học
                </Link>
              )}

              {isRejected && (
                <button
                  onClick={() => {
                    revertToDraftMutation.mutate(undefined, {
                      onSuccess: () => router.push(`/teacher/courses/${courseId}/edit`),
                    });
                  }}
                  disabled={revertToDraftMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-60"
                >
                  {revertToDraftMutation.isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Edit size={14} />
                  )}
                  Chỉnh sửa lại
                </button>
              )}

              {isPendingReview && (
                <div className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold">
                  <Clock size={14} className="text-amber-600" /> Đang chờ duyệt (Đã khóa)
                </div>
              )}

              {isPublished && (
                <>
                  <Link
                    href={`/teacher/courses/${courseId}/edit`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                    title="Chỉnh sửa trực tiếp ảnh bìa và mô tả"
                  >
                    <Edit size={14} /> Sửa thông tin
                  </Link>

                  {ongoingClasses.length > 0 ? (
                    <div className="relative group">
                      <button
                        disabled
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 text-slate-400 border border-slate-200 rounded-lg text-xs font-semibold cursor-not-allowed"
                      >
                        <Lock size={13} /> Giáo trình đang khóa
                      </button>
                      <div className="absolute top-full mt-1.5 right-0 w-64 p-2 bg-slate-800 text-white text-[11px] rounded-lg shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-20">
                        Không thể chỉnh sửa giáo trình vì khóa học đang có {ongoingClasses.length} lớp học đang diễn ra.
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowRevertModal(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white text-slate-800 hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold transition-colors shadow-xs"
                    >
                      <RotateCcw size={13} /> Sửa giáo trình
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setClassForm({
                        name: `${course.title} - K01`,
                        startDate: "",
                        endDate: "",
                        capacity: 30,
                        tuitionFeeVnd: 0,
                        meetingLink: "",
                      });
                      setShowCreateClassModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                  >
                    <Plus size={14} /> Mở Lớp Học
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex gap-6 border-t border-slate-100">
          <button
            onClick={() => setActiveTab("syllabus")}
            className={`py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "syllabus"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Giáo trình ({course.lessons?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("classes")}
            className={`py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "classes"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Lớp học mở ({course.classes?.length || 0})
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        {/* Status Alerts */}
        {isPendingReview && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-amber-800">
            <Clock size={18} className="shrink-0 text-amber-600 mt-0.5" />
            <div className="text-xs sm:text-sm">
              <strong className="block font-semibold mb-0.5">Đang chờ Admin duyệt</strong>
              <span className="text-amber-700 text-xs leading-relaxed">
                Nội dung khóa học hiện được khóa trong thời gian thẩm định. Bạn sẽ có thể tiếp tục chỉnh sửa nếu Admin từ chối khóa học.
              </span>
            </div>
          </div>
        )}

        {isRejected && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-4 text-rose-800 flex-wrap">
            <div className="flex items-center gap-3 text-xs sm:text-sm">
              <XCircle size={18} className="shrink-0 text-rose-600" />
              <div>
                <strong className="block font-semibold">Khóa học cần được chỉnh sửa trước khi gửi duyệt lại</strong>
                <span className="text-rose-700 text-xs">
                  Khóa học chưa được Admin thông qua. Vui lòng bấm &quot;Chỉnh sửa lại&quot; để đưa khóa học về Bản nháp và hoàn thiện nội dung.
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                revertToDraftMutation.mutate(undefined, {
                  onSuccess: () => router.push(`/teacher/courses/${courseId}/edit`),
                });
              }}
              disabled={revertToDraftMutation.isPending}
              className="px-3.5 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition-colors shrink-0 disabled:opacity-60 flex items-center gap-1.5"
            >
              {revertToDraftMutation.isPending && <Loader2 size={12} className="animate-spin" />}
              Chỉnh sửa lại
            </button>
          </div>
        )}

        {isPublished && (
          <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4 text-slate-700 flex-wrap text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>
                <strong>Khóa học đã xuất bản:</strong> Thông tin giới thiệu có thể chỉnh sửa trực tiếp. Giáo trình chỉ có thể sửa sau khi chuyển khóa học về Bản nháp.
              </span>
            </div>
            {ongoingClasses.length > 0 && (
              <span className="px-2.5 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium text-[11px] shrink-0">
                Có {ongoingClasses.length} lớp học đang diễn ra (Giáo trình đang khóa)
              </span>
            )}
          </div>
        )}

        {/* Tab 1: Syllabus */}
        {activeTab === "syllabus" && (
          <div className="space-y-4">
            {course.lessons && course.lessons.length > 0 ? (
              course.lessons.map((lesson, idx) => (
                <div
                  key={lesson.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
                    <div className="flex items-start gap-3">
                      <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">
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
                  </div>

                  {lesson.videoUrl && (
                    <div className="mt-3 flex items-center gap-2 text-xs">
                      <Video size={14} className="text-slate-400 shrink-0" />
                      <a
                        href={lesson.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline truncate"
                      >
                        {lesson.videoUrl}
                      </a>
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="text-xs font-semibold text-slate-700 mb-2">
                      Tài liệu bài học ({lesson.materials?.length || 0})
                    </div>
                    {lesson.materials && lesson.materials.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {lesson.materials.map((mat) => (
                          <div
                            key={mat.id}
                            className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-bold text-[10px]">
                                {mat.fileType || "FILE"}
                              </span>
                              <span className="font-medium text-slate-800 truncate">
                                {mat.title}
                              </span>
                            </div>
                            <a
                              href={mat.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 shrink-0"
                            >
                              <ExternalLink size={13} />
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">
                        Chưa có tài liệu đính kèm.
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
                <BookOpen size={40} className="mx-auto text-slate-300 mb-3" />
                <h3 className="font-bold text-slate-800 text-base mb-1">
                  Chưa có bài học nào trong giáo trình
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                  Bạn có thể vào Studio để tạo bài học và tải lên các tài liệu
                  học tập.
                </p>
                <Link
                  href={`/teacher/courses/${courseId}/edit`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold"
                >
                  <Plus size={14} /> Thêm bài học trong Studio
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Classes */}
        {activeTab === "classes" && (
          <div className="space-y-4">
            {course.classes && course.classes.length > 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="p-3.5">Tên lớp học</th>
                      <th className="p-3.5">Trạng thái</th>
                      <th className="p-3.5">Học viên / Sức chứa</th>
                      <th className="p-3.5">Thời gian đào tạo</th>
                      <th className="p-3.5">Meeting Link</th>
                      <th className="p-3.5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {course.classes.map((cls) => (
                      <tr key={cls.id} className="hover:bg-slate-50/50">
                        <td className="p-3.5 font-bold text-slate-800">
                          {cls.name}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              cls.status === "ONGOING"
                                ? "bg-green-100 text-green-700"
                                : cls.status === "UPCOMING"
                                  ? "bg-blue-100 text-blue-700"
                                  : cls.status === "COMPLETED"
                                    ? "bg-slate-100 text-slate-600"
                                    : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {cls.status === "ONGOING"
                              ? "Đang diễn ra"
                              : cls.status === "UPCOMING"
                                ? "Sắp khai giảng"
                                : cls.status === "COMPLETED"
                                  ? "Đã kết thúc"
                                  : "Đã hủy"}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-700">
                          {cls._count?.enrollments || 0} / {cls.capacity || 30}
                        </td>
                        <td className="p-3.5 text-slate-500 text-[11px]">
                          {cls.startDate
                            ? new Date(cls.startDate).toLocaleDateString("vi-VN")
                            : "—"}{" "}
                          →{" "}
                          {cls.endDate
                            ? new Date(cls.endDate).toLocaleDateString("vi-VN")
                            : "—"}
                        </td>
                        <td className="p-3.5 text-slate-500">
                          {cls.meetingLink ? (
                            <a
                              href={cls.meetingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline truncate max-w-[150px] inline-block"
                            >
                              {cls.meetingLink}
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="p-3.5 text-right">
                          <Link
                            href={`/teacher/classes`}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            Chi tiết lớp
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
                <Users size={40} className="mx-auto text-slate-300 mb-3" />
                <h3 className="font-bold text-slate-800 text-base mb-1">
                  Chưa có lớp học nào được mở
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                  {isPublished
                    ? "Khóa học đã xuất bản. Bạn có thể mở các lớp học mới cho học viên đăng ký tham gia."
                    : "Khóa học cần được Admin duyệt (PUBLISHED) trước khi mở lớp học."}
                </p>
                {isPublished && (
                  <button
                    onClick={() => {
                      setClassForm({
                        name: `${course.title} - K01`,
                        startDate: "",
                        endDate: "",
                        capacity: 30,
                        tuitionFeeVnd: 0,
                        meetingLink: "",
                      });
                      setShowCreateClassModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                  >
                    <Plus size={14} /> Mở Lớp Học Đầu Tiên
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: Create Class */}
      {showCreateClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-base">
                Mở lớp học mới
              </h3>
              <button
                onClick={() => setShowCreateClassModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!classForm.name.trim()) {
                  toast.error("Tên lớp học là bắt buộc.");
                  return;
                }
                if (
                  classForm.startDate &&
                  classForm.endDate &&
                  new Date(classForm.startDate) >= new Date(classForm.endDate)
                ) {
                  toast.error("Ngày kết thúc phải sau ngày bắt đầu.");
                  return;
                }
                createClassMutation.mutate(classForm);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Khóa học liên kết
                </label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={course.title}
                  className="w-full px-3.5 py-2 text-sm bg-slate-100 border border-slate-200 rounded-lg text-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên lớp học <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={classForm.name}
                  onChange={(e) =>
                    setClassForm({ ...classForm, name: e.target.value })
                  }
                  placeholder="Ví dụ: IELTS Task 2 - K01 (Tối 2-4-6)"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sức chứa tối đa (Capacity)
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={classForm.capacity}
                  onChange={(e) =>
                    setClassForm({
                      ...classForm,
                      capacity: Number(e.target.value),
                    })
                  }
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Học phí (VNĐ)
                </label>
                <input
                  type="number"
                  min={0}
                  step={10000}
                  value={classForm.tuitionFeeVnd}
                  onChange={(e) =>
                    setClassForm({
                      ...classForm,
                      tuitionFeeVnd: Math.max(0, Number(e.target.value)),
                    })
                  }
                  placeholder="0 = Miễn phí"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-amber-500 focus:bg-white"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Nhập 0 nếu đây là lớp học miễn phí. Sau khi có học viên đăng ký, học phí sẽ bị khóa không thể sửa đổi.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ngày bắt đầu
                  </label>
                  <input
                    type="date"
                    value={classForm.startDate}
                    onChange={(e) =>
                      setClassForm({
                        ...classForm,
                        startDate: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ngày kết thúc
                  </label>
                  <input
                    type="date"
                    value={classForm.endDate}
                    onChange={(e) =>
                      setClassForm({ ...classForm, endDate: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Meeting Link (Google Meet / Daily.co)
                </label>
                <input
                  type="url"
                  value={classForm.meetingLink}
                  onChange={(e) =>
                    setClassForm({
                      ...classForm,
                      meetingLink: e.target.value,
                    })
                  }
                  placeholder="https://meet.google.com/..."
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateClassModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createClassMutation.isPending}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {createClassMutation.isPending ? "Đang tạo..." : "Mở lớp học"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Revert to Draft Confirmation */}
      {showRevertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <RotateCcw size={22} />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1">
              Chuyển khóa học về Bản nháp?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Bạn đang chuẩn bị chỉnh sửa giáo trình của khóa học đã xuất bản.
            </p>
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-[11px] text-amber-900 mb-6 space-y-1.5">
              <p className="font-semibold text-amber-800">Sau khi chuyển về Bản nháp:</p>
              <ul className="list-disc list-inside space-y-1 text-amber-800/90">
                <li>Giáo trình có thể được chỉnh sửa tự do (thêm, sửa, xóa bài học, tài liệu).</li>
                <li>Khóa học sẽ cần được gửi Admin duyệt lại trước khi được xuất bản trở lại.</li>
                <li>Các thay đổi chưa được duyệt sẽ không được áp dụng vào trạng thái xuất bản hiện tại.</li>
              </ul>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowRevertModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={revertToDraftMutation.isPending}
                onClick={() => revertToDraftMutation.mutate()}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {revertToDraftMutation.isPending && (
                  <Loader2 size={13} className="animate-spin" />
                )}
                {revertToDraftMutation.isPending ? "Đang chuyển..." : "Chuyển về Bản nháp"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
