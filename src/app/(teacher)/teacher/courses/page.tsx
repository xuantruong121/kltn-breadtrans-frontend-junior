"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Loader2,
  BookOpen,
  Plus,
  Trash2,
  Users,
  Calendar,
  Send,
  Edit,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  ExternalLink,
  RotateCcw,
} from "lucide-react";
import { useState } from "react";
import axiosClient from "@/lib/api/axiosClient";
import toast from "react-hot-toast";
import Link from "next/link";
import { Pagination } from "@/components/ui";

type ClassData = {
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
  classes?: ClassData[];
  _count?: { classes: number };
};

const LEVEL_OPTIONS = [
  { value: "", label: "Không xác định" },
  { value: "BEGINNER", label: "Cơ bản" },
  { value: "INTERMEDIATE", label: "Trung cấp" },
  { value: "ADVANCED", label: "Nâng cao" },
];

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
    label: "Đã duyệt",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
  REJECTED: {
    label: "Bị từ chối",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    icon: XCircle,
  },
};

export default function TeacherCoursesPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  // Modals state
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [classModalCourse, setClassModalCourse] = useState<Course | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [courseToSubmitReview, setCourseToSubmitReview] = useState<Course | null>(null);

  // Forms state
  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    level: "",
    thumbnail: "",
  });

  const [classForm, setClassForm] = useState({
    name: "",
    startDate: "",
    endDate: "",
    capacity: 30,
    meetingLink: "",
  });

  const { data: courses, isLoading } = useQuery<Course[]>({
    queryKey: ["teacher-my-courses"],
    queryFn: async () => {
      const res = await axiosClient.get("/courses/my-courses");
      return (res as unknown as Course[]) || [];
    },
  });

  // Create Course Mutation (Status = DRAFT)
  const createCourseMutation = useMutation({
    mutationFn: async (data: typeof courseForm) => {
      return (await axiosClient.post("/courses", data)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-my-courses"] });
      setShowCreateCourse(false);
      setCourseForm({ title: "", description: "", level: "", thumbnail: "" });
      toast.success("Tạo khóa học thành công ở trạng thái Bản nháp!");
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || "Tạo khóa học thất bại. Vui lòng thử lại.",
      );
    },
  });

  // Edit Course Mutation
  const updateCourseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Course> }) => {
      return (await axiosClient.patch(`/courses/${id}`, data)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-my-courses"] });
      setEditingCourse(null);
      toast.success("Cập nhật thông tin khóa học thành công!");
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || "Cập nhật khóa học thất bại.",
      );
    },
  });

  // Submit for Review Mutation (DRAFT -> PENDING_REVIEW)
  const submitReviewMutation = useMutation({
    mutationFn: async (courseId: number) => {
      return (await axiosClient.post(`/courses/${courseId}/submit-review`)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-my-courses"] });
      toast.success(
        "Đã gửi khóa học tới Admin phê duyệt. Trạng thái: Chờ duyệt.",
      );
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || "Gửi duyệt thất bại. Vui lòng thử lại.",
      );
    },
  });

  // Delete Course Mutation
  const deleteCourseMutation = useMutation({
    mutationFn: async (id: number) => {
      return (await axiosClient.delete(`/courses/${id}`)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-my-courses"] });
      toast.success("Đã xóa khóa học.");
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || "Không thể xóa khóa học này.",
      );
    },
  });

  // Create Class Mutation (Only allowed if Course is PUBLISHED)
  const createClassMutation = useMutation({
    mutationFn: async ({
      courseId,
      data,
    }: {
      courseId: number;
      data: typeof classForm;
    }) => {
      return (
        await axiosClient.post(`/courses/${courseId}/classes`, {
          ...data,
          startDate: data.startDate || undefined,
          endDate: data.endDate || undefined,
          meetingLink: data.meetingLink || undefined,
          capacity: Number(data.capacity) || 30,
        })
      ).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-my-courses"] });
      setClassModalCourse(null);
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
      toast.error(
        err?.response?.data?.message || "Tạo lớp học thất bại. Vui lòng thử lại.",
      );
    },
  });

  // Filtering
  const filteredCourses = courses?.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.description || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "ALL" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil((filteredCourses?.length || 0) / pageSize);
  const paginatedCourses = filteredCourses?.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const handleCreateClassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!classModalCourse) return;

    if (
      classForm.startDate &&
      classForm.endDate &&
      new Date(classForm.startDate) >= new Date(classForm.endDate)
    ) {
      toast.error("Ngày kết thúc phải sau ngày bắt đầu!");
      return;
    }

    if (Number(classForm.capacity) <= 0) {
      toast.error("Sức chứa tối đa của lớp học phải lớn hơn 0!");
      return;
    }

    createClassMutation.mutate({
      courseId: classModalCourse.id,
      data: classForm,
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Khóa học của tôi
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Quản lý chương trình học, nộp duyệt giáo trình và mở các lớp học mới.
          </p>
        </div>
        <button
          onClick={() => setShowCreateCourse(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-semibold rounded-xl shadow-xs transition-all"
        >
          <Plus size={18} />
          Tạo khóa học mới
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {[
            { key: "ALL", label: "Tất cả" },
            { key: "DRAFT", label: "Bản nháp" },
            { key: "PENDING_REVIEW", label: "Chờ duyệt" },
            { key: "PUBLISHED", label: "Đã duyệt" },
            { key: "REJECTED", label: "Bị từ chối" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setStatusFilter(tab.key);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === tab.key
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Tìm kiếm khóa học..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-amber-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Courses List */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-amber-500" size={36} />
        </div>
      ) : paginatedCourses && paginatedCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedCourses.map((course) => {
            const statusConfig = STATUS_CONFIG[course.status] || STATUS_CONFIG.DRAFT;
            const StatusIcon = statusConfig.icon;
            const classCount = course.classes?.length || course._count?.classes || 0;

            return (
              <div
                key={course.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                {/* Header / Thumbnail */}
                <div>
                  <div className="h-40 relative bg-slate-100 overflow-hidden">
                    {course.thumbnail ? (
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <BookOpen size={48} />
                      </div>
                    )}
                    {/* Status Badge */}
                    <div className="absolute top-3 right-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border backdrop-blur-xs ${statusConfig.badgeClass}`}
                      >
                        <StatusIcon size={12} />
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5">
                    <div className="text-xs font-medium text-amber-600 mb-1">
                      {course.level ? `Trình độ: ${course.level}` : "Chưa gắn trình độ"}
                    </div>
                    <Link href={`/teacher/courses/${course.id}`}>
                      <h3 className="font-bold text-slate-900 text-lg line-clamp-1 mb-2 hover:text-amber-600 transition-colors cursor-pointer">
                        {course.title}
                      </h3>
                    </Link>
                    <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed mb-4">
                      {course.description || "Chưa có mô tả cho khóa học này."}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-slate-500 border-t border-slate-100 pt-3">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Users size={14} className="text-slate-400" />
                        {classCount} Lớp học
                      </span>
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Calendar size={14} />
                        {new Date(course.createdAt).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                  {/* Status-specific action buttons */}
                  {course.status === "PUBLISHED" ? (
                    <div className="flex items-center justify-between w-full gap-2">
                      <button
                        onClick={() => {
                          setClassModalCourse(course);
                          setClassForm({
                            name: `${course.title} - Khóa mới`,
                            startDate: "",
                            endDate: "",
                            capacity: 30,
                            meetingLink: "",
                          });
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                      >
                        <Plus size={14} />
                        Mở Lớp Học
                      </button>
                      <Link
                        href={`/teacher/courses/${course.id}/edit`}
                        className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-200/60 transition-colors border border-slate-200"
                        title="Chỉnh sửa khóa học trong Studio"
                      >
                        <Edit size={15} />
                      </Link>
                    </div>
                  ) : course.status === "PENDING_REVIEW" ? (
                    <div className="flex items-center justify-between w-full gap-2">
                      <div className="flex-1 text-center py-1.5 px-2 text-xs font-medium text-amber-700 bg-amber-50 rounded-lg border border-amber-200">
                        Đang chờ Admin duyệt
                      </div>
                      <Link
                        href={`/teacher/courses/${course.id}`}
                        className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
                        title="Xem chi tiết"
                      >
                        <ExternalLink size={15} />
                      </Link>
                    </div>
                  ) : course.status === "REJECTED" ? (
                    <div className="flex items-center justify-between w-full gap-2">
                      <Link
                        href={`/teacher/courses/${course.id}/edit`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-colors"
                      >
                        <RotateCcw size={13} />
                        Sửa lại trong Studio
                      </Link>
                      <button
                        onClick={() => setCourseToDelete(course)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Xóa khóa học"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ) : (
                    /* DRAFT */
                    <div className="flex items-center justify-between w-full gap-2">
                      <button
                        onClick={() => setCourseToSubmitReview(course)}
                        className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors"
                      >
                        <Send size={13} />
                        Gửi duyệt
                      </button>

                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/teacher/courses/${course.id}/edit`}
                          className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-200/60 transition-colors"
                          title="Chỉnh sửa giáo trình trong Studio"
                        >
                          <Edit size={15} />
                        </Link>

                        <button
                          onClick={() => setCourseToDelete(course)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Xóa khóa học"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
          <BookOpen size={48} className="mx-auto text-slate-300 mb-3" />
          <h3 className="text-base font-semibold text-slate-800">
            Không tìm thấy khóa học nào
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Bạn chưa có khóa học nào khớp với bộ lọc. Hãy tạo khóa học mới để bắt đầu chương trình giảng dạy.
          </p>
          <button
            onClick={() => setShowCreateCourse(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <Plus size={16} />
            Tạo khóa học ngay
          </button>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center pt-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            totalItems={filteredCourses?.length || 0}
          />
        </div>
      )}

      {/* Modal: Create Course */}
      {showCreateCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Tạo khóa học mới
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Khóa học mới tạo sẽ ở trạng thái Bản nháp (DRAFT).
                </p>
              </div>
              <button
                onClick={() => setShowCreateCourse(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!courseForm.title.trim()) {
                  toast.error("Vui lòng nhập tên khóa học!");
                  return;
                }
                createCourseMutation.mutate(courseForm);
              }}
              className="p-5 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên khóa học <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: IELTS Writing Task 2 Masterclass"
                  value={courseForm.title}
                  onChange={(e) =>
                    setCourseForm({ ...courseForm, title: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Trình độ (Level)
                </label>
                <select
                  value={courseForm.level}
                  onChange={(e) =>
                    setCourseForm({ ...courseForm, level: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-amber-500 focus:bg-white"
                >
                  {LEVEL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  URL Ảnh đại diện (Thumbnail)
                </label>
                <input
                  type="text"
                  placeholder="https://example.com/thumbnail.jpg"
                  value={courseForm.thumbnail}
                  onChange={(e) =>
                    setCourseForm({ ...courseForm, thumbnail: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mô tả khóa học
                </label>
                <textarea
                  rows={3}
                  placeholder="Mô tả tóm tắt mục tiêu và nội dung học..."
                  value={courseForm.description}
                  onChange={(e) =>
                    setCourseForm({ ...courseForm, description: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-amber-500 focus:bg-white resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateCourse(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createCourseMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors inline-flex items-center gap-1.5"
                >
                  {createCourseMutation.isPending && (
                    <Loader2 size={14} className="animate-spin" />
                  )}
                  Lưu bản nháp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Course */}
      {editingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Chỉnh sửa khóa học
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cập nhật thông tin cho bản nháp.
                </p>
              </div>
              <button
                onClick={() => setEditingCourse(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateCourseMutation.mutate({
                  id: editingCourse.id,
                  data: courseForm,
                });
              }}
              className="p-5 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên khóa học <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={courseForm.title}
                  onChange={(e) =>
                    setCourseForm({ ...courseForm, title: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Trình độ (Level)
                </label>
                <select
                  value={courseForm.level}
                  onChange={(e) =>
                    setCourseForm({ ...courseForm, level: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-amber-500 focus:bg-white"
                >
                  {LEVEL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  URL Ảnh đại diện (Thumbnail)
                </label>
                <input
                  type="text"
                  value={courseForm.thumbnail}
                  onChange={(e) =>
                    setCourseForm({ ...courseForm, thumbnail: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mô tả khóa học
                </label>
                <textarea
                  rows={3}
                  value={courseForm.description}
                  onChange={(e) =>
                    setCourseForm({ ...courseForm, description: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-amber-500 focus:bg-white resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCourse(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={updateCourseMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors inline-flex items-center gap-1.5"
                >
                  {updateCourseMutation.isPending && (
                    <Loader2 size={14} className="animate-spin" />
                  )}
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Class (Only available for PUBLISHED courses) */}
      {classModalCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Mở Lớp Học Mới
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dựa trên khóa học:{" "}
                  <span className="font-semibold text-slate-800">
                    {classModalCourse.title}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setClassModalCourse(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateClassSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên lớp học <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Lớp IELTS K01 (Tối 2-4-6)"
                  value={classForm.name}
                  onChange={(e) =>
                    setClassForm({ ...classForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:bg-white"
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
                      setClassForm({ ...classForm, startDate: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:bg-white"
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
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sức chứa tối đa (Capacity)
                </label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={classForm.capacity}
                  onChange={(e) =>
                    setClassForm({
                      ...classForm,
                      capacity: parseInt(e.target.value) || 30,
                    })
                  }
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Link phòng học trực tuyến (Tùy chọn)
                </label>
                <input
                  type="text"
                  placeholder="Để trống hệ thống sẽ tự sinh phòng học Daily.co"
                  value={classForm.meetingLink}
                  onChange={(e) =>
                    setClassForm({ ...classForm, meetingLink: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setClassModalCourse(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createClassMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors inline-flex items-center gap-1.5"
                >
                  {createClassMutation.isPending && (
                    <Loader2 size={14} className="animate-spin" />
                  )}
                  Tạo lớp ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Custom Delete Confirmation */}
      {courseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle size={22} />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1">
              Xác nhận xóa khóa học?
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Bạn có chắc chắn muốn xóa khóa học &ldquo;
              <span className="font-semibold text-slate-800">
                {courseToDelete.title}
              </span>
              &rdquo;?
            </p>
            <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-lg text-[11px] text-rose-700 mb-6">
              Hành động này có thể xóa liên hoàn:
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li>Toàn bộ bài học và video đính kèm</li>
                <li>Tài liệu học tập</li>
                <li>Bài kiểm tra liên kết</li>
              </ul>
              <strong className="block mt-1">Thao tác này không thể hoàn tác.</strong>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setCourseToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={deleteCourseMutation.isPending}
                onClick={() => {
                  deleteCourseMutation.mutate(courseToDelete.id, {
                    onSettled: () => setCourseToDelete(null),
                  });
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {deleteCourseMutation.isPending && (
                  <Loader2 size={13} className="animate-spin" />
                )}
                Xóa khóa học
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Submit Review Confirmation */}
      {courseToSubmitReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <Send size={20} />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1">
              Gửi khóa học để phê duyệt?
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              Khóa học &ldquo;
              <span className="font-semibold text-slate-800">
                {courseToSubmitReview.title}
              </span>
              &rdquo; sẽ được chuyển sang trạng thái <strong>Chờ duyệt (PENDING_REVIEW)</strong>. Trong quá trình Admin thẩm định, nội dung học thuật sẽ được khóa tạm thời.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setCourseToSubmitReview(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={submitReviewMutation.isPending}
                onClick={() => {
                  submitReviewMutation.mutate(courseToSubmitReview.id, {
                    onSettled: () => setCourseToSubmitReview(null),
                  });
                }}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {submitReviewMutation.isPending && (
                  <Loader2 size={13} className="animate-spin" />
                )}
                Xác nhận gửi duyệt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
