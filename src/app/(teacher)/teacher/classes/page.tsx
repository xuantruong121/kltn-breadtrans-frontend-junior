"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Video, FileText, Plus, X, Calendar, Clock, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import dayjs from "dayjs";
import Link from "next/link";
import DailyClassroomModal from "@/components/classroom/DailyClassroomModal";

export default function TeacherClassesPage() {
  const queryClient = useQueryClient();
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [activeExpandedTab, setActiveExpandedTab] = useState<{ classId: number; tab: 'sessions' | 'students' } | null>(null);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [activeVideoSession, setActiveVideoSession] = useState<any | null>(null);
  const [newSession, setNewSession] = useState({ title: "", startTime: "", endTime: "", meetingLink: "" });

  // Query classes assigned to the teacher
  const { data: classes, isLoading } = useQuery({
    queryKey: ["teacher-classes"],
    queryFn: async () => {
      try {
        const res = await axiosClient.get("/courses/classes");
        return Array.isArray(res) ? res : [];
      } catch (error) {
        console.error(error);
        return [];
      }
    }
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentClasses = classes?.slice(indexOfFirstItem, indexOfLastItem) || [];
  const totalPages = Math.ceil((classes?.length || 0) / itemsPerPage);



  const createSessionMutation = useMutation({
    mutationFn: async () => {
      return axiosClient.post(`/classes/${selectedClassId}/sessions`, newSession);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-classes"] });
      setIsSessionModalOpen(false);
      setNewSession({ title: "", startTime: "", endTime: "", meetingLink: "" });
    },
  });

  const finishSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      return axiosClient.patch(`/classes/sessions/${sessionId}/finish`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-classes"] });
      setActiveVideoSession(null);
    },
  });

  const handleOpenSessionModal = (classId: number) => {
    setSelectedClassId(classId);
    setIsSessionModalOpen(true);
  };

  if (isLoading) return (
    <div className="flex justify-center p-12">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Lớp bạn đang giảng dạy</h1>
          <p className="text-slate-500 text-sm mt-1">Quản lý lớp học, buổi học và bài tập</p>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {currentClasses.map((cls: any) => (
          <div key={cls.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-xl text-slate-800 mb-1">{cls.name}</h3>
                <p className="text-sm text-slate-500 mb-2">{cls.course?.title || "Không rõ khoá học"}</p>
                <div className="flex items-center gap-1 text-sm text-slate-600 bg-slate-50 px-2 py-1 rounded inline-flex">
                  <Users size={16} className="text-blue-500" />
                  {cls.studentCount || 0} học sinh
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link href="/teacher/assignments" className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-sm transition-colors flex items-center gap-2">
                  <FileText size={16} /> Quản lý bài tập
                </Link>
                <button
                  onClick={() => handleOpenSessionModal(cls.id)}
                  className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium rounded-lg text-sm transition-colors flex items-center gap-2"
                >
                  <Calendar size={16} /> Tạo buổi học
                </button>
                <button
                  onClick={() => setActiveExpandedTab(activeExpandedTab?.classId === cls.id && activeExpandedTab?.tab === 'sessions' ? null : { classId: cls.id, tab: 'sessions' })}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-lg text-sm transition-colors flex items-center gap-2"
                >
                  {activeExpandedTab?.classId === cls.id && activeExpandedTab?.tab === 'sessions' ? (
                    <><ChevronUp size={16} /> Thu gọn buổi học</>
                  ) : (
                    <><ChevronDown size={16} /> Danh sách buổi học ({cls.sessions?.length || 0})</>
                  )}
                </button>
                <button
                  onClick={() => setActiveExpandedTab(activeExpandedTab?.classId === cls.id && activeExpandedTab?.tab === 'students' ? null : { classId: cls.id, tab: 'students' })}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-lg text-sm transition-colors flex items-center gap-2"
                >
                  {activeExpandedTab?.classId === cls.id && activeExpandedTab?.tab === 'students' ? (
                    <><ChevronUp size={16} /> Thu gọn học viên</>
                  ) : (
                    <><ChevronDown size={16} /> Danh sách học viên ({cls.studentCount || 0})</>
                  )}
                </button>
              </div>
            </div>

            {/* Sessions List */}
            {activeExpandedTab?.classId === cls.id && activeExpandedTab?.tab === 'sessions' && (
              <div className="bg-slate-50 p-6 border-t border-slate-100">
                <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                  <Calendar size={18} className="text-blue-500" /> Các buổi học đã lên lịch
                </h4>

                {cls.sessions && cls.sessions.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {cls.sessions.map((session: any) => {
                      const now = dayjs();
                      const start = dayjs(session.startTime);
                      const end = dayjs(session.endTime);
                      const isLive = now.isAfter(start) && now.isBefore(end);
                      const isPast = now.isAfter(end);
                      const isUpcoming = now.isBefore(start);

                      return (
                        <div 
                          key={session.id} 
                          className={`border p-5 rounded-xl flex flex-col justify-between transition-all ${
                            isLive 
                              ? "bg-emerald-50/70 border-emerald-300 shadow-sm" 
                              : isPast 
                              ? "bg-slate-50 border-slate-200 opacity-75" 
                              : "bg-white border-slate-200"
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h5 className={`font-black text-base ${isPast ? "text-slate-600" : "text-slate-800"}`}>
                                {session.title}
                              </h5>
                              {isLive && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white shrink-0">
                                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                  Đang học
                                </span>
                              )}
                              {isUpcoming && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 shrink-0">
                                  Sắp diễn ra
                                </span>
                              )}
                              {isPast && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-500 shrink-0">
                                  Đã kết thúc
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-1">
                              <Calendar size={13} className={isLive ? "text-emerald-600" : isPast ? "text-slate-400" : "text-blue-500"} />
                              {start.format("DD/MM/YYYY")}
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-4">
                              <Clock size={13} className={isLive ? "text-emerald-600" : isPast ? "text-slate-400" : "text-blue-500"} />
                              {start.format("HH:mm")} - {end.format("HH:mm")}
                            </div>
                          </div>

                          {isLive ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => setActiveVideoSession(session)}
                                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs transition-all flex justify-center items-center gap-2 cursor-pointer shadow-sm"
                              >
                                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                                Vào Giảng Dạy
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Bạn có chắc chắn muốn kết thúc buổi học "${session.title}" sớm ngay bây giờ không?`)) {
                                    finishSessionMutation.mutate(session.id);
                                  }
                                }}
                                disabled={finishSessionMutation.isPending}
                                className="px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl text-xs border border-rose-200 transition-all cursor-pointer whitespace-nowrap"
                                title="Kết thúc sớm buổi học này"
                              >
                                🛑 Kết thúc sớm
                              </button>
                            </div>
                          ) : isUpcoming ? (
                            <button
                              onClick={() => setActiveVideoSession(session)}
                              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs transition-all flex justify-center items-center gap-2 cursor-pointer shadow-sm"
                            >
                              <Video size={14} /> Vào Phòng Chuẩn Bị
                            </button>
                          ) : (
                            <button
                              disabled
                              className="w-full py-2 bg-slate-100 text-slate-400 font-bold rounded-xl text-xs border border-slate-200 flex justify-center items-center gap-1.5 cursor-not-allowed select-none opacity-80"
                            >
                              🔒 Buổi học đã kết thúc
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500 bg-white rounded-lg border border-dashed border-slate-300">
                    Chưa có buổi học nào được tạo cho lớp này.
                  </div>
                )}
              </div>
            )}

            {/* Students List */}
            {activeExpandedTab?.classId === cls.id && activeExpandedTab?.tab === 'students' && (
              <div className="bg-slate-50 p-6 border-t border-slate-100">
                <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                  <Users size={18} className="text-blue-500" /> Danh sách học viên ({cls.studentCount || 0})
                </h4>
                
                {cls.enrollments && cls.enrollments.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {cls.enrollments.map((enrollment: any) => (
                      <div key={enrollment.id} className="bg-white border border-slate-200 p-4 rounded-lg flex items-center gap-4">
                        <img 
                          src={enrollment.user?.profile?.avatar || "/default-avatar.png"} 
                          alt="Student Avatar" 
                          className="w-12 h-12 rounded-full object-cover border-2 border-slate-100"
                        />
                        <div className="flex-1">
                          <h5 className="font-bold text-slate-800">{enrollment.user?.profile?.fullName || 'Học viên ẩn danh'}</h5>
                          <p className="text-xs text-slate-500">{enrollment.user?.email}</p>
                          <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5">
                            <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${enrollment.progress || 0}%` }}></div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-slate-500">Tiến độ</span>
                          <p className="font-bold text-green-600">{enrollment.progress || 0}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500 bg-white rounded-lg border border-dashed border-slate-300">
                    Chưa có học viên nào tham gia lớp này.
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {classes?.length === 0 && (
          <div className="py-12 text-center text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
            Bạn chưa được phân công hoặc tạo lớp học nào.
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center items-center gap-4">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-600 disabled:opacity-50 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-8 h-8 rounded-lg font-bold text-sm transition-all ${currentPage === i + 1
                  ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                  : "bg-white border border-slate-200 text-slate-500 hover:border-blue-600 hover:text-blue-600"
                  }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-600 disabled:opacity-50 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {/* Create Session Modal */}
      {isSessionModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-800">Tạo Buổi học mới</h2>
              <button onClick={() => setIsSessionModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg p-2">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tiêu đề buổi học <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={newSession.title}
                  onChange={(e) => setNewSession({ ...newSession, title: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  placeholder="Vd: Buổi 1 - Giới thiệu khoá học"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Thời gian bắt đầu <span className="text-red-500">*</span></label>
                  <input
                    type="datetime-local"
                    value={newSession.startTime}
                    onChange={(e) => setNewSession({ ...newSession, startTime: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Thời gian kết thúc <span className="text-red-500">*</span></label>
                  <input
                    type="datetime-local"
                    value={newSession.endTime}
                    onChange={(e) => setNewSession({ ...newSession, endTime: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Link phòng học (Meet/Zoom)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSession.meetingLink}
                    onChange={(e) => setNewSession({ ...newSession, meetingLink: e.target.value })}
                    className="flex-1 border border-slate-300 rounded-lg px-4 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    placeholder="Dán link Meet/Zoom vào đây..."
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const randomCode = Math.random().toString(36).substring(2, 8);
                      const cleanTitle = (newSession.title || `class-${selectedClassId || 'general'}`)
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")
                        .toLowerCase()
                        .replace(/[^a-z0-9]/g, "-")
                        .replace(/-+/g, "-")
                        .replace(/^-|-$/g, "")
                        .substring(0, 25);
                      const roomSlug = `${cleanTitle}-${randomCode}`;
                      try {
                        const res: any = await axiosClient.post("/classes/daily-room", { roomName: roomSlug });
                        setNewSession({ ...newSession, meetingLink: res?.url || `https://breadtrans-kltn.daily.co/${roomSlug}` });
                      } catch {
                        setNewSession({ ...newSession, meetingLink: `https://breadtrans-kltn.daily.co/${roomSlug}` });
                      }
                    }}
                    className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg transition-colors whitespace-nowrap text-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <Video size={16} /> Tạo link Daily.co
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setIsSessionModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={() => createSessionMutation.mutate()}
                disabled={!newSession.title || !newSession.startTime || !newSession.endTime || createSessionMutation.isPending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-bold transition-colors cursor-pointer"
              >
                {createSessionMutation.isPending ? "Đang tạo..." : "Lưu buổi học"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DAILY.CO EMBEDDED VIDEO CLASSROOM MODAL */}
      <DailyClassroomModal
        isOpen={!!activeVideoSession}
        onClose={() => setActiveVideoSession(null)}
        roomUrl={activeVideoSession?.meetingLink}
        sessionTitle={activeVideoSession?.title || "Phòng học trực tuyến"}
        sessionId={activeVideoSession?.id}
        isTeacher={true}
        onSessionFinished={() => {
          queryClient.invalidateQueries({ queryKey: ["teacher-classes"] });
        }}
      />
    </div>
  );
}
