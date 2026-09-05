"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Loader2,
  BookOpen,
  Plus,
  Trash2,
  Users,
  ChevronRight,
  X,
  UserCheck,
  Settings,
  CheckCircle2,
  Clock,
  XCircle,
  Check,
  RotateCcw,
  AlertTriangle,
  AlertCircle,
  Edit,
  Lock,
} from "lucide-react";
import { useState } from "react";
import axiosClient from "@/lib/api/axiosClient";
import toast from "react-hot-toast";
import Link from "next/link";
import { Pagination } from "@/components/ui";
import { getApiErrorMessage } from "@/lib/utils/apiError";

type Teacher = {
  id: number;
  email: string;
  profile: { fullName: string; avatar: string | null } | null;
};

type ClassData = {
  id: number;
  name: string;
  status: string;
  capacity?: number;
  _count: { enrollments: number };
  startDate: string | null;
  endDate: string | null;
  teacherId?: number;
  meetingLink?: string;
};

type Course = {
  id: number;
  title: string;
  description: string | null;
  thumbnail: string | null;
  level: string | null;
  status: "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "REJECTED";
  createdAt: string;
  teacher: Teacher | null;
  classes: ClassData[];
  _count: { classes: number };
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
    icon: Settings,
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

export default function AdminCoursesPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [showCreateClass, setShowCreateClass] = useState<number | null>(null); // courseId
  const [expandedCourse, setExpandedCourse] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    level: "",
    teacherId: "",
  });

  const [classForm, setClassForm] = useState({
    name: "",
    teacherId: "",
    startDate: "",
    endDate: "",
    meetingLink: "",
    capacity: "30",
  });

  // Edit Class State (Admin)
  const [editingClass, setEditingClass] = useState<any | null>(null);
  const [editingClassCourse, setEditingClassCourse] = useState<Course | null>(null);
  const [editClassForm, setEditClassForm] = useState({
    name: "",
    teacherId: "",
    startDate: "",
    endDate: "",
    meetingLink: "",
    capacity: "30",
  });
  const [showTeacherChangeConfirm, setShowTeacherChangeConfirm] = useState(false);

  // Delete Course Confirmation State
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);

  // Delete Class State
  const [classToDelete, setClassToDelete] = useState<ClassData | null>(null);

  const deleteClassMutation = useMutation({
    mutationFn: async (id: number) => {
      return (await axiosClient.delete(`/courses/classes/${id}`)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      setClassToDelete(null);
      toast.success("Đã xóa lớp học thành công!");
    },
    onError: (err: any) => {
      toast.error(getApiErrorMessage(err, "Không thể xóa lớp học."));
    },
  });

  const handleOpenEditClass = (cls: any, course: Course) => {
    setEditingClass(cls);
    setEditingClassCourse(course);
    setEditClassForm({
      name: cls.name || "",
      teacherId: cls.teacherId?.toString() || course.teacher?.id?.toString() || "",
      startDate: cls.startDate ? new Date(cls.startDate).toISOString().slice(0, 10) : "",
      endDate: cls.endDate ? new Date(cls.endDate).toISOString().slice(0, 10) : "",
      meetingLink: cls.meetingLink || "",
      capacity: (cls.capacity || 30).toString(),
    });
  };

  const updateClassMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) =>
      (await axiosClient.patch(`/courses/classes/${id}`, data)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      setEditingClass(null);
      setEditingClassCourse(null);
      setShowTeacherChangeConfirm(false);
      toast.success("Cập nhật lớp học thành công!");
    },
    onError: (err: any) =>
      toast.error(getApiErrorMessage(err, "Cập nhật lớp học thất bại.")),
  });

  const { data: courses, isLoading } = useQuery<Course[]>({
    queryKey: ["admin-courses"],
    queryFn: async () =>
      (await axiosClient.get("/admin/courses")) as unknown as Course[],
  });

  const { data: teachers } = useQuery<Teacher[]>({
    queryKey: ["admin-users", "TEACHER"],
    queryFn: async () =>
      (await axiosClient.get("/admin/users?role=TEACHER")) as unknown as Teacher[],
  });

  const createCourseMutation = useMutation({
    mutationFn: async (data: typeof courseForm) =>
      (
        await axiosClient.post("/admin/courses", {
          ...data,
          teacherId: data.teacherId ? parseInt(data.teacherId) : undefined,
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      setShowCreateCourse(false);
      setCourseForm({ title: "", description: "", level: "", teacherId: "" });
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
          "Không thể xóa khóa học (có thể đang có lớp học).",
        ),
      ),
  });

  const reviewCourseMutation = useMutation({
    mutationFn: async ({
      courseId,
      action,
    }: {
      courseId: number;
      action: "APPROVE" | "REJECT";
    }) =>
      (await axiosClient.post(`/admin/courses/${courseId}/review`, { action }))
        .data,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      toast.success(
        variables.action === "APPROVE"
          ? "Đã phê duyệt khóa học (PUBLISHED)!"
          : "Đã từ chối khóa học (chuyển sang trạng thái Cần chỉnh sửa - REJECTED)!",
      );
    },
    onError: (err: any) =>
      toast.error(
        getApiErrorMessage(err, "Thao tác xét duyệt thất bại."),
      ),
  });

  const createClassMutation = useMutation({
    mutationFn: async ({
      courseId,
      data,
    }: {
      courseId: number;
      data: typeof classForm;
    }) =>
      (
        await axiosClient.post(`/admin/courses/${courseId}/classes`, {
          ...data,
          teacherId: parseInt(data.teacherId),
          startDate: data.startDate || undefined,
          endDate: data.endDate || undefined,
          meetingLink: data.meetingLink || undefined,
          capacity: parseInt(data.capacity) || 30,
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      setShowCreateClass(null);
      setClassForm({
        name: "",
        teacherId: "",
        startDate: "",
        endDate: "",
        meetingLink: "",
        capacity: "30",
      });
      toast.success("Tạo lớp học thành công!");
    },
    onError: (err: any) =>
      toast.error(getApiErrorMessage(err, "Tạo lớp học thất bại.")),
  });

  const filteredCourses = courses?.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.teacher?.profile?.fullName || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil((filteredCourses?.length || 0) / pageSize);
  const paginatedCourses = filteredCourses?.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const levelLabel = (l: string | null) =>
    LEVEL_OPTIONS.find((o) => o.value === (l || ""))?.label || "—";

  const handleCreateClassSubmit = () => {
    if (!showCreateClass) return;
    if (
      classForm.startDate &&
      classForm.endDate &&
      new Date(classForm.startDate) >= new Date(classForm.endDate)
    ) {
      toast.error("Ngày kết thúc phải sau ngày bắt đầu!");
      return;
    }
    if (parseInt(classForm.capacity) <= 0) {
      toast.error("Sức chứa lớp học phải lớn hơn 0!");
      return;
    }
    createClassMutation.mutate({
      courseId: showCreateClass,
      data: classForm,
    });
  };

  const isAdminDateInvalid =
    Boolean(editClassForm.startDate) &&
    Boolean(editClassForm.endDate) &&
    new Date(editClassForm.endDate) <= new Date(editClassForm.startDate);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            Quản lý Khóa học
          </h1>
          <p className="text-slate-500 mt-1">
            Tạo, thẩm định duyệt và quản lý toàn bộ khóa học, lớp học trong hệ thống.
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
            { key: "PENDING_REVIEW", label: "Chờ duyệt" },
            { key: "PUBLISHED", label: "Đã duyệt" },
            { key: "DRAFT", label: "Bản nháp" },
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

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            size={16}
          />
          <input
            type="text"
            placeholder="Tìm theo tên khóa học hoặc giáo viên..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm"
          />
        </div>
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
                            {/* Review Actions for Pending or Draft Courses */}
                            {course.status === "PENDING_REVIEW" && (
                              <>
                                <button
                                  onClick={() =>
                                    reviewCourseMutation.mutate({
                                      courseId: course.id,
                                      action: "APPROVE",
                                    })
                                  }
                                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                                  title="Phê duyệt khóa học (PUBLISHED)"
                                >
                                  <Check size={13} /> Duyệt
                                </button>
                                <button
                                  onClick={() =>
                                    reviewCourseMutation.mutate({
                                      courseId: course.id,
                                      action: "REJECT",
                                    })
                                  }
                                  className="px-2.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors border border-rose-200"
                                  title="Từ chối (chuyển về DRAFT)"
                                >
                                  <RotateCcw size={13} /> Từ chối
                                </button>
                              </>
                            )}

                            {/* Create Class Button - strictly disabled unless PUBLISHED */}
                            {course.status === "PUBLISHED" ? (
                              <button
                                onClick={() => {
                                  setShowCreateClass(course.id);
                                  setClassForm({
                                    ...classForm,
                                    teacherId:
                                      course.teacher?.id?.toString() || "",
                                    capacity: "30",
                                  });
                                }}
                                className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                              >
                                <Plus size={14} /> Thêm Lớp
                              </button>
                            ) : (
                              <span
                                className="px-2.5 py-1 bg-slate-100 text-slate-400 rounded-lg text-xs font-medium border border-slate-200 cursor-not-allowed"
                                title="Cần duyệt khóa học (PUBLISHED) trước khi mở lớp"
                              >
                                Cần duyệt trước khi mở lớp
                              </span>
                            )}

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
                          <span className="flex items-center gap-1">
                            <UserCheck size={13} className="text-slate-400" />{" "}
                            {course.teacher?.profile?.fullName || "Chưa gán giáo viên"}
                          </span>
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                            {levelLabel(course.level)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users size={13} className="text-slate-400" />{" "}
                            {course._count.classes} lớp học
                          </span>
                          <button
                            onClick={() =>
                              setExpandedCourse(
                                expandedCourse === course.id ? null : course.id,
                              )
                            }
                            className="ml-auto flex items-center gap-1 text-blue-600 font-semibold hover:underline"
                          >
                            {expandedCourse === course.id
                              ? "Thu gọn"
                              : "Chi tiết lớp"}
                            <ChevronRight
                              size={14}
                              className={`transition-transform ${
                                expandedCourse === course.id ? "rotate-90" : ""
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Classes Accordion */}
                    {expandedCourse === course.id && (
                      <div className="border-t border-slate-100 bg-slate-50 p-4">
                        {course.classes && course.classes.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-slate-400 text-xs border-b border-slate-200">
                                  <th className="p-3 text-left font-semibold">
                                    Tên Lớp
                                  </th>
                                  <th className="p-3 text-left font-semibold">
                                    Trạng thái
                                  </th>
                                  <th className="p-3 text-left font-semibold">
                                    Học viên / Sức chứa
                                  </th>
                                  <th className="p-3 text-left font-semibold">
                                    Thời gian
                                  </th>
                                  <th className="p-3 text-right font-semibold">
                                    Thao tác
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {course.classes.map((cls) => (
                                  <tr
                                    key={cls.id}
                                    className="border-b border-slate-100 last:border-0"
                                  >
                                    <td className="p-3 font-medium text-slate-800">
                                      {cls.name}
                                    </td>
                                    <td className="p-3">
                                      <span
                                        className={`px-2 py-0.5 rounded text-xs font-bold ${
                                          cls.status === "ACTIVE" ||
                                          cls.status === "ONGOING"
                                            ? "bg-green-100 text-green-700"
                                            : cls.status === "UPCOMING"
                                              ? "bg-blue-100 text-blue-700"
                                              : "bg-slate-100 text-slate-600"
                                        }`}
                                      >
                                        {cls.status === "ACTIVE" ||
                                        cls.status === "ONGOING"
                                          ? "Đang diễn ra"
                                          : cls.status === "UPCOMING"
                                            ? "Sắp khai giảng"
                                            : cls.status}
                                      </span>
                                    </td>
                                    <td className="p-3 text-slate-600">
                                      <span className="flex items-center gap-1">
                                        <Users size={13} />{" "}
                                        {cls._count?.enrollments || 0} /{" "}
                                        {cls.capacity || 30}
                                      </span>
                                    </td>
                                    <td className="p-3 text-slate-500 text-xs">
                                      {cls.startDate
                                        ? new Date(
                                            cls.startDate,
                                          ).toLocaleDateString("vi-VN")
                                        : "—"}
                                      {cls.endDate
                                        ? ` → ${new Date(
                                            cls.endDate,
                                          ).toLocaleDateString("vi-VN")}`
                                        : ""}
                                    </td>
                                    <td className="p-3 text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        <button
                                          onClick={() => handleOpenEditClass(cls, course)}
                                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded text-xs transition-colors cursor-pointer"
                                          title="Chỉnh sửa thông tin lớp học"
                                        >
                                          Sửa lớp
                                        </button>
                                        <button
                                          onClick={() => setClassToDelete(cls)}
                                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                          title="Xóa lớp học"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                        <Link
                                          href={`/admin/enroll?classId=${cls.id}`}
                                        >
                                          <button className="text-xs text-blue-600 hover:text-blue-800 font-medium underline cursor-pointer">
                                            Quản lý ghi danh
                                          </button>
                                        </Link>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center py-6 text-slate-400 text-xs">
                            Chưa có lớp học nào được mở cho khóa học này.
                          </div>
                        )}
                      </div>
                    )}
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
                <BookOpen size={22} className="text-blue-600" /> Tạo Khóa học mới
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Giáo viên phụ trách
                </label>
                <select
                  value={courseForm.teacherId}
                  onChange={(e) =>
                    setCourseForm({ ...courseForm, teacherId: e.target.value })
                  }
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500 bg-white"
                >
                  <option value="">-- Chưa gán giáo viên --</option>
                  {teachers?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.profile?.fullName || t.email}
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

      {/* Create Class Modal */}
      {showCreateClass !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Users size={22} className="text-green-500" /> Tạo Lớp học mới
              </h2>
              <button
                onClick={() => setShowCreateClass(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={22} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tên lớp *
                </label>
                <input
                  type="text"
                  placeholder="VD: IELTS K01 - Tháng 9/2026"
                  value={classForm.name}
                  onChange={(e) =>
                    setClassForm({ ...classForm, name: e.target.value })
                  }
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Giáo viên *
                </label>
                <select
                  value={classForm.teacherId}
                  onChange={(e) =>
                    setClassForm({ ...classForm, teacherId: e.target.value })
                  }
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500 bg-white"
                >
                  <option value="">-- Chọn giáo viên --</option>
                  {teachers?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.profile?.fullName || t.email}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
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
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Ngày kết thúc
                  </label>
                  <input
                    type="date"
                    value={classForm.endDate}
                    onChange={(e) =>
                      setClassForm({ ...classForm, endDate: e.target.value })
                    }
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Sức chứa tối đa (Capacity)
                </label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={classForm.capacity}
                  onChange={(e) =>
                    setClassForm({ ...classForm, capacity: e.target.value })
                  }
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Link Meet (Google Meet/Zoom)
                </label>
                <input
                  type="url"
                  placeholder="https://meet.google.com/... (để trống sẽ tự tạo)"
                  value={classForm.meetingLink}
                  onChange={(e) =>
                    setClassForm({
                      ...classForm,
                      meetingLink: e.target.value,
                    })
                  }
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateClass(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateClassSubmit}
                disabled={
                  createClassMutation.isPending ||
                  !classForm.name ||
                  !classForm.teacherId
                }
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {createClassMutation.isPending ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Plus size={18} />
                )}
                Tạo Lớp học
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT CLASS (ADMIN) ================= */}
      {editingClass && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Header with Status Badge */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Quản trị Lớp học
                </span>
                <h3 className="font-bold text-slate-800 text-lg">
                  {editingClass.name}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded-md text-xs font-bold border ${
                    editingClass.status === "ONGOING"
                      ? "bg-green-50 text-green-700 border-green-200"
                      : editingClass.status === "UPCOMING"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : editingClass.status === "COMPLETED"
                          ? "bg-slate-100 text-slate-600 border-slate-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}
                >
                  {editingClass.status === "ONGOING"
                    ? "ONGOING - Đang diễn ra"
                    : editingClass.status === "UPCOMING"
                      ? "UPCOMING - Sắp diễn ra"
                      : editingClass.status === "COMPLETED"
                        ? "COMPLETED - Đã kết thúc"
                        : "CANCELLED - Đã hủy"}
                </span>
                <button
                  onClick={() => {
                    setEditingClass(null);
                    setEditingClassCourse(null);
                    setShowTeacherChangeConfirm(false);
                  }}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Status alerts */}
            {editingClass.status === "ONGOING" && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-900 flex items-start gap-2.5 mb-4">
                <AlertTriangle size={16} className="shrink-0 text-green-700 mt-0.5" />
                <div>
                  <strong>Lớp học đang diễn ra (ONGOING):</strong> Ngày bắt đầu đã khóa. Điều chỉnh ngày kết thúc phải đảm bảo sau buổi học cuối cùng đã lên lịch.
                </div>
              </div>
            )}

            {(editingClass.status === "COMPLETED" || editingClass.status === "CANCELLED") && (
              <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start gap-2.5 mb-4">
                <Lock size={16} className="shrink-0 text-slate-500 mt-0.5" />
                <div>
                  <strong>Lớp học ở chế độ chỉ đọc:</strong> Trạng thái {editingClass.status}. Toàn bộ thông tin không thể chỉnh sửa thêm.
                </div>
              </div>
            )}

            {/* Teacher Change Warning for Admin */}
            {showTeacherChangeConfirm && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 mb-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-rose-900">
                  <AlertTriangle size={16} className="text-rose-600" />
                  Xác nhận thay đổi Giáo viên phụ trách?
                </div>
                <p className="leading-relaxed text-rose-700">
                  Lớp học này hiện đang có <strong>{editingClass._count?.enrollments || 0} học viên</strong>. Việc thay đổi giáo viên có thể ảnh hưởng đến quyền chấm điểm, các buổi học trực tuyến và thông báo đến học viên.
                </p>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowTeacherChangeConfirm(false)}
                    className="px-3 py-1 bg-white border border-rose-300 text-rose-800 rounded font-semibold text-[11px]"
                  >
                    Hủy đổi
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowTeacherChangeConfirm(false);
                      // proceed submit
                      const isOngoing = editingClass.status === "ONGOING";
                      const payload: any = {
                        name: editClassForm.name.trim(),
                        teacherId: Number(editClassForm.teacherId),
                        capacity: Number(editClassForm.capacity),
                        endDate: editClassForm.endDate ? new Date(editClassForm.endDate).toISOString() : undefined,
                        meetingLink: editClassForm.meetingLink.trim() || undefined,
                      };
                      if (!isOngoing && editClassForm.startDate) {
                        payload.startDate = new Date(editClassForm.startDate).toISOString();
                      }
                      updateClassMutation.mutate({ id: editingClass.id, data: payload });
                    }}
                    className="px-3 py-1 bg-rose-600 text-white rounded font-semibold text-[11px]"
                  >
                    Xác nhận đổi giáo viên
                  </button>
                </div>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (editingClass.status === "COMPLETED" || editingClass.status === "CANCELLED") {
                  setEditingClass(null);
                  return;
                }

                if (!editClassForm.name.trim()) {
                  toast.error("Tên lớp học là bắt buộc.");
                  return;
                }
                const currentEnrolled = editingClass._count?.enrollments || 0;
                if (Number(editClassForm.capacity) < currentEnrolled) {
                  toast.error(`Sức chứa không được nhỏ hơn số học viên hiện tại (${currentEnrolled}).`);
                  return;
                }
                if (
                  editClassForm.startDate &&
                  editClassForm.endDate &&
                  new Date(editClassForm.startDate) >= new Date(editClassForm.endDate)
                ) {
                  toast.error("Ngày kết thúc phải sau ngày bắt đầu.");
                  return;
                }

                // Check if teacher changed and class has students
                const isTeacherChanged =
                  editClassForm.teacherId &&
                  Number(editClassForm.teacherId) !== editingClass.teacherId;

                if (isTeacherChanged && currentEnrolled > 0 && !showTeacherChangeConfirm) {
                  setShowTeacherChangeConfirm(true);
                  return;
                }

                const isOngoing = editingClass.status === "ONGOING";
                const payload: any = {
                  name: editClassForm.name.trim(),
                  teacherId: editClassForm.teacherId ? Number(editClassForm.teacherId) : undefined,
                  capacity: Number(editClassForm.capacity),
                  endDate: editClassForm.endDate ? new Date(editClassForm.endDate).toISOString() : undefined,
                  meetingLink: editClassForm.meetingLink.trim() || undefined,
                };
                if (!isOngoing && editClassForm.startDate) {
                  payload.startDate = new Date(editClassForm.startDate).toISOString();
                }

                updateClassMutation.mutate({ id: editingClass.id, data: payload });
              }}
              className="space-y-4 text-xs"
            >
              {/* Section 1: Thông tin cơ bản */}
              <div className="space-y-3 pb-3 border-b border-slate-100">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  1. Thông tin lớp học
                </h4>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Khóa học</label>
                  <input
                    type="text"
                    disabled
                    readOnly
                    value={editingClassCourse?.title || "Khóa học"}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-500 cursor-not-allowed font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Tên lớp học <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={editingClass.status === "COMPLETED" || editingClass.status === "CANCELLED"}
                    value={editClassForm.name}
                    onChange={(e) => setEditClassForm({ ...editClassForm, name: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 outline-none focus:border-blue-500 text-slate-800 font-semibold disabled:bg-slate-50 disabled:text-slate-500"
                  />
                </div>
              </div>

              {/* Section 2: Giáo viên phụ trách */}
              <div className="space-y-2 pb-3 border-b border-slate-100">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  2. Phân công Giáo viên
                </h4>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Giáo viên phụ trách <span className="text-rose-500">*</span>
                  </label>
                  <select
                    disabled={editingClass.status === "COMPLETED" || editingClass.status === "CANCELLED"}
                    value={editClassForm.teacherId}
                    onChange={(e) => setEditClassForm({ ...editClassForm, teacherId: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 outline-none focus:border-blue-500 text-slate-800 font-semibold disabled:bg-slate-50 disabled:text-slate-500"
                  >
                    <option value="">-- Chọn giáo viên --</option>
                    {teachers?.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.profile?.fullName || t.email} ({t.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Section 3: Sức chứa */}
              <div className="space-y-2 pb-3 border-b border-slate-100">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  3. Sức chứa học viên
                </h4>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 font-bold">
                      Sức chứa tối đa (Capacity) <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] font-semibold text-slate-500">
                      Học viên hiện tại: <strong>{editingClass._count?.enrollments || 0}</strong>
                    </span>
                  </div>
                  <input
                    type="number"
                    min={editingClass._count?.enrollments || 1}
                    required
                    disabled={editingClass.status === "COMPLETED" || editingClass.status === "CANCELLED"}
                    value={editClassForm.capacity}
                    onChange={(e) => setEditClassForm({ ...editClassForm, capacity: e.target.value })}
                    className={`w-full border rounded-xl px-3.5 py-2 outline-none font-semibold ${
                      Number(editClassForm.capacity) < (editingClass._count?.enrollments || 0)
                        ? "border-rose-400 bg-rose-50/40 text-rose-700"
                        : "border-slate-200 focus:border-blue-500 text-slate-800 disabled:bg-slate-50"
                    }`}
                  />
                  {Number(editClassForm.capacity) < (editingClass._count?.enrollments || 0) && (
                    <p className="text-[11px] text-rose-500 font-semibold mt-1">
                      Sức chứa không thể nhỏ hơn {editingClass._count?.enrollments || 0} học viên hiện tại.
                    </p>
                  )}
                </div>
              </div>

              {/* Section 4: Lịch học & Họp trực tuyến */}
              <div className="space-y-3 pb-2">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  4. Thời gian & Phòng học
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Ngày bắt đầu {editingClass.status === "ONGOING" && <span className="text-[10px] text-amber-600 font-normal">(Đã khóa)</span>}
                    </label>
                    <input
                      type="date"
                      disabled={
                        editingClass.status === "ONGOING" ||
                        editingClass.status === "COMPLETED" ||
                        editingClass.status === "CANCELLED"
                      }
                      value={editClassForm.startDate}
                      onChange={(e) => setEditClassForm({ ...editClassForm, startDate: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500 text-slate-800 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                    />
                    {editingClass.status === "ONGOING" && (
                      <p className="text-[10px] text-amber-700 mt-1 flex items-center gap-1">
                        <Lock size={10} /> Không thể thay đổi ngày bắt đầu vì lớp đã bắt đầu.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Ngày kết thúc</label>
                    <input
                      type="date"
                      disabled={editingClass.status === "COMPLETED" || editingClass.status === "CANCELLED"}
                      value={editClassForm.endDate}
                      onChange={(e) => setEditClassForm({ ...editClassForm, endDate: e.target.value })}
                      className={`w-full border rounded-xl px-3 py-2 outline-none text-slate-800 disabled:bg-slate-50 ${
                        isAdminDateInvalid
                          ? "border-rose-400 bg-rose-50/40 text-rose-700"
                          : "border-slate-200 focus:border-blue-500"
                      }`}
                    />
                    {isAdminDateInvalid ? (
                      <p className="text-[11px] text-rose-500 font-semibold mt-1">
                        Ngày kết thúc phải sau ngày bắt đầu.
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-400 mt-1">
                        Phải sau các buổi học đã lên lịch.
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Meeting Link</label>
                  <input
                    type="url"
                    disabled={editingClass.status === "COMPLETED" || editingClass.status === "CANCELLED"}
                    value={editClassForm.meetingLink}
                    onChange={(e) => setEditClassForm({ ...editClassForm, meetingLink: e.target.value })}
                    placeholder="https://meet.google.com/..."
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 outline-none focus:border-blue-500 text-slate-800 disabled:bg-slate-50"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setEditingClass(null);
                    setEditingClassCourse(null);
                    setShowTeacherChangeConfirm(false);
                  }}
                  className="flex-1 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  {editingClass.status === "COMPLETED" || editingClass.status === "CANCELLED" ? "Đóng" : "Hủy"}
                </button>

                {editingClass.status !== "COMPLETED" && editingClass.status !== "CANCELLED" && (
                  <button
                    type="submit"
                    disabled={
                      updateClassMutation.isPending ||
                      Number(editClassForm.capacity) < (editingClass._count?.enrollments || 0) ||
                      isAdminDateInvalid
                    }
                    className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {updateClassMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                    Lưu Thay Đổi
                  </button>
                )}
              </div>
            </form>
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
            <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-lg text-[11px] text-rose-700 mb-6">
              Hành động này có thể xóa liên hoàn:
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li>Toàn bộ bài học và video đính kèm</li>
                <li>Tài liệu học tập</li>
                <li>Bài kiểm tra liên kết</li>
                <li>Các lớp học liên quan</li>
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
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: BLOCK DELETE CLASS (WHEN ENROLLED) ================= */}
      {classToDelete && (classToDelete._count?.enrollments || 0) > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl shrink-0">
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Không thể xóa lớp học này
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mã lớp #{classToDelete.id}: {classToDelete.name}
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Lớp đã có <strong>{classToDelete._count?.enrollments} học viên</strong> đăng ký. Hãy chuyển lớp sang <strong>CANCELLED</strong> thay vì xóa để bảo lưu lịch sử học tập và giao dịch.
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setClassToDelete(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CONFIRM DELETE CLASS (WHEN EMPTY) ================= */}
      {classToDelete && (classToDelete._count?.enrollments || 0) === 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl shrink-0">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Xóa lớp học?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mã lớp #{classToDelete.id}: {classToDelete.name}
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Thao tác này không thể hoàn tác. Bạn có chắc chắn muốn xóa vĩnh viễn lớp học này không?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                disabled={deleteClassMutation.isPending}
                onClick={() => setClassToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={deleteClassMutation.isPending}
                onClick={() => deleteClassMutation.mutate(classToDelete.id)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {deleteClassMutation.isPending && (
                  <Loader2 size={16} className="animate-spin" />
                )}
                Xóa lớp học
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
