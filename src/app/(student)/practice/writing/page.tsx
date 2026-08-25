"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { PenTool, Loader2, PlayCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { writingService } from "@/lib/api/services/writing.service";
import { BackButton } from "@/components/ui";

export default function WritingTopicsPage() {
  const router = useRouter();
  
  const { data: topicsData, isLoading } = useQuery({
    queryKey: ["writing-topics"],
    queryFn: writingService.getTopics,
  });
  const topics = (topicsData as any)?.quizzes || topicsData || [];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <BackButton href="/dashboard" label="Quay lại Trang chủ" />
      </div>

      <div className="flex items-center gap-4 mb-8">
        <div className="bg-pink-500 p-4 rounded-2xl text-white">
          <PenTool size={32} />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-slate-800">Luyện Viết (Toeic Part 1-3)</h1>
          <p className="text-slate-500 font-medium mt-1">Viết bài luận và nhận đánh giá chi tiết từ AI Gia sư.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="animate-spin text-pink-500" size={48} />
        </div>
      ) : topics && topics.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {topics.map((topic: any, index: number) => {
            const isCompleted = topic.isCompleted;
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
                <div className="h-40 bg-pink-100 relative">
                  {topic.imageUrl ? (
                    <img src={topic.imageUrl} alt={topic.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-pink-300">
                      <PenTool size={64} />
                    </div>
                  )}
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="text-xl font-bold text-slate-800 mb-2 line-clamp-1">{topic.topicName || topic.title}</h3>
                  <p className="text-slate-500 font-medium text-sm line-clamp-2 mb-6 flex-1">
                    {topic.description || "Chủ đề luyện viết: " + (topic.topicName || topic.title)}
                  </p>
                  <Link href={`/practice/writing/${topic.id}`}>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full flex items-center justify-center gap-2 text-white font-bold p-3 rounded-xl transition-all ${
                        isCompleted 
                          ? 'bg-green-500 shadow-[0_4px_0_0_#15803d] active:shadow-[0_0px_0_0_#15803d]' 
                          : 'bg-pink-500 shadow-[0_4px_0_0_#be185d] active:shadow-[0_0px_0_0_#be185d]'
                      } active:translate-y-1`}
                    >
                      {isCompleted ? 'Ôn Tập Lại' : 'Viết Bài'} <PlayCircle size={20} strokeWidth={3} />
                    </motion.button>
                  </Link>
                </div>
              </motion.div>
            )
          })}
        </div>
      ) : (
        <div className="bg-slate-50 p-12 rounded-2xl border-2 border-dashed border-slate-300 text-center">
          <p className="text-slate-500 font-medium text-lg">Chưa có bài luyện viết nào được tạo.</p>
        </div>
      )}
    </div>
  );
}
