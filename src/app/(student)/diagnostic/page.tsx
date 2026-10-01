"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ArrowRight, CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import {
  diagnosticService,
  DiagnosticResult,
} from "@/lib/api/services/diagnostic.service";
import toast from "react-hot-toast";
import { useAuthStore } from "@/stores/authStore";
import { PracticeHeader } from "@/components/practice/PracticeHeader";
import { useAssessmentAntiCheat } from "@/hooks/useAssessmentAntiCheat";
import { useLearningFocusMode } from "@/contexts/LearningFocusContext";

export default function DiagnosticPage() {
  const queryClient = useQueryClient();
  const { setFocusMode } = useLearningFocusMode();
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

  // Sync focus mode: only active during the actual assessment questions
  useEffect(() => {
    if (started) {
      setFocusMode(true);
    } else {
      setFocusMode(false);
    }
    return () => {
      setFocusMode(false);
    };
  }, [started, setFocusMode]);

  const submit = useMutation({
    mutationFn: () => diagnosticService.submit(assessment!.id, answers),
    onSuccess: () => {
      if (document.fullscreenElement) {
        void document.exitFullscreen?.().catch(() => undefined);
      }
      setFocusMode(false);
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

  const result: DiagnosticResult | undefined = submit.data;

  // Anti-cheat hook active only during the test
  useAssessmentAntiCheat({
    enabled: started && !result && !submit.isPending,
    onViolation: (type) => {
      switch (type) {
        case "FULLSCREEN_EXIT":
          toast.error("Cảnh báo: Bạn vừa thoát toàn màn hình trong bài kiểm tra!");
          break;
        case "TAB_HIDDEN":
        case "WINDOW_BLUR":
          toast.error("Cảnh báo: Vui lòng không chuyển tab hoặc rời khỏi bài kiểm tra!");
          break;
        case "COPY_ATTEMPT":
          toast.error("Chức năng sao chép bị hạn chế trong bài kiểm tra.");
          break;
        case "PASTE_ATTEMPT":
          toast.error("Chức năng dán bị hạn chế trong bài kiểm tra.");
          break;
        case "CUT_ATTEMPT":
          toast.error("Chức năng cắt bị hạn chế trong bài kiểm tra.");
          break;
        case "CONTEXT_MENU_ATTEMPT":
          toast.error("Menu chuột phải bị hạn chế trong bài kiểm tra.");
          break;
      }
    },
  });

  const handleStart = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.warn("Fullscreen request rejected or not supported:", err);
    }
    setStarted(true);
  };

  const reset = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen?.().catch(() => undefined);
    }
    setStarted(false);
    setStep(0);
    setAnswers({});
    submit.reset();
  };

  const handleExit = () => {
    if (window.confirm("Bạn có chắc chắn muốn thoát bài kiểm tra đầu vào? Tiến độ làm bài hiện tại sẽ không được lưu.")) {
      reset();
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-80 items-center justify-center">
        <Loader2 className="animate-spin text-violet-600" size={34} />
      </div>
    );
  }

  if (isError || !assessment) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-rose-100 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/40 p-6 text-center text-sm font-bold text-rose-700 dark:text-rose-200">
        Chưa thể tải bài kiểm tra đầu vào. Vui lòng thử lại sau.
      </div>
    );
  }

  // Result View (Normal Page with Global Navigation)
  if (result) {
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
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 px-5 text-sm font-extrabold text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 cursor-pointer"
            >
              <RotateCcw size={17} /> Làm lại
            </button>
          </div>
        </section>
      </div>
    );
  }

  // Pre-Start Briefing (Normal Page with Global Navigation)
  if (!started) {
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
            onClick={handleStart}
            className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-extrabold text-white hover:bg-violet-700 cursor-pointer"
          >
            Bắt đầu kiểm tra <ArrowRight size={18} />
          </button>
        </section>
      </div>
    );
  }

  const current = assessment.questions[step];

  // Active Assessment Room (Focus Mode + PracticeHeader)
  return (
    <div className="w-full min-h-dvh flex flex-col bg-slate-50 dark:bg-slate-950 font-sans">
      <PracticeHeader
        title={assessment.title}
        category="Đánh giá đầu vào"
        positionText={`Câu ${step + 1}/${assessment.questions.length}`}
        activityLabel="Đánh giá đầu vào"
        onExit={handleExit}
        exitLabel="Thoát"
      />

      <main className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6 shadow-sm sm:p-9">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-black uppercase tracking-wider text-violet-600 dark:text-violet-400">
              Kỹ năng: {current.skill}
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Câu {step + 1}/{assessment.questions.length}
            </span>
          </div>

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
                className={`min-h-16 rounded-2xl border-2 px-5 text-left text-sm font-bold transition-colors cursor-pointer ${
                  answers[current.id] === index
                    ? "border-violet-500 bg-violet-50 text-violet-950 dark:border-violet-500 dark:bg-violet-950/50 dark:text-violet-100"
                    : "border-slate-200 bg-white text-slate-700 hover:border-violet-200 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-200 dark:hover:border-violet-700 dark:hover:bg-slate-800"
                }`}
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
              className="min-h-11 px-4 text-sm font-bold text-slate-500 dark:text-slate-400 disabled:opacity-40 cursor-pointer"
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
              className="min-h-11 rounded-xl bg-violet-600 px-5 text-sm font-extrabold text-white disabled:opacity-50 cursor-pointer"
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
      </main>
    </div>
  );
}
