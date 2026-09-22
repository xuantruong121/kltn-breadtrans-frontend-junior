"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BookOpenCheck, CheckCircle2, Loader2, PlayCircle } from "lucide-react";
import { grammarService } from "@/lib/api/services/grammar.service";
import { GrammarVideoPlayer } from "../components/GrammarVideoPlayer";
import { GrammarQuiz } from "../components/GrammarQuiz";

export const GrammarScreen: React.FC = () => {
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const topicsQuery = useQuery({ queryKey: ["grammar-topics"], queryFn: grammarService.getTopics });
  const selectedTopic = selectedTopicId ?? topicsQuery.data?.[0]?.id ?? null;
  const detailQuery = useQuery({
    queryKey: ["grammar-topic", selectedTopic],
    queryFn: () => grammarService.getTopic(selectedTopic as number),
    enabled: selectedTopic !== null,
  });

  if (topicsQuery.isLoading) {
    return <div className="flex min-h-64 items-center justify-center"><Loader2 className="animate-spin text-emerald-600" size={44} aria-label="Đang tải chủ đề ngữ pháp" /></div>;
  }

  if (topicsQuery.isError || !topicsQuery.data?.length) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-10 text-center">
        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100">Chưa có chủ đề ngữ pháp</h1>
        <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">Nội dung sẽ xuất hiện khi quản trị viên thêm chủ đề vào hệ thống.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6 shadow-2xs sm:p-8">
        <div className="mb-1 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" aria-hidden="true"><BookOpenCheck size={22} /></span>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 sm:text-3xl">Ngữ pháp tiếng Anh</h1>
        </div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Chọn một chủ đề, xem kiến thức trọng tâm và làm bài để lưu tiến độ thật của bạn.</p>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {topicsQuery.data.map((topic, index) => {
          const selected = topic.id === selectedTopic;
          return (
            <motion.button
              key={topic.id}
              type="button"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedTopicId(topic.id)}
              aria-pressed={selected}
              className={`min-h-36 rounded-3xl border p-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${selected ? "border-emerald-300 bg-emerald-50/70 ring-1 ring-emerald-300 dark:border-emerald-700 dark:bg-emerald-950/40 dark:ring-emerald-700" : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"}`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">{topic.level}</span>
                {topic.isCompleted && <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" aria-label="Đã hoàn thành" />}
              </div>
              <h2 className="line-clamp-1 text-base font-extrabold text-slate-800 dark:text-slate-100">{topic.title}</h2>
              <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500 dark:text-slate-400">{topic.description || "Bài học và câu hỏi thực hành."}</p>
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 text-xs font-bold text-slate-500 dark:text-slate-400">
                <span>{topic.totalQuestions} câu hỏi</span>
                <span className="text-emerald-700 dark:text-emerald-400">{topic.isCompleted ? `${topic.lastScore ?? 0}% lần gần nhất` : "Bắt đầu"}</span>
              </div>
            </motion.button>
          );
        })}
      </section>

      {detailQuery.isLoading ? (
        <div className="flex min-h-64 items-center justify-center"><Loader2 className="animate-spin text-emerald-600 dark:text-emerald-400" size={40} aria-label="Đang tải bài học" /></div>
      ) : detailQuery.data ? (
        <section className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7"><GrammarVideoPlayer topic={detailQuery.data} /></div>
          <div className="lg:col-span-5"><GrammarQuiz key={detailQuery.data.id} topicId={detailQuery.data.id} questions={detailQuery.data.questions} /></div>
        </section>
      ) : (
        <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-8 text-center text-slate-500 dark:text-slate-400">
          <PlayCircle className="mx-auto" aria-hidden="true" />
          <p className="mt-2 font-bold">Không thể tải chi tiết bài học.</p>
        </div>
      )}
    </div>
  );
};
