"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Target, Plus, Loader2, Search, Edit2, Trash2 } from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";

export default function AdminPracticePage() {
  const { data: topics, isLoading } = useQuery({
    queryKey: ["admin-practice-topics"],
    queryFn: async () => {
      const res = await axiosClient.get("/practice/topics");
      return Array.isArray(res) ? res : [];
    }
  });

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="bg-blue-500 p-4 rounded-2xl text-white">
            <Target size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-slate-800">Quản lý Chủ đề Luyện Tập</h1>
            <p className="text-slate-500 font-medium mt-1">Quản lý các bài đọc hiểu và bài tập nâng cao.</p>
          </div>
        </div>
        
        <button className="btn-primary-3d px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold flex items-center gap-2 shadow-sm border-b-4 border-blue-700">
          <Plus size={20} /> Tạo chủ đề mới
        </button>
      </div>

      <div className="bg-white rounded-[2rem] border-4 border-slate-100 shadow-sm overflow-hidden p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text"
              placeholder="Tìm kiếm chủ đề luyện tập..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-blue-400 transition-colors"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="animate-spin text-blue-500" size={48} />
          </div>
        ) : topics && topics.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {topics.map((topic: any, index: number) => (
              <motion.div
                key={topic.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-6 flex items-center gap-6 hover:border-blue-200 transition-colors"
              >
                <div className="text-5xl bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                  {topic.iconUrl || '🎯'}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-xl font-bold text-slate-800 line-clamp-1">{topic.name}</h3>
                    <div className="flex gap-1 shrink-0">
                      <button className="p-1 text-slate-400 hover:text-blue-500 transition-colors"><Edit2 size={16} /></button>
                      <button className="p-1 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <p className="text-slate-500 font-medium text-sm mb-3 line-clamp-1">{topic.vietnameseName}</p>
                  
                  <div className="flex items-center gap-2">
                    <span className="bg-slate-200 text-slate-600 px-2 py-1 rounded text-xs font-bold uppercase">{topic.category}</span>
                    <span className="text-slate-400 text-sm font-medium">Thứ tự: {topic.order}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center p-12 text-slate-500 font-medium border-2 border-dashed border-slate-200 rounded-2xl">
            Chưa có chủ đề luyện tập nào.
          </div>
        )}
      </div>
    </div>
  );
}
