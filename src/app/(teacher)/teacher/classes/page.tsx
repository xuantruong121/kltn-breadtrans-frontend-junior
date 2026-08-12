"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Video, FileText, Plus, X, Calendar, Clock, ChevronDown, ChevronUp } from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import dayjs from "dayjs";

export default function TeacherClassesPage() {
  const queryClient = useQueryClient();
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  
  const [newClassName, setNewClassName] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [expandedClassId, setExpandedClassId] = useState<number | null>(null);
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

  // Query courses for the dropdown
  const { data: courses } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      try {
        const res = await axiosClient.get("/courses");
        return Array.isArray(res) ? res : [];
      } catch (error) {
        console.error(error);
        return [];
      }
    }
  });

  const createClassMutation = useMutation({
    mutationFn: async () => {
      return axiosClient.post(`/courses/${selectedCourseId}/classes`, {
        name: newClassName,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-classes"] });
      setIsClassModalOpen(false);
      setNewClassName("");
      setSelectedCourseId("");
    },
  });

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
        <button 
          onClick={() => setIsClassModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Plus size={20} /> Tạo lớp học mới
        </button>
      </div>
      
      <div className="flex flex-col gap-6">
        {classes?.map((cls: any) => (
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
                <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-sm transition-colors flex items-center gap-2">
                  <FileText size={16} /> Quản lý bài tập
                </button>
                <button 
                  onClick={() => handleOpenSessionModal(cls.id)}
                  className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium rounded-lg text-sm transition-colors flex items-center gap-2"
                >
                  <Calendar size={16} /> Tạo buổi học
                </button>
                <button 
                  onClick={() => setExpandedClassId(expandedClassId === cls.id ? null : cls.id)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-lg text-sm transition-colors flex items-center gap-2"
                >
                  {expandedClassId === cls.id ? (
                    <><ChevronUp size={16} /> Thu gọn</>
                  ) : (
                    <><ChevronDown size={16} /> Danh sách buổi học ({cls.sessions?.length || 0})</>
                  )}
                </button>
              </div>
            </div>

            {/* Sessions List */}
            {expandedClassId === cls.id && (
              <div className="bg-slate-50 p-6">
                <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                  <Calendar size={18} className="text-blue-500" /> Các buổi học đã lên lịch
                </h4>
                
                {cls.sessions && cls.sessions.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {cls.sessions.map((session: any) => (
                      <div key={session.id} className="bg-white border border-slate-200 p-4 rounded-lg flex flex-col justify-between">
                        <div>
                          <h5 className="font-bold text-slate-800 mb-2">{session.title}</h5>
                          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                            <Calendar size={14} />
                            {dayjs(session.startTime).format("DD/MM/YYYY")}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                            <Clock size={14} />
                            {dayjs(session.startTime).format("HH:mm")} - {dayjs(session.endTime).format("HH:mm")}
                          </div>
                        </div>
                        <a 
                          href={session.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors flex justify-center items-center gap-2"
                        >
                          <Video size={16} /> Tham gia phòng học
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500 bg-white rounded-lg border border-dashed border-slate-300">
                    Chưa có buổi học nào được tạo cho lớp này.
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

      {/* Create Class Modal */}
      {isClassModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">Tạo lớp học mới</h2>
              <button onClick={() => setIsClassModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tên lớp học</label>
                <input 
                  type="text" 
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  placeholder="Vd: Lớp IELTS Tối 2-4-6"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Khoá học</label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                >
                  <option value="">-- Chọn khoá học --</option>
                  {courses?.map((course: any) => (
                    <option key={course.id} value={course.id}>{course.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setIsClassModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
              >
                Hủy
              </button>
              <button 
                onClick={() => createClassMutation.mutate()}
                disabled={!newClassName || !selectedCourseId || createClassMutation.isPending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
              >
                {createClassMutation.isPending ? "Đang tạo..." : "Xác nhận tạo"}
              </button>
            </div>
          </div>
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
                  onChange={(e) => setNewSession({...newSession, title: e.target.value})}
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
                    onChange={(e) => setNewSession({...newSession, startTime: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Thời gian kết thúc <span className="text-red-500">*</span></label>
                  <input 
                    type="datetime-local" 
                    value={newSession.endTime}
                    onChange={(e) => setNewSession({...newSession, endTime: e.target.value})}
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
                    onChange={(e) => setNewSession({...newSession, meetingLink: e.target.value})}
                    className="flex-1 border border-slate-300 rounded-lg px-4 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    placeholder="Dán link Meet/Zoom vào đây..."
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      const randomCode = Math.random().toString(36).substring(2, 12);
                      setNewSession({...newSession, meetingLink: `https://meet.jit.si/breadtrans-${randomCode}`});
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors whitespace-nowrap text-sm flex items-center gap-1"
                  >
                    <Video size={16} /> Tạo link tự động
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button 
                onClick={() => setIsSessionModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
              >
                Hủy
              </button>
              <button 
                onClick={() => createSessionMutation.mutate()}
                disabled={!newSession.title || !newSession.startTime || !newSession.endTime || createSessionMutation.isPending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
              >
                {createSessionMutation.isPending ? "Đang tạo..." : "Lưu buổi học"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
