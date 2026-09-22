"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toeicService } from "@/lib/api/services/toeic.service";

export default function ToeicResultPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId: rawAttemptId } = use(params);
  const attemptId = Number(rawAttemptId);
  const router = useRouter();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["toeic-result", attemptId],
    queryFn: () => toeicService.getResult(attemptId),
    enabled: Number.isInteger(attemptId),
  });
  if (isLoading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="animate-spin text-amber-600 dark:text-amber-400" /></div>;
  if (isError || !data) return <div className="mx-auto max-w-xl py-20 text-center text-slate-600 dark:text-slate-400">Chưa thể tải kết quả bài thi.</div>;
  const result = data.practiceResult;
  return (
    <main className="mx-auto max-w-2xl px-4 pb-20 pt-8 sm:pt-12">
      <section className="rounded-3xl border border-emerald-200 dark:border-emerald-900/60 bg-white dark:bg-slate-900 p-5 text-center shadow-sm sm:p-8">
        <CheckCircle2 className="mx-auto text-emerald-600 dark:text-emerald-400" size={44} />
        <p className="mt-4 text-xs font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">Đã hoàn thành bài thi</p>
        <h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100 sm:text-3xl">Kết quả luyện tập TOEIC</h1>
        {result ? (
          <>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{data.disclaimer}</p>
            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/40 p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">Listening</p>
                <p className="mt-1 text-2xl font-black text-sky-700 dark:text-sky-300">{result.listeningCorrect}/{result.listeningTotal}</p>
              </div>
              <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40 p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">Reading</p>
                <p className="mt-1 text-2xl font-black text-amber-700 dark:text-amber-300">{result.readingCorrect}/{result.readingTotal}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">Tổng số câu đúng</p>
                <p className="mt-1 text-2xl font-black text-slate-900 dark:text-slate-100">{result.totalCorrect}/{result.totalQuestions}</p>
              </div>
            </div>
          </>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">Tổng điểm</p>
              <p className="mt-1 text-2xl font-black text-slate-900 dark:text-slate-100">{data.totalScore ?? "—"}</p>
            </div>
            <div className="rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/40 p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">Listening</p>
              <p className="mt-1 text-2xl font-black text-sky-700 dark:text-sky-300">{data.listeningScore ?? "—"}</p>
            </div>
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40 p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">Reading</p>
              <p className="mt-1 text-2xl font-black text-amber-700 dark:text-amber-300">{data.readingScore ?? "—"}</p>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => router.push("/practice/quizzes")}
          className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 text-sm font-black text-slate-700 dark:text-slate-200 hover:border-amber-400 dark:hover:border-amber-500 cursor-pointer"
        >
          <ArrowLeft size={16} /> Quay lại kho đề
        </button>
      </section>
    </main>
  );
}
