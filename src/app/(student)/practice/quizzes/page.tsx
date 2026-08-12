"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Headphones, Loader2, PlayCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { quizService } from "@/lib/api/services/quiz.service";

export default function ListeningPracticesPage() {
  const router = useRouter();
  
  const { data: quizzes, isLoading } = useQuery({
    queryKey: ["listening-practices"],
    queryFn: quizService.getListeningPractices,
  });

  return (
    <div className="max-w-4xl mx-auto">
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold mb-8 transition-colors"
      >
        <ArrowLeft size={20} /> Quay lại Đảo Luyện Tập
      </button>

      <div className="flex items-center gap-4 mb-8">
        <div className="bg-junior-blue p-4 rounded-2xl text-white">
          <Headphones size={32} />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-slate-800">Luyện Nghe (Chép chính tả)</h1>
          <p className="text-slate-500 font-medium mt-1">Chọn một bài tập để bắt đầu luyện tai nhé!</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="animate-spin text-junior-blue" size={48} />
        </div>
      ) : quizzes && quizzes.length > 0 ? (
        <div className="flex flex-col gap-4">
          {quizzes.map((quiz, index) => (
            <motion.div
              key={quiz.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.01 }}
              className="bg-white p-6 rounded-2xl border-4 border-slate-100 flex items-center justify-between shadow-sm cursor-pointer hover:border-sky-200 transition-colors"
              onClick={() => router.push(`/practice/quizzes/${quiz.id}`)}
            >
              <div>
                <h3 className="text-xl font-bold text-slate-800 mb-1">{quiz.title}</h3>
                <p className="text-slate-500 font-medium text-sm">
                  {quiz._count?.questions || 0} câu hỏi • Luyện nghe TOEIC
                </p>
              </div>
              <div className="bg-sky-100 text-junior-blue p-3 rounded-xl">
                <PlayCircle size={28} />
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-slate-50 p-12 rounded-2xl border-2 border-dashed border-slate-300 text-center">
          <p className="text-slate-500 font-medium text-lg">Chưa có bài luyện nghe nào được tạo.</p>
        </div>
      )}
    </div>
  );
}
