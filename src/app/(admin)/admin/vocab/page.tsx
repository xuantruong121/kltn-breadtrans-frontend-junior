"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { 
  Library, 
  Plus, 
  Loader2, 
  Search, 
  Trash2, 
  X
} from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import { Button3D, Pagination } from "@/components/ui";
import toast from "react-hot-toast";

export default function AdminVocabPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  // Form: Create Topic
  const [topicTitle, setTopicTitle] = useState("");
  const [categoryName, setCategoryName] = useState("600 TỪ VỰNG TOEIC");
  const [isPro] = useState(false);

  // Form: Add Word to Topic
  const [word, setWord] = useState("");
  const [pos, setPos] = useState("noun");
  const [ipaUs, setIpaUs] = useState("");
  const [meaning, setMeaning] = useState("");
  const [exampleEn, setExampleEn] = useState("");
  const [exampleVi, setExampleVi] = useState("");

  const { data: topics, isLoading } = useQuery<any[]>({
    queryKey: ["admin-vocab-topics"],
    queryFn: async () => {
      const res: any = await axiosClient.get("/admin/vocab/topics");
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  const { data: topicDetail, isLoading: isDetailLoading } = useQuery<any>({
    queryKey: ["admin-vocab-topic-detail", selectedTopic?.id],
    queryFn: async () => {
      const res: any = await axiosClient.get(`/vocab/topics/${selectedTopic.id}`);
      return res?.data || res;
    },
    enabled: !!selectedTopic,
  });

  const createTopicMutation = useMutation({
    mutationFn: async (dto: any) => {
      return axiosClient.post("/admin/vocab/topics", dto);
    },
    onSuccess: () => {
      toast.success("Tạo chủ đề từ vựng thành công!");
      setIsTopicModalOpen(false);
      setTopicTitle("");
      queryClient.invalidateQueries({ queryKey: ["admin-vocab-topics"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Có lỗi xảy ra");
    },
  });

  const deleteTopicMutation = useMutation({
    mutationFn: async (id: number) => {
      return axiosClient.delete(`/admin/vocab/topics/${id}`);
    },
    onSuccess: () => {
      toast.success("Đã xóa chủ đề từ vựng!");
      queryClient.invalidateQueries({ queryKey: ["admin-vocab-topics"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Có lỗi xảy ra");
    },
  });

  const addWordMutation = useMutation({
    mutationFn: async (dto: any) => {
      return axiosClient.post(`/admin/vocab/topics/${selectedTopic.id}/words`, dto);
    },
    onSuccess: () => {
      toast.success("Thêm từ vựng mới thành công!");
      setWord("");
      setIpaUs("");
      setMeaning("");
      setExampleEn("");
      setExampleVi("");
      queryClient.invalidateQueries({ queryKey: ["admin-vocab-topic-detail", selectedTopic.id] });
      queryClient.invalidateQueries({ queryKey: ["admin-vocab-topics"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Có lỗi xảy ra");
    },
  });

  const deleteWordMutation = useMutation({
    mutationFn: async (wordId: number) => {
      return axiosClient.delete(`/admin/vocab/words/${wordId}`);
    },
    onSuccess: () => {
      toast.success("Đã xóa từ vựng!");
      queryClient.invalidateQueries({ queryKey: ["admin-vocab-topic-detail", selectedTopic.id] });
      queryClient.invalidateQueries({ queryKey: ["admin-vocab-topics"] });
    },
  });

  const handleCreateTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicTitle.trim()) {
      toast.error("Vui lòng nhập tên chủ đề!");
      return;
    }
    createTopicMutation.mutate({
      title: topicTitle.trim(),
      categoryName: categoryName.trim(),
      isPro,
    });
  };

  const handleAddWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim() || !meaning.trim()) {
      toast.error("Vui lòng nhập từ vựng và định nghĩa!");
      return;
    }
    addWordMutation.mutate({
      word: word.trim(),
      pos,
      ipaUs: ipaUs.trim(),
      meaning: meaning.trim(),
      exampleEn: exampleEn.trim(),
      exampleVi: exampleVi.trim(),
    });
  };

  const filteredTopics = topics?.filter((t) =>
    t.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil((filteredTopics?.length || 0) / pageSize);
  const paginatedTopics = filteredTopics?.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-orange-500 p-3.5 rounded-2xl text-white shadow-sm">
            <Library size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800">Quản Lý Bộ Từ Vựng</h1>
            <p className="text-slate-400 font-bold text-sm">
              Thêm, sửa các chủ đề từ vựng flashcard và danh sách từ TOEIC
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsTopicModalOpen(true)}
          className="px-5 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
        >
          <Plus size={20} /> Tạo Chủ Đề Mới
        </button>
      </div>

      {/* TOPICS CONTAINER */}
      <div className="bg-white rounded-[2rem] border-4 border-slate-200 shadow-[0_8px_0_0_#e2e8f0] p-6 space-y-6">
        {/* SEARCH BAR */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Tìm kiếm chủ đề từ vựng..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-orange-400 font-bold text-sm"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-orange-500" size={40} />
          </div>
        ) : filteredTopics && filteredTopics.length > 0 ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedTopics?.map((t) => (
                <motion.div
                  key={t.id}
                  whileHover={{ y: -3 }}
                  className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-6 flex flex-col justify-between hover:border-orange-300 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-3xl">📚</span>
                      <button
                        onClick={() => {
                          if (confirm(`Bạn có chắc muốn xóa chủ đề "${t.title}"?`)) {
                            deleteTopicMutation.mutate(t.id);
                          }
                        }}
                        className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg transition-colors cursor-pointer"
                        title="Xóa chủ đề"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div>
                      <h3 className="text-lg font-black text-slate-800 leading-snug">{t.title}</h3>
                      <p className="text-xs font-bold text-slate-400">{t.categoryName}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200 mt-4 flex items-center justify-between">
                    <span className="text-xs font-black text-slate-500">
                      {t._count?.words || t.totalWords || 0} từ vựng
                    </span>
                    <button
                      onClick={() => setSelectedTopic(t)}
                      className="text-xs font-black text-orange-600 hover:text-orange-700 cursor-pointer flex items-center gap-1"
                    >
                      Quản lý từ &rarr;
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* PAGINATION */}
            <div className="pt-2">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredTopics?.length || 0}
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
          <div className="text-center py-16 text-slate-400 font-bold">
            Chưa có chủ đề từ vựng nào. Hãy bấm &quot;Tạo Chủ Đề Mới&quot; để bắt đầu!
          </div>
        )}
      </div>

      {/* CREATE TOPIC MODAL */}
      {isTopicModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white max-w-md w-full rounded-[2.5rem] border-4 border-slate-200 shadow-[0_12px_0_0_#cbd5e1] p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-xl font-black text-slate-800">Tạo Chủ Đề Từ Vựng Mới</h2>
              <button onClick={() => setIsTopicModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTopic} className="space-y-4">
              <div>
                <label className="text-xs font-black text-slate-500 uppercase mb-1 block">Tên chủ đề</label>
                <input
                  type="text"
                  placeholder="VD: Contracts & Agreements"
                  value={topicTitle}
                  onChange={(e) => setTopicTitle(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 font-bold text-sm outline-none focus:border-orange-400"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase mb-1 block">Tên danh mục</label>
                <input
                  type="text"
                  placeholder="VD: 600 TỪ VỰNG TOEIC"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 font-bold text-sm outline-none focus:border-orange-400"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTopicModalOpen(false)}
                  className="px-4 py-2 text-slate-500 font-bold text-sm"
                >
                  Hủy
                </button>
                <Button3D type="submit" variant="orange" size="md" disabled={createTopicMutation.isPending}>
                  {createTopicMutation.isPending ? "Đang lưu..." : "Tạo Chủ Đề"}
                </Button3D>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANAGE WORDS DRAWER / MODAL */}
      {selectedTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white max-w-2xl w-full rounded-[2.5rem] border-4 border-slate-200 shadow-[0_12px_0_0_#cbd5e1] p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-black text-slate-800">
                  Từ Vựng: {selectedTopic.title}
                </h2>
                <span className="text-xs font-bold text-slate-400">{selectedTopic.categoryName}</span>
              </div>
              <button onClick={() => setSelectedTopic(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            {/* FORM: ADD WORD */}
            <form onSubmit={handleAddWord} className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-black text-slate-700 uppercase">Thêm từ mới vào chủ đề</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Từ vựng (VD: contract)"
                  value={word}
                  onChange={(e) => setWord(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl p-2.5 font-bold text-xs outline-none"
                />
                <select
                  value={pos}
                  onChange={(e) => setPos(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl p-2.5 font-bold text-xs outline-none"
                >
                  <option value="noun">Danh từ (n)</option>
                  <option value="verb">Động từ (v)</option>
                  <option value="adjective">Tính từ (adj)</option>
                  <option value="adverb">Trạng từ (adv)</option>
                </select>
                <input
                  type="text"
                  placeholder="Phiên âm IPA (/kɑːntrækt/)"
                  value={ipaUs}
                  onChange={(e) => setIpaUs(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl p-2.5 font-bold text-xs outline-none font-mono"
                />
              </div>

              <input
                type="text"
                placeholder="Định nghĩa tiếng Việt (VD: hợp đồng, giao kèo)"
                value={meaning}
                onChange={(e) => setMeaning(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-bold text-xs outline-none"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Ví dụ câu tiếng Anh..."
                  value={exampleEn}
                  onChange={(e) => setExampleEn(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl p-2 font-bold text-xs outline-none"
                />
                <input
                  type="text"
                  placeholder="Dịch nghĩa câu ví dụ..."
                  value={exampleVi}
                  onChange={(e) => setExampleVi(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl p-2 font-bold text-xs outline-none"
                />
              </div>

              <div className="flex justify-end pt-1">
                <Button3D type="submit" variant="orange" size="sm" disabled={addWordMutation.isPending}>
                  {addWordMutation.isPending ? "Đang thêm..." : "+ Thêm từ vào danh sách"}
                </Button3D>
              </div>
            </form>

            {/* WORDS LIST */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-slate-500 uppercase">
                Danh sách từ hiện có ({topicDetail?.words?.length || 0})
              </h4>

              {isDetailLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="animate-spin text-orange-500" size={28} />
                </div>
              ) : topicDetail?.words && topicDetail.words.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {topicDetail.words.map((w: any) => (
                    <div
                      key={w.id}
                      className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between hover:bg-slate-50"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-sm text-slate-800">{w.word}</strong>
                          <span className="text-[10px] font-bold text-slate-400 font-mono">/{w.ipaUs || w.ipa}/</span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-black">{w.pos}</span>
                        </div>
                        <p className="text-xs font-bold text-slate-600">{w.meaning}</p>
                      </div>

                      <button
                        onClick={() => deleteWordMutation.mutate(w.id)}
                        className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg"
                        title="Xóa từ"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs font-bold border border-dashed border-slate-200 rounded-xl">
                  Chủ đề này chưa có từ vựng nào. Hãy thêm từ ở khung trên!
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
