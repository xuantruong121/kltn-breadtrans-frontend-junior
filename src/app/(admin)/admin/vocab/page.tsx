"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Library, Plus, Loader2, Search, Edit2, Trash2 } from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";

export default function AdminVocabPage() {
  const { data: topics, isLoading } = useQuery({
    queryKey: ["admin-vocab-topics"],
    queryFn: async () => {
      const res = await axiosClient.get("/vocab/topics");
      return Array.isArray(res) ? res : [];
    }
  });

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="bg-orange-500 p-4 rounded-2xl text-white">
            <Library size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-slate-800">Quản lý Từ vựng</h1>
            <p className="text-slate-500 font-medium mt-1">Thêm, sửa, xóa các chủ đề từ vựng flashcard.</p>
          </div>
        </div>
        
        <button className="btn-primary-3d px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold flex items-center gap-2 shadow-sm border-b-4 border-orange-700">
          <Plus size={20} /> Tạo chủ đề mới
        </button>
      </div>

      <div className="bg-white rounded-[2rem] border-4 border-slate-100 shadow-sm overflow-hidden p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text"
              placeholder="Tìm kiếm chủ đề..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-orange-400 transition-colors"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="animate-spin text-orange-500" size={48} />
          </div>
        ) : topics && topics.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topics.map((topic: any, index: number) => (
              <motion.div
                key={topic.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-6 flex flex-col hover:border-orange-200 transition-colors"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="text-4xl">{topic.iconUrl || '📚'}</div>
                  <div className="flex gap-2">
                    <button className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                      <Edit2 size={18} />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-1">{topic.title}</h3>
                <p className="text-slate-500 font-medium text-sm mb-4">{topic.categoryName}</p>
                <div className="mt-auto pt-4 border-t border-slate-200 text-slate-500 font-bold flex justify-between items-center">
                  <span>{topic.totalWords} từ vựng</span>
                  <button className="text-orange-500 hover:text-orange-600">Quản lý từ &rarr;</button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center p-12 text-slate-500 font-medium border-2 border-dashed border-slate-200 rounded-2xl">
            Chưa có chủ đề nào trong hệ thống.
          </div>
        )}
      </div>
    </div>
  );
}
