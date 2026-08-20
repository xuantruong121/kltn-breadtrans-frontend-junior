"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { 
  Target, 
  Plus, 
  Loader2, 
  Search, 
  Trash2, 
  X
} from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import { Button3D } from "@/components/ui";
import toast from "react-hot-toast";

export default function AdminPracticePage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [vietnameseName, setVietnameseName] = useState("");
  const [category, setCategory] = useState("BILINGUAL_READING");
  const [iconUrl, setIconUrl] = useState("🎯");
  const [order, setOrder] = useState(1);

  const { data: topics, isLoading } = useQuery<any[]>({
    queryKey: ["admin-practice-topics"],
    queryFn: async () => {
      const res: any = await axiosClient.get("/admin/practice-topics");
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (dto: any) => {
      return axiosClient.post("/admin/practice-topics", dto);
    },
    onSuccess: () => {
      toast.success("Tạo chủ đề luyện tập thành công!");
      setIsCreateModalOpen(false);
      setName("");
      setVietnameseName("");
      queryClient.invalidateQueries({ queryKey: ["admin-practice-topics"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Có lỗi xảy ra");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return axiosClient.delete(`/admin/practice-topics/${id}`);
    },
    onSuccess: () => {
      toast.success("Đã xóa chủ đề luyện tập!");
      queryClient.invalidateQueries({ queryKey: ["admin-practice-topics"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Có lỗi xảy ra");
    },
  });

  const handleCreateTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Vui lòng nhập tên chủ đề!");
      return;
    }
    createMutation.mutate({
      name: name.trim(),
      vietnameseName: vietnameseName.trim() || name.trim(),
      category,
      iconUrl: iconUrl || "🎯",
      order: Number(order) || 1,
    });
  };

  const filtered = topics?.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.vietnameseName && t.vietnameseName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-3.5 rounded-2xl text-white shadow-sm">
            <Target size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800">Quản Lý Chủ Đề Luyện Tập</h1>
            <p className="text-slate-400 font-bold text-sm">
              Quản lý các bài đọc hiểu song ngữ và đề luyện tập chuyên đề
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
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
            placeholder="Tìm kiếm chủ đề luyện tập..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-blue-400 font-bold text-sm"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-blue-600" size={40} />
          </div>
        ) : filtered && filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map((topic) => (
              <motion.div
                key={topic.id}
                whileHover={{ y: -3 }}
                className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-6 flex items-center gap-5 hover:border-blue-300 transition-colors"
              >
                <div className="text-4xl bg-white p-3.5 rounded-2xl shadow-xs border border-slate-200 shrink-0">
                  {topic.iconUrl || "🎯"}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-black text-slate-800 truncate">{topic.name}</h3>
                    <button
                      onClick={() => {
                        if (confirm(`Bạn có chắc muốn xóa chủ đề "${topic.name}"?`)) {
                          deleteMutation.mutate(topic.id);
                        }
                      }}
                      className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="Xóa chủ đề"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <p className="text-xs font-bold text-slate-400 truncate mb-2">{topic.vietnameseName}</p>

                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-blue-100 text-blue-700 border border-blue-200">
                      {topic.category}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">
                      Thứ tự: {topic.order || 1} • {topic._count?.quizzes || 0} bài tập
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-slate-400 font-bold">
            Chưa có chủ đề luyện tập nào. Hãy bấm &quot;Tạo Chủ Đề Mới&quot; để thêm!
          </div>
        )}
      </div>

      {/* CREATE TOPIC MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white max-w-md w-full rounded-[2.5rem] border-4 border-slate-200 shadow-[0_12px_0_0_#cbd5e1] p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-xl font-black text-slate-800">Tạo Chủ Đề Luyện Tập Mới</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTopic} className="space-y-4">
              <div>
                <label className="text-xs font-black text-slate-500 uppercase mb-1 block">Tên tiếng Anh (Name)</label>
                <input
                  type="text"
                  placeholder="VD: Business Negotiations"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 font-bold text-sm outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase mb-1 block">Tên tiếng Việt</label>
                <input
                  type="text"
                  placeholder="VD: Đàm phán thương mại"
                  value={vietnameseName}
                  onChange={(e) => setVietnameseName(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 font-bold text-sm outline-none focus:border-blue-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase mb-1 block">Danh mục</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-2.5 font-bold text-xs outline-none"
                  >
                    <option value="BILINGUAL_READING">Đọc Song Ngữ</option>
                    <option value="LISTENING_PRACTICE">Luyện Nghe</option>
                    <option value="TOEIC">TOEIC Practice</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-500 uppercase mb-1 block">Icon Emoji</label>
                  <input
                    type="text"
                    placeholder="VD: 🎯 hoặc 📑"
                    value={iconUrl}
                    onChange={(e) => setIconUrl(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-2.5 font-bold text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase mb-1 block">Thứ tự hiển thị (Order)</label>
                <input
                  type="number"
                  value={order}
                  onChange={(e) => setOrder(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-2.5 font-bold text-xs outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-slate-500 font-bold text-sm"
                >
                  Hủy
                </button>
                <Button3D type="submit" variant="blue" size="md" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Đang lưu..." : "Lưu Chủ Đề"}
                </Button3D>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
