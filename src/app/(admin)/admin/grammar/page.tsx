"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  GraduationCap,
  Plus,
  Loader2,
  Search,
  Trash2,
  Edit2,
  ArrowLeft,
  CheckCircle2,
  Eye,
  ArrowUp,
  ArrowDown,
  X,
  BookOpen,
  HelpCircle,
  Video,
  FileText,
} from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import { Pagination } from "@/components/ui";
import toast from "react-hot-toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { levelLabel } from "@/lib/ui/displayLabels";
import { getApiErrorMessage } from "@/lib/utils/apiError";

interface GrammarQuestion {
  id: number;
  topicId: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string | null;
  order: number;
}

interface GrammarTopicDetail {
  id: number;
  title: string;
  description?: string | null;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  videoYoutubeId?: string | null;
  keyFormula?: string | null;
  publicationStatus: "DRAFT" | "PUBLISHED";
  questions: GrammarQuestion[];
  _count?: { questions: number; grammarAttempt: number };
}
type GrammarDraftQuestion = Omit<GrammarQuestion, "id" | "topicId" | "order"> & { excluded?: boolean };
const GRAMMAR_LEVEL_OPTIONS = [
  { value: "BEGINNER", label: "Cơ bản (Beginner)" },
  { value: "INTERMEDIATE", label: "Trung cấp (Intermediate)" },
  { value: "ADVANCED", label: "Nâng cao (Advanced)" },
] as const;

export default function AdminGrammarPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "DRAFT" | "PUBLISHED"
  >("ALL");
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(9);
  const [activeTab, setActiveTab] = useState<
    "questions" | "theory" | "preview"
  >("questions");

  // Modals & Confirm states
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] =
    useState<GrammarQuestion | null>(null);
  const [pendingDeleteTopic, setPendingDeleteTopic] = useState<{
    id: number;
    title: string;
  } | null>(null);
  const [pendingDeleteQuestion, setPendingDeleteQuestion] = useState<{
    id: number;
    question: string;
  } | null>(null);

  // Form states: Topic
  const [topicForm, setTopicForm] = useState({
    title: "",
    level: "BEGINNER",
    description: "",
    keyFormula: "",
    videoYoutubeId: "",
  });

  // Form states: Question
  const [questionForm, setQuestionForm] = useState({
    question: "",
    options: ["", "", "", ""],
    correctIndex: 0,
    explanation: "",
  });

  // Contextual AI state: Grammar
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiCount, setAiCount] = useState(3);
  const [aiCandidates, setAiCandidates] = useState<
    Array<{
      question: string;
      options: string[];
      correctIndex: number;
      explanation: string;
    }>
  >([]);
  const [grammarFullDraft, setGrammarFullDraft] = useState<{
    title: string;
    description: string;
    level: string;
    keyFormula: string;
    questions: GrammarDraftQuestion[];
  } | null>(null);
  const [grammarFullDraftCount, setGrammarFullDraftCount] = useState(10);
  const [pendingGrammarQuestions, setPendingGrammarQuestions] = useState<GrammarDraftQuestion[]>([]);

  const handleSuggestGrammarFullDraft = async () => {
    if (!topicForm.title.trim()) {
      toast.error("Vui lòng nhập tên chủ đề trước khi soạn bản nháp.");
      return;
    }
    try {
      const response: any = await axiosClient.post("/admin/grammar/ai/full-draft", {
        topicTitle: topicForm.title.trim(),
        level: topicForm.level,
        objective: topicForm.description.trim() || undefined,
        count: grammarFullDraftCount,
      });
      const data = response?.data || response;
      if (!data?.title || !Array.isArray(data.questions) || !data.questions.length) throw new Error("AI không trả về bản nháp ngữ pháp hợp lệ.");
      setGrammarFullDraft({
        title: String(data.title),
        description: String(data.description || ""),
        level: String(data.level || topicForm.level),
        keyFormula: String(data.keyFormula || ""),
        questions: data.questions.map((question: GrammarDraftQuestion) => ({ ...question, excluded: false })),
      });
    } catch (error: any) {
      toast.error(error instanceof Error && !("response" in error) ? error.message : getApiErrorMessage(error, "Không thể soạn bản nháp ngữ pháp."));
    }
  };

  const handleGenerateAiQuestions = async () => {
    if (!topicDetail) return;
    setIsAiGenerating(true);
    try {
      const res: any = await axiosClient.post(
        "/admin/grammar/ai/suggest-questions",
        {
          topicTitle: topicDetail.title,
          level: topicDetail.level,
          theory: topicDetail.description || undefined,
          keyFormula: topicDetail.keyFormula || undefined,
          count: Number(aiCount),
        },
      );
      const data = res?.data || res;
      if (Array.isArray(data?.candidates)) {
        setAiCandidates(data.candidates);
        toast.success(`AI đã gợi ý ${data.candidates.length} câu hỏi nháp`);
      } else {
        toast.error("Không nhận được câu hỏi hợp lệ từ AI");
      }
    } catch (err: any) {
      toast.error(
        getApiErrorMessage(err, "Không thể tạo câu hỏi nháp lúc này."),
      );
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Preview interactive state
  const [previewSelectedOption, setPreviewSelectedOption] = useState<
    number | null
  >(null);
  const [previewSubmitted, setPreviewSubmitted] = useState(false);
  const [previewQuestionIndex, setPreviewQuestionIndex] = useState(0);

  // 1. Query all topics
  const { data: topics, isLoading: isTopicsLoading } = useQuery<any[]>({
    queryKey: ["admin-grammar-topics"],
    queryFn: async () => {
      const res: any = await axiosClient.get("/grammar/topics");
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  // 2. Query single topic detail
  const { data: topicDetail, isLoading: isDetailLoading } =
    useQuery<GrammarTopicDetail>({
      queryKey: ["admin-grammar-topic-detail", selectedTopicId],
      queryFn: async () => {
        if (!selectedTopicId) return null;
        const res: any = await axiosClient.get(
          `/grammar/topics/${selectedTopicId}`,
        );
        return res?.data || res;
      },
      enabled: !!selectedTopicId,
    });

  // Mutations
  const createTopicMutation = useMutation({
    mutationFn: async ({ dto, questions }: { dto: any; questions: GrammarDraftQuestion[] }) => {
      const response: any = await axiosClient.post("/grammar/topics", dto);
      const created = response?.data || response;
      if (created?.id && questions.length) {
        await Promise.all(questions.map((question, order) => axiosClient.post(`/grammar/topics/${created.id}/questions`, {
          question: question.question,
          options: question.options,
          correctIndex: question.correctIndex,
          explanation: question.explanation,
          order,
        })));
      }
      return response;
    },
    onSuccess: (data: any) => {
      toast.success("Tạo chủ đề ngữ pháp mới thành công!");
      setIsTopicModalOpen(false);
      setTopicForm({
        title: "",
        level: "BEGINNER",
        description: "",
        keyFormula: "",
        videoYoutubeId: "",
      });
      setPendingGrammarQuestions([]);
      queryClient.invalidateQueries({ queryKey: ["admin-grammar-topics"] });
      if (data?.id) setSelectedTopicId(data.id);
    },
    onError: (err: any) =>
      toast.error(
        getApiErrorMessage(err, "Không thể tạo chủ đề ngữ pháp"),
      ),
  });

  const updateTopicMutation = useMutation({
    mutationFn: async ({ id, dto }: { id: number; dto: any }) =>
      axiosClient.patch(`/grammar/topics/${id}`, dto),
    onSuccess: () => {
      toast.success("Cập nhật chủ đề thành công!");
      queryClient.invalidateQueries({ queryKey: ["admin-grammar-topics"] });
      queryClient.invalidateQueries({
        queryKey: ["admin-grammar-topic-detail", selectedTopicId],
      });
    },
    onError: (err: any) =>
      toast.error(getApiErrorMessage(err, "Không thể cập nhật chủ đề")),
  });

  const publishTopicMutation = useMutation({
    mutationFn: async (id: number) =>
      axiosClient.post(`/grammar/topics/${id}/publish`),
    onSuccess: () => {
      toast.success("Đã xuất bản chủ đề ngữ pháp!");
      queryClient.invalidateQueries({ queryKey: ["admin-grammar-topics"] });
      queryClient.invalidateQueries({
        queryKey: ["admin-grammar-topic-detail", selectedTopicId],
      });
    },
    onError: (err: any) =>
      toast.error(getApiErrorMessage(err, "Không thể xuất bản")),
  });

  const unpublishTopicMutation = useMutation({
    mutationFn: async (id: number) =>
      axiosClient.post(`/grammar/topics/${id}/unpublish`),
    onSuccess: () => {
      toast.success("Đã chuyển về bản nháp!");
      queryClient.invalidateQueries({ queryKey: ["admin-grammar-topics"] });
      queryClient.invalidateQueries({
        queryKey: ["admin-grammar-topic-detail", selectedTopicId],
      });
    },
    onError: (err: any) =>
      toast.error(getApiErrorMessage(err, "Không thể gỡ xuất bản")),
  });

  const deleteTopicMutation = useMutation({
    mutationFn: async (id: number) =>
      axiosClient.delete(`/grammar/topics/${id}`),
    onSuccess: () => {
      toast.success("Đã xóa chủ đề ngữ pháp!");
      setPendingDeleteTopic(null);
      if (selectedTopicId === pendingDeleteTopic?.id) setSelectedTopicId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-grammar-topics"] });
    },
    onError: (err: any) =>
      toast.error(getApiErrorMessage(err, "Không thể xóa chủ đề")),
  });

  const saveQuestionMutation = useMutation({
    mutationFn: async (dto: any) => {
      if (!selectedTopicId) return;
      if (editingQuestion) {
        return axiosClient.patch(
          `/grammar/topics/${selectedTopicId}/questions/${editingQuestion.id}`,
          dto,
        );
      }
      return axiosClient.post(
        `/grammar/topics/${selectedTopicId}/questions`,
        dto,
      );
    },
    onSuccess: () => {
      toast.success(
        editingQuestion
          ? "Cập nhật câu hỏi thành công!"
          : "Thêm câu hỏi thành công!",
      );
      setIsQuestionModalOpen(false);
      setEditingQuestion(null);
      setQuestionForm({
        question: "",
        options: ["", "", "", ""],
        correctIndex: 0,
        explanation: "",
      });
      queryClient.invalidateQueries({
        queryKey: ["admin-grammar-topic-detail", selectedTopicId],
      });
      queryClient.invalidateQueries({ queryKey: ["admin-grammar-topics"] });
    },
    onError: (err: any) =>
      toast.error(getApiErrorMessage(err, "Không thể lưu câu hỏi")),
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (questionId: number) => {
      if (!selectedTopicId) return;
      return axiosClient.delete(
        `/grammar/topics/${selectedTopicId}/questions/${questionId}`,
      );
    },
    onSuccess: () => {
      toast.success("Đã xóa câu hỏi!");
      setPendingDeleteQuestion(null);
      queryClient.invalidateQueries({
        queryKey: ["admin-grammar-topic-detail", selectedTopicId],
      });
      queryClient.invalidateQueries({ queryKey: ["admin-grammar-topics"] });
    },
    onError: (err: any) =>
      toast.error(getApiErrorMessage(err, "Không thể xóa câu hỏi")),
  });

  const reorderQuestionsMutation = useMutation({
    mutationFn: async (questionIds: number[]) => {
      if (!selectedTopicId) return;
      return axiosClient.post(
        `/grammar/topics/${selectedTopicId}/reorder-questions`,
        { questionIds },
      );
    },
    onSuccess: () => {
      toast.success("Đã lưu thứ tự câu hỏi!");
      queryClient.invalidateQueries({
        queryKey: ["admin-grammar-topic-detail", selectedTopicId],
      });
    },
    onError: (err: any) =>
      toast.error(getApiErrorMessage(err, "Không thể sắp xếp câu hỏi")),
  });

  const handleMoveQuestion = (index: number, direction: "up" | "down") => {
    if (!topicDetail?.questions) return;
    const questions = [...topicDetail.questions];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;
    const temp = questions[index];
    questions[index] = questions[targetIndex];
    questions[targetIndex] = temp;
    reorderQuestionsMutation.mutate(questions.map((q) => q.id));
  };

  const handleOpenEditQuestion = (item: GrammarQuestion) => {
    setEditingQuestion(item);
    setQuestionForm({
      question: item.question,
      options:
        Array.isArray(item.options) && item.options.length === 4
          ? [...item.options]
          : ["", "", "", ""],
      correctIndex: item.correctIndex ?? 0,
      explanation: item.explanation || "",
    });
    setIsQuestionModalOpen(true);
  };

  const filteredTopics = topics?.filter(
    (t) =>
      (t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (statusFilter === "ALL" || t.publicationStatus === statusFilter),
  );
  const totalPages = Math.ceil((filteredTopics?.length || 0) / pageSize);
  const paginatedTopics = filteredTopics?.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  // -------------------------------------------------------------
  // RENDER: Topic Workspace / Editor when a topic is selected
  // -------------------------------------------------------------
  if (selectedTopicId && topicDetail) {
    const isPublished = topicDetail.publicationStatus === "PUBLISHED";
    const questions = topicDetail.questions || [];
    const currentPreviewQuestion = questions[previewQuestionIndex];

    return (
      <main className="mx-auto max-w-6xl space-y-6 p-6">
        {/* TOP BAR */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedTopicId(null)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
              title="Quay lại danh sách"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">
                  {topicDetail.title}
                </h1>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    isPublished
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}
                >
                  {isPublished ? "Đã xuất bản" : "Bản nháp"}
                </span>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {levelLabel(topicDetail.level)}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {questions.length} câu hỏi bài tập trắc nghiệm
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isPublished ? (
              <button
                onClick={() => unpublishTopicMutation.mutate(topicDetail.id)}
                disabled={unpublishTopicMutation.isPending}
                className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Chuyển về bản nháp
              </button>
            ) : (
              <button
                onClick={() => publishTopicMutation.mutate(topicDetail.id)}
                disabled={publishTopicMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm"
              >
                <CheckCircle2 size={15} /> Xuất bản
              </button>
            )}
          </div>
        </div>

        {/* WORKSPACE NAVIGATION TABS */}
        <div className="flex gap-2 border-b border-slate-200 pb-1">
          <button
            onClick={() => setActiveTab("questions")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === "questions"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Câu hỏi ({questions.length})
          </button>
          <button
            onClick={() => setActiveTab("theory")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === "theory"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Lý thuyết & Công thức
          </button>
          <button
            onClick={() => setActiveTab("preview")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === "preview"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Xem trước bài học
          </button>
        </div>

        {/* TAB 1: QUESTIONS LIST */}
        {activeTab === "questions" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500 font-medium">
                Mỗi câu hỏi có 4 lựa chọn và 1 đáp án chính xác. Học viên chỉ
                xem được đáp án sau khi nộp bài.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAiCandidates([]);
                    setIsAiModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors"
                >
                  AI gợi ý câu hỏi nháp
                </button>
                <button
                  onClick={() => {
                    setEditingQuestion(null);
                    setQuestionForm({
                      question: "",
                      options: ["", "", "", ""],
                      correctIndex: 0,
                      explanation: "",
                    });
                    setIsQuestionModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
                >
                  <Plus size={15} /> Thêm câu hỏi mới
                </button>
              </div>
            </div>

            {questions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-sm text-slate-500">
                Chủ đề này chưa có câu hỏi nào. Hãy thêm ít nhất 1 câu hỏi trước
                khi xuất bản.
              </div>
            ) : (
              <div className="space-y-3">
                {questions.map((item, idx) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-slate-100 text-xs font-bold text-slate-600">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-bold text-slate-900 text-sm leading-snug">
                            {item.question}
                          </p>
                          {item.explanation && (
                            <p className="text-xs text-slate-500 mt-1">
                              <span className="font-semibold text-slate-700">
                                Giải thích:
                              </span>{" "}
                              {item.explanation}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="inline-flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleMoveQuestion(idx, "up")}
                          disabled={idx === 0}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                          title="Di chuyển lên"
                        >
                          <ArrowUp size={15} />
                        </button>
                        <button
                          onClick={() => handleMoveQuestion(idx, "down")}
                          disabled={idx === questions.length - 1}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                          title="Di chuyển xuống"
                        >
                          <ArrowDown size={15} />
                        </button>
                        <button
                          onClick={() => handleOpenEditQuestion(item)}
                          className="p-1 text-slate-500 hover:text-slate-900"
                          title="Sửa câu hỏi"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() =>
                            setPendingDeleteQuestion({
                              id: item.id,
                              question: item.question,
                            })
                          }
                          className="p-1 text-slate-400 hover:text-rose-600"
                          title="Xóa câu hỏi"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                      {item.options.map((opt, optIdx) => {
                        const isCorrect = optIdx === item.correctIndex;
                        return (
                          <div
                            key={optIdx}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-medium flex items-center justify-between ${
                              isCorrect
                                ? "border-emerald-300 bg-emerald-50 text-emerald-900 font-bold"
                                : "border-slate-200 bg-slate-50 text-slate-700"
                            }`}
                          >
                            <span>
                              {String.fromCharCode(65 + optIdx)}. {opt}
                            </span>
                            {isCorrect && (
                              <CheckCircle2
                                size={13}
                                className="text-emerald-600 shrink-0"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: THEORY & FORMULA */}
        {activeTab === "theory" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateTopicMutation.mutate({
                id: topicDetail.id,
                dto: {
                  title: topicDetail.title,
                  level: topicDetail.level,
                  description: topicDetail.description,
                  keyFormula: topicDetail.keyFormula,
                  videoYoutubeId: topicDetail.videoYoutubeId,
                },
              });
            }}
            className="max-w-2xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tên chủ đề ngữ pháp
              </label>
              <input
                type="text"
                value={topicDetail.title}
                onChange={(e) => {
                  queryClient.setQueryData(
                    ["admin-grammar-topic-detail", selectedTopicId],
                    {
                      ...topicDetail,
                      title: e.target.value,
                    },
                  );
                }}
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-slate-400"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cấp độ
                </label>
                <select
                  value={topicDetail.level}
                  onChange={(e) => {
                    queryClient.setQueryData(
                      ["admin-grammar-topic-detail", selectedTopicId],
                      {
                        ...topicDetail,
                        level: e.target.value as any,
                      },
                    );
                  }}
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-slate-400"
                >
                  <option value="BEGINNER">Cơ bản (Beginner)</option>
                  <option value="INTERMEDIATE">Trung cấp (Intermediate)</option>
                  <option value="ADVANCED">Nâng cao (Advanced)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  YouTube Video ID (tùy chọn)
                </label>
                <input
                  type="text"
                  placeholder="e.g. dQw4w9WgXcQ"
                  value={topicDetail.videoYoutubeId || ""}
                  onChange={(e) => {
                    queryClient.setQueryData(
                      ["admin-grammar-topic-detail", selectedTopicId],
                      {
                        ...topicDetail,
                        videoYoutubeId: e.target.value,
                      },
                    );
                  }}
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Công thức trọng tâm (Key Formula)
              </label>
              <input
                type="text"
                placeholder="e.g. S + have/has + V3/ed + since/for..."
                value={topicDetail.keyFormula || ""}
                onChange={(e) => {
                  queryClient.setQueryData(
                    ["admin-grammar-topic-detail", selectedTopicId],
                    {
                      ...topicDetail,
                      keyFormula: e.target.value,
                    },
                  );
                }}
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-slate-400 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lý thuyết & Hướng dẫn sử dụng
              </label>
              <textarea
                rows={6}
                value={topicDetail.description || ""}
                onChange={(e) => {
                  queryClient.setQueryData(
                    ["admin-grammar-topic-detail", selectedTopicId],
                    {
                      ...topicDetail,
                      description: e.target.value,
                    },
                  );
                }}
                placeholder="Trình bày lý thuyết ngữ pháp chi tiết, quy tắc sử dụng và ví dụ minh họa..."
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-slate-400"
              />
            </div>

            <div className="flex items-center justify-end pt-3">
              <button
                type="submit"
                disabled={updateTopicMutation.isPending}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {updateTopicMutation.isPending
                  ? "Đang lưu..."
                  : "Lưu lý thuyết"}
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: PREVIEW */}
        {activeTab === "preview" && (
          <div className="space-y-6 max-w-2xl mx-auto py-2">
            {/* THEORY CARD */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                {topicDetail.level}
              </span>
              <h2 className="text-xl font-bold text-slate-900">
                {topicDetail.title}
              </h2>
              {topicDetail.keyFormula && (
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 font-mono text-xs text-slate-800 font-bold">
                  {topicDetail.keyFormula}
                </div>
              )}
              {topicDetail.description && (
                <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {topicDetail.description}
                </div>
              )}
            </div>

            {/* INTERACTIVE QUESTION PREVIEW */}
            {questions.length > 0 && currentPreviewQuestion ? (
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold border-b border-slate-100 pb-3">
                  <span>
                    Câu hỏi luyện tập {previewQuestionIndex + 1} /{" "}
                    {questions.length}
                  </span>
                  <span>Chế độ: Học viên làm bài</span>
                </div>

                <p className="font-bold text-slate-900 text-base">
                  {currentPreviewQuestion.question}
                </p>

                <div className="space-y-2">
                  {currentPreviewQuestion.options.map((option, idx) => {
                    const isSelected = previewSelectedOption === idx;
                    const isCorrect =
                      idx === currentPreviewQuestion.correctIndex;
                    let optionStyle =
                      "border-slate-200 bg-white text-slate-800 hover:bg-slate-50";

                    if (previewSubmitted) {
                      if (isCorrect) {
                        optionStyle =
                          "border-emerald-400 bg-emerald-50 text-emerald-900 font-bold";
                      } else if (isSelected && !isCorrect) {
                        optionStyle =
                          "border-rose-400 bg-rose-50 text-rose-900";
                      }
                    } else if (isSelected) {
                      optionStyle =
                        "border-slate-900 bg-slate-100 text-slate-950 font-semibold";
                    }

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          if (!previewSubmitted) setPreviewSelectedOption(idx);
                        }}
                        className={`w-full rounded-lg border p-3 text-left text-sm transition-all flex items-center justify-between ${optionStyle}`}
                      >
                        <span>
                          {String.fromCharCode(65 + idx)}. {option}
                        </span>
                        {previewSubmitted && isCorrect && (
                          <CheckCircle2
                            size={16}
                            className="text-emerald-600"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {previewSubmitted && currentPreviewQuestion.explanation && (
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 space-y-1">
                    <span className="font-bold text-slate-800">
                      Giải thích chi tiết:
                    </span>
                    <p>{currentPreviewQuestion.explanation}</p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setPreviewSubmitted(false);
                        setPreviewSelectedOption(null);
                        setPreviewQuestionIndex((prev) =>
                          Math.max(0, prev - 1),
                        );
                      }}
                      disabled={previewQuestionIndex === 0}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                    >
                      Câu trước
                    </button>
                    <button
                      onClick={() => {
                        setPreviewSubmitted(false);
                        setPreviewSelectedOption(null);
                        setPreviewQuestionIndex((prev) =>
                          Math.min(questions.length - 1, prev + 1),
                        );
                      }}
                      disabled={previewQuestionIndex === questions.length - 1}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                    >
                      Câu kế tiếp
                    </button>
                  </div>

                  {!previewSubmitted ? (
                    <button
                      onClick={() => {
                        if (previewSelectedOption === null) {
                          toast.error("Vui lòng chọn một đáp án!");
                          return;
                        }
                        setPreviewSubmitted(true);
                      }}
                      className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                    >
                      Kiểm tra đáp án
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setPreviewSubmitted(false);
                        setPreviewSelectedOption(null);
                      }}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Làm lại
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* MODAL: ADD / EDIT QUESTION */}
        {isQuestionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900">
                  {editingQuestion ? "Chỉnh sửa câu hỏi" : "Thêm câu hỏi mới"}
                </h3>
                <button
                  onClick={() => setIsQuestionModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:text-slate-700"
                >
                  <X size={18} />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (questionForm.options.some((o) => !o.trim())) {
                    toast.error("Vui lòng điền đủ 4 phương án!");
                    return;
                  }
                  saveQuestionMutation.mutate(questionForm);
                }}
                className="space-y-3.5 text-sm"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nội dung câu hỏi *
                  </label>
                  <textarea
                    rows={2}
                    value={questionForm.question}
                    onChange={(e) =>
                      setQuestionForm({
                        ...questionForm,
                        question: e.target.value,
                      })
                    }
                    placeholder="e.g. She has worked here ___ 2018."
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 outline-none focus:border-slate-400"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    4 Lựa chọn & Đáp án đúng *
                  </label>
                  {questionForm.options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correctAnswer"
                        checked={questionForm.correctIndex === idx}
                        onChange={() =>
                          setQuestionForm({
                            ...questionForm,
                            correctIndex: idx,
                          })
                        }
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        title="Đánh dấu đáp án đúng"
                      />
                      <span className="w-5 text-xs font-bold text-slate-500">
                        {String.fromCharCode(65 + idx)}.
                      </span>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...questionForm.options];
                          newOpts[idx] = e.target.value;
                          setQuestionForm({
                            ...questionForm,
                            options: newOpts,
                          });
                        }}
                        placeholder={`Lựa chọn ${String.fromCharCode(65 + idx)}`}
                        required
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-400"
                      />
                    </div>
                  ))}
                  <p className="text-[11px] text-slate-400">
                    Chọn nút tròn tương ứng với đáp án chính xác.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Giải thích chi tiết (tùy chọn)
                  </label>
                  <textarea
                    rows={2}
                    value={questionForm.explanation}
                    onChange={(e) =>
                      setQuestionForm({
                        ...questionForm,
                        explanation: e.target.value,
                      })
                    }
                    placeholder="e.g. 'Since' đi kèm mốc thời gian trong quá khứ..."
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 outline-none focus:border-slate-400 text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsQuestionModalOpen(false)}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={saveQuestionMutation.isPending}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {saveQuestionMutation.isPending
                      ? "Đang lưu..."
                      : editingQuestion
                        ? "Cập nhật"
                        : "Thêm mới"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: AI QUESTION GENERATOR & REVIEW */}
        {isAiModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
            <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900">
                    AI gợi ý câu hỏi ngữ pháp
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Chủ đề:{" "}
                    <span className="font-medium text-slate-700">
                      {topicDetail?.title}
                    </span>{" "}
                    • Cấp độ:{" "}
                    <span className="font-medium text-slate-700">
                      {topicDetail?.level}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => setIsAiModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:text-slate-700"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-slate-700">
                  Số lượng câu hỏi:
                </label>
                <select
                  value={aiCount}
                  onChange={(e) => setAiCount(Number(e.target.value))}
                  disabled={isAiGenerating}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-400"
                >
                  <option value={1}>1 câu</option>
                  <option value={2}>2 câu</option>
                  <option value={3}>3 câu (khuyến nghị)</option>
                  <option value={5}>5 câu</option>
                </select>
                <button
                  type="button"
                  disabled={isAiGenerating}
                  onClick={handleGenerateAiQuestions}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
                >
                  {isAiGenerating ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : null}
                  {aiCandidates.length > 0 ? "AI gợi ý lại" : "AI gợi ý câu hỏi nháp"}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-xs">
                {aiCandidates.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400">
                    Nhấn "AI gợi ý câu hỏi nháp" để AI đề xuất các câu hỏi trắc
                    nghiệm dựa theo chủ đề và cấp độ hiện tại.
                  </div>
                ) : (
                  aiCandidates.map((candidate, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-bold text-slate-800">
                          Câu {idx + 1}:
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setAiCandidates((prev) =>
                              prev.filter((_, i) => i !== idx),
                            );
                          }}
                          className="text-slate-400 hover:text-rose-600 text-[11px]"
                        >
                          Bỏ qua
                        </button>
                      </div>
                      <input
                        type="text"
                        value={candidate.question}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAiCandidates((prev) =>
                            prev.map((c, i) =>
                              i === idx ? { ...c, question: val } : c,
                            ),
                          );
                        }}
                        className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        {candidate.options.map((opt, optIdx) => {
                          const letter =
                            ["A", "B", "C", "D"][optIdx] || String(optIdx);
                          const isCorrect = candidate.correctIndex === optIdx;
                          return (
                            <div
                              key={optIdx}
                              className={`flex items-center gap-1.5 rounded border px-2 py-1.5 bg-white ${
                                isCorrect
                                  ? "border-emerald-500 ring-1 ring-emerald-200"
                                  : "border-slate-200"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setAiCandidates((prev) =>
                                    prev.map((c, i) =>
                                      i === idx
                                        ? { ...c, correctIndex: optIdx }
                                        : c,
                                    ),
                                  );
                                }}
                                className={`h-5 w-5 rounded text-[11px] font-bold flex items-center justify-center ${
                                  isCorrect
                                    ? "bg-emerald-600 text-white"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                                title="Đặt làm đáp án đúng"
                              >
                                {letter}
                              </button>
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setAiCandidates((prev) =>
                                    prev.map((c, i) =>
                                      i === idx
                                        ? {
                                            ...c,
                                            options: c.options.map((o, oi) =>
                                              oi === optIdx ? val : o,
                                            ),
                                          }
                                        : c,
                                    ),
                                  );
                                }}
                                className="flex-1 bg-transparent text-xs text-slate-800 outline-none"
                              />
                              {isCorrect ? (
                                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">
                                  Đúng
                                </span>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Giải thích:
                        </label>
                        <input
                          type="text"
                          value={candidate.explanation}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAiCandidates((prev) =>
                              prev.map((c, i) =>
                                i === idx ? { ...c, explanation: val } : c,
                              ),
                            );
                          }}
                          className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none"
                        />
                      </div>
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingQuestion(null);
                            setQuestionForm({
                              question: candidate.question,
                              options: [...candidate.options],
                              correctIndex: candidate.correctIndex,
                              explanation: candidate.explanation,
                            });
                            setIsAiModalOpen(false);
                            setIsQuestionModalOpen(true);
                            toast.success(
                              "Đã áp dụng câu hỏi vào biểu mẫu. Bạn có thể kiểm tra và bấm Lưu câu hỏi.",
                            );
                          }}
                          className="rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
                        >
                          Áp dụng vào form
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAiModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CONFIRM DELETE QUESTION */}
        <ConfirmDialog
          open={!!pendingDeleteQuestion}
          title="Xác nhận xóa câu hỏi"
          description={`Bạn có chắc chắn muốn xóa câu hỏi "${pendingDeleteQuestion?.question}"? Nếu câu hỏi này đã có học viên làm bài, hệ thống sẽ từ chối để bảo toàn kết quả thi.`}
          confirmLabel="Xóa câu hỏi"
          isPending={deleteQuestionMutation.isPending}
          onConfirm={() => {
            if (pendingDeleteQuestion)
              deleteQuestionMutation.mutate(pendingDeleteQuestion.id);
          }}
          onCancel={() => setPendingDeleteQuestion(null)}
        />
      </main>
    );
  }

  // -------------------------------------------------------------
  // RENDER: Topics Catalog / List Page
  // -------------------------------------------------------------
  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      {/* HEADER */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-slate-500">
            Grammar Studio
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950">
            Quản Lý Ngữ Pháp & Bài Tập
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Biên tập lý thuyết, công thức trọng tâm và câu hỏi trắc nghiệm ngữ
            pháp theo cấp độ.
          </p>
        </div>
        <button
          onClick={() => {
            setTopicForm({
              title: "",
              level: "BEGINNER",
              description: "",
              keyFormula: "",
              videoYoutubeId: "",
            });
            setPendingGrammarQuestions([]);
            setGrammarFullDraft(null);
            setIsTopicModalOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors shadow-sm"
        >
          <Plus size={16} /> Tạo chủ đề ngữ pháp mới
        </button>
      </header>

      {/* FILTER & SEARCH */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            size={17}
          />
          <input
            type="text"
            placeholder="Tìm kiếm chủ đề ngữ pháp..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-400 shadow-xs"
          />
        </div>
        <select
          aria-label="Lọc trạng thái chủ đề ngữ pháp"
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(
              event.target.value as "ALL" | "DRAFT" | "PUBLISHED",
            );
            setCurrentPage(1);
          }}
          className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-slate-400 sm:w-48"
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="DRAFT">Bản nháp</option>
          <option value="PUBLISHED">Đã xuất bản</option>
        </select>
      </div>

      {/* TOPICS GRID */}
      {isTopicsLoading ? (
        <div className="flex min-h-64 items-center justify-center">
          <Loader2 className="animate-spin text-slate-600" />
        </div>
      ) : paginatedTopics && paginatedTopics.length > 0 ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {paginatedTopics.map((topic) => {
              const isPublished = topic.publicationStatus === "PUBLISHED";
              return (
                <article
                  key={topic.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        {levelLabel(topic.level)}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          isPublished
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {isPublished ? "Đã xuất bản" : "Bản nháp"}
                      </span>
                    </div>

                    <div>
                      <h2 className="font-bold text-slate-900 leading-snug">
                        {topic.title}
                      </h2>
                      <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                        {topic.description ||
                          "Chưa có mô tả cho chủ đề ngữ pháp này."}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3.5 text-xs text-slate-500">
                    <span className="font-semibold text-slate-600">
                      {topic.totalQuestions ??
                        topic._count?.questions ??
                        topic.questions?.length ??
                        0}{" "}
                      câu hỏi
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedTopicId(topic.id)}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-slate-800 hover:bg-slate-100 transition-colors"
                      >
                        Quản lý
                      </button>
                      <button
                        onClick={() =>
                          setPendingDeleteTopic({
                            id: topic.id,
                            title: topic.title,
                          })
                        }
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Xóa chủ đề"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center pt-2">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-sm text-slate-500">
          Không tìm thấy chủ đề ngữ pháp nào. Hãy tạo chủ đề đầu tiên!
        </div>
      )}

      {/* MODAL: CREATE TOPIC */}
      {isTopicModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900">
                Tạo chủ đề ngữ pháp mới
              </h3>
              <button
                onClick={() => setIsTopicModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="max-w-[15rem] text-xs leading-5 text-slate-600">AI soạn chủ đề và câu hỏi nháp; Áp dụng chỉ điền vào biểu mẫu, chưa lưu.</p>
              <div className="flex items-center gap-2">
                <input aria-label="Số câu trong bản nháp ngữ pháp" type="number" min={1} max={20} value={grammarFullDraftCount} onChange={(event) => setGrammarFullDraftCount(Math.min(20, Math.max(1, Number(event.target.value) || 1)))} className="w-14 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-center text-xs text-slate-900" />
                <button type="button" onClick={() => void handleSuggestGrammarFullDraft()} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700">AI soạn bài ngữ pháp</button>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createTopicMutation.mutate({
                  dto: topicForm,
                  questions: pendingGrammarQuestions.filter((question) => !question.excluded),
                });
              }}
              className="space-y-3.5 text-sm"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên chủ đề *
                </label>
                <input
                  type="text"
                  value={topicForm.title}
                  onChange={(e) =>
                    setTopicForm({ ...topicForm, title: e.target.value })
                  }
                  placeholder="e.g. Present Perfect vs Past Simple"
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cấp độ
                </label>
                <select
                  value={topicForm.level}
                  onChange={(e) =>
                    setTopicForm({ ...topicForm, level: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 outline-none focus:border-slate-400"
                >
                  <option value="BEGINNER">Cơ bản (Beginner)</option>
                  <option value="INTERMEDIATE">Trung cấp (Intermediate)</option>
                  <option value="ADVANCED">Nâng cao (Advanced)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Công thức trọng tâm
                </label>
                <input
                  type="text"
                  value={topicForm.keyFormula}
                  onChange={(e) =>
                    setTopicForm({ ...topicForm, keyFormula: e.target.value })
                  }
                  placeholder="e.g. S + have/has + V3"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 outline-none focus:border-slate-400 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mô tả lý thuyết tóm tắt
                </label>
                <textarea
                  rows={2}
                  value={topicForm.description}
                  onChange={(e) =>
                    setTopicForm({ ...topicForm, description: e.target.value })
                  }
                  placeholder="Tóm tắt nội dung ngữ pháp..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 outline-none focus:border-slate-400 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTopicModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={createTopicMutation.isPending}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {createTopicMutation.isPending
                    ? "Đang tạo..."
                    : "Tạo bản nháp"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {grammarFullDraft && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="grammar-full-draft-title" className="max-h-[calc(100dvh-2rem)] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3"><div><h3 id="grammar-full-draft-title" className="font-bold text-slate-900">Review bản nháp ngữ pháp</h3><p className="mt-1 text-xs text-slate-500">Sửa hoặc bỏ bớt câu trước khi áp dụng. Bản nháp chỉ được lưu khi bấm Lưu.</p></div><button type="button" aria-label="Đóng review Grammar" onClick={() => setGrammarFullDraft(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button></div>
            <div className="space-y-4 py-4">
              <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-700">Tiêu đề<input value={grammarFullDraft.title} onChange={(event) => setGrammarFullDraft((current) => current ? { ...current, title: event.target.value } : current)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900" /></label><label className="text-xs font-semibold text-slate-700">Trình độ<select value={grammarFullDraft.level} onChange={(event) => setGrammarFullDraft((current) => current ? { ...current, level: event.target.value as GrammarTopicDetail["level"] } : current)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900">{GRAMMAR_LEVEL_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div>
              <label className="block text-xs font-semibold text-slate-700">Mô tả<textarea rows={3} value={grammarFullDraft.description} onChange={(event) => setGrammarFullDraft((current) => current ? { ...current, description: event.target.value } : current)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900" /></label>
              <label className="block text-xs font-semibold text-slate-700">Công thức trọng tâm<input value={grammarFullDraft.keyFormula} onChange={(event) => setGrammarFullDraft((current) => current ? { ...current, keyFormula: event.target.value } : current)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm font-normal text-slate-900" /></label>
              <div className="space-y-3">{grammarFullDraft.questions.map((question, index) => <div key={`${question.question}-${index}`} className={`rounded-xl border p-3 ${question.excluded ? "bg-slate-50 opacity-60" : "bg-white"}`}><div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-600">Câu {index + 1}</span><button type="button" onClick={() => setGrammarFullDraft((current) => current ? { ...current, questions: current.questions.map((item, itemIndex) => itemIndex === index ? { ...item, excluded: !item.excluded } : item) } : current)} className="text-xs font-semibold text-slate-500 underline">{question.excluded ? "Khôi phục" : "Loại câu"}</button></div><label className="mt-3 block text-xs font-semibold text-slate-700">Câu hỏi<textarea disabled={question.excluded} rows={2} value={question.question} onChange={(event) => setGrammarFullDraft((current) => current ? { ...current, questions: current.questions.map((item, itemIndex) => itemIndex === index ? { ...item, question: event.target.value } : item) } : current)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900" /></label><div className="mt-3 grid gap-3 sm:grid-cols-[1fr_120px]"><label className="text-xs font-semibold text-slate-700">Bốn lựa chọn<textarea disabled={question.excluded} rows={4} value={question.options.join("\n")} onChange={(event) => setGrammarFullDraft((current) => current ? { ...current, questions: current.questions.map((item, itemIndex) => itemIndex === index ? { ...item, options: event.target.value.split("\n") } : item) } : current)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm font-normal text-slate-900" /></label><label className="text-xs font-semibold text-slate-700">Đáp án 0–3<input disabled={question.excluded} type="number" min={0} max={3} value={question.correctIndex} onChange={(event) => setGrammarFullDraft((current) => current ? { ...current, questions: current.questions.map((item, itemIndex) => itemIndex === index ? { ...item, correctIndex: Number(event.target.value) } : item) } : current)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900" /></label></div><label className="mt-3 block text-xs font-semibold text-slate-700">Giải thích<textarea disabled={question.excluded} rows={2} value={question.explanation || ""} onChange={(event) => setGrammarFullDraft((current) => current ? { ...current, questions: current.questions.map((item, itemIndex) => itemIndex === index ? { ...item, explanation: event.target.value } : item) } : current)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900" /></label></div>)}</div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" onClick={() => setGrammarFullDraft(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700">Bỏ qua</button><button type="button" onClick={() => { const questions = grammarFullDraft.questions.filter((question) => !question.excluded && question.question.trim() && question.options.filter(Boolean).length === 4); if (!grammarFullDraft.title.trim() || !questions.length) { toast.error("Full draft cần tiêu đề và ít nhất một câu hợp lệ."); return; } setTopicForm((current) => ({ ...current, title: grammarFullDraft.title, description: grammarFullDraft.description, level: grammarFullDraft.level, keyFormula: grammarFullDraft.keyFormula })); setPendingGrammarQuestions(questions); setGrammarFullDraft(null); toast.success("Đã áp dụng bản nháp vào biểu mẫu. Chưa ghi database."); }} className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800">Áp dụng vào biểu mẫu</button></div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE TOPIC */}
      <ConfirmDialog
        open={!!pendingDeleteTopic}
        title="Xác nhận xóa chủ đề ngữ pháp"
        description={`Bạn có chắc chắn muốn xóa chủ đề ngữ pháp "${pendingDeleteTopic?.title}"? Toàn bộ câu hỏi trong chủ đề sẽ bị xóa. Nếu chủ đề đã có lượt làm bài của học viên, hệ thống sẽ từ chối để bảo toàn lịch sử.`}
        confirmLabel="Xóa chủ đề"
        isPending={deleteTopicMutation.isPending}
        onConfirm={() => {
          if (pendingDeleteTopic)
            deleteTopicMutation.mutate(pendingDeleteTopic.id);
        }}
        onCancel={() => setPendingDeleteTopic(null)}
      />
    </main>
  );
}
