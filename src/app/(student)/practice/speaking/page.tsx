"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Mic, Loader2, ArrowLeft, ArrowRight, PlayCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { speakingService } from "@/lib/api/services/speaking.service";

export default function SpeakingExercisesPage() {
  const router = useRouter();
  
  const { data: exercises, isLoading } = useQuery({
    queryKey: ["speaking-exercises"],
    queryFn: speakingService.getExercises,
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
        <div className="bg-purple-500 p-4 rounded-2xl text-white">
          <Mic size={32} />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-slate-800">Luyện Phát Âm (AI Chấm)</h1>
          <p className="text-slate-500 font-medium mt-1">Đọc thành tiếng và để AI đánh giá độ chuẩn xác của bạn nhé!</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="animate-spin text-purple-500" size={48} />
        </div>
      ) : exercises && exercises.length > 0 ? (
        <div className="flex flex-col gap-4">
          {exercises.map((exercise: any, index: number) => {
            const isCompleted = exercise.isCompleted;
            return (
              <motion.div
                key={exercise.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.01 }}
                className={`p-6 rounded-2xl border-4 flex items-center justify-between shadow-sm cursor-pointer transition-colors ${
                  isCompleted 
                    ? 'bg-green-50 border-green-400 hover:border-green-500' 
                    : 'bg-white border-slate-100 hover:border-purple-200'
                }`}
                onClick={() => router.push(`/practice/speaking/${exercise.id}`)}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-bold text-slate-800">{exercise.title}</h3>
                    {isCompleted && (
                      <div className="text-green-500" title="Đã hoàn thành">
                        <CheckCircle2 size={20} />
                      </div>
                    )}
                  </div>
                  <p className="text-slate-500 font-medium text-sm flex gap-2 mt-2">
                    <span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold uppercase">{exercise.category}</span>
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                      exercise.difficulty === 'BEGINNER' ? 'bg-green-100 text-green-700' :
                      exercise.difficulty === 'INTERMEDIATE' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {exercise.difficulty}
                    </span>
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${isCompleted ? 'bg-green-200 text-green-700' : 'bg-purple-100 text-purple-500'}`}>
                  <Mic size={28} />
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="bg-slate-50 p-12 rounded-2xl border-2 border-dashed border-slate-300 text-center">
          <p className="text-slate-500 font-medium text-lg">Chưa có bài luyện phát âm nào được tạo.</p>
        </div>
      )}
    </div>
  );
}
