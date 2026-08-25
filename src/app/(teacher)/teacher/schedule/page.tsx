"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Video,
  Users,
  FileText,
  Loader2,
  Info,
  Sunrise,
  Sun,
  Moon,
  LogOut,
} from "lucide-react";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import axiosClient from "@/lib/api/axiosClient";
import { openDailyClassroomSession } from "@/lib/utils/dailyClassroom";
import toast from "react-hot-toast";

dayjs.extend(isoWeek);

// Palette màu hiện đại cho từng lớp học
const CLASS_COLORS = [
  { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700", badge: "bg-indigo-600", light: "bg-indigo-100" },
  { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", badge: "bg-emerald-600", light: "bg-emerald-100" },
  { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", badge: "bg-amber-600", light: "bg-amber-100" },
  { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", badge: "bg-purple-600", light: "bg-purple-100" },
  { bg: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-700", badge: "bg-cyan-600", light: "bg-cyan-100" },
  { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", badge: "bg-rose-600", light: "bg-rose-100" },
];

// Định nghĩa 3 Ca học trong ngày (Sáng, Chiều, Tối)
const TIME_SLOTS = [
  {
    id: "morning",
    name: "Ca Sáng",
    timeRange: "07:00 - 12:00",
    icon: Sunrise,
    color: "text-amber-600",
    bgColor: "bg-amber-50/70",
    borderColor: "border-amber-200",
    defaultStartHour: 8,
    defaultEndHour: 10,
  },
  {
    id: "afternoon",
    name: "Ca Chiều",
    timeRange: "12:00 - 18:00",
    icon: Sun,
    color: "text-orange-600",
    bgColor: "bg-orange-50/70",
    borderColor: "border-orange-200",
    defaultStartHour: 14,
    defaultEndHour: 16,
  },
  {
    id: "evening",
    name: "Ca Tối",
    timeRange: "18:00 - 22:00",
    icon: Moon,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50/70",
    borderColor: "border-indigo-200",
    defaultStartHour: 19,
    defaultEndHour: 21,
  },
];

export default function TeacherSchedulePage() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form tạo buổi học mới
  const [createForm, setCreateForm] = useState({
    classId: "",
    title: "",
    startTime: "",
    endTime: "",
    lessonNote: "",
  });

  // Xác định ngày bắt đầu và kết thúc của tuần (Thứ 2 -> Chủ nhật)
  const startOfWeek = currentDate.startOf("isoWeek");
  const endOfWeek = currentDate.endOf("isoWeek");

  // Query dữ liệu lịch trong tuần
  const { data: scheduleData, isLoading } = useQuery({
    queryKey: ["teacher-schedule", startOfWeek.format("YYYY-MM-DD"), endOfWeek.format("YYYY-MM-DD")],
    queryFn: async () => {
      try {
        const res: any = await axiosClient.get(
          `/teacher/schedule?startDate=${startOfWeek.toISOString()}&endDate=${endOfWeek.toISOString()}`
        );
        return res?.data || res;
      } catch {
        return { summary: { totalSessions: 0, totalHours: 0, totalClasses: 0 }, sessions: [] };
      }
    },
  });

  // Query danh sách các lớp học của giáo viên
  const { data: teacherClasses } = useQuery({
    queryKey: ["teacher-classes"],
    queryFn: async () => {
      try {
        const res: any = await axiosClient.get("/courses/classes");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  // Mutation tạo buổi học mới
  const createSessionMutation = useMutation({
    mutationFn: async () => {
      if (!createForm.classId || !createForm.title || !createForm.startTime || !createForm.endTime) {
        throw new Error("Vui lòng điền đầy đủ thông tin bắt buộc!");
      }
      return axiosClient.post(`/teacher/classes/${createForm.classId}/sessions`, {
        title: createForm.title,
        startTime: new Date(createForm.startTime).toISOString(),
        endTime: new Date(createForm.endTime).toISOString(),
        lessonNote: createForm.lessonNote,
      });
    },
    onSuccess: () => {
      toast.success("Tạo buổi học mới thành công!");
      setIsCreateModalOpen(false);
      setCreateForm({ classId: "", title: "", startTime: "", endTime: "", lessonNote: "" });
      queryClient.invalidateQueries({ queryKey: ["teacher-schedule"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-dashboard-overview"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-dashboard-upcoming"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Không thể tạo buổi học!");
    },
  });

  // Finish Session Mutation
  const finishSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      return axiosClient.patch(`/classes/sessions/${sessionId}/finish`);
    },
    onSuccess: () => {
      toast.success("Đã kết thúc buổi học!");
      setSelectedSession(null);
      queryClient.invalidateQueries({ queryKey: ["teacher-schedule"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-classes"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-dashboard-overview"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-dashboard-upcoming"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Không thể kết thúc buổi học!");
    },
  });

  // 7 ngày trong tuần
  const daysOfWeek = Array.from({ length: 7 }).map((_, i) => startOfWeek.add(i, "day"));

  // Hàm xác định buổi học thuộc ca nào
  const getSlotForSession = (session: any) => {
    const hour = dayjs(session.startTime).hour();
    if (hour < 12) return "morning";
    if (hour < 18) return "afternoon";
    return "evening";
  };

  const getColorForClass = (classId: number) => {
    return CLASS_COLORS[classId % CLASS_COLORS.length];
  };

  // Mở form tạo nhanh buổi học tại 1 ô ca học trống
  const handleQuickAddSession = (day: dayjs.Dayjs, slot: typeof TIME_SLOTS[0]) => {
    const start = day.hour(slot.defaultStartHour).minute(0).second(0).format("YYYY-MM-DDTHH:mm");
    const end = day.hour(slot.defaultEndHour).minute(0).second(0).format("YYYY-MM-DDTHH:mm");
    setCreateForm({
      classId: teacherClasses?.[0]?.id ? String(teacherClasses[0].id) : "",
      title: "",
      startTime: start,
      endTime: end,
      lessonNote: "",
    });
    setIsCreateModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 flex items-center gap-2.5">
            <CalendarIcon className="text-blue-600" size={32} /> Thời Khóa Biểu Giảng Dạy
          </h1>
          <p className="text-slate-500 font-medium text-sm mt-1">
            Lưới lịch phân chia theo khung giờ Sáng / Chiều / Tối trực quan & khoa học
          </p>
        </div>

        <button
          onClick={() => {
            setCreateForm({ classId: "", title: "", startTime: "", endTime: "", lessonNote: "" });
            setIsCreateModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-sm shadow-md hover:shadow-lg transition-all cursor-pointer self-start md:self-auto"
        >
          <Plus size={18} /> Ghi buổi học mới
        </button>
      </div>

      {/* Thanh Thống Kê Tuần (ĐÃ LOẠI BỎ TOÀN BỘ PHẦN TIỀN & 1-1) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
            <CalendarIcon size={22} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Tổng buổi tuần này</span>
            <span className="text-2xl font-black text-slate-800">
              {scheduleData?.summary?.totalSessions || 0} <span className="text-sm font-bold text-slate-400">buổi</span>
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
            <Clock size={22} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Tổng thời lượng</span>
            <span className="text-2xl font-black text-slate-800">
              {scheduleData?.summary?.totalHours || "0.0"} <span className="text-sm font-bold text-slate-400">giờ dạy</span>
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
            <Users size={22} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Số lớp có lịch</span>
            <span className="text-2xl font-black text-slate-800">
              {scheduleData?.summary?.totalClasses || 0} <span className="text-sm font-bold text-slate-400">lớp học</span>
            </span>
          </div>
        </div>
      </div>

      {/* Điều Hướng Tuần */}
      <div className="bg-white p-4 rounded-2xl border-2 border-slate-200 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(currentDate.subtract(1, "week"))}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold transition-colors cursor-pointer"
            title="Tuần trước"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => setCurrentDate(dayjs())}
            className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-black text-xs transition-colors cursor-pointer"
          >
            Hôm nay
          </button>
          <button
            onClick={() => setCurrentDate(currentDate.add(1, "week"))}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold transition-colors cursor-pointer"
            title="Tuần sau"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="text-center font-black text-slate-800 text-base md:text-lg">
          {startOfWeek.format("DD/MM/YYYY")} — {endOfWeek.format("DD/MM/YYYY")}
        </div>

        <div className="text-xs font-bold text-slate-400">
          Tuần {currentDate.isoWeek()} / Năm {currentDate.year()}
        </div>
      </div>

      {/* LƯỚI MA TRẬN KHUNG GIỜ (SÁNG / CHIỀU / TỐI x 7 NGÀY TRONG TUẦN) */}
      {isLoading ? (
        <div className="bg-white rounded-3xl border-2 border-slate-200 p-16 text-center">
          <Loader2 className="animate-spin text-blue-600 mx-auto mb-2" size={36} />
          <p className="text-slate-500 font-bold text-sm">Đang tải lịch trình tuần...</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[1000px]">
              {/* Header Columns: Tiêu đề Thứ 2 -> Chủ Nhật */}
              <div className="grid grid-cols-8 border-b-2 border-slate-200 bg-slate-50 text-slate-700">
                <div className="p-3.5 text-center font-black text-xs uppercase tracking-wider text-slate-400 border-r-2 border-slate-200 flex items-center justify-center">
                  Ca học / Khung giờ
                </div>

                {daysOfWeek.map((day, idx) => {
                  const isToday = day.isSame(dayjs(), "day");
                  const dayNames = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"];

                  return (
                    <div
                      key={idx}
                      className={`p-3 text-center transition-colors ${
                        idx < 6 ? "border-r-2 border-slate-200" : ""
                      } ${isToday ? "bg-blue-600 text-white" : ""}`}
                    >
                      <span className="text-[11px] uppercase tracking-wider block font-bold">
                        {dayNames[idx]}
                      </span>
                      <span className={`text-base font-black ${isToday ? "text-white" : "text-slate-800"}`}>
                        {day.format("DD/MM")}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Rows: 3 Ca Học (Sáng, Chiều, Tối) */}
              <div className="divide-y-2 divide-slate-200">
                {TIME_SLOTS.map((slot) => {
                  const SlotIcon = slot.icon;

                  return (
                    <div key={slot.id} className="grid grid-cols-8 min-h-[160px]">
                      {/* Cột Bên Trái: Tên Ca & Khung Giờ */}
                      <div className={`p-4 border-r-2 border-slate-200 ${slot.bgColor} flex flex-col justify-center items-center text-center space-y-1.5`}>
                        <div className={`w-10 h-10 rounded-2xl bg-white shadow-2xs flex items-center justify-center ${slot.color}`}>
                          <SlotIcon size={20} />
                        </div>
                        <h4 className={`font-black text-xs uppercase tracking-wider ${slot.color}`}>
                          {slot.name}
                        </h4>
                        <span className="text-[11px] font-bold text-slate-500 bg-white/80 px-2 py-0.5 rounded-md border border-slate-200/60">
                          {slot.timeRange}
                        </span>
                      </div>

                      {/* 7 Ô Cho 7 Ngày */}
                      {daysOfWeek.map((day, dayIdx) => {
                        const dayStr = day.format("YYYY-MM-DD");
                        const isToday = day.isSame(dayjs(), "day");

                        // Lọc các session thuộc ngày và ca này
                        const sessionsInSlot = (scheduleData?.sessions || []).filter((s: any) => {
                          const matchDay = dayjs(s.startTime).format("YYYY-MM-DD") === dayStr;
                          const matchSlot = getSlotForSession(s) === slot.id;
                          return matchDay && matchSlot;
                        });

                        return (
                          <div
                            key={dayIdx}
                            className={`p-2 relative flex flex-col justify-between transition-colors ${
                              dayIdx < 6 ? "border-r-2 border-slate-200" : ""
                            } ${isToday ? "bg-blue-50/30" : "hover:bg-slate-50/60"}`}
                          >
                            {/* Danh sách bài học trong ca */}
                            {sessionsInSlot.length > 0 ? (
                              <div className="space-y-2">
                                {sessionsInSlot.map((session: any) => {
                                  const start = dayjs(session.startTime);
                                  const end = dayjs(session.endTime);
                                  const now = dayjs();
                                  const isLive = now.isAfter(start.subtract(15, "minute")) && now.isBefore(end);
                                  const isPast = now.isAfter(end);
                                  const theme = getColorForClass(session.classId);

                                  return (
                                    <div
                                      key={session.id}
                                      onClick={() => setSelectedSession(session)}
                                      className={`p-2.5 rounded-xl border-2 transition-all cursor-pointer hover:scale-[1.02] shadow-2xs ${
                                        isLive
                                          ? "bg-red-50 border-red-300 ring-2 ring-red-400/30 animate-pulse"
                                          : isPast
                                          ? "bg-slate-100/90 border-slate-200 opacity-75"
                                          : `${theme.bg} ${theme.border}`
                                      }`}
                                    >
                                      {/* Khung giờ & Trạng thái */}
                                      <div className="flex items-center justify-between text-[11px] font-black mb-1">
                                        <span className={isPast ? "text-slate-500" : isLive ? "text-red-700" : theme.text}>
                                          {start.format("HH:mm")} - {end.format("HH:mm")}
                                        </span>
                                        {isLive && (
                                          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                                        )}
                                      </div>

                                      {/* Tên lớp */}
                                      <div className="text-xs font-black text-slate-800 truncate mb-0.5">
                                        {session.class?.name}
                                      </div>

                                      {/* Tiêu đề buổi học */}
                                      <div className="text-[11px] text-slate-600 font-medium line-clamp-2">
                                        {session.title}
                                      </div>

                                      {/* Ghi chú nhanh */}
                                      {session.lessonNote && (
                                        <div className="mt-1.5 pt-1 border-t border-slate-200/60 text-[10px] text-slate-500 italic truncate flex items-center gap-1">
                                          <FileText size={10} /> {session.lessonNote}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              /* Ô Trống: Nút thêm nhanh khi hover */
                              <div
                                onClick={() => handleQuickAddSession(day, slot)}
                                className="group h-full min-h-[80px] rounded-xl border border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all flex flex-col items-center justify-center cursor-pointer p-2 text-center"
                                title={`Nhấp để thêm buổi học vào ${slot.name} (${day.format("DD/MM")})`}
                              >
                                <Plus
                                  size={16}
                                  className="text-slate-300 group-hover:text-blue-600 group-hover:scale-110 transition-all mb-1"
                                />
                                <span className="text-[10px] font-bold text-slate-300 group-hover:text-blue-600 transition-colors">
                                  + Thêm buổi
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chi Tiết Buổi Học (Click vào khối) */}
      {selectedSession && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-5">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-black px-2.5 py-1 rounded-md bg-blue-100 text-blue-700">
                  LỚP: {selectedSession.class?.name}
                </span>
                <h3 className="text-xl font-black text-slate-800 mt-2">{selectedSession.title}</h3>
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                className="text-slate-400 hover:text-slate-600 p-1 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm text-slate-600 font-medium">
              <div className="flex items-center gap-2">
                <Clock className="text-blue-600" size={16} />
                <span>
                  <strong>Thời gian:</strong> {dayjs(selectedSession.startTime).format("HH:mm")} - {dayjs(selectedSession.endTime).format("HH:mm, DD/MM/YYYY")}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Users className="text-blue-600" size={16} />
                <span>
                  <strong>Sĩ số lớp:</strong> {selectedSession.class?._count?.enrollments || 0} học viên
                </span>
              </div>

              {selectedSession.lessonNote && (
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1">
                  <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                    <FileText size={12} /> Ghi chú bài giảng:
                  </span>
                  <p className="text-xs text-slate-700">{selectedSession.lessonNote}</p>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center gap-2 justify-end">
              <button
                onClick={() => setSelectedSession(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Đóng
              </button>

              {dayjs().isAfter(dayjs(selectedSession.endTime)) || selectedSession.status === 'completed' ? (
                <button
                  disabled
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed select-none opacity-80"
                >
                  🔒 Buổi học đã kết thúc
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      if (window.confirm(`Bạn có chắc chắn muốn kết thúc buổi học "${selectedSession.title}" ngay bây giờ không?`)) {
                        finishSessionMutation.mutate(selectedSession.id);
                      }
                    }}
                    disabled={finishSessionMutation.isPending}
                    className="px-4 py-2 rounded-xl text-xs font-black bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    {finishSessionMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />} Kết thúc buổi học
                  </button>

                  <button
                    onClick={() => {
                      openDailyClassroomSession(selectedSession);
                      setSelectedSession(null);
                    }}
                    className="px-5 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Video size={14} /> Vào phòng học Daily
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Tạo Buổi Học Mới (+ Ghi buổi học mới) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Plus className="text-blue-600" size={20} /> Ghi buổi học mới
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              {/* Chọn lớp */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Lớp học phụ trách *</label>
                <select
                  value={createForm.classId}
                  onChange={(e) => setCreateForm({ ...createForm, classId: e.target.value })}
                  className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-sm outline-none focus:border-blue-500 font-medium"
                >
                  <option value="">-- Chọn lớp học --</option>
                  {(teacherClasses || []).map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.course?.title || "Khóa học"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Tiêu đề buổi học */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Tiêu đề buổi học *</label>
                <input
                  type="text"
                  placeholder="VD: Buổi 5: Luyện giải Part 7 TOEIC & Chiến thuật đọc nhanh"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-sm outline-none focus:border-blue-500 font-medium"
                />
              </div>

              {/* Thời gian bắt đầu / kết thúc */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Thời gian bắt đầu *</label>
                  <input
                    type="datetime-local"
                    value={createForm.startTime}
                    onChange={(e) => setCreateForm({ ...createForm, startTime: e.target.value })}
                    className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-blue-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Thời gian kết thúc *</label>
                  <input
                    type="datetime-local"
                    value={createForm.endTime}
                    onChange={(e) => setCreateForm({ ...createForm, endTime: e.target.value })}
                    className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-blue-500 font-medium"
                  />
                </div>
              </div>

              {/* Ghi chú nội dung */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Ghi chú giáo án / nội dung</label>
                <textarea
                  rows={3}
                  placeholder="Nội dung tóm tắt buổi dạy, tài liệu chuẩn bị..."
                  value={createForm.lessonNote}
                  onChange={(e) => setCreateForm({ ...createForm, lessonNote: e.target.value })}
                  className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-sm outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div className="bg-blue-50 p-3 rounded-xl text-blue-700 text-xs flex items-start gap-2">
                <Info size={16} className="shrink-0 mt-0.5" />
                <span>
                  Hệ thống sẽ tự động khởi tạo phòng học WebRTC Daily.co bảo mật kèm liên kết tham gia cho học sinh.
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Hủy
              </button>
              <button
                onClick={() => createSessionMutation.mutate()}
                disabled={createSessionMutation.isPending}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-xs"
              >
                {createSessionMutation.isPending ? "Đang tạo..." : "Tạo buổi học"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
