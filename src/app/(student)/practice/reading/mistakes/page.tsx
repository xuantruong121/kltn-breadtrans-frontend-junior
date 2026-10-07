"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";
import { readingService } from "@/lib/api/services/reading.service";
import { readingSubskillLabel } from "../components/readingTrackingLogic";

export default function ReadingMistakesPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["reading-tracking"],
    queryFn: readingService.getTracking,
  });

  if (isLoading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="animate-spin text-rose-600" size={32} /></div>;
  }

  if (isError || !data) {
    return <div className="mx-auto max-w-3xl rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-bold text-rose-800">Không thể tải lỗi Reading. Vui lòng thử lại sau.</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-20">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/practice/reading" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-300">
            <ArrowLeft size={14} /> Quay lại Reading
          </Link>
          <h1 className="mt-3 text-2xl font-black text-slate-900 dark:text-slate-100">Lỗi cần xem lại</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Các câu trả lời sai được tái dựng từ những lần nộp Reading đã hoàn thành.</p>
        </div>
        <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 text-center">
          <p className="text-[11px] font-black uppercase tracking-wide text-rose-700 dark:text-rose-300">Tổng lỗi</p>
          <p className="mt-1 text-2xl font-black text-rose-800 dark:text-rose-200">{data.mistakes.total}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {data.mistakes.bySubskill.map((item) => (
          <div key={item.subskill} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <p className="text-xs font-black text-slate-800 dark:text-slate-100">{readingSubskillLabel(item.subskill)}</p>
            <p className="mt-1 text-2xl font-black text-rose-600 dark:text-rose-300">{item.count}</p>
          </div>
        ))}
      </div>

      {data.mistakes.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20 p-10 text-center">
          <AlertTriangle className="mx-auto text-emerald-600" size={30} />
          <p className="mt-3 text-sm font-black text-emerald-800 dark:text-emerald-200">Chưa có lỗi Reading cần xem lại.</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Hãy hoàn thành một bài Reading để hệ thống bắt đầu theo dõi.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.mistakes.items.map((mistake, index) => (
            <article key={`${mistake.date}-${mistake.subskill}-${index}`} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-full bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 text-[11px] font-black text-rose-700 dark:text-rose-300">{readingSubskillLabel(mistake.subskill)}</span>
                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">{new Date(mistake.date).toLocaleDateString("vi-VN")}</span>
              </div>
              <h2 className="mt-3 text-base font-black text-slate-900 dark:text-slate-100">{mistake.question}</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/20 p-3">
                  <p className="text-[10px] font-black uppercase tracking-wide text-rose-700 dark:text-rose-300">Bạn đã trả lời</p>
                  <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">{mistake.yourAnswer || "Bỏ trống"}</p>
                </div>
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/20 p-3">
                  <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Đáp án chuẩn</p>
                  <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">{mistake.answerAvailable ? mistake.correctAnswer : "Đáp án chuẩn chưa khả dụng"}</p>
                </div>
              </div>
              {mistake.explanation && <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300"><span className="font-black">Giải thích:</span> {mistake.explanation}</p>}
              <p className="mt-3 text-xs font-semibold text-slate-400 dark:text-slate-500">Nguồn: {mistake.source}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
