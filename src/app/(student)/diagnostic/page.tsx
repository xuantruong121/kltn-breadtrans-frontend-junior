"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, useMemo } from "react";
import {
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
  DiagnosticResult,
} from "@/lib/api/services/diagnostic.service";
import { useAuthStore } from "@/stores/authStore";
import { PracticeHeader } from "@/components/practice/PracticeHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAssessmentAntiCheat } from "@/hooks/useAssessmentAntiCheat";
import { useLearningFocusMode } from "@/contexts/LearningFocusContext";
import { ClozePrompt } from "@/components/diagnostic/ClozePrompt";
import { DiagnosticQuestionNavigator } from "@/components/diagnostic/DiagnosticQuestionNavigator";
import {
  formatPlacementLevel,
  formatSkillName,
  getUnansweredQuestionIndexes,
  resolveReviewAnswer,
} from "@/lib/diagnostic/diagnosticUiLogic";
import {
  DIAGNOSTIC_SPEAKING_MAX_DURATION_MS,
  isValidDiagnosticRecording,
  selectDiagnosticRecordingMimeType,
} from "@/lib/diagnostic/diagnosticSpeakingRecorderLogic";

function createSubmissionToken() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function nowMs() {
  return Date.now();
}

const diagnosticDisplayTitle = "Bài đánh giá năng lực đầu vào";
const diagnosticDisplayDescription =
  "Bài đánh giá gồm 52 nhiệm vụ (48 câu trắc nghiệm khách quan chấm điểm cùng 4 bài thực hành Nói và Viết) giúp hệ thống xác định điểm xuất phát phù hợp nhất với năng lực của bạn.";
const diagnosticDisplayGuidance =
  "Hãy hoàn thành bài đánh giá nghiêm túc. Mỗi học viên chỉ thực hiện bài đánh giá chính thức một lần duy nhất để bảo đảm tính chuẩn hóa.";

export default function DiagnosticPage() {
  const queryClient = useQueryClient();
  const { setFocusMode } = useLearningFocusMode();

  const {
    data: assessment,
    isLoading: isLoadingAssessment,
    isError,
  } = useQuery({
    queryKey: ["diagnostic-current"],
    queryFn: diagnosticService.getCurrent,
  });

  const {
    data: latestResult,
    isLoading: isLoadingResult,
  } = useQuery({
    queryKey: ["diagnostic-latest-result"],
    queryFn: diagnosticService.getLatestResult,
  });

  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [submissionToken, setSubmissionToken] = useState(createSubmissionToken);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [attemptId, setAttemptId] = useState<number | null>(null);

  // Auto-advance feedback state
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState<NodeJS.Timeout | null>(null);

  // Speaking state
  const [recording, setRecording] = useState(false);
  const [recordingMs, setRecordingMs] = useState(0);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [speakingError, setSpeakingError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef(0);

  // Resume in-progress attempt if exists
  useEffect(() => {
    const inProgress = assessment?.inProgressAttempt;
    if (!inProgress) return;
    setAttemptId(inProgress.id);
    const persisted = { ...(inProgress.answers as Record<string, number | string>) };
    for (const response of inProgress.speakingResponses) {
      persisted[String(response.questionId)] = response.status;
    }
    setAnswers((current) => ({ ...persisted, ...current }));
  }, [assessment?.inProgressAttempt]);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => {
      setRecordingMs(Date.now() - recordingStartedAtRef.current);
    }, 100);
    return () => window.clearInterval(timer);
  }, [recording]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer);
  }, [recordedUrl, autoAdvanceTimer]);

  useEffect(() => {
    setFocusMode(started);
    return () => setFocusMode(false);
  }, [started, setFocusMode]);

  const submit = useMutation({
    mutationFn: () =>
      diagnosticService.submit(
        assessment!.id,
        answers,
        submissionToken,
        attemptId ?? undefined,
      ),
    onSuccess: (data) => {
      if (document.fullscreenElement) {
        void document.exitFullscreen?.().catch(() => undefined);
      }
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
      durationMs: number;
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
    onSuccess: (response, variables) => {
      setAnswers((current) => ({
        ...current,
        [variables.questionId]: response.status,
      }));
      setRecordedAudio(null);
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(null);
      setSpeakingError(
        response.status === "GRADING_FAILED"
          ? "Đã ghi nhận bài nói nhưng chưa thể chấm tự động."
          : null,
      );
      setStep((value) => Math.min(assessment!.questions.length - 1, value + 1));
    },
    onError: (error) =>
      setSpeakingError(
        error instanceof Error ? error.message : "Không thể lưu bản ghi âm.",
      ),
  });

  const result: DiagnosticResult | undefined = submit.data ?? latestResult ?? undefined;

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
          err?.response?.data?.message ||
            "Không thể khởi tạo phiên kiểm tra. Vui lòng thử lại.",
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

  const startRecording = async () => {
    setSpeakingError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setSpeakingError("Trình duyệt này chưa hỗ trợ ghi âm. Bạn có thể bỏ qua phần nói.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = selectDiagnosticRecordingMimeType((type) =>
        MediaRecorder.isTypeSupported(type),
      );
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || mimeType || "audio/webm",
        });
        const duration = nowMs() - recordingStartedAtRef.current;
        if (!isValidDiagnosticRecording(blob.size, duration)) {
          setSpeakingError("Bản ghi quá ngắn. Vui lòng thử lại hoặc bỏ qua.");
          return;
        }
        setRecordedAudio(blob);
        setRecordedUrl(URL.createObjectURL(blob));
        setRecordingMs(duration);
      };
      streamRef.current = stream;
      recorderRef.current = recorder;
      recordingStartedAtRef.current = nowMs();
      setRecordingMs(0);
      setRecording(true);
      recorder.start();
      window.setTimeout(() => {
        if (recorderRef.current === recorder && recorder.state === "recording") {
          stopRecording();
        }
      }, DIAGNOSTIC_SPEAKING_MAX_DURATION_MS);
    } catch (error) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      setSpeakingError(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Bạn đã từ chối quyền micro. Bạn có thể bỏ qua phần nói."
          : "Không thể truy cập micro. Bạn có thể bỏ qua phần nói.",
      );
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    setRecording(false);
    setRecordingMs((value) => Math.max(value, Date.now() - recordingStartedAtRef.current));
  };

  const discardRecording = () => {
    setRecordedAudio(null);
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl(null);
    setRecordingMs(0);
    setSpeakingError(null);
  };

  const skipSpeaking = async (questionId: number) => {
    if (!assessment || !attemptId) return;
    try {
      await diagnosticService.skipSpeaking(assessment.id, attemptId, questionId);
      setAnswers((current) => ({ ...current, [questionId]: "SKIPPED" }));
      discardRecording();
      setStep((value) => Math.min(assessment.questions.length - 1, value + 1));
    } catch {
      setSpeakingError("Không thể ghi nhận thao tác bỏ qua. Vui lòng thử lại.");
    }
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
  if (hasCompleted && result) {
    return <DiagnosticResultView assessment={assessment} result={result} />;
  }

  // Not started yet
  if (!started) {
    const isResuming = !!assessment.inProgressAttempt;
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:p-10">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
            <Target size={28} />
          </div>

          <h1 className="mt-5 text-2xl font-black text-slate-900 dark:text-slate-100 sm:text-3xl">
            {diagnosticDisplayTitle}
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
            {diagnosticDisplayDescription}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-850">
              <span className="text-xs font-bold text-slate-500">Quy mô</span>
              <p className="mt-1 font-extrabold text-slate-900 dark:text-slate-100">
                52 nhiệm vụ (48 trắc nghiệm + 4 thực hành)
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-850">
              <span className="text-xs font-bold text-slate-500">Thời lượng ước tính</span>
              <p className="mt-1 font-extrabold text-slate-900 dark:text-slate-100">
                35–50 phút
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-850">
              <span className="text-xs font-bold text-slate-500">Quy tắc lượt làm</span>
              <p className="mt-1 font-extrabold text-slate-900 dark:text-slate-100">
                1 lần chính thức duy nhất
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs font-medium leading-5 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
            {diagnosticDisplayGuidance}
          </div>

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
  const isSpeaking = current.section === "SPEAKING" && current.questionType === "OPEN_TEXT";
  const isOpenText = current.questionType === "OPEN_TEXT" && !isSpeaking;

  // Passage extraction for Reading
  const passageTitle = current.passageTitle?.trim() || "";
  const passageBody = current.passageBody?.trim() || current.passageText?.trim() || "";

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

        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
          {/* Section Progress & Collapsible Drawer Navigator */}
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

          {/* Main Question Card (Enlarged max-w-5xl responsive layout) */}
          <section className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8 lg:p-10">
            {/* READING PASSAGE UI HIERARCHY */}
            {isReading && passageBody && (
              <div className="mb-8 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-700 dark:bg-slate-850 sm:p-7">
                <span className="inline-block rounded-md bg-blue-100 px-2.5 py-0.5 text-xs font-black uppercase tracking-wider text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  Đoạn đọc
                </span>
                {passageTitle && (
                  <h3 className="mt-3 text-lg font-black tracking-tight text-slate-900 dark:text-slate-100 sm:text-xl">
                    {passageTitle}
                  </h3>
                )}
                <div className="mt-3 whitespace-pre-line text-base leading-relaxed text-slate-700 dark:text-slate-300 sm:text-[17px] sm:leading-loose">
                  {passageBody}
                </div>
              </div>
            )}

            {/* LISTENING AUDIO PLAYER */}
            {isListening && (
              <div className="mb-8 rounded-2xl border border-violet-200 bg-violet-50/70 p-5 dark:border-violet-900 dark:bg-violet-950/30 sm:p-6">
                <p className="text-sm font-extrabold text-violet-900 dark:text-violet-100">
                  Nghe đoạn âm thanh dưới đây rồi chọn câu trả lời đúng nhất:
                </p>
                {current.audioUrl ? (
                  <audio
                    className="mt-3 w-full"
                    controls
                    preload="metadata"
                    src={current.audioUrl}
                    aria-label="Âm thanh bài nghe"
                  />
                ) : (
                  <p className="mt-2 text-sm font-bold text-rose-600">
                    Âm thanh chưa sẵn sàng. Vui lòng thử lại sau.
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

            {/* QUESTION INTERACTION BODY */}
            {isSpeaking ? (
              <div className="mt-8 rounded-2xl border border-violet-200 bg-violet-50/70 p-5 dark:border-violet-900 dark:bg-violet-950/30 sm:p-6">
                <div className="flex items-center gap-2 text-sm font-black text-violet-900 dark:text-violet-100">
                  <Mic size={18} />
                  <span>Hãy nói câu trả lời của bạn</span>
                </div>
                <p className="mt-1.5 text-xs text-violet-700 dark:text-violet-300">
                  Thời lượng tối đa 90 giây. Bạn có thể nghe lại, ghi âm lại hoặc bỏ qua nếu chưa tiện nói.
                </p>

                {recording && (
                  <div className="mt-4 flex items-center gap-3 text-sm font-black text-rose-600">
                    <span className="size-3 animate-pulse rounded-full bg-rose-500" />
                    Đang ghi âm {Math.floor(recordingMs / 1000)}s / 90s
                  </div>
                )}

                {recordedUrl && !recording && (
                  <audio
                    className="mt-4 w-full"
                    controls
                    src={recordedUrl}
                    preload="metadata"
                    aria-label="Nghe lại bài nói"
                  />
                )}

                {speakingError && (
                  <p className="mt-3 text-sm font-bold text-rose-600" role="alert">
                    {speakingError}
                  </p>
                )}

                <div className="mt-5 flex flex-wrap gap-3">
                  {!recording && !recordedAudio && (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-extrabold text-white hover:bg-violet-700"
                    >
                      <Mic size={17} />
                      <span>Bắt đầu ghi âm</span>
                    </button>
                  )}
                  {recording && (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rose-600 px-5 text-sm font-extrabold text-white hover:bg-rose-700"
                    >
                      <Square size={16} />
                      <span>Dừng ghi âm</span>
                    </button>
                  )}
                  {recordedAudio && !recording && (
                    <>
                      <button
                        type="button"
                        onClick={discardRecording}
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-extrabold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        <RotateCcw size={16} />
                        <span>Ghi âm lại</span>
                      </button>
                      <button
                        type="button"
                        disabled={confirmSpeaking.isPending || recordingMs < 300}
                        onClick={() =>
                          confirmSpeaking.mutate({
                            questionId: current.id,
                            blob: recordedAudio,
                            durationMs: recordingMs,
                          })
                        }
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-extrabold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {confirmSpeaking.isPending ? (
                          <Loader2 className="animate-spin" size={16} />
                        ) : (
                          <CheckCircle2 size={16} />
                        )}
                        <span>Xác nhận & tiếp tục</span>
                      </button>
                    </>
                  )}
                  {!recording && (
                    <button
                      type="button"
                      onClick={() => void skipSpeaking(current.id)}
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-300 bg-white px-5 text-sm font-extrabold text-amber-800 hover:bg-amber-50 dark:border-amber-800 dark:bg-slate-800 dark:text-amber-200"
                    >
                      <SkipForward size={16} />
                      <span>Bỏ qua phần này</span>
                    </button>
                  )}
                </div>
              </div>
            ) : isOpenText ? (
              <textarea
                value={
                  typeof answers[current.id] === "string"
                    ? (answers[current.id] as string)
                    : ""
                }
                onChange={(event) =>
                  setAnswers((old) => ({
                    ...old,
                    [current.id]: event.target.value,
                  }))
                }
                className="mt-8 min-h-36 w-full rounded-2xl border-2 border-slate-200 bg-white p-4 text-base leading-6 text-slate-800 outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                placeholder="Nhập câu trả lời của bạn..."
                aria-label="Câu trả lời tự luận"
              />
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
                  (isListening && !current.audioUrl)
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
        description="Tiến độ các câu đã trả lời của bạn đã được ghi nhận. Bạn có thể quay lại tiếp tục bài đánh giá bất cứ lúc nào."
        confirmLabel="Rời đi"
        cancelLabel="Tiếp tục làm"
        onCancel={() => setShowExitConfirm(false)}
        onConfirm={() => {
          setShowExitConfirm(false);
          setStarted(false);
          setFocusMode(false);
        }}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REDESIGNED DIAGNOSTIC RESULT VIEW
// Explains 48 objective vs 52 total items, practice recommendations,
// deduplicated skills, no contradictory course cards, no retake button,
// filterable grouped answer review.
// ─────────────────────────────────────────────────────────────────────────────
function DiagnosticResultView({
  assessment,
  result,
}: {
  assessment: DiagnosticAssessment;
  result: DiagnosticResult;
}) {
  const [reviewFilter, setReviewFilter] = useState<string>("ALL");

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
      {/* 1. Header Card with Canonical Blueprint Explanation */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:p-9">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <CheckCircle2 size={15} />
            <span>Đã hoàn thành đánh giá đầu vào</span>
          </span>
          <span className="text-xs font-bold text-slate-400">
            Tổng cộng: 52 nhiệm vụ
          </span>
        </div>

        <h1 className="mt-4 text-3xl font-black text-slate-900 dark:text-slate-100 sm:text-4xl">
          Mức khởi điểm ước tính: {formatPlacementLevel(result.level)}
        </h1>

        {/* 48 VS 52 CLEAR EXPLANATION */}
        <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-4.5 dark:border-slate-800 dark:bg-slate-850">
          <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
            Phần trắc nghiệm khách quan:{" "}
            <span className="text-emerald-600 dark:text-emerald-400">
              {result.correctCount}/{result.totalCount} câu đúng
            </span>{" "}
            ({result.percentage}%)
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-5">
            Bài đánh giá gồm 52 nhiệm vụ, trong đó 48 câu trắc nghiệm được chấm điểm khách quan trực tiếp (16 Ngữ pháp &amp; Từ vựng, 16 Đọc hiểu, 16 Nghe hiểu) và 4 bài thực hành bổ trợ (2 bài Nói, 2 bài Viết) dùng để ghi nhận bằng chứng năng lực.
          </p>
        </div>

        {/* Productive Evidence note */}
        {result.productiveTaskCount ? (
          <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50/70 p-4 text-xs leading-5 text-violet-900 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-200">
            <span className="font-black">Bằng chứng kỹ năng Nói &amp; Viết:</span>
            <div className="mt-1.5 space-y-1">
              <p>
                <span className="font-bold">Nói: </span>
                {result.speakingEvidenceCount && result.speakingEvidenceCount > 0
                  ? `Đã ghi nhận ${result.speakingEvidenceCount}/2 nhiệm vụ${result.speakingScore !== null ? ` (điểm ước lượng: ${result.speakingScore}/100, độ tin cậy: ${result.speakingEvidenceConfidence === "FULL_DIAGNOSTIC_SAMPLE" ? "đầy đủ mẫu" : "một phần"})` : ""}.`
                  : "Chưa đủ dữ liệu để đưa ra nhận định; điểm xếp lớp hiện dựa trên 48 câu trắc nghiệm khách quan."}
              </p>
              <p>
                <span className="font-bold">Viết: </span>
                Đã ghi nhận 2 nhiệm vụ tự luận vào hồ sơ học tập để theo dõi tiến độ.
              </p>
            </div>
            {result.speakingResponses?.some((r) => r.status === "GRADING_FAILED") && (
              <span className="mt-1 block font-bold text-amber-700 dark:text-amber-300">
                Lưu ý: Hệ thống đã ghi nhận đầy đủ bản ghi âm của bạn để tham chiếu năng lực.
              </span>
            )}
          </div>
        ) : null}

        {/* Skill Profiles Breakdown */}
        {result.skillProfiles && result.skillProfiles.length > 0 && (
          <div className="mt-7">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Kết quả theo kỹ năng
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {result.skillProfiles.map((p) => (
                <div
                  key={p.skill}
                  className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-850"
                >
                  <p className="text-xs font-black text-slate-700 dark:text-slate-300">
                    {formatSkillName(p.skill)}
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-900 dark:text-slate-100">
                    {p.percentage !== null
                      ? `${p.percentage}% (${p.correctCount}/${p.totalCount})`
                      : "Chưa đủ dữ liệu"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strengths & Weaknesses */}
        <div className="mt-7 grid gap-4 border-t border-slate-100 pt-6 sm:grid-cols-2 dark:border-slate-800">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Điểm mạnh
            </h3>
            <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">
              {result.strengths && result.strengths.length > 0
                ? result.strengths.map(formatSkillName).join(", ")
                : "Chưa ghi nhận kỹ năng nổi trội từ kết quả hiện tại."}
            </p>
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Nên củng cố
            </h3>
            <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">
              {result.weaknesses && result.weaknesses.length > 0
                ? result.weaknesses.map(formatSkillName).join(", ")
                : "Chưa ghi nhận kỹ năng cần ưu tiên cải thiện."}
            </p>
          </div>
        </div>
      </section>

      {/* 2. Concrete Practice Recommendations (NO Course Cards) */}
      {practiceItems.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:p-9">
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-violet-600 dark:text-violet-400" />
            <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
              Bài luyện đề xuất
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
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
                  <h3 className="mt-2 text-sm font-black text-slate-900 group-hover:text-violet-600 dark:text-slate-100 dark:group-hover:text-violet-400">
                    {rec.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-5">
                    {rec.description}
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-extrabold text-violet-600 dark:text-violet-400">
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
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
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
            <p className="py-6 text-center text-xs font-bold text-slate-400">
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

              return (
                <div
                  key={item.questionId}
                  className={`rounded-2xl border p-4 text-xs transition-colors ${
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
                    <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 leading-4">
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
          <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
            Kết quả đã được lưu vĩnh viễn vào hồ sơ
          </h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Bạn có thể xem lại kết quả này bất kỳ lúc nào tại mục Tài khoản.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/hub?tab=diagnostic-result"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-200 px-4 text-xs font-extrabold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Award size={15} />
            <span>Xem trong Hồ sơ</span>
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-600 px-5 text-xs font-extrabold text-white hover:bg-violet-700"
          >
            <span>Về Bảng điều khiển</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}
