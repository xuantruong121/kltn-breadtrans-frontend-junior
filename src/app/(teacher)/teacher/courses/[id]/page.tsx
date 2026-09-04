"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosClient from "@/lib/api/axiosClient";
import toast from "react-hot-toast";
import Link from "next/link";
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
    label: "Chờ duyệt",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Clock,
  },
  PUBLISHED: {
    label: "Đã xuất bản",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
  REJECTED: {
    label: "Bị từ chối",
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
  const [classForm, setClassForm] = useState({
    name: "",
    startDate: "",
    endDate: "",
    capacity: 30,
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
      toast.success("Khóa học đã được chuyển về Bản nháp để chỉnh sửa.");
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message ||
          "Không thể chuyển về Bản nháp. Khóa học có thể đang có lớp học diễn ra.",
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
        meetingLink: "",
      });
      toast.success("Mở lớp học mới thành công!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Tạo lớp học thất bại.");
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
              <Link
                href={`/teacher/courses/${courseId}/edit`}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <Edit size={14} /> Chỉnh sửa khóa học
              </Link>

              {isPublished && (
                <button
                  onClick={() => {
                    setClassForm({
                      name: `${course.title} - K01`,
                      startDate: "",
                      endDate: "",
                      capacity: 30,
                      meetingLink: "",
                    });
                    setShowCreateClassModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  <Plus size={14} /> Mở Lớp Học
                </button>
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
          <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-4 text-amber-800">
            <div className="flex items-center gap-3 text-xs sm:text-sm">
              <Clock size={18} className="shrink-0 text-amber-600" />
              <span>
                Khóa học đang trong hàng đợi phê duyệt của Admin. Nội dung học
                thuật hiện đã được khóa để bảo đảm tính toàn vẹn.
              </span>
            </div>
            <button
              onClick={() => revertToDraftMutation.mutate()}
              disabled={revertToDraftMutation.isPending}
              className="px-3 py-1.5 bg-white text-amber-800 border border-amber-300 rounded-lg text-xs font-semibold hover:bg-amber-100 transition-colors shrink-0"
            >
              Rút lại về Bản nháp
            </button>
          </div>
        )}

        {isRejected && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-4 text-rose-800">
            <div className="flex items-center gap-3 text-xs sm:text-sm">
              <XCircle size={18} className="shrink-0 text-rose-600" />
              <span>
                Khóa học chưa được Admin thông qua. Vui lòng chuyển về Bản nháp
                để tiếp tục chỉnh sửa giáo trình và nộp lại.
              </span>
            </div>
            <button
              onClick={() => revertToDraftMutation.mutate()}
              disabled={revertToDraftMutation.isPending}
              className="px-3 py-1.5 bg-white text-rose-800 border border-rose-300 rounded-lg text-xs font-semibold hover:bg-rose-100 transition-colors shrink-0"
            >
              Chuyển về Bản nháp để sửa
            </button>
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
    </div>
  );
}
