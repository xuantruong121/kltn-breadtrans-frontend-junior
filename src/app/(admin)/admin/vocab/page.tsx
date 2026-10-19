"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Layers,
  Plus,
  Loader2,
  Search,
  Trash2,
  Edit2,
  ArrowLeft,
  CheckCircle2,
  Volume2,
  Eye,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  X,
  BookOpen,
} from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import { Pagination } from "@/components/ui";
import toast from "react-hot-toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface WordItem {
  id: number;
  topicId: number;
  word: string;
  meaning: string;
  pos?: string | null;
  ipaUs?: string | null;
  ipaUk?: string | null;
  audioUs?: string | null;
  audioUk?: string | null;
  exampleEn?: string | null;
  exampleVi?: string | null;
  order: number;
}

interface TopicDetail {
  id: number;
  title: string;
  description?: string | null;
  categoryName: string;
  level?: string | null;
  isPro?: boolean;
  publicationStatus: "DRAFT" | "PUBLISHED";
  words: WordItem[];
  _count?: { words: number; userProgress: number };
}

type VocabDraftWord = Omit<WordItem, "id" | "topicId" | "order"> & {
  excluded?: boolean;
};

export default function AdminVocabPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "DRAFT" | "PUBLISHED"
  >("ALL");
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(9);
  const [activeTab, setActiveTab] = useState<"info" | "words" | "preview">(
    "words",
  );

  // Modals & Confirm states
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [isWordModalOpen, setIsWordModalOpen] = useState(false);
  const [editingWord, setEditingWord] = useState<WordItem | null>(null);
  const [pendingDeleteTopic, setPendingDeleteTopic] = useState<{
    id: number;
    title: string;
  } | null>(null);
  const [pendingDeleteWord, setPendingDeleteWord] = useState<{
    id: number;
    word: string;
  } | null>(null);

  // Form states: Topic
  const [topicForm, setTopicForm] = useState({
    title: "",
    description: "",
    categoryName: "600 TỪ VỰNG TOEIC",
    level: "INTERMEDIATE",
    isPro: false,
  });

  // Form states: Word
  const [wordForm, setWordForm] = useState({
    word: "",
    pos: "noun",
    meaning: "",
    ipaUs: "",
    ipaUk: "",
    audioUs: "",
    audioUk: "",
    exampleEn: "",
    exampleVi: "",
  });

  // Contextual AI state: Vocab
  const [isAiSuggesting, setIsAiSuggesting] = useState(false);
  const [vocabSuggestion, setVocabSuggestion] = useState<{
    word: string;
    pos: string;
    meaning: string;
    ipaUs?: string;
    ipaUk?: string;
    exampleEn?: string;
    exampleVi?: string;
    collocations?: Array<{ phrase: string; meaningVi: string }>;
  } | null>(null);
  const [vocabFullDraft, setVocabFullDraft] = useState<{
    title: string;
    categoryName: string;
    words: VocabDraftWord[];
  } | null>(null);
  const [vocabFullDraftCount, setVocabFullDraftCount] = useState(15);
  const [pendingVocabWords, setPendingVocabWords] = useState<VocabDraftWord[]>(
    [],
  );

  const handleSuggestVocabFullDraft = async () => {
    if (!topicForm.title.trim()) {
      toast.error("Vui lòng nhập tên chủ đề trước khi soạn full draft.");
      return;
    }
    try {
      const response: any = await axiosClient.post("/admin/vocab/ai/full-draft", {
        topic: topicForm.title.trim(),
        level: topicForm.level,
        context: topicForm.description.trim() || undefined,
        count: vocabFullDraftCount,
      });
      const data = response?.data || response;
      if (!data?.title || !Array.isArray(data.words) || !data.words.length) {
        throw new Error("AI không trả về full draft Vocabulary hợp lệ.");
      }
      setVocabFullDraft({
        title: String(data.title),
        categoryName: String(data.categoryName || topicForm.categoryName),
        words: data.words.map((word: VocabDraftWord) => ({ ...word, excluded: false })),
      });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || "Không thể soạn full draft Vocabulary.");
    }
  };

  const handleAiSuggestWord = async () => {
    if (!wordForm.word.trim()) {
      toast.error("Vui lòng nhập từ vựng trước khi yêu cầu AI gợi ý");
      return;
    }
    setIsAiSuggesting(true);
    try {
      const res: any = await axiosClient.post("/admin/vocab/ai/suggest-word", {
        word: wordForm.word.trim(),
        level: topicDetail?.level || undefined,
      });
      const data = res?.data || res;
      setVocabSuggestion(data);
      toast.success("Đã nhận bản nháp gợi ý từ AI");
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          "Không thể lấy gợi ý AI lúc này. Vui lòng thử lại sau.",
      );
    } finally {
      setIsAiSuggesting(false);
    }
  };

  // Preview state
  const [previewCardIndex, setPreviewCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // 1. Query all topics
  const { data: topics, isLoading: isTopicsLoading } = useQuery<any[]>({
    queryKey: ["admin-vocab-topics"],
    queryFn: async () => {
      const res: any = await axiosClient.get("/admin/vocab/topics");
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  // 2. Query single topic detail
  const { data: topicDetail, isLoading: isDetailLoading } =
    useQuery<TopicDetail>({
      queryKey: ["admin-vocab-topic-detail", selectedTopicId],
      queryFn: async () => {
        if (!selectedTopicId) return null;
        const res: any = await axiosClient.get(
          `/admin/vocab/topics/${selectedTopicId}`,
        );
        return res?.data || res;
      },
      enabled: !!selectedTopicId,
    });

  // Mutations
  const createTopicMutation = useMutation({
    mutationFn: async ({ dto, words }: { dto: any; words: VocabDraftWord[] }) => {
      const response: any = await axiosClient.post("/admin/vocab/topics", dto);
      const created = response?.data || response;
      if (created?.id && words.length) {
        await Promise.all(
          words.map((word, order) =>
            axiosClient.post(`/admin/vocab/topics/${created.id}/words`, {
              word: word.word,
              pos: word.pos,
              meaning: word.meaning,
              ipaUs: word.ipaUs || undefined,
              ipaUk: word.ipaUk || undefined,
              exampleEn: word.exampleEn || undefined,
              exampleVi: word.exampleVi || undefined,
              order,
            }),
          ),
        );
      }
      return response;
    },
    onSuccess: (data: any) => {
      toast.success("Tạo bộ từ vựng mới thành công!");
      setIsTopicModalOpen(false);
      setTopicForm({
        title: "",
        description: "",
        categoryName: "600 TỪ VỰNG TOEIC",
        level: "INTERMEDIATE",
        isPro: false,
      });
      setPendingVocabWords([]);
      queryClient.invalidateQueries({ queryKey: ["admin-vocab-topics"] });
      if (data?.id) setSelectedTopicId(data.id);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Không thể tạo bộ từ vựng"),
  });

  const updateTopicMutation = useMutation({
    mutationFn: async ({ id, dto }: { id: number; dto: any }) =>
      axiosClient.patch(`/admin/vocab/topics/${id}`, dto),
    onSuccess: () => {
      toast.success("Cập nhật thông tin chủ đề thành công!");
      queryClient.invalidateQueries({ queryKey: ["admin-vocab-topics"] });
      queryClient.invalidateQueries({
        queryKey: ["admin-vocab-topic-detail", selectedTopicId],
      });
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Không thể cập nhật chủ đề"),
  });

  const publishTopicMutation = useMutation({
    mutationFn: async (id: number) =>
      axiosClient.post(`/admin/vocab/topics/${id}/publish`),
    onSuccess: () => {
      toast.success("Đã xuất bản bộ từ vựng!");
      queryClient.invalidateQueries({ queryKey: ["admin-vocab-topics"] });
      queryClient.invalidateQueries({
        queryKey: ["admin-vocab-topic-detail", selectedTopicId],
      });
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Không thể xuất bản"),
  });

  const unpublishTopicMutation = useMutation({
    mutationFn: async (id: number) =>
      axiosClient.post(`/admin/vocab/topics/${id}/unpublish`),
    onSuccess: () => {
      toast.success("Đã gỡ xuất bản về bản nháp!");
      queryClient.invalidateQueries({ queryKey: ["admin-vocab-topics"] });
      queryClient.invalidateQueries({
        queryKey: ["admin-vocab-topic-detail", selectedTopicId],
      });
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Không thể gỡ xuất bản"),
  });

  const deleteTopicMutation = useMutation({
    mutationFn: async (id: number) =>
      axiosClient.delete(`/admin/vocab/topics/${id}`),
    onSuccess: () => {
      toast.success("Đã xóa bộ từ vựng!");
      setPendingDeleteTopic(null);
      if (selectedTopicId === pendingDeleteTopic?.id) setSelectedTopicId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-vocab-topics"] });
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Không thể xóa bộ từ vựng"),
  });

  const saveWordMutation = useMutation({
    mutationFn: async (dto: any) => {
      if (!selectedTopicId) return;
      if (editingWord) {
        return axiosClient.patch(
          `/admin/vocab/topics/${selectedTopicId}/words/${editingWord.id}`,
          dto,
        );
      }
      return axiosClient.post(
        `/admin/vocab/topics/${selectedTopicId}/words`,
        dto,
      );
    },
    onSuccess: () => {
      toast.success(
        editingWord
          ? "Cập nhật từ vựng thành công!"
          : "Thêm từ vựng thành công!",
      );
      setIsWordModalOpen(false);
      setEditingWord(null);
      setWordForm({
        word: "",
        pos: "noun",
        meaning: "",
        ipaUs: "",
        ipaUk: "",
        audioUs: "",
        audioUk: "",
        exampleEn: "",
        exampleVi: "",
      });
      queryClient.invalidateQueries({
        queryKey: ["admin-vocab-topic-detail", selectedTopicId],
      });
      queryClient.invalidateQueries({ queryKey: ["admin-vocab-topics"] });
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Không thể lưu từ vựng"),
  });

  const deleteWordMutation = useMutation({
    mutationFn: async (wordId: number) => {
      if (!selectedTopicId) return;
      return axiosClient.delete(
        `/admin/vocab/topics/${selectedTopicId}/words/${wordId}`,
      );
    },
    onSuccess: () => {
      toast.success("Đã xóa từ vựng!");
      setPendingDeleteWord(null);
      queryClient.invalidateQueries({
        queryKey: ["admin-vocab-topic-detail", selectedTopicId],
      });
      queryClient.invalidateQueries({ queryKey: ["admin-vocab-topics"] });
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Không thể xóa từ vựng"),
  });

  const reorderWordsMutation = useMutation({
    mutationFn: async (wordIds: number[]) => {
      if (!selectedTopicId) return;
      return axiosClient.post(
        `/admin/vocab/topics/${selectedTopicId}/reorder-words`,
        { wordIds },
      );
    },
    onSuccess: () => {
      toast.success("Đã lưu thứ tự từ vựng!");
      queryClient.invalidateQueries({
        queryKey: ["admin-vocab-topic-detail", selectedTopicId],
      });
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Không thể sắp xếp từ vựng"),
  });

  // Reorder helper
  const handleMoveWord = (index: number, direction: "up" | "down") => {
    if (!topicDetail?.words) return;
    const words = [...topicDetail.words];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= words.length) return;
    const temp = words[index];
    words[index] = words[targetIndex];
    words[targetIndex] = temp;
    reorderWordsMutation.mutate(words.map((w) => w.id));
  };

  const handleOpenEditWord = (wordItem: WordItem) => {
    setEditingWord(wordItem);
    setWordForm({
      word: wordItem.word || "",
      pos: wordItem.pos || "noun",
      meaning: wordItem.meaning || "",
      ipaUs: wordItem.ipaUs || "",
      ipaUk: wordItem.ipaUk || "",
      audioUs: wordItem.audioUs || "",
      audioUk: wordItem.audioUk || "",
      exampleEn: wordItem.exampleEn || "",
      exampleVi: wordItem.exampleVi || "",
    });
    setIsWordModalOpen(true);
  };

  const filteredTopics = topics?.filter(
    (t) =>
      (t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.categoryName?.toLowerCase().includes(searchTerm.toLowerCase())) &&
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
    const words = topicDetail.words || [];
    const currentPreviewWord = words[previewCardIndex];

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
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Chuyên mục: {topicDetail.categoryName} · {words.length} từ vựng
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
            onClick={() => setActiveTab("words")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === "words"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Từ vựng ({words.length})
          </button>
          <button
            onClick={() => setActiveTab("preview")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === "preview"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Xem trước Flashcard
          </button>
          <button
            onClick={() => setActiveTab("info")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === "info"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Thông tin chủ đề
          </button>
        </div>

        {/* TAB 1: WORDS LIST */}
        {activeTab === "words" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500 font-medium">
                Thứ tự từ vựng sẽ quyết định trình tự học thẻ flashcard của học
                viên.
              </p>
              <button
                onClick={() => {
                  setEditingWord(null);
                  setWordForm({
                    word: "",
                    pos: "noun",
                    meaning: "",
                    ipaUs: "",
                    ipaUk: "",
                    audioUs: "",
                    audioUk: "",
                    exampleEn: "",
                    exampleVi: "",
                  });
                  setIsWordModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
              >
                <Plus size={15} /> Thêm từ vựng mới
              </button>
            </div>

            {words.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-sm text-slate-500">
                Chủ đề này chưa có từ vựng nào. Hãy thêm ít nhất 1 từ trước khi
                xuất bản.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">STT</th>
                      <th className="py-3 px-4">Từ vựng & Loại từ</th>
                      <th className="py-3 px-4">Phiên âm & Nghĩa</th>
                      <th className="py-3 px-4">Ví dụ ngữ cảnh</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {words.map((item, idx) => (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-3 px-4 text-center font-bold text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-base">
                              {item.word}
                            </span>
                            {item.pos && (
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
                                {item.pos}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            {(item.ipaUs || item.ipaUk) && (
                              <span className="text-xs text-slate-400 font-mono">
                                /{item.ipaUs || item.ipaUk}/
                              </span>
                            )}
                            <p className="font-semibold text-slate-800">
                              {item.meaning}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate">
                          {item.exampleEn ? (
                            <div>
                              <p className="text-xs text-slate-600 italic">
                                “{item.exampleEn}”
                              </p>
                              {item.exampleVi && (
                                <p className="text-[11px] text-slate-400">
                                  ↳ {item.exampleVi}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-300">
                              Chưa có ví dụ
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleMoveWord(idx, "up")}
                              disabled={idx === 0}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                              title="Di chuyển lên"
                            >
                              <ArrowUp size={15} />
                            </button>
                            <button
                              onClick={() => handleMoveWord(idx, "down")}
                              disabled={idx === words.length - 1}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                              title="Di chuyển xuống"
                            >
                              <ArrowDown size={15} />
                            </button>
                            <button
                              onClick={() => handleOpenEditWord(item)}
                              className="p-1 text-slate-500 hover:text-slate-900"
                              title="Sửa từ"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() =>
                                setPendingDeleteWord({
                                  id: item.id,
                                  word: item.word,
                                })
                              }
                              className="p-1 text-slate-400 hover:text-rose-600"
                              title="Xóa từ"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: FLASHCARD PREVIEW */}
        {activeTab === "preview" && (
          <div className="space-y-6 max-w-xl mx-auto py-4">
            {words.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-sm text-slate-500">
                Chưa có từ vựng để xem trước.
              </div>
            ) : currentPreviewWord ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                  <span>
                    Thẻ {previewCardIndex + 1} / {words.length}
                  </span>
                  <span>Chế độ: Học viên Flashcard</span>
                </div>

                {/* THE FLASHCARD FLIP BOX */}
                <div
                  onClick={() => setIsCardFlipped(!isCardFlipped)}
                  className="min-h-72 w-full cursor-pointer rounded-2xl border-2 border-slate-200 bg-white p-8 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  {!isCardFlipped ? (
                    // FRONT OF CARD
                    <div className="my-auto text-center space-y-3">
                      <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        {currentPreviewWord.pos || "Từ vựng"}
                      </span>
                      <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                        {currentPreviewWord.word}
                      </h2>
                      {currentPreviewWord.ipaUs && (
                        <p className="font-mono text-sm text-slate-500">
                          /{currentPreviewWord.ipaUs}/
                        </p>
                      )}
                      <p className="text-xs text-slate-400 pt-4 flex items-center justify-center gap-1">
                        <RotateCcw size={13} /> Nhấn để lật thẻ xem định nghĩa
                      </p>
                    </div>
                  ) : (
                    // BACK OF CARD
                    <div className="my-auto text-center space-y-4">
                      <div className="space-y-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                          Định nghĩa
                        </span>
                        <h3 className="text-2xl font-bold text-slate-900">
                          {currentPreviewWord.meaning}
                        </h3>
                      </div>
                      {currentPreviewWord.exampleEn && (
                        <div className="rounded-xl bg-slate-50 p-4 text-left border border-slate-100">
                          <p className="text-sm text-slate-700 italic">
                            “{currentPreviewWord.exampleEn}”
                          </p>
                          {currentPreviewWord.exampleVi && (
                            <p className="text-xs text-slate-500 mt-1">
                              ↳ {currentPreviewWord.exampleVi}
                            </p>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-slate-400 pt-2 flex items-center justify-center gap-1">
                        <RotateCcw size={13} /> Nhấn để quay lại mặt trước
                      </p>
                    </div>
                  )}
                </div>

                {/* NAVIGATION CONTROLS */}
                <div className="flex items-center justify-between gap-4">
                  <button
                    onClick={() => {
                      setIsCardFlipped(false);
                      setPreviewCardIndex((prev) => Math.max(0, prev - 1));
                    }}
                    disabled={previewCardIndex === 0}
                    className="flex-1 rounded-lg border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    Thẻ trước
                  </button>
                  <button
                    onClick={() => {
                      setIsCardFlipped(false);
                      setPreviewCardIndex((prev) =>
                        Math.min(words.length - 1, prev + 1),
                      );
                    }}
                    disabled={previewCardIndex === words.length - 1}
                    className="flex-1 rounded-lg bg-slate-900 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
                  >
                    Thẻ kế tiếp
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* TAB 3: TOPIC INFO */}
        {activeTab === "info" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateTopicMutation.mutate({
                id: topicDetail.id,
                dto: {
                  title: topicDetail.title,
                  categoryName: topicDetail.categoryName,
                  description: topicDetail.description,
                  level: topicDetail.level,
                  isPro: topicDetail.isPro,
                },
              });
            }}
            className="max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tên chủ đề từ vựng
              </label>
              <input
                type="text"
                value={topicDetail.title}
                onChange={(e) => {
                  queryClient.setQueryData(
                    ["admin-vocab-topic-detail", selectedTopicId],
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
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Chuyên mục lớn
              </label>
              <input
                type="text"
                value={topicDetail.categoryName}
                onChange={(e) => {
                  queryClient.setQueryData(
                    ["admin-vocab-topic-detail", selectedTopicId],
                    {
                      ...topicDetail,
                      categoryName: e.target.value,
                    },
                  );
                }}
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-slate-400"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mô tả (tùy chọn)
              </label>
              <textarea
                rows={3}
                value={topicDetail.description || ""}
                onChange={(e) => {
                  queryClient.setQueryData(
                    ["admin-vocab-topic-detail", selectedTopicId],
                    {
                      ...topicDetail,
                      description: e.target.value,
                    },
                  );
                }}
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-slate-400"
              />
            </div>
            <div className="flex items-center justify-end pt-3">
              <button
                type="submit"
                disabled={updateTopicMutation.isPending}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {updateTopicMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </form>
        )}

        {/* MODAL: ADD / EDIT WORD */}
        {isWordModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900">
                  {editingWord ? "Chỉnh sửa từ vựng" : "Thêm từ vựng mới"}
                </h3>
                <button
                  onClick={() => setIsWordModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:text-slate-700"
                >
                  <X size={18} />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveWordMutation.mutate(wordForm);
                }}
                className="space-y-3.5 text-sm"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Từ vựng *
                      </label>
                      <button
                        type="button"
                        disabled={isAiSuggesting || !wordForm.word.trim()}
                        onClick={handleAiSuggestWord}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900 disabled:opacity-40 transition-colors"
                        title="AI gợi ý nghĩa, loại từ và ví dụ theo từ này"
                      >
                        {isAiSuggesting ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : null}
                        AI gợi ý nội dung
                      </button>
                    </div>
                    <input
                      type="text"
                      value={wordForm.word}
                      onChange={(e) =>
                        setWordForm({ ...wordForm, word: e.target.value })
                      }
                      placeholder="e.g. Innovation"
                      required
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 outline-none focus:border-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Loại từ
                    </label>
                    <select
                      value={wordForm.pos}
                      onChange={(e) =>
                        setWordForm({ ...wordForm, pos: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 outline-none focus:border-slate-400"
                    >
                      <option value="noun">Danh từ (noun)</option>
                      <option value="verb">Động từ (verb)</option>
                      <option value="adjective">Tính từ (adjective)</option>
                      <option value="adverb">Trạng từ (adverb)</option>
                      <option value="phrase">Cụm từ (phrase)</option>
                    </select>
                  </div>
                </div>

                {/* AI SUGGESTION REVIEW DRAWER/CARD */}
                {vocabSuggestion && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                      <span className="font-bold text-slate-800">
                        Bản nháp gợi ý từ AI
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        Chưa lưu vào cơ sở dữ liệu
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-slate-700">
                      <div>
                        <span className="font-semibold text-slate-500">
                          Loại từ:
                        </span>{" "}
                        {vocabSuggestion.pos}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-500">
                          Phiên âm:
                        </span>{" "}
                        {vocabSuggestion.ipaUs || vocabSuggestion.ipaUk || "—"}
                      </div>
                    </div>
                    <div className="text-slate-700">
                      <span className="font-semibold text-slate-500">
                        Nghĩa:
                      </span>{" "}
                      {vocabSuggestion.meaning}
                    </div>
                    {vocabSuggestion.exampleEn && (
                      <div className="text-slate-700">
                        <span className="font-semibold text-slate-500">
                          Ví dụ:
                        </span>{" "}
                        {vocabSuggestion.exampleEn}
                      </div>
                    )}
                    {vocabSuggestion.exampleVi && (
                      <div className="text-slate-600 italic">
                        {vocabSuggestion.exampleVi}
                      </div>
                    )}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setVocabSuggestion(null)}
                        className="rounded px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setWordForm((prev) => ({
                            ...prev,
                            pos: vocabSuggestion.pos || prev.pos,
                            meaning: vocabSuggestion.meaning || prev.meaning,
                            ipaUs: vocabSuggestion.ipaUs || prev.ipaUs,
                            ipaUk: vocabSuggestion.ipaUk || prev.ipaUk,
                            exampleEn:
                              vocabSuggestion.exampleEn || prev.exampleEn,
                            exampleVi:
                              vocabSuggestion.exampleVi || prev.exampleVi,
                          }));
                          setVocabSuggestion(null);
                          toast.success(
                            "Đã áp dụng gợi ý vào form. Bạn có thể chỉnh sửa trước khi lưu.",
                          );
                        }}
                        className="rounded bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
                      >
                        Áp dụng vào form
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nghĩa tiếng Việt *
                  </label>
                  <input
                    type="text"
                    value={wordForm.meaning}
                    onChange={(e) =>
                      setWordForm({ ...wordForm, meaning: e.target.value })
                    }
                    placeholder="e.g. Sự đổi mới, cải tiến"
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 outline-none focus:border-slate-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Phiên âm US
                    </label>
                    <input
                      type="text"
                      value={wordForm.ipaUs}
                      onChange={(e) =>
                        setWordForm({ ...wordForm, ipaUs: e.target.value })
                      }
                      placeholder="e.g. ˌɪn.əˈveɪ.ʃən"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 outline-none focus:border-slate-400 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Phiên âm UK
                    </label>
                    <input
                      type="text"
                      value={wordForm.ipaUk}
                      onChange={(e) =>
                        setWordForm({ ...wordForm, ipaUk: e.target.value })
                      }
                      placeholder="e.g. ˌɪn.əˈveɪ.ʃən"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 outline-none focus:border-slate-400 font-mono text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Câu ví dụ tiếng Anh
                  </label>
                  <textarea
                    rows={2}
                    value={wordForm.exampleEn}
                    onChange={(e) =>
                      setWordForm({ ...wordForm, exampleEn: e.target.value })
                    }
                    placeholder="e.g. Technological innovation is key to staying competitive."
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 outline-none focus:border-slate-400 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Dịch nghĩa câu ví dụ
                  </label>
                  <textarea
                    rows={2}
                    value={wordForm.exampleVi}
                    onChange={(e) =>
                      setWordForm({ ...wordForm, exampleVi: e.target.value })
                    }
                    placeholder="e.g. Đổi mới công nghệ là chìa khóa để duy trì năng lực cạnh tranh."
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 outline-none focus:border-slate-400 text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsWordModalOpen(false)}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={saveWordMutation.isPending}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {saveWordMutation.isPending
                      ? "Đang lưu..."
                      : editingWord
                        ? "Cập nhật"
                        : "Thêm mới"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* CONFIRM DELETE WORD */}
        <ConfirmDialog
          open={!!pendingDeleteWord}
          title="Xác nhận xóa từ vựng"
          description={`Bạn có chắc chắn muốn xóa từ "${pendingDeleteWord?.word}"? Nếu từ vựng này đã có dữ liệu học tập SRS của học viên, hệ thống sẽ ngăn chặn xóa để bảo toàn lịch sử.`}
          confirmLabel="Xóa từ"
          isPending={deleteWordMutation.isPending}
          onConfirm={() => {
            if (pendingDeleteWord)
              deleteWordMutation.mutate(pendingDeleteWord.id);
          }}
          onCancel={() => setPendingDeleteWord(null)}
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
            Vocabulary Studio
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950">
            Quản Lý Bộ Từ Vựng & Flashcard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Biên tập bộ chủ đề từ vựng, quản lý thẻ ghi nhớ và xuất bản cho học
            viên theo dõi tiến độ SRS.
          </p>
        </div>
        <button
          onClick={() => {
            setTopicForm({
              title: "",
              description: "",
              categoryName: "600 TỪ VỰNG TOEIC",
              level: "INTERMEDIATE",
              isPro: false,
            });
            setPendingVocabWords([]);
            setVocabFullDraft(null);
            setIsTopicModalOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors shadow-sm"
        >
          <Plus size={16} /> Tạo bộ từ vựng mới
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
            placeholder="Tìm kiếm theo tên chủ đề hoặc danh mục..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-400 shadow-xs"
          />
        </div>
        <select
          aria-label="Lọc trạng thái bộ từ vựng"
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
                        {topic.categoryName || "Từ vựng"}
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
                          "Chưa có mô tả cho bộ từ vựng này."}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3.5 text-xs text-slate-500">
                    <span className="font-semibold text-slate-600">
                      {topic._count?.words || topic.totalWords || 0} từ vựng
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
                        title="Xóa bộ từ vựng"
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
          Không tìm thấy bộ từ vựng nào. Hãy tạo bộ từ vựng đầu tiên!
        </div>
      )}

      {/* MODAL: CREATE TOPIC */}
      {isTopicModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900">Tạo bộ từ vựng mới</h3>
              <button
                onClick={() => setIsTopicModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="max-w-[15rem] text-xs leading-5 text-slate-600">
                AI soạn chủ đề và danh sách từ nháp; Apply chỉ điền local, chưa lưu.
              </p>
              <div className="flex items-center gap-2">
                <input
                  aria-label="Số từ trong full draft Vocabulary"
                  type="number"
                  min={1}
                  max={30}
                  value={vocabFullDraftCount}
                  onChange={(event) => setVocabFullDraftCount(Math.min(30, Math.max(1, Number(event.target.value) || 1)))}
                  className="w-14 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-center text-xs text-slate-900 outline-none focus:ring-2 focus:ring-slate-400"
                />
                <button type="button" onClick={() => void handleSuggestVocabFullDraft()} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700">
                  AI soạn chủ đề từ vựng
                </button>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createTopicMutation.mutate({
                  dto: topicForm,
                  words: pendingVocabWords.filter((word) => !word.excluded),
                });
              }}
              className="space-y-3.5 text-sm"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên bộ từ vựng *
                </label>
                <input
                  type="text"
                  value={topicForm.title}
                  onChange={(e) =>
                    setTopicForm({ ...topicForm, title: e.target.value })
                  }
                  placeholder="e.g. Contract & Negotiations"
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chuyên mục lớn
                </label>
                <input
                  type="text"
                  value={topicForm.categoryName}
                  onChange={(e) =>
                    setTopicForm({ ...topicForm, categoryName: e.target.value })
                  }
                  placeholder="e.g. 600 TỪ VỰNG TOEIC"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cấp độ tham chiếu cho AI (không lưu ở chủ đề)
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
                <p className="mt-1 text-[11px] text-slate-500">
                  VocabTopic hiện không có trường cấp độ; giá trị này chỉ dùng
                  làm ngữ cảnh cho AI soạn nháp.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mô tả (tùy chọn)
                </label>
                <textarea
                  rows={2}
                  value={topicForm.description}
                  onChange={(e) =>
                    setTopicForm({ ...topicForm, description: e.target.value })
                  }
                  placeholder="Mô tả nội dung hoặc ngữ cảnh sử dụng..."
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

      {vocabFullDraft && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="vocab-full-draft-title" className="max-h-[calc(100dvh-2rem)] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
              <div>
                <h3 id="vocab-full-draft-title" className="font-bold text-slate-900">Review full draft Vocabulary</h3>
                <p className="mt-1 text-xs text-slate-500">Sửa hoặc loại từ trước khi Apply. Chỉ nút Tạo bản nháp mới ghi CMS.</p>
              </div>
              <button type="button" aria-label="Đóng review Vocabulary" onClick={() => setVocabFullDraft(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
            </div>
            <div className="space-y-4 py-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-700">Tên chủ đề<input value={vocabFullDraft.title} onChange={(event) => setVocabFullDraft((current) => current ? { ...current, title: event.target.value } : current)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900" /></label>
                <label className="text-xs font-semibold text-slate-700">Chuyên mục<input value={vocabFullDraft.categoryName} onChange={(event) => setVocabFullDraft((current) => current ? { ...current, categoryName: event.target.value } : current)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900" /></label>
              </div>
              <div className="space-y-3">
                {vocabFullDraft.words.map((word, index) => (
                  <div key={`${word.word}-${index}`} className={`rounded-xl border p-3 ${word.excluded ? "bg-slate-50 opacity-60" : "bg-white"}`}>
                    <div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-600">Từ {index + 1}</span><button type="button" onClick={() => setVocabFullDraft((current) => current ? { ...current, words: current.words.map((item, itemIndex) => itemIndex === index ? { ...item, excluded: !item.excluded } : item) } : current)} className="text-xs font-semibold text-slate-500 underline">{word.excluded ? "Khôi phục" : "Loại từ"}</button></div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="text-xs font-semibold text-slate-700">Từ vựng<input disabled={word.excluded} value={word.word} onChange={(event) => setVocabFullDraft((current) => current ? { ...current, words: current.words.map((item, itemIndex) => itemIndex === index ? { ...item, word: event.target.value } : item) } : current)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900" /></label>
                      <label className="text-xs font-semibold text-slate-700">Loại từ<input disabled={word.excluded} value={word.pos || ""} onChange={(event) => setVocabFullDraft((current) => current ? { ...current, words: current.words.map((item, itemIndex) => itemIndex === index ? { ...item, pos: event.target.value } : item) } : current)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900" /></label>
                    </div>
                    <label className="mt-3 block text-xs font-semibold text-slate-700">Nghĩa<input disabled={word.excluded} value={word.meaning} onChange={(event) => setVocabFullDraft((current) => current ? { ...current, words: current.words.map((item, itemIndex) => itemIndex === index ? { ...item, meaning: event.target.value } : item) } : current)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900" /></label>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-700">Ví dụ tiếng Anh<textarea disabled={word.excluded} rows={2} value={word.exampleEn || ""} onChange={(event) => setVocabFullDraft((current) => current ? { ...current, words: current.words.map((item, itemIndex) => itemIndex === index ? { ...item, exampleEn: event.target.value } : item) } : current)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900" /></label><label className="text-xs font-semibold text-slate-700">Ví dụ tiếng Việt<textarea disabled={word.excluded} rows={2} value={word.exampleVi || ""} onChange={(event) => setVocabFullDraft((current) => current ? { ...current, words: current.words.map((item, itemIndex) => itemIndex === index ? { ...item, exampleVi: event.target.value } : item) } : current)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900" /></label></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" onClick={() => setVocabFullDraft(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700">Bỏ qua</button><button type="button" onClick={() => { const words = vocabFullDraft.words.filter((word) => !word.excluded && word.word.trim() && word.meaning.trim()); if (!vocabFullDraft.title.trim() || !words.length) { toast.error("Full draft cần tên chủ đề và ít nhất một từ hợp lệ."); return; } setTopicForm((current) => ({ ...current, title: vocabFullDraft.title, categoryName: vocabFullDraft.categoryName })); setPendingVocabWords(words); setVocabFullDraft(null); toast.success("Đã Apply full draft vào form. Chưa ghi database."); }} className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800">Apply vào form</button></div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE TOPIC */}
      <ConfirmDialog
        open={!!pendingDeleteTopic}
        title="Xác nhận xóa bộ từ vựng"
        description={`Bạn có chắc chắn muốn xóa bộ từ vựng "${pendingDeleteTopic?.title}"? Toàn bộ danh sách từ trong bộ sẽ bị xóa. Nếu bộ đã có tiến trình học SRS của học viên, hệ thống sẽ từ chối để bảo toàn lịch sử.`}
        confirmLabel="Xóa bộ từ"
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
