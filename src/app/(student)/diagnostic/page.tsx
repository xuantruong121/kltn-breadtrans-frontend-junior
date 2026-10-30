"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Loader2,
  Mic,
  RotateCcw,
  SkipForward,
  Square,
  Target,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  diagnosticService,
  DiagnosticAssessment,
  DiagnosticFourSkillResult,
  DiagnosticResult,
} from "@/lib/api/services/diagnostic.service";
import { useAuthStore } from "@/stores/authStore";
import { PracticeHeader } from "@/components/practice/PracticeHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAssessmentAntiCheat } from "@/hooks/useAssessmentAntiCheat";
import { useLearningFocusMode } from "@/contexts/LearningFocusContext";
import { ClozePrompt } from "@/components/diagnostic/ClozePrompt";
import { DiagnosticQuestionNavigator } from "@/components/diagnostic/DiagnosticQuestionNavigator";
import { DiagnosticAdvicePanel as AdvicePanel } from "@/components/diagnostic/DiagnosticAdvicePanel";
import { ObservedResultPanel } from "@/components/diagnostic/ObservedResultPanel";
import {
  formatPlacementLevel,
  formatSkillName,
  getUnansweredQuestionIndexes,
  resolveReviewAnswer,
  resultPollInterval,
  isResultGrading,
  gradingProgress,
} from "@/lib/diagnostic/diagnosticUiLogic";
import {
  isValidDiagnosticRecording,
  measureRecordingDurationMs,
  selectDiagnosticRecordingMimeType,
} from "@/lib/diagnostic/diagnosticSpeakingRecorderLogic";
import {
  countSkippedTasks,
  countWords,
  describeForm,
  draftKey,
  findReferenceHighlight,
  learnerErrorMessage,
  parseDraft,
  toSubmissionAnswers,
  WRITING_SKIPPED,
  describeSkillState,
  formatCriterionName,
  describeCriterionScore,
  isSpeakingTask,
  isWritingTask,
  speakingLimitMs,
  writingGuidance,
} from "@/lib/diagnostic/diagnosticTaskLogic";
import { getApiErrorMessage } from "@/lib/utils/apiError";

function createSubmissionToken() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function nowMs() {
  return Date.now();
}

const diagnosticDisplayTitle = "Bài đánh giá năng lực đầu vào";
const diagnosticDisplayDescription =
  "Kết quả giúp bạn hiểu năng lực hiện tại và chọn bài luyện phù hợp hơn.";
const diagnosticDisplayGuidance =
  "Hãy làm bài nghiêm túc để nhận được nhận xét và gợi ý luyện tập sát với năng lực của bạn. Đây là kết quả tham khảo nội bộ, không phải chứng chỉ tiếng Anh.";

export default function DiagnosticPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  // Back to the previous page; straight to the dashboard when the page was
  // opened directly (no in-app history to return to).
  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.push("/dashboard");
  };
  const { setFocusMode } = useLearningFocusMode();

  const {
    data: assessment,
    isLoading: isLoadingAssessment,
    isError,
  } = useQuery({
    queryKey: ["diagnostic-current"],
    queryFn: diagnosticService.getCurrent,
  });

  // When this learner last submitted; result polling outlives one early read.
  const submittedAtRef = useRef<number | null>(null);
  const {
    data: latestResult,
    isLoading: isLoadingResult,
  } = useQuery({
    queryKey: ["diagnostic-latest-result"],
    queryFn: diagnosticService.getLatestResult,
    refetchInterval: (query) =>
      resultPollInterval(query.state.data, submittedAtRef.current, Date.now()),
  });

  const [started, setStarted] = useState(false);
  // The learner may open the partial result instead of waiting for grading.
  const [showPartialResult, setShowPartialResult] = useState(false);
  const [awaitingResult, setAwaitingResult] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [submissionToken, setSubmissionToken] = useState(createSubmissionToken);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [attemptId, setAttemptId] = useState<number | null>(null);

  // Auto-advance feedback state
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState<NodeJS.Timeout | null>(null);

  // Speaking: one control drives the real recorder lifecycle.
  //   idle -> starting (mic opening) -> recording -> processing (upload +
  //   confirm) -> done. Stopping uploads and confirms this task only.
  const [speakingPhase, setSpeakingPhase] = useState<
    "idle" | "starting" | "recording" | "processing" | "done"
  >("idle");
  const [recordingMs, setRecordingMs] = useState(0);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [speakingError, setSpeakingError] = useState<string | null>(null);
  const [speakingNotice, setSpeakingNotice] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef(0);
  const autoStopRef = useRef<number | null>(null);
  // Set when the learner leaves the task mid-recording: that take is dropped.
  const discardTakeRef = useRef(false);
  const recording = speakingPhase === "recording";

  // Resume in-progress attempt if exists
  useEffect(() => {
    const inProgress = assessment?.inProgressAttempt;
    if (!inProgress) return;
    setAttemptId(inProgress.id);
    const persisted = { ...(inProgress.answers as Record<string, number | string>) };
    for (const response of inProgress.speakingResponses) {
      persisted[String(response.questionId)] = response.status;
    }
    // Objective choices and Writing text kept locally for this attempt;
    // Speaking statuses always come from the server.
    let draft: Record<string, number | string> = {};
    try {
      draft = parseDraft(window.localStorage.getItem(draftKey(inProgress.id)));
    } catch {
      draft = {};
    }
    setAnswers((current) => ({ ...draft, ...persisted, ...current }));
  }, [assessment?.inProgressAttempt]);

  useEffect(() => {
    if (!attemptId) return;
    try {
      window.localStorage.setItem(draftKey(attemptId), JSON.stringify(answers));
    } catch {
      // Storage unavailable: the attempt still works, only the draft is not kept.
    }
  }, [attemptId, answers]);

  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => {
      setRecordingMs(Date.now() - recordingStartedAtRef.current);
    }, 100);
    return () => window.clearInterval(timer);
  }, [recording]);

  // Leaving a task drops a take that is still being recorded, and resets
  // the speaking panel for the next task.
  useEffect(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state === "recording") {
      discardTakeRef.current = true;
      recorder.stop();
    }
    setSpeakingPhase("idle");
    setSpeakingError(null);
    setSpeakingNotice(null);
    setRecordingMs(0);
    setRecordedUrl((url) => {
      if (url) URL.revokeObjectURL(url);
      return null;
    });
  }, [step]);

  useEffect(() => () => {
    if (autoStopRef.current !== null) window.clearTimeout(autoStopRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer);
  }, [recordedUrl, autoAdvanceTimer]);

  useEffect(() => {
    setFocusMode(started);
    return () => setFocusMode(false);
  }, [started, setFocusMode]);

  // Fullscreen belongs to taking the test. Whatever path leads out of it
  // (submit, result reload, leaving the page), the browser leaves it too.
  useEffect(() => {
    if (!started && document.fullscreenElement)
      void document.exitFullscreen?.().catch(() => undefined);
  }, [started]);
  useEffect(
    () => () => {
      if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => undefined);
    },
    [],
  );

  const submit = useMutation({
    mutationFn: () =>
      diagnosticService.submit(
        assessment!.id,
        toSubmissionAnswers(answers),
        submissionToken,
        attemptId ?? undefined,
      ),
    onSuccess: (data) => {
      if (document.fullscreenElement) {
        void document.exitFullscreen?.().catch(() => undefined);
      }
      try {
        if (attemptId) window.localStorage.removeItem(draftKey(attemptId));
      } catch {
        // ignore
      }
      setStarted(false);
      setFocusMode(false);
      submittedAtRef.current = Date.now();
      setAwaitingResult(true);
      const currentUserId = useAuthStore.getState().user?.id;
      queryClient.invalidateQueries({
        queryKey: ["user-stats", currentUserId],
      });
      queryClient.invalidateQueries({ queryKey: ["diagnostic-current"] });
      queryClient.invalidateQueries({ queryKey: ["diagnostic-latest-result"] });
      queryClient.invalidateQueries({ queryKey: ["learning-history"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Kết quả đánh giá đầu vào đã được lưu thành công.");
      void data;
    },
    onError: () => toast.error("Không thể lưu kết quả. Vui lòng thử lại."),
  });

  const confirmSpeaking = useMutation({
    mutationFn: async ({
      questionId,
      blob,
      durationMs,
    }: {
      questionId: number;
      blob: Blob;
      durationMs?: number;
    }) => {
      if (!assessment || !attemptId) throw new Error("Phiên kiểm tra chưa sẵn sàng");
      return diagnosticService.confirmSpeaking(
        assessment.id,
        attemptId,
        questionId,
        blob,
        durationMs,
      );
    },
    // Once the recording is accepted the learner moves on to the next task.
    // Grading continues on the server; the navigator lets them come back to
    // record again. The last task does not submit the whole test by itself.
    onSuccess: (response, variables) => {
      setAnswers((current) => ({
        ...current,
        [variables.questionId]: response.status,
      }));
      setSpeakingPhase("done");
      setSpeakingError(null);
      setSpeakingNotice(
        response.status === "GRADING_FAILED"
          ? "Đã nhận bản ghi nhưng chưa chấm được. Bạn có thể chấm lại ở trang kết quả."
          : "Đã nhận bản ghi. Bài nói đang được chấm.",
      );
      const index = assessment?.questions.findIndex((q) => q.id === variables.questionId) ?? -1;
      if (assessment && index >= 0 && index < assessment.questions.length - 1)
        setStep((current) => (current === index ? index + 1 : current));
    },
    onError: (error) => {
      console.error("[diagnostic] speaking confirm failed", error);
      setSpeakingPhase("idle");
      setSpeakingError(learnerErrorMessage(error));
    },
  });

  // The polled latest result supersedes the submit response for the same
  // attempt, so grading progress keeps updating after submission.
  const result: DiagnosticResult | undefined =
    latestResult && (!submit.data || latestResult.attemptId === submit.data.attemptId)
      ? latestResult
      : (submit.data ?? latestResult ?? undefined);

  useAssessmentAntiCheat({
    enabled: started && !result && !submit.isPending,
    onViolation: (type) => {
      const messages: Record<string, string> = {
        FULLSCREEN_EXIT: "Cảnh báo: Bạn vừa thoát toàn màn hình!",
        TAB_HIDDEN: "Cảnh báo: Vui lòng không chuyển tab trong bài đánh giá!",
        WINDOW_BLUR: "Cảnh báo: Vui lòng tập trung vào bài đánh giá!",
        COPY_ATTEMPT: "Chức năng sao chép bị hạn chế.",
        PASTE_ATTEMPT: "Chức năng dán bị hạn chế.",
        CUT_ATTEMPT: "Chức năng cắt bị hạn chế.",
        CONTEXT_MENU_ATTEMPT: "Menu chuột phải bị hạn chế.",
      };
      toast.error(messages[type] ?? "Vui lòng tập trung trong bài đánh giá.");
    },
  });

  const handleStart = async () => {
    if (!attemptId && assessment) {
      try {
        const startedAttempt = await diagnosticService.startAttempt(assessment.id);
        setAttemptId(startedAttempt.attemptId);
        setSubmissionToken(startedAttempt.submissionToken || submissionToken);
      } catch (err: any) {
        toast.error(
          getApiErrorMessage(err, "Không thể khởi tạo phiên kiểm tra. Vui lòng thử lại."),
        );
        return;
      }
    }
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Ignored
    }
    setStarted(true);
  };

  const handleSelectOption = (questionId: number, index: number) => {
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer);
      setAutoAdvanceTimer(null);
    }

    // 1. Immediately record answer
    setAnswers((old) => ({ ...old, [questionId]: index }));

    // 2. If not the last question, auto-advance after 250ms
    if (assessment && step < assessment.questions.length - 1) {
      const timer = setTimeout(() => {
        setStep((curr) => Math.min(assessment.questions.length - 1, curr + 1));
        setAutoAdvanceTimer(null);
      }, 250);
      setAutoAdvanceTimer(timer);
    }
  };

  const startRecording = async (questionId: number, limitMs: number) => {
    if (speakingPhase === "starting" || speakingPhase === "recording" || speakingPhase === "processing") return;
    setSpeakingError(null);
    setSpeakingNotice(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setSpeakingError(learnerErrorMessage({ message: "MIC_UNAVAILABLE" }));
      return;
    }
    setSpeakingPhase("starting");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      setSpeakingPhase("idle");
      setSpeakingError(
        learnerErrorMessage({
          message:
            error instanceof DOMException && error.name === "NotAllowedError" ? "MIC_DENIED" : "MIC_UNAVAILABLE",
        }),
      );
      return;
    }
    const mimeType = selectDiagnosticRecordingMimeType((type) => MediaRecorder.isTypeSupported(type));
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    chunksRef.current = [];
    discardTakeRef.current = false;
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunksRef.current.push(event.data);
    };
    // Timing starts when the recorder really records, not when start() is called.
    recorder.onstart = () => {
      recordingStartedAtRef.current = nowMs();
      setRecordingMs(0);
      setSpeakingPhase("recording");
      autoStopRef.current = window.setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, limitMs);
    };
    // The microphone is released only after the last chunk has been flushed.
    recorder.onstop = async () => {
      if (autoStopRef.current !== null) window.clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      recorderRef.current = null;
      if (discardTakeRef.current) {
        discardTakeRef.current = false;
        setSpeakingPhase("idle");
        return;
      }
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || "audio/webm" });
      const mediaMs = await measureRecordingDurationMs(blob);
      if (!blob.size || (mediaMs !== null && !isValidDiagnosticRecording(blob.size, mediaMs))) {
        setSpeakingPhase("idle");
        setSpeakingError(learnerErrorMessage({ message: "EMPTY_RECORDING" }));
        return;
      }
      setRecordedUrl((url) => {
        if (url) URL.revokeObjectURL(url);
        return URL.createObjectURL(blob);
      });
      if (mediaMs !== null) setRecordingMs(mediaMs);
      setSpeakingPhase("processing");
      confirmSpeaking.mutate({ questionId, blob, durationMs: mediaMs ?? undefined });
    };
    streamRef.current = stream;
    recorderRef.current = recorder;
    recorder.start();
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state === "recording") recorder.stop();
  };

  const goToNextOrSubmit = () => {
    if (!assessment) return;
    if (step >= assessment.questions.length - 1) handleSubmit();
    else setStep((value) => Math.min(assessment.questions.length - 1, value + 1));
  };

  const [skipping, setSkipping] = useState(false);
  const skipSpeaking = async (questionId: number) => {
    if (!assessment || !attemptId || skipping) return;
    setSkipping(true);
    setSpeakingError(null);
    try {
      await diagnosticService.skipSpeaking(assessment.id, attemptId, questionId);
      setAnswers((current) => ({ ...current, [questionId]: "SKIPPED" }));
      goToNextOrSubmit();
    } catch (error) {
      console.error("[diagnostic] speaking skip failed", error);
      setSpeakingError(learnerErrorMessage(error));
    } finally {
      setSkipping(false);
    }
  };

  const skipWriting = (questionId: number) => {
    setAnswers((old) => ({ ...old, [questionId]: WRITING_SKIPPED }));
    goToNextOrSubmit();
  };

  const handleSubmit = () => {
    if (!assessment) return;
    const unansweredIndexes = getUnansweredQuestionIndexes(
      assessment.questions,
      answers,
    );
    if (unansweredIndexes.length) {
      setStep(unansweredIndexes[0]);
      toast.error(`Bạn còn ${unansweredIndexes.length} câu chưa hoàn thành.`);
      return;
    }
    const skipped = countSkippedTasks(assessment.questions, answers);
    if (skipped.speaking + skipped.writing > 0) {
      setShowSubmitConfirm(true);
      return;
    }
    submit.mutate();
  };

  if (isLoadingAssessment || isLoadingResult) {
    return (
      <div className="flex min-h-80 items-center justify-center">
        <Loader2 className="animate-spin text-violet-600" size={34} />
      </div>
    );
  }

  if (isError || !assessment) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-rose-100 bg-rose-50 p-6 text-center text-sm font-bold text-rose-700">
        Chưa thể tải bài đánh giá đầu vào. Vui lòng thử lại sau.
      </div>
    );
  }

  // If completed, always render the saved result view
  const hasCompleted = !!result || assessment.hasCompleted;
  // Right after submit, wait for the graded result instead of showing a
  // half-built page; the learner can still open the partial result.
  const justSubmitted = submit.isPending || (awaitingResult && !result);
  if (!showPartialResult && (justSubmitted || (result && isResultGrading(result)))) {
    return <GradingWaitScreen progress={gradingProgress(result)} onShowPartial={result ? () => setShowPartialResult(true) : undefined} />;
  }
  if (hasCompleted && result) {
    return <DiagnosticResultView assessment={assessment} result={result} onBack={goBack} />;
  }

  // Not started yet
  if (!started) {
    const isResuming = !!assessment.inProgressAttempt;
    const form = describeForm(assessment.questions);
    const practiceCount = form.speaking + form.writing;
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-8 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-violet-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          <ArrowLeft size={18} strokeWidth={2.25} aria-hidden="true" />
          <span>Quay lại</span>
        </button>
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:p-10">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
            <Target size={28} />
          </div>

          <h1 className="mt-5 text-2xl font-black text-slate-900 dark:text-slate-100 sm:text-3xl">
            {diagnosticDisplayTitle}
          </h1>

          <p className="mt-3 text-base leading-7 text-slate-700 dark:text-slate-300 sm:text-lg">
            {diagnosticDisplayDescription}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-850">
              <span className="text-sm font-bold text-slate-600 dark:text-slate-400">Quy mô</span>
              <p className="mt-1 font-extrabold text-slate-900 dark:text-slate-100">
                {practiceCount
                  ? `${form.total} nhiệm vụ (${form.objective} trắc nghiệm + ${practiceCount} thực hành)`
                  : `${form.total} câu trắc nghiệm`}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-850">
              <span className="text-sm font-bold text-slate-600 dark:text-slate-400">Thành phần</span>
              <p className="mt-1 font-extrabold text-slate-900 dark:text-slate-100">
                {form.parts.map((part) => `${part.label} ${part.count}`).join(" · ")}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-850">
              <span className="text-sm font-bold text-slate-600 dark:text-slate-400">Quy tắc lượt làm</span>
              <p className="mt-1 font-extrabold text-slate-900 dark:text-slate-100">
                1 lần chính thức duy nhất
              </p>
            </div>
          </div>

          <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/70 px-5 py-4 text-sm font-medium leading-6 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200 sm:text-base sm:leading-7">
            {diagnosticDisplayGuidance}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={handleStart}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-violet-600 px-7 text-sm font-extrabold text-white transition hover:bg-violet-700"
            >
              <span>{isResuming ? "Tiếp tục bài đánh giá" : "Bắt đầu làm bài"}</span>
              <ArrowRight size={18} />
            </button>
            <Link
              href="/dashboard"
              className="inline-flex min-h-12 items-center rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
            >
              Để sau
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const current = assessment.questions[step];
  const isReading = current.section === "READING";
  const isListening = current.section === "LISTENING";
  const isSpeaking = isSpeakingTask(current);
  const isOpenText = isWritingTask(current);
  const limitMs = speakingLimitMs(current);
  const writingSkipped = isOpenText && answers[current.id] === WRITING_SKIPPED;
  const writtenText =
    typeof answers[current.id] === "string" && !writingSkipped ? (answers[current.id] as string) : "";
  const skippedSummary = countSkippedTasks(assessment.questions, answers);
  const guidance = isOpenText ? writingGuidance(countWords(writtenText), current.wordMin, current.wordMax) : null;
  const listeningNotReady = isListening && (current.mediaStatus === "NOT_READY" || !current.audioUrl);

  // Passage extraction for Reading
  const passageTitle = current.passageTitle?.trim() || "";
  const passageBody = current.passageBody?.trim() || current.passageText?.trim() || "";
  const passageHighlight = isReading && passageBody ? findReferenceHighlight(current.question, passageBody) : null;
  // A confirmed recording for this task (rerecording replaces it).
  const speakingAnswer = isSpeaking ? answers[current.id] : undefined;
  const hasRecording = typeof speakingAnswer === "string" && speakingAnswer !== "SKIPPED";
  const speakingBusy = speakingPhase === "starting" || speakingPhase === "processing";
  const elapsed = `${Math.floor(recordingMs / 60000)}:${String(Math.floor((recordingMs % 60000) / 1000)).padStart(2, "0")}`;

  // Dynamic layout: if any option is long (>45 chars), use single column
  const hasLongOptions = current.options?.some((opt) => opt.length > 45);

  return (
    <>
      <div className="flex min-h-dvh w-full flex-col bg-slate-50 font-sans dark:bg-slate-950">
        <PracticeHeader
          title={diagnosticDisplayTitle}
          mobileTitle="Đánh giá đầu vào"
          category="Đánh giá đầu vào"
          positionText={`Câu ${step + 1}/${assessment.questions.length}`}
          activityLabel="Đánh giá đầu vào"
          onExit={() => setShowExitConfirm(true)}
          exitLabel="Tạm dừng"
        />

        <main className="mx-auto grid w-full max-w-7xl flex-1 content-start gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:p-8">
          {/* Question list: a bar with a drawer below lg, a sticky sidebar from lg. */}
          <div className="lg:order-2 lg:sticky lg:top-6">
            <DiagnosticQuestionNavigator
              questions={assessment.questions}
              currentStep={step}
              answers={answers}
              onSelectStep={(targetStep) => {
                if (autoAdvanceTimer) {
                  clearTimeout(autoAdvanceTimer);
                  setAutoAdvanceTimer(null);
                }
                setStep(targetStep);
              }}
            />
          </div>

          <section className="min-w-0 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8 lg:order-1 lg:p-10">
            {/* READING PASSAGE UI HIERARCHY */}
            {isReading && passageBody && (
              <article className="mb-8 rounded-2xl bg-slate-50 px-5 py-5 dark:bg-slate-850 sm:px-7 sm:py-6" aria-label="Đoạn đọc">
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                  {passageTitle || "Đoạn đọc"}
                </p>
                <div className="mt-3 max-w-[68ch] whitespace-pre-line text-[17px] leading-8 text-slate-800 dark:text-slate-200">
                  {passageHighlight ? (
                    <>
                      {passageBody.slice(0, passageHighlight.start)}
                      <strong className="rounded bg-amber-100 px-0.5 font-bold text-slate-900 dark:bg-amber-900/50 dark:text-amber-100">
                        {passageBody.slice(passageHighlight.start, passageHighlight.end)}
                      </strong>
                      {passageBody.slice(passageHighlight.end)}
                    </>
                  ) : (
                    passageBody
                  )}
                </div>
              </article>
            )}

            {/* LISTENING AUDIO PLAYER */}
            {isListening && (
              <div className="mb-8 rounded-2xl border border-violet-200 bg-violet-50/70 p-5 dark:border-violet-900 dark:bg-violet-950/30 sm:p-6">
                <p className="text-sm font-extrabold text-violet-900 dark:text-violet-100">
                  Nghe đoạn âm thanh dưới đây rồi chọn câu trả lời đúng nhất:
                </p>
                {!listeningNotReady && current.audioUrl ? (
                  <audio
                    className="mt-3 w-full"
                    controls
                    preload="metadata"
                    src={current.audioUrl}
                    aria-label="Âm thanh bài nghe"
                  />
                ) : (
                  <p className="mt-2 text-sm font-bold text-rose-600" role="status">
                    Âm thanh của câu này chưa được phát hành nên chưa thể trả lời. Vui lòng quay lại sau.
                  </p>
                )}
              </div>
            )}

            {/* QUESTION STEM WITH VISUAL SOLID BLANK FOR CLOZE */}
            <h2 className="text-xl font-black leading-snug text-slate-900 dark:text-slate-100 sm:text-2xl">
              <span className="mr-2.5 text-violet-600 dark:text-violet-400 font-extrabold">
                {step + 1}.
              </span>
              <ClozePrompt prompt={current.question} />
            </h2>

            {(isSpeaking || isOpenText) && current.instructions?.trim() && (
              <p className="mt-4 whitespace-pre-line rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700 dark:border-slate-700 dark:bg-slate-850 dark:text-slate-300">
                {current.instructions}
              </p>
            )}

            {/* QUESTION INTERACTION BODY */}
            {isSpeaking ? (
              <div className="mt-8 space-y-4 rounded-2xl bg-slate-50 p-5 dark:bg-slate-850 sm:p-6">
                {recording && (
                  <p className="flex items-center gap-2.5 text-sm font-bold text-rose-700 dark:text-rose-300" role="status">
                    <span className="size-2.5 animate-pulse rounded-full bg-rose-600" aria-hidden="true" />
                    Đang ghi âm · {elapsed}
                  </p>
                )}
                {speakingPhase === "processing" && (
                  <p className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300" role="status">
                    <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                    Đang gửi bản ghi…
                  </p>
                )}
                {speakingNotice && speakingPhase === "done" && (
                  <p className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-300" role="status">
                    <CheckCircle2 size={16} aria-hidden="true" />
                    {speakingNotice}
                  </p>
                )}
                {!recording && speakingPhase !== "processing" && hasRecording && speakingPhase !== "done" && (
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300" role="status">
                    Bạn đã gửi bản ghi cho câu này. Có thể ghi lại nếu muốn.
                  </p>
                )}
                {speakingAnswer === "SKIPPED" && !recording && speakingPhase === "idle" && (
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-400" role="status">
                    Bạn đã bỏ qua câu này. Có thể ghi âm nếu muốn làm.
                  </p>
                )}
                {speakingError && (
                  <p className="text-sm font-bold text-rose-700 dark:text-rose-300" role="alert">
                    {speakingError}
                  </p>
                )}
                {recordedUrl && !recording && (
                  <audio className="w-full" controls src={recordedUrl} preload="metadata" aria-label="Nghe lại bài nói" />
                )}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => (recording ? stopRecording() : void startRecording(current.id, limitMs))}
                    disabled={speakingBusy || skipping}
                    aria-pressed={recording}
                    className={`inline-flex min-h-12 items-center gap-2 rounded-xl px-6 text-sm font-extrabold text-white transition-colors disabled:opacity-60 ${
                      recording ? "bg-rose-600 hover:bg-rose-700" : "bg-violet-600 hover:bg-violet-700"
                    }`}
                  >
                    {speakingBusy ? (
                      <Loader2 size={17} className="animate-spin" aria-hidden="true" />
                    ) : recording ? (
                      <Square size={16} aria-hidden="true" />
                    ) : (
                      <Mic size={17} aria-hidden="true" />
                    )}
                    <span>
                      {speakingPhase === "starting"
                        ? "Đang mở micro…"
                        : speakingPhase === "processing"
                          ? "Đang gửi…"
                          : recording
                            ? "Dừng ghi âm"
                            : hasRecording || speakingPhase === "done"
                              ? "Ghi lại"
                              : "Ghi âm"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void skipSpeaking(current.id)}
                    disabled={recording || speakingBusy || skipping}
                    className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-extrabold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <SkipForward size={16} aria-hidden="true" />
                    <span>Bỏ qua</span>
                  </button>
                </div>
              </div>
            ) : isOpenText ? (
              <>
              <textarea
                value={writtenText}
                onChange={(event) =>
                  setAnswers((old) => ({
                    ...old,
                    [current.id]: event.target.value,
                  }))
                }
                className="mt-8 min-h-36 w-full rounded-2xl border-2 border-slate-200 bg-white p-4 text-base leading-6 text-slate-800 outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                placeholder="Nhập câu trả lời của bạn..."
                aria-label="Câu trả lời tự luận"
                aria-describedby={guidance ? "writing-guidance" : undefined}
              />
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {writingSkipped ? (
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-400" role="status">
                    Bạn đã bỏ qua bài viết này. Gõ vào ô trên nếu muốn làm lại.
                  </p>
                ) : (
                  !writtenText.trim() && (
                    <button
                      type="button"
                      onClick={() => skipWriting(current.id)}
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-extrabold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <SkipForward size={16} aria-hidden="true" />
                      <span>Bỏ qua</span>
                    </button>
                  )
                )}
              </div>
              {guidance && !writingSkipped && (
                <p
                  id="writing-guidance"
                  aria-live="polite"
                  className={`mt-2 text-xs font-bold ${
                    guidance.tone === "within"
                      ? "text-emerald-700 dark:text-emerald-300"
                      : guidance.tone === "neutral"
                        ? "text-slate-500 dark:text-slate-400"
                        : "text-amber-700 dark:text-amber-300"
                  }`}
                >
                  {guidance.message}
                </p>
              )}
              </>
            ) : (
              /* OBJECTIVE MULTIPLE CHOICE OPTIONS WITH AUTO-ADVANCE */
              <div
                className={`mt-8 grid gap-3.5 ${
                  hasLongOptions ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"
                }`}
              >
                {current.options.map((option, index) => {
                  const isSelected = answers[current.id] === index;
                  return (
                    <button
                      key={`${current.id}-${option}-${index}`}
                      type="button"
                      onClick={() => handleSelectOption(current.id, index)}
                      aria-pressed={isSelected}
                      className={`group flex min-h-14 items-center rounded-2xl border-2 px-5 py-3.5 text-left transition-all ${
                        isSelected
                          ? "border-violet-600 bg-violet-50/80 text-violet-950 shadow-xs dark:border-violet-500 dark:bg-violet-950/50 dark:text-violet-100"
                          : "border-slate-200/90 bg-white text-slate-700 hover:border-violet-300 hover:bg-slate-50/50 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-200 dark:hover:border-slate-700"
                      }`}
                    >
                      <span
                        className={`mr-3.5 flex size-8 shrink-0 items-center justify-center rounded-xl text-xs font-black transition-colors ${
                          isSelected
                            ? "bg-violet-600 text-white"
                            : "bg-slate-100 text-slate-600 group-hover:bg-violet-100 group-hover:text-violet-700 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="text-sm font-bold sm:text-base leading-snug">
                        {option}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Bottom Actions: Previous / Next / Submit */}
            <div className="mt-10 flex items-center justify-between border-t border-slate-100 pt-6 dark:border-slate-800">
              {current.section !== "SPEAKING" ? (
                <button
                  type="button"
                  onClick={() => {
                    if (autoAdvanceTimer) {
                      clearTimeout(autoAdvanceTimer);
                      setAutoAdvanceTimer(null);
                    }
                    setStep((value) => Math.max(0, value - 1));
                  }}
                  disabled={!step}
                  className="min-h-11 rounded-xl border border-slate-200 px-5 text-sm font-extrabold text-slate-700 hover:bg-slate-50 disabled:opacity-30 dark:border-slate-700 dark:text-slate-300"
                >
                  Câu trước
                </button>
              ) : (
                <div />
              )}

              <button
                type="button"
                disabled={
                  answers[current.id] === undefined ||
                  (typeof answers[current.id] === "string" &&
                    !(answers[current.id] as string).trim()) ||
                  submit.isPending ||
                  listeningNotReady
                }
                onClick={() => {
                  if (autoAdvanceTimer) {
                    clearTimeout(autoAdvanceTimer);
                    setAutoAdvanceTimer(null);
                  }
                  if (step === assessment.questions.length - 1) {
                    handleSubmit();
                  } else {
                    setStep((value) => value + 1);
                  }
                }}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-600 px-6 text-sm font-extrabold text-white transition hover:bg-violet-700 disabled:opacity-40"
              >
                {submit.isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Đang lưu kết quả...</span>
                  </>
                ) : step === assessment.questions.length - 1 ? (
                  <>
                    <span>Hoàn thành & nộp bài</span>
                    <ArrowRight size={16} />
                  </>
                ) : (
                  <>
                    <span>Câu tiếp</span>
                    <ArrowRight size={16} />
                  </>
                )}
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
        title="Tạm dừng bài đánh giá đầu vào?"
        description="Bài Nói đã xác nhận được lưu trên hệ thống; các câu trắc nghiệm và bài Viết được lưu tạm trên thiết bị và trình duyệt này. Bạn có thể quay lại tiếp tục bất cứ lúc nào."
        confirmLabel="Rời đi"
        cancelLabel="Tiếp tục làm"
        onCancel={() => setShowExitConfirm(false)}
        onConfirm={() => {
          setShowExitConfirm(false);
          setStarted(false);
          setFocusMode(false);
        }}
      />

      <ConfirmDialog
        open={showSubmitConfirm}
        title="Nộp bài khi còn phần bỏ qua?"
        description={`Bạn đã bỏ qua ${[
          skippedSummary.speaking ? `${skippedSummary.speaking} bài Nói` : "",
          skippedSummary.writing ? `${skippedSummary.writing} bài Viết` : "",
        ]
          .filter(Boolean)
          .join(" và ")}. Phần bỏ qua không được chấm và không bị tính là 0 điểm, nhưng kỹ năng đó sẽ không có điểm và bạn sẽ không có điểm tổng bốn kỹ năng. Sau khi nộp, bạn không thể quay lại làm phần này.`}
        confirmLabel="Vẫn nộp bài"
        cancelLabel="Quay lại làm tiếp"
        onCancel={() => setShowSubmitConfirm(false)}
        onConfirm={() => {
          setShowSubmitConfirm(false);
          submit.mutate();
        }}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REDESIGNED DIAGNOSTIC RESULT VIEW
// Counts come from the administered form; V2 attempts show the four-skill
// profile. Practice recommendations,
// deduplicated skills, no contradictory course cards, no retake button,
// filterable grouped answer review.
// ─────────────────────────────────────────────────────────────────────────────
function DiagnosticResultView({
  assessment,
  result,
  onBack,
}: {
  assessment: DiagnosticAssessment;
  result: DiagnosticResult;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const [reviewFilter, setReviewFilter] = useState<string>("ALL");
  const retryWriting = useMutation({
    mutationFn: (questionId: number) =>
      diagnosticService.retryWriting(assessment.id, result.attemptId, questionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["diagnostic-latest-result"] }),
    onError: () => toast.error("Chưa thể xếp hàng chấm lại bài viết. Vui lòng thử sau."),
  });
  const retrySpeaking = useMutation({
    mutationFn: (questionId: number) =>
      diagnosticService.retrySpeaking(assessment.id, result.attemptId, questionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["diagnostic-latest-result"] }),
    onError: () => toast.error("Chưa thể xếp hàng chấm lại bài nói. Vui lòng thử sau."),
  });

  const fourSkill = result.fourSkill ?? null;
  const speakingTaskIds = assessment.questions.filter(isSpeakingTask).map((q) => q.id);
  const writingTaskIds = assessment.questions.filter(isWritingTask).map((q) => q.id);

  const practiceItems = result.practiceRecommendations || [];

  // Filter review items
  const filteredReviews = useMemo(() => {
    return result.questionsResult.filter((item) => {
      const q = assessment.questions.find((candidate) => candidate.id === item.questionId);
      if (reviewFilter === "INCORRECT") {
        return item.isCorrect === false;
      }
      if (reviewFilter === "GRAMMAR_VOCAB") {
        return q?.section === "LANGUAGE_USE" || q?.skill === "Grammar" || q?.skill === "Vocabulary";
      }
      if (reviewFilter === "READING") {
        return q?.section === "READING" || q?.skill === "Reading";
      }
      if (reviewFilter === "LISTENING") {
        return q?.section === "LISTENING" || q?.skill === "Listening";
      }
      return true;
    });
  }, [result.questionsResult, assessment.questions, reviewFilter]);

  const incorrectCount = result.questionsResult.filter((q) => q.isCorrect === false).length;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-base font-bold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-violet-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
      >
        <ArrowLeft size={18} strokeWidth={2.25} aria-hidden="true" />
        <span>Quay lại</span>
      </button>
      {/* 1. Header Card: what was administered and how it was scored */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:p-9">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-sm font-black text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <CheckCircle2 size={15} />
            <span>Đã hoàn thành đánh giá đầu vào</span>
          </span>
        </div>

        {fourSkill?.observed ? (
          <>
            <h1 className="mt-4 text-3xl font-black text-slate-900 dark:text-slate-100 sm:text-4xl">
              Kết quả đánh giá đầu vào
            </h1>
            <ObservedResultPanel observed={fourSkill.observed} breakdown={result.objectiveBreakdown} />
          </>
        ) : fourSkill ? (
          <FourSkillPanel result={fourSkill} />
        ) : (
          <>
            <h1 className="mt-4 text-3xl font-black text-slate-900 dark:text-slate-100 sm:text-4xl">
              Mức năng lực tham khảo: {formatPlacementLevel(result.referenceLevel ?? result.level)}
            </h1>

            <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-4.5 dark:border-slate-800 dark:bg-slate-850">
              <p className="text-base font-extrabold text-slate-800 dark:text-slate-200">
                Phần trắc nghiệm khách quan:{" "}
                <span className="text-emerald-600 dark:text-emerald-400">
                  {result.correctCount}/{result.totalCount} câu đúng
                </span>{" "}
                ({result.percentage}%)
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 leading-6">
                Mức tham khảo được tính từ {result.totalCount} câu trắc nghiệm khách quan.
                {speakingTaskIds.length + writingTaskIds.length > 0
                  ? " Các bài Nói và Viết được nhận xét riêng để gợi ý luyện tập; chúng không thay đổi mức này."
                  : ""}
              </p>
            </div>
          </>
        )}

        {/* Speaking feedback, one card per task */}
        {speakingTaskIds.length > 0 && (
          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Bài Nói
            </h3>
            {speakingTaskIds.map((questionId, index) => {
              const item = result.speakingResponses?.find((row) => row.questionId === questionId);
              return (
                <article key={questionId} className="rounded-2xl border border-slate-200 bg-white p-4 text-base dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="font-black text-slate-900 dark:text-slate-100">Bài Nói {index + 1}</h4>
                    <TaskStatusChip status={item?.status} score={item?.score ?? null} />
                  </div>
                  {item?.status === "GRADED" && (
                    <>
                      <CriteriaList criteria={item.criteria} feedback={item.criterionFeedback} weights={item.criterionWeights} />
                      {item.limitedEvidence && (
                        <p className="mt-2 text-sm leading-6 text-amber-800 dark:text-amber-300">
                          Bằng chứng hạn chế: một số tiêu chí chưa đánh giá được, nên điểm bài này chỉ tính trên các tiêu chí còn lại.
                        </p>
                      )}
                      {item.feedback && <FeedbackSummary text={item.feedback} />}
                      {item.suggestions && <SuggestionList items={item.suggestions} />}
                    </>
                  )}
                  {item?.status === "SKIPPED" && (
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                      Bạn đã bỏ qua bài này nên bài không được chấm. Bài bỏ qua không bị tính 0 và không được tính trọng số.
                    </p>
                  )}
                  {item?.status === "GRADING_FAILED" && (
                    <>
                      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                        Bản ghi của bạn vẫn được lưu nhưng chưa chấm được. Kỹ năng Nói chưa có điểm cho tới khi chấm lại thành công.
                      </p>
                      <button type="button" onClick={() => retrySpeaking.mutate(questionId)} disabled={retrySpeaking.isPending} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-violet-300 px-3 text-sm font-bold text-violet-700 transition hover:bg-violet-50 disabled:opacity-50 dark:border-violet-800 dark:text-violet-300"><RotateCcw size={14} /> Chấm lại</button>
                    </>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {/* Writing feedback, one card per task */}
        {writingTaskIds.length > 0 && (
          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Bài Viết
            </h3>
            {writingTaskIds.map((questionId, index) => {
              const item = result.writingFeedback?.find((row) => row.questionId === questionId);
              const skipped =
                !item && result.questionsResult.find((row) => row.questionId === questionId)?.selectedText === "";
              if (!item)
                return (
                  <article key={questionId} className="rounded-2xl border border-slate-200 bg-white p-4 text-base dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="font-black text-slate-900 dark:text-slate-100">Bài Viết {index + 1}</h4>
                      <TaskStatusChip status={skipped ? "SKIPPED" : undefined} score={null} />
                    </div>
                    {skipped && (
                      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                        Bạn đã bỏ qua bài này nên bài không được chấm. Bài bỏ qua không bị tính 0 và không được tính trọng số.
                      </p>
                    )}
                  </article>
                );
              return (
              <article key={item.questionId} className="rounded-2xl border border-slate-200 bg-white p-4 text-base dark:border-slate-700 dark:bg-slate-900">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-black text-slate-900 dark:text-slate-100">Bài Viết {index + 1}</h4>
                  <TaskStatusChip status={item.status} score={item.score} />
                </div>
                {typeof item.wordCount === "number" && (
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.wordCount} từ</p>
                )}
                {item.status === "GRADED" && <CriteriaList criteria={item.criteria} feedback={item.criterionFeedback} weights={item.criterionWeights} />}
                {item.feedback && <FeedbackSummary text={item.feedback} />}
                <SuggestionList items={item.suggestions} />
                {item.status === "GRADING_FAILED" && <button type="button" onClick={() => retryWriting.mutate(item.questionId)} disabled={retryWriting.isPending} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-violet-300 px-3 text-sm font-bold text-violet-700 transition hover:bg-violet-50 disabled:opacity-50 dark:border-violet-800 dark:text-violet-300"><RotateCcw size={14} /> Chấm lại</button>}
              </article>
              );
            })}
          </div>
        )}

        {/* Skill Profiles Breakdown */}
        {!fourSkill && result.skillProfiles && result.skillProfiles.length > 0 && (
          <div className="mt-7">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Kết quả theo kỹ năng
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {result.skillProfiles.map((p) => (
                <div
                  key={p.skill}
                  className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-850"
                >
                  <p className="text-sm font-black text-slate-700 dark:text-slate-300">
                    {formatSkillName(p.skill)}
                  </p>
                  <p className="mt-1 text-base font-black text-slate-900 dark:text-slate-100">
                    {p.percentage !== null
                      ? `${p.percentage}% (${p.correctCount}/${p.totalCount})`
                      : "Chưa đủ dữ liệu"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strengths & Weaknesses (V1 results; V2 shows the D1 advice) */}
        {!result.advice && (
        <div className="mt-7 grid gap-4 border-t border-slate-100 pt-6 sm:grid-cols-2 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Điểm mạnh
            </h3>
            <p className="mt-1 text-base font-bold text-slate-800 dark:text-slate-200">
              {result.strengths && result.strengths.length > 0
                ? result.strengths.map(formatSkillName).join(", ")
                : "Chưa ghi nhận kỹ năng nổi trội từ kết quả hiện tại."}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Nên củng cố
            </h3>
            <p className="mt-1 text-base font-bold text-slate-800 dark:text-slate-200">
              {result.weaknesses && result.weaknesses.length > 0
                ? result.weaknesses.map(formatSkillName).join(", ")
                : "Chưa ghi nhận kỹ năng cần ưu tiên cải thiện."}
            </p>
          </div>
        </div>
        )}
      </section>

      {result.advice && <AdvicePanel advice={result.advice} />}

      {/* 2. Concrete Practice Recommendations (NO Course Cards) */}
      {practiceItems.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:p-9">
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-violet-600 dark:text-violet-400" />
            <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
              Bài luyện đề xuất
            </h2>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Dựa trên phân tích kết quả bài kiểm tra, hệ thống gợi ý các lộ trình luyện tập mục tiêu cho bạn:
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {practiceItems.map((rec) => (
              <Link
                key={rec.id}
                href={rec.route}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4.5 transition-all hover:border-violet-500 hover:shadow-xs dark:border-slate-800 dark:bg-slate-850 dark:hover:border-violet-500"
              >
                <div>
                  <span className="inline-block rounded-md bg-violet-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                    {rec.badge}
                  </span>
                  <h3 className="mt-2 text-base font-black text-slate-900 group-hover:text-violet-600 dark:text-slate-100 dark:group-hover:text-violet-400">
                    {rec.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-6">
                    {rec.description}
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-sm font-extrabold text-violet-600 dark:text-violet-400">
                  <span>Luyện tập ngay</span>
                  <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 3. Filterable Grouped Answer Review */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:p-9">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
            Đối chiếu câu trả lời
          </h2>
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Bộ lọc đối chiếu câu hỏi">
            {[
              { id: "ALL", label: `Tất cả (${result.questionsResult.length})` },
              { id: "INCORRECT", label: `Câu sai (${incorrectCount})` },
              { id: "GRAMMAR_VOCAB", label: "Ngữ pháp & Từ vựng" },
              { id: "READING", label: "Reading" },
              { id: "LISTENING", label: "Listening" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setReviewFilter(f.id)}
                className={`rounded-xl px-3 py-1.5 text-sm font-bold transition-all ${
                  reviewFilter === f.id
                    ? "bg-violet-600 text-white"
                    : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {filteredReviews.length === 0 ? (
            <p className="py-6 text-center text-sm font-bold text-slate-400">
              Không có câu hỏi nào trong danh mục này.
            </p>
          ) : (
            filteredReviews.map((item) => {
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

              // Speaking and Writing have no answer key: the stored value is a
              // recording status or the learner's text, graded by rubric above.
              if (question && (isSpeakingTask(question) || isWritingTask(question))) {
                const speaking = isSpeakingTask(question);
                return (
                  <div
                    key={item.questionId}
                    className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4 text-sm dark:border-slate-800 dark:bg-slate-850"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold text-slate-800 dark:text-slate-200">
                        Câu {question.order}: {question.question.slice(0, 80)}
                      </span>
                      <span className="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-black text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        Chấm theo tiêu chí
                      </span>
                    </div>
                    <p className="mt-2 text-slate-600 dark:text-slate-400">
                      {speaking ? (
                        "Bài nói được chấm theo tiêu chí; xem nhận xét ở phần Bài Nói phía trên."
                      ) : (
                        <>
                          <span className="font-bold">Bài làm: </span>
                          <span className="line-clamp-3 whitespace-pre-line">{item.selectedText ?? "Chưa trả lời"}</span>
                        </>
                      )}
                    </p>
                  </div>
                );
              }

              return (
                <div
                  key={item.questionId}
                  className={`rounded-2xl border p-4 text-sm transition-colors ${
                    item.isCorrect
                      ? "border-emerald-200/90 bg-emerald-50/30 dark:border-emerald-950 dark:bg-emerald-950/20"
                      : item.isCorrect === false
                        ? "border-rose-200/90 bg-rose-50/30 dark:border-rose-950 dark:bg-rose-950/20"
                        : "border-slate-200 bg-slate-50/40 dark:border-slate-800 dark:bg-slate-850"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-slate-800 dark:text-slate-200">
                      Câu {question?.order ?? item.questionId}:{" "}
                      {question?.question ? question.question.slice(0, 80) : ""}
                    </span>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                        item.isCorrect
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : item.isCorrect === false
                            ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {item.isCorrect
                        ? "Chính xác"
                        : item.isCorrect === false
                          ? "Chưa chính xác"
                          : "Đánh giá bổ trợ"}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-slate-600 dark:text-slate-400">
                    <p>
                      <span className="font-bold">Bạn chọn: </span>
                      <span className={item.isCorrect ? "font-bold text-emerald-700 dark:text-emerald-300" : "font-bold text-rose-700 dark:text-rose-300"}>
                        {item.selectedText ?? selected ?? "Chưa trả lời"}
                      </span>
                    </p>
                    {item.isCorrect !== true && (
                      <p>
                        <span className="font-bold">Đáp án chuẩn: </span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-300">
                          {item.correctText ?? standard ?? "Đánh giá sau"}
                        </span>
                      </p>
                    )}
                  </div>

                  {item.explanation && (
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-4">
                      {item.explanation}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* 4. Bottom CTAs: Dashboard & Profile Tab Link (NO RETAKE BUTTON) */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:p-7">
        <div>
          <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
            Kết quả đã được lưu vĩnh viễn vào hồ sơ
          </h3>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Bạn có thể xem lại kết quả này bất kỳ lúc nào tại mục Tài khoản.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/hub?tab=diagnostic-result"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-200 px-4 text-sm font-extrabold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Award size={15} />
            <span>Xem trong Hồ sơ</span>
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-extrabold text-white hover:bg-violet-700"
          >
            <span>Về Bảng điều khiển</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}

const FOUR_SKILL_ORDER = ["LISTENING", "READING", "SPEAKING", "WRITING"] as const;
const FOUR_SKILL_LABELS: Record<string, string> = {
  LISTENING: "Nghe",
  READING: "Đọc",
  SPEAKING: "Nói",
  WRITING: "Viết",
  LANGUAGE_USE: "Ngữ pháp & Từ vựng",
};

const SKILL_TONE_CLASS: Record<string, string> = {
  done: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  failed: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300",
  missing: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  skipped: "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-600",
};

// FOUR_SKILL_PLACEMENT_V2: each skill on its own 0-100 scale. The overall is
// shown only when all four skills are scored; no placement band is shown
// (DEF-004 decided as D1: advisory scores only).
function FourSkillPanel({ result }: { result: DiagnosticFourSkillResult }) {
  const languageUse = result.skills.LANGUAGE_USE;
  const pending = result.state === "PENDING_GRADING";
  return (
    <div className="mt-4">
      <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 sm:text-4xl">
        Kết quả theo bốn kỹ năng
      </h1>
      <p className="mt-2 text-base leading-6 text-slate-600 dark:text-slate-300">
        {result.overall !== null
          ? <>Điểm tổng tham khảo: <span className="font-black text-slate-900 dark:text-slate-100">{result.overall}/100</span> (trung bình bốn kỹ năng, mỗi kỹ năng 25%).</>
          : pending
            ? "Bài Nói hoặc Viết đang được chấm. Điểm tổng chỉ hiển thị khi cả bốn kỹ năng đều có điểm; trang sẽ tự cập nhật."
            : `Điểm tổng chưa có vì ${FOUR_SKILL_ORDER.filter((k) => result.skills[k]?.state !== "COMPLETE")
                .map((k) => `${FOUR_SKILL_LABELS[k]} (${describeSkillState(result.skills[k]?.state, result.skills[k]).label.toLowerCase()})`)
                .join(", ")} chưa có điểm. Các kỹ năng đã có điểm vẫn hiển thị bên dưới.`}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {FOUR_SKILL_ORDER.map((key) => {
          const skill = result.skills[key];
          const state = describeSkillState(skill?.state, skill);
          return (
            <div key={key} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-850">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-black text-slate-700 dark:text-slate-300">{FOUR_SKILL_LABELS[key]}</p>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${SKILL_TONE_CLASS[state.tone]}`}>{state.label}</span>
              </div>
              <p className="mt-2 text-3xl font-black text-slate-900 dark:text-slate-100">
                {skill?.score !== null && skill?.score !== undefined ? `${skill.score}/100` : "—"}
              </p>
              {skill && (key === "LISTENING" || key === "READING") && skill.itemsTotal > 0 && (
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{skill.itemsScored}/{skill.itemsTotal} câu đúng</p>
              )}
            </div>
          );
        })}
      </div>
      {languageUse && languageUse.itemsTotal > 0 && (
        <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
          {FOUR_SKILL_LABELS.LANGUAGE_USE}: {languageUse.itemsScored}/{languageUse.itemsTotal} câu đúng. Phần này chỉ dùng để gợi ý luyện tập, không tính vào điểm tổng.
        </p>
      )}
      <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
        Đây là chỉ số luyện tập nội bộ của BreadTrans, không phải điểm thi hay chứng chỉ chính thức.
      </p>
    </div>
  );
}

function TaskStatusChip({ status, score }: { status?: string; score: number | null }) {
  const label =
    status === "GRADED" && score !== null
      ? `${Math.round(score)}/100`
      : status === "GRADING_FAILED"
        ? "Chấm chưa thành công"
        : status === "SKIPPED"
          ? "Đã bỏ qua"
          : status && ["SUBMITTED", "QUEUED", "GRADING"].includes(status)
            ? "Đang chấm"
            : "Chưa có bài làm";
  const tone =
    status === "GRADED"
      ? "done"
      : status === "GRADING_FAILED"
        ? "failed"
        : status === "SKIPPED"
          ? "skipped"
          : status && ["SUBMITTED", "QUEUED", "GRADING"].includes(status)
            ? "pending"
            : "missing";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-bold ${SKILL_TONE_CLASS[tone]}`}>
      {tone === "pending" && <Loader2 size={12} className="animate-spin" />}
      {label}
    </span>
  );
}

// Rubric criteria are scored 0-4 each; null means it could not be assessed.
function GradingWaitScreen({
  progress,
  onShowPartial,
}: {
  progress: { done: number; total: number };
  onShowPartial?: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-12 text-center">
      <Loader2 className="animate-spin text-blue-600 dark:text-blue-400" size={40} aria-hidden="true" />
      <h1 className="mt-5 text-2xl font-black text-slate-900 dark:text-slate-100">Đang chấm bài của bạn</h1>
      <p className="mt-2 text-base leading-7 text-slate-700 dark:text-slate-300">
        Phần Nghe và Đọc đã có điểm. Bài Nói và Viết đang được chấm, thường mất dưới một phút. Kết quả sẽ tự hiện khi
        chấm xong, bạn không cần tải lại trang.
      </p>
      {progress.total > 0 && (
        <p className="mt-4 text-base font-bold text-slate-900 dark:text-slate-100" aria-live="polite">
          Đã chấm {progress.done}/{progress.total} bài Nói và Viết
        </p>
      )}
      {onShowPartial && (
        <button
          type="button"
          onClick={onShowPartial}
          className="mt-6 inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Xem kết quả tạm thời
        </button>
      )}
    </div>
  );
}

function FeedbackSummary({ text }: { text: string }) {
  return (
    <div className="mt-4">
      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Nhận xét chung</p>
      <p className="mt-1 text-base leading-7 text-slate-800 dark:text-slate-200">{text}</p>
    </div>
  );
}

function SuggestionList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-3">
      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Nên làm gì để cải thiện</p>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-base leading-7 text-slate-800 dark:text-slate-200">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function CriteriaList({
  criteria,
  feedback,
  weights,
}: {
  criteria?: Record<string, number | null> | null;
  feedback?: Record<string, string> | null;
  weights?: Record<string, number> | null;
}) {
  const entries = criteria ? Object.entries(criteria) : [];
  if (!entries.length) return null;
  return (
    <dl className="mt-3 grid gap-3 sm:grid-cols-2">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-850">
          <dt className="flex flex-wrap items-center justify-between gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
            <span>
              {formatCriterionName(key)}
              {weights?.[key] !== undefined && (
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400"> ({Math.round(weights[key] * 100)}%)</span>
              )}
            </span>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{describeCriterionScore(value)}</span>
          </dt>
          {feedback?.[key] && <dd className="mt-2 text-base leading-7 text-slate-800 dark:text-slate-200">{feedback[key]}</dd>}
        </div>
      ))}
    </dl>
  );
}
