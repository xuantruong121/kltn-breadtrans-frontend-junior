"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Calendar,
  Clock,
  Video,
  ArrowRight,
  BookOpen,
  PenTool,
  FileText,
  Edit3,
  Loader2,
  Sparkles,
  Plus,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import dayjs from "dayjs";
import axiosClient from "@/lib/api/axiosClient";
import { useAuthStore } from "@/stores/authStore";
import { openDailyClassroomSession } from "@/lib/utils/dailyClassroom";
import toast from "react-hot-toast";

export default function TeacherDashboardPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [editingNoteSession, setEditingNoteSession] = useState<{ id: number; note: string } | null>(null);

  // 1. Lấy dữ liệu 3 số liệu thống kê tổng quan
  const { data: overview, isLoading: isOverviewLoading } = useQuery({
    queryKey: ["teacher-dashboard-overview"],
    queryFn: async () => {
      try {
        const res: any = await axiosClient.get("/teacher/dashboard/overview");
        return res?.data || res;
      } catch {
        return {
          totalActiveStudents: 0,
          totalSessions: 0,
          totalSessionsThisMonth: 0,
          totalTeachingHours: 0,
          thisMonthTeachingHours: 0,
          totalClasses: 0,
        };
      }
    },
  });

  // 2. Lấy danh sách lịch dạy sắp tới
  const { data: upcomingSessions, isLoading: isUpcomingLoading } = useQuery({
    queryKey: ["teacher-dashboard-upcoming"],
    queryFn: async () => {
      try {
        const res: any = await axiosClient.get("/teacher/dashboard/upcoming?limit=6");
        return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  // Mutation cập nhật ghi chú buổi học
  const updateNoteMutation = useMutation({
    mutationFn: async ({ sessionId, note }: { sessionId: number; note: string }) => {
      return axiosClient.patch(`/teacher/sessions/${sessionId}/note`, { lessonNote: note });
    },
    onSuccess: () => {
      toast.success("Đã cập nhật ghi chú buổi học!");
      queryClient.invalidateQueries({ queryKey: ["teacher-dashboard-upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-schedule"] });
      setEditingNoteSession(null);
    },
    onError: () => {
      toast.error("Không thể lưu ghi chú, vui lòng thử lại!");
    },
  });

  // Mutation kết thúc buổi học
  const finishSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      return axiosClient.patch(`/classes/sessions/${sessionId}/finish`);
    },
    onSuccess: () => {
      toast.success("Đã kết thúc buổi học!");
      queryClient.invalidateQueries({ queryKey: ["teacher-dashboard-upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-dashboard-overview"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-schedule"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-classes"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Không thể kết thúc buổi học!");
    },
  });

  const todayStr = dayjs().format("dddd, [ngày] DD [tháng] MM, YYYY");

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold mb-3">
            <Sparkles size={14} className="text-yellow-300" /> Cổng Giảng Viên BreadTrans
          </div>
          <h1 className="text-3xl md:text-4xl font-black">
            Xin chào, {user?.profile?.fullName || user?.email || "Giảng viên"}! 👋
          </h1>
          <p className="text-blue-100 font-medium text-sm mt-1 capitalize">{todayStr}</p>
        </div>
        <div className="absolute right-0 bottom-0 opacity-10 translate-x-10 translate-y-10 pointer-events-none">
          <BookOpen size={240} />
        </div>
      </div>

      {/* 3 Thống Kê Sư Phạm Cốt Lõi (TUYỆT ĐỐI KHÔNG CÓ THỐNG KÊ DOANH THU/TIỀN) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Học sinh đang theo học */}
        <div className="bg-white rounded-3xl p-6 border-2 border-slate-200 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold text-slate-500">Học sinh đang theo học</span>
            <div className="w-12 h-12 rounded-2xl bg-cyan-100 text-cyan-600 flex items-center justify-center">
              <Users size={24} />
            </div>
          </div>
          {isOverviewLoading ? (
            <div className="h-10 bg-slate-100 animate-pulse rounded-lg w-24" />
          ) : (
            <div>
              <div className="text-3xl font-black text-slate-800">
                {overview?.totalActiveStudents || 0}
                <span className="text-base font-bold text-slate-500 ml-1.5">học viên</span>
              </div>
              <p className="text-xs font-bold text-slate-400 mt-1">
                Đang học tại {overview?.totalClasses || 0} lớp phụ trách
              </p>
            </div>
          )}
        </div>

        {/* Card 2: Tổng số buổi dạy */}
        <div className="bg-white rounded-3xl p-6 border-2 border-slate-200 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold text-slate-500">Tổng số buổi dạy</span>
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Calendar size={24} />
            </div>
          </div>
          {isOverviewLoading ? (
            <div className="h-10 bg-slate-100 animate-pulse rounded-lg w-24" />
          ) : (
            <div>
              <div className="text-3xl font-black text-slate-800">
                {overview?.totalSessions || 0}
                <span className="text-base font-bold text-slate-500 ml-1.5">buổi</span>
              </div>
              <p className="text-xs font-bold text-emerald-600 mt-1">
                +{overview?.totalSessionsThisMonth || 0} buổi đã hoàn thành tháng này
              </p>
            </div>
          )}
        </div>

        {/* Card 3: Tổng thời gian tích lũy */}
        <div className="bg-white rounded-3xl p-6 border-2 border-slate-200 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold text-slate-500">Tổng thời gian tích lũy</span>
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Clock size={24} />
            </div>
          </div>
          {isOverviewLoading ? (
            <div className="h-10 bg-slate-100 animate-pulse rounded-lg w-24" />
          ) : (
            <div>
              <div className="text-3xl font-black text-slate-800">
                {overview?.totalTeachingHours || "0.0"}
                <span className="text-base font-bold text-slate-500 ml-1">giờ</span>
              </div>
              <p className="text-xs font-bold text-amber-600 mt-1">
                +{overview?.thisMonthTeachingHours || "0.0"}h giảng dạy trong tháng này
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Lịch dạy sắp tới & Phím tắt nhanh */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <Calendar className="text-blue-600" /> Lịch Dạy Sắp Tới
            </h2>
            <p className="text-sm text-slate-500 font-medium">
              Các buổi học trực tuyến chuẩn bị diễn ra trong các lớp của bạn
            </p>
          </div>
          <Link
            href="/teacher/schedule"
            className="inline-flex items-center gap-2 text-sm font-black text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-colors shrink-0"
          >
            Xem toàn bộ thời khóa biểu <ArrowRight size={16} />
          </Link>
        </div>

        {isUpcomingLoading ? (
          <div className="p-12 text-center bg-white rounded-3xl border-2 border-slate-200">
            <Loader2 className="animate-spin text-blue-600 mx-auto mb-2" size={32} />
            <p className="text-slate-500 font-bold text-sm">Đang tải lịch dạy...</p>
          </div>
        ) : upcomingSessions && upcomingSessions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingSessions.map((session: any) => {
              const start = dayjs(session.startTime);
              const end = dayjs(session.endTime);
              const now = dayjs();
              const isLive = now.isAfter(start.subtract(15, "minute")) && now.isBefore(end);
              const isPast = now.isAfter(end);

              return (
                <div
                  key={session.id}
                  className={`bg-white p-6 rounded-3xl border-2 transition-all flex flex-col justify-between gap-4 ${
                    isLive ? "border-red-300 shadow-md ring-2 ring-red-400/20" : "border-slate-200 shadow-xs"
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* Header buổi học */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-blue-700 bg-blue-100 px-3 py-1 rounded-lg">
                        LỚP: {session.class?.name}
                      </span>
                      {isLive && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-red-500 text-white animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                          ĐANG HỌC
                        </span>
                      )}
                    </div>

                    <h4 className="font-black text-slate-800 text-lg">{session.title}</h4>

                    {/* Giờ học */}
                    <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} className="text-blue-500" />
                        {start.format("DD/MM/YYYY")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={14} className="text-blue-500" />
                        {start.format("HH:mm")} - {end.format("HH:mm")}
                      </span>
                    </div>

                    {/* Ô Ghi chú nội dung buổi học (Click để sửa nhanh) */}
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
                        <span className="flex items-center gap-1">
                          <FileText size={12} /> Nội dung buổi học:
                        </span>
                        <button
                          onClick={() =>
                            setEditingNoteSession({
                              id: session.id,
                              note: session.lessonNote || "",
                            })
                          }
                          className="text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 size={11} /> {session.lessonNote ? "Sửa" : "Thêm ghi chú"}
                        </button>
                      </div>

                      {session.lessonNote ? (
                        <p className="text-xs text-slate-700 font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-200 line-clamp-2">
                          {session.lessonNote}
                        </p>
                      ) : (
                        <p
                          onClick={() =>
                            setEditingNoteSession({
                              id: session.id,
                              note: "",
                            })
                          }
                          className="text-xs text-slate-400 italic bg-slate-50 hover:bg-slate-100 p-2.5 rounded-xl border border-dashed border-slate-200 cursor-pointer transition-colors"
                        >
                          Chưa có nội dung ghi chú. Nhấp vào đây để thêm...
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Nút vào phòng học & kết thúc */}
                  <div className="pt-2 flex items-center gap-2">
                    {isLive ? (
                      <>
                        <button
                          onClick={() => openDailyClassroomSession(session)}
                          className="flex-1 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white animate-pulse shadow-sm cursor-pointer"
                        >
                          <Video size={16} /> Vào Lớp Dạy Ngay
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Bạn có chắc chắn muốn kết thúc buổi học "${session.title}" ngay bây giờ không?`)) {
                              finishSessionMutation.mutate(session.id);
                            }
                          }}
                          disabled={finishSessionMutation.isPending}
                          title="Kết thúc buổi học và đóng phòng"
                          className="px-3 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 shadow-sm cursor-pointer transition-colors shrink-0"
                        >
                          {finishSessionMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <LogOut size={15} />} Kết thúc
                        </button>
                      </>
                    ) : isPast ? (
                      <button
                        disabled
                        className="w-full py-2.5 rounded-xl font-bold text-xs bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed select-none opacity-80"
                      >
                        🔒 Buổi học đã kết thúc
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => openDailyClassroomSession(session)}
                          className="flex-1 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors cursor-pointer"
                        >
                          <Video size={16} /> Mở phòng học sớm
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Bạn có chắc chắn muốn kết thúc buổi học "${session.title}" này không?`)) {
                              finishSessionMutation.mutate(session.id);
                            }
                          }}
                          disabled={finishSessionMutation.isPending}
                          title="Kết thúc buổi học này"
                          className="px-3 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 shadow-sm cursor-pointer transition-colors shrink-0"
                        >
                          <LogOut size={15} /> Kết thúc
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400">
            <Calendar size={48} className="mx-auto mb-3 opacity-40" />
            <h4 className="font-bold text-base text-slate-600">Không có lịch dạy sắp tới</h4>
            <p className="text-xs text-slate-400 mt-1">
              Bạn có thể tạo buổi học mới từ mục Thời khóa biểu hoặc Quản lý lớp học.
            </p>
            <Link
              href="/teacher/schedule"
              className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors"
            >
              <Plus size={14} /> Đi tới Thời khóa biểu
            </Link>
          </div>
        )}
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        <Link
          href="/teacher/classes"
          className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-6 rounded-3xl shadow-sm hover:shadow-md hover:scale-[1.01] transition-all flex items-center justify-between"
        >
          <div>
            <h3 className="text-xl font-black">Quản lý Lớp học & Điểm danh</h3>
            <p className="text-emerald-100 text-xs font-medium mt-1">
              Theo dõi tiến độ, chuyên cần và thưởng Bánh Mì cho học sinh
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
            <Users size={24} />
          </div>
        </Link>

        <Link
          href="/teacher/assignments"
          className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-6 rounded-3xl shadow-sm hover:shadow-md hover:scale-[1.01] transition-all flex items-center justify-between"
        >
          <div>
            <h3 className="text-xl font-black">Chấm điểm & Bài tập về nhà</h3>
            <p className="text-blue-100 text-xs font-medium mt-1">
              Giao bài tập Tự luận / Trắc nghiệm và chấm bài cho học viên
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
            <PenTool size={24} />
          </div>
        </Link>
      </div>

      {/* Modal chỉnh sửa ghi chú buổi học */}
      {editingNoteSession && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <FileText className="text-blue-600" size={18} /> Ghi chú nội dung buổi học
              </h3>
              <button
                onClick={() => setEditingNoteSession(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                Nội dung / Giáo án trọng tâm buổi dạy:
              </label>
              <textarea
                value={editingNoteSession.note}
                onChange={(e) =>
                  setEditingNoteSession({
                    ...editingNoteSession,
                    note: e.target.value,
                  })
                }
                rows={4}
                placeholder="VD: Chữa đề TOEIC Test 3 phần Part 5 & 6, luyện phản xạ từ vựng..."
                className="w-full border-2 border-slate-200 rounded-2xl p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingNoteSession(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                onClick={() =>
                  updateNoteMutation.mutate({
                    sessionId: editingNoteSession.id,
                    note: editingNoteSession.note,
                  })
                }
                disabled={updateNoteMutation.isPending}
                className="px-5 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
              >
                {updateNoteMutation.isPending ? "Đang lưu..." : "Lưu ghi chú"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
