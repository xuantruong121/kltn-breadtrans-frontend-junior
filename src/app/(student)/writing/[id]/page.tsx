"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  PenTool,
  Loader2,
  CheckCircle2,
  RotateCcw,
  Award,
  FileText,
  TrendingUp,
  BookOpen,
  Lock,
} from "lucide-react";
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
  practiceDetailOf,
  writingService,
  type WritingEvaluation,
} from "@/lib/api/services/writing.service";
import { PracticeWritingDetail } from "@/components/writing/PracticeWritingDetail";
import { ToeicWritingExamStrip } from "@/components/toeic/ToeicWritingExamStrip";
import axiosClient from "@/lib/api/axiosClient";
import { isPremiumWritingForbiddenError } from "@/modules/subscription/planLogic";
import toast from "react-hot-toast";
import { useAuthStore } from "@/stores/authStore";
import { isSafeCourseReturn, withSafeReturnTo } from "@/lib/course/navigation";

export default function WritingDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = use(props.params);
  const topicId = Number(params.id);
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedReturnTo = searchParams.get("returnTo");
  const parentAttemptId = searchParams.get("parentAttemptId");
  const parentComponentId = searchParams.get("parentComponentId");
  // The task of a multi-task exercise being answered (?q=<questionId>).
  const requestedTaskId = Number(searchParams.get("q")) || null;
  const examParentContext =
    parentAttemptId && parentComponentId
      ? {
          attemptId: Number(parentAttemptId),
          componentId: Number(parentComponentId),
        }
      : undefined;
  const parentAssessmentId = searchParams.get("parentAssessmentId");
  // TOEIC Writing in an assessment: the 8 task quizzes and which are written.
  const { data: parentAttempt } = useQuery({
    queryKey: ["toeic-assessment-attempt", Number(parentAttemptId)],
    queryFn: async () =>
      (await axiosClient.get(
        `/toeic/assessments/attempts/${parentAttemptId}`,
      )) as any,
    enabled: Boolean(examParentContext),
  });
  const examComponent = parentAttempt?.components?.find(
    (c: any) => c.assessmentComponentId === Number(parentComponentId),
  );
  const examQuizIds: number[] = examComponent?.writingQuizIds ?? [];
  const writtenQuizIds: number[] = examComponent?.writtenQuizIds ?? [];
  const examHref = (quizId: number) =>
    `/writing/${quizId}?parentAssessmentId=${parentAssessmentId}&parentAttemptId=${parentAttemptId}&parentComponentId=${parentComponentId}`;
  const inExam = Boolean(examParentContext);
  const courseReturn =
    requestedReturnTo && isSafeCourseReturn(requestedReturnTo)
      ? requestedReturnTo
      : inExam && parentAssessmentId
        ? `/toeic/assessments/${parentAssessmentId}/attempts/${parentAttemptId}`
        : "/writing";
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [content, setContent] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [feedback, setFeedback] = useState<WritingEvaluation | null>(null);
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
    if (!draftKey || feedback) return;
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(draftKey, content);
      } catch {
        // Ignore storage quota/private mode failures.
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [content, draftKey, feedback]);

  const {
    data: topicData,
    isLoading,
    error: topicError,
  } = useQuery({
    queryKey: ["writing-topic", topicId],
    queryFn: () => writingService.getQuizDetails(topicId, examParentContext),
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

  const wordCount = countWritingWords(content);
  const charCount = content.length;
  const writingMode = resolveWritingMode(topic ?? {});
  const minimumWords =
    topic?.wordRange?.[0] ?? (writingMode.id === "SENTENCE" ? 1 : null);
  const maximumWords = topic?.wordRange?.[1] ?? null;

  const shouldConfirmExit =
    !feedback && (content.trim().length > 0 || isEvaluating);
  const { confirmExit, exitDialogProps } = usePracticeExitGuard({
    shouldConfirmExit,
    defaultFallbackUrl: "/writing",
  });

  if (isPremiumWritingForbiddenError(topicError)) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-center">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/80 rounded-2xl p-6 sm:p-8 shadow-lg text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
            <Lock className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
              PLUS
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mt-2">
              Nội dung dành cho PLUS
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2">
              Chủ đề luyện viết này thuộc gói PLUS. Nâng cấp gói để mở khóa toàn
              bộ bài luyện và nội dung nâng cao.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <Link
              href="/writing"
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold transition text-center"
            >
              Quay lại danh sách
            </Link>
            <Link
              href="/plans?highlight=plus"
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm shadow-sm transition text-center"
            >
              Xem gói PLUS
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || !minLaunchReady) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center py-12">
        <PracticeLoadingScreen skill="writing" className="max-w-4xl" />
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

    setIsEvaluating(true);
    setFeedback(null);

    try {
      const clientAttemptId = crypto.randomUUID();
      const result = await writingService.submit(
        topicId,
        content.trim(),
        clientAttemptId,
        examParentContext,
        currentTask?.id,
      );
      if (parentAttemptId && parentComponentId) {
        await axiosClient
          .post(
            `/toeic/assessments/attempts/${parentAttemptId}/components/${parentComponentId}/complete`,
            {},
          )
          .catch(() => undefined);
      }
      // Empty the editor first, or the pending 300 ms draft save writes the
      // submitted text back as a draft.
      setContent("");
      if (draftKey) {
        try {
          localStorage.removeItem(draftKey);
        } catch {
          // Ignore storage cleanup failures.
        }
      }
      setIsEvaluating(false);
      const currentUserId = user?.id;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["writing-topics"] }),
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
      if (inExam && examQuizIds.length > 0) {
        // Exam flow: go straight to the next unwritten task; results are
        // reviewed on the assessment page once the section is done.
        await queryClient.invalidateQueries({
          queryKey: ["toeic-assessment-attempt", Number(parentAttemptId)],
        });
        const done = new Set([...writtenQuizIds, topicId]);
        const after = examQuizIds.slice(examQuizIds.indexOf(topicId) + 1);
        const nextQuiz =
          after.find((id) => !done.has(id)) ??
          examQuizIds.find((id) => !done.has(id));
        toast.success(
          nextQuiz
            ? "Đã nộp câu này. Chuyển sang câu tiếp theo."
            : "Đã nộp đủ phần Viết.",
        );
        router.push(nextQuiz ? examHref(nextQuiz) : courseReturn);
        return;
      }
      toast.success("Hệ thống đã hoàn tất đánh giá bài viết!");
      router.push(
        withSafeReturnTo(
          `/writing/submissions/${result.submissionId}`,
          courseReturn,
        ),
      );
    } catch {
      setIsEvaluating(false);
      toast.error("Có lỗi xảy ra khi chấm bài. Vui lòng thử lại!");
    }
  };

  return (
    <PracticeShell
      skill="writing"
      title={topic?.title || "Bài luyện viết"}
      stage={feedback ? "FEEDBACK" : "PRACTICE"}
      level={topic?.level}
      mode={writingMode.label}
      variant="immersive"
    >
      <div className="w-full min-h-dvh flex flex-col bg-slate-50 dark:bg-slate-950 font-sans">
        <PracticeHeader
          title={topic?.title || "Luyện viết"}
          category={
            inExam && examQuizIds.length
              ? `Câu ${examQuizIds.indexOf(topicId) + 1}/${examQuizIds.length}`
              : topic?.taskType || topic?.type || "Writing"
          }
          activityLabel={inExam ? "TOEIC Writing" : "Luyện viết"}
          onExit={() => confirmExit(courseReturn)}
          exitLabel="Thoát"
          statusContent={
            <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-300 bg-slate-800 border border-slate-700 px-3 py-1 rounded-lg">
              <span>{wordCount} từ</span>
              <span className="text-slate-500">·</span>
              <span>{charCount} ký tự</span>
            </div>
          }
        />

        <main className="max-w-6xl mx-auto w-full space-y-6 pb-20 px-4 sm:px-6 pt-6 flex-1">
          {inExam && examQuizIds.includes(topicId) && (
            <ToeicWritingExamStrip
              quizIds={examQuizIds}
              currentQuizId={topicId}
              writtenQuizIds={writtenQuizIds}
              hrefFor={examHref}
            />
          )}
          {/* 2. 2-COLUMN MAIN LAYOUT */}
          <div className="grid grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: PROMPT, EDITOR & FEEDBACK */}
            <div
              className={`col-span-12 space-y-6 ${inExam ? "lg:col-span-10 lg:col-start-2" : "lg:col-span-8"}`}
            >
              {/* HEADER PROMPT */}
              <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-200 dark:border-rose-900/50">
                    <PenTool size={22} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                      Chủ Đề Yêu Cầu
                    </span>
                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                      {topic?.title || "Bài luyện viết"}
                    </h2>
                  </div>
                </div>

                {exercise && exercise.total > 1 && (
                  <nav aria-label="Các câu trong bài" className="space-y-2">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      Bài gồm {exercise.total} câu · đã chấm {exercise.answered}
                      /{exercise.total}
                      {exercise.complete && exercise.percent !== null
                        ? ` · điểm bài ${exercise.percent}%`
                        : ""}
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
                              const next = new URLSearchParams(
                                searchParams.toString(),
                              );
                              next.set("q", String(q.id));
                              router.replace(
                                `/writing/${topicId}?${next.toString()}`,
                              );
                            }}
                            className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3.5 text-sm font-bold transition-colors ${
                              active
                                ? "border-rose-500 bg-rose-600 text-white"
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

                <div className="bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/40 p-5 rounded-2xl space-y-2">
                  <span className="text-xs font-extrabold text-rose-800 dark:text-rose-300 uppercase tracking-wide">
                    Yêu cầu đề bài (Prompt):
                  </span>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                    {topic?.prompt ||
                      topic?.description ||
                      "Đọc kỹ yêu cầu và viết câu trả lời phù hợp với tình huống."}
                  </p>
                </div>

                {topic?.keywords && topic.keywords.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      Từ bắt buộc:
                    </span>
                    {topic.keywords.map((keyword) => (
                      <span
                        key={keyword}
                        className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-sm font-bold text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                )}

                {topicData?.email && (
                  <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-800/60">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      E-mail cần trả lời
                    </p>
                    <p className="mt-2 whitespace-pre-line text-base leading-7 text-slate-800 dark:text-slate-100">
                      {topicData.email}
                    </p>
                  </div>
                )}

                {/* Contextual prompt image (only displayed when imageUrl is provided) */}
                {topic?.imageUrl && !imageLoadFailed && (
                  <div className="w-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2 shadow-2xs">
                    <img
                      src={topic.imageUrl}
                      alt={
                        topic.title
                          ? `Hình minh họa cho đề bài: ${topic.title}`
                          : "Hình minh họa bài viết"
                      }
                      loading="eager"
                      decoding="async"
                      onError={() => setImageLoadFailed(true)}
                      className="w-full max-h-[380px] object-contain rounded-xl"
                    />
                  </div>
                )}
                {topic?.imageUrl && imageLoadFailed && (
                  <div
                    role="img"
                    aria-label="Hình minh họa đề bài viết hiện chưa tải được"
                    className="w-full overflow-hidden rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 p-5 text-center"
                  >
                    <p className="text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                      Hình minh họa hiện chưa tải được. Bạn vẫn có thể tiếp tục
                      đọc yêu cầu đề bài và hoàn thành bài viết.
                    </p>
                  </div>
                )}
              </div>

              {/* ESSAY EDITOR */}
              <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <FileText
                      size={18}
                      className="text-blue-600 dark:text-blue-400"
                    />{" "}
                    Bài Viết Của Bạn
                  </h3>
                  <span
                    className={`text-xs font-extrabold px-3 py-1 rounded-xl transition-colors ${wordCount >= 50 ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"}`}
                  >
                    {wordCount}
                    {topic?.wordRange?.[1] ? ` / ${topic.wordRange[1]}` : ""} từ
                    ({charCount} ký tự)
                  </span>
                </div>

                <textarea
                  rows={11}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={resolveWritingPlaceholder(topic ?? {})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 font-medium text-sm outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all leading-relaxed text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {topic?.wordRange?.length === 2
                      ? `Mục tiêu ${topic.wordRange[0]}–${topic.wordRange[1]} từ.`
                      : "Hãy trả lời đầy đủ yêu cầu và kiểm tra lại bài trước khi gửi."}
                    {minimumWords !== null && wordCount < minimumWords
                      ? ` Còn thiếu ${minimumWords - wordCount} từ so với mức khuyến nghị.`
                      : ""}
                    {maximumWords !== null && wordCount > maximumWords
                      ? ` Đang vượt ${wordCount - maximumWords} từ so với mức khuyến nghị.`
                      : ""}
                  </span>

                  <button
                    onClick={handleEvaluate}
                    disabled={isEvaluating || wordCount === 0}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-2.5 text-xs font-extrabold text-white shadow-xs transition hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                  >
                    {isEvaluating ? (
                      <>
                        <Loader2 className="animate-spin" size={16} /> Đang đánh
                        giá bài viết...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} /> Gửi đánh giá bài viết
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* EVALUATING LOADING SCREEN */}
              {isEvaluating && (
                <div className="py-4">
                  <PracticeLoadingScreen
                    skill="writing"
                    className="max-w-2xl min-h-[260px]"
                  />
                </div>
              )}

              {/* FEEDBACK SECTION */}
              <AnimatePresence>
                {feedback && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6"
                  >
                    {/* SCORE HEADER */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-200 dark:border-emerald-900/50">
                          <Award size={24} />
                        </div>
                        <div>
                          <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                            Báo Cáo Đánh Giá
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            Theo các tiêu chí rõ ràng về ý, cấu trúc và cách
                            dùng từ
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 block">
                            Mức độ hoàn thành
                          </span>
                          <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">
                            {feedback.maxScore} điểm tối đa
                          </span>
                        </div>
                        <div className="px-3.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-900/50 font-extrabold text-lg">
                          {feedback.score} / {feedback.maxScore}
                        </div>
                      </div>
                    </div>

                    {practiceDetailOf(feedback) && (
                      <PracticeWritingDetail
                        detail={practiceDetailOf(feedback)!}
                      />
                    )}

                    {/* FEEDBACK & NEXT STEPS */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 space-y-2">
                        <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase flex items-center gap-1.5">
                          <CheckCircle2 size={14} /> Nhận xét chung
                        </h4>
                        <p className="text-sm font-semibold leading-relaxed text-emerald-900 dark:text-emerald-200">
                          {feedback.feedback}
                        </p>
                        {(feedback.strengths?.length ?? 0) > 0 && (
                          <ul className="space-y-1 text-sm text-emerald-900 dark:text-emerald-200 list-disc pl-5">
                            {feedback.strengths!.map((s: string) => (
                              <li key={s}>{s}</li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 space-y-2">
                        <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase flex items-center gap-1.5">
                          <TrendingUp size={14} /> Gợi ý hoàn thiện
                        </h4>
                        <ul className="space-y-1.5 text-xs font-semibold text-amber-900 dark:text-amber-200 list-disc list-inside">
                          {feedback.suggestions?.map(
                            (imp: string, i: number) => (
                              <li key={i}>{imp}</li>
                            ),
                          )}
                        </ul>
                      </div>
                    </div>

                    {/* ACTION ROW */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-xs">
                        <span>Đã hoàn thành phiên luyện tập</span>
                      </div>
                      <button
                        onClick={() => setFeedback(null)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                      >
                        <RotateCcw size={13} /> Viết lại
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* RIGHT COLUMN: USEFUL PHRASES & RUBRICS (practice only: no coaching during an exam) */}
            {!inExam && (
              <div className="col-span-12 lg:col-span-4 space-y-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                  <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                    <BookOpen
                      size={18}
                      className="text-blue-600 dark:text-blue-400"
                    />{" "}
                    Mẫu Câu Hữu Ích
                  </h3>

                  <div className="space-y-3 text-xs">
                    {writingMode.guidance.map((item) => (
                      <div
                        key={item.title}
                        className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1"
                      >
                        <p className="font-bold text-slate-800 dark:text-slate-200">
                          {item.title}
                        </p>
                        <p className="text-slate-600 dark:text-slate-400 italic">
                          “{item.stem}”
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Shared Exit Confirmation Modal */}
          <PracticeExitConfirmDialog {...exitDialogProps} />
        </main>
      </div>
    </PracticeShell>
  );
}
