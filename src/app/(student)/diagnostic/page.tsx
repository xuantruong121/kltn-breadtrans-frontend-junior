"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
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
import {
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

const skillLabel: Record<string, string> = {
  Listening: "Listening",
  Reading: "Reading",
  Grammar: "Ngữ pháp",
  Vocabulary: "Từ vựng",
  Speaking: "Speaking",
  Writing: "Writing",
};

const diagnosticDisplayTitle = "Bài kiểm tra xác định năng lực cơ bản";
const diagnosticDisplayDescription =
  "Bài kiểm tra giúp xác định năng lực hiện tại qua Ngữ pháp và Từ vựng, Đọc hiểu, Nghe hiểu, cùng hai nhiệm vụ Nói và Viết. Thời gian thực hiện khoảng 35–50 phút.";
const diagnosticDisplayGuidance =
  "Hãy thực hiện nghiêm túc và trả lời đúng với năng lực hiện tại để kết quả phản ánh sát hơn mức độ của bạn. Kết quả chỉ mang tính tham khảo, không thay thế chứng chỉ CEFR hay bài thi TOEIC chính thức.";

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
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [submissionToken, setSubmissionToken] = useState(createSubmissionToken);
  const [hidePersistedResult, setHidePersistedResult] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingMs, setRecordingMs] = useState(0);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [speakingError, setSpeakingError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef(0);

  useEffect(() => {
    const inProgress = assessment?.inProgressAttempt;
    if (!inProgress) return;
    setAttemptId(inProgress.id);
    const persisted = { ...(inProgress.answers as Record<string, number | string>) };
    for (const response of inProgress.speakingResponses) persisted[String(response.questionId)] = response.status;
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
  }, [recordedUrl]);

  useEffect(() => {
    setFocusMode(started);
    return () => setFocusMode(false);
  }, [started, setFocusMode]);

  const submit = useMutation({
    mutationFn: () =>
      diagnosticService.submit(assessment!.id, answers, submissionToken, attemptId ?? undefined),
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

  const confirmSpeaking = useMutation({
    mutationFn: async ({ questionId, blob, durationMs }: { questionId: number; blob: Blob; durationMs: number }) => {
      if (!assessment || !attemptId) throw new Error("Phiên kiểm tra chưa sẵn sàng");
      return diagnosticService.confirmSpeaking(assessment.id, attemptId, questionId, blob, durationMs);
    },
    onSuccess: (response, variables) => {
      setAnswers((current) => ({ ...current, [variables.questionId]: response.status }));
      setRecordedAudio(null);
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(null);
      setSpeakingError(response.status === "GRADING_FAILED" ? "Đã ghi nhận bài nói nhưng chưa thể chấm tự động." : null);
      setStep((value) => Math.min(assessment!.questions.length - 1, value + 1));
    },
    onError: (error) => setSpeakingError(error instanceof Error ? error.message : "Không thể lưu bản ghi."),
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
    setAttemptId(null);
    setRecordedAudio(null);
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl(null);
    setSpeakingError(null);
    submit.reset();
  };

  const handleStart = async () => {
    setHidePersistedResult(true);
    if (!attemptId && assessment) {
      try {
        const startedAttempt = await diagnosticService.startAttempt(assessment.id);
        setAttemptId(startedAttempt.attemptId);
        setSubmissionToken(startedAttempt.submissionToken || submissionToken);
      } catch {
        toast.error("Không thể khởi tạo phiên kiểm tra. Vui lòng thử lại.");
        return;
      }
    }
    try {
      if (document.documentElement.requestFullscreen)
        await document.documentElement.requestFullscreen();
    } catch (error) {
      console.warn("Fullscreen request rejected or not supported:", error);
    }
    setStarted(true);
  };

  const startRecording = async () => {
    setSpeakingError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setSpeakingError("Trình duyệt này chưa hỗ trợ ghi âm. Bạn có thể bỏ qua phần nói.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = selectDiagnosticRecordingMimeType((type) => MediaRecorder.isTypeSupported(type));
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || "audio/webm" });
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
        if (recorderRef.current === recorder && recorder.state === "recording") stopRecording();
      }, DIAGNOSTIC_SPEAKING_MAX_DURATION_MS);
    } catch (error) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      setSpeakingError(error instanceof DOMException && error.name === "NotAllowedError" ? "Bạn đã từ chối quyền micro. Bạn có thể bỏ qua phần nói." : "Không thể truy cập micro. Bạn có thể bỏ qua phần nói.");
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
            {diagnosticDisplayTitle}
          </h1>
          <p className="mt-3 max-w-2xl leading-6 text-slate-600 dark:text-slate-300">
            {diagnosticDisplayDescription}
          </p>
          <p className="mt-4 max-w-3xl text-sm font-bold leading-6 text-violet-700 dark:text-violet-300">
            {diagnosticDisplayGuidance}
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
          title={diagnosticDisplayTitle}
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
                Phần:{" "}
                {current.section ?? skillLabel[current.skill] ?? current.skill}
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
            {current.section === "READING" && current.passageText && (
              <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                <p className="mb-2 text-xs font-black uppercase tracking-wider text-violet-600">
                  Đoạn đọc
                </p>
                {current.passageText}
              </div>
            )}
            {current.section === "LISTENING" && (
              <div className="mb-6 rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-900 dark:bg-violet-950/30">
                <p className="text-sm font-bold text-violet-900 dark:text-violet-100">
                  Nghe đoạn âm thanh rồi chọn đáp án.
                </p>
                {current.audioUrl ? (
                  <audio
                    className="mt-3 w-full"
                    controls
                    preload="metadata"
                    src={current.audioUrl}
                    aria-label="Âm thanh bài kiểm tra"
                  />
                ) : (
                  <p className="mt-2 text-sm font-bold text-rose-600">
                    Âm thanh chưa sẵn sàng. Vui lòng thử lại sau.
                  </p>
                )}
              </div>
            )}
            <h2 className="text-xl font-black leading-8 text-slate-900 dark:text-slate-100">
              {current.question}
            </h2>
            {current.questionType === "OPEN_TEXT" && current.section === "SPEAKING" ? (
              <div className="mt-7 rounded-2xl border border-violet-200 bg-violet-50 p-5 dark:border-violet-900 dark:bg-violet-950/30">
                <div className="flex items-center gap-2 text-sm font-bold text-violet-900 dark:text-violet-100">
                  <Mic size={18} /> Hãy nói câu trả lời của bạn
                </div>
                <p className="mt-2 text-xs text-violet-700 dark:text-violet-300">
                  Tối đa 90 giây. Bạn có thể nghe lại, ghi âm lại hoặc bỏ qua nếu chưa thể sử dụng micro.
                </p>
                {recording && (
                  <div className="mt-4 flex items-center gap-3 text-sm font-black text-rose-600">
                    <span className="size-3 animate-pulse rounded-full bg-rose-500" />
                    Đang ghi âm {Math.floor(recordingMs / 1000)}s / 90s
                  </div>
                )}
                {recordedUrl && !recording && (
                  <audio className="mt-4 w-full" controls src={recordedUrl} preload="metadata" aria-label="Nghe lại bản ghi Speaking" />
                )}
                {speakingError && <p className="mt-3 text-sm font-bold text-rose-600" role="alert">{speakingError}</p>}
                <div className="mt-5 flex flex-wrap gap-3">
                  {!recording && !recordedAudio && (
                    <button type="button" onClick={startRecording} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-extrabold text-white">
                      <Mic size={17} /> Bắt đầu ghi âm
                    </button>
                  )}
                  {recording && (
                    <button type="button" onClick={stopRecording} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rose-600 px-5 text-sm font-extrabold text-white">
                      <Square size={16} /> Dừng ghi âm
                    </button>
                  )}
                  {recordedAudio && !recording && (
                    <>
                      <button type="button" onClick={discardRecording} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 px-5 text-sm font-extrabold text-slate-700 dark:border-slate-700 dark:text-slate-200">
                        <RotateCcw size={16} /> Ghi âm lại
                      </button>
                      <button type="button" disabled={confirmSpeaking.isPending || recordingMs < 300} onClick={() => confirmSpeaking.mutate({ questionId: current.id, blob: recordedAudio, durationMs: recordingMs })} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-extrabold text-white disabled:opacity-50">
                        {confirmSpeaking.isPending ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />} Xác nhận & tiếp tục
                      </button>
                    </>
                  )}
                  {!recording && (
                    <button type="button" onClick={() => void skipSpeaking(current.id)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-300 px-5 text-sm font-extrabold text-amber-800 dark:text-amber-200">
                      <SkipForward size={16} /> Bỏ qua
                    </button>
                  )}
                </div>
              </div>
            ) : current.questionType === "OPEN_TEXT" ? (
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
                className="mt-7 min-h-36 w-full rounded-2xl border-2 border-slate-200 bg-white p-4 text-sm leading-6 text-slate-800 outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                placeholder="Viết câu trả lời ngắn của bạn..."
                aria-label="Câu trả lời tự luận"
              />
            ) : (
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
            )}
            <div className="mt-8 flex justify-between">
              {current.section !== "SPEAKING" && <button
                type="button"
                onClick={() => setStep((value) => Math.max(0, value - 1))}
                disabled={!step}
                className="min-h-11 px-4 text-sm font-bold text-slate-500 disabled:opacity-40"
              >
                Câu trước
              </button>}
              <button
                type="button"
                disabled={
                  answers[current.id] === undefined ||
                  (typeof answers[current.id] === "string" &&
                    !(answers[current.id] as string).trim()) ||
                  submit.isPending ||
                  (current.section === "LISTENING" && !current.audioUrl)
                }
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
          Bạn đúng {result.correctCount}/{result.totalCount} câu mục tiêu (
          {result.percentage}%). Đây là kết quả tham khảo để chọn điểm bắt đầu,
          không phải chứng nhận CEFR.
        </p>
        {result.productiveTaskCount ? (
          <div className="mt-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-100">
            <p className="font-black">Bằng chứng Speaking</p>
            <p className="mt-1">
              {result.speakingEvidenceCount
                ? `${result.speakingScore}/100 · ${result.speakingEvidenceCount}/2 nhiệm vụ · độ tin cậy ${result.speakingEvidenceConfidence === "FULL_DIAGNOSTIC_SAMPLE" ? "đầy đủ mẫu" : "một phần"}.`
                : "Chưa đủ dữ liệu Speaking; kết quả dựa trên 48 câu khách quan."}
            </p>
            {result.speakingResponses?.some((response) => response.status === "GRADING_FAILED") && (
              <p className="mt-1 font-bold text-amber-700 dark:text-amber-300">Đã ghi nhận bài nói nhưng chưa thể chấm tự động.</p>
            )}
          </div>
        ) : null}
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
                    Bạn chọn: {item.selectedText ?? selected ?? "Chưa trả lời"}{" "}
                    • Đáp án chuẩn:{" "}
                    {item.isCorrect === null
                      ? "Đánh giá sau"
                      : (standard ?? "Không khả dụng")}
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
