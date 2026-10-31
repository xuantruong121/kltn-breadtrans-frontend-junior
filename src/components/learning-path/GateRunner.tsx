"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, RotateCcw } from "lucide-react";

import { PracticeExitConfirmDialog } from "@/components/practice/PracticeExitConfirmDialog";
import { PracticeShell } from "@/components/practice/PracticeShell";
import { usePracticeExitGuard } from "@/hooks/usePracticeExitGuard";
import { learningPathService } from "@/lib/api/services/learningPath.service";
import {
  catalogHref,
  dependsOnLevel,
  formatRetryAt,
  gateClosedMessage,
  unansweredCount,
  type GateAttempt,
  type GateQuestion,
  type GateResult,
  type GateSkill,
} from "@/lib/learning-path/levelLock";
import { PRACTICE_SKILL_LABEL } from "@/lib/learning-path/practiceLevel";

const PRIMARY =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60";
const SECONDARY =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800";
const PANEL =
  "mx-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 dark:border-slate-800 dark:bg-slate-900";

/** A gate clip needs the login token, so it arrives as a blob. Mount with a key per question. */
function GateAudio({ attemptId, questionId }: { attemptId: number; questionId: number }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [tries, setTries] = useState(0);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    learningPathService
      .getGateAudio(attemptId, questionId)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [attemptId, questionId, tries]);

  if (failed)
    return (
      <div className="flex flex-wrap items-center gap-3 text-sm text-rose-700 dark:text-rose-400" role="alert">
        Chưa tải được âm thanh.
        <button
          type="button"
          onClick={() => {
            setFailed(false);
            setTries((n) => n + 1);
          }}
          className={SECONDARY}
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          Thử lại
        </button>
      </div>
    );
  if (!src)
    return (
      <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400" role="status">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Đang tải âm thanh
      </p>
    );
  return <audio controls preload="auto" src={src} className="w-full" aria-label="Âm thanh của câu hỏi" />;
}

function QuestionView({
  attemptId,
  question,
  answer,
  onAnswer,
}: {
  attemptId: number;
  question: GateQuestion;
  answer: string | undefined;
  onAnswer: (value: string) => void;
}) {
  return (
    <div className={question.passage ? "grid gap-4 lg:grid-cols-2" : "mx-auto w-full max-w-2xl"}>
      {question.passage && (
        <section
          aria-label="Đoạn văn"
          lang="en"
          className="max-h-[60dvh] overflow-y-auto whitespace-pre-line rounded-2xl border border-slate-200 bg-white p-5 text-base leading-relaxed text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
        >
          {question.passage}
        </section>
      )}
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        {question.hasAudio && <GateAudio key={question.id} attemptId={attemptId} questionId={question.id} />}
        {question.text && (
          <p lang="en" className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {question.text}
          </p>
        )}
        <div role="radiogroup" aria-label="Các phương án" className="space-y-2">
          {question.options.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={answer === option}
              onClick={() => onAnswer(option)}
              lang="en"
              className={`flex min-h-11 w-full cursor-pointer items-center rounded-xl border px-4 py-2 text-left text-base transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 ${
                answer === option
                  ? "border-blue-600 bg-blue-50 font-semibold text-blue-900 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-100"
                  : "border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function ResultView({ skill, result }: { skill: GateSkill; result: GateResult }) {
  return (
    <div className={PANEL}>
      {result.passed ? (
        <>
          <CheckCircle2 className="size-7 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <h1 className="mt-3 text-xl font-bold text-slate-900 sm:text-2xl dark:text-slate-100">
            Đã mở mức {result.levelLabel} cho kỹ năng {PRACTICE_SKILL_LABEL[skill]}
          </h1>
          <p className="mt-2 text-base text-slate-700 dark:text-slate-300">
            Bạn đúng {result.correct}/{result.total} câu ({result.score}%).
          </p>
        </>
      ) : (
        <>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl dark:text-slate-100">
            Chưa đủ điểm để mở mức {result.levelLabel}
          </h1>
          <p className="mt-2 text-base text-slate-700 dark:text-slate-300">
            Bạn đúng {result.correct}/{result.total} câu ({result.score}%), cần từ {result.passPercent}%.
          </p>
          {result.retryAt && (
            <p className="mt-1 text-base text-slate-700 dark:text-slate-300">
              Bạn làm lại được từ {formatRetryAt(result.retryAt)}. Trong lúc chờ, luyện thêm ở mức hiện tại cũng giúp mở
              mức này.
            </p>
          )}
        </>
      )}
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
        Bài mở khóa không hiện đáp án để câu hỏi còn dùng được cho lần sau.
      </p>
      <Link href={catalogHref(skill)} className={`${PRIMARY} mt-5`}>
        {result.passed ? `Luyện bài mức ${result.levelLabel}` : "Về bài luyện"}
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

/** A short auto-graded quiz that opens the next level. It is not an exam. */
export function GateRunner({ skill }: { skill: GateSkill }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const skillLabel = PRACTICE_SKILL_LABEL[skill];
  const shellSkill = skill === "LISTENING" ? "listening" : "reading";
  const [attempt, setAttempt] = useState<GateAttempt | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<GateResult | null>(null);

  const {
    data: status,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["learning-path-gate", skill],
    queryFn: () => learningPathService.getGate(skill),
    enabled: !attempt && !result,
  });
  const start = useMutation({
    mutationFn: () => learningPathService.startGate(skill),
    onSuccess: setAttempt,
    // The wait may have started in another tab: show the current state.
    onError: () => void refetch(),
  });
  const submit = useMutation({
    mutationFn: () => learningPathService.submitGate(attempt!.attemptId, answers),
    onSuccess: (graded) => {
      setResult(graded);
      void queryClient.invalidateQueries({ predicate: (q) => dependsOnLevel(q.queryKey) });
    },
  });
  const { confirmExit, exitDialogProps } = usePracticeExitGuard({
    shouldConfirmExit: Boolean(attempt) && !result,
    defaultFallbackUrl: catalogHref(skill),
  });

  if (result)
    return (
      <div className="px-4 py-8 sm:py-12">
        <ResultView skill={skill} result={result} />
      </div>
    );

  if (attempt) {
    const question = attempt.questions[index];
    const remaining = unansweredCount(attempt.questions, answers);
    const isLast = index === attempt.questions.length - 1;
    return (
      <div className="px-4 py-4 sm:px-6">
        <PracticeShell
          skill={shellSkill}
          title={`Bài mở khóa mức ${attempt.levelLabel}`}
          stage="PRACTICE"
          current={index + 1}
          total={attempt.questions.length}
          onExit={confirmExit}
          footer={
            <>
              <button
                type="button"
                className={SECONDARY}
                disabled={index === 0}
                onClick={() => setIndex((i) => i - 1)}
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Câu trước
              </button>
              {isLast ? (
                <div className="flex flex-wrap items-center justify-end gap-3">
                  {remaining > 0 && (
                    <span className="text-sm text-slate-600 dark:text-slate-400">Còn {remaining} câu chưa chọn</span>
                  )}
                  <button
                    type="button"
                    className={PRIMARY}
                    disabled={remaining > 0 || submit.isPending}
                    onClick={() => submit.mutate()}
                  >
                    {submit.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                    Nộp bài
                  </button>
                </div>
              ) : (
                <button type="button" className={PRIMARY} onClick={() => setIndex((i) => i + 1)}>
                  Câu sau
                  <ArrowRight className="size-4" aria-hidden="true" />
                </button>
              )}
            </>
          }
        >
          <QuestionView
            attemptId={attempt.attemptId}
            question={question}
            answer={answers[String(question.id)]}
            onAnswer={(value) => setAnswers((prev) => ({ ...prev, [String(question.id)]: value }))}
          />
          {submit.isError && (
            <p className="mt-3 text-sm font-semibold text-rose-700 dark:text-rose-400" role="alert">
              Chưa nộp được bài. Câu trả lời vẫn còn, vui lòng nộp lại.
            </p>
          )}
        </PracticeShell>
        <PracticeExitConfirmDialog {...exitDialogProps} />
      </div>
    );
  }

  const canStart = Boolean(status?.available && (!status.retryAt || status.openAttemptId));
  return (
    <div className="px-4 py-8 sm:py-12">
      <div className={PANEL}>
        {isLoading ? (
          <p className="flex items-center gap-2 text-base text-slate-700 dark:text-slate-300" role="status">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Đang tải bài mở khóa
          </p>
        ) : isError || !status ? (
          <>
            <p className="text-base font-semibold text-slate-900 dark:text-slate-100" role="alert">
              Chưa tải được bài mở khóa.
            </p>
            <button type="button" className={`${SECONDARY} mt-4`} onClick={() => void refetch()}>
              <RotateCcw className="size-4" aria-hidden="true" />
              Thử lại
            </button>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl dark:text-slate-100">
              {status.available
                ? `Bài mở khóa mức ${status.targetLabel}`
                : `Không có bài mở khóa cho kỹ năng ${skillLabel}`}
            </h1>
            {status.available ? (
              <>
                <p className="mt-2 text-base text-slate-700 dark:text-slate-300">
                  {skillLabel}: {status.questionCount} câu trắc nghiệm, đạt từ {status.passPercent}% thì mở mức{" "}
                  {status.targetLabel}. Nếu chưa đạt, bạn chờ {status.cooldownHours} giờ rồi làm lại.
                </p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Đây là bài luyện nội bộ của BreadTrans để mở bài mức cao hơn, không phải bài thi chính thức.
                </p>
                {status.retryAt && !status.openAttemptId && (
                  <p className="mt-3 text-base font-semibold text-amber-800 dark:text-amber-300">
                    Bạn làm lại được từ {formatRetryAt(status.retryAt)}.
                  </p>
                )}
              </>
            ) : (
              <p className="mt-2 text-base text-slate-700 dark:text-slate-300">{gateClosedMessage(status.reason)}</p>
            )}
            {start.isError && (
              <p className="mt-3 text-sm font-semibold text-rose-700 dark:text-rose-400" role="alert">
                Chưa bắt đầu được bài mở khóa. Vui lòng thử lại.
              </p>
            )}
            <div className="mt-5 flex flex-col-reverse gap-2.5 sm:flex-row">
              <button type="button" className={SECONDARY} onClick={() => router.push(catalogHref(skill))}>
                Về bài luyện
              </button>
              {canStart && (
                <button type="button" className={PRIMARY} disabled={start.isPending} onClick={() => start.mutate()}>
                  {start.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                  {status.openAttemptId ? "Làm tiếp" : "Bắt đầu"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
