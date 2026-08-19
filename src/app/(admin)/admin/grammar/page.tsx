"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, Plus, Loader2, Search, Trash2, HelpCircle, X } from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import { Button3D } from "@/components/ui";
import toast from "react-hot-toast";

export default function AdminGrammarPage() {
  const queryClient = useQueryClient();
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);

  // Form states for new topic
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState("BEGINNER");
  const [description, setDescription] = useState("");
  const [videoYoutubeId, setVideoYoutubeId] = useState("");
  const [keyFormula, setKeyFormula] = useState("");

  // Form states for new question
  const [qText, setQText] = useState("");
  const [options, setOptions] = useState<string[]>(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState<number>(0);
  const [explanation, setExplanation] = useState("");

  const { data: topics, isLoading } = useQuery<any[]>({
    queryKey: ["admin-grammar-topics"],
    queryFn: async () => {
      const res: any = await axiosClient.get("/grammar/topics");
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  const createTopicMutation = useMutation({
    mutationFn: async (data: any) => {
      return axiosClient.post("/grammar/topics", data);
    },
    onSuccess: () => {
      toast.success("Tạo chủ đề ngữ pháp thành công!");
      setIsTopicModalOpen(false);
      setTitle("");
      setDescription("");
      setVideoYoutubeId("");
      setKeyFormula("");
      queryClient.invalidateQueries({ queryKey: ["admin-grammar-topics"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Có lỗi xảy ra");
    },
  });

  const createQuestionMutation = useMutation({
    mutationFn: async ({ topicId, data }: { topicId: number; data: any }) => {
      return axiosClient.post(`/grammar/topics/${topicId}/questions`, data);
    },
    onSuccess: () => {
      toast.success("Thêm câu hỏi thành công!");
      setIsQuestionModalOpen(false);
      setQText("");
      setOptions(["", "", "", ""]);
      setExplanation("");
      queryClient.invalidateQueries({ queryKey: ["admin-grammar-topics"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Có lỗi xảy ra");
    },
  });

  const deleteTopicMutation = useMutation({
    mutationFn: async (id: number) => {
      return axiosClient.delete(`/grammar/topics/${id}`);
    },
    onSuccess: () => {
      toast.success("Đã xóa chủ đề ngữ pháp!");
      queryClient.invalidateQueries({ queryKey: ["admin-grammar-topics"] });
    },
  });

  const handleCreateTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Vui lòng nhập tên chủ đề!");
      return;
    }
    createTopicMutation.mutate({
      title: title.trim(),
      level,
      description: description.trim(),
      videoYoutubeId: videoYoutubeId.trim(),
      keyFormula: keyFormula.trim(),
    });
  };

  const handleCreateQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTopicId) return;
    if (!qText.trim() || options.some((o) => !o.trim())) {
      toast.error("Vui lòng nhập đầy đủ câu hỏi và 4 đáp án!");
      return;
    }
    createQuestionMutation.mutate({
      topicId: selectedTopicId,
      data: {
        question: qText.trim(),
        options: options.map((o) => o.trim()),
        correctIndex: Number(correctIndex),
        explanation: explanation.trim(),
      },
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 p-3.5 rounded-2xl text-white shadow-sm">
            <GraduationCap size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800">Quản Lý Ngữ Pháp</h1>
            <p className="text-slate-400 font-bold text-sm">
              Thêm, sửa video bài giảng và bộ câu hỏi trắc nghiệm ngữ pháp TOEIC
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsTopicModalOpen(true)}
          className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
        >
          <Plus size={20} /> Tạo Chủ Đề Mới
        </button>
      </div>

      {/* TOPICS LIST */}
      <div className="bg-white rounded-[2rem] border-4 border-slate-200 shadow-[0_8px_0_0_#e2e8f0] p-6">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-emerald-500" size={40} />
          </div>
        ) : topics && topics.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topics.map((t) => (
              <div
                key={t.id}
                className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-6 flex flex-col justify-between hover:border-emerald-300 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-2.5 py-0.5 rounded-full border border-emerald-200">
                      {t.level || "BEGINNER"}
                    </span>
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

                  <h3 className="text-lg font-black text-slate-800 leading-snug">{t.title}</h3>
                  <p className="text-xs font-bold text-slate-500 line-clamp-2">{t.description || "Chưa có mô tả"}</p>

                  {t.keyFormula && (
                    <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-2.5 text-xs font-mono text-emerald-800 font-bold">
                      {t.keyFormula}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-200 mt-4 flex items-center justify-between">
                  <span className="text-xs font-black text-slate-500">
                    {t.totalQuestions || 0} câu hỏi
                  </span>
                  <button
                    onClick={() => {
                      setSelectedTopicId(t.id);
                      setIsQuestionModalOpen(true);
                    }}
                    className="text-xs font-black text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={14} /> Thêm câu hỏi
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-slate-400 font-bold">
            Chưa có chủ đề ngữ pháp nào. Hãy bấm &quot;Tạo Chủ Đề Mới&quot; để bắt đầu!
          </div>
        )}
      </div>

      {/* CREATE TOPIC MODAL */}
      {isTopicModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white max-w-lg w-full rounded-[2.5rem] border-4 border-slate-200 shadow-[0_12px_0_0_#cbd5e1] p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-xl font-black text-slate-800">Tạo Chủ Đề Ngữ Pháp Mới</h2>
              <button onClick={() => setIsTopicModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTopic} className="space-y-3.5">
              <div>
                <label className="text-xs font-black text-slate-500 uppercase mb-1 block">Tên chủ đề</label>
                <input
                  type="text"
                  placeholder="VD: Câu Điều Kiện Loại 1 & 2"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 font-bold text-sm outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase mb-1 block">Trình độ (Level)</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 font-bold text-sm outline-none focus:border-emerald-400"
                >
                  <option value="BEGINNER">BEGINNER (Căn bản)</option>
                  <option value="INTERMEDIATE">INTERMEDIATE (Trung cấp)</option>
                  <option value="ADVANCED">ADVANCED (Nâng cao)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase mb-1 block">Mô tả ngắn</label>
                <textarea
                  rows={2}
                  placeholder="Mô tả trọng tâm kiến thức..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 font-bold text-sm outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase mb-1 block">YouTube Video ID</label>
                <input
                  type="text"
                  placeholder="VD: 10r9ke8Gg3Y"
                  value={videoYoutubeId}
                  onChange={(e) => setVideoYoutubeId(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 font-bold text-sm outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase mb-1 block">Công thức vàng</label>
                <input
                  type="text"
                  placeholder="VD: If + S + V(s/es), S + will + V_inf"
                  value={keyFormula}
                  onChange={(e) => setKeyFormula(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 font-bold text-sm outline-none focus:border-emerald-400 font-mono"
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
                <Button3D type="submit" variant="green" size="md" disabled={createTopicMutation.isPending}>
                  {createTopicMutation.isPending ? "Đang lưu..." : "Tạo Chủ Đề"}
                </Button3D>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE QUESTION MODAL */}
      {isQuestionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white max-w-lg w-full rounded-[2.5rem] border-4 border-slate-200 shadow-[0_12px_0_0_#cbd5e1] p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-xl font-black text-slate-800">Thêm Câu Hỏi Trắc Nghiệm</h2>
              <button onClick={() => setIsQuestionModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateQuestion} className="space-y-3.5">
              <div>
                <label className="text-xs font-black text-slate-500 uppercase mb-1 block">Nội dung câu hỏi</label>
                <textarea
                  rows={2}
                  placeholder="VD: She usually _______ to work by bus."
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 font-bold text-sm outline-none focus:border-emerald-400"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase block">4 Đáp án lựa chọn</label>
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="font-black text-xs text-slate-400 w-5">
                      {String.fromCharCode(65 + i)}:
                    </span>
                    <input
                      type="text"
                      placeholder={`Đáp án ${String.fromCharCode(65 + i)}`}
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...options];
                        newOpts[i] = e.target.value;
                        setOptions(newOpts);
                      }}
                      className="flex-1 bg-slate-50 border-2 border-slate-200 rounded-xl p-2.5 font-bold text-sm outline-none focus:border-emerald-400"
                    />
                    <label className="flex items-center gap-1 text-xs font-bold text-slate-500 cursor-pointer">
                      <input
                        type="radio"
                        name="correctOpt"
                        checked={correctIndex === i}
                        onChange={() => setCorrectIndex(i)}
                      />
                      Đúng
                    </label>
                  </div>
                ))}
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase mb-1 block">Giải thích chi tiết</label>
                <textarea
                  rows={2}
                  placeholder="Giải thích vì sao chọn đáp án này..."
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 font-bold text-sm outline-none focus:border-emerald-400"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuestionModalOpen(false)}
                  className="px-4 py-2 text-slate-500 font-bold text-sm"
                >
                  Hủy
                </button>
                <Button3D type="submit" variant="green" size="md" disabled={createQuestionMutation.isPending}>
                  {createQuestionMutation.isPending ? "Đang lưu..." : "Thêm Câu Hỏi"}
                </Button3D>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
