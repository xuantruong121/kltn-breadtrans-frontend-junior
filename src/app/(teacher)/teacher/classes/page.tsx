"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Video,
  FileText,
  Plus,
  X,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Gift,
  CheckCircle2,
  XCircle,
  Loader2,
  Flame,
  LogOut,
  Edit,
  AlertTriangle,
  Lock,
  Eye,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axiosClient from "@/lib/api/axiosClient";
import dayjs from "dayjs";
import Link from "next/link";
import toast from "react-hot-toast";
import { openDailyClassroomSession } from "@/lib/utils/dailyClassroom";
import { getApiErrorMessage } from "@/lib/utils/apiError";

export default function TeacherClassesPage() {
  const queryClient = useQueryClient();
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [activeExpandedTab, setActiveExpandedTab] = useState<{
    classId: number;
    tab: "sessions" | "students";
  } | null>(null);

  // Modals
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);

  // Reward Modal State
  const [rewardTarget, setRewardTarget] = useState<{
    classId: number;
    studentId: number;
    studentName: string;
  } | null>(null);
  const [rewardAmount, setRewardAmount] = useState<number>(20);
  const [rewardReason, setRewardReason] = useState<string>("Phát biểu tích cực trong buổi học");

  // Attendance Modal State
  const [attendanceSession, setAttendanceSession] = useState<any | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<Array<{ userId: number; isPresent: boolean }>>([]);

  // Create Session Form
  const [newSession, setNewSession] = useState({
    title: "",
    startTime: "",
    endTime: "",
    meetingLink: "",
  });

  // Edit Class State & Mutation
  const [editingClass, setEditingClass] = useState<any | null>(null);
  const [initialClassForm, setInitialClassForm] = useState<any>(null);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const [editClassForm, setEditClassForm] = useState({
    name: "",
    capacity: 30,
    tuitionFeeVnd: 0,
    startDate: "",
    endDate: "",
    meetingLink: "",
  });

  const handleOpenEditClass = (cls: any) => {
    setEditingClass(cls);
    const initial = {
      name: cls.name || "",
      capacity: cls.capacity || 30,
      tuitionFeeVnd: cls.tuitionFeeVnd ?? 0,
      startDate: cls.startDate ? dayjs(cls.startDate).format("YYYY-MM-DD") : "",
      endDate: cls.endDate ? dayjs(cls.endDate).format("YYYY-MM-DD") : "",
      meetingLink: cls.meetingLink || "",
    };
    setEditClassForm(initial);
    setInitialClassForm(initial);
  };

  const handleCloseEditClass = () => {
    if (
      editingClass?.status !== "COMPLETED" &&
      editingClass?.status !== "CANCELLED" &&
      initialClassForm &&
      JSON.stringify(editClassForm) !== JSON.stringify(initialClassForm)
    ) {
      setShowUnsavedConfirm(true);
    } else {
      setEditingClass(null);
    }
  };

  const updateClassMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await axiosClient.patch(`/courses/classes/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-classes"] });
      setEditingClass(null);
      toast.success("Cập nhật lớp học thành công!");
    },
    onError: (err: any) => {
      toast.error(getApiErrorMessage(err, "Cập nhật lớp học thất bại."));
    },
  });

  // Query classes assigned to the teacher
  const { data: classes, isLoading } = useQuery({
    queryKey: ["teacher-classes"],
    queryFn: async () => {
      try {
        const res: any = await axiosClient.get("/courses/classes");
        return Array.isArray(res) ? res : [];
      } catch (error) {
        console.error(error);
        return [];
      }
    },
  });

  // Query students analytics for the active expanded class
  const activeClassIdForAnalytics =
    activeExpandedTab?.tab === "students" ? activeExpandedTab.classId : null;

  const { data: classAnalytics, isLoading: isAnalyticsLoading } = useQuery({
    queryKey: ["class-students-analytics", activeClassIdForAnalytics],
    queryFn: async () => {
      if (!activeClassIdForAnalytics) return null;
      try {
        const res: any = await axiosClient.get(
          `/classes/${activeClassIdForAnalytics}/students-analytics`
        );
        return res?.data || res;
      } catch {
        return null;
      }
    },
    enabled: !!activeClassIdForAnalytics,
  });

  // Query attendance for selected session
  const { data: sessionAttendanceData, isLoading: isAttendanceLoading } = useQuery({
    queryKey: ["session-attendance", attendanceSession?.id],
    queryFn: async () => {
      if (!attendanceSession?.id) return null;
      const res: any = await axiosClient.get(
        `/classes/sessions/${attendanceSession.id}/attendance`
      );
      const data = res?.data || res;
      if (data?.students) {
        setAttendanceRecords(
          data.students.map((s: any) => ({
            userId: s.userId,
            isPresent: s.isPresent ?? true,
          }))
        );
      }
      return data;
    },
    enabled: !!attendanceSession?.id,
  });

  // Create Session Mutation
  const createSessionMutation = useMutation({
    mutationFn: async () => {
      return axiosClient.post(`/classes/${selectedClassId}/sessions`, newSession);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-classes"] });
      setIsSessionModalOpen(false);
      setNewSession({ title: "", startTime: "", endTime: "", meetingLink: "" });
      toast.success("Tạo buổi học mới thành công!");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Lỗi khi tạo buổi học"),
  });

  // Finish Session Mutation
  const finishSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      return axiosClient.patch(`/classes/sessions/${sessionId}/finish`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-classes"] });
      toast.success("Đã kết thúc buổi học!");
    },
  });

  // Reward Student Mutation
  const rewardMutation = useMutation({
    mutationFn: async () => {
      if (!rewardTarget) return;
      return axiosClient.post(`/classes/${rewardTarget.classId}/reward-student`, {
        studentId: rewardTarget.studentId,
        amount: rewardAmount,
        reason: rewardReason,
      });
    },
    onSuccess: (res: any) => {
      const msg = res?.data?.message || res?.message || "Đã thưởng Bánh Mì cho học viên!";
      toast.success(msg);
      queryClient.invalidateQueries({ queryKey: ["class-students-analytics"] });
      setRewardTarget(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Lỗi khi thưởng Bánh Mì"),
  });

  // Save Attendance Mutation
  const saveAttendanceMutation = useMutation({
    mutationFn: async () => {
      if (!attendanceSession?.id) return;
      return axiosClient.post(`/classes/sessions/${attendanceSession.id}/attendance`, {
        records: attendanceRecords,
      });
    },
    onSuccess: (res: any) => {
      const msg = res?.data?.message || res?.message || "Đã lưu điểm danh thành công!";
      toast.success(msg);
      queryClient.invalidateQueries({ queryKey: ["teacher-classes"] });
      queryClient.invalidateQueries({ queryKey: ["session-attendance", attendanceSession?.id] });
      setAttendanceSession(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Lỗi khi lưu điểm danh"),
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentClasses = classes?.slice(indexOfFirstItem, indexOfLastItem) || [];
  const totalPages = Math.ceil((classes?.length || 0) / itemsPerPage);

  const handleOpenSessionModal = (classId: number) => {
    setSelectedClassId(classId);
    setIsSessionModalOpen(true);
  };

  const handleToggleAttendance = (userId: number) => {
    setAttendanceRecords((prev) =>
      prev.map((rec) => (rec.userId === userId ? { ...rec, isPresent: !rec.isPresent } : rec))
    );
  };

  const handleSetAllAttendance = (isPresent: boolean) => {
    setAttendanceRecords((prev) => prev.map((rec) => ({ ...rec, isPresent })));
  };

  const isDateInvalid =
    Boolean(editClassForm.startDate) &&
    Boolean(editClassForm.endDate) &&
    new Date(editClassForm.endDate) <= new Date(editClassForm.startDate);

  if (isLoading)
    return (
      <div className="flex justify-center p-20">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 pb-24">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Lớp Bạn Đang Giảng Dạy</h1>
          <p className="text-slate-400 font-bold text-sm mt-1">
            Quản lý phòng học trực tuyến, điểm danh chuyên cần và thưởng Bánh Mì cho học viên
          </p>
        </div>
      </div>

      {/* CLASSES LIST */}
      <div className="flex flex-col gap-6">
        {currentClasses.map((cls: any) => {
          const sessions = [...(cls.sessions || [])].sort(
            (a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
          );
          const now = dayjs();
          const upcomingSession = sessions.find((s: any) => dayjs(s.endTime).isAfter(now));

          return (
            <div
              key={cls.id}
              className="bg-white rounded-[2.5rem] border-4 border-slate-200 shadow-[0_8px_0_0_#e2e8f0] overflow-hidden"
            >
              {/* TOP HEADER */}
              <div className="p-6 md:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b-2 border-slate-100 bg-linear-to-r from-blue-50/30 to-indigo-50/20">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-blue-100 text-blue-800 text-xs font-black px-3 py-1 rounded-xl border border-blue-200">
                      {cls.course?.title || "Khóa Học Tiếng Anh"}
                    </span>
                    <span className="bg-emerald-50 text-emerald-700 text-xs font-black px-3 py-1 rounded-xl border border-emerald-200 flex items-center gap-1">
                      <Users size={13} /> {cls.studentCount || 0} Học viên
                    </span>
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-xl border ${
                        cls.status === "ONGOING"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : cls.status === "UPCOMING"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : cls.status === "COMPLETED"
                              ? "bg-slate-100 text-slate-600 border-slate-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}
                    >
                      {cls.status === "ONGOING"
                        ? "ONGOING - Đang diễn ra"
                        : cls.status === "UPCOMING"
                          ? "UPCOMING - Sắp diễn ra"
                          : cls.status === "COMPLETED"
                            ? "COMPLETED - Đã kết thúc"
                            : "CANCELLED - Đã hủy"}
                    </span>
                  </div>

                  <h3 className="font-black text-2xl text-slate-800 tracking-tight">{cls.name}</h3>

                  {upcomingSession ? (
                    <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl text-xs font-black text-amber-800">
                      <Clock size={14} className="text-amber-600" />
                      Buổi học tiếp theo: {upcomingSession.title} (
                      {dayjs(upcomingSession.startTime).format("HH:mm - DD/MM")})
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 font-bold">Chưa có lịch buổi học tiếp theo</p>
                  )}
                </div>

                {/* ACTION BUTTONS */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={() => handleOpenEditClass(cls)}
                    className="px-3.5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-2xl text-xs flex items-center gap-1.5 border border-slate-200 transition-all cursor-pointer shadow-2xs"
                    title={
                      cls.status === "COMPLETED" || cls.status === "CANCELLED"
                        ? "Xem chi tiết lớp học"
                        : "Chỉnh sửa thông tin lớp học"
                    }
                  >
                    {cls.status === "COMPLETED" || cls.status === "CANCELLED" ? (
                      <>
                        <Eye size={14} /> Chi tiết
                      </>
                    ) : (
                      <>
                        <Edit size={14} /> Sửa lớp
                      </>
                    )}
                  </button>

                  <Link
                    href="/teacher/assignments"
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-2xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <FileText size={15} /> Quản lý bài tập
                  </Link>

                  <button
                    onClick={() => handleOpenSessionModal(cls.id)}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl text-xs flex items-center gap-1.5 shadow-[0_4px_0_0_#1d4ed8] active:translate-y-1 active:shadow-none transition-all cursor-pointer"
                  >
                    <Plus size={15} /> Tạo buổi học
                  </button>

                  <button
                    onClick={() =>
                      setActiveExpandedTab(
                        activeExpandedTab?.classId === cls.id && activeExpandedTab?.tab === "sessions"
                          ? null
                          : { classId: cls.id, tab: "sessions" }
                      )
                    }
                    className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-1.5 border-2 transition-all cursor-pointer ${
                      activeExpandedTab?.classId === cls.id && activeExpandedTab?.tab === "sessions"
                        ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-2xs"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Calendar size={15} />
                    Buổi học ({sessions.length})
                    {activeExpandedTab?.classId === cls.id && activeExpandedTab?.tab === "sessions" ? (
                      <ChevronUp size={14} />
                    ) : (
                      <ChevronDown size={14} />
                    )}
                  </button>

                  <button
                    onClick={() =>
                      setActiveExpandedTab(
                        activeExpandedTab?.classId === cls.id && activeExpandedTab?.tab === "students"
                          ? null
                          : { classId: cls.id, tab: "students" }
                      )
                    }
                    className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-1.5 border-2 transition-all cursor-pointer ${
                      activeExpandedTab?.classId === cls.id && activeExpandedTab?.tab === "students"
                        ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-2xs"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Users size={15} />
                    Học viên & Tiến độ ({cls.studentCount || 0})
                    {activeExpandedTab?.classId === cls.id && activeExpandedTab?.tab === "students" ? (
                      <ChevronUp size={14} />
                    ) : (
                      <ChevronDown size={14} />
                    )}
                  </button>
                </div>
              </div>

              {/* ================= TAB: SESSIONS LIST ================= */}
              {activeExpandedTab?.classId === cls.id && activeExpandedTab?.tab === "sessions" && (
                <div className="bg-slate-50/80 p-6 md:p-8 border-t-2 border-slate-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-slate-800 text-lg flex items-center gap-2">
                      <Calendar size={20} className="text-blue-500" /> Các Buổi Học Đã Lên Lịch
                    </h4>
                    <button
                      onClick={() => handleOpenSessionModal(cls.id)}
                      className="text-xs font-black text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={14} /> Thêm buổi học mới
                    </button>
                  </div>

                  {sessions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {sessions.map((session: any) => {
                        const start = dayjs(session.startTime);
                        const end = dayjs(session.endTime);
                        const isLive = now.isAfter(start) && now.isBefore(end) && session.status !== "completed";
                        const isPast = now.isAfter(end) || session.status === "completed";

                        return (
                          <div
                            key={session.id}
                            className={`p-5 rounded-2xl border-2 flex flex-col justify-between gap-4 transition-all ${
                              isLive
                                ? "bg-red-50/60 border-red-200 shadow-xs"
                                : isPast
                                ? "bg-white border-slate-200 opacity-80"
                                : "bg-white border-slate-200 shadow-2xs"
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span
                                  className={`text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider ${
                                    isLive
                                      ? "bg-red-500 text-white animate-pulse"
                                      : isPast
                                      ? "bg-slate-100 text-slate-500"
                                      : "bg-blue-100 text-blue-700"
                                  }`}
                                >
                                  {isLive ? "● Đang diễn ra" : isPast ? "Đã kết thúc" : "Sắp tới"}
                                </span>
                                <span className="text-xs font-mono font-bold text-slate-400">
                                  {start.format("DD/MM/YYYY")}
                                </span>
                              </div>

                              <h5 className="font-black text-slate-800 text-base">{session.title}</h5>
                              <p className="text-xs text-slate-500 font-bold mt-1 flex items-center gap-1">
                                <Clock size={12} /> {start.format("HH:mm")} - {end.format("HH:mm")}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                              {isLive ? (
                                <>
                                  <button
                                    onClick={() => openDailyClassroomSession(session)}
                                    className="flex-1 py-2 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer bg-red-500 hover:bg-red-600 text-white animate-pulse"
                                  >
                                    <Video size={14} /> Vào lớp
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (window.confirm(`Bạn có chắc chắn muốn kết thúc buổi học "${session.title}" ngay bây giờ không? Trạng thái sẽ chuyển sang "Đã kết thúc" cho toàn bộ học sinh.`)) {
                                        finishSessionMutation.mutate(session.id);
                                      }
                                    }}
                                    disabled={finishSessionMutation.isPending}
                                    title="Kết thúc buổi học này ngay lập tức"
                                    className="px-2.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-black text-xs flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                                  >
                                    {finishSessionMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />} Kết thúc
                                  </button>
                                </>
                              ) : isPast ? (
                                <button
                                  disabled
                                  className="flex-1 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed select-none opacity-80"
                                >
                                  🔒 Buổi học đã kết thúc
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={() => openDailyClassroomSession(session)}
                                    className="flex-1 py-2 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer bg-blue-600 hover:bg-blue-700 text-white"
                                  >
                                    <Video size={14} /> Mở phòng sớm
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (window.confirm(`Bạn có chắc chắn muốn kết thúc buổi học "${session.title}" này không?`)) {
                                        finishSessionMutation.mutate(session.id);
                                      }
                                    }}
                                    disabled={finishSessionMutation.isPending}
                                    title="Kết thúc buổi học này"
                                    className="px-2.5 py-2 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 rounded-xl font-black text-xs flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                                  >
                                    <LogOut size={13} /> Kết thúc
                                  </button>
                                </>
                              )}

                              <button
                                onClick={() => setAttendanceSession(session)}
                                title="Điểm danh buổi học"
                                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl font-black text-xs flex items-center gap-1 cursor-pointer shrink-0"
                              >
                                <CheckCircle2 size={14} /> Điểm danh
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center p-8 bg-white rounded-2xl border border-slate-200 text-slate-400">
                      <Calendar size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-xs font-bold">Chưa có buổi học nào được tạo</p>
                    </div>
                  )}
                </div>
              )}

              {/* ================= TAB: STUDENTS & LEARNING ANALYTICS ================= */}
              {activeExpandedTab?.classId === cls.id && activeExpandedTab?.tab === "students" && (
                <div className="bg-slate-50/80 p-6 md:p-8 border-t-2 border-slate-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-slate-800 text-lg flex items-center gap-2">
                        <Users size={20} className="text-indigo-500" /> Danh Sách Học Viên & Tiến Độ Học Tập
                      </h4>
                      <p className="text-slate-400 text-xs font-bold mt-0.5">
                        Theo dõi bài tập, điểm trung bình và thưởng Bánh Mì cho học sinh
                      </p>
                    </div>
                  </div>

                  {isAnalyticsLoading ? (
                    <div className="flex justify-center p-12">
                      <Loader2 className="animate-spin text-indigo-600" size={32} />
                    </div>
                  ) : classAnalytics?.students && classAnalytics.students.length > 0 ? (
                    <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden shadow-2xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-400 text-xs uppercase font-black tracking-wider border-b-2 border-slate-100">
                              <th className="py-3.5 px-5">Học viên</th>
                              <th className="py-3.5 px-5">Bánh Mì / Streak</th>
                              <th className="py-3.5 px-5">Bài tập đã nộp</th>
                              <th className="py-3.5 px-5">Điểm TB</th>
                              <th className="py-3.5 px-5">Chuyên cần</th>
                              <th className="py-3.5 px-5 text-right">Khen thưởng</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-bold text-xs text-slate-700">
                            {classAnalytics.students.map((student: any) => {
                              const submissionRate =
                                student.totalAssignments > 0
                                  ? Math.round(
                                      (student.submittedAssignmentsCount / student.totalAssignments) * 100
                                    )
                                  : 0;

                              return (
                                <tr key={student.userId} className="hover:bg-slate-50/70 transition-colors">
                                  <td className="py-3.5 px-5">
                                    <div className="flex items-center gap-3">
                                      {student.avatar ? (
                                        <img
                                          src={student.avatar}
                                          alt=""
                                          className="w-9 h-9 rounded-xl object-cover border border-slate-200"
                                        />
                                      ) : (
                                        <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 font-black flex items-center justify-center shrink-0">
                                          {student.fullName?.[0]?.toUpperCase() || "S"}
                                        </div>
                                      )}
                                      <div>
                                        <p className="font-black text-slate-800 text-sm">{student.fullName}</p>
                                        <p className="text-[11px] text-slate-400 font-medium">{student.email}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-5">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg font-black">
                                        🍞 {student.totalBanhRan}
                                      </span>
                                      <span className="text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-lg font-black flex items-center gap-0.5">
                                        <Flame size={11} /> {student.streakCount}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-5">
                                    <div className="space-y-1">
                                      <span className="font-black text-slate-800">
                                        {student.submittedAssignmentsCount} / {student.totalAssignments} bài
                                      </span>
                                      <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full rounded-full ${
                                            submissionRate === 100
                                              ? "bg-emerald-500"
                                              : submissionRate > 50
                                              ? "bg-blue-500"
                                              : "bg-amber-500"
                                          }`}
                                          style={{ width: `${submissionRate}%` }}
                                        />
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-5">
                                    {student.averageGrade !== null ? (
                                      <span
                                        className={`px-2.5 py-1 rounded-lg font-black ${
                                          student.averageGrade >= 8
                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                            : student.averageGrade >= 5
                                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                                            : "bg-rose-50 text-rose-700 border border-rose-200"
                                        }`}
                                      >
                                        {student.averageGrade} / 10
                                      </span>
                                    ) : (
                                      <span className="text-slate-400">Chưa chấm</span>
                                    )}
                                  </td>
                                  <td className="py-3.5 px-5">
                                    <span className="text-slate-600 font-black">
                                      {student.attendedSessionsCount} / {student.totalSessions} buổi
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-5 text-right">
                                    <button
                                      onClick={() =>
                                        setRewardTarget({
                                          classId: cls.id,
                                          studentId: student.userId,
                                          studentName: student.fullName,
                                        })
                                      }
                                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-xs flex items-center gap-1 shadow-xs ml-auto cursor-pointer"
                                    >
                                      <Gift size={13} /> Thưởng 🍞
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-8 bg-white rounded-2xl border border-slate-200 text-slate-400">
                      <Users size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-xs font-bold">Chưa có học viên nào được ghi danh vào lớp</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-4">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-bold text-slate-600">
            Trang {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* ================= MODAL: THƯỞNG BÁNH MÌ CHO HỌC SINH ================= */}
      <AnimatePresence>
        {rewardTarget && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] border-4 border-amber-200 shadow-2xl p-6 md:p-8 max-w-md w-full space-y-5"
            >
              <div className="flex items-center justify-between border-b-2 border-slate-100 pb-3">
                <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                  <Gift size={24} className="text-amber-500" /> Thưởng Bánh Mì
                </h3>
                <button
                  onClick={() => setRewardTarget(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 text-xs font-bold">
                <div>
                  <label className="block text-slate-600 mb-1">Học viên nhận thưởng</label>
                  <input
                    type="text"
                    disabled
                    value={rewardTarget.studentName}
                    className="w-full bg-slate-100 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 font-black"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1.5">Số lượng Bánh Mì</label>
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {[10, 20, 50, 100].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setRewardAmount(amt)}
                        className={`py-2 rounded-xl font-black border-2 transition-all cursor-pointer ${
                          rewardAmount === amt
                            ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        +{amt} 🍞
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={rewardAmount}
                    onChange={(e) => setRewardAmount(Number(e.target.value))}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-amber-500 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1">Lý do khen thưởng</label>
                  <select
                    value={rewardReason}
                    onChange={(e) => setRewardReason(e.target.value)}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-amber-500 bg-white text-slate-800 font-bold mb-2"
                  >
                    <option value="Phát biểu tích cực trong buổi học">Phát biểu tích cực trong buổi học ⭐</option>
                    <option value="Hoàn thành bài tập xuất sắc">Hoàn thành bài tập xuất sắc 📝</option>
                    <option value="Tiến bộ vượt bậc tuần này">Tiến bộ vượt bậc tuần này 🚀</option>
                    <option value="Giúp đỡ bạn bè trong lớp">Giúp đỡ bạn bè trong lớp 🤝</option>
                    <option value="other">Lý do khác...</option>
                  </select>
                  {rewardReason === "other" && (
                    <input
                      type="text"
                      placeholder="Nhập lý do thưởng..."
                      onChange={(e) => setRewardReason(e.target.value)}
                      className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-amber-500 text-slate-800"
                    />
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t-2 border-slate-100">
                <button
                  type="button"
                  onClick={() => setRewardTarget(null)}
                  className="flex-1 py-2.5 rounded-xl font-black text-slate-500 hover:bg-slate-100 text-sm"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => rewardMutation.mutate()}
                  disabled={rewardMutation.isPending || rewardAmount <= 0}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black flex items-center justify-center gap-2 shadow-md text-sm disabled:opacity-50"
                >
                  {rewardMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                  Gửi Thưởng 🍞
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: ĐIỂM DANH BUỔI HỌC ================= */}
      <AnimatePresence>
        {attendanceSession && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] border-4 border-emerald-200 shadow-2xl p-6 md:p-8 max-w-lg w-full space-y-5"
            >
              <div className="flex items-center justify-between border-b-2 border-slate-100 pb-3">
                <div>
                  <span className="text-xs font-mono font-bold text-emerald-600">
                    {dayjs(attendanceSession.startTime).format("HH:mm - DD/MM/YYYY")}
                  </span>
                  <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2 mt-0.5">
                    <CheckCircle2 size={24} className="text-emerald-500" /> Điểm Danh Buổi Học
                  </h3>
                </div>
                <button
                  onClick={() => setAttendanceSession(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-500">
                  Học sinh có mặt sẽ tự động nhận <b>+5 🍞 chuyên cần</b>
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleSetAllAttendance(true)}
                    className="text-emerald-700 hover:underline cursor-pointer"
                  >
                    Tất cả có mặt
                  </button>
                  <span>|</span>
                  <button
                    type="button"
                    onClick={() => handleSetAllAttendance(false)}
                    className="text-slate-500 hover:underline cursor-pointer"
                  >
                    Tất cả vắng
                  </button>
                </div>
              </div>

              {isAttendanceLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="animate-spin text-emerald-600" size={32} />
                </div>
              ) : sessionAttendanceData?.students && sessionAttendanceData.students.length > 0 ? (
                <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                  {sessionAttendanceData.students.map((student: any) => {
                    const currentRec = attendanceRecords.find((r) => r.userId === student.userId);
                    const isPresent = currentRec?.isPresent ?? true;

                    return (
                      <div
                        key={student.userId}
                        className={`p-3 rounded-xl border-2 flex items-center justify-between transition-all ${
                          isPresent
                            ? "bg-emerald-50/60 border-emerald-200 text-emerald-900"
                            : "bg-slate-50 border-slate-200 text-slate-400"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${
                              isPresent ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
                            }`}
                          >
                            {student.fullName?.[0]?.toUpperCase() || "S"}
                          </div>
                          <div>
                            <p className="font-black text-sm">{student.fullName}</p>
                            <p className="text-[10px] opacity-75">{student.email}</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleAttendance(student.userId)}
                          className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1 cursor-pointer transition-all ${
                            isPresent
                              ? "bg-emerald-500 text-white shadow-xs"
                              : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                          }`}
                        >
                          {isPresent ? (
                            <>
                              <CheckCircle2 size={13} /> Có mặt (+5 🍞)
                            </>
                          ) : (
                            <>
                              <XCircle size={13} /> Vắng mặt
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-xs text-slate-400 py-6">Chưa có học sinh trong lớp</p>
              )}

              <div className="flex gap-3 pt-3 border-t-2 border-slate-100">
                <button
                  type="button"
                  onClick={() => setAttendanceSession(null)}
                  className="flex-1 py-2.5 rounded-xl font-black text-slate-500 hover:bg-slate-100 text-sm"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => saveAttendanceMutation.mutate()}
                  disabled={saveAttendanceMutation.isPending}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black flex items-center justify-center gap-2 shadow-md text-sm disabled:opacity-50"
                >
                  {saveAttendanceMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                  Lưu Điểm Danh
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: TẠO BUỔI HỌC ================= */}
      <AnimatePresence>
        {isSessionModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] border-4 border-blue-200 shadow-2xl p-6 md:p-8 max-w-md w-full space-y-5"
            >
              <div className="flex items-center justify-between border-b-2 border-slate-100 pb-3">
                <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                  <Calendar size={24} className="text-blue-500" /> Tạo Buổi Học Mới
                </h3>
                <button
                  onClick={() => setIsSessionModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 text-xs font-bold">
                <div>
                  <label className="block text-slate-600 mb-1">Tiêu đề buổi học <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    placeholder="VD: Buổi 1 - Giới thiệu format TOEIC"
                    value={newSession.title}
                    onChange={(e) => setNewSession({ ...newSession, title: e.target.value })}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1">Thời gian bắt đầu <span className="text-rose-500">*</span></label>
                  <input
                    type="datetime-local"
                    value={newSession.startTime}
                    onChange={(e) => setNewSession({ ...newSession, startTime: e.target.value })}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 text-slate-800 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1">Thời gian kết thúc</label>
                  <input
                    type="datetime-local"
                    value={newSession.endTime}
                    onChange={(e) => setNewSession({ ...newSession, endTime: e.target.value })}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 text-slate-800 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1">Link Daily.co (Tùy chọn, hệ thống tự sinh nếu để trống)</label>
                  <input
                    type="text"
                    placeholder="Để trống hệ thống sẽ tự sinh phòng Daily.co"
                    value={newSession.meetingLink}
                    onChange={(e) => setNewSession({ ...newSession, meetingLink: e.target.value })}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 text-slate-800"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t-2 border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSessionModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl font-black text-slate-500 hover:bg-slate-100 text-sm"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => createSessionMutation.mutate()}
                  disabled={createSessionMutation.isPending || !newSession.title || !newSession.startTime}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black flex items-center justify-center gap-2 shadow-md text-sm disabled:opacity-50"
                >
                  {createSessionMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                  Tạo Buổi Học
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* ================= MODAL: EDIT CLASS ================= */}
        {editingClass && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full border-2 border-slate-100 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingClass.status === "COMPLETED" || editingClass.status === "CANCELLED"
                      ? "Chi tiết lớp học"
                      : "Chỉnh sửa lớp học"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Mã lớp học: #{editingClass.id} • {editingClass.name}
                  </p>
                </div>
                <div className="flex items-center gap-3">
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
                    onClick={handleCloseEditClass}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {editingClass.status === "ONGOING" && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-900 flex items-start gap-2.5 mb-4">
                  <AlertTriangle size={16} className="shrink-0 text-green-700 mt-0.5" />
                  <div>
                    <strong>Lớp học đang diễn ra (ONGOING):</strong> Ngày bắt đầu đã được khóa lịch sử. Ngày kết thúc mới không được sớm hơn buổi học cuối cùng đã lên lịch.
                  </div>
                </div>
              )}

              {(editingClass.status === "COMPLETED" || editingClass.status === "CANCELLED") && (
                <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start gap-2.5 mb-4">
                  <Lock size={16} className="shrink-0 text-slate-500 mt-0.5" />
                  <div>
                    <strong>Lớp học ở chế độ chỉ đọc:</strong> Lớp đã {editingClass.status === "COMPLETED" ? "kết thúc" : "bị hủy"}. Toàn bộ thông tin không thể chỉnh sửa thêm.
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
                  const activeStudents =
                    editingClass.activeEnrollmentCount ?? editingClass.studentCount ?? 0;
                  if (
                    activeStudents > 0 &&
                    editClassForm.capacity < activeStudents
                  ) {
                    toast.error(
                      `Sức chứa không được nhỏ hơn số học viên đang học (${activeStudents}).`
                    );
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

                  const isOngoing = editingClass.status === "ONGOING";
                  const payload: any = {
                    name: editClassForm.name.trim(),
                    capacity: Number(editClassForm.capacity),
                    tuitionFeeVnd: Number(editClassForm.tuitionFeeVnd) || 0,
                    endDate: editClassForm.endDate ? new Date(editClassForm.endDate).toISOString() : undefined,
                    meetingLink: editClassForm.meetingLink.trim() || undefined,
                  };

                  // Only send startDate if not ONGOING
                  if (!isOngoing && editClassForm.startDate) {
                    payload.startDate = new Date(editClassForm.startDate).toISOString();
                  }

                  updateClassMutation.mutate({
                    id: editingClass.id,
                    data: payload,
                  });
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
                      value={editingClass.course?.title || "Khóa học"}
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
                      placeholder="Ví dụ: K01 - Tối 2-4-6"
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2 outline-none focus:border-blue-500 text-slate-800 font-semibold disabled:bg-slate-50 disabled:text-slate-500"
                    />
                  </div>
                </div>

                {/* Section 2: Giáo viên phụ trách */}
                <div className="space-y-2 pb-3 border-b border-slate-100">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    2. Giáo viên phụ trách
                  </h4>
                  <div>
                    <input
                      type="text"
                      disabled
                      readOnly
                      value={editingClass.teacher?.profile?.fullName || editingClass.teacher?.email || "Bạn (Giáo viên phụ trách)"}
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-600 font-medium cursor-not-allowed"
                    />
                    <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                      <Lock size={11} /> Chỉ Ban Quản Trị (Admin) mới có thể thay đổi giáo viên phụ trách lớp.
                    </p>
                  </div>
                </div>

                {/* Section 3: Sức chứa học viên */}
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
                        Học viên đang học: <strong>{editingClass.activeEnrollmentCount ?? editingClass.studentCount ?? 0}</strong>
                      </span>
                    </div>
                    <input
                      type="number"
                      min={editingClass.activeEnrollmentCount ?? editingClass.studentCount ?? 1}
                      required
                      disabled={editingClass.status === "COMPLETED" || editingClass.status === "CANCELLED"}
                      value={editClassForm.capacity}
                      onChange={(e) =>
                        setEditClassForm({ ...editClassForm, capacity: Number(e.target.value) })
                      }
                      className={`w-full border rounded-xl px-3.5 py-2 outline-none text-slate-800 font-semibold ${
                        editClassForm.capacity < (editingClass.activeEnrollmentCount ?? editingClass.studentCount ?? 0)
                          ? "border-rose-400 bg-rose-50/40 text-rose-700"
                          : "border-slate-200 focus:border-blue-500 disabled:bg-slate-50"
                      }`}
                    />
                    {editClassForm.capacity < (editingClass.activeEnrollmentCount ?? editingClass.studentCount ?? 0) && (
                      <p className="text-[11px] text-rose-500 font-semibold mt-1">
                        Sức chứa không thể nhỏ hơn {editingClass.activeEnrollmentCount ?? editingClass.studentCount ?? 0} học viên đang học.
                      </p>
                    )}
                  </div>
                </div>

                {/* Section 3.1: Học phí lớp học & Lock guard */}
                {(() => {
                  const isTuitionLocked =
                    editingClass.hasEnrollments === true ||
                    (editingClass.totalEnrollmentCount ?? 0) > 0 ||
                    (editingClass.studentCount ?? 0) > 0 ||
                    editingClass.status !== "UPCOMING";
                  return (
                    <div className="space-y-2 pb-3 border-b border-slate-100">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          4. Học phí (VNĐ)
                        </h4>
                        {isTuitionLocked && (
                          <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                            <Lock size={11} /> Đã khóa
                          </span>
                        )}
                      </div>
                      <div>
                        <input
                          type="number"
                          min={0}
                          step={10000}
                          disabled={
                            isTuitionLocked ||
                            editingClass.status === "COMPLETED" ||
                            editingClass.status === "CANCELLED"
                          }
                          value={editClassForm.tuitionFeeVnd}
                          onChange={(e) =>
                            setEditClassForm({
                              ...editClassForm,
                              tuitionFeeVnd: Math.max(0, Number(e.target.value)),
                            })
                          }
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 outline-none focus:border-blue-500 text-slate-800 font-semibold disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                        />
                        {isTuitionLocked ? (
                          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                            <Lock size={11} />
                            {editingClass.status !== "UPCOMING"
                              ? "Chỉ có thể sửa học phí khi lớp ở trạng thái UPCOMING."
                              : "Lớp học đã có lượt ghi danh, học phí đã được khóa để bảo vệ dữ liệu."}
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-400 mt-1">
                            Nhập 0 đ nếu là lớp học miễn phí. Học phí sẽ bị khóa sau khi có học viên ghi danh.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Section 4: Lịch học & Phòng học */}
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
                        onChange={(e) =>
                          setEditClassForm({ ...editClassForm, startDate: e.target.value })
                        }
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
                          isDateInvalid
                            ? "border-rose-400 bg-rose-50/40 text-rose-700"
                            : "border-slate-200 focus:border-blue-500"
                        }`}
                      />
                      {isDateInvalid ? (
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
                    <label className="block text-slate-700 font-bold mb-1">Link phòng học trực tuyến</label>
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
                    onClick={handleCloseEditClass}
                    className="flex-1 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    {editingClass.status === "COMPLETED" || editingClass.status === "CANCELLED" ? "Đóng" : "Hủy"}
                  </button>

                  {editingClass.status !== "COMPLETED" && editingClass.status !== "CANCELLED" && (
                    <button
                      type="submit"
                      disabled={
                        updateClassMutation.isPending ||
                        editClassForm.capacity < (editingClass.studentCount || 0) ||
                        isDateInvalid
                      }
                      className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {updateClassMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                      Lưu Thay Đổi
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Unsaved Changes Confirmation Modal */}
      {showUnsavedConfirm && (
        <div className="fixed inset-0 z-60 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-100">
            <h4 className="text-base font-bold text-slate-900 mb-2">Bạn có thay đổi chưa được lưu</h4>
            <p className="text-sm text-slate-600 mb-6">
              Các thay đổi của bạn sẽ bị mất nếu bạn rời đi mà không lưu.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowUnsavedConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Ở lại
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUnsavedConfirm(false);
                  setEditingClass(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors cursor-pointer"
              >
                Rời đi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
