"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BookOpen, CheckCircle2, Library, Loader2, PlayCircle, RotateCcw } from "lucide-react";
import { vocabService } from "@/lib/api/services/vocab.service";

export const FlashcardScreen = () => {
  const { data, isLoading, isError } = useQuery({ queryKey: ["vocab-topics"], queryFn: vocabService.getTopics });
  const topics = data?.topics ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-6 shadow-soft sm:p-8">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-amber-950" aria-hidden="true"><BookOpen size={24} /></span>
          <div>
            <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">Flashcard & từ vựng</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-600">Mỗi bộ từ dưới đây lấy trực tiếp từ hệ thống. Tiến độ đã thuộc, yêu thích và cần ôn được lưu riêng cho tài khoản của bạn.</p>
          </div>
        </div>
      </header>

      {isLoading ? (
        <div className="flex min-h-64 items-center justify-center"><Loader2 className="animate-spin text-amber-600" size={44} aria-label="Đang tải bộ từ vựng" /></div>
      ) : isError ? (
        <div className="rounded-3xl border-2 border-dashed border-rose-200 bg-rose-50 p-8 text-center text-rose-800"><p className="font-black">Không thể tải bộ từ vựng.</p><p className="mt-1 text-sm">Vui lòng thử lại sau.</p></div>
      ) : topics.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-10 text-center"><Library className="mx-auto text-slate-400" size={36} aria-hidden="true" /><p className="mt-3 font-black text-slate-700">Chưa có bộ từ vựng nào</p><p className="mt-1 text-sm text-slate-500">Nội dung sẽ xuất hiện khi được quản trị viên thêm vào hệ thống.</p></div>
      ) : (
        <section className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3" aria-label="Các bộ từ vựng">
          {topics.map((topic, index) => {
            const completed = topic.totalWords > 0 && topic.learnedCount >= topic.totalWords;
            const percent = topic.totalWords > 0 ? Math.round((topic.learnedCount / topic.totalWords) * 100) : 0;
            return (
              <motion.article key={topic.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }} whileHover={{ y: -4 }} className={`relative flex flex-col overflow-hidden rounded-2xl border bg-white shadow-soft hover:shadow-card transition-all ${completed ? "border-emerald-300" : "border-slate-200"}`}>
                {completed && <span className="absolute right-4 top-4 z-10 flex size-9 items-center justify-center rounded-full bg-emerald-500 text-white" title="Đã thuộc toàn bộ từ"><CheckCircle2 size={19} aria-hidden="true" /></span>}
                <div className="flex h-32 items-center justify-center bg-gradient-to-br from-amber-100 to-orange-100 text-amber-500"><Library size={54} aria-hidden="true" /></div>
                <div className="flex flex-1 flex-col p-6">
                  <p className="text-xs font-black text-amber-700">{topic.categoryName}</p>
                  <h2 className="mt-2 line-clamp-2 text-xl font-black text-slate-800">{topic.title}</h2>
                  <p className="mt-2 text-sm font-medium text-slate-500">{topic.totalWords} từ • {topic.needReviewCount} từ cần ôn</p>
                  <div className="mt-5">
                    <div className="mb-1 flex justify-between text-xs font-bold text-slate-500"><span>Tiến độ đã thuộc</span><span>{topic.learnedCount}/{topic.totalWords}</span></div>
                    <div className="h-2.5 overflow-hidden rounded-full border border-amber-200 bg-amber-50"><div className={`h-full transition-[width] ${completed ? "bg-emerald-500" : "bg-amber-400"}`} style={{ width: `${percent}%` }} /></div>
                  </div>
                  <Link href={`/practice/vocab/${topic.id}`} className="mt-6">
                    <span className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black transition ${completed ? "bg-emerald-500 text-white hover:bg-emerald-600" : "bg-amber-400 text-amber-950 hover:bg-amber-500"}`}>
                      {completed ? <RotateCcw size={17} aria-hidden="true" /> : <PlayCircle size={17} aria-hidden="true" />}{completed ? "Ôn lại" : "Bắt đầu học"}
                    </span>
                  </Link>
                </div>
              </motion.article>
            );
          })}
        </section>
      )}
    </div>
  );
};
