"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import {
  diagnosticService,
  DiagnosticResult,
} from "@/lib/api/services/diagnostic.service";
import toast from "react-hot-toast";
import { useAuthStore } from "@/stores/authStore";

export default function DiagnosticPage() {
  const queryClient = useQueryClient();
  const {
    data: assessment,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["diagnostic-current"],
    queryFn: diagnosticService.getCurrent,
  });
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const submit = useMutation({
    mutationFn: () => diagnosticService.submit(assessment!.id, answers),
    onSuccess: () => {
      const currentUserId = useAuthStore.getState().user?.id;
      queryClient.invalidateQueries({ queryKey: ["user-stats", currentUserId] });
      queryClient.invalidateQueries({ queryKey: ["diagnostic-current"] });
      queryClient.invalidateQueries({ queryKey: ["learning-history"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success(
        "Hoàn thành bài kiểm tra đầu vào! Bạn nhận được +50 Bánh mì.",
      );
    },
  });

  if (isLoading)
    return (
      <div className="flex min-h-80 items-center justify-center">
        <Loader2 className="animate-spin text-violet-600" size={34} />
      </div>
    );
  if (isError || !assessment)
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-rose-100 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/40 p-6 text-center text-sm font-bold text-rose-700 dark:text-rose-200">
        Chưa thể tải bài kiểm tra đầu vào. Vui lòng thử lại sau.
      </div>
    );
  const current = assessment.questions[step];
  const result: DiagnosticResult | undefined = submit.data;
  const reset = () => {
    setStarted(false);
    setStep(0);
    setAnswers({});
    submit.reset();
  };

  if (result)
    return (
      <div className="mx-auto max-w-5xl space-y-6 pb-16">
        <section className="rounded-[2rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-sky-50 dark:border-emerald-900/60 dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900 p-8 shadow-card sm:p-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 dark:bg-emerald-950/50 px-3 py-1 text-xs font-extrabold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 size={15} /> Đã lưu kết quả
          </span>
          <h1 className="mt-4 text-3xl font-black text-slate-900 dark:text-slate-100">
            Bạn đang ở mức {result.level}
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Bạn đúng {result.correctCount}/{result.totalCount} câu (
            {result.percentage}%). Kết quả này đã được lưu vào lịch sử luyện
            tập.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/practice"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-extrabold text-white hover:bg-violet-700"
            >
              Bắt đầu luyện tập <ArrowRight size={17} />
            </Link>
            <button
              type="button"
              onClick={reset}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 px-5 text-sm font-extrabold text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750"
            >
              <RotateCcw size={17} /> Làm lại
            </button>
          </div>
        </section>
      </div>
    );

  if (!started)
    return (
      <div className="mx-auto max-w-5xl space-y-6 pb-16">
        <section className="rounded-[2rem] border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-sky-100 dark:border-violet-900/60 dark:from-violet-950/40 dark:via-slate-900 dark:to-slate-900 p-8 shadow-card sm:p-10">
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 sm:text-4xl">
            {assessment.title}
          </h1>
          <p className="mt-3 max-w-2xl leading-6 text-slate-600 dark:text-slate-300">
            {assessment.description ||
              "Trả lời các câu hỏi ngắn để nhận điểm bắt đầu phù hợp."}
          </p>
          <p className="mt-4 text-sm font-bold text-violet-700 dark:text-violet-300">
            {assessment.questions.length} câu hỏi • Kết quả được lưu vào hồ sơ
            học tập
          </p>
          <button
            type="button"
            onClick={() => setStarted(true)}
            className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-extrabold text-white hover:bg-violet-700"
          >
            Bắt đầu kiểm tra <ArrowRight size={18} />
          </button>
        </section>
      </div>
    );

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      <header className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-5 shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[.16em] text-violet-700 dark:text-violet-400">
              Kiểm tra đầu vào
            </p>
            <h1 className="mt-1 text-xl font-black text-slate-900 dark:text-slate-100">
              Câu {step + 1}/{assessment.questions.length}
            </h1>
          </div>
          <span className="rounded-xl bg-violet-50 dark:bg-violet-950/50 px-3 py-2 text-xs font-extrabold text-violet-700 dark:text-violet-300">
            {current.skill}
          </span>
        </div>
      </header>
      <section className="rounded-[2rem] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6 shadow-card sm:p-9">
        <h2 className="text-xl font-black leading-8 text-slate-900 dark:text-slate-100">
          {current.question}
        </h2>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          {current.options.map((option, index) => (
            <button
              key={option}
              type="button"
              onClick={() =>
                setAnswers((old) => ({ ...old, [current.id]: index }))
              }
              aria-pressed={answers[current.id] === index}
              className={`min-h-16 rounded-2xl border-2 px-5 text-left text-sm font-bold transition-colors ${answers[current.id] === index ? "border-violet-500 bg-violet-50 text-violet-950 dark:border-violet-500 dark:bg-violet-950/50 dark:text-violet-100" : "border-slate-200 bg-white text-slate-700 hover:border-violet-200 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-200 dark:hover:border-violet-700 dark:hover:bg-slate-800"}`}
            >
              <span className="mr-3 text-violet-600 dark:text-violet-400">
                {String.fromCharCode(65 + index)}.
              </span>
              {option}
            </button>
          ))}
        </div>
        <div className="mt-8 flex justify-between">
          <button
            type="button"
            onClick={() => setStep((value) => Math.max(0, value - 1))}
            disabled={!step}
            className="min-h-11 px-4 text-sm font-bold text-slate-500 dark:text-slate-400 disabled:opacity-40"
          >
            Câu trước
          </button>
          <button
            type="button"
            disabled={answers[current.id] === undefined || submit.isPending}
            onClick={() =>
              step === assessment.questions.length - 1
                ? submit.mutate()
                : setStep((value) => value + 1)
            }
            className="min-h-11 rounded-xl bg-violet-600 px-5 text-sm font-extrabold text-white disabled:opacity-50"
          >
            {submit.isPending
              ? "Đang chấm..."
              : step === assessment.questions.length - 1
                ? "Xem kết quả"
                : "Câu tiếp"}
          </button>
        </div>
        {submit.isError && (
          <p className="mt-4 text-sm font-bold text-rose-600 dark:text-rose-400">
            Không thể nộp bài. Vui lòng thử lại.
          </p>
        )}
      </section>
    </div>
  );
}
