"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Library, Loader2, PlayCircle, CheckCircle2, Lock, RotateCcw } from "lucide-react";
import Link from "next/link";
import { vocabService, type VocabTopic } from "@/lib/api/services/vocab.service";
import { BackButton } from "@/components/ui";
import { PremiumVocabPaywallModal } from "@/components/subscription/PremiumVocabPaywallModal";
import { isVocabTopicLocked } from "@/modules/subscription/planLogic";

export default function VocabTopicsPage() {
  const [paywallTopic, setPaywallTopic] = useState<VocabTopic | null>(null);
  const { data: topicsData, isLoading, isError, refetch } = useQuery({
    queryKey: ["vocab-topics"],
    queryFn: vocabService.getTopics,
  });
  const topics = topicsData?.topics ?? [];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <BackButton href="/flashcard" label="Quay lại Flashcard & Từ vựng" />
      </div>

      <div className="flex items-center gap-4 mb-8">
        <div className="bg-junior-orange p-4 rounded-2xl text-white">
          <Library size={32} />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100">Từ Vựng (Flashcards)</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Chọn một bộ từ vựng để bắt đầu học nhé!</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="animate-spin text-junior-orange" size={48} />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50/60 p-8 text-center dark:border-rose-900/60 dark:bg-rose-950/20">
          <p className="text-sm font-bold text-rose-800 dark:text-rose-200">
            Không thể tải danh sách chủ đề từ vựng.
          </p>
          <p className="mt-1 text-xs text-rose-700 dark:text-rose-300">
            Kiểm tra kết nối mạng rồi thử lại.
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-rose-300 bg-white px-4 text-xs font-bold text-rose-800 hover:bg-rose-100 dark:border-rose-800 dark:bg-slate-900 dark:text-rose-200 dark:hover:bg-rose-950/40"
          >
            <RotateCcw size={14} aria-hidden="true" />
            Thử lại
          </button>
        </div>
      ) : topics && topics.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {topics.map((topic, index) => {
            const isLocked = isVocabTopicLocked(topic);
            const isCompleted = !isLocked && topic.learnedCount >= topic.totalWords && topic.totalWords > 0;
            const progressPercent = topic.totalWords > 0 ? Math.round((topic.learnedCount / topic.totalWords) * 100) : 0;
            
            return (
            <motion.div
              key={topic.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -6 }}
              className={`bg-white dark:bg-slate-900 rounded-2xl border-2 overflow-hidden shadow-sm flex flex-col relative ${
                isLocked
                  ? 'border-amber-300/80 dark:border-amber-900/60'
                  : isCompleted
                    ? 'border-emerald-400 dark:border-emerald-700'
                    : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              {isLocked ? (
                <div className="absolute top-4 right-4 z-10 inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-900 shadow-xs dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                  <Lock size={12} aria-hidden="true" />
                  <span>Premium</span>
                </div>
              ) : isCompleted ? (
                <div className="absolute top-4 right-4 z-10 bg-emerald-500 text-white p-2 rounded-full shadow-lg" title="Đã hoàn thành">
                  <CheckCircle2 size={24} />
                </div>
              ) : null}

              <div className={`h-40 relative ${
                isLocked
                  ? 'bg-amber-50/50 dark:bg-amber-950/20'
                  : isCompleted
                    ? 'bg-emerald-50 dark:bg-emerald-950/40'
                    : 'bg-orange-100 dark:bg-orange-950/30'
              }`}>
                {topic.iconUrl ? (
                  <div className="absolute inset-0 flex items-center justify-center text-6xl">
                    {topic.iconUrl}
                  </div>
                ) : (
                  <div className={`absolute inset-0 flex items-center justify-center ${
                    isLocked
                      ? 'text-amber-300 dark:text-amber-700'
                      : isCompleted
                        ? 'text-emerald-300 dark:text-emerald-600'
                        : 'text-orange-300 dark:text-orange-600'
                  }`}>
                    {isLocked ? <Lock size={56} /> : <Library size={64} />}
                  </div>
                )}
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2 line-clamp-1">{topic.title}</h3>
                <div className="text-slate-500 dark:text-slate-400 font-medium text-sm mb-4 flex-1">
                  <p className="mb-2">{topic.categoryName}</p>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 mb-1 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        isLocked ? 'bg-amber-400' : isCompleted ? 'bg-emerald-500' : 'bg-junior-orange'
                      }`}
                      style={{ width: `${progressPercent}%` }} 
                    />
                  </div>
                  <div className="flex justify-between text-xs font-bold mt-1">
                    <span className={isLocked ? 'text-amber-700 dark:text-amber-400' : isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-500 dark:text-orange-400'}>
                      {topic.learnedCount || 0} / {topic.totalWords} từ
                    </span>
                    <span className="text-slate-400 dark:text-slate-500">{progressPercent}%</span>
                  </div>
                </div>
                
                {isLocked ? (
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setPaywallTopic(topic)}
                    className="w-full flex items-center justify-center gap-2 text-amber-900 dark:text-amber-200 font-bold p-3 rounded-xl cursor-pointer bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 border border-amber-300 dark:border-amber-800 shadow-2xs transition-colors"
                  >
                    <Lock size={18} />
                    <span>Mở khóa với Plus</span>
                  </motion.button>
                ) : (
                  <Link href={`/practice/vocab/${topic.id}`}>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full btn-orange-3d flex items-center justify-center gap-2 text-white font-bold p-3 rounded-xl cursor-pointer ${isCompleted ? 'bg-emerald-500 hover:bg-emerald-600 border-emerald-700' : 'bg-junior-orange hover:bg-orange-500 border-orange-700'}`}
                    >
                      {isCompleted ? 'Ôn Tập Lại' : 'Học Ngay'} <PlayCircle size={20} strokeWidth={3} />
                    </motion.button>
                  </Link>
                )}
              </div>
            </motion.div>
          )})}
        </div>
      ) : (
        <div className="bg-slate-50 p-12 rounded-2xl border-2 border-dashed border-slate-300 text-center">
          <p className="text-slate-500 font-medium text-lg">Chưa có bộ từ vựng nào được tạo.</p>
        </div>
      )}

      <PremiumVocabPaywallModal
        isOpen={!!paywallTopic}
        onClose={() => setPaywallTopic(null)}
        topicTitle={paywallTopic?.title}
      />
    </div>
  );
}
