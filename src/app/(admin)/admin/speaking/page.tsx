"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Mic, Plus, Loader2, Search, Edit2, Trash2 } from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";

export default function AdminSpeakingPage() {
  const { data: exercises, isLoading } = useQuery({
    queryKey: ["admin-speaking"],
    queryFn: async () => {
      const res = await axiosClient.get("/speaking/exercises");
      return Array.isArray(res) ? res : [];
    }
  });

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="bg-purple-500 p-4 rounded-2xl text-white">
            <Mic size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-slate-800">Quản lý Phát Âm</h1>
            <p className="text-slate-500 font-medium mt-1">Quản lý các bài tập luyện đọc và AI chấm điểm.</p>
          </div>
        </div>
        
        <button className="btn-primary-3d px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-bold flex items-center gap-2 shadow-sm border-b-4 border-purple-700">
          <Plus size={20} /> Tạo bài tập mới
        </button>
      </div>

      <div className="bg-white rounded-[2rem] border-4 border-slate-100 shadow-sm overflow-hidden p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text"
              placeholder="Tìm kiếm bài tập..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-purple-400 transition-colors"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="animate-spin text-purple-500" size={48} />
          </div>
        ) : exercises && exercises.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {exercises.map((exercise: any, index: number) => (
              <motion.div
                key={exercise.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-6 flex flex-col hover:border-purple-200 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold text-slate-800 line-clamp-1">{exercise.title}</h3>
                  <div className="flex gap-2">
                    <button className="text-slate-400 hover:text-blue-500 transition-colors"><Edit2 size={18} /></button>
                    <button className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                  </div>
                </div>
                
                <div className="flex gap-2 mb-4">
                  <span className="bg-slate-200 text-slate-700 px-2 py-1 rounded text-xs font-bold uppercase">{exercise.category}</span>
                  <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                    exercise.difficulty === 'BEGINNER' ? 'bg-green-100 text-green-700' :
                    exercise.difficulty === 'INTERMEDIATE' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {exercise.difficulty}
                  </span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 mb-4 flex-1">
                  <p className="text-sm text-slate-600 italic">"{exercise.targetText}"</p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center p-12 text-slate-500 font-medium border-2 border-dashed border-slate-200 rounded-2xl">
            Chưa có bài tập phát âm nào.
          </div>
        )}
      </div>
    </div>
  );
}
