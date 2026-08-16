"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, BookOpen, Clock, ChevronRight, ListChecks } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { readingService } from "@/lib/api/services/reading.service";

export default function ReadingTopicDetailPage() {
  const params = useParams();
  const router = useRouter();
  const topicId = Number(params.id);

  const { data: topic, isLoading } = useQuery({
    queryKey: ["reading-topic", topicId],
    queryFn: () => readingService.getTopicById(topicId),
    enabled: !!topicId,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-junior-green" size={48} />
      </div>
    );
  }

  // Handle both possible structures (depending on if Axios interceptor formats it or raw response)
  const actualTopic = (topic as any)?.data || topic;

  if (!actualTopic) {
    return (
      <div className="text-center mt-12 text-slate-500 font-medium">
        Không tìm thấy chủ đề.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold mb-8 transition-colors"
      >
        <ArrowLeft size={20} /> Quay lại
      </button>

      <div className="bg-white p-8 rounded-[2rem] border-4 border-slate-100 shadow-sm mb-8 flex items-center gap-6">
        <div className="bg-green-100 text-green-600 p-6 rounded-2xl">
          <BookOpen size={48} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">{actualTopic.name || actualTopic.title}</h1>
          <p className="text-slate-500 font-medium">{actualTopic.vietnameseName || actualTopic.description || "Hãy chọn một bài đọc bên dưới để bắt đầu luyện tập."}</p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-700 mb-6 flex items-center gap-2">
          <ListChecks size={24} className="text-junior-green" /> Danh sách bài đọc
        </h2>
        
        {actualTopic.quizzes && actualTopic.quizzes.length > 0 ? (
          actualTopic.quizzes.map((quiz: any, index: number) => (
            <Link key={quiz.id} href={`/practice/quizzes/${quiz.id}`}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ x: 8 }}
                className="bg-white p-6 rounded-2xl border-2 border-slate-100 hover:border-green-300 shadow-sm flex items-center justify-between group cursor-pointer transition-all"
              >
                <div>
                  <h3 className="text-xl font-bold text-slate-800 group-hover:text-green-600 transition-colors mb-2">
                    Bài {index + 1}: {quiz.title}
                  </h3>
                  {quiz.description && (
                    <p className="text-slate-500 text-sm line-clamp-2">{quiz.description}</p>
                  )}
                  
                  <div className="flex gap-4 mt-3">
                    {quiz.timeLimit && (
                      <div className="flex items-center gap-1 text-slate-400 text-xs font-bold bg-slate-50 px-2 py-1 rounded-md">
                        <Clock size={14} /> {quiz.timeLimit} phút
                      </div>
                    )}
                    {quiz._count?.questions > 0 && (
                      <div className="flex items-center gap-1 text-slate-400 text-xs font-bold bg-slate-50 px-2 py-1 rounded-md">
                        {quiz._count.questions} câu hỏi
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-slate-50 text-slate-400 group-hover:bg-green-500 group-hover:text-white p-3 rounded-full transition-colors ml-4 shrink-0">
                  <ChevronRight size={24} />
                </div>
              </motion.div>
            </Link>
          ))
        ) : (
          <div className="text-center p-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500">
            Chủ đề này hiện tại chưa có bài đọc nào.
          </div>
        )}
      </div>
    </div>
  );
}
