"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Loader2,
  BookOpen,
  Plus,
  Trash2,
  X,
  Settings,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useState } from "react";
import axiosClient from "@/lib/api/axiosClient";
import toast from "react-hot-toast";
import Link from "next/link";
import { Pagination } from "@/components/ui";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import { getCourseLevelFilterKey } from "@/lib/course/courseLevel";

type Course = {
  id: number;
  title: string;
  description: string | null;
  thumbnail: string | null;
  level: string | null;
  status: "DRAFT" | "PUBLISHED";
  createdAt: string;
};

const LEVEL_OPTIONS = [
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
    icon: Settings,
  },
  PUBLISHED: {
    label: "Đã xuất bản",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
};

export default function AdminCoursesPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [levelFilter, setLevelFilter] = useState<string>("ALL");
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    level: "BEGINNER",
  });

  // Delete Course Confirmation State
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);

  const { data: courses, isLoading } = useQuery<Course[]>({
    queryKey: ["admin-courses"],
    queryFn: async () =>
      (await axiosClient.get("/admin/courses")) as unknown as Course[],
  });

  const createCourseMutation = useMutation({
    mutationFn: async (data: typeof courseForm) =>
      (
        await axiosClient.post("/admin/courses", {
          ...data,
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      setShowCreateCourse(false);
      setCourseForm({ title: "", description: "", level: "BEGINNER" });
      toast.success("Tạo khóa học thành công!");
    },
    onError: (err: any) =>
      toast.error(getApiErrorMessage(err, "Tạo khóa học thất bại.")),
  });

  const deleteCourseMutation = useMutation({
    mutationFn: async (id: number) =>
      axiosClient.delete(`/admin/courses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast.success("Đã xóa khóa học.");
    },
    onError: (err: any) =>
      toast.error(
        getApiErrorMessage(
          err,
          "Không thể xóa khóa học.",
        ),
      ),
  });

  const filteredCourses = courses?.filter((c) => {
    const matchesSearch = c.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
    const matchesLevel =
      levelFilter === "ALL" || getCourseLevelFilterKey(c.level) === levelFilter;
    return matchesSearch && matchesStatus && matchesLevel;
  });

  const totalPages = Math.ceil((filteredCourses?.length || 0) / pageSize);
  const paginatedCourses = filteredCourses?.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const levelLabel = (l: string | null) =>
    LEVEL_OPTIONS.find((o) => o.value === getCourseLevelFilterKey(l))?.label ||
    "—";

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            Quản lý Khóa học
          </h1>
          <p className="text-slate-500 mt-1">
            Tạo, thẩm định và quản lý nội dung khóa học tự học.
          </p>
        </div>
        <button
          onClick={() => setShowCreateCourse(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus size={18} /> Tạo Khóa học
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {[
            { key: "ALL", label: "Tất cả" },
            { key: "PUBLISHED", label: "Đã xuất bản" },
            { key: "DRAFT", label: "Bản nháp" },
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

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            size={16}
          />
          <input
            type="text"
            placeholder="Tìm theo tên khóa học..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm"
          />
        </div>

        <label className="flex shrink-0 items-center gap-2 text-sm text-slate-600">
          <span className="whitespace-nowrap">Trình độ:</span>
          <select
            value={levelFilter}
            onChange={(e) => {
              setLevelFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="ALL">Tất cả</option>
            {LEVEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Course List */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-blue-600" size={40} />
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedCourses && paginatedCourses.length > 0 ? (
            <>
              {paginatedCourses.map((course) => {
                const statusConfig =
                  STATUS_CONFIG[course.status] || STATUS_CONFIG.DRAFT;
                const StatusIcon = statusConfig.icon;

                return (
                  <div
                    key={course.id}
                    className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
                  >
                    {/* Course Header */}
                    <div className="p-5 flex flex-col md:flex-row md:items-center gap-4">
                      <div className="w-16 h-16 rounded-xl bg-blue-50 overflow-hidden flex-shrink-0">
                        {course.thumbnail ? (
                          <img
                            src={course.thumbnail}
                            alt={course.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-blue-300">
                            <BookOpen size={28} />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3 className="font-bold text-slate-800 text-lg leading-tight">
                                {course.title}
                              </h3>
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border ${statusConfig.badgeClass}`}
                              >
                                <StatusIcon size={12} />
                                {statusConfig.label}
                              </span>
                            </div>
                            <p className="text-slate-400 text-xs line-clamp-1">
                              {course.description || "Chưa có mô tả"}
                            </p>
                          </div>

                          {/* Top Action Buttons */}
                          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                            <Link
                              href={`/admin/courses/${course.id}/curriculum`}
                              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                              title="Mở Course Studio để soạn giáo trình và bài học"
                            >
                              <BookOpen size={14} /> Soạn bài học (Studio)
                            </Link>

                            <button
                              onClick={() => setCourseToDelete(course)}
                              className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                              title="Xóa khóa học"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 flex-wrap">
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                            {levelLabel(course.level)}
                          </span>
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })}
            </>
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 text-slate-400">
              Không tìm thấy khóa học nào.
            </div>
          )}

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
        </div>
      )}

      {/* Create Course Modal */}
      {showCreateCourse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <BookOpen size={22} className="text-blue-600" /> Tạo Khóa học
                mới
              </h2>
              <button
                onClick={() => setShowCreateCourse(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={22} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tên khóa học *
                </label>
                <input
                  type="text"
                  placeholder="VD: Tiếng Anh Giao Tiếp Toàn Diện"
                  value={courseForm.title}
                  onChange={(e) =>
                    setCourseForm({ ...courseForm, title: e.target.value })
                  }
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Mô tả
                </label>
                <textarea
                  placeholder="Mô tả ngắn về khóa học..."
                  rows={3}
                  value={courseForm.description}
                  onChange={(e) =>
                    setCourseForm({
                      ...courseForm,
                      description: e.target.value,
                    })
                  }
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Trình độ
                </label>
                <select
                  value={courseForm.level}
                  onChange={(e) =>
                    setCourseForm({ ...courseForm, level: e.target.value })
                  }
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500 bg-white"
                >
                  {LEVEL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateCourse(false)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={() => createCourseMutation.mutate(courseForm)}
                disabled={createCourseMutation.isPending || !courseForm.title}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {createCourseMutation.isPending ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Plus size={18} />
                )}
                Tạo Khóa học
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CUSTOM DELETE CONFIRMATION (ADMIN) ================= */}
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
              Bạn đang thực hiện xóa khóa học &ldquo;
              <span className="font-semibold text-slate-800">
                {courseToDelete.title}
              </span>
              &rdquo;.
            </p>
            <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-lg text-xs text-rose-700 mb-6">
              Hành động này có thể xóa liên hoàn:
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li>Toàn bộ bài học và video đính kèm</li>
                <li>Tài liệu học tập</li>
                <li>Bài kiểm tra liên kết</li>
                <li>Các gói học liên quan</li>
              </ul>
              <strong className="block mt-1">
                Thao tác này không thể hoàn tác.
              </strong>
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
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
