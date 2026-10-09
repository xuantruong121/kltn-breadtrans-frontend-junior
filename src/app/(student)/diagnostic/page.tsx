"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Target,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  diagnosticService,
  DiagnosticAssessment,
  DiagnosticResult,
} from "@/lib/api/services/diagnostic.service";
import { useAuthStore } from "@/stores/authStore";
import { PracticeHeader } from "@/components/practice/PracticeHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAssessmentAntiCheat } from "@/hooks/useAssessmentAntiCheat";
import { useLearningFocusMode } from "@/contexts/LearningFocusContext";
import {
  getUnansweredQuestionIndexes,
  resolveReviewAnswer,
} from "@/lib/diagnostic/diagnosticUiLogic";

function createSubmissionToken() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

const skillLabel: Record<string, string> = {
  Listening: "Listening",
  Reading: "Reading",
  Grammar: "Ngữ pháp",
  Vocabulary: "Từ vựng",
  Speaking: "Speaking",
  Writing: "Writing",
};

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
  const { data: latestResult } = useQuery({
    queryKey: ["diagnostic-latest-result"],
    queryFn: diagnosticService.getLatestResult,
  });
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submissionToken, setSubmissionToken] = useState(createSubmissionToken);
  const [hidePersistedResult, setHidePersistedResult] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  useEffect(() => {
    setFocusMode(started);
    return () => setFocusMode(false);
  }, [started, setFocusMode]);

  const submit = useMutation({
    mutationFn: () =>
      diagnosticService.submit(assessment!.id, answers, submissionToken),
    onSuccess: (data) => {
      if (document.fullscreenElement)
        void document.exitFullscreen?.().catch(() => undefined);
      setStarted(false);
      setFocusMode(false);
      const currentUserId = useAuthStore.getState().user?.id;
      queryClient.invalidateQueries({
        queryKey: ["user-stats", currentUserId],
      });
      queryClient.invalidateQueries({ queryKey: ["diagnostic-current"] });
      queryClient.invalidateQueries({ queryKey: ["diagnostic-latest-result"] });
      queryClient.invalidateQueries({ queryKey: ["learning-history"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Kết quả kiểm tra đầu vào đã được lưu.");
      void data;
    },
    onError: () => toast.error("Không thể lưu kết quả. Vui lòng thử lại."),
  });

  const result: DiagnosticResult | undefined =
    submit.data ??
    (!hidePersistedResult ? (latestResult ?? undefined) : undefined);

  useAssessmentAntiCheat({
    enabled: started && !result && !submit.isPending,
    onViolation: (type) => {
      const messages: Record<string, string> = {
        FULLSCREEN_EXIT:
          "Cảnh báo: Bạn vừa thoát toàn màn hình trong bài kiểm tra!",
        TAB_HIDDEN:
          "Cảnh báo: Vui lòng không chuyển tab hoặc rời khỏi bài kiểm tra!",
        WINDOW_BLUR:
          "Cảnh báo: Vui lòng không chuyển tab hoặc rời khỏi bài kiểm tra!",
        COPY_ATTEMPT: "Chức năng sao chép bị hạn chế trong bài kiểm tra.",
        PASTE_ATTEMPT: "Chức năng dán bị hạn chế trong bài kiểm tra.",
        CUT_ATTEMPT: "Chức năng cắt bị hạn chế trong bài kiểm tra.",
        CONTEXT_MENU_ATTEMPT: "Menu chuột phải bị hạn chế trong bài kiểm tra.",
      };
      toast.error(messages[type] ?? "Vui lòng tập trung trong bài kiểm tra.");
    },
  });

  const reset = () => {
    if (document.fullscreenElement)
      void document.exitFullscreen?.().catch(() => undefined);
    setStarted(false);
    setStep(0);
    setAnswers({});
    setSubmissionToken(createSubmissionToken());
    setHidePersistedResult(true);
    submit.reset();
  };

  const handleStart = async () => {
    setHidePersistedResult(true);
    try {
      if (document.documentElement.requestFullscreen)
        await document.documentElement.requestFullscreen();
    } catch (error) {
      console.warn("Fullscreen request rejected or not supported:", error);
    }
    setStarted(true);
  };

  const handleExit = () => {
    setShowExitConfirm(true);
  };

  const handleSubmit = () => {
    if (!assessment) return;
    const unansweredIndexes = getUnansweredQuestionIndexes(
      assessment.questions,
      answers,
    );
    if (unansweredIndexes.length) {
      setStep(unansweredIndexes[0]);
      toast.error(`Bạn còn ${unansweredIndexes.length} câu chưa trả lời.`);
      return;
    }
    submit.mutate();
  };

  if (isLoading)
    return (
      <div className="flex min-h-80 items-center justify-center">
        <Loader2 className="animate-spin text-violet-600" size={34} />
      </div>
    );
  if (isError || !assessment)
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-rose-100 bg-rose-50 p-6 text-center text-sm font-bold text-rose-700">
        Chưa thể tải bài kiểm tra đầu vào. Vui lòng thử lại sau.
      </div>
    );

  if (result)
    return (
      <DiagnosticResultView
        assessment={assessment}
        result={result}
        onRetake={reset}
      />
    );

  if (!started) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 pb-16">
        <section className="rounded-[2rem] border border-violet-100 bg-white p-8 shadow-card dark:border-violet-900/60 dark:bg-slate-900 sm:p-10">
          <div className="flex items-center gap-3 text-violet-700 dark:text-violet-300">
            <Target size={22} />
            <span className="text-xs font-black uppercase tracking-wider">
              Đánh giá đầu vào BreadTrans
            </span>
          </div>
          <h1 className="mt-4 text-3xl font-black text-slate-900 dark:text-slate-100 sm:text-4xl">
            {assessment.title}
          </h1>
          <p className="mt-3 max-w-2xl leading-6 text-slate-600 dark:text-slate-300">
            {assessment.description ??
              "Trả lời các câu hỏi ngắn để nhận mức khởi điểm ước tính và gợi ý khóa học phù hợp."}
          </p>
          <p className="mt-4 text-sm font-bold text-violet-700 dark:text-violet-300">
            {assessment.questions.length} câu hỏi • khoảng 10–15 phút • không
            phải bài thi chứng chỉ
          </p>
          <button
            type="button"
            onClick={handleStart}
            className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-extrabold text-white hover:bg-violet-700"
          >
            Bắt đầu kiểm tra <ArrowRight size={18} />
          </button>
        </section>
      </div>
    );
  }

  const current = assessment.questions[step];
  return (
    <>
      <div className="flex min-h-dvh w-full flex-col bg-slate-50 font-sans dark:bg-slate-950">
      <PracticeHeader
        title={assessment.title}
        category="Đánh giá đầu vào"
        positionText={`Câu ${step + 1}/${assessment.questions.length}`}
        activityLabel="Đánh giá đầu vào"
        onExit={handleExit}
        exitLabel="Thoát"
      />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-9">
          <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <span className="text-xs font-black uppercase tracking-wider text-violet-600 dark:text-violet-400">
              Kỹ năng: {skillLabel[current.skill] ?? current.skill}
            </span>
            <span className="text-xs font-bold text-slate-500">
              Câu {step + 1}/{assessment.questions.length}
            </span>
          </div>
          <div
            className="mb-6 flex flex-wrap gap-2"
            aria-label="Điều hướng câu hỏi"
          >
            {assessment.questions.map((question, index) => (
              <button
                key={question.id}
                type="button"
                onClick={() => setStep(index)}
                aria-label={`Đi tới câu ${index + 1}`}
                aria-current={index === step ? "step" : undefined}
                className={`size-9 rounded-full text-xs font-black ${index === step ? "bg-violet-600 text-white" : answers[question.id] === undefined ? "border border-amber-300 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}
              >
                {index + 1}
              </button>
            ))}
          </div>
          <h2 className="text-xl font-black leading-8 text-slate-900 dark:text-slate-100">
            {current.question}
          </h2>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {current.options.map((option, index) => (
              <button
                key={`${current.id}-${option}`}
                type="button"
                onClick={() =>
                  setAnswers((old) => ({ ...old, [current.id]: index }))
                }
                aria-pressed={answers[current.id] === index}
                className={`min-h-16 rounded-2xl border-2 px-5 text-left text-sm font-bold transition-colors ${answers[current.id] === index ? "border-violet-500 bg-violet-50 text-violet-950 dark:border-violet-500 dark:bg-violet-950/50 dark:text-violet-100" : "border-slate-200 bg-white text-slate-700 hover:border-violet-200 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-200"}`}
              >
                <span className="mr-3 text-violet-600">
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
              className="min-h-11 px-4 text-sm font-bold text-slate-500 disabled:opacity-40"
            >
              Câu trước
            </button>
            <button
              type="button"
              disabled={answers[current.id] === undefined || submit.isPending}
              onClick={() =>
                step === assessment.questions.length - 1
                  ? handleSubmit()
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
            <p className="mt-4 text-sm font-bold text-rose-600" role="alert">
              Không thể lưu kết quả. Vui lòng thử lại.
            </p>
          )}
        </section>
      </main>
      </div>
      <ConfirmDialog
        open={showExitConfirm}
        title="Thoát bài kiểm tra đầu vào?"
        description="Tiến độ làm bài hiện tại sẽ không được lưu."
        confirmLabel="Thoát"
        cancelLabel="Ở lại"
        onCancel={() => setShowExitConfirm(false)}
        onConfirm={() => {
          setShowExitConfirm(false);
          reset();
        }}
      />
    </>
  );
}

function DiagnosticResultView({
  assessment,
  result,
  onRetake,
}: {
  assessment: DiagnosticAssessment;
  result: DiagnosticResult;
  onRetake: () => void;
}) {
  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <section className="rounded-[2rem] border border-emerald-100 bg-white p-8 shadow-card dark:border-emerald-900/60 dark:bg-slate-900 sm:p-10">
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-700">
          <CheckCircle2 size={15} /> Đã lưu kết quả
        </span>
        <h1 className="mt-4 text-3xl font-black text-slate-900 dark:text-slate-100">
          Mức khởi điểm ước tính: {result.level}
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Bạn đúng {result.correctCount}/{result.totalCount} câu (
          {result.percentage}%). Đây là kết quả tham khảo để chọn điểm bắt đầu,
          không phải chứng nhận CEFR.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {result.skillProfiles?.map((profile) => (
            <div
              key={profile.skill}
              className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700"
            >
              <p className="text-sm font-black text-slate-800 dark:text-slate-100">
                {skillLabel[profile.skill] ?? profile.skill}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {profile.percentage === null
                  ? "Chưa đủ dữ liệu"
                  : `${profile.percentage}% (${profile.correctCount}/${profile.totalCount})`}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <h2 className="font-black text-slate-900 dark:text-slate-100">
              Điểm mạnh có đủ dữ liệu
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {result.strengths?.length
                ? result.strengths
                    .map((skill) => skillLabel[skill] ?? skill)
                    .join(", ")
                : "Chưa có kết luận chắc chắn."}
            </p>
          </div>
          <div>
            <h2 className="font-black text-slate-900 dark:text-slate-100">
              Nên củng cố
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {result.weaknesses?.length
                ? result.weaknesses
                    .map((skill) => skillLabel[skill] ?? skill)
                    .join(", ")
                : "Chưa có miền yếu rõ ràng."}
            </p>
          </div>
        </div>
        <div className="mt-8">
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
            Khóa học phù hợp
          </h2>
          {result.recommendations?.length ? (
            <div className="mt-3 grid gap-3">
              {result.recommendations.map((recommendation) => (
                <Link
                  key={recommendation.courseId}
                  href={`/courses/${recommendation.courseId}`}
                  className="rounded-2xl border border-violet-200 p-4 transition hover:border-violet-500 hover:bg-violet-50 dark:border-violet-900 dark:hover:bg-violet-950/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-900 dark:text-slate-100">
                        {recommendation.title}
                      </p>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        {recommendation.reason}
                      </p>
                    </div>
                    <ArrowRight
                      className="shrink-0 text-violet-600"
                      size={18}
                    />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Hiện chưa có khóa học đủ điều kiện để gợi ý. Danh mục khóa học vẫn
              có thể xem độc lập.
            </p>
          )}
        </div>
        <div className="mt-8">
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
            Đối chiếu câu trả lời
          </h2>
          <div className="mt-3 space-y-2">
            {result.questionsResult.map((item) => {
              const question = assessment.questions.find(
                (candidate) => candidate.id === item.questionId,
              );
              const standard = resolveReviewAnswer(
                question?.options,
                item.correctOption,
              );
              const selected = resolveReviewAnswer(
                question?.options,
                item.selectedOption,
              );
              return (
                <div
                  key={item.questionId}
                  className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700"
                >
                  <p className="font-bold text-slate-800 dark:text-slate-100">
                    Câu {question?.order ?? item.questionId}:{" "}
                    {item.isCorrect ? "Chính xác" : "Chưa chính xác"}
                  </p>
                  <p className="mt-1 text-slate-600 dark:text-slate-300">
                    Bạn chọn: {selected ?? "Chưa trả lời"} • Đáp án chuẩn:{" "}
                    {standard ?? "Không khả dụng"}
                  </p>
                  {item.explanation && (
                    <p className="mt-1 text-xs text-slate-500">
                      {item.explanation}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-extrabold text-white"
          >
            Về Dashboard <ArrowRight size={17} />
          </Link>
          <button
            type="button"
            onClick={onRetake}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-5 text-sm font-extrabold text-slate-700 dark:border-slate-700 dark:text-slate-200"
          >
            <RotateCcw size={17} /> Làm lại
          </button>
        </div>
      </section>
    </div>
  );
}
