"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
  Keyboard,
  Languages,
  LayoutGrid,
  Loader2,
  MessageCircleMore,
  PenLine,
  Star,
  StickyNote,
  Volume2,
  VolumeX,
  X,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  quizService,
  type AnswerDto,
  type CheckPracticeQuestionResult,
  type Question,
  type QuestionContent,
  type Quiz,
} from "@/lib/api/services/quiz.service";
import { ListeningAudioPlayer } from "./ListeningAudioPlayer";
import { parseQuestionExplanation } from "./listeningExplanationUtils";
import { PracticeLoadingScreen } from "@/components/practice/PracticeLoadingScreen";
import { PracticeExitConfirmDialog } from "@/components/practice/PracticeExitConfirmDialog";
import { WordDictionaryPopup } from "@/components/speaking/WordDictionaryPopup";
import { usePracticeExitGuard } from "@/hooks/usePracticeExitGuard";
import { ReportIssueButton } from "@/components/issue-report";
import {
  buildProgressiveAnswer,
  canonicalizeSubmittedDictation,
  diffDictationAnswer,
  type DictationDiffToken,
} from "./listeningDictationUtils";
import { DailyDictationWorkspace } from "./DailyDictationWorkspace";

interface ListeningComprehensionWorkspaceProps {
  quiz?: Quiz | null;
  isLoading?: boolean;
  reviewOnly?: boolean;
  reviewQuestionIds?: number[];
}

interface DictationAttemptMetrics {
  attemptCount: number;
  firstTryCorrect: boolean | null;
  bestWordAccuracy: number;
  hintCount: number;
  replayCount: number;
  revealed: boolean;
}

function getActiveTranscriptSegmentIndex(
  segments: NonNullable<QuestionContent["transcriptSegments"]>,
  currentTime: number,
): number {
  if (segments.length === 0) return -1;

  const hasTiming = segments.every(
    (segment) =>
      Number.isFinite(segment.startMs) &&
      Number.isFinite(segment.endMs) &&
      (segment.endMs ?? 0) >= (segment.startMs ?? 0),
  );
  if (!hasTiming) return -1;
  const currentMs = currentTime * 1000;
  return segments.findIndex(
    (segment) =>
      currentMs >= (segment.startMs ?? 0) &&
      currentMs < (segment.endMs ?? Number.POSITIVE_INFINITY),
  );
}

function getDialogueSpeakerLabel(speaker: string): string {
  const normalized = speaker.trim().toLocaleLowerCase("vi-VN");
  if (normalized.includes("khách") || normalized.includes("customer")) {
    return "Customer";
  }
  if (
    normalized.includes("nhân viên") ||
    normalized.includes("agent") ||
    normalized.includes("support")
  ) {
    return "Agent";
  }
  return speaker.trim() || "Speaker";
}

function maskDictationAnswer(answer: string): string {
  return answer
    .trim()
    .split(/\s+/)
    .map((word, index) =>
      index === 0
        ? word
        : word.replace(/[A-Za-z0-9À-ỹ]/g, "*"),
    )
    .join(" ");
}

export function ListeningComprehensionWorkspace({
  quiz,
  isLoading,
  reviewOnly = false,
  reviewQuestionIds = [],
}: ListeningComprehensionWorkspaceProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id ?? null);

  const questions: Question[] = useMemo(() => {
    const allQuestions = quiz?.questions || [];
    if (!reviewOnly || reviewQuestionIds.length === 0) return allQuestions;
    const allowed = new Set(reviewQuestionIds);
    return allQuestions.filter((question) => allowed.has(question.id));
  }, [quiz?.questions, reviewOnly, reviewQuestionIds]);
  const quizId = quiz?.id;
  const sessionKey = `breadtrans:listening-session:user-${userId ?? "unknown"}:quiz-${quizId ?? "unknown"}${reviewOnly ? ":wrong-review" : ""}`;
  const utilityKey = `breadtrans:listening-utilities:user-${userId ?? "unknown"}:quiz-${quizId ?? "unknown"}`;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answersByQuestionId, setAnswersByQuestionId] = useState<
    Record<number, string>
  >({});
  const [checkResults, setCheckResults] = useState<
    Record<number, CheckPracticeQuestionResult>
  >({});
  const [dictationMetrics, setDictationMetrics] = useState<
    Record<number, DictationAttemptMetrics>
  >({});
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationNotice, setValidationNotice] = useState<string | null>(null);
  const [minLaunchReady, setMinLaunchReady] = useState(false);

  // Modern Exam toolbar & utilities state
  const [isBilingual, setIsBilingual] = useState(true);
  const [savedQuestions, setSavedQuestions] = useState<Record<number, boolean>>(
    {},
  );
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showMatrixPopover, setShowMatrixPopover] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notes, setNotes] = useState("");
  const [soundMuted, setSoundMuted] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [showFullTranscript, setShowFullTranscript] = useState(false);
  const [showAnswerImmediately, setShowAnswerImmediately] = useState(true);
  const [revealedQuestionIds, setRevealedQuestionIds] = useState<Record<number, boolean>>({});
  const [skippedQuestionIds, setSkippedQuestionIds] = useState<Record<number, boolean>>({});
  const [sessionHydrated, setSessionHydrated] = useState(false);
  const [attemptRestoreReady, setAttemptRestoreReady] = useState(reviewOnly);
  const [listeningAttemptId, setListeningAttemptId] = useState<number | null>(null);
  const [lookupWord, setLookupWord] = useState<string | null>(null);
  const [failedImageKey, setFailedImageKey] = useState<string | null>(null);
  const [loadedUtilityQuizId, setLoadedUtilityQuizId] = useState<number | null>(
    null,
  );
  const [audioProgress, setAudioProgress] = useState({
    currentTime: 0,
    duration: 0,
  });
  const discardSessionRef = useRef(false);
  const listeningAttemptIdRef = useRef<number | null>(null);
  const listeningAttemptPromiseRef = useRef<Promise<number | null> | null>(null);
  const listeningAttemptRequestKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!quizId || questions.length === 0 || !userId) return;
    const timer = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem(sessionKey);
        const stored = raw ? JSON.parse(raw) : {};
        const restoredIndex = Number.isInteger(stored.currentIndex)
          ? Math.min(Math.max(stored.currentIndex, 0), questions.length - 1)
          : 0;
        setCurrentIndex(restoredIndex);

        const restoredAnswers = { ...(stored.answersByQuestionId ?? {}) };
        const restoredSkipped = { ...(stored.skippedQuestionIds ?? {}) };

        // Active question at restoredIndex is the sentence currently being practiced.
        // On F5 refresh, it must return to its initial fresh state (neither skipped nor prefilled).
        const activeQ = questions[restoredIndex];
        if (activeQ) {
          delete restoredSkipped[activeQ.id];
          delete restoredAnswers[activeQ.id];
        }

        setAnswersByQuestionId(restoredAnswers);
        setCheckResults({});
        setDictationMetrics(stored.dictationMetrics ?? {});
        setRevealedQuestionIds({});
        setSkippedQuestionIds(restoredSkipped);
      } catch {
        setCurrentIndex(0);
        setAnswersByQuestionId({});
        setCheckResults({});
        setDictationMetrics({});
        setRevealedQuestionIds({});
        setSkippedQuestionIds({});
      }
      if (!useAuthStore.getState().user) setAttemptRestoreReady(true);
      setSessionHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [quizId, questions, sessionKey, userId]);

  useEffect(() => {
    if (
      !quizId ||
      !userId ||
      !sessionHydrated ||
      !attemptRestoreReady ||
      discardSessionRef.current
    ) return;
    // Only commit skipped states for questions the learner has moved away from.
    // The active question stays in clean draft until moving to another question.
    const persistedSkipped = { ...skippedQuestionIds };
    const activeQuestion = questions[currentIndex];
    if (activeQuestion) {
      delete persistedSkipped[activeQuestion.id];
    }

    localStorage.setItem(
      sessionKey,
      JSON.stringify({
        currentIndex,
        answersByQuestionId,
        dictationMetrics,
        skippedQuestionIds: persistedSkipped,
      }),
    );
  }, [
    answersByQuestionId,
    currentIndex,
    dictationMetrics,
    quizId,
    userId,
    sessionHydrated,
    sessionKey,
    skippedQuestionIds,
    attemptRestoreReady,
    questions,
  ]);

  useEffect(() => {
    if (
      !quizId ||
      reviewOnly ||
      !sessionHydrated ||
      !userId
    ) return;
    const requestKey = `${userId}:${quizId}`;
    if (listeningAttemptRequestKeyRef.current === requestKey) return;
    listeningAttemptRequestKeyRef.current = requestKey;
    let cancelled = false;
    const attemptPromise = quizService.getOrCreateListeningAttempt(quizId).then((attempt) => {
      // Keep the id even when navigation has already started so confirmed exit
      // can cancel a just-created server attempt instead of resuming it later.
      listeningAttemptIdRef.current = attempt.id;
      if (cancelled) return attempt.id;
      setListeningAttemptId(attempt.id);
      const localRaw = localStorage.getItem(sessionKey);
      if (localRaw) return attempt.id;
      if (attempt.currentQuestionId) {
        const restoredIndex = questions.findIndex(
          (question) => question.id === attempt.currentQuestionId,
        );
        if (restoredIndex >= 0) setCurrentIndex(restoredIndex);
      }
      if (attempt.answers && typeof attempt.answers === "object") {
        const serverAnswers = Object.fromEntries(
          Object.entries(attempt.answers).map(([key, value]) => [key, String(value)]),
        ) as Record<number, string>;
        const activeQId = attempt.currentQuestionId;
        if (activeQId && serverAnswers[activeQId]) {
          delete serverAnswers[activeQId];
        }
        setAnswersByQuestionId(serverAnswers);
      }
      return attempt.id;
    }).catch(() => {
      // Local persistence remains available when the optional server checkpoint is unavailable.
      listeningAttemptRequestKeyRef.current = null;
      return null;
    }).finally(() => {
      if (!cancelled) setAttemptRestoreReady(true);
    });
    listeningAttemptPromiseRef.current = attemptPromise;
    return () => {
      cancelled = true;
    };
  }, [quizId, questions, reviewOnly, sessionHydrated, sessionKey, userId]);

  const shortcutsRef = useRef<HTMLDivElement | null>(null);
  const matrixPopoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!quizId || !userId) return;

    const timer = window.setTimeout(() => {
      try {
        const stored = JSON.parse(
          localStorage.getItem(utilityKey) ??
            "{}",
        );
        setNotes(typeof stored.notes === "string" ? stored.notes : "");
        setSavedQuestions(
          stored.savedQuestions && typeof stored.savedQuestions === "object"
            ? stored.savedQuestions
            : {},
        );
      } catch {
        setNotes("");
        setSavedQuestions({});
      }
      setLoadedUtilityQuizId(quizId);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [quizId, utilityKey, userId]);

  useEffect(() => {
    if (!quizId || loadedUtilityQuizId !== quizId) return;

    localStorage.setItem(utilityKey, JSON.stringify({ notes, savedQuestions }));
  }, [loadedUtilityQuizId, notes, quizId, savedQuestions, utilityKey, userId]);

  // Single-ownership 350ms minimum duration gate for Listening
  useEffect(() => {
    const timer = setTimeout(() => setMinLaunchReady(true), 350);
    return () => clearTimeout(timer);
  }, []);

  // Dismiss popovers on outside click
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (
        shortcutsRef.current &&
        !shortcutsRef.current.contains(e.target as Node)
      ) {
        setShowShortcuts(false);
      }
      if (
        matrixPopoverRef.current &&
        !matrixPopoverRef.current.contains(e.target as Node)
      ) {
        setShowMatrixPopover(false);
      }
    };
    document.addEventListener("mousedown", handleDocumentClick);
    return () => document.removeEventListener("mousedown", handleDocumentClick);
  }, []);

  const currentQuestion = questions[currentIndex];

  const currentCheck = currentQuestion
    ? checkResults[currentQuestion.id]
    : undefined;
  const isChecked = Boolean(currentCheck);
  const isDictationQuestion = currentQuestion?.type === "DICTATION";
  const isSkipped = Boolean(
    currentQuestion && skippedQuestionIds[currentQuestion.id],
  );
  const isRevealed = Boolean(currentQuestion && revealedQuestionIds[currentQuestion.id]);
  const canRetryDictation = Boolean(
    isDictationQuestion &&
      !isSkipped &&
      isChecked &&
      currentCheck &&
      !currentCheck.isCorrect,
  );
  const isAnswerLocked = isSkipped || (isChecked && !canRetryDictation);
  const parsedExplanation = parseQuestionExplanation(currentCheck?.explanation);
  const selectedAnswer = currentQuestion
    ? answersByQuestionId[currentQuestion.id] || ""
    : "";
  const isLastQuestion = currentIndex === questions.length - 1;
  const isSaved = Boolean(
    currentQuestion && savedQuestions[currentQuestion.id],
  );

  // Options for current question
  const options: string[] = currentQuestion?.content?.options || [
    "A",
    "B",
    "C",
    "D",
  ];
  const accent: string | undefined = currentQuestion?.content?.accent;
  const level: string | undefined = currentQuestion?.content?.level;

  // Check mutation
  const handleCheck = async (
    answer = selectedAnswer,
  ): Promise<CheckPracticeQuestionResult | null> => {
    if (
      !quiz ||
      !currentQuestion ||
      isChecking ||
      (answer.trim().length === 0 && currentQuestion.type !== "DICTATION") ||
      (isChecked && !canRetryDictation)
    ) return null;
    setIsChecking(true);
    setValidationNotice(null);
    try {
      const res = await quizService.checkPracticeQuestion(
        quiz.id,
        currentQuestion.id,
        answer,
      );
      let canonicalizedSubmitted = answer;
      if (currentQuestion.type === "DICTATION") {
        const canonical =
          res?.correctAnswer ||
          (currentQuestion.content as any)?.correctAnswer ||
          (currentQuestion.content as any)?.audioText ||
          "";
        canonicalizedSubmitted = canonicalizeSubmittedDictation(canonical, answer);
        if (canonicalizedSubmitted !== answer) {
          setAnswersByQuestionId((prev) => ({
            ...prev,
            [currentQuestion.id]: canonicalizedSubmitted,
          }));
        }
      }

      setCheckResults((prev) => ({
        ...prev,
        [currentQuestion.id]: res,
      }));
      // A new check starts a fresh comparison. Do not carry a previous
      // "show masked answer" hint into the next attempt.
      setRevealedQuestionIds((previous) => {
        if (!previous[currentQuestion.id]) return previous;
        const next = { ...previous };
        delete next[currentQuestion.id];
        return next;
      });
      checkpointAttempt({
        currentQuestionId: currentQuestion.id,
        answers: { ...answersByQuestionId, [currentQuestion.id]: canonicalizedSubmitted },
        questionStates: { ...checkResults, [currentQuestion.id]: res },
      });
      if (currentQuestion.type === "DICTATION") {
        setDictationMetrics((previous) => {
          const prior = previous[currentQuestion.id] ?? {
            attemptCount: 0,
            firstTryCorrect: null,
            bestWordAccuracy: 0,
            hintCount: 0,
            replayCount: 0,
            revealed: false,
          };
          const wordAccuracy = Number.isFinite(res.wordAccuracy)
            ? res.wordAccuracy ?? 0
            : res.isCorrect
              ? 100
              : 0;
          return {
            ...previous,
            [currentQuestion.id]: {
              ...prior,
              attemptCount: prior.attemptCount + 1,
              firstTryCorrect:
                prior.attemptCount === 0
                  ? res.isCorrect
                  : prior.firstTryCorrect,
              bestWordAccuracy: Math.max(prior.bestWordAccuracy, wordAccuracy),
            },
          };
        });
      }
      return res;
    } catch {
      setValidationNotice("Không thể kiểm tra câu trả lời. Vui lòng thử lại.");
      return null;
    } finally {
      setIsChecking(false);
    }
  };

  const handleAnswerSelect = (answer: string) => {
    if (
      !currentQuestion ||
      isChecking ||
      (isChecked && !canRetryDictation)
    ) return;

    setAnswersByQuestionId((prev) => ({
      ...prev,
      [currentQuestion.id]: answer,
    }));
    void handleCheck(answer);
  };

  const checkpointAttempt = useCallback((
    overrides: {
      currentQuestionId?: number;
      answers?: Record<number, string>;
      questionStates?: Record<number, unknown>;
    } = {},
  ) => {
    if (reviewOnly || !quizId || !listeningAttemptId) return;
    void quizService.saveListeningAttempt(quizId, listeningAttemptId, {
      currentQuestionId: overrides.currentQuestionId ?? currentQuestion?.id,
      answers: overrides.answers ?? answersByQuestionId,
      questionStates: overrides.questionStates ?? checkResults,
    }).catch(() => {
      // Local session storage remains the immediate recovery path if checkpointing is offline.
    });
  }, [answersByQuestionId, checkResults, currentQuestion?.id, listeningAttemptId, quizId, reviewOnly]);

  // Check if every question has an answer and has been checked
  const checkIsAllComplete = () => {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const ans = answersByQuestionId[q.id];
      const chk = checkResults[q.id];
      if (skippedQuestionIds[q.id]) continue;
      if (!chk) {
        return { isComplete: false, firstUnresolvedIndex: i };
      }
      if (!ans || ans.trim().length === 0) {
        return { isComplete: false, firstUnresolvedIndex: i };
      }
      // Dictation is a learning loop: an incorrect check remains
      // editable/retryable and must not count as completed.
      if (
        q.type === "DICTATION" &&
        !chk.isCorrect &&
        !skippedQuestionIds[q.id]
      ) {
        return { isComplete: false, firstUnresolvedIndex: i };
      }
    }
    return { isComplete: true, firstUnresolvedIndex: -1 };
  };

  // Final submit mutation
  const submitMutation = useMutation({
    mutationFn: (input: { payload: AnswerDto[]; attemptId: number | null }) =>
      quizService.submitQuiz(quiz?.id ?? 0, input.payload, input.attemptId ?? undefined),
    onSuccess: (data) => {
      localStorage.removeItem(sessionKey);
      // Invalidate relevant query caches
      queryClient.invalidateQueries({ queryKey: ["listeningPractices"] });
      queryClient.invalidateQueries({ queryKey: ["listening-practices"] });
      queryClient.invalidateQueries({ queryKey: ["myQuests"] });
      queryClient.invalidateQueries({ queryKey: ["daily-quests"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      const currentUserId = useAuthStore.getState().user?.id;
      queryClient.invalidateQueries({
        queryKey: ["user-stats", currentUserId],
      });

      // Navigate to submission result page
      router.push(`/practice/quizzes/submissions/${data.id}`);
    },
    onError: () => {
      setIsSubmitting(false);
      setSubmitError(
        "Có lỗi xảy ra khi nộp bài. Câu trả lời của bạn vẫn được lưu, vui lòng thử lại.",
      );
    },
  });

  // Confirmed exit must discard both local and server checkpoints. Otherwise
  // re-entering the same quiz would restore an answer the learner abandoned.
  const handleConfirmedExit = async () => {
    discardSessionRef.current = true;
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(sessionKey);
    }
    setCurrentIndex(0);
    setAnswersByQuestionId({});
    setCheckResults({});
    setDictationMetrics({});
    setRevealedQuestionIds({});
    setSkippedQuestionIds({});
    let attemptIdToCancel = listeningAttemptIdRef.current ?? listeningAttemptId;
    if (
      !reviewOnly &&
      quizId &&
      !attemptIdToCancel &&
      listeningAttemptPromiseRef.current
    ) {
      attemptIdToCancel = await listeningAttemptPromiseRef.current;
    }
    if (!reviewOnly && quizId && attemptIdToCancel) {
      await quizService.cancelListeningAttempt(quizId, attemptIdToCancel).catch(() => {
        // The local checkpoint is already discarded; a transient server
        // failure must not block the learner from leaving the page.
      });
    }
  };

  // Mandatory exit confirmation: session is active and has not been successfully submitted
  const shouldConfirmExit = !submitMutation.isSuccess;
  const { confirmExit, exitDialogProps } = usePracticeExitGuard({
    shouldConfirmExit,
    onConfirmExit: handleConfirmedExit,
    defaultFallbackUrl: "/practice/listening",
    enabled: true,
  });

  const retryListeningAttemptCreation = async (): Promise<number | null> => {
    if (!quizId || reviewOnly) return null;
    listeningAttemptRequestKeyRef.current = null;
    const retryPromise = quizService
      .getOrCreateListeningAttempt(quizId)
      .then((attempt) => {
        listeningAttemptIdRef.current = attempt.id;
        setListeningAttemptId(attempt.id);
        return attempt.id;
      })
      .catch(() => {
        listeningAttemptRequestKeyRef.current = null;
        return null;
      });
    listeningAttemptPromiseRef.current = retryPromise;
    return retryPromise;
  };

  // Handle final submission with client-side double-click guard
  const handleFinalSubmit = async () => {
    if (reviewOnly) {
      confirmExit("/practice/listening");
      return;
    }
    if (isSubmitting || submitMutation.isPending) return;

    const { isComplete, firstUnresolvedIndex } = checkIsAllComplete();
    if (!isComplete) {
      setCurrentIndex(firstUnresolvedIndex);
      setValidationNotice(
        "Vui lòng chọn đáp án và kiểm tra câu hỏi này trước khi nộp bài.",
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setValidationNotice(null);

    const payload: AnswerDto[] = questions.map((q) => ({
      questionId: q.id,
      answer: skippedQuestionIds[q.id] ? "" : answersByQuestionId[q.id],
    }));

    checkpointAttempt({
      currentQuestionId: currentQuestion?.id,
      answers: questions.reduce<Record<number, string>>((answers, question) => {
        answers[question.id] = skippedQuestionIds[question.id]
          ? ""
          : answersByQuestionId[question.id] ?? "";
        return answers;
      }, {}),
      questionStates: Object.entries(checkResults).reduce<Record<number, unknown>>(
        (states, [questionId, state]) => {
          const numericQuestionId = Number(questionId);
          states[numericQuestionId] = skippedQuestionIds[numericQuestionId]
            ? { ...state, skipped: true }
            : state;
          return states;
        },
        {},
      ),
    });
    // A very fast learner can reach the last answer before the initial
    // get-or-create request resolves. Wait for that request so the final
    // submission always completes the same persisted server attempt.
    let attemptIdToSubmit = listeningAttemptIdRef.current ?? listeningAttemptId;
    if (!attemptIdToSubmit && listeningAttemptPromiseRef.current) {
      attemptIdToSubmit = await listeningAttemptPromiseRef.current;
    }
    if (!attemptIdToSubmit) {
      attemptIdToSubmit = await retryListeningAttemptCreation();
    }
    submitMutation.mutate({ payload, attemptId: attemptIdToSubmit });
  };

  // Advance to next question - commit state when transitioning
  const handleNextQuestion = () => {
    setValidationNotice(null);
    if (currentIndex < questions.length - 1) {
      const nextQ = questions[currentIndex + 1];
      // Clear failed (not-yet-correct) check so error panel doesn't persist on return
      if (currentQuestion && checkResults[currentQuestion.id] && !checkResults[currentQuestion.id]?.isCorrect && !checkResults[currentQuestion.id]?.skipped) {
        setCheckResults((prev) => {
          const next = { ...prev };
          delete next[currentQuestion.id];
          return next;
        });
      }
      checkpointAttempt({
        currentQuestionId: nextQ?.id,
        answers: skippedQuestionIds[currentQuestion.id]
          ? { ...answersByQuestionId, [currentQuestion.id]: "" }
          : answersByQuestionId,
        questionStates: checkResults,
      });
      setCurrentIndex((prev) => prev + 1);
    }
  };

  // Return to previous question
  const handlePrevQuestion = () => {
    setValidationNotice(null);
    if (currentIndex > 0) {
      // Clear failed check so error panel hides when returning to prev question
      if (currentQuestion && checkResults[currentQuestion.id] && !checkResults[currentQuestion.id]?.isCorrect && !checkResults[currentQuestion.id]?.skipped) {
        setCheckResults((prev) => {
          const next = { ...prev };
          delete next[currentQuestion.id];
          return next;
        });
      }
      checkpointAttempt({ currentQuestionId: questions[currentIndex - 1]?.id });
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleSkipQuestion = async () => {
    if (
      !currentQuestion ||
      isSkipped ||
      (isChecked && !canRetryDictation) ||
      isChecking
    ) return;

    let canonical =
      checkResults[currentQuestion.id]?.correctAnswer ||
      (currentQuestion.content as any)?.correctAnswer ||
      (currentQuestion.content as any)?.audioText ||
      "";
    let trans =
      checkResults[currentQuestion.id]?.translation ||
      (currentQuestion.content as any)?.translation ||
      "";

    if ((!canonical || !trans) && quizId && isDictationQuestion) {
      setIsChecking(true);
      try {
        const res = await quizService.checkPracticeQuestion(
          quizId,
          currentQuestion.id,
          answersByQuestionId[currentQuestion.id] || "",
        );
        if (res?.correctAnswer) canonical = res.correctAnswer;
        if (res?.translation) trans = res.translation;
      } catch (err) {
        console.error("Failed to query canonical answer on skip:", err);
      } finally {
        setIsChecking(false);
      }
    }

    setSkippedQuestionIds((previous) => ({ ...previous, [currentQuestion.id]: true }));

    if (canonical) {
      setAnswersByQuestionId((previous) => ({
        ...previous,
        [currentQuestion.id]: canonical,
      }));
    }

    setCheckResults((previous) => ({
      ...previous,
      [currentQuestion.id]: {
        isCorrect: false,
        skipped: true,
        submittedAnswer: canonical || "",
        correctAnswer: canonical,
        translation: trans,
        diff: [],
        wordAccuracy: 0,
      } as any,
    }));
    setValidationNotice(null);

    if (!isDictationQuestion) {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex((previous) => previous + 1);
      } else {
        setValidationNotice("Đã bỏ qua câu cuối. Bạn có thể xem lại câu này trong bảng câu hỏi.");
      }
    }
  };

  const toggleRevealAnswer = () => {
    if (!currentQuestion || !currentCheck) return;
    setRevealedQuestionIds((previous) => ({
      ...previous,
      [currentQuestion.id]: !previous[currentQuestion.id],
    }));
  };

  const handleRetryQuestion = useCallback(() => {
    if (!currentQuestion) return;
    const qId = currentQuestion.id;
    setValidationNotice(null);
    setCheckResults((prev) => {
      const next = { ...prev };
      delete next[qId];
      return next;
    });
    setSkippedQuestionIds((prev) => {
      const next = { ...prev };
      delete next[qId];
      return next;
    });
    setRevealedQuestionIds((prev) => {
      const next = { ...prev };
      delete next[qId];
      return next;
    });
    setAnswersByQuestionId((prev) => {
      const next = { ...prev };
      delete next[qId];
      return next;
    });
    checkpointAttempt({
      currentQuestionId: qId,
      answers: { ...answersByQuestionId, [qId]: "" },
      questionStates: { ...checkResults, [qId]: null },
    });
  }, [currentQuestion, answersByQuestionId, checkResults, checkpointAttempt]);

  // Keyboard shortcut listeners (1-4 select and check, Enter advances)
  const latestActionsRef = useRef({
    isChecked,
    canRetryDictation,
    isSkipped,
    isRevealed,
    currentCheck,
    currentQuestion,
    currentAnswer: selectedAnswer,
    options,
    isLastQuestion,
    handleAnswerSelect,
    handleCheck,
    handleFinalSubmit,
    handleNextQuestion,
    handleSkipQuestion,
    toggleRevealAnswer,
  });

  useEffect(() => {
    latestActionsRef.current = {
      isChecked,
      canRetryDictation,
      isSkipped,
      isRevealed,
      currentCheck,
      currentQuestion,
      currentAnswer: selectedAnswer,
      options,
      isLastQuestion,
      handleAnswerSelect,
      handleCheck,
      handleFinalSubmit,
      handleNextQuestion,
      handleSkipQuestion,
      toggleRevealAnswer,
    };
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || "").toLowerCase();
      const actions = latestActionsRef.current;
      const isTyping = activeTag === "input" || activeTag === "textarea" ||
        (document.activeElement as HTMLElement | null)?.isContentEditable;

      if (e.ctrlKey && e.code === "Enter") {
        e.preventDefault();
        if (actions.isChecked && !actions.canRetryDictation) {
          if (actions.isLastQuestion) actions.handleFinalSubmit();
          else actions.handleNextQuestion();
        } else if (actions.currentQuestion?.type === "DICTATION") {
          const answer = actions.currentAnswer;
          void actions.handleCheck(answer);
        }
        return;
      }

      if (e.ctrlKey && e.code === "Space") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("breadtrans:toggle-listening-audio"));
        return;
      }

      if (e.altKey && e.key.toLowerCase() === "r") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("breadtrans:replay-listening-audio"));
        return;
      }
      if (e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        actions.handleSkipQuestion();
        return;
      }
      if (e.altKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        actions.toggleRevealAnswer();
        return;
      }
      if (e.altKey && e.key.toLowerCase() === "t") {
        e.preventDefault();
        setShowFullTranscript((value) => !value);
        return;
      }
      if (e.altKey && (e.key === "[" || e.key === "]")) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("breadtrans:change-listening-speed", {
          detail: { direction: e.key === "]" ? "up" : "down" },
        }));
        return;
      }

      if (isTyping) return;

      if (
        !actions.isChecked &&
        actions.currentQuestion &&
        actions.currentQuestion.type !== "DICTATION"
      ) {
        if (["1", "2", "3", "4"].includes(e.key)) {
          const optIdx = parseInt(e.key, 10) - 1;
          const chosen = actions.options[optIdx];
          if (chosen) {
            e.preventDefault();
            actions.handleAnswerSelect(chosen);
          }
        }
      }

      if (e.key === "Enter" && !e.shiftKey) {
        if (actions.currentQuestion?.type === "DICTATION") {
          return;
        }
        e.preventDefault();
        const canAdvance =
          actions.isSkipped ||
          (actions.isChecked && actions.currentCheck?.isCorrect) ||
          (actions.isChecked && !actions.canRetryDictation);
        if (canAdvance) {
          if (actions.isLastQuestion) {
            actions.handleFinalSubmit();
          } else {
            actions.handleNextQuestion();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Loading and error states
  if (isLoading || !quiz) {
    return (
      <div className="fixed inset-0 z-[45] w-screen h-[100dvh] flex items-center justify-center bg-white dark:bg-slate-950">
        <PracticeLoadingScreen skill="listening" className="max-w-4xl" />
      </div>
    );
  }

  if (!minLaunchReady || !currentQuestion) {
    if (minLaunchReady && !currentQuestion) {
      return (
        <div className="fixed inset-0 z-[45] w-screen h-[100dvh] flex flex-col items-center justify-center bg-white dark:bg-slate-950 p-8 text-center">
          <p className="text-base font-bold text-slate-700 dark:text-slate-300">
            Bài luyện nghe này chưa có câu hỏi nào.
          </p>
          <button
            type="button"
            onClick={() => confirmExit("/practice/listening")}
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-500 px-5 text-sm font-extrabold text-white hover:bg-amber-600 cursor-pointer"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Quay lại danh sách
          </button>
        </div>
      );
    }
    return (
      <div className="fixed inset-0 z-[45] w-screen h-[100dvh] flex items-center justify-center bg-white dark:bg-slate-950">
        <PracticeLoadingScreen skill="listening" className="max-w-4xl" />
      </div>
    );
  }

  const questionContent = (currentQuestion?.content ?? {}) as QuestionContent;
  // A visual is opt-in. General listening questions must not inherit a
  // quiz-level image that is unrelated to their audio/question context.
  const isTopicContext = questionContent.imagePurpose === "TOPIC_CONTEXT";
  const imageUrl =
    isTopicContext &&
    typeof questionContent.imageUrl === "string" &&
    questionContent.imageUrl.trim()
      ? questionContent.imageUrl.trim()
      : null;
  const imageKey = currentQuestion ? `${currentQuestion.id}:${imageUrl ?? ""}` : "";
  const imageLoadFailed = imageKey.length > 0 && failedImageKey === imageKey;
  const imageAlt =
    typeof questionContent.imageAlt === "string" &&
    questionContent.imageAlt.trim()
      ? questionContent.imageAlt.trim()
      : "";
  const transcriptSegments = Array.isArray(questionContent.transcriptSegments)
    ? questionContent.transcriptSegments.filter(
        (segment) =>
          segment &&
          typeof segment.speaker === "string" &&
          typeof segment.text === "string" &&
          segment.text.trim().length > 0,
      )
    : [];
  const hasBilingualTranslation =
    (typeof questionContent.translation === "string" &&
      questionContent.translation.trim().length > 0) ||
    transcriptSegments.some(
      (segment) =>
        typeof segment.translation === "string" &&
        segment.translation.trim().length > 0,
    );
  const isDialogue = transcriptSegments.length > 0;
  const isDictation = currentQuestion.type === "DICTATION";
  const dictationDiff: DictationDiffToken[] =
    isDictation && currentCheck
      ? diffDictationAnswer(currentCheck.correctAnswer ?? "", currentCheck.submittedAnswer ?? "")
      : [];
  const activeTranscriptSegmentIndex = getActiveTranscriptSegmentIndex(
    transcriptSegments,
    audioProgress.currentTime,
  );

  const seekToTranscriptSegment = (segment: NonNullable<QuestionContent["transcriptSegments"]>[number]) => {
    if (!Number.isFinite(segment.startMs) || !Number.isFinite(segment.endMs)) return;
    window.dispatchEvent(
      new CustomEvent("breadtrans:seek-listening-audio", {
        detail: { time: Number(segment.startMs) / 1000, endTime: Number(segment.endMs) / 1000 },
      }),
    );
  };

  const showToast = (message: string, duration = 3000) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), duration);
  };

  const handleDictionaryLookup = () => {
    const selected = window.getSelection()?.toString().trim() ?? "";
    const word = selected
      .replace(/[’‘ʼ]/g, "'")
      .replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, "");

    if (!/^[A-Za-z]+(?:'[A-Za-z]+)?$/.test(word)) {
      showToast("Bôi đen một từ tiếng Anh, rồi chọn Tra từ.");
      return;
    }

    setLookupWord(word);
  };

  const levelTag = level || quiz.bilingualContent?.skillLabel || "A1 BEGINNER";

  if (isDictation) {
    return (
      <>
        <DailyDictationWorkspace
          quiz={quiz}
          questions={questions}
          currentQuestion={currentQuestion}
          currentIndex={currentIndex}
          selectedAnswer={selectedAnswer}
          onChangeAnswer={(val) => {
            if (isAnswerLocked || isSkipped) return;
            setAnswersByQuestionId((prev) => ({
              ...prev,
              [currentQuestion.id]: val,
            }));

            // When user types or edits answer after a check, dismiss the check error feedback
            // panel so it never diffs in real-time. Check feedback only appears when pressing Enter / Check.
            if (currentQuestion && checkResults[currentQuestion.id] && !checkResults[currentQuestion.id]?.isCorrect) {
              setCheckResults((prev) => {
                const next = { ...prev };
                delete next[currentQuestion.id];
                return next;
              });
            }
          }}
          onCheck={handleCheck}
          isChecking={isChecking}
          isChecked={isChecked}
          isSkipped={isSkipped}
          currentCheck={currentCheck}
          dictationDiff={dictationDiff}
          dictationMetrics={dictationMetrics}
          isRevealed={isRevealed}
          onToggleReveal={toggleRevealAnswer}
          showAnswerImmediately={showAnswerImmediately}
          onToggleShowAnswerImmediately={() => setShowAnswerImmediately((value) => !value)}
          onSkip={handleSkipQuestion}
          onRetry={handleRetryQuestion}
          onNext={handleNextQuestion}
          onPrev={handlePrevQuestion}
          onFinalSubmit={handleFinalSubmit}
          isSubmitting={isSubmitting || submitMutation.isPending}
          submitError={submitError}
          reviewOnly={reviewOnly}
          onExit={confirmExit}
          accent={accent}
          level={level}
        />
        <PracticeExitConfirmDialog {...exitDialogProps} />
        {lookupWord && (
          <WordDictionaryPopup
            word={lookupWord}
            onClose={() => setLookupWord(null)}
          />
        )}
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-[45] w-screen h-[100dvh] flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* 1. Full-Width Top Exam Header */}
      <header className="w-full h-14 bg-slate-900 text-white px-3 sm:px-6 flex items-center justify-between shrink-0 select-none border-b border-slate-800 z-30">
        {/* Left Section: Thoát button + Breadcrumb / Section Tag */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => confirmExit("/practice/listening")}
            className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-2.5 sm:px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Thoát<span className="hidden sm:inline"> bài luyện</span></span>
          </button>

          <span className="text-slate-600 hidden sm:inline">|</span>

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs sm:text-sm font-bold text-slate-100 truncate max-w-[120px] xs:max-w-[200px] sm:max-w-[320px] md:max-w-[480px]">
              {quiz.title}
            </span>
            <span className="hidden xs:inline-flex shrink-0 rounded bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
              {reviewOnly ? "ÔN CÂU SAI" : levelTag}
            </span>
          </div>
        </div>

        {/* Right Section: Utility Tools + Live Counter */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Song ngữ pill */}
          <button
            type="button"
            onClick={() => {
              if (!hasBilingualTranslation) {
                showToast("Bài luyện này chưa có bản dịch song ngữ.");
                return;
              }
              setIsBilingual((value) => !value);
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
              hasBilingualTranslation && isBilingual
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
            }`}
            title={
              hasBilingualTranslation
                ? "Bật / tắt bản dịch tiếng Việt"
                : "Bài luyện này chưa có bản dịch song ngữ"
            }
            aria-pressed={hasBilingualTranslation && isBilingual}
          >
            <Languages size={14} />
            <span className="hidden md:inline">Song ngữ</span>
          </button>

          {/* Ghi chú pill */}
          <button
            type="button"
            onClick={() => setShowNotesModal(true)}
            className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Ghi chú bài làm"
          >
            <StickyNote size={14} />
            <span className="hidden md:inline">Ghi chú</span>
          </button>

          {/* Phím tắt pill with popover (hidden on mobile touchscreen) */}
          <div className="relative hidden sm:block" ref={shortcutsRef}>
            <button
              type="button"
              onClick={() => setShowShortcuts((v) => !v)}
              className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Xem phím tắt nhanh"
              aria-expanded={showShortcuts}
            >
              <Keyboard size={14} />
              <span className="hidden md:inline">Phím tắt</span>
            </button>

            {showShortcuts && (
              <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-4 shadow-xl z-50 text-slate-800 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-2.5">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                    Phím tắt nhanh
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowShortcuts(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-md cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
                <ul className="space-y-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                  <li className="flex items-center justify-between">
                    <span>Phát / Dừng audio:</span>
                    <kbd className="rounded border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200">
                      Ctrl + Space
                    </kbd>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Chọn đáp án A - D:</span>
                    <kbd className="rounded border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200">
                      1, 2, 3, 4
                    </kbd>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Kiểm tra / Câu tiếp:</span>
                    <kbd className="rounded border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200">
                      Ctrl + Enter
                    </kbd>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Tua lại 5 giây:</span>
                    <kbd className="rounded border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200">
                      Shift + ←
                    </kbd>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Nghe lại / Bỏ qua / Hiện đáp án:</span>
                    <kbd className="rounded border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200">
                      Alt + R / S / A
                    </kbd>
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Audio mute toggle */}
          <button
            type="button"
            onClick={() => setSoundMuted((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
              soundMuted
                ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                : "bg-slate-800 text-slate-300 border-slate-700 hover:text-white"
            }`}
            title={soundMuted ? "Âm thanh: Đã tắt" : "Âm thanh: Đang bật"}
          >
            {soundMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            <span className="hidden md:inline">Âm thanh</span>
          </button>

          {(isDialogue || (isDictation && isChecked)) && (
            <button
              type="button"
              onClick={() => {
                if (isDialogue) {
                  setTranscriptOpen((value) => !value);
                } else {
                  setShowFullTranscript((value) => !value);
                }
              }}
              aria-pressed={isDialogue ? transcriptOpen : showFullTranscript}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                (isDialogue ? transcriptOpen : showFullTranscript)
                  ? "border-sky-500/40 bg-sky-500/20 text-sky-200"
                  : "border-slate-700 bg-slate-800 text-slate-300 hover:text-white"
              }`}
            >
              <FileText size={14} aria-hidden="true" />
              <span className="hidden md:inline">Transcript</span>
            </button>
          )}

          {/* Live Progress Counter Badge */}
          <div className="flex items-center gap-1.5 rounded-lg bg-slate-800 border border-slate-700 px-3 py-1 text-xs font-bold text-amber-400 shrink-0">
            <span>
              Câu {currentIndex + 1} / {questions.length}
            </span>
          </div>
        </div>
      </header>

      {/* 2. Main Listening Workspace. Dictation keeps audio and input in one focused vertical flow. */}
      <main
        className={`flex-1 w-full min-h-0 ${
          isDictation
            ? "grid grid-cols-1 content-start gap-0 overflow-y-auto bg-slate-50/70 dark:bg-slate-950 px-4 py-6 sm:px-6 lg:px-8"
            : "grid grid-cols-1 divide-y overflow-hidden lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]"
        }`}
      >
        {/* Left Panel — Audio & Conversation */}
        <section
          className={`w-full min-w-0 p-6 md:p-8 flex flex-col ${
            isDictation
              ? "mx-auto max-w-4xl justify-start rounded-t-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm"
              : "h-full justify-between overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50 min-h-0"
          }`}
        >
          <div
            className={
              isDictation
                ? "mx-auto flex w-full max-w-3xl flex-col justify-start"
                : "flex-1 flex flex-col min-h-0"
            }
          >
            {/* Keep the dialogue itself as the primary instruction. */}
            {!isDialogue && (
              <p className="mb-3 shrink-0 text-sm font-medium text-slate-600 dark:text-slate-400">
                {isDictation
                  ? "Nghe câu hoặc đoạn ngắn, sau đó chép lại điều bạn nghe được."
                  : "Listen carefully, then choose the answer that best matches the recording."}
              </p>
            )}

            {isDictation && (
              <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 shadow-xs" role="tablist" aria-label="Chế độ bài nghe chép">
                  <button
                    type="button"
                    role="tab"
                    aria-selected="true"
                    className="min-h-10 rounded-lg bg-sky-50 dark:bg-sky-950/50 px-4 text-sm font-extrabold text-sky-700 dark:text-sky-300"
                  >
                    Dictation
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={showFullTranscript}
                    disabled={!isChecked}
                    onClick={() => setShowFullTranscript(true)}
                    className="min-h-10 rounded-lg px-4 text-sm font-semibold text-slate-500 dark:text-slate-400 transition hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Full transcript
                  </button>
                </div>
                <span className="shrink-0 text-xs font-bold text-slate-500 dark:text-slate-400">
                  {currentIndex + 1} / {questions.length}
                </span>
              </div>
            )}

            {/* Audio Control Station */}
            <ListeningAudioPlayer
              key={currentQuestion.id}
              quizId={quiz.id}
              questionId={currentQuestion.id}
              audioVersion={currentQuestion.audioAssets?.find((asset) => asset.isActive)?.version}
              accent={accent}
              muted={soundMuted}
              className={
                isDictation
                  ? "rounded-2xl border border-sky-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm sm:p-6 shrink-0"
                  : "p-0 border-0 bg-transparent shadow-none shrink-0"
              }
              onProgress={(currentTime, duration) =>
                setAudioProgress({ currentTime, duration })
              }
            />

            {currentQuestion.diagnosticClips && currentQuestion.diagnosticClips.length > 0 && (
              <section
                className="my-4 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/40 p-4"
                aria-label="Đoạn audio luyện nghe theo lỗi cần chú ý"
              >
                <div className="mb-3 flex items-center gap-2">
                  <AlertCircle size={16} className="text-amber-600 dark:text-amber-400" aria-hidden="true" />
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Đoạn nghe cần luyện thêm</h2>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Nghe lại từng đoạn ngắn do người biên soạn đánh dấu.</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {currentQuestion.diagnosticClips.map((clip) => (
                    <div key={clip.id} className="flex flex-col gap-2 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-white dark:bg-slate-900 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{clip.label}</span>
                      <audio controls preload="none" src={clip.url} className="h-9 w-full max-w-sm" />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {showFullTranscript && isDictation && isChecked && currentCheck && (
              <section className="my-4 rounded-2xl border border-sky-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4" aria-label="Transcript câu nghe chép">
                <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  <FileText size={16} className="text-sky-600 dark:text-sky-400" aria-hidden="true" />
                  Transcript câu nghe
                </div>
                <p className="mt-2 text-base leading-relaxed text-slate-800 dark:text-slate-200">{currentCheck.correctAnswer}</p>
              </section>
            )}

            {/* Dialogue transcript follows decoded audio progress, rather than static timestamps. */}
            {isDialogue && (
              <section
                aria-label="Lời thoại hội thoại đồng bộ với âm thanh"
                className="my-4 flex-1 min-h-0 overflow-y-auto rounded-2xl border border-sky-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs sm:p-5"
              >
                <div className="mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <MessageCircleMore size={17} className="text-sky-600 dark:text-sky-400" aria-hidden="true" />
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 sm:text-lg">Hội thoại</h2>
                </div>
                <ol className="space-y-3">
                  {transcriptSegments.map((segment, index) => {
                    const isActive = index === activeTranscriptSegmentIndex;
                    const speakerLabel = getDialogueSpeakerLabel(segment.speaker);
                    return (
                      <li
                        key={`${currentQuestion.id}-${index}-${segment.speaker}`}
                        aria-current={isActive ? "true" : undefined}
                        className={`rounded-xl border p-4 transition-colors motion-reduce:transition-none sm:p-5 ${
                          isActive
                            ? "border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/40 shadow-xs"
                            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => seekToTranscriptSegment(segment)}
                          disabled={!Number.isFinite(segment.startMs) || !Number.isFinite(segment.endMs)}
                          className="w-full text-left disabled:cursor-default"
                          aria-label={`Phát lượt lời ${index + 1}`}
                        >
                        <p className="text-base font-semibold leading-8 text-slate-900 dark:text-slate-100 sm:text-lg md:text-xl">
                          <span className="font-extrabold text-sky-700 dark:text-sky-400">
                            {speakerLabel}:
                          </span>{" "}
                          {segment.text}
                        </p>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </section>
            )}

            {/* Large contextual image is intentionally secondary to a dialogue transcript. */}
            {!isDialogue && imageUrl && !imageLoadFailed && (
              <div className="w-full flex-1 flex items-center justify-center my-4 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-xs min-h-0">
                <img
                  src={imageUrl}
                  alt={imageAlt || "TOEIC Listening Context"}
                  loading="eager"
                  decoding="async"
                  onError={() => setFailedImageKey(imageKey)}
                  className="w-full h-full max-h-[calc(100dvh-260px)] object-contain rounded-xl"
                />
              </div>
            )}
            {!isDialogue && imageUrl && imageLoadFailed && (
              <div
                role="img"
                aria-label={imageAlt || "Hình minh họa ngữ cảnh bài nghe"}
                className="w-full flex-1 flex items-center justify-center my-4 overflow-hidden rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-6 text-center min-h-[180px]"
              >
                <p className="max-w-sm text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                  Hình minh họa hiện chưa tải được. Bạn vẫn có thể tiếp tục nghe
                  và trả lời câu hỏi.
                </p>
              </div>
            )}

            {!isDialogue && !isDictation && !imageUrl && (
              <section
                aria-label="Khu vực tập trung nghe"
                className="my-4 flex min-h-[220px] flex-1 items-center justify-center rounded-2xl border border-sky-100 dark:border-sky-950 bg-sky-50/60 dark:bg-sky-950/20 px-6 py-10 text-center shadow-xs sm:min-h-[280px]"
              >
                <div className="max-w-md">
                  <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-sky-200 dark:border-sky-800 bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs">
                    <Volume2 size={24} aria-hidden="true" />
                  </div>
                  <h2 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-slate-100 sm:text-xl">
                    Tập trung nghe đoạn ghi âm
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400 sm:text-base">
                    Bài này không dùng hình minh họa. Hãy nghe kỹ nội dung và
                    chọn đáp án phù hợp ở bên phải.
                  </p>
                  <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-sky-100 dark:border-sky-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-sky-700 dark:text-sky-300">
                    <span className="size-1.5 rounded-full bg-sky-500" aria-hidden="true" />
                    Audio là nội dung chính của bài luyện
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Audio Transcript / Hint Drawer (Bottom of Left Panel) */}
          {!isDictation && <div className="mt-auto rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-all shrink-0 shadow-xs">
            <button
              type="button"
              onClick={() => {
                if (isDialogue || isChecked) setTranscriptOpen((prev) => !prev);
              }}
              disabled={!isDialogue && !isChecked}
              className={`w-full flex items-center justify-between text-xs font-bold transition ${
                isDialogue || isChecked
                  ? "text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  : "text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-75"
              }`}
            >
              <span className="flex items-center gap-2">
                <FileText
                  size={15}
                  className={isDialogue || isChecked ? "text-sky-600 dark:text-sky-400" : "text-slate-400 dark:text-slate-500"}
                />
                <span>{isDialogue ? "Transcript song ngữ" : "Bản ghi âm &amp; Lời thoại (Transcript)"}</span>
              </span>
              {isDialogue || isChecked ? (
                <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {transcriptOpen ? "Thu gọn" : "Xem nội dung"}
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${
                      transcriptOpen ? "rotate-180" : ""
                    }`}
                  />
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                  (Mở khoá sau khi kiểm tra đáp án)
                </span>
              )}
            </button>

            {transcriptOpen && (isDialogue || isChecked) && (
              <div className="mt-3 border-t border-slate-100 dark:border-slate-800 pt-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300 animate-in fade-in duration-200">
                {isDialogue ? (
                  <ol className="space-y-2.5" aria-label="Transcript song ngữ của đoạn hội thoại">
                    {transcriptSegments.map((segment, index) => (
                      <li key={`transcript-${currentQuestion.id}-${index}`} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-3 sm:p-4">
                        <p className="text-sm font-semibold leading-6 text-slate-900 dark:text-slate-100 sm:text-base">
                          <span className="font-extrabold text-sky-700 dark:text-sky-400">{getDialogueSpeakerLabel(segment.speaker)}:</span>{" "}
                          {segment.text}
                        </p>
                        {isBilingual && segment.translation && (
                          <p className="mt-1.5 text-sm leading-6 text-slate-600 dark:text-slate-400 sm:text-base">
                            {segment.translation}
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <>
                    <p className="font-bold text-slate-900 dark:text-slate-100 mb-1">Nội dung đoạn ghi âm:</p>
                    <p className="italic text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700">
                      {currentQuestion.content?.audioText ||
                        currentCheck?.translation ||
                        (typeof currentCheck?.explanation === "string"
                          ? currentCheck.explanation
                          : currentCheck?.explanation?.vi) ||
                        "Chưa có bản ghi âm bằng văn bản cho câu hỏi này."}
                    </p>
                  </>
                )}
                {isBilingual && hasBilingualTranslation && (
                  <p className="mt-3 rounded-xl border border-sky-100 dark:border-sky-900/60 bg-sky-50/70 dark:bg-sky-950/30 p-3 text-slate-700 dark:text-slate-300">
                    <span className="mb-1 block font-bold text-sky-900 dark:text-sky-300">
                      Bản dịch tiếng Việt:
                    </span>
                    {questionContent.translation}
                  </p>
                )}
              </div>
            )}
          </div>}
        </section>

        {/* Right Panel — Questions & Answer Options (30% Width) */}
        <section
          className={`w-full min-w-0 p-5 md:p-6 lg:p-7 flex flex-col ${
            isDictation
              ? "mx-auto max-w-4xl rounded-b-3xl border-x border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm"
              : "h-full justify-between overflow-y-auto bg-white dark:bg-slate-900 min-h-0"
          }`}
        >
          <div className="flex-1 flex flex-col">
            {/* Question Header */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 shrink-0">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Câu hỏi {currentIndex + 1} · Độ khó: {level || "Cơ bản"}
              </span>

              {isChecked && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${
                    currentCheck?.isCorrect
                      ? "border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300"
                      : "border border-rose-200 dark:border-rose-800/80 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300"
                  }`}
                >
                  {currentCheck?.isCorrect ? (
                    <>
                      <Check size={12} aria-hidden="true" /> Chính xác
                    </>
                  ) : (
                    <>
                      <X size={12} aria-hidden="true" /> Chưa chính xác
                    </>
                  )}
                </span>
              )}
            </div>

            {/* Question Prompt with smooth AnimatePresence */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="flex-1 flex flex-col"
              >
                <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 mb-6 tracking-tight leading-snug">
                  {isDictation
                    ? "Nghe và chép lại chính xác câu hoặc đoạn bạn nghe được."
                    : currentQuestion.content?.text ||
                      "Nghe đoạn hội thoại và chọn đáp án chính xác:"}
                </h2>

                {/* Answer Selection Rows (Full-Width Edge-to-Edge Cards) */}
                {isDictation ? (
                  <div className="flex-1 space-y-4">
                    <label htmlFor={`dictation-${currentQuestion.id}`} className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      Nội dung bạn nghe được
                    </label>
                    <textarea
                      id={`dictation-${currentQuestion.id}`}
                      value={selectedAnswer}
                      onChange={(event) => {
                        if (isAnswerLocked) return;
                        setAnswersByQuestionId((previous) => ({
                          ...previous,
                          [currentQuestion.id]: event.target.value,
                        }));
                      }}
                      disabled={isAnswerLocked || isChecking}
                      placeholder="Gõ lại câu tiếng Anh bạn nghe được…"
                      aria-describedby={`dictation-help-${currentQuestion.id}`}
                      className="min-h-52 w-full resize-y rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-base leading-relaxed text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-default disabled:bg-slate-50 dark:disabled:bg-slate-950/50"
                    />
                    <p id={`dictation-help-${currentQuestion.id}`} className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                      Nghe lại nếu cần, sau đó nhập đúng những gì bạn nghe được bằng tiếng Anh.
                    </p>
                    {!isAnswerLocked && (
                      <button
                        type="button"
                        onClick={() => void handleCheck()}
                        disabled={isChecking}
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-sky-600 px-4 text-sm font-extrabold text-white shadow-xs transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
                      >
                        {isChecking ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <PenLine size={16} aria-hidden="true" />}
                        {isChecking
                          ? "Đang kiểm tra..."
                          : isChecked
                            ? "Kiểm tra lại"
                            : "Kiểm tra phần nghe chép"}
                      </button>
                    )}
                    {isChecked && (
                      <div className={`rounded-2xl border p-4 ${currentCheck?.isCorrect ? "border-emerald-200 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/30" : "border-rose-200 dark:border-rose-800/80 bg-rose-50 dark:bg-rose-950/30"}`}>
                        <p className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                          {currentCheck?.isCorrect ? "Chính xác" : "Chưa chính xác — đối chiếu từng từ"}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate-600 dark:text-slate-400">
                          <span>
                            Độ chính xác từ: {Math.round(currentCheck?.wordAccuracy ?? (currentCheck?.isCorrect ? 100 : 0))}%
                          </span>
                          <span>
                            Lần thử: {dictationMetrics[currentQuestion.id]?.attemptCount ?? 1}
                          </span>
                          {dictationMetrics[currentQuestion.id]?.firstTryCorrect !== null && (
                            <span>
                              {dictationMetrics[currentQuestion.id]?.firstTryCorrect
                                ? "Đúng ngay lần đầu"
                                : "Đã ghi nhận lần sửa"}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5 text-sm font-semibold leading-relaxed">
                          {dictationDiff.map((token, index) => (
                            <span
                              key={`${token.text}-${index}`}
                              className={
                                token.kind === "same"
                                  ? "text-slate-800 dark:text-slate-200"
                                  : token.kind === "missing"
                                    ? "rounded-md bg-rose-100 dark:bg-rose-950/50 px-1.5 text-rose-800 dark:text-rose-300 line-through decoration-rose-500"
                                    : "rounded-md bg-amber-100 dark:bg-amber-950/50 px-1.5 text-amber-900 dark:text-amber-300"
                              }
                            >
                              {token.text}
                              {token.kind === "missing" ? " (thiếu)" : token.kind === "extra" ? " (thừa)" : ""}
                            </span>
                          ))}
                        </div>
                        {!currentCheck?.isCorrect && (
                          <button
                            type="button"
                            onClick={toggleRevealAnswer}
                            className="mt-3 inline-flex min-h-10 items-center rounded-lg border border-rose-200 dark:border-rose-800/80 bg-white dark:bg-slate-900 px-3 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
                          >
                            {isRevealed ? "Ẩn phần đáp án đã hiện" : "Xem phần còn thiếu"}
                          </button>
                        )}
                        <div className="mt-4 space-y-2 border-t border-slate-200 dark:border-slate-800 pt-3">
                          <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                            <input
                              type="checkbox"
                              checked={showAnswerImmediately}
                              onChange={(event) => setShowAnswerImmediately(event.target.checked)}
                              className="size-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sky-600 focus:ring-sky-500"
                            />
                            Hiện gợi ý đáp án ngay
                          </label>
                          <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                            <input
                              type="checkbox"
                              checked={isRevealed}
                              onChange={(event) => {
                                setRevealedQuestionIds((previous) => ({
                                  ...previous,
                                  [currentQuestion.id]: event.target.checked,
                                }));
                              }}
                              className="size-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sky-600 focus:ring-sky-500"
                            />
                            Xem phần còn thiếu
                          </label>
                        </div>
                        {showAnswerImmediately && !isRevealed && currentCheck?.correctAnswer && (
                          <p className="mt-3 rounded-xl border border-sky-100 dark:border-sky-900/60 bg-sky-50/70 dark:bg-sky-950/30 p-3 text-base font-semibold leading-relaxed text-slate-800 dark:text-slate-200">
                            {maskDictationAnswer(currentCheck.correctAnswer)}
                          </p>
                        )}
                        {isRevealed && currentCheck?.correctAnswer && (
                          <p className="mt-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-base font-semibold leading-relaxed text-slate-900 dark:text-slate-100">
                            {buildProgressiveAnswer(
                              currentCheck.correctAnswer,
                              currentCheck.submittedAnswer ?? selectedAnswer,
                              false,
                              true,
                            ).map((token, index) => (
                              <span
                                key={`${token.text}-${index}`}
                                className={
                                  token.state === "hint"
                                    ? "mr-1 rounded bg-amber-100 dark:bg-amber-950/60 px-1 text-amber-950 dark:text-amber-200"
                                    : token.state === "answer"
                                      ? "mr-1 text-slate-900 dark:text-slate-100"
                                      : "mr-1 text-emerald-700 dark:text-emerald-400"
                                }
                              >
                                {token.text}
                              </span>
                            ))}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                <div className="space-y-3.5 flex-1">
                  {options.map((opt, idx) => {
                    const key = String.fromCharCode(65 + idx);
                    const isSelected = selectedAnswer === opt;
                    const isCorrectAnswer = currentCheck?.correctAnswer === opt;

                    let cardStyles =
                      "border-2 border-slate-200 dark:border-slate-800 hover:border-sky-400 dark:hover:border-sky-500 hover:bg-sky-50/30 dark:hover:bg-sky-950/30 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200";
                    let keyStyles = "text-slate-700 dark:text-slate-300 font-bold";
                    let radioClass =
                      "text-sky-600 dark:text-sky-400 border-slate-300 dark:border-slate-700 focus:ring-sky-500";

                    if (isChecked) {
                      if (isSelected && currentCheck?.isCorrect) {
                        cardStyles =
                          "border-2 border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200";
                        keyStyles = "text-emerald-900 dark:text-emerald-300 font-bold";
                        radioClass = "text-emerald-600 dark:text-emerald-400 border-emerald-500";
                      } else if (isSelected && !currentCheck?.isCorrect) {
                        cardStyles =
                          "border-2 border-rose-500 bg-rose-50/60 dark:bg-rose-950/40 text-rose-950 dark:text-rose-200";
                        keyStyles = "text-rose-900 dark:text-rose-300 font-bold";
                        radioClass = "text-rose-600 dark:text-rose-400 border-rose-500";
                      } else if (isCorrectAnswer && !currentCheck?.isCorrect) {
                        cardStyles =
                          "border-2 border-emerald-400 dark:border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200";
                        keyStyles = "text-emerald-800 dark:text-emerald-300 font-bold";
                        radioClass = "text-emerald-500 border-emerald-400";
                      } else {
                        cardStyles =
                          "border-2 border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 opacity-80";
                      }
                    } else if (isSelected || (isChecking && isSelected)) {
                      cardStyles =
                        "border-2 border-sky-500 bg-sky-50/50 dark:bg-sky-950/40 text-slate-900 dark:text-slate-100 shadow-xs";
                      keyStyles = "text-sky-700 dark:text-sky-400 font-bold";
                      radioClass = "text-sky-600 border-sky-500";
                    }

                    return (
                      <button
                        key={`${currentQuestion.id}-${idx}`}
                        type="button"
                        onClick={() => handleAnswerSelect(opt)}
                        disabled={isAnswerLocked || isChecking}
                        aria-label={`Đáp án ${key}: ${opt}`}
                        className={`w-full min-w-0 p-3.5 md:p-4 rounded-2xl border-2 flex items-center text-left transition-all ${cardStyles} ${
                          isAnswerLocked || isChecking
                            ? "cursor-default"
                            : "cursor-pointer active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${radioClass}`}
                        >
                          {isSelected && (
                            <span className="size-2 rounded-full bg-current" />
                          )}
                        </span>
                        <span
                          className={`ml-3 mr-3 text-base md:text-lg ${keyStyles}`}
                        >
                          ({key})
                        </span>
                        <span className="min-w-0 text-base md:text-lg font-medium leading-7 flex-1 break-words">
                          {opt}
                        </span>

                        {isChecked && isSelected && (
                          <span className="shrink-0 ml-3">
                            {currentCheck?.isCorrect ? (
                              <CheckCircle2
                                size={22}
                                className="text-emerald-600 dark:text-emerald-400"
                                aria-hidden="true"
                              />
                            ) : (
                              <XCircle
                                size={22}
                                className="text-rose-600 dark:text-rose-400"
                                aria-hidden="true"
                              />
                            )}
                          </span>
                        )}

                        {isChecked && !isSelected && isCorrectAnswer && (
                          <span className="shrink-0 text-xs font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-950/80 px-2.5 py-1 rounded-full ml-3">
                            Đáp án đúng
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                )}

                <p className="sr-only" aria-live="polite" aria-atomic="true">
                  {isChecking
                    ? "Đang kiểm tra đáp án."
                    : isChecked
                      ? currentCheck?.isCorrect
                        ? "Chính xác. Đáp án và giải thích đã hiển thị."
                        : "Chưa chính xác. Đáp án đúng và giải thích đã hiển thị."
                      : ""}
                </p>

                {/* Structured Pedagogical Explanation Drawer (Post-Answer) */}
                {isChecked && parsedExplanation && (
                  <div
                    tabIndex={0}
                    role="region"
                    aria-label="Giải thích đáp án"
                    className="mt-6 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200 animate-in fade-in duration-200 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="rounded-md bg-emerald-200/80 dark:bg-emerald-900/60 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-emerald-900 dark:text-emerald-200">
                        GIẢI THÍCH ĐÁP ÁN
                      </span>
                    </div>

                    {parsedExplanation.type === "structured" ? (
                      <div className="space-y-3">
                        {/* Primary Vietnamese Explanation */}
                        <p className="text-base font-semibold leading-relaxed text-slate-900 dark:text-slate-100">
                          {parsedExplanation.vi}
                        </p>

                        {/* Listening Evidence Quotation Block */}
                        {parsedExplanation.evidence && (
                          <div className="rounded-xl border border-emerald-200/70 dark:border-emerald-800/60 bg-white/85 dark:bg-slate-900/85 p-3.5 text-xs text-slate-700 dark:text-slate-300">
                            <span className="font-bold text-emerald-950 dark:text-emerald-300 block mb-1">
                              Chi tiết nghe được:
                            </span>
                            <blockquote className="italic text-slate-600 dark:text-slate-400 font-normal">
                              &ldquo;{parsedExplanation.evidence}&rdquo;
                            </blockquote>
                          </div>
                        )}

                        {/* Vocabulary Note Supporting Row */}
                        {parsedExplanation.vocabularyNote && (
                          <div className="flex items-start gap-2 rounded-xl bg-emerald-100/70 dark:bg-emerald-900/40 px-3.5 py-2.5 text-xs text-emerald-950 dark:text-emerald-200">
                            <span className="font-bold text-emerald-900 dark:text-emerald-300 shrink-0">
                              Cụm từ cần nhớ:
                            </span>
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {parsedExplanation.vocabularyNote}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2.5 text-xs">
                        <p className="font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 rounded-lg p-2.5">
                          {parsedExplanation.fallbackNotice}
                        </p>
                        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-slate-700 dark:text-slate-300">
                          <span className="font-bold text-slate-900 dark:text-slate-100 block mb-1">
                            Thông tin tham khảo:
                          </span>
                          <p className="italic text-slate-600 dark:text-slate-400">
                            {parsedExplanation.text}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Validation Notice */}
                {validationNotice && (
                  <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs font-bold text-amber-800 dark:text-amber-300">
                    <AlertCircle
                      size={16}
                      className="shrink-0"
                      aria-hidden="true"
                    />
                    <span>{validationNotice}</span>
                  </div>
                )}

                {/* Submit Error */}
                {submitError && (
                  <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs font-bold text-rose-800 dark:text-rose-300">
                    <AlertCircle
                      size={16}
                      className="shrink-0"
                      aria-hidden="true"
                    />
                    <span>{submitError}</span>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </section>
      </main>

      {/* 3. Full-Width Bottom Action Dock */}
      <footer className="w-full h-16 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 md:px-6 flex items-center justify-between shrink-0 shadow-sm z-30 select-none">
        {/* Left Actions: Quick utilities */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => confirmExit("/practice/listening")}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors hover:border-slate-400 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
            aria-label="Thoát bài luyện và quay lại danh sách bài nghe"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            <span className="hidden sm:inline">Thoát bài luyện</span>
          </button>

          <ReportIssueButton
            area="LISTENING"
            context={{
              route:
                typeof window !== "undefined"
                  ? window.location.pathname
                  : undefined,
              sourceType: "QUIZ",
              sourceId: quiz.id,
              questionId: currentQuestion.id,
              context: {
                quizTitle: quiz.title,
                questionNumber: currentIndex + 1,
              },
            }}
          />

          {/* Dictionary lookup for a selected word */}
          <button
            type="button"
            onClick={handleDictionaryLookup}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Bôi đen một từ tiếng Anh rồi tra từ"
          >
            <BookOpen size={15} className="text-sky-600 dark:text-sky-400" />
            <span className="hidden sm:inline">Tra từ</span>
          </button>

          {/* Persist saved questions locally for this exercise */}
          <button
            type="button"
            onClick={() => {
              setSavedQuestions((prev) => {
                const next = !prev[currentQuestion.id];
                showToast(
                  next
                    ? "Đã lưu câu hỏi trên thiết bị này."
                    : "Đã bỏ lưu câu hỏi.",
                );
                return { ...prev, [currentQuestion.id]: next };
              });
            }}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
              isSaved
                ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
            title={isSaved ? "Bỏ lưu câu hỏi" : "Lưu câu hỏi để ôn tập lại"}
          >
            <Star
              size={15}
              className={
                isSaved ? "fill-amber-500 text-amber-500" : "text-amber-500"
              }
            />
            <span className="hidden sm:inline">
              {isSaved ? "Đã lưu" : "Lưu câu hỏi"}
            </span>
          </button>
        </div>

        {/* Center Toast Notification */}
        {toastMessage && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-20 z-50 rounded-xl bg-slate-900 text-white px-4 py-2 text-xs font-bold shadow-lg animate-in fade-in zoom-in-95 duration-150">
            {toastMessage}
          </div>
        )}

        {/* Right Navigation Dock */}
        <div
          className="flex items-center gap-2 sm:gap-3 relative"
          ref={matrixPopoverRef}
        >
          {/* ← Câu trước */}
          <button
            type="button"
            onClick={() => {
              setValidationNotice(null);
              setTranscriptOpen(false);
              if (currentIndex > 0) setCurrentIndex((p) => p - 1);
            }}
            disabled={currentIndex === 0}
            className="px-3.5 sm:px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors text-sm"
          >
            ← Câu trước
          </button>

          {/* Question Stepper Matrix Trigger */}
          <button
            type="button"
            onClick={() => setShowMatrixPopover((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/60 transition cursor-pointer text-sm shadow-2xs"
            title="Danh sách câu hỏi"
            aria-expanded={showMatrixPopover}
          >
            <LayoutGrid size={16} className="text-slate-500 dark:text-slate-400" />
            <span className="hidden sm:inline">
              {Object.keys(checkResults).length}/{questions.length}
            </span>
          </button>

          {/* Question Stepper Matrix Popover */}
          {showMatrixPopover && (
            <div className="absolute right-36 bottom-full mb-3 w-72 sm:w-80 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Bảng câu hỏi ({Object.keys(checkResults).length}/
                  {questions.length})
                </span>
                <button
                  type="button"
                  onClick={() => setShowMatrixPopover(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-md cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="grid grid-cols-5 gap-2 max-h-60 overflow-y-auto p-1">
                {questions.map((q, idx) => {
                  const isCurrent = idx === currentIndex;
                  const check = checkResults[q.id];
                  const isAnswered = Boolean(answersByQuestionId[q.id]);

                  let pillStyles =
                    "border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700";
                  if (check) {
                    pillStyles = check.isCorrect
                      ? "bg-emerald-500 text-white font-bold border-emerald-500 shadow-2xs"
                      : "bg-rose-500 text-white font-bold border-rose-500 shadow-2xs";
                  } else if (isCurrent) {
                    pillStyles =
                      "bg-sky-500 text-white font-bold border-sky-500 ring-2 ring-sky-200 dark:ring-sky-900 shadow-xs";
                  } else if (isAnswered) {
                    pillStyles =
                      "bg-sky-100 dark:bg-sky-950/60 text-sky-900 dark:text-sky-300 font-bold border-sky-300 dark:border-sky-800";
                  }

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        setValidationNotice(null);
                        setTranscriptOpen(false);
                        setCurrentIndex(idx);
                        setShowMatrixPopover(false);
                      }}
                      className={`size-9 rounded-xl text-xs flex items-center justify-center transition-all cursor-pointer ${pillStyles}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Button: feedback is immediate after selecting an answer. */}
          {!isChecked ? (
            <div className="flex items-center gap-2">
              <div
                role="status"
                aria-live="polite"
                className="inline-flex min-h-11 items-center gap-2 px-3 text-sm font-semibold text-slate-500 dark:text-slate-400"
              >
                {isChecking ? (
                  <>
                    <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                    Đang kiểm tra đáp án...
                  </>
                ) : (
                  isDictation
                    ? "Nhập phần nghe chép, rồi kiểm tra trong khung câu hỏi"
                    : "Chọn một đáp án để xem kết quả"
                )}
              </div>
              <button
                type="button"
                onClick={handleSkipQuestion}
                disabled={isChecking}
                className="min-h-11 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 disabled:opacity-50"
              >
                Bỏ qua
              </button>
            </div>
          ) : isDictation && isChecked && !currentCheck?.isCorrect && !isSkipped ? (
            <div
              role="status"
              aria-live="polite"
              className="inline-flex min-h-11 items-center px-3 text-sm font-semibold text-rose-700 dark:text-rose-300"
            >
              Sửa phần chép rồi bấm “Kiểm tra lại” để tiếp tục.
            </div>
          ) : isLastQuestion ? (
            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={isSubmitting || submitMutation.isPending}
              className="px-5 sm:px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm transition-all active:scale-95 disabled:opacity-60 cursor-pointer inline-flex items-center gap-2 text-sm"
            >
              {reviewOnly ? (
                <>
                  Kết thúc ôn lại
                  <CheckCircle2 size={16} aria-hidden="true" />
                </>
              ) : isSubmitting || submitMutation.isPending ? (
                <>
                  <Loader2
                    size={16}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                  Đang nộp bài...
                </>
              ) : submitError ? (
                "Thử nộp lại"
              ) : (
                <>
                  Nộp bài
                  <CheckCircle2 size={16} aria-hidden="true" />
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNextQuestion}
              className="px-5 sm:px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold shadow-sm transition-all active:scale-95 cursor-pointer inline-flex items-center gap-2 text-sm"
            >
              <span>Câu tiếp theo</span>
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </footer>

      {/* Notes Scratchpad Modal */}
      {showNotesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <StickyNote size={18} className="text-amber-500" />
                Ghi chú bài học
              </h3>
              <button
                type="button"
                onClick={() => setShowNotesModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ghi chú nhanh các từ mới hoặc cấu trúc nghe được..."
              rows={6}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-950 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Ghi chú được lưu tự động trên thiết bị này.
            </p>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowNotesModal(false)}
                className="rounded-xl bg-slate-900 dark:bg-slate-800 text-white px-4 py-2 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-700 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shared Exit Confirmation Modal */}
      <PracticeExitConfirmDialog {...exitDialogProps} />
      {lookupWord && (
        <WordDictionaryPopup
          word={lookupWord}
          onClose={() => setLookupWord(null)}
        />
      )}
    </div>
  );
}
