"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { PenTool, Plus, Loader2, Search, Edit2, Trash2 } from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";

export default function AdminQuizzesPage() {
  const { data: quizzes, isLoading } = useQuery({
    queryKey: ["admin-quizzes"],
    queryFn: async () => {
      const res = await axiosClient.get("/quizzes");
      return Array.isArray(res) ? res : [];
    }
  });

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-500 p-4 rounded-2xl text-white">
            <PenTool size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-slate-800">Quản lý Đề thi</h1>
            <p className="text-slate-500 font-medium mt-1">Quản lý các đề thi TOEIC, Luyện Nghe, và bài tập Viết.</p>
          </div>
        </div>
        
        <button className="btn-primary-3d px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold flex items-center gap-2 shadow-sm border-b-4 border-emerald-700">
          <Plus size={20} /> Tạo đề thi mới
        </button>
      </div>

      <div className="bg-white rounded-[2rem] border-4 border-slate-100 shadow-sm overflow-hidden p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text"
              placeholder="Tìm kiếm đề thi..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-emerald-400 transition-colors"
            />
          </div>
          <select className="px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none text-slate-600 font-medium">
            <option value="all">Tất cả thể loại</option>
            <option value="TOEIC">TOEIC</option>
            <option value="LISTENING_PRACTICE">Luyện Nghe</option>
            <option value="BILINGUAL_READING">Đọc Song Ngữ</option>
          </select>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="animate-spin text-emerald-500" size={48} />
          </div>
        ) : quizzes && quizzes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-sm uppercase font-bold border-y border-slate-200">
                  <th className="py-4 px-6">ID</th>
                  <th className="py-4 px-6">Tên đề thi</th>
                  <th className="py-4 px-6">Loại</th>
                  <th className="py-4 px-6 text-center">Số câu hỏi</th>
                  <th className="py-4 px-6 text-center">Thời gian</th>
                  <th className="py-4 px-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {quizzes.map((quiz: any) => (
                  <tr key={quiz.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6">#{quiz.id}</td>
                    <td className="py-4 px-6 font-bold">{quiz.title}</td>
                    <td className="py-4 px-6">
                      <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold uppercase">
                        {quiz.type}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">{quiz._count?.questions || 0}</td>
                    <td className="py-4 px-6 text-center">{quiz.timeLimit ? `${quiz.timeLimit} phút` : '-'}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                          <Edit2 size={18} />
                        </button>
                        <button className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center p-12 text-slate-500 font-medium border-2 border-dashed border-slate-200 rounded-2xl">
            Chưa có đề thi nào trong hệ thống.
          </div>
        )}
      </div>
    </div>
  );
}
