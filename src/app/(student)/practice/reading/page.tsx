"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Book, Loader2, PlayCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { readingService } from "@/lib/api/services/reading.service";
import { useAuthStore } from "@/stores/authStore";
import { AuthGateModal } from "@/components/auth/AuthGateModal";

export default function ReadingTopicsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [authGate, setAuthGate] = useState<{ open: boolean; topicId?: number; topicName?: string }>({ open: false });

  const { data: topics, isLoading } = useQuery({
    queryKey: ["reading-topics"],
    queryFn: readingService.getTopics,
  });
  const topicList = Array.isArray(topics) ? topics : [];

  const handleTopicClick = (e: React.MouseEvent, topicId: number, topicName: string) => {
    if (!user) {
      e.preventDefault();
      setAuthGate({ open: true, topicId, topicName });
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="bg-emerald-600 p-4 rounded-2xl text-white shadow-sm">
          <Book size={32} />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-slate-800">Luyện Đọc (Song ngữ)</h1>
          <p className="text-slate-500 font-medium mt-1">Luyện đọc hiểu dễ dàng hơn với chế độ song ngữ.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="animate-spin text-emerald-600" size={48} />
        </div>
      ) : topicList && topicList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {topicList.map((topic: any, index: number) => {
            const isCompleted = topic.completedArticles >= topic.totalArticles && topic.totalArticles > 0;
            const progressPercent = topic.totalArticles > 0 ? Math.round((topic.completedArticles / topic.totalArticles) * 100) : 0;
            
            return (
              <motion.div
                key={topic.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -6 }}
                className={`bg-white rounded-2xl border overflow-hidden shadow-soft flex flex-col relative transition-shadow hover:shadow-card ${isCompleted ? 'border-emerald-300' : 'border-slate-200'}`}
              >
                {isCompleted && (
                  <div className="absolute top-4 right-4 z-10 bg-emerald-500 text-white p-2 rounded-full shadow-sm" title="Đã hoàn thành">
                    <CheckCircle2 size={20} />
                  </div>
                )}
                <div className={`h-40 relative ${isCompleted ? 'bg-emerald-50' : 'bg-emerald-100/60'}`}>
                  {topic.iconUrl ? (
                    <div className="absolute inset-0 flex items-center justify-center text-5xl">
                      {topic.iconUrl}
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-emerald-300">
                      <Book size={64} />
                    </div>
                  )}
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="text-xl font-bold text-slate-800 mb-2 line-clamp-1">{topic.name}</h3>
                  <div className="text-slate-500 font-medium text-sm flex-1 mb-4">
                    <p className="line-clamp-2 mb-2">
                      {topic.vietnameseName || topic.name}
                    </p>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-2.5 mb-1 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-emerald-500' : 'bg-emerald-500'}`} 
                        style={{ width: `${progressPercent}%` }} 
                      />
                    </div>
                    <div className="flex justify-between text-xs font-bold mt-1">
                      <span className="text-emerald-600">
                        {topic.completedArticles || 0} / {topic.totalArticles || 0} bài
                      </span>
                      <span className="text-slate-400">{progressPercent}%</span>
                    </div>
                  </div>
                  
                  <Link href={`/practice/reading/${topic.id}`} onClick={(e) => handleTopicClick(e, topic.id, topic.name)}>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full flex items-center justify-center gap-2 text-white font-bold p-3 rounded-xl transition-colors ${isCompleted ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                    >
                      {isCompleted ? 'Ôn Tập Lại' : 'Bắt đầu Đọc'} <PlayCircle size={20} strokeWidth={3} />
                    </motion.button>
                  </Link>
                </div>
              </motion.div>
            )
          })}
        </div>
      ) : (
        <div className="bg-slate-50 p-12 rounded-2xl border-2 border-dashed border-slate-300 text-center">
          <p className="text-slate-500 font-medium text-lg">Chưa có bài đọc nào được tạo.</p>
        </div>
      )}

      <AuthGateModal
        isOpen={authGate.open}
        onClose={() => setAuthGate({ open: false })}
        targetLabel={authGate.topicName ? `chủ đề "${authGate.topicName}"` : "bài đọc này"}
        targetRoute={authGate.topicId ? `/practice/reading/${authGate.topicId}` : "/practice/reading"}
        onOpenLogin={() => router.push("/login")}
        onOpenRegister={() => router.push("/register")}
      />
    </div>
  );
}
