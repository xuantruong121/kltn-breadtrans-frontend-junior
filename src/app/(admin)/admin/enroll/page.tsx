"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Loader2, UserPlus, Users, X, Trash2, BookOpen, Check } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import axiosClient from "@/lib/api/axiosClient";
import toast from "react-hot-toast";

type Student = {
  id: number; email: string;
  profile: { fullName: string; avatar: string | null } | null;
};
type ClassOption = { id: number; name: string; course: { id: number; title: string } };
type EnrolledStudent = {
  userId: number; progress: number; status: string; joinedAt: string;
  user: { id: number; email: string; profile: { fullName: string; avatar: string | null; phone: string | null } | null };
};

export default function AdminEnrollPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const defaultClassId = searchParams.get("classId") || "";

  const [selectedClassId, setSelectedClassId] = useState<string>(defaultClassId);
  const [searchStudent, setSearchStudent] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);

  const { data: classes } = useQuery<ClassOption[]>({
    queryKey: ["admin-classes"],
    queryFn: async () => axiosClient.get("/admin/classes") as unknown as ClassOption[],
  });

  const { data: students } = useQuery<Student[]>({
    queryKey: ["admin-users", "STUDENT"],
    queryFn: async () => axiosClient.get("/admin/users?role=STUDENT") as unknown as Student[],
  });

  const { data: classDetail, isLoading: isLoadingEnrolled } = useQuery<{ enrollments: EnrolledStudent[]; _count: { enrollments: number }; name: string; course: { title: string } }>({
    queryKey: ["admin-class-detail", selectedClassId],
    queryFn: async () => axiosClient.get(`/admin/classes/${selectedClassId}`) as unknown as { enrollments: EnrolledStudent[]; _count: { enrollments: number }; name: string; course: { title: string } },
    enabled: !!selectedClassId,
  });

  const enrolledUserIds = new Set(classDetail?.enrollments?.map((e) => e.userId) ?? []);

  const enrollMutation = useMutation({
    mutationFn: async (userId: number) =>
      axiosClient.post("/admin/enroll", { userId, classId: parseInt(selectedClassId) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-class-detail", selectedClassId] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast.success("Ghi danh thành công!");
      setSelectedStudentIds([]);
    },
    onError: () => toast.error("Ghi danh thất bại."),
  });

  const bulkEnrollMutation = useMutation({
    mutationFn: async (ids: number[]) =>
      Promise.all(ids.map(id => axiosClient.post("/admin/enroll", { userId: id, classId: parseInt(selectedClassId) }))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-class-detail", selectedClassId] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast.success(`Ghi danh ${selectedStudentIds.length} học viên thành công!`);
      setSelectedStudentIds([]);
    },
    onError: () => toast.error("Có lỗi khi ghi danh."),
  });

  const removeEnrollMutation = useMutation({
    mutationFn: async (userId: number) =>
      axiosClient.delete("/admin/enroll", { data: { userId, classId: parseInt(selectedClassId) } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-class-detail", selectedClassId] });
      toast.success("Đã hủy ghi danh.");
    },
  });

  const filteredStudents = students?.filter((s) =>
    !enrolledUserIds.has(s.id) && (
      (s.profile?.fullName || "").toLowerCase().includes(searchStudent.toLowerCase()) ||
      s.email.toLowerCase().includes(searchStudent.toLowerCase())
    )
  );

  const toggleSelect = (id: number) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Ghi danh Học viên</h1>
        <p className="text-slate-500 mt-1">Thêm học viên vào lớp học. Admin quản lý toàn bộ việc cấp quyền truy cập.</p>
      </div>

      {/* Class Selector */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mb-6">
        <label className="block text-sm font-semibold text-slate-700 mb-2">Chọn Lớp học cần ghi danh</label>
        <select
          value={selectedClassId}
          onChange={(e) => { setSelectedClassId(e.target.value); setSelectedStudentIds([]); }}
          className="w-full max-w-lg border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 bg-slate-50"
        >
          <option value="">-- Chọn lớp học --</option>
          {classes?.map((c) => (
            <option key={c.id} value={c.id}>
              [{c.course.title}] {c.name}
            </option>
          ))}
        </select>
      </div>

      {selectedClassId ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Student Picker */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <UserPlus size={18} className="text-blue-500" /> Thêm học viên
              </h3>
              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" placeholder="Tìm theo tên hoặc email..."
                  value={searchStudent} onChange={(e) => setSearchStudent(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500" />
              </div>
              {selectedStudentIds.length > 0 && (
                <button
                  onClick={() => bulkEnrollMutation.mutate(selectedStudentIds)}
                  disabled={bulkEnrollMutation.isPending}
                  className="w-full mt-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                >
                  {bulkEnrollMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Ghi danh {selectedStudentIds.length} học viên đã chọn
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-50 max-h-[480px]">
              {filteredStudents && filteredStudents.length > 0 ? filteredStudents.map((s) => (
                <div key={s.id}
                  onClick={() => toggleSelect(s.id)}
                  className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50 transition-colors ${selectedStudentIds.includes(s.id) ? "bg-blue-50" : ""}`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selectedStudentIds.includes(s.id) ? "border-blue-500 bg-blue-500" : "border-slate-300"}`}>
                    {selectedStudentIds.includes(s.id) && <Check size={12} className="text-white" />}
                  </div>
                  <div className="w-9 h-9 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                    {(s.profile?.fullName || s.email)[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 text-sm truncate">{s.profile?.fullName || "—"}</p>
                    <p className="text-xs text-slate-400 truncate">{s.email}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); enrollMutation.mutate(s.id); }}
                    disabled={enrollMutation.isPending}
                    className="ml-auto px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg font-bold flex items-center gap-1 transition-colors flex-shrink-0"
                  >
                    <UserPlus size={12} /> Ghi danh
                  </button>
                </div>
              )) : (
                <div className="p-8 text-center text-slate-400 text-sm">
                  {searchStudent ? "Không tìm thấy học viên." : "Tất cả học viên đã được ghi danh vào lớp này."}
                </div>
              )}
            </div>
          </div>

          {/* Right: Enrolled Students */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Users size={18} className="text-green-500" />
                Học viên trong lớp
                {classDetail && (
                  <span className="ml-auto bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full">
                    {classDetail._count.enrollments} học viên
                  </span>
                )}
              </h3>
              {classDetail && (
                <p className="text-xs text-slate-400 mt-1">
                  {classDetail.course?.title} — {classDetail.name}
                </p>
              )}
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-50 max-h-[480px]">
              {isLoadingEnrolled ? (
                <div className="flex justify-center p-8"><Loader2 size={24} className="animate-spin text-blue-500" /></div>
              ) : classDetail?.enrollments && classDetail.enrollments.length > 0 ? (
                classDetail.enrollments.map((e) => (
                  <div key={e.userId} className="flex items-center gap-3 p-4">
                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                      {(e.user.profile?.fullName || e.user.email)[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-800 text-sm truncate">{e.user.profile?.fullName || "—"}</p>
                      <p className="text-xs text-slate-400 truncate">{e.user.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 bg-slate-100 rounded-full h-1.5 max-w-[100px]">
                          <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${e.progress}%` }} />
                        </div>
                        <span className="text-xs text-slate-400">{e.progress}%</span>
                      </div>
                    </div>
                    <button
                      onClick={() => { if (confirm("Hủy ghi danh học viên này?")) removeEnrollMutation.mutate(e.userId); }}
                      className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <BookOpen size={32} className="text-slate-200 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">Chưa có học viên nào trong lớp này.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-16 text-center border border-slate-100">
          <Users size={48} className="text-slate-200 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 text-lg">Chọn một lớp học để bắt đầu ghi danh</h3>
          <p className="text-slate-400 text-sm mt-1">Bạn có thể ghi danh nhiều học viên cùng lúc.</p>
        </div>
      )}
    </div>
  );
}
