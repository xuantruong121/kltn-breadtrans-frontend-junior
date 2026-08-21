"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PenTool, Plus, BookOpen, Users, FileText } from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import dayjs from "dayjs";

export default function TeacherAssignmentsPage() {
  const queryClient = useQueryClient();
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmissionsModalOpen, setIsSubmissionsModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  
  const [newAssignment, setNewAssignment] = useState<any>({
    title: "",
    description: "",
    dueDate: "",
    type: "ESSAY",
    quizData: [],
  });

  const [quizQuestion, setQuizQuestion] = useState({ question: "", options: ["", "", "", ""], correctOptionIndex: 0 });

  // Query classes assigned to the teacher
  const { data: classes, isLoading: classesLoading } = useQuery({
    queryKey: ["teacher-classes"],
    queryFn: async () => {
      try {
        const res = await axiosClient.get("/courses/classes"); 
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    }
  });

  // Query assignments for the selected class
  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ["assignments", selectedClassId],
    queryFn: async () => {
      if (!selectedClassId) return [];
      try {
        const res = await axiosClient.get(`/courses/classes/${selectedClassId}/assignments`);
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
    enabled: !!selectedClassId
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async () => {
      return axiosClient.post(`/courses/classes/${selectedClassId}/assignments`, {
        ...newAssignment,
        dueDate: newAssignment.dueDate ? new Date(newAssignment.dueDate).toISOString() : undefined
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments", selectedClassId] });
      setIsCreateModalOpen(false);
      setNewAssignment({ title: "", description: "", dueDate: "", type: "ESSAY", quizData: [] });
    },
  });

  const gradeMutation = useMutation({
    mutationFn: async ({ submissionId, grade, feedback }: { submissionId: number, grade: number, feedback: string }) => {
      return axiosClient.put(`/courses/submissions/${submissionId}/grade`, { grade, feedback });
    },
    onSuccess: () => {
      // Reload assignment detail
      queryClient.invalidateQueries({ queryKey: ["assignment-detail"] });
      // Reload assignments list to update counts
      queryClient.invalidateQueries({ queryKey: ["assignments", selectedClassId] });
    }
  });

  const { data: assignmentDetail, isLoading: detailLoading } = useQuery({
    queryKey: ["assignment-detail", selectedAssignment?.id],
    queryFn: async () => {
      if (!selectedAssignment) return null;
      try {
        const res = await axiosClient.get(`/courses/assignments/${selectedAssignment.id}`);
        return res as any;
      } catch {
        return null;
      }
    },
    enabled: !!selectedAssignment
  });

  const handleAddQuizQuestion = () => {
    if (!quizQuestion.question) return;
    setNewAssignment((prev: any) => ({
      ...prev,
      quizData: [...prev.quizData, { ...quizQuestion }]
    }));
    setQuizQuestion({ question: "", options: ["", "", "", ""], correctOptionIndex: 0 });
  };

  const handleOptionChange = (index: number, val: string) => {
    const newOptions = [...quizQuestion.options];
    newOptions[index] = val;
    setQuizQuestion({ ...quizQuestion, options: newOptions });
  };

  if (classesLoading) return <div className="p-12 text-center text-slate-500">Đang tải...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quản lý Bài tập</h1>
          <p className="text-slate-500 text-sm mt-1">Giao bài tập tự luận hoặc trắc nghiệm, chấm điểm tự động</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Class Selection Sidebar */}
        <div className="col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <h2 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><BookOpen size={18} /> Chọn lớp học</h2>
          <div className="flex flex-col gap-2">
            {classes?.map((cls: any) => (
              <button
                key={cls.id}
                onClick={() => setSelectedClassId(cls.id)}
                className={`text-left px-4 py-3 rounded-lg transition-colors flex flex-col ${selectedClassId === cls.id ? 'bg-blue-50 border border-blue-200 text-blue-700' : 'hover:bg-slate-50 border border-transparent text-slate-700'}`}
              >
                <span className="font-medium truncate">{cls.name}</span>
                <span className="text-xs flex items-center gap-1 opacity-80"><Users size={12} /> {cls.studentCount || 0} học sinh</span>
              </button>
            ))}
            {classes?.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">Chưa có lớp học nào.</p>
            )}
          </div>
        </div>

        {/* Assignments List */}
        <div className="col-span-1 md:col-span-3">
          {!selectedClassId ? (
            <div className="h-full min-h-[300px] bg-slate-50 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-500">
              <PenTool size={48} className="text-slate-300 mb-4" />
              <p>Chọn một lớp học bên trái để xem bài tập</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-lg text-slate-800">Danh sách Bài tập</h3>
                <button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 text-sm transition-colors"
                >
                  <Plus size={16} /> Giao bài tập
                </button>
              </div>
              
              <div className="p-0">
                {assignmentsLoading ? (
                  <div className="p-8 text-center text-slate-500">Đang tải...</div>
                ) : (assignments || []).length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {(assignments || []).map((asgn: any) => (
                      <div key={asgn.id} className="p-6 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${asgn.type === 'QUIZ' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {asgn.type === 'QUIZ' ? 'Trắc nghiệm' : 'Tự luận'}
                            </span>
                            <h4 className="font-bold text-slate-800 text-lg">{asgn.title}</h4>
                          </div>
                          <p className="text-sm text-slate-500 mb-2 truncate max-w-lg">{asgn.description || "Không có mô tả"}</p>
                          <div className="flex gap-4 text-xs font-medium">
                            <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded">Đã nộp: {asgn.submissions?.length || 0}</span>
                            {asgn.dueDate && (
                              <span className="text-orange-600 bg-orange-50 px-2 py-1 rounded">Hạn: {dayjs(asgn.dueDate).format("DD/MM/YYYY HH:mm")}</span>
                            )}
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            setSelectedAssignment(asgn);
                            setIsSubmissionsModalOpen(true);
                          }}
                          className="px-4 py-2 border border-blue-200 hover:bg-blue-50 text-blue-600 font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                        >
                          Chấm điểm / Xem bài
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center text-slate-500">
                    Chưa có bài tập nào được giao cho lớp này.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Assignment Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-slate-800">Giao Bài tập Mới</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tiêu đề</label>
                <input 
                  type="text" 
                  value={newAssignment.title}
                  onChange={(e) => setNewAssignment({...newAssignment, title: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 outline-none focus:border-blue-500"
                  placeholder="Vd: Bài tập về nhà số 1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả chi tiết</label>
                <textarea 
                  value={newAssignment.description}
                  onChange={(e) => setNewAssignment({...newAssignment, description: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 outline-none focus:border-blue-500 min-h-[100px]"
                  placeholder="Nhập nội dung bài tập hoặc link Google Drive..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Loại bài tập</label>
                  <select 
                    value={newAssignment.type}
                    onChange={(e) => setNewAssignment({...newAssignment, type: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="ESSAY">Tự luận (Text/Link)</option>
                    <option value="QUIZ">Trắc nghiệm trực tuyến (Chấm tự động)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Hạn nộp (Không bắt buộc)</label>
                  <input 
                    type="datetime-local" 
                    value={newAssignment.dueDate}
                    onChange={(e) => setNewAssignment({...newAssignment, dueDate: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {newAssignment.type === 'QUIZ' && (
                <div className="mt-6 border-t border-slate-200 pt-6">
                  <h3 className="font-bold text-slate-800 mb-4">Soạn câu hỏi trắc nghiệm</h3>
                  
                  {/* List of added questions */}
                  {newAssignment.quizData.length > 0 && (
                    <div className="mb-6 space-y-4">
                      {newAssignment.quizData.map((q: any, idx: number) => (
                        <div key={idx} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                          <p className="font-medium text-slate-800 mb-2">Câu {idx + 1}: {q.question}</p>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {q.options.map((opt: string, oIdx: number) => (
                              <div key={oIdx} className={`px-3 py-1.5 rounded ${oIdx === q.correctOptionIndex ? 'bg-emerald-100 text-emerald-800 font-medium' : 'bg-white text-slate-600 border border-slate-200'}`}>
                                {String.fromCharCode(65 + oIdx)}. {opt}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add new question form */}
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <input 
                      type="text" 
                      placeholder="Nhập câu hỏi..." 
                      value={quizQuestion.question}
                      onChange={(e) => setQuizQuestion({...quizQuestion, question: e.target.value})}
                      className="w-full border border-slate-300 rounded-lg px-4 py-2 outline-none focus:border-blue-500 mb-3"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      {quizQuestion.options.map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input 
                            type="radio" 
                            name="correctAnswer" 
                            checked={quizQuestion.correctOptionIndex === idx}
                            onChange={() => setQuizQuestion({...quizQuestion, correctOptionIndex: idx})}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                          />
                          <input 
                            type="text" 
                            placeholder={`Đáp án ${String.fromCharCode(65 + idx)}`}
                            value={opt}
                            onChange={(e) => handleOptionChange(idx, e.target.value)}
                            className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 text-sm"
                          />
                        </div>
                      ))}
                    </div>
                    <button 
                      onClick={handleAddQuizQuestion}
                      disabled={!quizQuestion.question || quizQuestion.options.some(o => !o)}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                    >
                      + Thêm câu hỏi này
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 mt-auto sticky bottom-0">
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors"
              >
                Hủy
              </button>
              <button 
                onClick={() => createAssignmentMutation.mutate()}
                disabled={!newAssignment.title || createAssignmentMutation.isPending || (newAssignment.type === 'QUIZ' && newAssignment.quizData.length === 0)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
              >
                {createAssignmentMutation.isPending ? "Đang giao..." : "Giao bài"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submissions Modal */}
      {isSubmissionsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Chấm điểm: {selectedAssignment?.title}</h2>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${selectedAssignment?.type === 'QUIZ' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {selectedAssignment?.type === 'QUIZ' ? 'Bài Trắc nghiệm (Tự động chấm)' : 'Bài Tự luận'}
                </span>
              </div>
              <button onClick={() => setIsSubmissionsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="p-6 bg-slate-50 min-h-[300px]">
              {detailLoading ? (
                <div className="text-center py-12 text-slate-500">Đang tải danh sách nộp bài...</div>
              ) : assignmentDetail?.submissions?.length > 0 ? (
                <div className="space-y-4">
                  {(assignmentDetail?.submissions || []).map((sub: any) => {
                    const isLate = selectedAssignment?.dueDate && sub.submittedAt && dayjs(sub.submittedAt).isAfter(dayjs(selectedAssignment.dueDate));

                    return (
                    <div key={sub.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                      <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-3">
                          <img src={sub.user?.profile?.avatar || "/default-avatar.png"} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                          <div>
                            <h4 className="font-bold text-slate-800">{sub.user?.profile?.fullName || sub.user?.email}</h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-xs text-slate-500">Nộp lúc: {dayjs(sub.submittedAt).format("DD/MM/YYYY HH:mm")}</p>
                              {isLate ? (
                                <span className="text-[11px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">
                                  Nộp trễ hạn
                                </span>
                              ) : (
                                <span className="text-[11px] font-bold bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded">
                                  Đúng hạn ✓
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          {sub.grade !== null ? (
                            <span className="text-lg font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">
                              {sub.grade}/10
                            </span>
                          ) : (
                            <span className="text-sm font-medium text-orange-600 bg-orange-50 px-3 py-1 rounded-lg border border-orange-100">
                              Chưa chấm
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Nội dung bài làm</h5>
                        {selectedAssignment?.type === 'QUIZ' ? (
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm">
                            <div className="flex items-center gap-2 text-purple-700 font-bold mb-1">
                              <span>⚡ Đã được hệ thống chấm tự động 100%</span>
                            </div>
                            <p className="text-slate-600 text-xs">Học sinh nộp câu trả lời trực tiếp trên hệ thống.</p>
                            <p className="text-emerald-700 font-black text-base mt-2">Điểm đạt: {sub.grade}/10 điểm</p>
                          </div>
                        ) : (
                          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-slate-700 whitespace-pre-wrap text-sm">
                            {sub.content || "Không có nội dung text"}
                            {sub.fileUrl && (
                              <a href={sub.fileUrl} target="_blank" rel="noreferrer" className="block mt-2 text-blue-600 hover:underline">
                                📎 Mở file đính kèm
                              </a>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Grading Form (only for ESSAY or to override) */}
                      {selectedAssignment?.type !== 'QUIZ' && (
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mt-4">
                          <h5 className="text-sm font-bold text-blue-800 mb-3">Chấm điểm & Nhận xét</h5>
                          <form 
                            onSubmit={(e) => {
                              e.preventDefault();
                              const form = e.target as HTMLFormElement;
                              gradeMutation.mutate({
                                submissionId: sub.id,
                                grade: Number((form.grade as HTMLInputElement).value),
                                feedback: (form.feedback as HTMLTextAreaElement).value
                              });
                            }}
                            className="flex flex-col gap-3"
                          >
                            <div className="flex gap-4 items-center">
                              <label className="text-sm font-medium text-slate-700">Điểm (0-10):</label>
                              <input 
                                type="number" 
                                name="grade" 
                                step="0.5" 
                                min="0" max="10" 
                                defaultValue={sub.grade ?? ""} 
                                required
                                className="w-24 border border-slate-300 rounded px-3 py-1.5 outline-none focus:border-blue-500"
                              />
                            </div>
                            <textarea 
                              name="feedback" 
                              defaultValue={sub.feedback ?? ""}
                              placeholder="Nhập nhận xét cho học sinh..."
                              className="w-full border border-slate-300 rounded px-3 py-2 outline-none focus:border-blue-500 min-h-[60px] text-sm"
                            />
                            <button 
                              type="submit" 
                              disabled={gradeMutation.isPending}
                              className="self-end bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded font-medium text-sm transition-colors"
                            >
                              Lưu điểm
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  );
                })}
                </div>
              ) : (
                <div className="text-center py-16 text-slate-500">
                  <FileText size={48} className="mx-auto text-slate-300 mb-4" />
                  Chưa có học sinh nào nộp bài.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
