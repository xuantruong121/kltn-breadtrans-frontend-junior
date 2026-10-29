"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { useSocket } from "@/lib/providers/SocketProvider";
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  Gauge,
  HelpCircle,
  Loader2,
  Lock,
  Mic,
  RotateCcw,
  Square,
  Star,
  StickyNote,
  StopCircle,
  Target,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import {
  speakingService,
  SpeakingSubmissionDetail,
  SpeakingSubmissionSummary,
  WordAssessmentItem,
} from "@/lib/api/services/speaking.service";
import axiosClient from "@/lib/api/axiosClient";
import { isSafeCourseReturn } from "@/lib/course/navigation";
import {
  SpeakingAttemptPhase,
  generateSpeakingIdempotencyKey,
  encodeWAV,
  validateWavBinary,
  formatSpeakingTime,
  shouldHandleSpeakingShortcut,
  getNextExerciseId,
  getPreviousExerciseId,
} from "@/lib/speaking/speakingPracticeLogic";
import { getSpeakingFailureMessage } from "@/lib/speaking/speakingRecoveryLogic";
import {
  createWorkletFlushController,
  isAudioWorkletSupported,
  validateChunkSequence,
  mergeAudioChunks,
  type WorkletFlushController,
} from "@/lib/speaking/speakingAudioWorkletLogic";
import { WordDictionaryPopup } from "@/components/speaking/WordDictionaryPopup";
import { PronunciationReportCard } from "@/components/speaking/PronunciationReportCard";
import { PracticeLoadingScreen } from "@/components/practice/PracticeLoadingScreen";
import { PracticeExitConfirmDialog } from "@/components/practice/PracticeExitConfirmDialog";
import { PracticeHeader } from "@/components/practice/PracticeHeader";
import { PracticeShell } from "@/components/practice/PracticeShell";
import {
  findPreviousCompletedAttempt,
  resolveSpeakingMode,
  scoreDelta,
  formatSpeakingScore,
} from "@/lib/speaking/speakingExperienceLogic";
import { usePracticeExitGuard } from "@/hooks/usePracticeExitGuard";
import { ReportIssueButton } from "@/components/issue-report";
import { isPremiumSpeakingForbiddenError } from "@/modules/subscription/planLogic";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import { plansHrefFor } from "@/modules/subscription/practicePlan";
import { speakingSetDisplayTitle } from "@/lib/catalog/displayTitles";
import {
  IS_WORD_REGEX,
  normalizeWordForMatching,
  WORD_TOKEN_REGEX,
} from "@/lib/speaking/speakingWordMatching";

/**
 * Resamples raw audio data to exactly 16,000 Hz using native OfflineAudioContext.
 * Throws if resampling fails so caller can safely reject and never produce fake 16kHz headers.
 */
async function resampleTo16kHz(
  audioData: Float32Array,
  inputSampleRate: number,
): Promise<Float32Array> {
  if (inputSampleRate === 16000) return audioData;
  const targetLength = Math.round((audioData.length * 16000) / inputSampleRate);
  if (targetLength <= 0) {
    throw new Error("Target audio length is zero after resample calculation");
  }

  const OfflineCtx =
    window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
  if (!OfflineCtx) {
    throw new Error("OfflineAudioContext not supported by this browser");
  }

  const offlineCtx = new OfflineCtx(1, targetLength, 16000);
  const audioBuffer = offlineCtx.createBuffer(
    1,
    audioData.length,
    inputSampleRate,
  );
  audioBuffer.getChannelData(0).set(audioData);

  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start(0);

  const renderedBuffer = await offlineCtx.startRendering();
  return renderedBuffer.getChannelData(0);
}

const TTS_SPEED_OPTIONS = [
  {
    value: 0.5,
    label: "0.5x",
    title: "0.5x - Rất chậm: Nghe rõ từng từ & phát âm",
  },
  {
    value: 0.75,
    label: "0.75x",
    title: "0.75x - Chậm: Luyện nối âm & ngữ điệu câu",
  },
  {
    value: 1.0,
    label: "1.0x",
    title: "1.0x - Chuẩn: Tốc độ đàm thoại & chuẩn thi TOEIC",
  },
  {
    value: 1.25,
    label: "1.25x",
    title: "1.25x - Nhanh: Thử thách phản xạ nghe",
  },
  { value: 1.5, label: "1.5x", title: "1.5x - Rất nhanh: Tốc độ nâng cao" },
] as const;

export default function SpeakingExerciseDetailPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const exerciseId = Number(id);
  const practiceSetKey = searchParams.get("set");
  const requestedReturnTo = searchParams.get("returnTo");
  const parentAttemptId = searchParams.get("parentAttemptId");
  const parentComponentId = searchParams.get("parentComponentId");
  const examExerciseIds = (searchParams.get("examExerciseIds") ?? "")
    .split(",")
    .map(Number)
    .filter((value) => Number.isInteger(value) && value > 0);
  const examParentContext =
    parentAttemptId && parentComponentId
      ? {
          attemptId: Number(parentAttemptId),
          componentId: Number(parentComponentId),
        }
      : undefined;
  const parentAssessmentId = searchParams.get("parentAssessmentId");
  // In a TOEIC assessment, "back" means the exam's section list, not the
  // practice catalogue.
  const examReturn =
    parentAssessmentId && parentAttemptId
      ? `/toeic/assessments/${parentAssessmentId}/attempts/${parentAttemptId}`
      : null;
  const courseReturn =
    requestedReturnTo && isSafeCourseReturn(requestedReturnTo)
      ? requestedReturnTo
      : (examReturn ?? "/speaking");
  const queryClient = useQueryClient();

  // Explicit Attempt State Machine
  const [phase, setPhase] = useState<SpeakingAttemptPhase>("READY");
  const [micStatus, setMicStatus] = useState<
    "UNKNOWN" | "READY" | "DENIED" | "MISSING"
  >("UNKNOWN");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  // Per-task limit from the server timing contract (kept in a ref for the
  // recording timer callback).
  const maxRecordingSecondsRef = useRef(45);

  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [qualityWarning, setQualityWarning] = useState<string | null>(null);
  const [isProlongedProcessing, setIsProlongedProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // In-flight & Idempotency Guards
  const stopInFlightRef = useRef(false);
  const submissionInFlightRef = useRef(false);
  const uploadAbortControllerRef = useRef<AbortController | null>(null);
  const attemptIdempotencyKeyRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);
  const currentSubmissionIdRef = useRef<number | null>(null);
  const parentCompletionRef = useRef(false);
  const pollingStartTimeRef = useRef<number>(0);
  const scoreVisibilityStartRef = useRef<number | null>(null);
  const { socket } = useSocket();

  // Audio recording hardware nodes
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recordedSamplesRef = useRef<Float32Array[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const workletFlushControllerRef = useRef<WorkletFlushController | null>(null);
  const lastChunkSequenceRef = useRef<number | null>(null);
  const inputSampleRateRef = useRef<number>(44100);

  // TTS State
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [ttsRate, setTtsRate] = useState<number>(1.0);
  const [ttsAccent, setTtsAccent] = useState<"US" | "UK">("US");
  const referenceAudioRef = useRef<HTMLAudioElement | null>(null);

  // Dictionary Popup State
  const [selectedWordForLookup, setSelectedWordForLookup] = useState<
    string | null
  >(null);

  // Submission & Polling State
  const [currentSubmission, setCurrentSubmission] =
    useState<SpeakingSubmissionDetail | null>(null);
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  // A completed submission can arrive through WebSocket and polling (and can
  // be polled again while post-processing feedback is still pending). Keep
  // the user-facing completion toast idempotent per submission.
  const completionToastShownRef = useRef<Set<number>>(new Set());

  // Utilities State
  const [isBilingual, setIsBilingual] = useState(!examReturn);
  const [isSaved, setIsSaved] = useState(() => {
    if (typeof window === "undefined" || !exerciseId) return false;
    try {
      const stored = JSON.parse(
        localStorage.getItem(`breadtrans:speaking-utilities:${exerciseId}`) ??
          "{}",
      );
      return Boolean(stored.isSaved);
    } catch {
      return false;
    }
  });
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showTipsDrawer, setShowTipsDrawer] = useState(false);
  const [notes, setNotes] = useState(() => {
    if (typeof window === "undefined" || !exerciseId) return "";
    try {
      const stored = JSON.parse(
        localStorage.getItem(`breadtrans:speaking-utilities:${exerciseId}`) ??
          "{}",
      );
      return typeof stored.notes === "string" ? stored.notes : "";
    } catch {
      return "";
    }
  });
  const [soundMuted, setSoundMuted] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loadedUtilityId, setLoadedUtilityId] = useState<number | null>(null);

  const shortcutsRef = useRef<HTMLDivElement | null>(null);

  const showToast = (message: string, duration = 3000) => {
    setToastMessage(message);
    window.setTimeout(() => {
      if (isMountedRef.current) setToastMessage(null);
    }, duration);
  };

  // Persistent notes & saved exercise state
  useEffect(() => {
    if (!exerciseId || typeof window === "undefined") return;
    let active = true;

    queueMicrotask(() => {
      if (!active) return;
      try {
        const stored = JSON.parse(
          localStorage.getItem(`breadtrans:speaking-utilities:${exerciseId}`) ??
            "{}",
        );
        setNotes(typeof stored.notes === "string" ? stored.notes : "");
        setIsSaved(Boolean(stored.isSaved));
      } catch {
        setNotes("");
        setIsSaved(false);
      }
      setLoadedUtilityId(exerciseId);
    });

    return () => {
      active = false;
    };
  }, [exerciseId]);

  useEffect(() => {
    if (!exerciseId || loadedUtilityId !== exerciseId) return;

    localStorage.setItem(
      `breadtrans:speaking-utilities:${exerciseId}`,
      JSON.stringify({ notes, isSaved }),
    );
  }, [exerciseId, isSaved, loadedUtilityId, notes]);

  // Dismiss popovers on outside click
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (
        shortcutsRef.current &&
        !shortcutsRef.current.contains(e.target as Node)
      ) {
        setShowShortcuts(false);
      }
    };
    document.addEventListener("mousedown", handleDocumentClick);
    return () => document.removeEventListener("mousedown", handleDocumentClick);
  }, []);

  const {
    data: exercise,
    isLoading,
    error: exerciseError,
  } = useQuery({
    queryKey: ["speaking-exercise", exerciseId],
    queryFn: () => speakingService.getExerciseById(exerciseId, examParentContext),
    enabled: !!exerciseId,
  });

  const responseSeconds = exercise?.timing?.responseSeconds ?? 45;
  useEffect(() => {
    maxRecordingSecondsRef.current = responseSeconds;
  }, [responseSeconds]);
  // TOEIC exam tasks run on the exam clock: reading and preparation time,
  // then the recording starts by itself.
  const isExamTask = examExerciseIds.length > 0 || Boolean(parentAttemptId);
  const prepTotalSeconds = isExamTask
    ? (exercise?.timing?.readingSeconds ?? 0) + (exercise?.timing?.prepSeconds ?? 0)
    : 0;
  const [prepRemaining, setPrepRemaining] = useState<number | null>(null);
  const [promptPlaying, setPromptPlaying] = useState(false);

  // UK plays the British twin when the exercise has one, otherwise the US clip.
  const referenceAudioUrl =
    (ttsAccent === "UK" ? exercise?.audioUrlUk : null) ?? exercise?.audioUrl ?? null;

  const { data: allExercises } = useQuery({
    queryKey: ["speaking-exercises"],
    queryFn: () => speakingService.getExercises(),
    staleTime: 60_000,
  });

  const { data: mySubmissions } = useQuery<SpeakingSubmissionSummary[]>({
    queryKey: ["speaking-submissions-summary"],
    queryFn: speakingService.getMySubmissions,
    staleTime: 30_000,
  });

  const practiceSetExercises = useMemo(() => {
    if (!allExercises || !practiceSetKey) return [];
    return allExercises
      .filter((item) => item.practiceSet?.key === practiceSetKey)
      .sort(
        (a, b) =>
          (a.order ?? a.practiceSet?.position ?? Number.MAX_SAFE_INTEGER) -
            (b.order ?? b.practiceSet?.position ?? Number.MAX_SAFE_INTEGER) ||
          a.id - b.id,
      );
  }, [allExercises, practiceSetKey]);

  const orderedExercises = useMemo(
    () =>
      practiceSetKey && practiceSetExercises.length > 0
        ? practiceSetExercises
        : (allExercises ?? []),
    [allExercises, practiceSetExercises, practiceSetKey],
  );

  const activeCatalogExercise = useMemo(
    () => allExercises?.find((item) => item.id === exerciseId),
    [allExercises, exerciseId],
  );
  const activePracticeSet = activeCatalogExercise?.practiceSet;
  const speakingMode = useMemo(
    () =>
      resolveSpeakingMode(
        exercise ?? activeCatalogExercise ?? { title: "", category: "GENERAL" },
      ),
    [exercise, activeCatalogExercise],
  );
  const currentPracticeSetPosition = activePracticeSet
    ? (exercise?.order ??
      practiceSetExercises.findIndex((item) => item.id === exerciseId) + 1)
    : 0;

  // Same order as "Câu tiếp theo": the exam's task list, the practice set, or the catalog.
  // Same order as "Câu tiếp theo": the exam's task list, the practice set, or the catalog.
  const examExerciseIdsParam = searchParams.get("examExerciseIds") ?? "";
  const previousExerciseId = useMemo(() => {
    const examIds = examExerciseIdsParam
      .split(",")
      .map(Number)
      .filter((value) => Number.isInteger(value) && value > 0);
    return examIds.length
      ? getPreviousExerciseId(exerciseId, examIds.map((id) => ({ id })))
      : getPreviousExerciseId(exerciseId, orderedExercises);
  }, [examExerciseIdsParam, exerciseId, orderedExercises]);

  const isNextAvailable = useMemo(() => {
    if (!orderedExercises.length || !exerciseId) return false;
    return Boolean(getNextExerciseId(exerciseId, orderedExercises));
  }, [orderedExercises, exerciseId]);

  const [minLaunchReady, setMinLaunchReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMinLaunchReady(true), 350);
    return () => clearTimeout(timer);
  }, []);

  const isCompleted = phase === "COMPLETED";
  const previousAttempt = useMemo(
    () =>
      findPreviousCompletedAttempt(
        mySubmissions,
        exerciseId,
        currentSubmission?.id,
      ),
    [mySubmissions, exerciseId, currentSubmission?.id],
  );
  const shouldConfirmExit = !isCompleted;
  const isStage1 = phase === "READY" || phase === "RECORDING";
  const isAnalyzing =
    phase === "ENCODING" ||
    phase === "VALIDATING_AUDIO" ||
    phase === "REQUESTING_UPLOAD" ||
    phase === "UPLOADING" ||
    phase === "FINALIZING" ||
    phase === "SUBMITTING" ||
    phase === "POLLING";

  /**
   * Immediately stops all microphone tracks, disconnects nodes,
   * closes audio context, and turns off the browser's red recording indicator.
   */
  const releaseMediaStream = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (workletNodeRef.current) {
      try {
        workletNodeRef.current.onprocessorerror = null;
        workletNodeRef.current.port.onmessage = null;
        workletNodeRef.current.disconnect();
      } catch {}
      workletNodeRef.current = null;
    }
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      } catch {}
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close().catch(() => {});
      } catch {}
      audioContextRef.current = null;
    }
    workletFlushControllerRef.current?.cancel();
    workletFlushControllerRef.current = null;
    lastChunkSequenceRef.current = null;
  }, []);

  const { confirmExit, exitDialogProps } = usePracticeExitGuard({
    shouldConfirmExit,
    defaultFallbackUrl: "/speaking",
    enabled: !!exerciseId,
    onConfirmExit: () => {
      releaseMediaStream();
    },
  });

  // Track mounted state and cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (pollingTimerRef.current) clearTimeout(pollingTimerRef.current);
      releaseMediaStream();
      referenceAudioRef.current?.pause();
      referenceAudioRef.current = null;
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [audioUrl, releaseMediaStream]);

  /**
   * Live Audio Visualizer using AnalyserNode with speaker isolation.
   * Renders real-time frequency data into canvas while recording.
   */
  const startWaveformVisualizer = useCallback(() => {
    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    if (!analyser || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const draw = () => {
      if (!isMountedRef.current || phase !== "RECORDING") return;

      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      if (prefersReducedMotion) {
        ctx.fillStyle = "#f59e0b";
        ctx.fillRect(0, height / 2 - 2, width, 4);
        return;
      }

      const barCount = 28;
      const barWidth = (width / barCount) * 0.65;
      const gap = (width / barCount) * 0.35;

      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * bufferLength * 0.6);
        const value = dataArray[dataIndex] || 0;
        const percent = value / 255;
        const barHeight = Math.max(4, percent * (height * 0.85));

        const x = i * (barWidth + gap) + gap / 2;
        const y = (height - barHeight) / 2;

        // Gradient from amber-500 to rose-500 for lively visual feedback
        const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
        grad.addColorStop(0, "#f59e0b");
        grad.addColorStop(1, "#f43f5e");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 3);
        ctx.fill();
      }
    };

    draw();
  }, [phase]);

  /**
   * Starts microphone recording with hardware constraints,
   * ZERO speaker loopback, and mono audio capture.
   */
  const startRecording = useCallback(async () => {
    if (phase !== "READY") return;

    if (!isAudioWorkletSupported()) {
      toast.error(
        "Trình duyệt hiện tại chưa hỗ trợ chế độ ghi âm ổn định. Vui lòng dùng Chrome, Edge, Firefox hoặc Safari phiên bản mới.",
        { duration: 5000 },
      );
      return;
    }

    try {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioBlob(null);
      setAudioUrl(null);
      setQualityWarning(null);
      setRecordingSeconds(0);
      recordedSamplesRef.current = [];
      lastChunkSequenceRef.current = null;
      stopInFlightRef.current = false;
      submissionInFlightRef.current = false;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      setMicStatus("READY");
      mediaStreamRef.current = stream;

      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      inputSampleRateRef.current = audioCtx.sampleRate || 44100;

      await audioCtx.audioWorklet.addModule(
        "/worklets/breadtrans-recorder-processor.js",
      );

      const source = audioCtx.createMediaStreamSource(stream);

      // AnalyserNode for visualizer only (NOT connected to destination)
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;
      source.connect(analyser);

      // AudioWorkletNode for off-main-thread PCM chunk extraction
      const workletNode = new AudioWorkletNode(
        audioCtx,
        "breadtrans-recorder-processor",
      );
      workletNodeRef.current = workletNode;
      const flushController = createWorkletFlushController(workletNode);
      workletFlushControllerRef.current = flushController;

      workletNode.onprocessorerror = () => {
        if (
          !isMountedRef.current ||
          workletNodeRef.current !== workletNode ||
          stopInFlightRef.current
        ) {
          return;
        }

        setQualityWarning(
          "Bộ ghi âm gặp lỗi ngoài dự kiến. Bản ghi chưa được gửi; vui lòng thu lại.",
        );
        stopInFlightRef.current = true;
        submissionInFlightRef.current = false;
        releaseMediaStream();
        stopInFlightRef.current = false;
        setPhase("INVALID_AUDIO");
      };

      workletNode.port.onmessage = (e: MessageEvent) => {
        const data = e.data;
        if (!data) return;

        if (data.type === "audio") {
          const chunk = new Float32Array(data.samples);
          recordedSamplesRef.current.push(chunk);

          const seqResult = validateChunkSequence(
            lastChunkSequenceRef.current,
            data.sequence,
          );
          if (!seqResult.valid) {
            console.warn(
              `[AudioWorklet] Sequence discontinuity detected: expected ${seqResult.expected}, got ${data.sequence} (gap: ${seqResult.gap})`,
            );
          }
          lastChunkSequenceRef.current = data.sequence;
        } else if (data.type === "flushed") {
          flushController.onFlushedMessage();
        }
      };

      // Connect to a Zero-Gain node to strictly avoid microphone audio loopback into speakers!
      const zeroGain = audioCtx.createGain();
      zeroGain.gain.value = 0.0;

      source.connect(workletNode);
      workletNode.connect(zeroGain);
      zeroGain.connect(audioCtx.destination);

      setPhase("RECORDING");
    } catch (err) {
      console.error("Error accessing microphone or loading AudioWorklet:", err);
      releaseMediaStream();
      recordedSamplesRef.current = [];
      stopInFlightRef.current = false;
      toast.error(
        err instanceof DOMException && err.name === "NotFoundError"
          ? "Không tìm thấy micro. Hãy kết nối micro rồi thử lại."
          : "Chưa cấp quyền micro hoặc không thể khởi tạo bộ ghi âm. Hãy kiểm tra quyền micro trong trình duyệt.",
      );
      setMicStatus(
        err instanceof DOMException && err.name === "NotFoundError"
          ? "MISSING"
          : "DENIED",
      );
      setPhase("READY");
    }
  }, [audioUrl, phase, releaseMediaStream]);

  // WebSocket Completion / Failure Listener for real-time reactive feedback
  useEffect(() => {
    if (!socket) return;

    const handleCompleted = async (payload: {
      submissionId: number;
      traceId?: string;
    }) => {
      if (
        currentSubmissionIdRef.current &&
        payload.submissionId === currentSubmissionIdRef.current
      ) {
        if (pollingTimerRef.current) {
          clearTimeout(pollingTimerRef.current);
          pollingTimerRef.current = null;
        }

        try {
          const sub = await speakingService.getSubmission(payload.submissionId);
          if (!isMountedRef.current) return;

          setCurrentSubmission(sub);

          if (sub.status === "COMPLETED") {
            if (scoreVisibilityStartRef.current !== null) {
              console.info("[LATENCY_INSTRUMENTATION]", {
                tag: "speaking_latency_metrics",
                submissionId: payload.submissionId,
                scoreVisibleMs: Date.now() - scoreVisibilityStartRef.current,
              });
              scoreVisibilityStartRef.current = null;
            }
            setPhase("COMPLETED");
            setIsProlongedProcessing(false);
            submissionInFlightRef.current = false;
            stopInFlightRef.current = false;
            if (typeof window !== "undefined") {
              try {
                sessionStorage.removeItem(
                  `breadtrans:speaking:pending:${exerciseId}`,
                );
              } catch {}
            }
            if (!completionToastShownRef.current.has(payload.submissionId)) {
              completionToastShownRef.current.add(payload.submissionId);
              toast.success("Đã hoàn thành đánh giá phát âm!", {
                id: `speaking-completed-${payload.submissionId}`,
              });

              const currentUserId = useAuthStore.getState().user?.id;
              queryClient.invalidateQueries({
                queryKey: ["dashboard-today", currentUserId],
              });
              queryClient.invalidateQueries({
                queryKey: ["user-stats", currentUserId],
              });
              queryClient.invalidateQueries({
                queryKey: ["user-skills-summary", currentUserId],
              });
              queryClient.invalidateQueries({ queryKey: ["myPet"] });
            }
          } else if (sub.status === "FAILED") {
            setPhase("FAILED");
            setIsProlongedProcessing(false);
            submissionInFlightRef.current = false;
            stopInFlightRef.current = false;
            if (typeof window !== "undefined") {
              try {
                sessionStorage.removeItem(
                  `breadtrans:speaking:pending:${exerciseId}`,
                );
              } catch {}
            }
            toast.error(getSpeakingFailureMessage(sub.lastErrorCode));
          }
        } catch (fetchErr) {
          console.error("Failed to fetch completed submission:", fetchErr);
        }
      }
    };

    const handleFailed = (payload: { submissionId: number }) => {
      if (
        currentSubmissionIdRef.current &&
        payload.submissionId === currentSubmissionIdRef.current
      ) {
        if (pollingTimerRef.current) {
          clearTimeout(pollingTimerRef.current);
          pollingTimerRef.current = null;
        }

        setPhase("FAILED");
        setIsProlongedProcessing(false);
        submissionInFlightRef.current = false;
        stopInFlightRef.current = false;
        if (typeof window !== "undefined") {
          try {
            sessionStorage.removeItem(
              `breadtrans:speaking:pending:${exerciseId}`,
            );
          } catch {}
        }
        toast.error("Đánh giá phát âm chưa thành công. Bạn vui lòng thử lại.");
      }
    };

    // The score arrives first; the written feedback is enriched afterwards and
    // ends COMPLETED or FAILED. Both refetch, so the pending notice never stays
    // after enrichment has ended (polling is cancelled once the score arrives).
    const handleFeedbackCompleted = async (payload: {
      submissionId: number;
    }) => {
      if (
        currentSubmissionIdRef.current &&
        payload.submissionId === currentSubmissionIdRef.current
      ) {
        try {
          const sub = await speakingService.getSubmission(payload.submissionId);
          if (isMountedRef.current) setCurrentSubmission(sub);
        } catch (fetchErr) {
          console.error("Failed to fetch completed feedback:", fetchErr);
        }
      }
    };

    socket.on("speaking.completed", handleCompleted);
    socket.on("speaking.failed", handleFailed);
    socket.on("speaking.feedback.completed", handleFeedbackCompleted);
    socket.on("speaking.feedback.failed", handleFeedbackCompleted);

    return () => {
      socket.off("speaking.completed", handleCompleted);
      socket.off("speaking.failed", handleFailed);
      socket.off("speaking.feedback.completed", handleFeedbackCompleted);
      socket.off("speaking.feedback.failed", handleFeedbackCompleted);
    };
  }, [socket, queryClient, exerciseId]);

  /**
   * Adaptive HTTP polling fallback:
   * - 2s initial intervals (attempts 1-5)
   * - 3s medium intervals (attempts 6-15)
   * - 4.5s backoff intervals (> 15 attempts)
   * - Does NOT mark FAILED merely because 60s elapsed.
   * - Shows respectful status: "Bài nói vẫn đang được xử lý..." when prolonged.
   */
  const pollSubmissionStatus = useCallback(
    (submissionId: number, attempt: number) => {
      if (!isMountedRef.current) return;
      if (attempt === 0) scoreVisibilityStartRef.current = Date.now();

      // When waiting beyond 30 seconds, activate prolonged processing notice
      if (Date.now() - pollingStartTimeRef.current > 30000) {
        setIsProlongedProcessing(true);
      }

      // Conservative guard against infinite orphan polling (> 120 attempts / ~7-8 mins)
      if (attempt > 120) {
        submissionInFlightRef.current = false;
        stopInFlightRef.current = false;
        toast(
          "Thời gian chấm điểm kéo dài hơn dự kiến. Kết quả sẽ được lưu vào lịch sử bài làm.",
          { icon: "ℹ️" },
        );
        return;
      }

      const intervalMs =
        attempt === 0 ? 0 : attempt <= 5 ? 1000 : attempt <= 15 ? 2000 : 5000;

      pollingTimerRef.current = setTimeout(async () => {
        if (!isMountedRef.current) return;

        try {
          const sub = await speakingService.getSubmission(submissionId);
          if (!isMountedRef.current) return;

          setCurrentSubmission(sub);

          if (sub.status === "COMPLETED") {
            if (scoreVisibilityStartRef.current !== null) {
              console.info("[LATENCY_INSTRUMENTATION]", {
                tag: "speaking_latency_metrics",
                submissionId,
                scoreVisibleMs: Date.now() - scoreVisibilityStartRef.current,
              });
              scoreVisibilityStartRef.current = null;
            }
            setPhase("COMPLETED");
            setIsProlongedProcessing(false);
            submissionInFlightRef.current = false;
            stopInFlightRef.current = false;
            if (typeof window !== "undefined") {
              try {
                sessionStorage.removeItem(
                  `breadtrans:speaking:pending:${exerciseId}`,
                );
              } catch {}
            }
            if (!completionToastShownRef.current.has(submissionId)) {
              completionToastShownRef.current.add(submissionId);
              toast.success("Đã hoàn thành đánh giá phát âm!", {
                id: `speaking-completed-${submissionId}`,
              });

              // Authoritative cache invalidation on completed
              const currentUserId = useAuthStore.getState().user?.id;
              queryClient.invalidateQueries({
                queryKey: ["dashboard-today", currentUserId],
              });
              queryClient.invalidateQueries({
                queryKey: ["user-stats", currentUserId],
              });
              queryClient.invalidateQueries({
                queryKey: ["user-skills-summary", currentUserId],
              });
              queryClient.invalidateQueries({ queryKey: ["myPet"] });
            }
            if (
              parentAttemptId &&
              parentComponentId &&
              practiceSetKey &&
              !parentCompletionRef.current
            ) {
              parentCompletionRef.current = true;
              void speakingService
                .getExercises()
                .then((exercises) => {
                  const sessionExercises = examExerciseIds.length
                    ? examExerciseIds.map((id) => ({ id }))
                    : exercises
                    .filter((item) => item.practiceSet?.key === practiceSetKey)
                    .sort(
                      (a: { id: number; order?: number | null; practiceSet?: { position?: number } }, b: { id: number; order?: number | null; practiceSet?: { position?: number } }) =>
                        (a.order ?? a.practiceSet?.position ?? Number.MAX_SAFE_INTEGER) -
                          (b.order ?? b.practiceSet?.position ?? Number.MAX_SAFE_INTEGER) ||
                        a.id - b.id,
                    );
                  if (getNextExerciseId(exerciseId, sessionExercises)) {
                    parentCompletionRef.current = false;
                    return;
                  }
                  return axiosClient.post(
                    `/toeic/assessments/attempts/${parentAttemptId}/components/${parentComponentId}/complete`,
                    {},
                  );
                })
                .catch(() => {
                  parentCompletionRef.current = false;
                });
            }
            if (
              sub.feedbackStatus === "PENDING" ||
              sub.feedbackStatus === "PROCESSING"
            ) {
              pollSubmissionStatus(submissionId, attempt + 1);
            }
          } else if (sub.status === "FAILED") {
            setPhase("FAILED");
            setIsProlongedProcessing(false);
            submissionInFlightRef.current = false;
            stopInFlightRef.current = false;
            if (typeof window !== "undefined") {
              try {
                sessionStorage.removeItem(
                  `breadtrans:speaking:pending:${exerciseId}`,
                );
              } catch {}
            }
            toast.error(getSpeakingFailureMessage(sub.lastErrorCode));
          } else {
            pollSubmissionStatus(submissionId, attempt + 1);
          }
        } catch (err: any) {
          console.error("Polling error:", err);
          if (isMountedRef.current) {
            pollSubmissionStatus(submissionId, attempt + 1);
          }
        }
      }, intervalMs);
    },
    [
      queryClient,
      exerciseId,
      parentAttemptId,
      parentComponentId,
      practiceSetKey,
    ],
  );

  /**
   * 3-Tier Durable Recovery:
   * Tier 1: URL param `?submissionId=...`
   * Tier 2: sessionStorage `breadtrans:speaking:pending:${exerciseId}`
   * Tier 3: Query server for latest active pending submission
   */
  useEffect(() => {
    if (!exerciseId) return;

    let active = true;
    const recoverPendingSubmission = async () => {
      let pendingId: number | null = null;

      // Tier 1: URL search param
      const urlSubId = searchParams.get("submissionId");
      if (urlSubId && !isNaN(Number(urlSubId))) {
        pendingId = Number(urlSubId);
      }

      // Tier 2: sessionStorage persistence
      if (!pendingId && typeof window !== "undefined") {
        try {
          const stored = sessionStorage.getItem(
            `breadtrans:speaking:pending:${exerciseId}`,
          );
          if (stored) {
            const parsed = JSON.parse(stored);
            if (
              parsed.submissionId &&
              Date.now() - parsed.submittedAt < 30 * 60 * 1000
            ) {
              pendingId = Number(parsed.submissionId);
            }
          }
        } catch {}
      }

      // Tier 3: Server query
      if (!pendingId) {
        try {
          const mySubs = await speakingService.getMySubmissions();
          const activeSub = mySubs.find(
            (s) =>
              s.exerciseId === exerciseId &&
              (s.status === "PENDING" || s.status === "PROCESSING"),
          );
          if (activeSub) {
            pendingId = activeSub.id;
          }
        } catch {}
      }

      if (!pendingId || !active) return;

      try {
        const sub = await speakingService.getSubmission(pendingId);
        if (!active || !isMountedRef.current) return;

        if (sub.status === "COMPLETED") {
          setCurrentSubmission(sub);
          setPhase("COMPLETED");
          if (typeof window !== "undefined") {
            sessionStorage.removeItem(
              `breadtrans:speaking:pending:${exerciseId}`,
            );
          }
        } else if (sub.status === "FAILED") {
          setCurrentSubmission(sub);
          setPhase("FAILED");
          if (typeof window !== "undefined") {
            sessionStorage.removeItem(
              `breadtrans:speaking:pending:${exerciseId}`,
            );
          }
        } else {
          currentSubmissionIdRef.current = pendingId;
          pollingStartTimeRef.current = new Date(sub.submittedAt).getTime();
          setPhase("POLLING");
          pollSubmissionStatus(pendingId, 0);
        }
      } catch (err) {
        console.warn("Could not recover pending submission:", err);
      }
    };

    recoverPendingSubmission();

    return () => {
      active = false;
    };
  }, [exerciseId, searchParams, pollSubmissionStatus]);

  /**
   * Submits recorded Blob directly without waiting on async React state.
   * Phase 2: Direct-to-Cloudflare-R2 presigned upload with server-side finalization,
   * with automatic fallback to legacy proxy mode if configured.
   */
  const submitRecordedBlob = useCallback(
    async (blob: Blob, key: string) => {
      if (submissionInFlightRef.current) return;
      submissionInFlightRef.current = true;

      setCurrentSubmission(null);
      setIsProlongedProcessing(false);
      setUploadProgress(0);

      const traceId = `trace-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // Upload through the API: the server stores the audio itself, so the
      // browser needs no CORS access to the storage bucket.
      const submitThroughApi = async () => {
        setPhase("SUBMITTING");
        const response = await speakingService.submitAudio(
          exerciseId,
          blob,
          key,
          traceId,
          examParentContext,
        );

        currentSubmissionIdRef.current = response.submissionId;
        if (typeof window !== "undefined") {
          try {
            sessionStorage.setItem(
              `breadtrans:speaking:pending:${exerciseId}`,
              JSON.stringify({
                submissionId: response.submissionId,
                submittedAt: Date.now(),
              }),
            );
          } catch {}
        }

        pollingStartTimeRef.current = Date.now();
        setPhase("POLLING");
        pollSubmissionStatus(response.submissionId, 0);
      };

      try {
        const capabilities = await speakingService.getCapabilities();

        if (capabilities.uploadMode === "presigned") {
          // ── Step A: Request Secure Upload Intent ───────────────────────────
          setPhase("REQUESTING_UPLOAD");
          const durationMs = Math.max(
            300,
            Math.min(
              maxRecordingSecondsRef.current * 1000 + 1500,
              Math.round(((blob.size - 44) / 32000) * 1000),
            ),
          );

          const intent = await speakingService.createUploadIntent(
            exerciseId,
            {
              contentType: "audio/wav",
              sizeBytes: blob.size,
              durationMs,
              idempotencyKey: key,
            },
            traceId,
            examParentContext,
          );

          if (intent.isAlreadyFinalized && intent.submissionId) {
            currentSubmissionIdRef.current = intent.submissionId;
            if (typeof window !== "undefined") {
              try {
                sessionStorage.setItem(
                  `breadtrans:speaking:pending:${exerciseId}`,
                  JSON.stringify({
                    submissionId: intent.submissionId,
                    submittedAt: Date.now(),
                  }),
                );
              } catch {}
            }
            pollingStartTimeRef.current = Date.now();
            setPhase("POLLING");
            pollSubmissionStatus(intent.submissionId, 0);
            return;
          }

          // ── Step B: Direct Browser PUT to Cloudflare R2 ────────────────────
          setPhase("UPLOADING");
          setUploadProgress(0);
          const abortController = new AbortController();
          uploadAbortControllerRef.current = abortController;

          try {
            await speakingService.uploadAudioDirectToR2(
              intent.uploadUrl,
              blob,
              intent.signedHeaders,
              (pct) => setUploadProgress(pct),
              abortController.signal,
            );
          } catch (uploadErr: any) {
            if (abortController.signal.aborted) throw uploadErr;
            // A bucket without a CORS rule for this origin refuses the
            // browser PUT. The unused intent simply expires.
            console.warn("Direct storage upload failed, sending through the API:", uploadErr);
            await submitThroughApi();
            return;
          }

          // ── Step C: Authoritative Backend Finalization ─────────────────────
          setPhase("FINALIZING");
          const response = await speakingService.finalizeUpload(
            intent.uploadIntentId,
            traceId,
          );

          currentSubmissionIdRef.current = response.submissionId;
          if (typeof window !== "undefined") {
            try {
              sessionStorage.setItem(
                `breadtrans:speaking:pending:${exerciseId}`,
                JSON.stringify({
                  submissionId: response.submissionId,
                  submittedAt: Date.now(),
                }),
              );
            } catch {}
          }

          pollingStartTimeRef.current = Date.now();
          setPhase("POLLING");
          pollSubmissionStatus(response.submissionId, 0);
        } else {
          // ── Legacy Proxy Fallback ──────────────────────────────────────────
          await submitThroughApi();
        }
      } catch (err: any) {
        if (err?.message?.includes("aborted")) {
          setPhase("READY");
          toast("Đã hủy quá trình tải lên âm thanh.");
          return;
        }

        console.error("Submission error:", err);
        setPhase("FAILED");
        setIsProlongedProcessing(false);
        const msg =
          getApiErrorMessage(err, "Có lỗi xảy ra khi gửi bài phát âm. Bạn có thể thử lại với bản ghi này.");
        toast.error(msg);
      } finally {
        submissionInFlightRef.current = false;
        stopInFlightRef.current = false;
        uploadAbortControllerRef.current = null;
      }
    },
    [exerciseId, pollSubmissionStatus],
  );

  /**
   * Stops and validates the local recording, then submits it for grading
   * right away. An invalid recording is refused locally and costs no quota;
   * the learner re-records from the result or the error state.
   */
  const prepareRecording = useCallback(async () => {
    if (stopInFlightRef.current) return;
    stopInFlightRef.current = true;

    // Stop timer immediately
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    setPhase("ENCODING");

    // Graceful flush: reject incomplete recordings instead of silently submitting truncated audio.
    const flushController = workletFlushControllerRef.current;
    const flushed = await (flushController?.flush() ?? Promise.resolve(false));
    if (!flushed) {
      setQualityWarning(
        "Không thể hoàn tất dữ liệu ghi âm. Vui lòng thu lại để đảm bảo bản ghi đầy đủ.",
      );
      releaseMediaStream();
      stopInFlightRef.current = false;
      setPhase("INVALID_AUDIO");
      return;
    }

    const inputSampleRate = inputSampleRateRef.current || 44100;

    // Disconnect and stop media hardware immediately so mic indicator turns OFF
    releaseMediaStream();

    const merged = mergeAudioChunks(recordedSamplesRef.current);

    if (merged.length === 0) {
      setQualityWarning("Bản ghi âm rỗng. Vui lòng nói to rõ và thu lại.");
      setPhase("INVALID_AUDIO");
      stopInFlightRef.current = false;
      return;
    }

    // 1. Resample strictly to 16,000 Hz.
    // If resampling fails, NEVER fallback to encoding raw samples with fake 16kHz header!
    let resampled: Float32Array;
    try {
      resampled = await resampleTo16kHz(merged, inputSampleRate);
    } catch (resampleErr) {
      console.error("OfflineAudioContext resampling failed:", resampleErr);
      setQualityWarning(
        "Không thể chuẩn hóa tần số âm thanh 16kHz. Vui lòng thử lại.",
      );
      setPhase("INVALID_AUDIO");
      stopInFlightRef.current = false;
      return;
    }

    // 2. Encode into strict 16-bit Mono PCM WAV
    const wavBlob = encodeWAV(resampled, 16000);

    // 3. Pre-upload WAV validation
    setPhase("VALIDATING_AUDIO");
    const arrayBuffer = await wavBlob.arrayBuffer();
    const validation = validateWavBinary(
      arrayBuffer,
      maxRecordingSecondsRef.current * 1000 + 1500,
    );

    if (!validation.ok) {
      setQualityWarning(validation.message);
      setPhase("INVALID_AUDIO");
      stopInFlightRef.current = false;
      return;
    }

    // Store local audio URL for learner review
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    const newLocalUrl = URL.createObjectURL(wavBlob);
    setAudioBlob(wavBlob);
    setAudioUrl(newLocalUrl);

    const idempotencyKey = generateSpeakingIdempotencyKey(exerciseId);
    attemptIdempotencyKeyRef.current = idempotencyKey;

    // submitRecordedBlob resets stopInFlightRef when it settles.
    await submitRecordedBlob(wavBlob, idempotencyKey);
  }, [audioUrl, exerciseId, releaseMediaStream, submitRecordedBlob]);

  const submitPreparedRecording = useCallback(async () => {
    if (!audioBlob || !attemptIdempotencyKeyRef.current) return;
    await submitRecordedBlob(audioBlob, attemptIdempotencyKeyRef.current);
  }, [audioBlob, submitRecordedBlob]);

  /**
   * Stops recording and submits it for grading.
   */
  const stopRecording = useCallback(() => {
    if (phase === "RECORDING") {
      prepareRecording();
    }
  }, [prepareRecording, phase]);

  /**
   * Action: Cancel recording and revert to READY state.
   */
  const handleCancelRecording = useCallback(() => {
    if (phase !== "RECORDING") return;

    releaseMediaStream();
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    recordedSamplesRef.current = [];
    setRecordingSeconds(0);
    stopInFlightRef.current = false;
    setPhase("READY");
    toast("Đã hủy lượt thu âm.");
  }, [phase, releaseMediaStream]);

  // Launch live visualizer when entering RECORDING phase
  useEffect(() => {
    if (phase === "RECORDING") {
      startWaveformVisualizer();
    }
  }, [phase, startWaveformVisualizer]);

  // Exam clock: start the reading/preparation time once per task, then
  // record automatically when it runs out (ETS TOEIC Speaking flow).
  const prepStartedForRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isExamTask || !exercise || prepTotalSeconds <= 0) return;
    if (phase !== "READY" || audioBlob || currentSubmission) return;
    if (prepStartedForRef.current === exerciseId) return;
    prepStartedForRef.current = exerciseId;
    const startPrep = () => {
      setPromptPlaying(false);
      setPrepRemaining(prepTotalSeconds);
    };
    // Spoken questions are heard first, then the preparation clock runs. If
    // the browser blocks autoplay the clock still starts and "Nghe câu hỏi"
    // stays available.
    const spoken =
      exercise.audioUrl &&
      !["READ_ALOUD", "PRONUNCIATION_DRILL"].includes(String(exercise.taskType ?? ""));
    if (!spoken) {
      startPrep();
      return;
    }
    const question = new Audio(exercise.audioUrl!);
    question.onended = startPrep;
    question.onerror = startPrep;
    setPromptPlaying(true);
    question.play().catch(startPrep);
    return () => {
      question.onended = null;
      question.onerror = null;
      question.pause();
    };
  }, [isExamTask, exercise, prepTotalSeconds, phase, audioBlob, currentSubmission, exerciseId]);
  useEffect(() => {
    if (prepRemaining === null) return;
    if (phase !== "READY") {
      setPrepRemaining(null);
      return;
    }
    if (prepRemaining <= 0) {
      setPrepRemaining(null);
      void startRecording();
      return;
    }
    const tick = setTimeout(
      () => setPrepRemaining((left) => (left === null ? null : left - 1)),
      1000,
    );
    return () => clearTimeout(tick);
  }, [prepRemaining, phase, startRecording]);

  // Countdown timer during recording (per-task limit, auto-submits on expiry)
  useEffect(() => {
    if (phase === "RECORDING") {
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev + 1 >= maxRecordingSecondsRef.current) {
            stopRecording();
            return maxRecordingSecondsRef.current;
          }
          return prev + 1;
        });
      }, 1000);
    } else if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [phase, stopRecording]);

  /**
   * Action 1: "Thử lại" (resets local attempt state back to READY)
   */
  const handleRetryRecord = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (pollingTimerRef.current) clearTimeout(pollingTimerRef.current);

    setAudioBlob(null);
    setAudioUrl(null);
    setCurrentSubmission(null);
    setQualityWarning(null);
    setRecordingSeconds(0);
    recordedSamplesRef.current = [];
    attemptIdempotencyKeyRef.current = null;
    stopInFlightRef.current = false;
    submissionInFlightRef.current = false;
    // A reload must not resume the attempt the learner chose to leave; it
    // still finishes on the server and appears in the history.
    try {
      sessionStorage.removeItem(`breadtrans:speaking:pending:${exerciseId}`);
    } catch {}

    setPhase("READY");
  }, [audioUrl, exerciseId]);

  /**
   * Action 2: "Thử lại với bản ghi này" (for FAILED phase, reuses same Idempotency-Key)
   */
  const handleRetrySubmit = useCallback(async () => {
    if (!audioBlob || !attemptIdempotencyKeyRef.current) {
      handleRetryRecord();
      return;
    }
    await submitRecordedBlob(audioBlob, attemptIdempotencyKeyRef.current);
  }, [audioBlob, handleRetryRecord, submitRecordedBlob]);

  /**
   * Action 3: "Tiếp tục →" (uses GET /speaking/exercises API to navigate to next exercise)
   */
  const handleNextExercise = useCallback(async () => {
    try {
      const exercises: Array<{
        id: number;
        order?: number | null;
        practiceSet?: { key?: string; position?: number };
      }> = examExerciseIds.length
        ? examExerciseIds.map((id) => ({ id }))
        : await speakingService.getExercises();
      const sessionExercises = examExerciseIds.length
        ? exercises
        : practiceSetKey
          ? exercises
              .filter((item) => item.practiceSet?.key === practiceSetKey)
              .sort(
                (a, b) =>
                  (a.order ?? a.practiceSet?.position ?? Number.MAX_SAFE_INTEGER) -
                    (b.order ?? b.practiceSet?.position ?? Number.MAX_SAFE_INTEGER) ||
                  a.id - b.id,
              )
          : exercises;
      const nextId = getNextExerciseId(exerciseId, sessionExercises);
      if (nextId) {
        const params = new URLSearchParams();
        if (practiceSetKey) params.set("set", practiceSetKey);
        if (examParentContext) {
          params.set("parentAttemptId", String(examParentContext.attemptId));
          params.set("parentComponentId", String(examParentContext.componentId));
          if (parentAssessmentId) params.set("parentAssessmentId", parentAssessmentId);
          params.set("examExerciseIds", examExerciseIds.join(","));
        }
        const query = params.toString() ? `?${params.toString()}` : "";
        router.push(`/speaking/${nextId}${query}`);
      } else {
        // After the last exam task, back to the exam, not the practice list.
        router.push(examReturn ?? "/speaking");
      }
    } catch (err) {
      console.error("Failed to load next exercise:", err);
      toast.error("Không thể tải bài tập tiếp theo. Đang quay về danh sách.");
      router.push(examReturn ?? "/speaking");
    }
  }, [examExerciseIds, examParentContext, examReturn, exerciseId, parentAssessmentId, practiceSetKey, router]);

  const stopTtsPlayback = useCallback(() => {
    referenceAudioRef.current?.pause();
    referenceAudioRef.current?.load();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingTTS(false);
  }, []);

  const openDictionary = useCallback(
    (word: string) => {
      if (isPlayingTTS) stopTtsPlayback();
      setSelectedWordForLookup(word);
    },
    [isPlayingTTS, stopTtsPlayback],
  );

  /** Play only approved exercise media; never synthesize reference audio at runtime. */
  const handleTogglePlayTTS = async () => {
    const source = referenceAudioUrl;
    if (!source) return;

    if (isPlayingTTS) {
      stopTtsPlayback();
      return;
    }

    // The accent can change between plays; reuse the element only for the same clip.
    const cached = referenceAudioRef.current;
    const audio = cached && cached.src === source ? cached : new Audio(source);
    referenceAudioRef.current = audio;
    audio.preload = "auto";
    audio.playbackRate = Number(ttsRate);
    audio.onended = () => setIsPlayingTTS(false);
    audio.onerror = () => {
      setIsPlayingTTS(false);
      toast.error("Không thể phát audio mẫu được quản trị.");
    };
    try {
      await audio.play();
      setIsPlayingTTS(true);
    } catch {
      setIsPlayingTTS(false);
    }
  };

  /**
   * Global Keyboard Shortcuts for Space and R
   * Space: Start / Stop recording (with explicit e.preventDefault() to prevent page scroll)
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const tag = activeEl?.tagName || null;
      const isContentEditable = Boolean(
        activeEl?.getAttribute("contenteditable") === "true",
      );
      const isModalOpen =
        showNotesModal ||
        showShortcuts ||
        Boolean(selectedWordForLookup) ||
        Boolean(exitDialogProps?.isOpen);
      const hasModifierKey = e.ctrlKey || e.metaKey || e.altKey || e.shiftKey;

      const shouldHandle = shouldHandleSpeakingShortcut({
        key: e.key,
        activeElementTag: tag,
        isContentEditable,
        isModalOpen,
        hasModifierKey,
      });

      if (!shouldHandle) return;

      // CRITICAL TECHNICAL GUARD: Prevent window jump/scroll when Space is pressed
      if (
        e.key === " " ||
        e.code === "Space" ||
        e.key === "r" ||
        e.key === "R"
      ) {
        e.preventDefault();
      }

      if (phase === "READY" && !audioBlob) {
        startRecording();
      } else if (phase === "RECORDING") {
        stopRecording();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    exitDialogProps?.isOpen,
    audioBlob,
    phase,
    selectedWordForLookup,
    showNotesModal,
    showShortcuts,
    startRecording,
    stopRecording,
  ]);

  const handlePlayIsolatedWordSample = (word: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.rate = Number(ttsRate);
      utterance.lang = ttsAccent === "US" ? "en-US" : "en-GB";
      window.speechSynthesis.speak(utterance);
    }
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

    openDictionary(word);
  };

  /**
   * Renders interactive target sentence tokens with clean in-context word-level highlighting.
   * In Stage 1: Renders high-contrast typography (text-4xl to text-6xl) with interactive hover states.
   * In Stage 2: Renders word-level color grading (Emerald ≥80%, Amber 60-79%, Rose <60%, Omission line-through).
   */
  const renderInteractiveTargetWords = (
    text: string,
    wordsAssessment?: WordAssessmentItem[],
    isStage1Mode: boolean = false,
  ) => {
    const tokens = text.match(WORD_TOKEN_REGEX) || [text];
    let wordIndex = 0;

    return (
      <div
        className={`flex flex-wrap items-center justify-center font-black tracking-tight select-none text-center ${
          isStage1Mode
            ? "text-2xl sm:text-3xl md:text-5xl lg:text-6xl text-slate-900 dark:text-slate-100 leading-tight py-2 px-2 max-w-5xl xl:max-w-6xl mx-auto"
            : "text-2xl sm:text-3xl md:text-3xl lg:text-4xl text-slate-900 dark:text-slate-100 leading-snug py-3 px-1 max-w-2xl mx-auto"
        }`}
      >
        {tokens.map((token, index) => {
          const isWord = IS_WORD_REGEX.test(token);
          if (!isWord) {
            return (
              <span
                key={index}
                className={`font-black select-none -ml-1 mr-1.5 self-center ${
                  isStage1Mode ? "text-slate-400" : "text-slate-500"
                }`}
              >
                {token}
              </span>
            );
          }

          const cleanLookupWord =
            token.trim().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "") ||
            token;

          let wordStyle = isStage1Mode
            ? "bg-white dark:bg-slate-800 border-2 border-slate-200/90 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:bg-amber-100 dark:hover:bg-amber-950/60 hover:text-amber-900 dark:hover:text-amber-300 hover:scale-105 active:scale-95 hover:border-amber-300 shadow-xs px-3 py-1 sm:px-3.5 sm:py-1.5 m-0.5 sm:m-1 rounded-xl sm:rounded-2xl"
            : "bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:bg-amber-100 dark:hover:bg-amber-950/60 hover:text-amber-800 dark:hover:text-amber-300 hover:scale-105 active:scale-95 hover:border-amber-300 shadow-2xs px-3 py-1 m-1 rounded-2xl";
          let tooltip = `Nhấn để tra từ điển & phát âm: "${cleanLookupWord}"`;

          if (
            !isStage1Mode &&
            wordsAssessment &&
            Array.isArray(wordsAssessment)
          ) {
            const currentIdx = wordIndex;
            wordIndex++;

            if (currentIdx < wordsAssessment.length) {
              const item = wordsAssessment[currentIdx];
              const cleanTokenNorm = normalizeWordForMatching(token);
              const cleanItemNorm = normalizeWordForMatching(item.word || "");

              const isTokenMismatch = cleanTokenNorm !== cleanItemNorm;
              const isOmitted =
                !isTokenMismatch &&
                (item.errorType === "Omission" ||
                  item.errorType === "Unspoken");
              const isUnassessed =
                isTokenMismatch ||
                (!isOmitted && !Number.isFinite(item.accuracyScore));
              const isCorrect =
                !isTokenMismatch &&
                !isOmitted &&
                !isUnassessed &&
                (item.accuracyScore ?? 0) >= 80 &&
                item.errorType === "None" &&
                item.isCorrect === true;
              const isNeedsImprovement =
                !isTokenMismatch &&
                !isOmitted &&
                !isUnassessed &&
                !isCorrect &&
                (item.accuracyScore ?? 0) >= 60;
              const isPoor =
                !isTokenMismatch &&
                !isOmitted &&
                !isUnassessed &&
                !isCorrect &&
                !isNeedsImprovement;

              if (isOmitted) {
                wordStyle =
                  "bg-rose-50 text-rose-700 border-rose-300 line-through opacity-80 hover:bg-rose-100 px-3 py-1 m-1 rounded-2xl";
                tooltip = `"${cleanLookupWord}": Bỏ sót hoặc chưa đọc - Nhấn để tra từ điển`;
              } else if (isUnassessed) {
                wordStyle =
                  "bg-slate-50 text-slate-600 border-slate-300 underline decoration-slate-400 decoration-dashed decoration-2 underline-offset-8 hover:bg-slate-100 px-3 py-1 m-1 rounded-2xl";
                tooltip = `"${cleanLookupWord}": Chưa có dữ liệu chấm điểm - Nhấn để tra từ điển`;
              } else if (isCorrect) {
                wordStyle =
                  "bg-emerald-50 text-emerald-800 border-emerald-300 underline decoration-emerald-500 decoration-2 underline-offset-8 hover:bg-emerald-100 px-3 py-1 m-1 rounded-2xl";
                tooltip = `"${cleanLookupWord}": Phát âm chuẩn (${item.accuracyScore}%) - Nhấn để tra từ điển`;
              } else if (isNeedsImprovement) {
                wordStyle =
                  "bg-amber-100/80 text-amber-900 border-amber-300 underline decoration-amber-500 decoration-wavy decoration-2 underline-offset-8 hover:bg-amber-200 px-3 py-1 m-1 rounded-2xl";
                tooltip = `"${cleanLookupWord}": Cần chỉnh lại (${Number.isFinite(item.accuracyScore) ? `${item.accuracyScore}%` : "chưa chuẩn"}) - Nhấn để tra từ điển`;
              } else if (isPoor) {
                wordStyle =
                  "bg-rose-50 text-rose-800 border-rose-300 underline decoration-rose-500 decoration-wavy decoration-2 underline-offset-8 hover:bg-rose-100 px-3 py-1 m-1 rounded-2xl";
                tooltip = `"${cleanLookupWord}": Phát âm chưa đạt (${Number.isFinite(item.accuracyScore) ? `${item.accuracyScore}%` : "<60%"}) - Nhấn để tra từ điển`;
              }
            } else {
              wordStyle =
                "bg-slate-50 text-slate-600 border-slate-300 underline decoration-slate-400 decoration-dashed decoration-2 underline-offset-8 hover:bg-slate-100 px-3 py-1 m-1 rounded-2xl";
              tooltip = `"${cleanLookupWord}": Chưa có dữ liệu chấm điểm - Nhấn để tra từ điển`;
            }
          }

          return (
            <button
              key={`${token}-${index}`}
              type="button"
              onClick={() => openDictionary(cleanLookupWord)}
              title={tooltip}
              aria-label={tooltip}
              className={`inline-block cursor-pointer transition-all border font-black ${wordStyle}`}
            >
              {token}
            </button>
          );
        })}
      </div>
    );
  };

  if (isPremiumSpeakingForbiddenError(exerciseError)) {
    return (
      <div className="fixed inset-0 z-[45] w-screen h-[100dvh] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-center">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/80 rounded-2xl p-6 sm:p-8 shadow-lg text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
            <Lock className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
              PRO
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mt-2">
              Nội dung dành cho PRO
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2">
              Bài luyện nói từ trình độ Trung cấp trở lên thuộc gói PRO. Gói PLUS
              không bao gồm phần này.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={() => router.push(courseReturn)}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold transition cursor-pointer"
            >
              Quay lại danh sách
            </button>
            <button
              type="button"
              onClick={() => router.push(plansHrefFor("PRO"))}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm shadow-sm transition cursor-pointer"
            >
              Xem gói PRO
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || !minLaunchReady) {
    return (
      <div className="fixed inset-0 z-[45] w-screen h-[100dvh] flex items-center justify-center bg-white dark:bg-slate-950">
        <PracticeLoadingScreen skill="speaking" className="max-w-4xl" />
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="fixed inset-0 z-[45] w-screen h-[100dvh] flex flex-col items-center justify-center bg-white dark:bg-slate-950 p-8 text-center">
        <p className="text-base font-bold text-slate-700 dark:text-slate-300">
          Không tìm thấy bài tập phát âm.
        </p>
        <button
          type="button"
          onClick={() => confirmExit(courseReturn)}
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-500 px-5 text-sm font-extrabold text-white hover:bg-amber-600 cursor-pointer"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Quay lại danh sách
        </button>
      </div>
    );
  }

  // The set's Vietnamese title, matching its catalog card.
  const speakingTitle = activePracticeSet
    ? speakingSetDisplayTitle(
        activePracticeSet.key,
        activePracticeSet.title,
        activeCatalogExercise?.cefrLevel,
      )
    : exercise.title;

  return (
    <PracticeShell
      skill="speaking"
      title={speakingTitle}
      stage={phase === "COMPLETED" ? "FEEDBACK" : "PRACTICE"}
      current={currentPracticeSetPosition || undefined}
      total={activePracticeSet?.exerciseCount}
      level={exercise.difficulty}
      mode={speakingMode.label}
      variant="immersive"
    >
      <div className="w-full h-dvh overflow-hidden flex flex-col bg-white dark:bg-slate-950 font-sans">
        <PracticeHeader
          title={speakingTitle}
          category={exercise.categoryLabel ?? exercise.category}
          difficulty={exercise.difficulty}
          positionText={
            activePracticeSet && currentPracticeSetPosition > 0
              ? `Câu ${currentPracticeSetPosition}/${activePracticeSet.exerciseCount}`
              : undefined
          }
          activityLabel={examReturn ? "TOEIC Speaking" : "Đánh giá phát âm"}
          onExit={() => confirmExit(courseReturn)}
          exitLabel="Thoát"
          // Vietnamese translation is coaching; it is off during an exam.
          bilingualEnabled={!examReturn}
          isBilingual={isBilingual}
          onToggleBilingual={() => setIsBilingual((v) => !v)}
          notesEnabled
          onOpenNotes={() => setShowNotesModal(true)}
          shortcutsEnabled
          shortcutsContent={
            <ul className="space-y-2 text-xs font-medium text-slate-600 dark:text-slate-400">
              <li className="flex items-center justify-between">
                <span>Bắt đầu / Dừng thu âm:</span>
                <kbd className="rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200">
                  Space
                </kbd>
              </li>
              <li className="flex items-center justify-between">
                <span>Phím thu âm phụ:</span>
                <kbd className="rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200">
                  R
                </kbd>
              </li>
              <li className="flex items-center justify-between">
                <span>Quy trình tự động:</span>
                <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold">
                  Dừng &rarr; Nghe lại rồi gửi
                </span>
              </li>
            </ul>
          }
          soundEnabled
          soundMuted={soundMuted}
          onToggleSound={() => setSoundMuted((v) => !v)}
        />

        {/* 2. Main Workspace: Dynamic Two-Stage Morphing Architecture */}
        {isStage1 ? (
          /* STAGE 1: FOCUSED RECORDING MODE (Single Centered Stage, Zero Gutters) */
          <main className="flex-1 w-full flex flex-col justify-between overflow-y-auto bg-slate-50/40 p-3 sm:p-4 lg:p-5 min-h-0">
            <div className="max-w-5xl xl:max-w-6xl mx-auto w-full flex-1 flex flex-col items-center justify-center gap-3 sm:gap-4 my-auto">
              {/* Focal mode badge */}
              <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-amber-100/90 text-amber-900 text-xs font-black uppercase tracking-wider shadow-2xs">
                <Target size={13} className="text-amber-700" />
                <span>Nhiệm vụ {speakingMode.label}</span>
                {practiceSetKey &&
                  currentPracticeSetPosition > 0 &&
                  practiceSetExercises.length > 1 && (
                    <>
                      <span className="text-amber-600/60">·</span>
                      <span className="tabular-nums font-black">
                        {currentPracticeSetPosition}
                        <span className="font-medium text-amber-700/70">
                          /{practiceSetExercises.length}
                        </span>
                      </span>
                    </>
                  )}
              </div>

              {/* Contextual Illustration Image (if available) */}
              {exercise.imageUrl && (
                <div className="w-full max-w-xs flex items-center justify-center overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shadow-xs shrink-0 max-h-[120px]">
                  <img
                    src={exercise.imageUrl}
                    alt="Contextual illustration"
                    className="w-full h-full object-contain max-h-[110px] rounded-xl"
                  />
                </div>
              )}

              {exercise.taskType === "RESPOND_USING_INFORMATION" &&
                exercise.stimulus?.kind === "INFORMATION" &&
                exercise.stimulus.content && (
                  <aside
                    aria-label="Thông tin dùng chung cho nhiệm vụ"
                    className="w-full max-w-2xl rounded-2xl border border-blue-200 bg-blue-50/80 px-4 py-3 text-left shadow-xs dark:border-blue-900/70 dark:bg-blue-950/30"
                  >
                    <p className="text-xs font-black uppercase tracking-wider text-blue-800 dark:text-blue-200">
                      {exercise.stimulus.title || "Thông tin dùng chung"}
                    </p>
                    <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                      {exercise.stimulus.content}
                    </p>
                  </aside>
                )}

              {/* 1. Practice Sentence Canvas (Widened horizontal stretch, compact vertical padding) */}
              <div className="w-full bg-gradient-to-b from-white to-slate-50/60 dark:from-slate-900 dark:to-slate-850/60 py-4 px-5 sm:py-5 sm:px-8 lg:px-10 rounded-3xl border-2 border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center">
                {renderInteractiveTargetWords(
                  exercise.targetText || "",
                  undefined,
                  true,
                )}

                {/* Optional Bilingual translation box */}
                {isBilingual &&
                  (exercise.translation || exercise.description) && (
                    <div className="mt-2.5 w-full max-w-2xl rounded-2xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/40 px-3.5 py-2 text-slate-800 dark:text-slate-200 text-center shadow-2xs">
                      <span className="font-black text-amber-950 dark:text-amber-300 block uppercase tracking-wider text-xs">
                        Bản dịch tham khảo
                      </span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 italic text-sm sm:text-base">
                        "{exercise.translation || exercise.description}"
                      </p>
                    </div>
                  )}

                <p className="mt-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-bold flex items-center justify-center gap-2">
                  <BookOpen
                    size={14}
                    className="text-amber-600 dark:text-amber-400"
                  />
                  <span>
                    Nhấp vào từ bất kỳ để tra phiên âm IPA &amp; nghe phát âm
                  </span>
                </p>
              </div>

              {/* 2. Sample Audio & Speed Dock (POSITIONED DIRECTLY BENEATH THE SENTENCE) */}
              <div className="w-full max-w-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs rounded-2xl border border-slate-200/90 dark:border-slate-800 p-2 sm:p-2.5 flex flex-wrap items-center justify-between gap-2.5 shadow-sm">
                {/* Play / Stop sample + Accent */}
                <div className="flex items-center gap-2">
                  {(() => {
                    const hasReferenceAudio = Boolean(exercise.audioUrl);
                    // Reading tasks play a model reading; question tasks play the
                    // prompt itself (no model answer is provided).
                    const isPromptAudio = !["READ_ALOUD", "PRONUNCIATION_DRILL"].includes(
                      String(exercise.taskType ?? ""),
                    );
                    return (
                      <button
                        type="button"
                        onClick={handleTogglePlayTTS}
                        disabled={!hasReferenceAudio}
                        aria-pressed={isPlayingTTS}
                        aria-label={
                          !hasReferenceAudio
                            ? "Audio mẫu chưa khả dụng"
                            : isPlayingTTS
                              ? "Dừng nghe mẫu"
                              : isPromptAudio
                                ? "Nghe câu hỏi"
                                : "Nghe mẫu phát âm"
                        }
                        title={
                          hasReferenceAudio
                            ? "Nghe audio mẫu đã được quản trị viên cung cấp"
                            : "Bài luyện này chưa có audio mẫu được quản trị viên cung cấp"
                        }
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl font-extrabold text-xs sm:text-sm transition-all shadow-xs ${
                          !hasReferenceAudio
                            ? "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                            : isPlayingTTS
                              ? "bg-rose-600 hover:bg-rose-700 text-white"
                              : "bg-slate-900 hover:bg-slate-800 text-white active:scale-95 cursor-pointer"
                        }`}
                      >
                        {!hasReferenceAudio ? (
                          <>
                            <VolumeX size={15} className="shrink-0" />
                            <span>Audio mẫu chưa khả dụng</span>
                          </>
                        ) : isPlayingTTS ? (
                          <>
                            <Square size={13} className="fill-white shrink-0" />
                            <span>Dừng nghe</span>
                          </>
                        ) : (
                          <>
                            <Volume2
                              size={15}
                              className="shrink-0 text-amber-400"
                            />
                            <span>{isPromptAudio ? "Nghe câu hỏi" : "Nghe câu mẫu"}</span>
                          </>
                        )}
                      </button>
                    );
                  })()}

                  {/* Accent selector pills */}
                  <div
                    className={`flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 transition-opacity ${
                      isPlayingTTS ? "opacity-60 cursor-not-allowed" : ""
                    }`}
                    role="group"
                    aria-label="Chọn chất giọng phát âm từ"
                  >
                    {(["US", "UK"] as const).map((accent) => {
                      const selected = ttsAccent === accent;
                      return (
                        <button
                          key={accent}
                          type="button"
                          disabled={isPlayingTTS}
                          onClick={() => setTtsAccent(accent)}
                          aria-pressed={selected}
                          className={`px-2.5 py-1 rounded-lg text-xs sm:text-sm font-black transition-all ${
                            isPlayingTTS
                              ? "cursor-not-allowed"
                              : "cursor-pointer"
                          } ${
                            selected
                              ? "bg-amber-500 text-white shadow-2xs"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                          }`}
                        >
                          {accent === "US" ? "Mỹ (US)" : "Anh (UK)"}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Speed rate controls */}
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-black text-xs sm:text-sm shrink-0">
                    <Gauge
                      size={14}
                      className="text-amber-600 dark:text-amber-400"
                    />
                    <span className="hidden sm:inline">Tốc độ:</span>
                  </div>
                  <div
                    className={`flex items-center gap-1 ${
                      isPlayingTTS ? "opacity-60 cursor-not-allowed" : ""
                    }`}
                    role="group"
                    aria-label="Chọn tốc độ phát âm từ"
                  >
                    {TTS_SPEED_OPTIONS.map((opt) => {
                      const selected = ttsRate === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={isPlayingTTS}
                          onClick={() => setTtsRate(opt.value)}
                          aria-pressed={selected}
                          className={`px-2 py-0.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                            isPlayingTTS
                              ? "cursor-not-allowed"
                              : "cursor-pointer"
                          } ${
                            selected
                              ? "bg-amber-500 text-white font-black shadow-2xs"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 border border-slate-200/80 dark:border-slate-700"
                          }`}
                          title={opt.title}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 3. Audio Recording Controls */}
              {phase === "READY" && !audioBlob ? (
                <div className="flex flex-col items-center justify-center gap-2 my-1">
                  {promptPlaying && (
                    <p role="status" className="w-full max-w-md rounded-2xl bg-sky-50 p-4 text-center text-sm font-bold text-sky-900 dark:bg-sky-950/30 dark:text-sky-200">
                      Đang phát câu hỏi. Thời gian chuẩn bị bắt đầu khi câu hỏi kết thúc.
                    </p>
                  )}
                  {prepRemaining !== null && (
                    <div
                      role="timer"
                      aria-live="polite"
                      className="w-full max-w-md rounded-2xl bg-amber-50 p-4 text-center dark:bg-amber-950/30"
                    >
                      <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                        {exercise?.timing?.readingSeconds &&
                        prepRemaining > (exercise.timing.prepSeconds ?? 0)
                          ? "Thời gian đọc thông tin"
                          : "Thời gian chuẩn bị"}
                      </p>
                      <p className="mt-1 text-4xl font-black tabular-nums text-amber-900 dark:text-amber-100">
                        {prepRemaining}s
                      </p>
                      <p className="mt-1 text-sm text-amber-900/80 dark:text-amber-200/80">
                        Hết giờ, máy sẽ tự ghi âm trong {responseSeconds} giây.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setPrepRemaining(null);
                          void startRecording();
                        }}
                        className="mt-3 inline-flex min-h-10 items-center rounded-xl bg-amber-600 px-4 text-sm font-bold text-white hover:bg-amber-700"
                      >
                        Bắt đầu nói ngay
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={startRecording}
                    className="size-16 sm:size-20 rounded-full bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center border border-amber-600/20 shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 transition-all cursor-pointer active:scale-95 group"
                    title="Bắt đầu thu âm (Phím Space / R)"
                    aria-label="Bắt đầu thu âm"
                  >
                    <Mic
                      size={30}
                      className="transition-transform group-hover:scale-105"
                    />
                  </button>
                  <div className="text-center space-y-0.5">
                    <p
                      className={`text-xs font-bold ${micStatus === "READY" ? "text-emerald-700 dark:text-emerald-300" : micStatus === "MISSING" || micStatus === "DENIED" ? "text-rose-700 dark:text-rose-300" : "text-slate-500 dark:text-slate-400"}`}
                    >
                      {micStatus === "READY"
                        ? "Micro sẵn sàng"
                        : micStatus === "MISSING"
                          ? "Không tìm thấy micro"
                          : micStatus === "DENIED"
                            ? "Chưa cấp quyền micro"
                            : "Micro sẽ được kiểm tra khi bắt đầu thu âm"}
                    </p>
                    <p className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
                      Nhấn nút Micro hoặc bấm phím{" "}
                      <kbd className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-xs font-black text-slate-800 dark:text-slate-200 shadow-2xs">
                        Space
                      </kbd>{" "}
                      để nói
                    </p>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-semibold">
                      Thời gian trả lời tối đa {responseSeconds} giây. Bấm dừng là bài được chấm ngay.
                    </p>
                  </div>
                </div>
              ) : phase === "READY" && audioBlob ? (
                <div className="w-full max-w-xl rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-xs dark:border-emerald-900/60 dark:bg-emerald-950/20">
                  <div className="flex items-center gap-2 text-sm font-black text-emerald-900 dark:text-emerald-200">
                    <Volume2 size={17} aria-hidden="true" /> Bản ghi đã sẵn sàng
                  </div>
                  <audio
                    className="mt-3 w-full"
                    controls
                    preload="metadata"
                    src={audioUrl ?? undefined}
                    aria-label="Nghe lại bản ghi của bạn"
                  />
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      onClick={handleRetryRecord}
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <RotateCcw size={15} aria-hidden="true" /> Thu lại
                    </button>
                    <button
                      type="button"
                      onClick={() => void submitPreparedRecording()}
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-black text-white hover:bg-emerald-700"
                    >
                      <Mic size={15} aria-hidden="true" /> Gửi đánh giá
                    </button>
                  </div>
                  <p className="mt-2 text-center text-xs font-semibold text-emerald-800/80 dark:text-emerald-200/80">
                    Bạn vẫn có thể thu lại trước khi gửi.
                  </p>
                </div>
              ) : (
                <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/60 p-4 flex flex-col items-center justify-center gap-3 shadow-xs animate-in fade-in my-1">
                  {/* Live countdown timer */}
                  <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900 text-white font-mono font-bold text-xs sm:text-sm shadow-xs">
                    <span className="size-2 rounded-full bg-rose-500 animate-ping" />
                    <span>{formatSpeakingTime(recordingSeconds)}</span>
                    <span className="text-slate-400">/ 00:45</span>
                  </div>

                  {/* Live audio visualizer canvas */}
                  <div className="w-full h-10 flex items-center justify-center bg-slate-950 rounded-xl p-1 shadow-inner">
                    <canvas
                      ref={canvasRef}
                      width={320}
                      height={36}
                      className="w-full h-full"
                    />
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="size-16 sm:size-20 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center border border-rose-700/20 shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 transition-all cursor-pointer active:scale-95 group"
                      title="Dừng ghi âm (Phím Space / R)"
                      aria-label="Dừng ghi âm và chấm điểm"
                    >
                      <StopCircle
                        size={30}
                        className="transition-transform group-hover:scale-105"
                      />
                    </button>

                    <button
                      type="button"
                      onClick={handleCancelRecording}
                      className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 hover:border-rose-200 transition-all cursor-pointer shadow-2xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                      title="Hủy lượt thu âm này"
                    >
                      <X size={14} className="text-rose-500" />
                      <span>Hủy bỏ</span>
                    </button>
                  </div>

                  <p className="font-bold text-xs sm:text-sm text-rose-600 text-center">
                    Đang thu âm... Bấm nút đỏ hoặc nhấn [Space] để dừng và chấm
                    điểm
                  </p>
                </div>
              )}
            </div>

            {/* Collapsible Guidelines Drawer at the bottom */}
            <div className="max-w-5xl xl:max-w-6xl mx-auto w-full mt-3 sm:mt-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 shadow-xs shrink-0">
              <button
                type="button"
                onClick={() => setShowTipsDrawer((v) => !v)}
                className="w-full flex items-center justify-between text-sm font-black text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-slate-100 transition cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <HelpCircle size={15} className="text-amber-600" />
                  <span>Tiêu chuẩn đánh giá phát âm &amp; Mẹo thu âm</span>
                </span>
                <span className="flex items-center gap-1 text-xs font-bold text-slate-500">
                  {showTipsDrawer ? "Thu gọn" : "Xem hướng dẫn"}
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${
                      showTipsDrawer ? "rotate-180" : ""
                    }`}
                  />
                </span>
              </button>

              {showTipsDrawer && (
                <div className="mt-2.5 border-t border-slate-100 dark:border-slate-800 pt-2.5 space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <p className="font-black text-sm text-slate-900 dark:text-slate-100">
                        1. Độ chính xác
                      </p>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium mt-1 leading-relaxed">
                        Đọc rõ từng từ, đặc biệt là âm cuối (ending sounds).
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <p className="font-black text-sm text-slate-900 dark:text-slate-100">
                        2. Độ lưu loát
                      </p>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium mt-1 leading-relaxed">
                        Giữ nhịp điệu tự nhiên, không ngập ngừng quá lâu.
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <p className="font-black text-sm text-slate-900 dark:text-slate-100">
                        3. Độ toàn vẹn
                      </p>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium mt-1 leading-relaxed">
                        Không bỏ sót từ ngữ nào trong câu văn mẫu.
                      </p>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-semibold italic text-center pt-1">
                    Mẹo: Giữ khoảng cách micro 10-15cm và tránh đọc trong phòng
                    có tiếng vang.
                  </p>
                </div>
              )}
            </div>
          </main>
        ) : (
          /* STAGE 2: 1:1 COMPARATIVE ANALYSIS STUDIO (50/50 Split Canvas) */
          <main className="flex-1 w-full grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800 overflow-y-auto lg:overflow-hidden min-h-0 transition-all duration-500">
            {/* Left Panel: Target Text & Context Canvas */}
            <section className="w-full lg:h-full p-5 sm:p-6 lg:p-7 flex flex-col justify-between lg:overflow-y-auto bg-white dark:bg-slate-900 lg:min-h-0">
              <div className="flex-1 flex flex-col min-h-0">
                {/* Instruction Header */}
                <div className="flex items-center justify-between gap-2 mb-3 shrink-0">
                  <div className="space-y-0.5">
                    <p className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
                      {!["READ_ALOUD", "PRONUNCIATION_DRILL"].includes(String(exercise.taskType ?? "READ_ALOUD"))
                        ? "Trả lời câu hỏi bên dưới bằng tiếng Anh, nói thành câu đầy đủ:"
                        : phase === "COMPLETED"
                          ? "Kết quả đánh giá phát âm từng từ:"
                          : "Đọc to câu văn bên dưới với phát âm rõ ràng và tự nhiên:"}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {["READ_ALOUD", "PRONUNCIATION_DRILL"].includes(String(exercise.taskType ?? "READ_ALOUD"))
                        ? "Màu sắc thể hiện mức độ chính xác của từng từ bạn đã phát âm"
                        : "Bài được chấm trên chính câu trả lời bạn nói, không so với câu hỏi"}
                    </p>
                  </div>
                  <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200/80 dark:border-slate-700 shrink-0">
                    <Target
                      size={13}
                      className="text-amber-600 dark:text-amber-400"
                    />
                    <span>Đối chiếu trực quan</span>
                  </div>
                </div>

                {/* Contextual Illustration Image (if available) */}
                {exercise.imageUrl && (
                  <div className="w-full flex items-center justify-center my-2 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-xs shrink-0 max-h-[160px]">
                    <img
                      src={exercise.imageUrl}
                      alt="Contextual illustration"
                      className="w-full h-full object-contain max-h-[145px] rounded-xl"
                    />
                  </div>
                )}

                {exercise.taskType === "RESPOND_USING_INFORMATION" &&
                  exercise.stimulus?.kind === "INFORMATION" &&
                  exercise.stimulus.content && (
                    <aside
                      aria-label="Thông tin dùng chung cho nhiệm vụ"
                      className="my-2 rounded-2xl border border-blue-200 bg-blue-50/80 px-4 py-3 text-left shadow-xs dark:border-blue-900/70 dark:bg-blue-950/30"
                    >
                      <p className="text-xs font-black uppercase tracking-wider text-blue-800 dark:text-blue-200">
                        {exercise.stimulus.title || "Thông tin dùng chung"}
                      </p>
                      <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                        {exercise.stimulus.content}
                      </p>
                    </aside>
                  )}

                {/* Hero Practice Sentence Canvas with Word-Level Color Grading */}
                <div className="w-full bg-gradient-to-b from-white to-slate-50/50 p-5 sm:p-6 rounded-3xl border-2 border-slate-200/90 shadow-sm my-2 flex flex-col items-center justify-center">
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black uppercase tracking-wider mb-2.5">
                    <Target size={14} className="text-amber-700" />
                    <span>Nội dung nhiệm vụ {speakingMode.label}</span>
                  </div>

                  {renderInteractiveTargetWords(
                    exercise.targetText || "",
                    phase === "COMPLETED" &&
                      !currentSubmission?.aiFeedback?.isSilentOrNoSpeech &&
                      currentSubmission?.lastErrorCode !== "NO_SPEECH"
                      ? currentSubmission?.aiFeedback?.words
                      : undefined,
                    false,
                  )}

                  {/* In-Context Assessment Legend */}
                  {phase === "COMPLETED" &&
                    !currentSubmission?.aiFeedback?.isSilentOrNoSpeech &&
                    currentSubmission?.lastErrorCode !== "NO_SPEECH" &&
                    Array.isArray(currentSubmission?.aiFeedback?.words) &&
                    currentSubmission.aiFeedback.words.length > 0 && (
                      <div
                        role="note"
                        aria-label="Chú thích màu sắc phát âm"
                        className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 text-xs sm:text-sm font-extrabold text-slate-700 dark:text-slate-300"
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <span className="size-2.5 rounded-full bg-emerald-500 shadow-2xs" />
                          <span className="underline decoration-emerald-500 decoration-2 underline-offset-4 text-emerald-800 dark:text-emerald-300">
                            Đạt chuẩn (&ge; 80%)
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="size-2.5 rounded-full bg-amber-500 shadow-2xs" />
                          <span className="underline decoration-amber-500 decoration-wavy underline-offset-4 text-amber-900 dark:text-amber-300">
                            Cần chỉnh lại (60-79%)
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="size-2.5 rounded-full bg-rose-500 shadow-2xs" />
                          <span className="underline decoration-rose-500 decoration-wavy underline-offset-4 text-rose-800 dark:text-rose-400">
                            Chưa đạt (&lt; 60%)
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="size-2.5 rounded-full bg-rose-500 shadow-2xs" />
                          <span className="line-through decoration-rose-500 decoration-2 text-rose-700 dark:text-rose-400">
                            Bỏ sót
                          </span>
                        </span>
                      </div>
                    )}

                  {/* Optional Bilingual translation box */}
                  {isBilingual &&
                    (exercise.translation || exercise.description) && (
                      <div className="mt-3.5 w-full max-w-xl rounded-2xl border border-amber-200/90 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/40 p-3.5 text-center shadow-2xs">
                        <span className="font-black text-amber-950 dark:text-amber-300 block mb-1 uppercase tracking-wider text-xs">
                          Bản dịch tham khảo
                        </span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 italic text-sm sm:text-base">
                          "{exercise.translation || exercise.description}"
                        </p>
                      </div>
                    )}

                  {/* Dictionary hint pill */}
                  <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100/90 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-semibold border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                    <BookOpen
                      size={14}
                      className="text-amber-600 dark:text-amber-400 shrink-0"
                    />
                    <span>
                      Nhấp vào từ bất kỳ để tra nghĩa, phiên âm IPA và nghe cách
                      đọc mẫu
                    </span>
                  </div>
                </div>
              </div>

              {/* Collapsible Guidelines Drawer */}
              <div className="mt-auto rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setShowTipsDrawer((v) => !v)}
                  className="w-full flex items-center justify-between text-sm font-black text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-slate-100 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <HelpCircle
                      size={15}
                      className="text-amber-600 dark:text-amber-400"
                    />
                    <span>Tiêu chuẩn đánh giá phát âm &amp; Mẹo thu âm</span>
                  </span>
                  <span className="flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                    {showTipsDrawer ? "Thu gọn" : "Xem hướng dẫn"}
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 ${
                        showTipsDrawer ? "rotate-180" : ""
                      }`}
                    />
                  </span>
                </button>

                {showTipsDrawer && (
                  <div className="mt-2.5 border-t border-slate-100 dark:border-slate-800 pt-2.5 space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <p className="font-black text-sm text-slate-900 dark:text-slate-100">
                          1. Độ chính xác
                        </p>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium mt-1 leading-relaxed">
                          Đọc rõ từng từ, đặc biệt là âm cuối (ending sounds).
                        </p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <p className="font-black text-sm text-slate-900 dark:text-slate-100">
                          2. Độ lưu loát
                        </p>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium mt-1 leading-relaxed">
                          Giữ nhịp điệu tự nhiên, không ngập ngừng quá lâu.
                        </p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <p className="font-black text-sm text-slate-900 dark:text-slate-100">
                          3. Độ toàn vẹn
                        </p>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium mt-1 leading-relaxed">
                          Không bỏ sót từ ngữ nào trong câu văn mẫu.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Right Panel: Unified Assessment Studio */}
            <section className="w-full lg:h-full p-4 sm:p-5 lg:p-6 flex flex-col justify-between lg:overflow-y-auto bg-slate-50/40 lg:min-h-0">
              <PronunciationReportCard
                phase={phase}
                submission={currentSubmission}
                targetText={exercise.targetText || ""}
                scripted={["READ_ALOUD", "PRONUNCIATION_DRILL"].includes(String(exercise.taskType ?? "READ_ALOUD"))}
                userAudioUrl={audioUrl}
                qualityWarning={qualityWarning}
                recordingSeconds={recordingSeconds}
                maxRecordingSeconds={responseSeconds}
                canvasRef={canvasRef}
                uploadProgress={uploadProgress}
                onStartRecording={startRecording}
                onStopRecording={stopRecording}
                onCancelRecording={handleCancelRecording}
                onRetryRecord={handleRetryRecord}
                onRetrySubmit={handleRetrySubmit}
                isPreviewReady={Boolean(audioBlob)}
                onNextExercise={handleNextExercise}
                onSelectWord={openDictionary}
                onPlaySample={handlePlayIsolatedWordSample}
                ttsAccent={ttsAccent}
                ttsRate={ttsRate}
                referenceAudioUrl={referenceAudioUrl}
                isNextAvailable={isNextAvailable}
                isProlongedProcessing={isProlongedProcessing}
              />
              {phase === "COMPLETED" &&
                previousAttempt &&
                currentSubmission?.overallScore != null && (
                  <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50/70 p-4 dark:border-violet-900/60 dark:bg-violet-950/20">
                    <p className="text-xs font-black uppercase tracking-wider text-violet-700 dark:text-violet-300">
                      So sánh lần luyện
                    </p>
                    <div className="mt-2 grid grid-cols-3 items-end gap-2 text-center">
                      <div>
                        <p className="text-xs font-semibold text-slate-500">
                          Lần trước
                        </p>
                        <p className="text-xl font-black text-slate-700 dark:text-slate-200">
                          {formatSpeakingScore(previousAttempt.overallScore)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500">
                          Lần này
                        </p>
                        <p className="text-xl font-black text-violet-700 dark:text-violet-300">
                          {formatSpeakingScore(currentSubmission.overallScore)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500">
                          Thay đổi
                        </p>
                        <p
                          className={`text-xl font-black ${(scoreDelta(currentSubmission.overallScore, previousAttempt.overallScore) ?? 0) >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                        >
                          {(scoreDelta(
                            currentSubmission.overallScore,
                            previousAttempt.overallScore,
                          ) ?? 0) > 0
                            ? "+"
                            : ""}
                          {formatSpeakingScore(
                            scoreDelta(
                              currentSubmission.overallScore,
                              previousAttempt.overallScore,
                            ),
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
            </section>
          </main>
        )}

        {/* 3. Full-Width Bottom Action Dock */}
        <footer className="w-full h-14 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 md:px-6 flex items-center justify-between shrink-0 shadow-sm z-30 select-none">
          {/* Left: Quick utilities */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ReportIssueButton
              area="SPEAKING"
              context={{
                route:
                  typeof window !== "undefined"
                    ? window.location.pathname
                    : undefined,
                sourceType: "SPEAKING_EXERCISE",
                sourceId: exercise?.id,
                context: {
                  exerciseTitle: exercise?.title,
                  targetText: exercise?.targetText,
                },
              }}
            />

            {/* Tra từ */}
            <button
              type="button"
              onClick={handleDictionaryLookup}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Bôi đen một từ tiếng Anh rồi bấm để tra cứu"
            >
              <BookOpen size={15} className="text-sky-600 dark:text-sky-400" />
              <span className="hidden sm:inline">Tra từ</span>
            </button>

            {/* Lưu bài luyện */}
            <button
              type="button"
              onClick={() => {
                setIsSaved((prev) => {
                  const next = !prev;
                  showToast(
                    next
                      ? "Đã lưu bài luyện vào danh sách ôn tập."
                      : "Đã bỏ lưu bài luyện.",
                  );
                  return next;
                });
              }}
              className={`inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold px-3 py-1.5 rounded-xl transition cursor-pointer ${
                isSaved
                  ? "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                  : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
              title={
                isSaved ? "Bỏ lưu bài tập" : "Lưu bài tập để luyện lại sau"
              }
            >
              <Star
                size={15}
                className={
                  isSaved ? "fill-amber-500 text-amber-500" : "text-amber-500"
                }
              />
              <span className="hidden sm:inline">
                {isSaved ? "Đã lưu" : "Lưu bài"}
              </span>
            </button>
          </div>

          {/* Center Toast Feedback Message */}
          {toastMessage && (
            <div className="absolute left-1/2 -translate-x-1/2 bottom-18 z-50 rounded-xl bg-slate-900 text-white px-4 py-2 text-xs font-bold shadow-lg animate-in fade-in zoom-in-95 duration-150">
              {toastMessage}
            </div>
          )}

          {/* Right Navigation Dock */}
          <div className="flex items-center gap-2 sm:gap-3">
            {previousExerciseId && (
              <button
                type="button"
                onClick={() => {
                  const params = new URLSearchParams();
                  if (practiceSetKey) params.set("set", practiceSetKey);
                  if (examParentContext) {
                    params.set("parentAttemptId", String(examParentContext.attemptId));
                    params.set("parentComponentId", String(examParentContext.componentId));
                    if (parentAssessmentId) params.set("parentAssessmentId", parentAssessmentId);
                    params.set("examExerciseIds", examExerciseIds.join(","));
                  }
                  const query = params.toString() ? `?${params.toString()}` : "";
                  router.push(`/speaking/${previousExerciseId}${query}`);
                }}
                disabled={phase === "RECORDING" || isAnalyzing}
                className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer transition-colors text-xs sm:text-sm inline-flex items-center gap-1 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowLeft size={14} aria-hidden="true" /> Câu trước
              </button>
            )}
            <button
              type="button"
              onClick={() => confirmExit(courseReturn)}
              className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer transition-colors text-xs sm:text-sm"
            >
              {examReturn ? "← Về bài thi" : "← Danh sách bài"}
            </button>

            {/* Contextual Action Button */}
            {isAnalyzing ? (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm font-bold shadow-xs">
                <Loader2 size={16} className="animate-spin text-amber-600" />
                <span>
                  {phase === "REQUESTING_UPLOAD"
                    ? "Khởi tạo tải lên..."
                    : phase === "UPLOADING"
                      ? `Đang tải lên ${uploadProgress}%`
                      : phase === "FINALIZING"
                        ? "Đang xác thực..."
                        : phase === "POLLING"
                          ? "Đang chấm điểm..."
                          : "Đang phân tích..."}
                </span>
              </div>
            ) : phase === "READY" && !audioBlob ? (
              <button
                type="button"
                onClick={() => {
                  setPrepRemaining(null);
                  void startRecording();
                }}
                className="px-4 sm:px-5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-xs hover:shadow-sm active:scale-95 transition-all cursor-pointer inline-flex items-center gap-1.5 text-xs sm:text-sm"
              >
                <Mic size={15} aria-hidden="true" />
                <span>
                  {promptPlaying
                    ? "Đang phát câu hỏi"
                    : prepRemaining !== null
                      ? `Chuẩn bị ${prepRemaining}s · Nói ngay`
                      : "Bắt đầu thu âm"}
                </span>
                <kbd className="hidden sm:inline px-1.5 py-0.5 rounded bg-amber-600/60 font-mono text-[10px] text-white">
                  Space
                </kbd>
              </button>
            ) : phase === "READY" && audioBlob ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRetryRecord}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs sm:text-sm inline-flex items-center gap-1.5 transition-all hover:bg-slate-50"
                >
                  <RotateCcw size={14} aria-hidden="true" /> Thu lại
                </button>
                <button
                  type="button"
                  onClick={() => void submitPreparedRecording()}
                  className="px-4 sm:px-5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5 text-xs sm:text-sm"
                >
                  <Mic size={15} aria-hidden="true" /> Gửi đánh giá
                </button>
              </div>
            ) : phase === "RECORDING" ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancelRecording}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-600 hover:text-rose-600 hover:border-rose-300 font-bold transition-all text-xs sm:text-sm cursor-pointer inline-flex items-center gap-1 active:scale-95"
                  title="Hủy lượt thu âm này"
                >
                  <X size={14} className="text-rose-500" />
                  <span>Hủy</span>
                </button>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="px-4 sm:px-5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-xs hover:shadow-sm active:scale-95 transition-all cursor-pointer inline-flex items-center gap-1.5 text-xs sm:text-sm animate-pulse"
                >
                  <StopCircle size={15} aria-hidden="true" />
                  <span>Dừng &amp; chấm điểm</span>
                  <kbd className="hidden sm:inline px-1.5 py-0.5 rounded bg-rose-700 font-mono text-[10px] text-white">
                    Space
                  </kbd>
                </button>
              </div>
            ) : phase === "COMPLETED" ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRetryRecord}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm inline-flex items-center gap-1.5 transition-all shadow-xs hover:shadow-sm active:scale-95 cursor-pointer"
                >
                  <RotateCcw size={14} aria-hidden="true" />
                  <span>Ghi âm lại</span>
                </button>

                <button
                  type="button"
                  onClick={handleNextExercise}
                  className="px-4 sm:px-5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs hover:shadow-sm active:scale-95 transition-all cursor-pointer inline-flex items-center gap-1.5 text-xs sm:text-sm"
                >
                  <span>
                    {isNextAvailable
                      ? activePracticeSet
                        ? "Câu tiếp theo"
                        : "Tiếp tục bài sau"
                      : examReturn
                        ? "Về bài thi"
                        : "Về danh sách"}
                  </span>
                  <ArrowLeft
                    size={14}
                    className="rotate-180"
                    aria-hidden="true"
                  />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {phase === "FAILED" && audioBlob && (
                  <button
                    type="button"
                    onClick={handleRetrySubmit}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm inline-flex items-center gap-1.5 transition-all shadow-xs hover:shadow-sm active:scale-95 cursor-pointer"
                  >
                    <RotateCcw size={14} aria-hidden="true" />
                    <span>Thử lại với bản ghi này</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleRetryRecord}
                  className="px-4 sm:px-5 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-bold shadow-xs hover:shadow-sm active:scale-95 transition-all cursor-pointer inline-flex items-center gap-1.5 text-xs sm:text-sm"
                >
                  <RotateCcw size={14} aria-hidden="true" />
                  <span>Thu lại</span>
                </button>
              </div>
            )}
          </div>
        </footer>

        {/* Scratchpad Notes Modal */}
        {showNotesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <StickyNote size={18} className="text-amber-500" />
                  Ghi chú phát âm
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
                placeholder="Ghi chú các từ cần luyện tập thêm, mẹo phát âm..."
                rows={6}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
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

        {/* Interactive Word Dictionary Popup */}
        {selectedWordForLookup && (
          <WordDictionaryPopup
            word={selectedWordForLookup}
            onClose={() => setSelectedWordForLookup(null)}
            onPracticeWord={(w) => {
              handlePlayIsolatedWordSample(w);
            }}
            playbackRate={ttsRate}
          />
        )}

        {/* Shared Exit Confirmation Modal */}
        <PracticeExitConfirmDialog {...exitDialogProps} />
      </div>
    </PracticeShell>
  );
}
