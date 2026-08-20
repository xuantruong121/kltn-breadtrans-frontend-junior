"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  PenTool,
  Plus,
  Loader2,
  Search,
  Edit2,
  Trash2,
  Eye,
  Clock,
  CheckCircle2,
  X,
  HelpCircle,
  Volume2,
  Layers,
  FileQuestion,
  AlertTriangle,
} from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import toast from "react-hot-toast";

const QUIZ_TYPES = [
  { value: "all", label: "Tất cả thể loại" },
  { value: "TOEIC", label: "TOEIC Trắc Nghiệm" },
  { value: "LISTENING_PRACTICE", label: "Luyện Nghe (Chép chính tả)" },
  { value: "BILINGUAL_READING", label: "Đọc Hiểu Song Ngữ" },
  { value: "WRITING_PICTURE", label: "Viết Mô Tả Tranh" },
  { value: "WRITING_EMAIL", label: "Viết Thư / Email" },
];

export default function AdminQuizzesPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  // Modal states
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<any | null>(null);
  const [deleteQuizTarget, setDeleteQuizTarget] = useState<any | null>(null);
  const [selectedQuizForQuestions, setSelectedQuizForQuestions] = useState<any | null>(null);

  // Form State for Quiz
  const [quizForm, setQuizForm] = useState({
    title: "",
    type: "TOEIC",
    timeLimit: 15,
    description: "",
  });

  // Query Quizzes List
  const { data: quizzes, isLoading } = useQuery<any[]>({
    queryKey: ["admin-quizzes"],
    queryFn: async () => {
      const res: any = await axiosClient.get("/quizzes");
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  // Query Detail for Selected Quiz Questions
  const {
    data: quizDetail,
    isLoading: isDetailLoading,
    refetch: refetchDetail,
  } = useQuery<any>({
    queryKey: ["admin-quiz-detail", selectedQuizForQuestions?.id],
    queryFn: async () => {
      if (!selectedQuizForQuestions?.id) return null;
      const res: any = await axiosClient.get(`/quizzes/${selectedQuizForQuestions.id}`);
      return res?.data || res;
    },
    enabled: !!selectedQuizForQuestions?.id,
  });

  // Save / Update Quiz Mutation
  const saveQuizMutation = useMutation({
    mutationFn: async (payload: typeof quizForm) => {
      if (editingQuiz) {
        return axiosClient.patch(`/quizzes/${editingQuiz.id}`, payload);
      }
      return axiosClient.post("/quizzes", payload);
    },
    onSuccess: () => {
      toast.success(editingQuiz ? "Đã cập nhật đề thi thành công!" : "Đã tạo đề thi mới thành công!");
      queryClient.invalidateQueries({ queryKey: ["admin-quizzes"] });
      setIsQuizModalOpen(false);
      setEditingQuiz(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Có lỗi xảy ra khi lưu đề thi");
    },
  });

  // Delete Quiz Mutation
  const deleteQuizMutation = useMutation({
    mutationFn: async (id: number) => {
      return axiosClient.delete(`/quizzes/${id}`);
    },
    onSuccess: () => {
      toast.success("Đã xóa đề thi thành công!");
      queryClient.invalidateQueries({ queryKey: ["admin-quizzes"] });
      setDeleteQuizTarget(null);
      if (selectedQuizForQuestions?.id === deleteQuizTarget?.id) {
        setSelectedQuizForQuestions(null);
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Không thể xóa đề thi");
    },
  });

  // Add Question Mutation
  const addQuestionMutation = useMutation({
    mutationFn: async ({ quizId, questionData }: { quizId: number; questionData: any }) => {
      return axiosClient.post(`/quizzes/${quizId}/questions`, questionData);
    },
    onSuccess: () => {
      toast.success("Đã thêm câu hỏi vào đề thi!");
      refetchDetail();
      queryClient.invalidateQueries({ queryKey: ["admin-quizzes"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Không thể thêm câu hỏi");
    },
  });

  // Delete Question Mutation
  const deleteQuestionMutation = useMutation({
    mutationFn: async (questionId: number) => {
      return axiosClient.delete(`/quizzes/questions/${questionId}`);
    },
    onSuccess: () => {
      toast.success("Đã xóa câu hỏi khỏi đề thi!");
      refetchDetail();
      queryClient.invalidateQueries({ queryKey: ["admin-quizzes"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Không thể xóa câu hỏi");
    },
  });

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingQuiz(null);
    setQuizForm({
      title: "",
      type: "TOEIC",
      timeLimit: 15,
      description: "",
    });
    setIsQuizModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (quiz: any) => {
    setEditingQuiz(quiz);
    setQuizForm({
      title: quiz.title || "",
      type: quiz.type || "TOEIC",
      timeLimit: quiz.timeLimit ?? 15,
      description: quiz.description || "",
    });
    setIsQuizModalOpen(true);
  };

  // Filter quizzes
  const filteredQuizzes = quizzes?.filter((q) => {
    const matchSearch =
      q.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(q.id).includes(searchTerm);
    const matchType = typeFilter === "all" || q.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="max-w-6xl mx-auto pb-20 space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-500 p-4 rounded-2xl text-white shadow-sm">
            <PenTool size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tight">Quản lý Đề thi</h1>
            <p className="text-slate-400 font-bold text-sm mt-1">
              Quản lý các đề thi TOEIC, Luyện Nghe, Đọc Song Ngữ và Đề kiểm tra
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black flex items-center gap-2 shadow-[0_6px_0_0_#047857] active:translate-y-1 active:shadow-none transition-all cursor-pointer"
        >
          <Plus size={20} /> Tạo đề thi mới
        </button>
      </div>

      {/* FILTER & SEARCH */}
      <div className="bg-white rounded-[2.5rem] border-4 border-slate-200 shadow-[0_8px_0_0_#e2e8f0] overflow-hidden p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm theo tên đề thi hoặc mã ID..."
              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-emerald-500 focus:bg-white transition-all text-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full md:w-auto px-5 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl font-black text-slate-700 outline-none focus:border-emerald-500 focus:bg-white text-sm cursor-pointer"
          >
            {QUIZ_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* QUIZZES TABLE */}
        {isLoading ? (
          <div className="flex justify-center p-16">
            <Loader2 className="animate-spin text-emerald-500" size={48} />
          </div>
        ) : filteredQuizzes && filteredQuizzes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-100 bg-slate-50 text-slate-400 text-xs uppercase font-black tracking-wider">
                  <th className="py-4 px-6 rounded-l-2xl">Mã Đề</th>
                  <th className="py-4 px-6">Tên Đề Thi</th>
                  <th className="py-4 px-6">Thể Loại</th>
                  <th className="py-4 px-6 text-center">Số Câu Hỏi</th>
                  <th className="py-4 px-6 text-center">Thời Gian Làm Bài</th>
                  <th className="py-4 px-6 text-right rounded-r-2xl">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold text-sm text-slate-700">
                {filteredQuizzes.map((quiz: any) => {
                  const questionCount = quiz._count?.questions || quiz.questions?.length || 0;
                  const timeLimitDisplay = quiz.timeLimit ? `${quiz.timeLimit} phút` : "15 phút";

                  return (
                    <tr key={quiz.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6 font-mono text-slate-400 font-black">#{quiz.id}</td>
                      <td className="py-4 px-6">
                        <div>
                          <span className="font-black text-slate-800 text-base block">{quiz.title}</span>
                          {quiz.description && (
                            <span className="text-xs font-medium text-slate-400 line-clamp-1">
                              {quiz.description}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1 rounded-xl text-xs font-black uppercase">
                          {quiz.type}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-xl font-black text-xs inline-flex items-center gap-1">
                          <Layers size={13} /> {questionCount} câu
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="inline-flex items-center gap-1.5 font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-xl text-xs">
                          <Clock size={14} className="text-amber-600" />
                          {timeLimitDisplay}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Nút Xem chi tiết danh sách câu hỏi */}
                          <button
                            onClick={() => setSelectedQuizForQuestions(quiz)}
                            title="Xem & Quản lý danh sách câu hỏi"
                            className="p-2.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all font-black text-xs flex items-center gap-1 border border-emerald-200 cursor-pointer"
                          >
                            <Eye size={16} /> Câu hỏi
                          </button>

                          {/* Nút Sửa đề thi */}
                          <button
                            onClick={() => handleOpenEdit(quiz)}
                            title="Chỉnh sửa thông tin đề thi"
                            className="p-2.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all border border-blue-200 cursor-pointer"
                          >
                            <Edit2 size={16} />
                          </button>

                          {/* Nút Xóa đề thi */}
                          <button
                            onClick={() => setDeleteQuizTarget(quiz)}
                            title="Xóa đề thi"
                            className="p-2.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all border border-rose-200 cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16 text-slate-400 font-bold border-2 border-dashed border-slate-200 rounded-3xl">
            <FileQuestion size={48} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-600 font-black text-lg">Không tìm thấy đề thi nào</p>
            <p className="text-sm text-slate-400 mt-1">Hãy thử tìm kiếm với từ khóa khác hoặc bấm nút "Tạo đề thi mới".</p>
          </div>
        )}
      </div>

      {/* ================= MODAL: TẠO / SỬA ĐỀ THI ================= */}
      <AnimatePresence>
        {isQuizModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-[2.5rem] border-4 border-slate-200 shadow-2xl p-6 md:p-8 max-w-lg w-full space-y-6"
            >
              <div className="flex items-center justify-between border-b-2 border-slate-100 pb-4">
                <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                  <PenTool className="text-emerald-500" />
                  {editingQuiz ? "Chỉnh Sửa Đề Thi" : "Tạo Đề Thi Mới"}
                </h3>
                <button
                  onClick={() => setIsQuizModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!quizForm.title.trim()) {
                    toast.error("Vui lòng nhập tên đề thi!");
                    return;
                  }
                  saveQuizMutation.mutate(quizForm);
                }}
                className="space-y-4 font-bold text-sm"
              >
                <div>
                  <label className="block text-slate-600 mb-1.5">Tên đề thi <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={quizForm.title}
                    onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                    placeholder="VD: Đề Luyện Thi TOEIC Part 5 - Bài 1"
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-600 mb-1.5">Thể loại đề thi</label>
                    <select
                      value={quizForm.type}
                      onChange={(e) => setQuizForm({ ...quizForm, type: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white text-slate-800 font-bold"
                    >
                      <option value="TOEIC">TOEIC Trắc Nghiệm</option>
                      <option value="LISTENING_PRACTICE">Luyện Nghe (Chép chính tả)</option>
                      <option value="BILINGUAL_READING">Đọc Hiểu Song Ngữ</option>
                      <option value="WRITING_PICTURE">Viết Mô Tả Tranh</option>
                      <option value="WRITING_EMAIL">Viết Thư / Email</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1.5">Thời gian làm bài (phút)</label>
                    <input
                      type="number"
                      min={1}
                      max={180}
                      value={quizForm.timeLimit}
                      onChange={(e) => setQuizForm({ ...quizForm, timeLimit: Number(e.target.value) })}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1.5">Mô tả đề thi (Tùy chọn)</label>
                  <textarea
                    rows={3}
                    value={quizForm.description}
                    onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })}
                    placeholder="Mô tả phạm vi kiến thức hoặc yêu cầu bài thi..."
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white text-slate-800"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t-2 border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsQuizModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl text-slate-500 font-black hover:bg-slate-100"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={saveQuizMutation.isPending}
                    className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black shadow-md flex items-center gap-2"
                  >
                    {saveQuizMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                    {editingQuiz ? "Cập Nhật" : "Tạo Đề Thi"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: XÁC NHẬN XÓA ĐỀ THI ================= */}
      <AnimatePresence>
        {deleteQuizTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] border-4 border-rose-200 shadow-2xl p-6 md:p-8 max-w-md w-full space-y-5 text-center"
            >
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mx-auto">
                <AlertTriangle size={32} />
              </div>

              <div>
                <h3 className="text-2xl font-black text-slate-800">Xóa Đề Thi?</h3>
                <p className="text-slate-500 text-sm font-bold mt-2">
                  Bạn có chắc chắn muốn xóa đề thi{" "}
                  <span className="text-rose-600 font-black">"{deleteQuizTarget.title}"</span> (#
                  {deleteQuizTarget.id})? Toàn bộ câu hỏi và lịch sử làm bài của học sinh liên quan sẽ bị xóa vĩnh viễn.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteQuizTarget(null)}
                  className="px-5 py-2.5 rounded-xl font-black text-slate-500 hover:bg-slate-100"
                >
                  Không, giữ lại
                </button>
                <button
                  type="button"
                  disabled={deleteQuizMutation.isPending}
                  onClick={() => deleteQuizMutation.mutate(deleteQuizTarget.id)}
                  className="px-6 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-black shadow-md flex items-center gap-2"
                >
                  {deleteQuizMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                  Đồng ý xóa
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL / DRAWER: QUẢN LÝ CÂU HỎI TRONG ĐỀ THI ================= */}
      <AnimatePresence>
        {selectedQuizForQuestions && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] border-4 border-slate-200 shadow-2xl p-6 md:p-8 max-w-3xl w-full max-h-[90vh] flex flex-col space-y-6"
            >
              {/* HEADER */}
              <div className="flex items-center justify-between border-b-2 border-slate-100 pb-4 shrink-0">
                <div>
                  <span className="text-xs font-black uppercase text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                    Đề thi #{selectedQuizForQuestions.id} - {selectedQuizForQuestions.type}
                  </span>
                  <h3 className="text-2xl font-black text-slate-800 mt-1">
                    {selectedQuizForQuestions.title}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedQuizForQuestions(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
                >
                  <X size={24} />
                </button>
              </div>

              {/* QUESTIONS LIST */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {isDetailLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="animate-spin text-emerald-500" size={40} />
                  </div>
                ) : quizDetail?.questions && quizDetail.questions.length > 0 ? (
                  quizDetail.questions.map((q: any, idx: number) => {
                    const content = q.content || {};
                    const options = content.options || [];
                    const correctAnswer = content.correct || content.correctAnswer || "";

                    return (
                      <div
                        key={q.id}
                        className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-5 space-y-3 relative group"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 bg-emerald-500 text-white rounded-lg flex items-center justify-center font-black text-xs shrink-0">
                              {idx + 1}
                            </span>
                            <h4 className="font-black text-slate-800 text-base">
                              {content.text || content.question || `Câu hỏi ${idx + 1}`}
                            </h4>
                          </div>

                          <button
                            onClick={() => deleteQuestionMutation.mutate(q.id)}
                            title="Xóa câu hỏi này"
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        {/* Audio if available */}
                        {content.audioUrl && (
                          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600">
                            <Volume2 size={16} className="text-emerald-500" />
                            <audio controls src={content.audioUrl} className="h-7 max-w-xs" />
                          </div>
                        )}

                        {/* Options A/B/C/D */}
                        {options.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-bold text-xs">
                            {options.map((opt: string, optIdx: number) => {
                              const isCorrect = opt === correctAnswer;
                              return (
                                <div
                                  key={optIdx}
                                  className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 ${
                                    isCorrect
                                      ? "bg-emerald-50 border-emerald-300 text-emerald-800 font-black shadow-2xs"
                                      : "bg-white border-slate-200 text-slate-600"
                                  }`}
                                >
                                  <span
                                    className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black ${
                                      isCorrect ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"
                                    }`}
                                  >
                                    {String.fromCharCode(65 + optIdx)}
                                  </span>
                                  <span>{opt}</span>
                                  {isCorrect && <CheckCircle2 size={14} className="ml-auto text-emerald-600" />}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Explanation / Translation */}
                        {(content.explanation || content.translate) && (
                          <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 font-medium">
                            <span className="font-black text-amber-800">💡 Giải thích: </span>
                            {content.explanation || content.translate}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-slate-400 font-bold border-2 border-dashed border-slate-200 rounded-2xl">
                    Đề thi này chưa có câu hỏi nào. Bạn có thể thêm câu hỏi nhanh ở form bên dưới.
                  </div>
                )}
              </div>

              {/* QUICK ADD QUESTION FORM */}
              <div className="border-t-2 border-slate-100 pt-4 shrink-0">
                <QuickAddQuestionForm
                  quizId={selectedQuizForQuestions.id}
                  onAdd={(data) =>
                    addQuestionMutation.mutate({
                      quizId: selectedQuizForQuestions.id,
                      questionData: data,
                    })
                  }
                  isLoading={addQuestionMutation.isPending}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Subcomponent: Quick Add Question Form
function QuickAddQuestionForm({
  quizId,
  onAdd,
  isLoading,
}: {
  quizId: number;
  onAdd: (data: any) => void;
  isLoading: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [optA, setOptA] = useState("");
  const [optB, setOptB] = useState("");
  const [optC, setOptC] = useState("");
  const [optD, setOptD] = useState("");
  const [correctKey, setCorrectKey] = useState<"A" | "B" | "C" | "D">("A");
  const [explanation, setExplanation] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim() || !optA.trim() || !optB.trim()) {
      toast.error("Vui lòng nhập nội dung câu hỏi và ít nhất 2 đáp án A, B!");
      return;
    }

    const options = [optA.trim(), optB.trim()];
    if (optC.trim()) options.push(optC.trim());
    if (optD.trim()) options.push(optD.trim());

    const optionMap: Record<string, string> = { A: optA.trim(), B: optB.trim(), C: optC.trim(), D: optD.trim() };
    const correctValue = optionMap[correctKey] || optA.trim();

    onAdd({
      type: "MULTIPLE_CHOICE",
      content: {
        text: questionText.trim(),
        options,
        correct: correctValue,
        explanation: explanation.trim(),
      },
    });

    // Reset form
    setQuestionText("");
    setOptA("");
    setOptB("");
    setOptC("");
    setOptD("");
    setExplanation("");
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full py-3 bg-slate-50 hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 font-black rounded-2xl border-2 border-dashed border-emerald-300 flex items-center justify-center gap-2 transition-all cursor-pointer text-sm"
      >
        <Plus size={18} /> Thêm câu hỏi trắc nghiệm mới vào đề
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-slate-50 border-2 border-emerald-200 rounded-2xl p-4 space-y-3 text-xs font-bold">
      <div className="flex items-center justify-between">
        <h4 className="font-black text-slate-800 text-sm text-emerald-700">Thêm Câu Hỏi Trắc Nghiệm Mới</h4>
        <button type="button" onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
          <X size={16} />
        </button>
      </div>

      <div>
        <label className="block text-slate-600 mb-1">Nội dung câu hỏi <span className="text-rose-500">*</span></label>
        <input
          type="text"
          required
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          placeholder="VD: The company _______ its annual revenue report yesterday."
          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-slate-800"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-slate-600 mb-1">Đáp án A <span className="text-rose-500">*</span></label>
          <input
            type="text"
            required
            value={optA}
            onChange={(e) => setOptA(e.target.value)}
            placeholder="Đáp án A"
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-slate-800"
          />
        </div>
        <div>
          <label className="block text-slate-600 mb-1">Đáp án B <span className="text-rose-500">*</span></label>
          <input
            type="text"
            required
            value={optB}
            onChange={(e) => setOptB(e.target.value)}
            placeholder="Đáp án B"
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-slate-800"
          />
        </div>
        <div>
          <label className="block text-slate-600 mb-1">Đáp án C</label>
          <input
            type="text"
            value={optC}
            onChange={(e) => setOptC(e.target.value)}
            placeholder="Đáp án C"
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-slate-800"
          />
        </div>
        <div>
          <label className="block text-slate-600 mb-1">Đáp án D</label>
          <input
            type="text"
            value={optD}
            onChange={(e) => setOptD(e.target.value)}
            placeholder="Đáp án D"
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-slate-800"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-slate-600 mb-1">Đáp án đúng <span className="text-rose-500">*</span></label>
          <select
            value={correctKey}
            onChange={(e) => setCorrectKey(e.target.value as any)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-slate-800 font-bold"
          >
            <option value="A">Đáp án A</option>
            <option value="B">Đáp án B</option>
            <option value="C">Đáp án C</option>
            <option value="D">Đáp án D</option>
          </select>
        </div>
        <div>
          <label className="block text-slate-600 mb-1">Giải thích đáp án</label>
          <input
            type="text"
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="Giải thích vì sao chọn đáp án này..."
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-slate-800"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="px-4 py-2 text-slate-500 hover:bg-slate-200 rounded-xl"
        >
          Đóng
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black flex items-center gap-1.5 shadow-sm"
        >
          {isLoading && <Loader2 size={14} className="animate-spin" />}
          Lưu câu hỏi
        </button>
      </div>
    </form>
  );
}
