"use client";

import React, { useState, useEffect, use, useRef } from "react";
import { attemptForSubmission, parsePendingAttempt } from "@/lib/writing/writingAttemptLogic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, CheckCircle2, BookOpen } from "lucide-react";
import { PracticeLoadingScreen } from "@/components/practice/PracticeLoadingScreen";
import { PracticeExitConfirmDialog } from "@/components/practice/PracticeExitConfirmDialog";
import { PracticeHeader } from "@/components/practice/PracticeHeader";
import { PracticeShell } from "@/components/practice/PracticeShell";
import {
  countWritingWords,
  resolveWritingMode,
  resolveWritingPlaceholder,
} from "@/lib/writing/writingExperienceLogic";
import { usePracticeExitGuard } from "@/hooks/usePracticeExitGuard";
import {
  writingService,
  type WritingEvaluation,
} from "@/lib/api/services/writing.service";
import { classifyPracticeLoadError } from "@/lib/practice/practiceLoadErrorLogic";
import toast from "react-hot-toast";
import { useAuthStore } from "@/stores/authStore";
import { PlanLockedScreen } from "@/components/practice/PlanLockedScreen";
import { LevelLockedScreen } from "@/components/practice/LevelLockDialog";
import { dependsOnLevel } from "@/lib/learning-path/levelLock";
import { quizDisplayTitle } from "@/lib/catalog/displayTitles";
import { PictureWritingWorkspace } from "@/components/writing/PictureWritingWorkspace";
import { SentenceTranslationWorkspace } from "@/components/writing/SentenceTranslationWorkspace";
import { isPictureQuiz } from "@/lib/writing/pictureWriting";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import { resolveWritingFormatTag } from "@/components/writing/writingCardLogic";
import { AiQuotaNotice } from "@/components/subscription/AiQuotaNotice";
import { aiQuotaExhausted, type AiQuotaExhausted } from "@/modules/subscription/aiQuota";

export default function WritingDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = use(props.params);
  const topicId = Number(params.id);
  const router = useRouter();
  const searchParams = useSearchParams();
  // The task of a multi-task exercise being answered (?q=<questionId>).
  const requestedTaskId = Number(searchParams.get("q")) || null;
  const exitHref = "/writing";
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [content, setContent] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  // Out of AI gradings for today (owner 2026-11-13): a notice, not a red toast.
  const [quotaNotice, setQuotaNotice] = useState<AiQuotaExhausted | null>(null);
  // Blocks a second submit fired before the disabled button re-renders.
  const submittingRef = useRef(false);
  // Picture tasks show their result beside the editor instead of a new page.
  const [pictureResult, setPictureResult] = useState<WritingEvaluation | null>(null);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const draftKey = user?.id
    ? `breadtrans:writing:draft:${user.id}:${topicId}${requestedTaskId ? `:${requestedTaskId}` : ""}`
    : null;

  const [minLaunchReady, setMinLaunchReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMinLaunchReady(true), 350);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!draftKey) return;
    try {
      // Each task keeps its own draft; switching task shows that task's text.
      setContent(localStorage.getItem(draftKey) ?? "");
    } catch {
      // Draft recovery is best effort; the authoritative submission is server-side.
    }
  }, [draftKey]);

  useEffect(() => {
    if (!draftKey) return;
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(draftKey, content);
      } catch {
        // Ignore storage quota/private mode failures.
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [content, draftKey]);

  const {
    data: topicData,
    isLoading,
    error: topicError,
    refetch: refetchTopic,
  } = useQuery({
    queryKey: ["writing-topic", topicId],
    queryFn: () => writingService.getQuizDetails(topicId),
    enabled: !!topicId,
  });
  const exercise = topicData?.exercise;
  const currentTask =
    exercise?.questions.find((q) => q.id === requestedTaskId) ??
    exercise?.questions.find((q) => q.id === exercise.nextQuestionId) ??
    exercise?.questions[0] ??
    null;
  // The page shows the selected task's own prompt, keywords and length.
  const topic =
    topicData && currentTask
      ? {
          ...topicData,
          prompt: currentTask.prompt ?? topicData.prompt,
          imageUrl: currentTask.imageUrl ?? undefined,
          keywords: currentTask.keywords,
          wordRange: currentTask.wordRange ?? undefined,
          taskType: currentTask.taskType ?? topicData.taskType,
          maxScore: currentTask.maxScore ?? topicData.maxScore,
        }
      : topicData;

  // Land on a task explicitly so its draft and submission are keyed to it.
  useEffect(() => {
    if (!exercise || requestedTaskId || !currentTask) return;
    const next = new URLSearchParams(searchParams.toString());
    next.set("q", String(currentTask.id));
    router.replace(`/writing/${topicId}?${next.toString()}`);
  }, [exercise, requestedTaskId, currentTask, searchParams, router, topicId]);

  const isPictureTask =
    Boolean(exercise && currentTask) && isPictureQuiz(topic ?? {});
  // "Dịch câu" (owner 2026-11-14): checked sentence by sentence on its own workspace.
  const isTranslationTask =
    Boolean(exercise) && currentTask?.taskType === "SENTENCE_TRANSLATION";

  const wordCount = countWritingWords(content);
  const charCount = content.length;
  const writingMode = resolveWritingMode(topic ?? {});
  const minimumWords =
    topic?.wordRange?.[0] ?? (writingMode.id === "SENTENCE" ? 1 : null);
  const maximumWords = topic?.wordRange?.[1] ?? null;

  const shouldConfirmExit = content.trim().length > 0 || isEvaluating;
  const { confirmExit, exitDialogProps } = usePracticeExitGuard({
    shouldConfirmExit,
    defaultFallbackUrl: "/writing",
  });

  const loadError = classifyPracticeLoadError(topicError);
  if (loadError?.kind === "LEVEL_LOCKED")
    return <LevelLockedScreen lock={loadError} backHref="/writing" />;
  if (loadError?.kind === "LOCKED")
    return <PlanLockedScreen plan={loadError.requiredPlan} backHref="/writing" sample="WRITING" />;

  if (isLoading || !minLaunchReady) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center py-12">
        <PracticeLoadingScreen skill="writing" className="max-w-4xl" />
      </div>
    );
  }

  // Never show the editor without a loaded exercise: say what went wrong.
  if (loadError || !topicData) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-8 text-center">
        <p className="text-base font-bold text-slate-800 dark:text-slate-200">
          {loadError?.kind === "AUTH"
            ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để mở bài luyện."
            : loadError?.kind === "FAILED"
              ? "Chưa tải được bài luyện. Vui lòng thử lại."
              : "Không tìm thấy bài luyện viết."}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2.5">
          <Link
            href="/writing"
            className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Quay lại danh sách
          </Link>
          {loadError?.kind === "AUTH" && (
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center rounded-xl bg-amber-500 px-5 text-sm font-extrabold text-white hover:bg-amber-600"
            >
              Đăng nhập lại
            </Link>
          )}
          {loadError?.kind === "FAILED" && (
            <button
              type="button"
              onClick={() => void refetchTopic()}
              className="inline-flex min-h-11 items-center rounded-xl bg-amber-500 px-5 text-sm font-extrabold text-white hover:bg-amber-600 cursor-pointer"
            >
              Thử lại
            </button>
          )}
        </div>
      </div>
    );
  }

  const handleEvaluate = async () => {
    if (minimumWords !== null && wordCount < minimumWords) {
      toast.error(
        `Vui lòng viết tối thiểu ${minimumWords} từ trước khi gửi bài.`,
      );
      return;
    }

    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsEvaluating(true);
    setQuotaNotice(null);

    // The same text keeps its attempt id (also across a refresh), so a retry
    // after a lost response returns the grade already stored on the server.
    const attemptKey = draftKey ? `${draftKey}:attempt` : null;
    let stored = null;
    try {
      stored = attemptKey ? parsePendingAttempt(sessionStorage.getItem(attemptKey)) : null;
    } catch {
      stored = null;
    }
    const attempt = attemptForSubmission(stored, content, () => crypto.randomUUID());
    try {
      if (attemptKey) sessionStorage.setItem(attemptKey, JSON.stringify(attempt));
    } catch {
      // Without storage the retry still works within this page.
    }

    try {
      const result = await writingService.submit(
        topicId,
        attempt.text,
        attempt.id,
        undefined,
        currentTask?.id,
      );
      // Empty the editor first, or the pending 300 ms draft save writes the
      // submitted text back as a draft.
      setContent("");
      if (draftKey) {
        try {
          localStorage.removeItem(draftKey);
          if (attemptKey) sessionStorage.removeItem(attemptKey);
        } catch {
          // Ignore storage cleanup failures.
        }
      }
      setIsEvaluating(false);
      const currentUserId = user?.id;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["writing-topics"] }),
        queryClient.invalidateQueries({ predicate: (q) => dependsOnLevel(q.queryKey) }),
        queryClient.invalidateQueries({
          queryKey: ["user-skills-summary", currentUserId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["account-learning-progress", currentUserId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["account-learning-history", currentUserId],
        }),
        queryClient.invalidateQueries({ queryKey: ["learning-history"] }),
      ]);
      if (isPictureTask) {
        setPictureResult(result);
        await queryClient.invalidateQueries({ queryKey: ["writing-topic", topicId] });
        toast.success("Đã chấm xong bức tranh này.");
        return;
      }
      toast.success("Hệ thống đã hoàn tất đánh giá bài viết!");
      router.push(
        `/writing/submissions/${result.submissionId}`,
      );
    } catch (error) {
      setIsEvaluating(false);
      // Out of AI gradings for today: the server says which plan ran out and
      // what the next one gives; shown as a notice, the text is kept.
      const quota = aiQuotaExhausted(error);
      if (quota) {
        setQuotaNotice(quota);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        toast.error(
          getApiErrorMessage(error, "Chưa chấm được bài. Bài viết của bạn vẫn còn, hãy thử gửi lại."),
        );
      }
    } finally {
      submittingRef.current = false;
    }
  };

  // One screen in three columns on a wide screen (owner 2026-11-14): the
  // page itself never scrolls there, each column scrolls on its own.
  const CARD =
    "flex flex-col rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:min-h-0 lg:overflow-y-auto";

  return (
    <PracticeShell
      skill="writing"
      title={topic?.title ? quizDisplayTitle(topicId, topic.title) : "Bài luyện viết"}
      stage="PRACTICE"
      level={topic?.level}
      mode={writingMode.label}
      variant="immersive"
    >
      <div className="w-full min-h-dvh lg:h-dvh lg:overflow-hidden flex flex-col bg-slate-50 dark:bg-slate-950 font-sans">
        <PracticeHeader
          title={topic?.title ? quizDisplayTitle(topicId, topic.title) : "Luyện viết"}
          // The same name as the catalog card, never a stored code such as
          // SHORT_MESSAGE (owner 2026-11-13).
          category={
            isPictureTask
              ? "Viết câu theo tranh"
              : topic
                ? resolveWritingFormatTag(topic)
                : "Viết"
          }
          activityLabel="Luyện viết"
          onExit={() => confirmExit(exitHref)}
          exitLabel="Thoát"
          statusContent={
            isTranslationTask ? undefined : <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-300 bg-slate-800 border border-slate-700 px-3 py-1 rounded-lg">
              <span>{wordCount} từ</span>
              <span className="text-slate-600 dark:text-slate-400">·</span>
              <span>{charCount} ký tự</span>
            </div>
          }
        />

        {quotaNotice && (
          <div className="shrink-0 px-4 pt-4 lg:px-5">
            <AiQuotaNotice quota={quotaNotice} keptWork="Bài viết" onDismiss={() => setQuotaNotice(null)} />
          </div>
        )}

        {isTranslationTask && exercise ? (
          <SentenceTranslationWorkspace
            quizId={topicId}
            title={topic?.title ? quizDisplayTitle(topicId, topic.title) : "Dịch câu"}
            tasks={exercise.questions}
            initialTaskId={currentTask?.id ?? null}
          />
        ) : isPictureTask && exercise && currentTask ? (
          <PictureWritingWorkspace
            quizId={topicId}
            task={currentTask}
            tasks={exercise.questions}
            exerciseLabel={
              topic?.title ? quizDisplayTitle(topicId, topic.title) : "Viết câu theo tranh"
            }
            content={content}
            onContentChange={setContent}
            wordCount={wordCount}
            isEvaluating={isEvaluating}
            onEvaluate={handleEvaluate}
            result={pictureResult}
            nextTaskId={
              exercise.questions.find((q) => q.id !== currentTask.id && !q.latest)?.id ?? null
            }
            onSelectTask={(questionId) => {
              setPictureResult(null);
              const next = new URLSearchParams(searchParams.toString());
              next.set("q", String(questionId));
              router.replace(`/writing/${topicId}?${next.toString()}`);
            }}
          />
        ) : (
          <div className="grid flex-1 grid-cols-1 gap-4 p-4 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,0.8fr)] lg:p-5">
            {/* Left: the task */}
            <section aria-label="Đề bài" className={`${CARD} gap-4`}>
              <div>
                <p className="text-[15px] font-semibold text-slate-600 dark:text-slate-400">Đề bài</p>
                <h2 className="mt-0.5 text-lg font-bold leading-snug text-slate-900 dark:text-slate-100">
                  {topic?.title ? quizDisplayTitle(topicId, topic.title) : "Bài luyện viết"}
                </h2>
              </div>
              <p className="text-[17px] leading-relaxed text-slate-900 dark:text-slate-100">
                {topic?.prompt ||
                  topic?.description ||
                  "Đọc kỹ yêu cầu và viết câu trả lời phù hợp với tình huống."}
              </p>

              {topic?.keywords && topic.keywords.length > 0 && (
                <div>
                  <p className="text-[15px] font-semibold text-slate-700 dark:text-slate-300">Từ bắt buộc</p>
                  <div className="mt-2 flex flex-wrap gap-2" lang="en">
                    {topic.keywords.map((keyword) => (
                      <span
                        key={keyword}
                        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-[17px] font-semibold text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {topicData?.email && (
                <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
                  <p className="text-[15px] font-semibold text-slate-700 dark:text-slate-300">E-mail cần trả lời</p>
                  <p className="mt-2 whitespace-pre-line text-[17px] leading-relaxed text-slate-900 dark:text-slate-100" lang="en">
                    {topicData.email}
                  </p>
                </div>
              )}

              {/* Contextual prompt image (only displayed when imageUrl is provided) */}
              {topic?.imageUrl && !imageLoadFailed && (
                <img
                  src={topic.imageUrl}
                  alt={topic.title ? `Hình minh họa cho đề bài: ${topic.title}` : "Hình minh họa bài viết"}
                  loading="eager"
                  decoding="async"
                  onError={() => setImageLoadFailed(true)}
                  className="w-full max-h-[380px] rounded-xl object-contain"
                />
              )}
              {topic?.imageUrl && imageLoadFailed && (
                <p
                  role="img"
                  aria-label="Hình minh họa đề bài viết hiện chưa tải được"
                  className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-[15px] leading-relaxed text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                >
                  Hình minh họa hiện chưa tải được. Bạn vẫn có thể đọc yêu cầu đề bài và hoàn thành bài viết.
                </p>
              )}
            </section>

            {/* Centre: the editor */}
            <section aria-label="Bài viết của bạn" className={`${CARD} gap-3`}>
              {exercise && exercise.total > 1 && (
                <nav aria-label="Các câu trong bài" className="space-y-2">
                  <p className="text-[15px] font-semibold text-slate-700 dark:text-slate-300">
                    Bài gồm {exercise.total} câu · đã chấm {exercise.answered}/{exercise.total}
                    {exercise.complete && exercise.percent !== null ? ` · điểm bài ${exercise.percent}%` : ""}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {exercise.questions.map((q) => {
                      const active = q.id === currentTask?.id;
                      return (
                        <button
                          key={q.id}
                          type="button"
                          aria-current={active ? "step" : undefined}
                          onClick={() => {
                            const next = new URLSearchParams(searchParams.toString());
                            next.set("q", String(q.id));
                            router.replace(`/writing/${topicId}?${next.toString()}`);
                          }}
                          className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3.5 text-[15px] font-semibold transition-colors cursor-pointer ${
                            active
                              ? "border-blue-600 bg-blue-600 text-white"
                              : q.latest
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                          }`}
                        >
                          <span>Câu {q.position}</span>
                          {q.latest && (
                            <span className="tabular-nums opacity-90">
                              {q.latest.score}/{q.latest.maxScore}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </nav>
              )}

              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  <label htmlFor="writing-answer">Bài viết của bạn</label>
                </h2>
                <span
                  aria-live="polite"
                  className={`rounded-lg px-2.5 py-1 text-[15px] font-semibold tabular-nums ${
                    minimumWords !== null && wordCount >= minimumWords && (maximumWords === null || wordCount <= maximumWords)
                      ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {wordCount}
                  {topic?.wordRange?.[1] ? ` / ${topic.wordRange[1]}` : ""} từ
                </span>
              </div>

              <textarea
                id="writing-answer"
                rows={11}
                lang="en"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={resolveWritingPlaceholder(topic ?? {})}
                className="min-h-60 w-full flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 p-4 text-[17px] leading-relaxed text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-900 placeholder:text-slate-500 dark:placeholder:text-slate-400"
              />

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
                  {topic?.wordRange?.length === 2
                    ? `Mục tiêu ${topic.wordRange[0]}–${topic.wordRange[1]} từ.`
                    : "Trả lời đủ yêu cầu và đọc lại bài trước khi gửi."}
                  {minimumWords !== null && wordCount < minimumWords
                    ? ` Còn thiếu ${minimumWords - wordCount} từ.`
                    : ""}
                  {maximumWords !== null && wordCount > maximumWords
                    ? ` Đang vượt ${wordCount - maximumWords} từ.`
                    : ""}
                </span>
                <button
                  type="button"
                  onClick={handleEvaluate}
                  disabled={isEvaluating || wordCount === 0}
                  className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-base font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                  {isEvaluating ? (
                    <>
                      <Loader2 className="animate-spin" size={18} aria-hidden="true" /> Đang chấm bài...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} aria-hidden="true" /> Gửi đánh giá bài viết
                    </>
                  )}
                </button>
              </div>
            </section>

            {/* Right: useful sentence frames */}
            <aside aria-label="Mẫu câu hữu ích" className={`${CARD} gap-3`}>
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100">
                <BookOpen size={18} className="text-blue-600 dark:text-blue-400" aria-hidden="true" />
                Mẫu câu hữu ích
              </h2>
              <div className="space-y-2.5">
                {writingMode.guidance.map((item) => (
                  <div key={item.title} className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/70">
                    <p className="text-[15px] font-semibold text-slate-700 dark:text-slate-300">{item.title}</p>
                    <p className="mt-1 text-[17px] leading-relaxed text-slate-900 dark:text-slate-100" lang="en">
                      “{item.stem}”
                    </p>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        )}
        {/* Shared Exit Confirmation Modal */}
        <PracticeExitConfirmDialog {...exitDialogProps} />
      </div>
    </PracticeShell>
  );
}
