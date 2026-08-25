"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Loader2, 
  PlayCircle, 
  Video, 
  Calendar, 
  FileText, 
  CheckCircle, 
  CheckCircle2, 
  BookOpen, 
  Clock, 
  Link2, 
  ExternalLink, 
  Award, 
  MessageSquare, 
  Send, 
  X, 
  AlertCircle, 
  HelpCircle,
  FileCheck,
  Check,
  ClipboardList,
  UploadCloud,
  FileEdit,
  Trash2,
  FileUp,
  File
} from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import { BackButton, Button3D } from "@/components/ui";
import { use, useState } from "react";
import dayjs from "dayjs";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { openDailyClassroomSession } from "@/lib/utils/dailyClassroom";

export default function ClassDetailPage(props: { params: Promise<{ classId: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const classId = parseInt(params.classId);
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"lessons" | "sessions" | "assignments">("lessons");
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [submissionMode, setSubmissionMode] = useState<"text" | "file" | "link">("text");
  const [submissionText, setSubmissionText] = useState("");
  const [submissionLink, setSubmissionLink] = useState("");
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number; url: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);

  const { data: cls, isLoading } = useQuery<any>({
    queryKey: ["class-detail", classId],
    queryFn: async () => {
      const res = await axiosClient.get(`/classes/${classId}`);
      return res as any;
    },
    enabled: !isNaN(classId),
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      toast.error("Dung lượng file tối đa là 25MB!");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res: any = await axiosClient.post("/upload/file", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const fileUrl = res?.data?.url || res?.url;
      setUploadedFile({
        name: file.name,
        size: file.size,
        url: fileUrl,
      });
      setSubmissionLink(fileUrl);
      toast.success("Tải tệp lên thành công! 📎");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Tải tệp thất bại, vui lòng thử lại!");
    } finally {
      setIsUploading(false);
    }
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAssignment) return;
      if (selectedAssignment.type !== "QUIZ") {
        if (submissionMode === "text" && !submissionText.trim()) {
          throw new Error("Vui lòng nhập nội dung bài làm văn bản!");
        }
        if (submissionMode === "file" && !uploadedFile?.url && !submissionLink.trim()) {
          throw new Error("Vui lòng tải tệp bài làm lên trước khi nộp!");
        }
        if (submissionMode === "link" && !submissionLink.trim()) {
          throw new Error("Vui lòng dán liên kết bài làm của bạn!");
        }
      }

      const content = submissionMode === "text" ? submissionText : "";
      const fileUrl = submissionMode === "file" ? (uploadedFile?.url || submissionLink) : (submissionMode === "link" ? submissionLink : "");

      return axiosClient.post(`/courses/assignments/${selectedAssignment.id}/submit`, {
        content: content || undefined,
        fileUrl: fileUrl || undefined,
        quizAnswers: selectedAssignment.type === 'QUIZ' ? quizAnswers : undefined
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-detail", classId] });
      setSelectedAssignment(null);
      setSubmissionText("");
      setSubmissionLink("");
      setUploadedFile(null);
      setQuizAnswers([]);
      toast.success("Nộp bài tập thành công! 🎉");
    },
    onError: (err: any) => {
      toast.error(err?.message || err?.response?.data?.message || "Có lỗi xảy ra khi nộp bài!");
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <Loader2 className="animate-spin text-junior-green" size={48} />
      </div>
    );
  }

  if (!cls) {
    return (
      <div className="text-center p-12">
        <h2 className="text-2xl font-bold text-slate-800">Không tìm thấy lớp học</h2>
        <button onClick={() => router.back()} className="mt-4 text-junior-blue font-bold">Quay lại</button>
      </div>
    );
  }

  const course = cls.course;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Back button */}
      <div className="mb-6">
        <BackButton href="/classes" label="Quay lại danh sách lớp học" />
      </div>

      {/* Hero Section */}
      <div className="bg-white rounded-[2rem] border-4 border-slate-200 overflow-hidden shadow-sm mb-8">
        <div className="h-48 bg-junior-green/10 relative">
          {course?.thumbnailUrl ? (
            <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-junior-green to-teal-500" />
          )}
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl text-slate-700 font-bold flex items-center gap-2 shadow-sm">
            LỚP: {cls.name}
          </div>
        </div>
        <div className="p-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">{course?.title || "Khóa học"}</h1>
          <div className="flex flex-wrap items-center gap-4 text-slate-500 font-bold mb-6">
            <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-xl min-w-max">
              <img src={cls.teacher?.profile?.avatar || course?.teacher?.profile?.avatar || "/default-avatar.png"} alt="Teacher" className="w-6 h-6 rounded-full" /> 
              {cls.teacher?.profile?.fullName || cls.teacher?.email || course?.teacher?.profile?.fullName || course?.teacher?.email || "Chưa có giáo viên"}
            </div>
            {/* Note: The user requested only allowing joining from inside the class, so we keep the button here. */}
            {cls.meetingLink && cls.sessions?.length > 0 && (
              <a href={cls.meetingLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-blue-100 text-blue-600 hover:bg-blue-200 px-4 py-2 rounded-xl transition-colors">
                <Video size={18} /> Vào phòng học Online
              </a>
            )}
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200 mt-6 overflow-x-auto whitespace-nowrap hide-scrollbar">
            <button 
              onClick={() => setActiveTab("lessons")}
              className={`px-4 md:px-6 py-3 font-bold border-b-4 transition-colors flex items-center gap-2 ${activeTab === "lessons" ? "border-junior-blue text-junior-blue" : "border-transparent text-slate-500 hover:text-slate-700"}`}
            >
              <BookOpen size={18} /> Bài giảng
            </button>
            <button 
              onClick={() => setActiveTab("sessions")}
              className={`px-4 md:px-6 py-3 font-bold border-b-4 transition-colors flex items-center gap-2 ${activeTab === "sessions" ? "border-junior-orange text-junior-orange" : "border-transparent text-slate-500 hover:text-slate-700"}`}
            >
              <Calendar size={18} /> Buổi học trực tuyến
            </button>
            <button 
              onClick={() => setActiveTab("assignments")}
              className={`px-4 md:px-6 py-3 font-bold border-b-4 transition-colors flex items-center gap-2 ${activeTab === "assignments" ? "border-junior-green text-junior-green" : "border-transparent text-slate-500 hover:text-slate-700"}`}
            >
              <FileText size={18} /> Bài tập ({cls.assignments?.length || 0})
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-2xl p-6 border-4 border-slate-100 shadow-sm min-h-[400px]">
        
        {/* LESSONS TAB */}
        {activeTab === "lessons" && (
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-6">Chương trình học</h2>
            {course?.lessons && course.lessons.length > 0 ? (
              <div className="space-y-4">
                {course.lessons.map((lesson: any, i: number) => (
                  <div key={lesson.id} className="flex items-center gap-4 p-4 border-2 border-slate-100 rounded-xl hover:border-junior-blue/30 transition-colors">
                    <div className="w-12 h-12 bg-sky-100 text-junior-blue rounded-full flex items-center justify-center font-bold text-lg">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-800 text-lg">{lesson.title}</h4>
                      <p className="text-slate-500 text-sm">{lesson.content || "Bài giảng chi tiết"}</p>
                    </div>
                    {lesson.videoUrl && (
                      <a href={lesson.videoUrl} target="_blank" rel="noopener noreferrer" className="bg-junior-blue text-white p-2 rounded-lg hover:bg-blue-600">
                        <PlayCircle size={20} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-200 rounded-xl">
                Khóa học chưa có bài giảng nào.
              </div>
            )}
          </div>
        )}

        {/* SESSIONS TAB */}
        {activeTab === "sessions" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Lịch học trực tuyến</h2>
              <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-600 rounded-full">
                Tổng: {cls.sessions?.length || 0} buổi học
              </span>
            </div>

            {cls.sessions && cls.sessions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[...cls.sessions]
                  .sort(
                    (a: any, b: any) =>
                      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
                  )
                  .map((session: any) => {
                    const now = dayjs();
                  const start = dayjs(session.startTime);
                  const end = dayjs(session.endTime);
                  const isLive = now.isAfter(start) && now.isBefore(end);
                  const isPast = now.isAfter(end);
                  const isUpcoming = now.isBefore(start);

                  return (
                    <div 
                      key={session.id} 
                      className={`p-6 rounded-2xl border-4 transition-all flex flex-col justify-between ${
                        isLive 
                          ? "bg-emerald-50/60 border-emerald-300 shadow-md shadow-emerald-100" 
                          : isPast 
                          ? "bg-slate-50/80 border-slate-200 opacity-75" 
                          : "bg-white border-slate-200 shadow-xs"
                      }`}
                    >
                      <div>
                        {/* Session Status Header */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <h4 className={`font-black text-lg ${isPast ? "text-slate-600" : "text-slate-900"}`}>
                            {session.title}
                          </h4>

                          {isLive && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500 text-white shadow-xs animate-bounce shrink-0">
                              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                              ĐANG HỌC
                            </span>
                          )}
                          {isUpcoming && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-700 border border-blue-200 shrink-0">
                              Sắp diễn ra
                            </span>
                          )}
                          {isPast && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-600 shrink-0">
                              Đã kết thúc
                            </span>
                          )}
                        </div>

                        {/* Date & Time */}
                        <div className="space-y-1.5 mb-5 text-sm font-bold text-slate-500">
                          <div className="flex items-center gap-2">
                            <Calendar size={16} className={isLive ? "text-emerald-600" : isPast ? "text-slate-400" : "text-blue-500"} />
                            <span>{start.format("DD/MM/YYYY")}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock size={16} className={isLive ? "text-emerald-600" : isPast ? "text-slate-400" : "text-blue-500"} />
                            <span>{start.format("HH:mm")} - {end.format("HH:mm")}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      {isLive ? (
                        <button
                          onClick={() => openDailyClassroomSession(session)}
                          className="w-full btn-green-3d bg-emerald-500 hover:bg-emerald-600 text-white text-center py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md hover:brightness-105 transition-all"
                        >
                          <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                          Vào Lớp Ngay (Đang diễn ra)
                        </button>
                      ) : isUpcoming ? (
                        <button
                          onClick={() => openDailyClassroomSession(session)}
                          className="w-full btn-green-3d bg-junior-orange text-white text-center py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md hover:brightness-105 transition-all"
                        >
                          Vào Phòng Học Sớm
                        </button>
                      ) : (
                        <button
                          disabled
                          className="w-full bg-slate-100 text-slate-400 border-2 border-slate-200 text-center py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 cursor-not-allowed select-none opacity-80"
                        >
                          🔒 Buổi học đã kết thúc
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-200 rounded-xl">
                Lớp học chưa có lịch học nào.
              </div>
            )}
          </div>
        )}

        {/* ASSIGNMENTS TAB */}
        {activeTab === "assignments" && (
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-6">Bài tập & Đánh giá</h2>
            {cls.assignments && cls.assignments.length > 0 ? (
              <div className="space-y-4">
                {cls.assignments.map((asgn: any) => {
                  const submission = asgn.submissions?.[0]; // Current user's submission
                  const isSubmitted = !!submission;
                  const isGraded = submission?.grade !== null && submission?.grade !== undefined;
                  const isLate = asgn.dueDate && submission?.submittedAt && dayjs(submission.submittedAt).isAfter(dayjs(asgn.dueDate));

                  return (
                    <div key={asgn.id} className="p-6 border-2 border-slate-100 rounded-xl flex flex-col md:flex-row gap-6 justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-2 py-1 rounded-md text-xs font-bold ${asgn.type === 'QUIZ' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {asgn.type === 'QUIZ' ? 'Trắc nghiệm' : 'Tự luận'}
                          </span>
                          <h4 className="font-bold text-slate-800 text-xl">{asgn.title}</h4>
                        </div>
                        <p className="text-slate-600 mb-3">{asgn.description || "Không có mô tả chi tiết"}</p>
                        
                        <div className="flex flex-wrap gap-3 items-center">
                          {asgn.dueDate && (
                            <span className="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-lg border border-orange-100">
                              Hạn: {dayjs(asgn.dueDate).format("DD/MM/YYYY HH:mm")}
                            </span>
                          )}
                          {isSubmitted && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-junior-green bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 flex items-center gap-1">
                                <CheckCircle size={14} /> Đã nộp
                              </span>
                              {isLate ? (
                                <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md border border-amber-200">
                                  Nộp trễ hạn
                                </span>
                              ) : (
                                <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                                  Đúng hạn ✓
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        {isGraded && (
                          <div className="text-center mb-2">
                            <span className="block text-xs font-bold text-slate-400 mb-1">Điểm</span>
                            <span className="text-2xl font-black text-junior-blue">{submission.grade}/10</span>
                          </div>
                        )}
                        <button 
                          onClick={() => {
                            setSelectedAssignment(asgn);
                            setSubmissionText(submission?.content || "");
                            setSubmissionLink(submission?.fileUrl || "");
                            setQuizAnswers(submission?.quizAnswers || Array(asgn.quizData?.length || 0).fill(null));
                            if (submission?.fileUrl) {
                              if (submission.fileUrl.includes("r2.cloudflarestorage.com") || submission.fileUrl.includes("/uploads/")) {
                                setSubmissionMode("file");
                                setUploadedFile({
                                  name: submission.fileUrl.split("/").pop() || "Tệp bài làm đính kèm",
                                  size: 0,
                                  url: submission.fileUrl,
                                });
                              } else {
                                setSubmissionMode("link");
                                setUploadedFile(null);
                              }
                            } else {
                              setSubmissionMode("text");
                              setUploadedFile(null);
                            }
                          }}
                          className={`btn-green-3d font-bold px-6 py-2 rounded-xl text-white ${isSubmitted ? (isGraded ? 'bg-slate-400' : 'bg-junior-blue') : 'bg-junior-green'}`}
                        >
                          {isSubmitted ? (isGraded ? "Xem kết quả" : "Xem bài làm") : "Làm bài ngay"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-200 rounded-xl">
                Lớp học chưa có bài tập nào.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ================= REDESIGNED MULTI-MODE ASSIGNMENT MODAL ================= */}
      <AnimatePresence>
        {selectedAssignment && (() => {
          const submission = selectedAssignment.submissions?.[0];
          const isSubmitted = !!submission;
          const isGraded = submission?.grade !== null && submission?.grade !== undefined;
          const isLate = selectedAssignment.dueDate && submission?.submittedAt && dayjs(submission.submittedAt).isAfter(dayjs(selectedAssignment.dueDate));
          const isOverdue = selectedAssignment.dueDate && dayjs().isAfter(dayjs(selectedAssignment.dueDate)) && !isSubmitted;
          const wordCount = submissionText.trim() ? submissionText.trim().split(/\s+/).length : 0;
          const charCount = submissionText.length;

          const isSubmitDisabled = 
            submitMutation.isPending || 
            (selectedAssignment.type === 'QUIZ' && quizAnswers.some(a => a === undefined || a === null)) ||
            (selectedAssignment.type !== 'QUIZ' && (
              (submissionMode === 'text' && !submissionText.trim()) ||
              (submissionMode === 'file' && !uploadedFile?.url && !submissionLink.trim()) ||
              (submissionMode === 'link' && !submissionLink.trim())
            ));

          return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 sm:p-6 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-4 border-slate-200/80 flex flex-col overflow-hidden my-auto"
              >
                {/* Modal Header */}
                <div className="p-5 sm:p-6 border-b-2 border-slate-100 bg-slate-50/70 flex items-start justify-between gap-4 sticky top-0 z-20 backdrop-blur-sm">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        selectedAssignment.type === 'QUIZ' 
                          ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                          : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                      }`}>
                        {selectedAssignment.type === 'QUIZ' ? '🎯 Trắc nghiệm' : '📝 Tự luận / Viết bài'}
                      </span>

                      {selectedAssignment.dueDate && (
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border ${
                          isOverdue 
                            ? 'bg-rose-50 text-rose-700 border-rose-200' 
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          <Clock size={12} />
                          Hạn: {dayjs(selectedAssignment.dueDate).format("HH:mm DD/MM/YYYY")}
                        </span>
                      )}

                      {isGraded ? (
                        <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 size={12} /> Đã chấm điểm
                        </span>
                      ) : isSubmitted ? (
                        <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                          <Clock size={12} /> Đã nộp • Đang chờ chấm
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
                          Chưa nộp bài
                        </span>
                      )}
                    </div>

                    <h2 className="text-xl sm:text-2xl font-black text-slate-800 leading-snug">
                      {selectedAssignment.title}
                    </h2>
                  </div>

                  <button
                    onClick={() => setSelectedAssignment(null)}
                    className="w-10 h-10 rounded-2xl bg-white hover:bg-slate-100 border-2 border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-all shrink-0 cursor-pointer shadow-xs"
                    title="Đóng"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-5 sm:p-7 overflow-y-auto space-y-6">
                  {/* Yêu cầu bài tập (Mission Brief Card) - No AI signs */}
                  <div className="bg-sky-50/70 border-2 border-sky-200 rounded-2xl p-4 sm:p-5 shadow-xs">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0">
                        <ClipboardList size={16} />
                      </div>
                      <h4 className="font-black text-sky-900 text-sm uppercase tracking-wide">
                        Yêu cầu bài tập từ giáo viên
                      </h4>
                    </div>
                    <p className="text-slate-700 text-sm sm:text-base font-medium whitespace-pre-wrap leading-relaxed pl-9">
                      {selectedAssignment.description || "Hãy hoàn thành bài tập theo hướng dẫn của giáo viên."}
                    </p>
                  </div>

                  {/* Teacher Feedback & Grade Result (If Graded) */}
                  {isGraded && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-br from-amber-50 to-emerald-50 border-2 border-emerald-300 rounded-3xl p-5 sm:p-6 shadow-md"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-emerald-200/60">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shrink-0">
                            <Award size={28} />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                              Kết quả đánh giá
                            </span>
                            <h3 className="text-lg font-black text-slate-800">
                              Bài làm đã được giáo viên chấm điểm
                            </h3>
                          </div>
                        </div>

                        <div className="bg-white px-5 py-2.5 rounded-2xl border-2 border-emerald-300 text-center shadow-xs self-start sm:self-auto">
                          <span className="text-[10px] font-black uppercase text-slate-400 block">
                            Điểm số
                          </span>
                          <span className="text-3xl font-black text-emerald-600">
                            {submission.grade}
                            <span className="text-lg text-slate-400 font-bold">/10</span>
                          </span>
                        </div>
                      </div>

                      {submission.feedback && (
                        <div className="mt-4 pt-1">
                          <div className="flex items-center gap-2 mb-2 text-emerald-900 font-extrabold text-sm">
                            <MessageSquare size={16} className="text-emerald-600" />
                            Lời nhận xét từ Giáo viên:
                          </div>
                          <div className="bg-white/80 rounded-2xl p-4 border border-emerald-200 text-slate-700 font-medium text-sm leading-relaxed whitespace-pre-wrap">
                            "{submission.feedback}"
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Submission Section */}
                  {selectedAssignment.type === 'QUIZ' ? (
                    <div className="space-y-4">
                      <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                        <span>🎯</span> Trả lời câu hỏi trắc nghiệm
                      </h3>
                      {selectedAssignment.quizData?.map((q: any, qIdx: number) => (
                        <div key={qIdx} className="bg-slate-50 p-5 rounded-2xl border-2 border-slate-200 space-y-3">
                          <p className="font-black text-slate-800 text-base">
                            <span className="text-blue-600 mr-1.5">Câu {qIdx + 1}:</span> {q.question}
                          </p>
                          <div className="grid grid-cols-1 gap-2.5">
                            {q.options.map((opt: string, oIdx: number) => {
                              const isSelected = quizAnswers[qIdx] === oIdx;
                              return (
                                <button
                                  key={oIdx}
                                  type="button"
                                  disabled={isSubmitted}
                                  onClick={() => {
                                    const newAns = [...quizAnswers];
                                    newAns[qIdx] = oIdx;
                                    setQuizAnswers(newAns);
                                  }}
                                  className={`text-left px-4 py-3 rounded-xl border-2 font-bold text-sm transition-all flex items-center justify-between cursor-pointer ${
                                    isSelected 
                                      ? 'bg-blue-500 border-blue-600 text-white shadow-xs' 
                                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                                  } ${isSubmitted ? 'cursor-default' : ''}`}
                                >
                                  <div className="flex items-center gap-3">
                                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs ${
                                      isSelected ? 'bg-white text-blue-600' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                      {String.fromCharCode(65 + oIdx)}
                                    </span>
                                    <span>{opt}</span>
                                  </div>
                                  {isSelected && <Check size={16} className="text-white" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Mode Selection Tabs (Hidden when viewing already submitted unless student wants to switch view) */}
                      <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setSubmissionMode("text")}
                          className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            submissionMode === "text"
                              ? "bg-white text-blue-600 shadow-xs border border-slate-200/80"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          <FileEdit size={16} /> Viết trực tiếp
                        </button>

                        <button
                          type="button"
                          onClick={() => setSubmissionMode("file")}
                          className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            submissionMode === "file"
                              ? "bg-white text-blue-600 shadow-xs border border-slate-200/80"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          <UploadCloud size={16} /> Tải tệp lên
                        </button>

                        <button
                          type="button"
                          onClick={() => setSubmissionMode("link")}
                          className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            submissionMode === "link"
                              ? "bg-white text-blue-600 shadow-xs border border-slate-200/80"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          <Link2 size={16} /> Dán liên kết
                        </button>
                      </div>

                      {/* Mode 1: Text Editor */}
                      {submissionMode === "text" && (
                        <div className="space-y-2 pt-1">
                          <div className="flex items-center justify-between">
                            <label className="font-black text-slate-800 text-sm flex items-center gap-1.5">
                              <FileEdit size={16} className="text-blue-600" />
                              Nội dung bài làm
                            </label>
                            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                              wordCount > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'
                            }`}>
                              📝 {wordCount} từ • {charCount} ký tự
                            </span>
                          </div>

                          <textarea
                            value={submissionText}
                            onChange={(e) => setSubmissionText(e.target.value)}
                            disabled={isSubmitted}
                            rows={8}
                            className="w-full border-2 border-slate-200 rounded-2xl p-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all font-medium text-slate-800 text-sm sm:text-base disabled:bg-slate-100/70 disabled:text-slate-600 placeholder:text-slate-400 shadow-inner"
                            placeholder="Nhập nội dung bài văn, câu trả lời hoặc bài giải chi tiết của bạn tại đây..."
                          />
                        </div>
                      )}

                      {/* Mode 2: Direct File Upload */}
                      {submissionMode === "file" && (
                        <div className="space-y-2 pt-1">
                          <label className="font-black text-slate-800 text-sm flex items-center gap-1.5">
                            <UploadCloud size={16} className="text-blue-600" />
                            Tệp tài liệu bài làm (PDF, Word, Ảnh, Audio...)
                          </label>

                          {uploadedFile || (isSubmitted && submissionLink && (submissionLink.includes("r2.cloudflarestorage.com") || submissionLink.includes("/uploads/"))) ? (
                            <div className="bg-slate-50 border-2 border-blue-200 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                  <FileText size={24} />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-black text-slate-800 text-sm truncate">
                                    {uploadedFile?.name || submissionLink.split("/").pop() || "Tệp bài làm"}
                                  </p>
                                  {uploadedFile?.size ? (
                                    <p className="text-xs text-slate-400 font-bold">
                                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                  ) : (
                                    <p className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                                      <CheckCircle2 size={12} /> Đã sẵn sàng nộp
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <a
                                  href={uploadedFile?.url || submissionLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-3.5 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors"
                                >
                                  <ExternalLink size={14} /> Mở xem tệp
                                </a>
                                {!isSubmitted && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setUploadedFile(null);
                                      setSubmissionLink("");
                                    }}
                                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                                    title="Xóa và chọn tệp khác"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/40 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all group">
                              <input
                                type="file"
                                onChange={handleFileUpload}
                                disabled={isUploading || isSubmitted}
                                accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.mp3,.zip"
                                className="hidden"
                              />
                              {isUploading ? (
                                <>
                                  <Loader2 size={36} className="text-blue-600 animate-spin" />
                                  <p className="text-sm font-bold text-blue-700">Đang tải tệp lên hệ thống...</p>
                                </>
                              ) : (
                                <>
                                  <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 group-hover:border-blue-300 flex items-center justify-center text-slate-400 group-hover:text-blue-600 shadow-sm transition-all">
                                    <UploadCloud size={28} />
                                  </div>
                                  <div className="text-center space-y-1">
                                    <p className="font-bold text-slate-700 text-sm">
                                      <span className="text-blue-600 hover:underline">Bấm vào đây để chọn tệp</span> hoặc kéo thả vào khung này
                                    </p>
                                    <p className="text-xs text-slate-400 font-medium">
                                      Hỗ trợ PDF, Word (.docx), Ảnh (.png, .jpg), Âm thanh (.mp3) tối đa 25MB
                                    </p>
                                  </div>
                                </>
                              )}
                            </label>
                          )}
                        </div>
                      )}

                      {/* Mode 3: External Link */}
                      {submissionMode === "link" && (
                        <div className="space-y-2 pt-1">
                          <label className="font-black text-slate-800 text-sm flex items-center gap-1.5">
                            <Link2 size={16} className="text-blue-600" />
                            Dán liên kết tài liệu (Google Docs / Google Drive / Canva)
                          </label>

                          <div className="relative flex items-center">
                            <input
                              type="url"
                              value={submissionLink}
                              onChange={(e) => setSubmissionLink(e.target.value)}
                              disabled={isSubmitted}
                              className="w-full border-2 border-slate-200 rounded-2xl pl-4 pr-24 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all font-medium text-slate-800 text-sm disabled:bg-slate-100/70 disabled:text-slate-600 placeholder:text-slate-400"
                              placeholder="https://docs.google.com/document/d/..."
                            />
                            {submissionLink && (
                              <a
                                href={submissionLink}
                                target="_blank"
                                rel="noreferrer"
                                className="absolute right-2 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs flex items-center gap-1 transition-colors"
                              >
                                <ExternalLink size={13} /> Mở xem
                              </a>
                            )}
                          </div>

                          <p className="text-xs text-slate-400 font-medium flex items-center gap-1 pl-1">
                            <HelpCircle size={13} className="text-slate-400 shrink-0" />
                            <span>Mẹo: Hãy bật quyền <strong>"Bất kỳ ai có liên kết đều có thể xem"</strong> trên Google Drive để giáo viên đọc được bài nhé.</span>
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Submission Status Message (If submitted and pending) */}
                  {isSubmitted && !isGraded && (
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 flex items-center gap-3 text-blue-800 font-bold text-sm">
                      <FileCheck size={24} className="text-blue-600 shrink-0" />
                      <div>
                        <p>Bài tập đã được gửi thành công!</p>
                        <p className="text-xs text-blue-600 font-medium">
                          Nộp vào lúc: {submission.submittedAt ? dayjs(submission.submittedAt).format("HH:mm DD/MM/YYYY") : "Vừa xong"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="p-4 sm:p-6 border-t-2 border-slate-100 bg-slate-50 flex items-center justify-end gap-3 sticky bottom-0 z-20">
                  <button
                    onClick={() => setSelectedAssignment(null)}
                    className="px-6 py-2.5 rounded-xl font-black text-sm text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Đóng
                  </button>

                  {!isSubmitted && (
                    <Button3D
                      variant="green"
                      size="md"
                      disabled={isSubmitDisabled}
                      onClick={() => submitMutation.mutate()}
                      className="font-black text-sm sm:text-base px-8 py-2.5 flex items-center gap-2 shadow-md cursor-pointer"
                    >
                      {submitMutation.isPending ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          <span>Đang nộp bài...</span>
                        </>
                      ) : (
                        <>
                          <Send size={18} />
                          <span>Nộp bài ngay</span>
                        </>
                      )}
                    </Button3D>
                  )}
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
