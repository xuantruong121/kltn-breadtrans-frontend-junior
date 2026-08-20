"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { 
  Mic, 
  Plus, 
  Loader2, 
  Search, 
  Trash2, 
  X
} from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import { Button3D } from "@/components/ui";
import toast from "react-hot-toast";

export default function AdminSpeakingPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [targetText, setTargetText] = useState("");
  const [category, setCategory] = useState("COMMUNICATION");
  const [difficulty, setDifficulty] = useState("BEGINNER");

  const { data: exercises, isLoading } = useQuery<any[]>({
    queryKey: ["admin-speaking"],
    queryFn: async () => {
      const res: any = await axiosClient.get("/admin/speaking/exercises");
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (dto: any) => {
      return axiosClient.post("/admin/speaking/exercises", dto);
    },
    onSuccess: () => {
      toast.success("Tạo bài tập phát âm thành công!");
      setIsCreateModalOpen(false);
      setTitle("");
      setTargetText("");
      queryClient.invalidateQueries({ queryKey: ["admin-speaking"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Có lỗi xảy ra");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return axiosClient.delete(`/admin/speaking/exercises/${id}`);
    },
    onSuccess: () => {
      toast.success("Đã xóa bài tập phát âm!");
      queryClient.invalidateQueries({ queryKey: ["admin-speaking"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Có lỗi xảy ra");
    },
  });

  const handleCreateExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !targetText.trim()) {
      toast.error("Vui lòng nhập đầy đủ tiêu đề và câu mẫu tiếng Anh!");
      return;
    }
    createMutation.mutate({
      title: title.trim(),
      targetText: targetText.trim(),
      category,
      difficulty,
    });
  };

  const filtered = exercises?.filter(
    (ex) =>
      ex.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.targetText.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-purple-600 p-3.5 rounded-2xl text-white shadow-sm">
            <Mic size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800">Quản Lý Luyện Phát Âm</h1>
            <p className="text-slate-400 font-bold text-sm">
              Quản lý câu mẫu và tiêu chuẩn chấm điểm phát âm bằng Azure AI
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
        >
          <Plus size={20} /> Tạo Bài Tập Mới
        </button>
      </div>

      {/* EXERCISES CONTAINER */}
      <div className="bg-white rounded-[2rem] border-4 border-slate-200 shadow-[0_8px_0_0_#e2e8f0] p-6 space-y-6">
        {/* SEARCH BAR */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Tìm kiếm bài tập phát âm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-purple-400 font-bold text-sm"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-purple-600" size={40} />
          </div>
        ) : filtered && filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map((ex) => (
              <motion.div
                key={ex.id}
                whileHover={{ y: -3 }}
                className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-6 flex flex-col justify-between hover:border-purple-300 transition-colors space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-purple-100 text-purple-700 border border-purple-200">
                        {ex.category}
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${
                          ex.difficulty === "BEGINNER"
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                            : ex.difficulty === "INTERMEDIATE"
                            ? "bg-amber-100 text-amber-700 border-amber-200"
                            : "bg-rose-100 text-rose-700 border-rose-200"
                        }`}
                      >
                        {ex.difficulty}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        if (confirm(`Bạn có chắc muốn xóa bài tập "${ex.title}"?`)) {
                          deleteMutation.mutate(ex.id);
                        }
                      }}
                      className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg transition-colors cursor-pointer"
                      title="Xóa bài tập"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <h3 className="text-base font-black text-slate-800">{ex.title}</h3>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400">Câu mẫu đọc:</span>
                  <p className="text-sm font-extrabold text-purple-900 leading-relaxed italic">
                    &ldquo;{ex.targetText}&rdquo;
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-slate-400 font-bold">
            Chưa có bài tập phát âm nào. Hãy bấm &quot;Tạo Bài Tập Mới&quot; để thêm câu mẫu!
          </div>
        )}
      </div>

      {/* CREATE EXERCISE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white max-w-md w-full rounded-[2.5rem] border-4 border-slate-200 shadow-[0_12px_0_0_#cbd5e1] p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-xl font-black text-slate-800">Tạo Bài Tập Phát Âm Mới</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateExercise} className="space-y-4">
              <div>
                <label className="text-xs font-black text-slate-500 uppercase mb-1 block">Tiêu đề bài tập</label>
                <input
                  type="text"
                  placeholder="VD: Giao tiếp văn phòng - Chào hỏi"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 font-bold text-sm outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase mb-1 block">
                  Câu mẫu tiếng Anh (Học sinh sẽ phát âm theo câu này)
                </label>
                <textarea
                  rows={3}
                  placeholder="VD: Good morning, could you please send me the financial report?"
                  value={targetText}
                  onChange={(e) => setTargetText(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 font-bold text-sm outline-none focus:border-purple-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase mb-1 block">Chủ đề</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-2.5 font-bold text-xs outline-none"
                  >
                    <option value="COMMUNICATION">Giao tiếp hàng ngày</option>
                    <option value="BUSINESS">Công sở & Kinh doanh</option>
                    <option value="TRAVEL">Du lịch & Khách sạn</option>
                    <option value="ACADEMIC">Học thuật TOEIC</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-500 uppercase mb-1 block">Độ khó</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-2.5 font-bold text-xs outline-none"
                  >
                    <option value="BEGINNER">Cơ bản (Beginner)</option>
                    <option value="INTERMEDIATE">Trung cấp (Intermediate)</option>
                    <option value="ADVANCED">Nâng cao (Advanced)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-slate-500 font-bold text-sm"
                >
                  Hủy
                </button>
                <Button3D type="submit" variant="purple" size="md" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Đang lưu..." : "Lưu Bài Tập"}
                </Button3D>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
