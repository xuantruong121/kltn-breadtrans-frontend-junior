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
  Volume2,
  Layers,
  FileQuestion,
  AlertTriangle,
} from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import toast from "react-hot-toast";
import { Pagination } from "@/components/ui";

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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal states
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<any | null>(null);
  const [deleteQuizTarget, setDeleteQuizTarget] = useState<any | null>(null);
  const [selectedQuizForQuestions, setSelectedQuizForQuestions] = useState<any | null>(null);
  const [diagnosticClipQuestionId, setDiagnosticClipQuestionId] = useState<number | null>(null);
  const [diagnosticClipForm, setDiagnosticClipForm] = useState({ label: "", key: "", url: "" });

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

  const { data: listeningAnalytics } = useQuery<any>({
    queryKey: ["admin-listening-analytics"],
    queryFn: async () => axiosClient.get("/admin/listening-analytics"),
    staleTime: 30_000,
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

  const publishQuizMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: "DRAFT" | "PUBLISHED" | "ARCHIVED" }) =>
      axiosClient.patch(`/quizzes/${id}/publication`, { status }),
    onSuccess: () => {
      toast.success("Đã cập nhật trạng thái xuất bản");
      queryClient.invalidateQueries({ queryKey: ["admin-quizzes"] });
      queryClient.invalidateQueries({ queryKey: ["admin-listening-analytics"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Không thể cập nhật trạng thái"),
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

  const audioUploadMutation = useMutation({
    mutationFn: async ({ questionId, file }: { questionId: number; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      return axiosClient.post(`/quizzes/questions/${questionId}/audio-assets`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => {
      toast.success("Đã tải phiên bản audio mới lên kho học liệu");
      refetchDetail();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Không thể tải audio lên");
    },
  });

  const dialogueAudioMutation = useMutation({
    mutationFn: async (questionId: number) =>
      axiosClient.post(`/quizzes/questions/${questionId}/audio-assets/generate-dialogue`),
    onSuccess: () => {
      toast.success("Đã sinh audio hội thoại với giọng đọc phân biệt theo người nói");
      refetchDetail();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Không thể sinh audio hội thoại");
    },
  });

  const diagnosticClipMutation = useMutation({
    mutationFn: async ({ questionId, payload }: { questionId: number; payload: typeof diagnosticClipForm }) =>
      axiosClient.post(`/quizzes/questions/${questionId}/diagnostic-clips`, payload),
    onSuccess: () => {
      toast.success("Đã gắn clip chẩn đoán cho câu hỏi");
      setDiagnosticClipQuestionId(null);
      setDiagnosticClipForm({ label: "", key: "", url: "" });
      refetchDetail();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Không thể gắn clip chẩn đoán"),
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

  const totalPages = Math.ceil((filteredQuizzes?.length || 0) / pageSize);
  const paginatedQuizzes = filteredQuizzes?.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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

      {listeningAnalytics?.totals && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            ["Bài luyện nghe", listeningAnalytics.totals.quizzes],
            ["Câu hỏi", listeningAnalytics.totals.questions],
            ["Lượt bắt đầu", listeningAnalytics.totals.attempts],
            ["Lượt nộp bài", listeningAnalytics.totals.submissions],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
              <p className="mt-1 text-2xl font-black text-slate-800">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* FILTER & SEARCH */}
      <div className="bg-white rounded-[2.5rem] border-4 border-slate-200 shadow-[0_8px_0_0_#e2e8f0] overflow-hidden p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tìm kiếm theo tên đề thi hoặc mã ID..."
              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-emerald-500 focus:bg-white transition-all text-sm"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setCurrentPage(1);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
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
                  <th className="py-4 px-6">Xuất bản</th>
                  <th className="py-4 px-6 text-center">Số Câu Hỏi</th>
                  <th className="py-4 px-6 text-center">Thời Gian Làm Bài</th>
                  <th className="py-4 px-6 text-right rounded-r-2xl">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold text-sm text-slate-700">
                {paginatedQuizzes?.map((quiz: any) => {
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
                      <td className="py-4 px-6">
                        <button
                          type="button"
                          disabled={publishQuizMutation.isPending}
                          onClick={() => publishQuizMutation.mutate({
                            id: quiz.id,
                            status: quiz.publicationStatus === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
                          })}
                          className={`rounded-xl border px-3 py-1 text-xs font-black transition-colors ${
                            quiz.publicationStatus === "PUBLISHED"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                          }`}
                        >
                          {quiz.publicationStatus === "PUBLISHED" ? "Đang hiển thị" : "Bản nháp"}
                        </button>
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

            {/* PAGINATION */}
            <div className="p-4 bg-slate-50/50 border-t border-slate-100">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredQuizzes?.length || 0}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
              />
            </div>
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
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 md:p-8 max-w-3xl w-full max-h-[min(90dvh,calc(100dvh-3rem))] flex flex-col space-y-6 overflow-hidden"
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
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
                >
                  <X size={24} />
                </button>
              </div>

              {/* QUESTIONS LIST */}
              <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
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

                        {Array.isArray(content.transcriptSegments) && content.transcriptSegments.length > 0 && (
                          <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="text-xs font-black text-sky-900">
                                  Hội thoại {content.transcriptSegments.length} lượt lời
                                </p>
                                <p className="mt-1 text-[11px] text-sky-800">
                                  {Array.from(new Set(content.transcriptSegments.map((segment: any) => segment.speaker).filter(Boolean))).join(" · ")}
                                </p>
                              </div>
                              <button
                                type="button"
                                disabled={dialogueAudioMutation.isPending}
                                onClick={() => dialogueAudioMutation.mutate(q.id)}
                                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-sky-300 bg-white px-3 text-xs font-black text-sky-700 transition hover:bg-sky-100 disabled:cursor-wait disabled:opacity-60"
                              >
                                {dialogueAudioMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Volume2 size={14} />}
                                {q.audioAssets?.[0] ? "Tạo lại audio đa giọng" : "Sinh audio đa giọng"}
                              </button>
                            </div>
                            <div className="mt-2 space-y-1 text-xs text-slate-700">
                              {content.transcriptSegments.slice(0, 3).map((segment: any, segmentIndex: number) => (
                                <p key={`${q.id}-segment-${segmentIndex}`} className="truncate">
                                  <span className="font-black text-sky-800">{segment.speaker}:</span> {segment.text}
                                </p>
                              ))}
                              {content.transcriptSegments.length > 3 && <p className="text-slate-500">… và {content.transcriptSegments.length - 3} lượt lời khác</p>}
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2">
                          <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50">
                            <Volume2 size={15} className="text-emerald-600" />
                            {audioUploadMutation.isPending ? "Đang tải..." : "Tải audio phiên bản mới"}
                            <input
                              type="file"
                              accept="audio/mpeg,audio/wav,audio/ogg,audio/webm"
                              className="sr-only"
                              disabled={audioUploadMutation.isPending}
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) audioUploadMutation.mutate({ questionId: q.id, file });
                                event.target.value = "";
                              }}
                            />
                          </label>
                          {q.audioAssets?.[0] && (
                            <span className="text-xs text-slate-500">
                              Phiên bản v{q.audioAssets[0].version} đang hoạt động
                            </span>
                          )}
                        </div>

                        <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/50 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-black text-amber-900">Clip chẩn đoán</span>
                            <button
                              type="button"
                              className="text-xs font-bold text-amber-700 underline"
                              onClick={() => {
                                setDiagnosticClipQuestionId((current) => current === q.id ? null : q.id);
                                setDiagnosticClipForm({ label: "", key: "", url: "" });
                              }}
                            >
                              {diagnosticClipQuestionId === q.id ? "Đóng" : "Gắn clip"}
                            </button>
                          </div>
                          {q.diagnosticClips?.length > 0 && (
                            <p className="mt-1 text-xs text-slate-600">Đã gắn {q.diagnosticClips.length} clip</p>
                          )}
                          {diagnosticClipQuestionId === q.id && (
                            <form
                              className="mt-3 grid gap-2 sm:grid-cols-3"
                              onSubmit={(event) => {
                                event.preventDefault();
                                if (!diagnosticClipForm.label.trim() || !diagnosticClipForm.key.trim() || !diagnosticClipForm.url.trim()) {
                                  toast.error("Vui lòng nhập nhãn, key R2 và URL clip");
                                  return;
                                }
                                diagnosticClipMutation.mutate({ questionId: q.id, payload: diagnosticClipForm });
                              }}
                            >
                              <input className="min-h-10 rounded-lg border border-slate-200 px-3 text-xs" placeholder="Nhãn clip" value={diagnosticClipForm.label} onChange={(event) => setDiagnosticClipForm((current) => ({ ...current, label: event.target.value }))} />
                              <input className="min-h-10 rounded-lg border border-slate-200 px-3 text-xs" placeholder="Key R2" value={diagnosticClipForm.key} onChange={(event) => setDiagnosticClipForm((current) => ({ ...current, key: event.target.value }))} />
                              <div className="flex gap-2">
                                <input className="min-h-10 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-xs" placeholder="URL clip" value={diagnosticClipForm.url} onChange={(event) => setDiagnosticClipForm((current) => ({ ...current, url: event.target.value }))} />
                                <button type="submit" disabled={diagnosticClipMutation.isPending} className="min-h-10 rounded-lg bg-amber-500 px-3 text-xs font-black text-white disabled:opacity-50">Lưu</button>
                              </div>
                            </form>
                          )}
                        </div>

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
                  quizType={selectedQuizForQuestions.type}
                  onAdd={async (data) => {
                    const created: any = await addQuestionMutation.mutateAsync({
                      quizId: selectedQuizForQuestions.id,
                      questionData: data,
                    });
                    const createdQuestion = created?.data || created;
                    if (data.type === "DIALOGUE" && createdQuestion?.id) {
                      dialogueAudioMutation.mutate(createdQuestion.id);
                    }
                  }}
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
  onAdd,
  isLoading,
  quizType,
}: {
  quizId?: number;
  quizType?: string;
  onAdd: (data: any) => void | Promise<void>;
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
  const [practiceKind, setPracticeKind] = useState<"MULTIPLE_CHOICE" | "DICTATION" | "DIALOGUE">("MULTIPLE_CHOICE");
  const [audioText, setAudioText] = useState("");
  const [accent, setAccent] = useState("US");
  const [dictationMode, setDictationMode] = useState<"STANDARD" | "STRICT">("STANDARD");
  const [dialogueSegments, setDialogueSegments] = useState([
    { speaker: "Customer", text: "", translation: "" },
    { speaker: "Agent", text: "", translation: "" },
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isDialogue = practiceKind === "DIALOGUE" && quizType === "LISTENING_PRACTICE";
    const normalizedSegments = dialogueSegments
      .map((segment) => ({
        speaker: segment.speaker.trim(),
        text: segment.text.trim(),
        translation: segment.translation.trim(),
      }))
      .filter((segment) => segment.speaker && segment.text)
      .map((segment) => ({
        ...segment,
        ...(segment.translation ? { translation: segment.translation } : {}),
      }));

    if (!questionText.trim() || (!audioText.trim() && quizType === "LISTENING_PRACTICE" && !isDialogue)) {
      toast.error("Vui lòng nhập nội dung câu hỏi và nội dung audio.");
      return;
    }
    if (practiceKind === "MULTIPLE_CHOICE" && (!optA.trim() || !optB.trim())) {
      toast.error("Vui lòng nhập nội dung câu hỏi và ít nhất 2 đáp án A, B!");
      return;
    }

    const options = [optA.trim(), optB.trim()];
    if (optC.trim()) options.push(optC.trim());
    if (optD.trim()) options.push(optD.trim());

    const optionMap: Record<string, string> = { A: optA.trim(), B: optB.trim(), C: optC.trim(), D: optD.trim() };
    const correctValue = optionMap[correctKey] || optA.trim();

    if (isDialogue && (normalizedSegments.length < 2 || new Set(normalizedSegments.map((segment) => segment.speaker.toLowerCase())).size < 2)) {
      toast.error("Hội thoại cần ít nhất 2 lượt lời thuộc 2 người nói khác nhau.");
      return;
    }

    const derivedAudioText = normalizedSegments.map((segment) => segment.text).join(" ");

    try {
      await onAdd({
        type: practiceKind,
        content: {
          text: questionText.trim(),
          ...(practiceKind === "MULTIPLE_CHOICE" ? { options, correct: correctValue } : {}),
          ...(quizType === "LISTENING_PRACTICE"
            ? {
                audioText: isDialogue ? derivedAudioText : audioText.trim(),
                accent,
                ...(practiceKind === "DICTATION"
                  ? { correctAnswer: audioText.trim(), dictationMode }
                  : {}),
                ...(isDialogue ? { transcriptSegments: normalizedSegments } : {}),
              }
            : {}),
          explanation: explanation.trim(),
        },
      });
    } catch {
      return;
    }

    // Reset form
    setQuestionText("");
    setOptA("");
    setOptB("");
    setOptC("");
    setOptD("");
    setExplanation("");
    setAudioText("");
    setDialogueSegments([
      { speaker: "Customer", text: "", translation: "" },
      { speaker: "Agent", text: "", translation: "" },
    ]);
    setPracticeKind("MULTIPLE_CHOICE");
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full py-3 bg-slate-50 hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 font-black rounded-2xl border-2 border-dashed border-emerald-300 flex items-center justify-center gap-2 transition-all cursor-pointer text-sm"
      >
        <Plus size={18} /> Thêm câu hỏi mới vào đề
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-slate-50 border-2 border-emerald-200 rounded-2xl p-4 space-y-3 text-xs font-bold">
      <div className="flex items-center justify-between">
        <h4 className="font-black text-slate-800 text-sm text-emerald-700">Thêm câu hỏi mới</h4>
        <button type="button" onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
          <X size={16} />
        </button>
      </div>

      {quizType === "LISTENING_PRACTICE" && (
        <div className="grid grid-cols-3 gap-2">
          <label className="text-slate-600">Dạng bài
            <select value={practiceKind} onChange={(e) => setPracticeKind(e.target.value as typeof practiceKind)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800">
              <option value="MULTIPLE_CHOICE">Nghe hiểu</option>
              <option value="DICTATION">Nghe chép</option>
              <option value="DIALOGUE">Hội thoại</option>
            </select>
          </label>
          <label className="text-slate-600">Giọng đọc
            <select value={accent} onChange={(e) => setAccent(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800">
              <option value="US">US</option><option value="UK">UK</option>
            </select>
          </label>
          {practiceKind === "DICTATION" && (
            <label className="text-slate-600">Chế độ
              <select value={dictationMode} onChange={(e) => setDictationMode(e.target.value as typeof dictationMode)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800">
                <option value="STANDARD">STANDARD</option><option value="STRICT">STRICT</option>
              </select>
            </label>
          )}
        </div>
      )}

      {quizType === "LISTENING_PRACTICE" && practiceKind !== "DIALOGUE" && (
        <div>
          <label className="block text-slate-600 mb-1">Nội dung audio / đáp án nghe chép <span className="text-rose-500">*</span></label>
          <textarea value={audioText} onChange={(e) => setAudioText(e.target.value)} rows={2} placeholder="Văn bản dùng để phát TTS hoặc đáp án chuẩn..." className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800" />
        </div>
      )}

      {quizType === "LISTENING_PRACTICE" && practiceKind === "DIALOGUE" && (
        <div className="space-y-2 rounded-xl border border-sky-200 bg-sky-50/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <label className="block text-slate-700">Các lượt lời trong hội thoại</label>
              <p className="mt-0.5 text-[11px] font-normal text-slate-500">Nhập lời thoại tiếng Anh; bản dịch chỉ dùng để hiển thị transcript song ngữ.</p>
            </div>
            <button
              type="button"
              onClick={() => setDialogueSegments((segments) => [...segments, { speaker: segments.length % 2 === 0 ? "Customer" : "Agent", text: "", translation: "" }])}
              className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-sky-300 bg-white px-3 text-xs font-black text-sky-700 hover:bg-sky-100"
            >
              <Plus size={14} /> Thêm lượt lời
            </button>
          </div>
          {dialogueSegments.map((segment, index) => (
            <div key={`dialogue-draft-${index}`} className="grid gap-2 rounded-lg border border-sky-100 bg-white p-2 sm:grid-cols-[8rem_1fr_1fr_auto]">
              <input
                value={segment.speaker}
                onChange={(event) => setDialogueSegments((segments) => segments.map((item, itemIndex) => itemIndex === index ? { ...item, speaker: event.target.value } : item))}
                placeholder="Người nói"
                aria-label={`Người nói lượt ${index + 1}`}
                className="min-h-10 rounded-lg border border-slate-200 px-3 text-xs text-slate-800"
              />
              <input
                value={segment.text}
                onChange={(event) => setDialogueSegments((segments) => segments.map((item, itemIndex) => itemIndex === index ? { ...item, text: event.target.value } : item))}
                placeholder="English dialogue"
                aria-label={`Lời thoại tiếng Anh lượt ${index + 1}`}
                className="min-h-10 rounded-lg border border-slate-200 px-3 text-xs text-slate-800"
              />
              <input
                value={segment.translation}
                onChange={(event) => setDialogueSegments((segments) => segments.map((item, itemIndex) => itemIndex === index ? { ...item, translation: event.target.value } : item))}
                placeholder="Bản dịch tiếng Việt (tùy chọn)"
                aria-label={`Bản dịch lượt ${index + 1}`}
                className="min-h-10 rounded-lg border border-slate-200 px-3 text-xs text-slate-800"
              />
              <button
                type="button"
                disabled={dialogueSegments.length <= 2}
                onClick={() => setDialogueSegments((segments) => segments.filter((_, itemIndex) => itemIndex !== index))}
                aria-label={`Xóa lượt lời ${index + 1}`}
                className="min-h-10 rounded-lg px-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

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

      {practiceKind === "MULTIPLE_CHOICE" && <div className="grid grid-cols-2 gap-2">
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
      </div>}

      {practiceKind === "MULTIPLE_CHOICE" && <div className="grid grid-cols-2 gap-2">
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
      </div>}

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
