"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Library, Loader2, ArrowLeft, PlayCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { vocabService } from "@/lib/api/services/vocab.service";

export default function VocabTopicsPage() {
  const router = useRouter();
  
  const { data: topicsData, isLoading } = useQuery({
    queryKey: ["vocab-topics"],
    queryFn: vocabService.getTopics,
  });
  const topics = (topicsData as any)?.topics || topicsData || [];

  return (
    <div className="max-w-6xl mx-auto">
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold mb-8 transition-colors"
      >
        <ArrowLeft size={20} /> Quay lại Đảo Luyện Tập
      </button>

      <div className="flex items-center gap-4 mb-8">
        <div className="bg-junior-orange p-4 rounded-2xl text-white">
          <Library size={32} />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-slate-800">Từ Vựng (Flashcards)</h1>
          <p className="text-slate-500 font-medium mt-1">Chọn một bộ từ vựng để bắt đầu học nhé!</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="animate-spin text-junior-orange" size={48} />
        </div>
      ) : topics && topics.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {topics.map((topic: any, index: number) => {
            const isCompleted = topic.learnedCount >= topic.totalWords && topic.totalWords > 0;
            const progressPercent = topic.totalWords > 0 ? Math.round((topic.learnedCount / topic.totalWords) * 100) : 0;
            
            return (
            <motion.div
              key={topic.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -6 }}
              className={`bg-white rounded-[2rem] border-4 overflow-hidden shadow-sm flex flex-col relative ${isCompleted ? 'border-green-400' : 'border-slate-200'}`}
            >
              {isCompleted && (
                <div className="absolute top-4 right-4 z-10 bg-green-500 text-white p-2 rounded-full shadow-lg" title="Đã hoàn thành">
                  <CheckCircle2 size={24} />
                </div>
              )}
              <div className={`h-40 relative ${isCompleted ? 'bg-green-50' : 'bg-orange-100'}`}>
                {topic.iconUrl ? (
                  <div className="absolute inset-0 flex items-center justify-center text-6xl">
                    {topic.iconUrl}
                  </div>
                ) : (
                  <div className={`absolute inset-0 flex items-center justify-center ${isCompleted ? 'text-green-300' : 'text-orange-300'}`}>
                    <Library size={64} />
                  </div>
                )}
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="text-xl font-bold text-slate-800 mb-2 line-clamp-1">{topic.title}</h3>
                <div className="text-slate-500 font-medium text-sm mb-4 flex-1">
                  <p className="mb-2">{topic.categoryName}</p>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 rounded-full h-3 mb-1 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-green-500' : 'bg-junior-orange'}`} 
                      style={{ width: `${progressPercent}%` }} 
                    />
                  </div>
                  <div className="flex justify-between text-xs font-bold mt-1">
                    <span className={isCompleted ? 'text-green-600' : 'text-orange-500'}>
                      {topic.learnedCount || 0} / {topic.totalWords} từ
                    </span>
                    <span className="text-slate-400">{progressPercent}%</span>
                  </div>
                </div>
                
                <Link href={`/practice/vocab/${topic.id}`}>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full btn-orange-3d flex items-center justify-center gap-2 text-white font-bold p-3 rounded-xl ${isCompleted ? 'bg-green-500 hover:bg-green-600 border-green-700' : 'bg-junior-orange hover:bg-orange-500 border-orange-700'}`}
                  >
                    {isCompleted ? 'Ôn Tập Lại' : 'Học Ngay'} <PlayCircle size={20} strokeWidth={3} />
                  </motion.button>
                </Link>
              </div>
            </motion.div>
          )})}
        </div>
      ) : (
        <div className="bg-slate-50 p-12 rounded-2xl border-2 border-dashed border-slate-300 text-center">
          <p className="text-slate-500 font-medium text-lg">Chưa có bộ từ vựng nào được tạo.</p>
        </div>
      )}
    </div>
  );
}
