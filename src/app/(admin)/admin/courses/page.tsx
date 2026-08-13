"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search, Loader2, BookOpen, Plus, Trash2, Users,
  ChevronRight, X, Calendar, UserCheck, Settings
} from "lucide-react";
import { useState } from "react";
import axiosClient from "@/lib/api/axiosClient";
import toast from "react-hot-toast";
import Link from "next/link";

type Teacher = { id: number; email: string; profile: { fullName: string; avatar: string | null } | null };
type ClassData = { id: number; name: string; status: string; _count: { enrollments: number }; startDate: string | null; endDate: string | null };
type Course = {
  id: number; title: string; description: string | null; thumbnail: string | null;
  level: string | null; status: string; createdAt: string;
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

export default function AdminCoursesPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [showCreateClass, setShowCreateClass] = useState<number | null>(null); // courseId
  const [expandedCourse, setExpandedCourse] = useState<number | null>(null);

  const [courseForm, setCourseForm] = useState({ title: "", description: "", level: "", teacherId: "" });
  const [classForm, setClassForm] = useState({ name: "", teacherId: "", startDate: "", endDate: "", meetingLink: "" });

  const { data: courses, isLoading } = useQuery<Course[]>({
    queryKey: ["admin-courses"],
    queryFn: async () => (await axiosClient.get("/admin/courses")).data,
  });

  const { data: teachers } = useQuery<Teacher[]>({
    queryKey: ["admin-users", "TEACHER"],
    queryFn: async () => (await axiosClient.get("/admin/users?role=TEACHER")).data,
  });

  const createCourseMutation = useMutation({
    mutationFn: async (data: typeof courseForm) =>
      (await axiosClient.post("/admin/courses", {
        ...data,
        teacherId: data.teacherId ? parseInt(data.teacherId) : undefined,
      })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      setShowCreateCourse(false);
      setCourseForm({ title: "", description: "", level: "", teacherId: "" });
      toast.success("Tạo khóa học thành công!");
    },
    onError: () => toast.error("Tạo khóa học thất bại."),
  });

  const deleteCourseMutation = useMutation({
    mutationFn: async (id: number) => axiosClient.delete(`/admin/courses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast.success("Đã xóa khóa học.");
    },
    onError: () => toast.error("Không thể xóa khóa học (có thể đang có lớp học)."),
  });

  const createClassMutation = useMutation({
    mutationFn: async ({ courseId, data }: { courseId: number; data: typeof classForm }) =>
      (await axiosClient.post(`/admin/courses/${courseId}/classes`, {
        ...data,
        teacherId: parseInt(data.teacherId),
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
        meetingLink: data.meetingLink || undefined,
      })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      setShowCreateClass(null);
      setClassForm({ name: "", teacherId: "", startDate: "", endDate: "", meetingLink: "" });
      toast.success("Tạo lớp học thành công!");
    },
    onError: () => toast.error("Tạo lớp học thất bại."),
  });

  const filteredCourses = courses?.filter((c) =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.teacher?.profile?.fullName || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const levelLabel = (l: string | null) => LEVEL_OPTIONS.find(o => o.value === (l || ""))?.label || "—";

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Quản lý Khóa học</h1>
          <p className="text-slate-500 mt-1">Tạo và quản lý toàn bộ khóa học, lớp học trong hệ thống.</p>
        </div>
        <button
          onClick={() => setShowCreateCourse(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus size={18} /> Tạo Khóa học
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6 flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên khóa học hoặc giáo viên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm"
          />
        </div>
      </div>

      {/* Course List */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-blue-600" size={40} /></div>
      ) : (
        <div className="space-y-4">
          {filteredCourses && filteredCourses.length > 0 ? filteredCourses.map((course) => (
            <div key={course.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              {/* Course Header */}
              <div className="p-5 flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-blue-50 overflow-hidden flex-shrink-0">
                  {course.thumbnail ? (
                    <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-blue-300">
                      <BookOpen size={28} />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg leading-tight">{course.title}</h3>
                      <p className="text-slate-400 text-xs mt-0.5">{course.description || "Chưa có mô tả"}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-lg font-medium">{levelLabel(course.level)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <UserCheck size={13} /> {course.teacher?.profile?.fullName || "Chưa gán giáo viên"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={13} /> {course._count.classes} lớp học
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => { setShowCreateClass(course.id); setClassForm({ ...classForm, teacherId: course.teacher?.id?.toString() || "" }); }}
                    className="px-3 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
                  >
                    <Plus size={14} /> Thêm Lớp
                  </button>
                  <button
                    onClick={() => setExpandedCourse(expandedCourse === course.id ? null : course.id)}
                    className="px-3 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
                  >
                    <ChevronRight size={14} className={`transition-transform ${expandedCourse === course.id ? "rotate-90" : ""}`} />
                    {course._count.classes} Lớp
                  </button>
                  <Link href={`/admin/enroll?courseId=${course.id}`}>
                    <button className="px-3 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors">
                      <Settings size={14} /> Ghi danh
                    </button>
                  </Link>
                  <button
                    onClick={() => { if (confirm(`Xóa khóa học "${course.title}"?`)) deleteCourseMutation.mutate(course.id); }}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Classes Panel */}
              {expandedCourse === course.id && (
                <div className="border-t border-slate-100 bg-slate-50">
                  {course.classes.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-slate-400 text-xs border-b border-slate-200">
                          <th className="p-3 text-left font-semibold">Tên Lớp</th>
                          <th className="p-3 text-left font-semibold">Trạng thái</th>
                          <th className="p-3 text-left font-semibold">Học viên</th>
                          <th className="p-3 text-left font-semibold">Thời gian</th>
                          <th className="p-3 text-right font-semibold">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {course.classes.map((cls) => (
                          <tr key={cls.id} className="border-b border-slate-100 last:border-0">
                            <td className="p-3 font-medium text-slate-800">{cls.name}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                cls.status === "ACTIVE" ? "bg-green-100 text-green-700" :
                                cls.status === "UPCOMING" ? "bg-blue-100 text-blue-700" :
                                "bg-slate-100 text-slate-600"
                              }`}>
                                {cls.status === "ACTIVE" ? "Đang học" : cls.status === "UPCOMING" ? "Sắp khai giảng" : cls.status}
                              </span>
                            </td>
                            <td className="p-3 text-slate-600">
                              <span className="flex items-center gap-1"><Users size={13} /> {cls._count.enrollments} học viên</span>
                            </td>
                            <td className="p-3 text-slate-500 text-xs">
                              {cls.startDate ? new Date(cls.startDate).toLocaleDateString("vi-VN") : "—"}
                              {cls.endDate ? ` → ${new Date(cls.endDate).toLocaleDateString("vi-VN")}` : ""}
                            </td>
                            <td className="p-3 text-right">
                              <Link href={`/admin/enroll?classId=${cls.id}`}>
                                <button className="text-xs text-blue-600 hover:text-blue-800 font-medium underline">
                                  Quản lý ghi danh
                                </button>
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-6 text-center text-slate-400 text-sm">
                      Chưa có lớp học nào. Bấm "+ Thêm Lớp" để tạo.
                    </div>
                  )}
                </div>
              )}
            </div>
          )) : (
            <div className="bg-white rounded-2xl p-16 text-center border border-slate-100">
              <BookOpen size={40} className="text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-700 text-lg">Chưa có khóa học nào</h3>
              <p className="text-slate-400 text-sm mt-1">Bấm "Tạo Khóa học" để bắt đầu.</p>
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
                <BookOpen size={22} className="text-blue-500" /> Tạo Khóa học mới
              </h2>
              <button onClick={() => setShowCreateCourse(false)} className="text-slate-400 hover:text-slate-700"><X size={22} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tên khóa học *</label>
                <input type="text" placeholder="VD: IELTS Intensive 2026" value={courseForm.title}
                  onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả</label>
                <textarea placeholder="Mô tả ngắn về khóa học..." value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500 resize-none" rows={3} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cấp độ</label>
                <select value={courseForm.level} onChange={(e) => setCourseForm({ ...courseForm, level: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500 bg-white">
                  {LEVEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Giáo viên phụ trách</label>
                <select value={courseForm.teacherId} onChange={(e) => setCourseForm({ ...courseForm, teacherId: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500 bg-white">
                  <option value="">-- Chọn giáo viên --</option>
                  {teachers?.map(t => (
                    <option key={t.id} value={t.id}>{t.profile?.fullName || t.email}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreateCourse(false)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50">Hủy</button>
              <button onClick={() => createCourseMutation.mutate(courseForm)}
                disabled={createCourseMutation.isPending || !courseForm.title}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-60">
                {createCourseMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
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
              <button onClick={() => setShowCreateClass(null)} className="text-slate-400 hover:text-slate-700"><X size={22} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tên lớp *</label>
                <input type="text" placeholder="VD: IELTS K01 - Tháng 9/2026" value={classForm.name}
                  onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Giáo viên *</label>
                <select value={classForm.teacherId} onChange={(e) => setClassForm({ ...classForm, teacherId: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500 bg-white">
                  <option value="">-- Chọn giáo viên --</option>
                  {teachers?.map(t => (
                    <option key={t.id} value={t.id}>{t.profile?.fullName || t.email}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ngày bắt đầu</label>
                  <input type="date" value={classForm.startDate}
                    onChange={(e) => setClassForm({ ...classForm, startDate: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ngày kết thúc</label>
                  <input type="date" value={classForm.endDate}
                    onChange={(e) => setClassForm({ ...classForm, endDate: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Link Meet (Google Meet/Zoom)</label>
                <input type="url" placeholder="https://meet.google.com/..." value={classForm.meetingLink}
                  onChange={(e) => setClassForm({ ...classForm, meetingLink: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreateClass(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50">Hủy</button>
              <button
                onClick={() => createClassMutation.mutate({ courseId: showCreateClass, data: classForm })}
                disabled={createClassMutation.isPending || !classForm.name || !classForm.teacherId}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-60">
                {createClassMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                Tạo Lớp học
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
