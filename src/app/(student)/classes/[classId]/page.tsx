"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, PlayCircle, Video, Calendar, FileText, CheckCircle, BookOpen, Clock } from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import { use, useState } from "react";
import dayjs from "dayjs";
import DailyClassroomModal from "@/components/classroom/DailyClassroomModal";

export default function ClassDetailPage(props: { params: Promise<{ classId: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const classId = parseInt(params.classId);
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"lessons" | "sessions" | "assignments">("lessons");
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [activeVideoSession, setActiveVideoSession] = useState<any | null>(null);
  const [submissionText, setSubmissionText] = useState("");
  const [submissionLink, setSubmissionLink] = useState("");
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);

  const { data: cls, isLoading } = useQuery<any>({
    queryKey: ["class-detail", classId],
    queryFn: async () => {
      const res = await axiosClient.get(`/classes/${classId}`);
      return res as any;
    },
    enabled: !isNaN(classId),
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAssignment) return;
      return axiosClient.post(`/courses/assignments/${selectedAssignment.id}/submit`, {
        content: submissionText,
        fileUrl: submissionLink,
        quizAnswers: selectedAssignment.type === 'QUIZ' ? quizAnswers : undefined
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-detail", classId] });
      setSelectedAssignment(null);
      setSubmissionText("");
      setSubmissionLink("");
      setQuizAnswers([]);
      alert("Nộp bài thành công!");
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
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold mb-6 transition-colors"
      >
        <ArrowLeft size={20} /> Quay lại
      </button>

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
                          onClick={() => setActiveVideoSession(session)}
                          className="w-full btn-green-3d bg-emerald-500 hover:bg-emerald-600 text-white text-center py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md hover:brightness-105 transition-all"
                        >
                          <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                          Vào Lớp Ngay (Đang diễn ra)
                        </button>
                      ) : isUpcoming ? (
                        <button
                          onClick={() => setActiveVideoSession(session)}
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
                        
                        <div className="flex gap-4 items-center">
                          {asgn.dueDate && (
                            <span className="text-sm font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-lg">
                              Hạn: {dayjs(asgn.dueDate).format("DD/MM/YYYY HH:mm")}
                            </span>
                          )}
                          {isSubmitted && (
                            <span className="text-sm font-bold text-junior-green flex items-center gap-1">
                              <CheckCircle size={16} /> Đã nộp
                            </span>
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

      {/* Assignment Submit Modal */}
      {selectedAssignment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="p-6 border-b-2 border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-2xl font-bold text-slate-800">{selectedAssignment.title}</h2>
              <button onClick={() => setSelectedAssignment(null)} className="text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full p-2">✕</button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-sky-50 border border-sky-100 rounded-xl p-4 text-slate-700">
                <h4 className="font-bold text-sky-800 mb-2">Yêu cầu bài tập:</h4>
                <p className="whitespace-pre-wrap">{selectedAssignment.description}</p>
              </div>

              {selectedAssignment.type === 'QUIZ' ? (
                <div className="space-y-6">
                  <h3 className="font-bold text-xl text-slate-800">Trả lời câu hỏi trắc nghiệm</h3>
                  {selectedAssignment.quizData?.map((q: any, qIdx: number) => (
                    <div key={qIdx} className="bg-slate-50 p-5 rounded-2xl border-2 border-slate-100">
                      <p className="font-bold text-slate-800 text-lg mb-4">Câu {qIdx + 1}: {q.question}</p>
                      <div className="grid grid-cols-1 gap-3">
                        {q.options.map((opt: string, oIdx: number) => {
                          const isSelected = quizAnswers[qIdx] === oIdx;
                          return (
                            <button
                              key={oIdx}
                              disabled={selectedAssignment.submissions?.[0]} // disabled if already submitted
                              onClick={() => {
                                const newAns = [...quizAnswers];
                                newAns[qIdx] = oIdx;
                                setQuizAnswers(newAns);
                              }}
                              className={`text-left px-5 py-3 rounded-xl border-2 font-medium transition-all ${
                                isSelected 
                                  ? 'bg-blue-100 border-blue-400 text-blue-800' 
                                  : 'bg-white border-slate-200 text-slate-600 hover:border-blue-200'
                              }`}
                            >
                              <span className="font-bold mr-2">{String.fromCharCode(65 + oIdx)}.</span> {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-2">Nội dung bài làm</label>
                    <textarea 
                      value={submissionText}
                      onChange={(e) => setSubmissionText(e.target.value)}
                      disabled={selectedAssignment.submissions?.[0]}
                      className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-junior-blue min-h-[150px] font-medium text-slate-700 disabled:bg-slate-50"
                      placeholder="Viết câu trả lời của bạn ở đây..."
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-2">Link bài làm (Google Drive/Docs)</label>
                    <input 
                      type="url" 
                      value={submissionLink}
                      onChange={(e) => setSubmissionLink(e.target.value)}
                      disabled={selectedAssignment.submissions?.[0]}
                      className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-junior-blue font-medium text-slate-700 disabled:bg-slate-50"
                      placeholder="https://..."
                    />
                  </div>
                </div>
              )}

              {/* Feedback if graded */}
              {selectedAssignment.submissions?.[0]?.grade !== null && selectedAssignment.submissions?.[0]?.feedback && (
                <div className="bg-emerald-50 border-2 border-emerald-100 rounded-xl p-5 mt-6">
                  <h4 className="font-bold text-emerald-800 mb-2">Nhận xét từ giáo viên:</h4>
                  <p className="text-emerald-700 font-medium whitespace-pre-wrap">{selectedAssignment.submissions[0].feedback}</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t-2 border-slate-100 bg-slate-50 flex justify-end gap-3 sticky bottom-0">
              <button 
                onClick={() => setSelectedAssignment(null)}
                className="px-6 py-3 text-slate-600 hover:bg-slate-200 rounded-xl font-bold transition-colors"
              >
                Đóng
              </button>
              {!selectedAssignment.submissions?.[0] && (
                <button 
                  onClick={() => submitMutation.mutate()}
                  disabled={submitMutation.isPending || (selectedAssignment.type === 'QUIZ' && quizAnswers.some(a => a === undefined || a === null))}
                  className="btn-green-3d px-8 py-3 bg-junior-green disabled:opacity-50 text-white rounded-xl font-bold transition-colors text-lg"
                >
                  {submitMutation.isPending ? "Đang nộp..." : "Nộp bài"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DAILY.CO EMBEDDED VIDEO CLASSROOM MODAL */}
      <DailyClassroomModal
        isOpen={!!activeVideoSession}
        onClose={() => setActiveVideoSession(null)}
        roomUrl={activeVideoSession?.meetingLink}
        sessionTitle={activeVideoSession?.title || "Buổi học trực tuyến"}
        courseName={course?.title || cls?.name}
        sessionId={activeVideoSession?.id}
        isTeacher={false}
      />
    </div>
  );
}
