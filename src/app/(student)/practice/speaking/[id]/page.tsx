"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import {
  Activity,
  ArrowLeft,
  BookOpen,
  ChevronDown,
  Flag,
  Gauge,
  HelpCircle,
  Keyboard,
  Languages,
  Loader2,
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
  WordAssessmentItem,
} from "@/lib/api/services/speaking.service";
import {
  SpeakingAttemptPhase,
  generateSpeakingIdempotencyKey,
  encodeWAV,
  validateWavBinary,
  formatSpeakingTime,
  shouldHandleSpeakingShortcut,
  getNextExerciseId,
} from "@/lib/speaking/speakingPracticeLogic";
import { WordDictionaryPopup } from "@/components/speaking/WordDictionaryPopup";
import { PronunciationReportCard } from "@/components/speaking/PronunciationReportCard";
import { PracticeLoadingScreen } from "@/components/practice/PracticeLoadingScreen";
import { PracticeExitConfirmDialog } from "@/components/practice/PracticeExitConfirmDialog";
import { usePracticeExitGuard } from "@/hooks/usePracticeExitGuard";
import toast from "react-hot-toast";

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

export const normalizeWordForMatching = (word: string): string => {
  if (!word) return "";
  return word
    .toLowerCase()
    .replace(/[’‘ʼ]/g, "'")
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
};

export const WORD_TOKEN_REGEX =
  /[\p{L}\p{N}]+(?:['’‘ʼ\-][\p{L}\p{N}]+)*['’‘ʼ]?|[^\s\p{L}\p{N}]/gu;
export const IS_WORD_REGEX = /[\p{L}\p{N}]/u;

export default function SpeakingExerciseDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const exerciseId = Number(id);
  const queryClient = useQueryClient();

  // Explicit Attempt State Machine
  const [phase, setPhase] = useState<SpeakingAttemptPhase>("READY");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const MAX_RECORDING_SECONDS = 45;

  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [qualityWarning, setQualityWarning] = useState<string | null>(null);

  // In-flight & Idempotency Guards
  const stopInFlightRef = useRef(false);
  const submissionInFlightRef = useRef(false);
  const attemptIdempotencyKeyRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);

  // Audio recording hardware nodes
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recordedSamplesRef = useRef<Float32Array[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // TTS State
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [ttsRate, setTtsRate] = useState<number>(1.0);
  const [ttsAccent, setTtsAccent] = useState<"US" | "UK">("US");
  const ttsAudioElementRef = useRef<HTMLAudioElement | null>(null);

  // Dictionary Popup State
  const [selectedWordForLookup, setSelectedWordForLookup] = useState<
    string | null
  >(null);

  // Submission & Polling State
  const [currentSubmission, setCurrentSubmission] =
    useState<SpeakingSubmissionDetail | null>(null);
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Utilities State
  const [isBilingual, setIsBilingual] = useState(true);
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

  const { data: exercise, isLoading } = useQuery({
    queryKey: ["speaking-exercise", exerciseId],
    queryFn: () => speakingService.getExerciseById(exerciseId),
    enabled: !!exerciseId,
  });

  const { data: allExercises } = useQuery({
    queryKey: ["speaking-exercises"],
    queryFn: () => speakingService.getExercises(),
    staleTime: 60_000,
  });

  const isNextAvailable = useMemo(() => {
    if (!allExercises || !exerciseId) return false;
    return Boolean(getNextExerciseId(exerciseId, allExercises));
  }, [allExercises, exerciseId]);

  const [minLaunchReady, setMinLaunchReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMinLaunchReady(true), 350);
    return () => clearTimeout(timer);
  }, []);

  const isCompleted = phase === "COMPLETED";
  const shouldConfirmExit = !isCompleted;
  const isStage1 = phase === "READY" || phase === "RECORDING";
  const isAnalyzing =
    phase === "ENCODING" ||
    phase === "VALIDATING_AUDIO" ||
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
    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch {}
      processorRef.current = null;
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
  }, []);

  const { confirmExit, exitDialogProps } = usePracticeExitGuard({
    shouldConfirmExit,
    defaultFallbackUrl: "/practice/speaking",
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
      if (ttsAudioElementRef.current) {
        ttsAudioElementRef.current.pause();
        ttsAudioElementRef.current = null;
      }
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

    try {
      setQualityWarning(null);
      setRecordingSeconds(0);
      recordedSamplesRef.current = [];
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
      mediaStreamRef.current = stream;

      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);

      // AnalyserNode for visualizer only (NOT connected to destination)
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;
      source.connect(analyser);

      // ScriptProcessorNode for pure PCM chunk extraction
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        recordedSamplesRef.current.push(new Float32Array(inputData));
      };

      // Connect to a Zero-Gain node to strictly avoid microphone audio loopback into speakers!
      const zeroGain = audioCtx.createGain();
      zeroGain.gain.value = 0.0;

      source.connect(processor);
      processor.connect(zeroGain);
      zeroGain.connect(audioCtx.destination);

      setPhase("RECORDING");
    } catch (err) {
      console.error("Error accessing microphone:", err);
      toast.error(
        "Không thể truy cập Microphone. Vui lòng kiểm tra và cấp quyền micro trong cài đặt trình duyệt.",
      );
      setPhase("READY");
    }
  }, [phase]);

  /**
   * Polls GET /speaking/submissions/:id every 1.5s until terminal status.
   */
  const pollSubmissionStatus = useCallback(
    (submissionId: number, attempt: number) => {
      if (!isMountedRef.current) return;

      if (attempt > 40) {
        setPhase("FAILED");
        submissionInFlightRef.current = false;
        stopInFlightRef.current = false;
        toast.error(
          "Thời gian chấm điểm kéo dài hơn dự kiến. Bạn có thể thử lại với bản ghi này.",
        );
        return;
      }

      pollingTimerRef.current = setTimeout(async () => {
        if (!isMountedRef.current) return;

        try {
          const sub = await speakingService.getSubmission(submissionId);
          if (!isMountedRef.current) return;

          setCurrentSubmission(sub);

          if (sub.status === "COMPLETED") {
            setPhase("COMPLETED");
            submissionInFlightRef.current = false;
            stopInFlightRef.current = false;
            toast.success("Đã hoàn thành đánh giá phát âm!");

            // Authoritative cache invalidation on completed
            const currentUserId = useAuthStore.getState().user?.id;
            queryClient.invalidateQueries({ queryKey: ["dashboard-today", currentUserId] });
            queryClient.invalidateQueries({ queryKey: ["user-stats", currentUserId] });
            queryClient.invalidateQueries({ queryKey: ["user-skills-summary", currentUserId] });
            queryClient.invalidateQueries({ queryKey: ["myPet"] });
          } else if (sub.status === "FAILED") {
            setPhase("FAILED");
            submissionInFlightRef.current = false;
            stopInFlightRef.current = false;
            toast.error(
              "Đánh giá phát âm chưa thành công. Bạn vui lòng thử lại.",
            );
          } else {
            pollSubmissionStatus(submissionId, attempt + 1);
          }
        } catch (err: any) {
          console.error("Polling error:", err);
          if (isMountedRef.current) {
            pollSubmissionStatus(submissionId, attempt + 1);
          }
        }
      }, 1500);
    },
    [queryClient],
  );

  /**
   * Submits recorded Blob directly without waiting on async React state.
   */
  const submitRecordedBlob = useCallback(
    async (blob: Blob, key: string) => {
      if (submissionInFlightRef.current) return;
      submissionInFlightRef.current = true;

      setPhase("SUBMITTING");
      setCurrentSubmission(null);

      try {
        const response = await speakingService.submitAudio(
          exerciseId,
          blob,
          key,
        );

        setPhase("POLLING");
        pollSubmissionStatus(response.submissionId, 0);
      } catch (err: any) {
        console.error("Submission error:", err);
        setPhase("FAILED");
        submissionInFlightRef.current = false;
        stopInFlightRef.current = false;
        const msg =
          err?.response?.data?.message ||
          "Có lỗi xảy ra khi gửi bài phát âm. Bạn có thể thử lại với bản ghi này.";
        toast.error(msg);
      }
    },
    [exerciseId, pollSubmissionStatus],
  );

  /**
   * Safe zero-click stop & finalization pipeline.
   * Resamples strictly to 16kHz, pre-validates WAV binary, and directly uploads.
   */
  const finalizeAndSubmit = useCallback(async () => {
    if (stopInFlightRef.current) return;
    stopInFlightRef.current = true;

    const audioCtx = audioContextRef.current;
    const inputSampleRate = audioCtx?.sampleRate || 44100;

    // Disconnect and stop media hardware immediately so mic indicator turns OFF
    releaseMediaStream();

    setPhase("ENCODING");

    const chunks = recordedSamplesRef.current;
    let totalLength = 0;
    for (const chunk of chunks) totalLength += chunk.length;

    if (totalLength === 0) {
      setQualityWarning("Bản ghi âm rỗng. Vui lòng nói to rõ và thu lại.");
      setPhase("INVALID_AUDIO");
      stopInFlightRef.current = false;
      return;
    }

    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
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
    const validation = validateWavBinary(arrayBuffer);

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

    // 4. Generate stable idempotency key for this recording
    const idempotencyKey = generateSpeakingIdempotencyKey(exerciseId);
    attemptIdempotencyKeyRef.current = idempotencyKey;

    // 5. Zero-click direct upload
    await submitRecordedBlob(wavBlob, idempotencyKey);
  }, [audioUrl, exerciseId, releaseMediaStream, submitRecordedBlob]);

  /**
   * Stops recording and triggers zero-click submit.
   */
  const stopRecording = useCallback(() => {
    if (phase === "RECORDING") {
      finalizeAndSubmit();
    }
  }, [finalizeAndSubmit, phase]);

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

  // Countdown timer during recording (max 45s, auto-submits on expiry)
  useEffect(() => {
    if (phase === "RECORDING") {
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev + 1 >= MAX_RECORDING_SECONDS) {
            stopRecording();
            return MAX_RECORDING_SECONDS;
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

    setPhase("READY");
  }, [audioUrl]);

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
      const exercises = await speakingService.getExercises();
      const nextId = getNextExerciseId(exerciseId, exercises);
      if (nextId) {
        router.push(`/practice/speaking/${nextId}`);
      } else {
        router.push("/practice/speaking");
      }
    } catch (err) {
      console.error("Failed to load next exercise:", err);
      toast.error("Không thể tải bài tập tiếp theo. Đang quay về danh sách.");
      router.push("/practice/speaking");
    }
  }, [exerciseId, router]);

  /**
   * Browser SpeechSynthesis fallback when neural TTS server is unreachable.
   */
  const fallbackBrowserTTS = () => {
    if (
      !exercise?.targetText ||
      typeof window === "undefined" ||
      !("speechSynthesis" in window)
    ) {
      setIsPlayingTTS(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(exercise.targetText);
    utterance.rate = Number(ttsRate);
    utterance.lang = ttsAccent === "US" ? "en-US" : "en-GB";

    utterance.onend = () => setIsPlayingTTS(false);
    utterance.onerror = () => setIsPlayingTTS(false);

    window.speechSynthesis.speak(utterance);
  };

  /**
   * Neural TTS playback for target text sample.
   */
  const handleTogglePlayTTS = async () => {
    if (isPlayingTTS) {
      if (ttsAudioElementRef.current) {
        ttsAudioElementRef.current.pause();
        ttsAudioElementRef.current = null;
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingTTS(false);
      return;
    }

    if (!exercise?.targetText) return;

    setIsPlayingTTS(true);

    try {
      const blob = await speakingService.generateTts(
        exercise.targetText,
        ttsAccent,
        ttsRate,
      );

      const objectUrl = URL.createObjectURL(blob);
      const audio = new Audio(objectUrl);
      ttsAudioElementRef.current = audio;

      audio.onended = () => {
        setIsPlayingTTS(false);
        URL.revokeObjectURL(objectUrl);
      };

      audio.onerror = () => {
        setIsPlayingTTS(false);
        URL.revokeObjectURL(objectUrl);
        fallbackBrowserTTS();
      };

      await audio.play();
    } catch {
      fallbackBrowserTTS();
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
      if (e.key === " " || e.code === "Space" || e.key === "r" || e.key === "R") {
        e.preventDefault();
      }

      if (phase === "READY") {
        startRecording();
      } else if (phase === "RECORDING") {
        stopRecording();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    exitDialogProps?.isOpen,
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

    setSelectedWordForLookup(word);
  };

  const handleReportIssue = () => {
    const subject = `Báo lỗi bài luyện nói: ${exercise?.title ?? ""}`;
    const body = [
      "Tôi cần báo lỗi bài luyện nói này.",
      "",
      `Bài luyện: ${exercise?.title ?? ""}`,
      `Nội dung: ${exercise?.targetText ?? "Không có"}`,
      `Đường dẫn: ${window.location.href}`,
      "",
      "Mô tả lỗi chi tiết:",
    ].join("\n");

    window.location.href = `mailto:luamoi2014@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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
            ? "text-2xl sm:text-3xl md:text-4xl lg:text-[2.5rem] xl:text-[2.75rem] text-slate-900 leading-snug py-2 px-2 max-w-5xl xl:max-w-6xl mx-auto"
            : "text-2xl sm:text-3xl md:text-3xl lg:text-4xl text-slate-900 leading-snug py-3 px-1 max-w-2xl mx-auto"
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
            ? "bg-white border-2 border-slate-200/90 text-slate-900 hover:bg-amber-100 hover:text-amber-900 hover:scale-105 active:scale-95 hover:border-amber-300 shadow-xs px-3 py-1 sm:px-3.5 sm:py-1.5 m-0.5 sm:m-1 rounded-xl sm:rounded-2xl"
            : "bg-white border border-slate-200/90 text-slate-900 hover:bg-amber-100 hover:text-amber-800 hover:scale-105 active:scale-95 hover:border-amber-300 shadow-2xs px-3 py-1 m-1 rounded-2xl";
          let tooltip = `Nhấn để tra từ điển & phát âm: "${cleanLookupWord}"`;

          if (!isStage1Mode && wordsAssessment && Array.isArray(wordsAssessment)) {
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
              onClick={() => setSelectedWordForLookup(cleanLookupWord)}
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

  if (isLoading || !minLaunchReady) {
    return (
      <div className="fixed inset-0 z-[45] w-screen h-[100dvh] flex items-center justify-center bg-white">
        <PracticeLoadingScreen skill="speaking" className="max-w-4xl" />
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="fixed inset-0 z-[45] w-screen h-[100dvh] flex flex-col items-center justify-center bg-white p-8 text-center">
        <p className="text-base font-bold text-slate-700">
          Không tìm thấy bài tập phát âm.
        </p>
        <button
          type="button"
          onClick={() => confirmExit("/practice/speaking")}
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-500 px-5 text-sm font-extrabold text-white hover:bg-amber-600 cursor-pointer"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Quay lại danh sách
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[45] w-screen h-[100dvh] flex flex-col bg-white overflow-hidden select-none font-sans">
      {/* 1. Full-Width Top Exam Header */}
      <header className="w-full h-14 bg-slate-900 text-white px-4 md:px-6 flex items-center justify-between shrink-0 select-none border-b border-slate-800 z-30">
        {/* Left: Thoát button + Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => confirmExit("/practice/speaking")}
            className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Thoát</span>
          </button>

          <span className="text-slate-600 hidden sm:inline">|</span>

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-bold text-slate-100 truncate max-w-[200px] sm:max-w-[320px] md:max-w-[480px]">
              {exercise.title}
            </span>
            <span className="shrink-0 rounded bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
              {exercise.difficulty}
            </span>
            <span className="hidden sm:inline-block shrink-0 rounded bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] font-bold text-slate-300 uppercase tracking-wider">
              {exercise.category}
            </span>
          </div>
        </div>

        {/* Right: Utility Tools + Live Mode Badge */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Song ngữ toggle */}
          <button
            type="button"
            onClick={() => setIsBilingual((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
              isBilingual
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
            }`}
            title="Bật / tắt chế độ dịch nghĩa song ngữ"
            aria-pressed={isBilingual}
          >
            <Languages size={14} />
            <span className="hidden md:inline">Song ngữ</span>
          </button>

          {/* Ghi chú pill */}
          <button
            type="button"
            onClick={() => setShowNotesModal(true)}
            className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Ghi chú bài học"
          >
            <StickyNote size={14} />
            <span className="hidden md:inline">Ghi chú</span>
          </button>

          {/* Phím tắt pill with popover */}
          <div className="relative" ref={shortcutsRef}>
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
              <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl z-50 text-slate-800 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2.5">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Phím tắt nhanh
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowShortcuts(false)}
                    className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
                <ul className="space-y-2 text-xs font-medium text-slate-600">
                  <li className="flex items-center justify-between">
                    <span>Bắt đầu / Dừng thu âm:</span>
                    <kbd className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800">
                      Space
                    </kbd>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Phím thu âm phụ:</span>
                    <kbd className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800">
                      R
                    </kbd>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Quy trình tự động:</span>
                    <span className="text-[10px] text-amber-700 font-bold">
                      Dừng &rarr; Chấm điểm ngay
                    </span>
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Âm thanh SFX toggle */}
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

          {/* Mode Pill */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-lg bg-slate-800 border border-slate-700 px-3 py-1 text-xs font-bold text-amber-400 shrink-0">
            <Activity size={13} className="text-amber-400" />
            <span>Đánh giá phát âm</span>
          </div>
        </div>
      </header>

      {/* 2. Main Workspace: Dynamic Two-Stage Morphing Architecture */}
      {isStage1 ? (
        /* STAGE 1: FOCUSED RECORDING MODE (Single Centered Stage, Zero Gutters) */
        <main className="flex-1 w-full flex flex-col justify-between overflow-y-auto bg-slate-50/40 p-3 sm:p-4 lg:p-5 min-h-0">
          <div className="max-w-5xl xl:max-w-6xl mx-auto w-full flex-1 flex flex-col items-center justify-center gap-3 sm:gap-4 my-auto">
            {/* Focal mode badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-100/90 text-amber-900 text-xs font-black uppercase tracking-wider shadow-2xs">
              <Target size={13} className="text-amber-700" />
              <span>Câu cần luyện đọc</span>
            </div>

            {/* Contextual Illustration Image (if available) */}
            {exercise.imageUrl && (
              <div className="w-full max-w-xs flex items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xs shrink-0 max-h-[120px]">
                <img
                  src={exercise.imageUrl}
                  alt="Contextual illustration"
                  className="w-full h-full object-contain max-h-[110px] rounded-xl"
                />
              </div>
            )}

            {/* 1. Practice Sentence Canvas (Widened horizontal stretch, compact vertical padding) */}
            <div className="w-full bg-gradient-to-b from-white to-slate-50/60 py-4 px-5 sm:py-5 sm:px-8 lg:px-10 rounded-3xl border-2 border-slate-200/90 shadow-sm flex flex-col items-center justify-center">
              {renderInteractiveTargetWords(exercise.targetText, undefined, true)}

              {/* Optional Bilingual translation box */}
              {isBilingual && (exercise.translation || exercise.description) && (
                <div className="mt-2.5 w-full max-w-2xl rounded-2xl border border-amber-200/80 bg-amber-50/80 px-3.5 py-2 text-slate-800 text-center shadow-2xs">
                  <span className="font-black text-amber-950 block uppercase tracking-wider text-xs">
                    Bản dịch tham khảo
                  </span>
                  <p className="font-semibold text-slate-800 italic text-sm sm:text-base">
                    "{exercise.translation || exercise.description}"
                  </p>
                </div>
              )}

              <p className="mt-2.5 text-xs sm:text-sm text-slate-600 font-bold flex items-center justify-center gap-2">
                <BookOpen size={14} className="text-amber-600" />
                <span>Nhấp vào từ bất kỳ để tra phiên âm IPA &amp; nghe phát âm</span>
              </p>
            </div>

            {/* 2. Sample Audio & Speed Dock (POSITIONED DIRECTLY BENEATH THE SENTENCE) */}
            <div className="w-full max-w-2xl bg-white/95 backdrop-blur-xs rounded-2xl border border-slate-200/90 p-2 sm:p-2.5 flex flex-wrap items-center justify-between gap-2.5 shadow-sm">
              {/* Play / Stop sample + Accent */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTogglePlayTTS}
                  aria-pressed={isPlayingTTS}
                  aria-label={isPlayingTTS ? "Dừng nghe mẫu" : "Nghe mẫu phát âm"}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl font-extrabold text-xs sm:text-sm transition-all active:scale-95 cursor-pointer shadow-xs ${
                    isPlayingTTS
                      ? "bg-rose-600 hover:bg-rose-700 text-white"
                      : "bg-slate-900 hover:bg-slate-800 text-white"
                  }`}
                >
                  {isPlayingTTS ? (
                    <>
                      <Square size={13} className="fill-white shrink-0" />
                      <span>Dừng nghe</span>
                    </>
                  ) : (
                    <>
                      <Volume2 size={15} className="shrink-0 text-amber-400" />
                      <span>Nghe câu mẫu</span>
                    </>
                  )}
                </button>

                {/* Accent selector pills */}
                <div
                  className={`flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200 transition-opacity ${
                    isPlayingTTS ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                  role="group"
                  aria-label="Chọn chất giọng đọc"
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
                          isPlayingTTS ? "cursor-not-allowed" : "cursor-pointer"
                        } ${
                          selected
                            ? "bg-amber-500 text-white shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
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
                <div className="flex items-center gap-1 text-slate-700 font-black text-xs sm:text-sm shrink-0">
                  <Gauge size={14} className="text-amber-600" />
                  <span className="hidden sm:inline">Tốc độ:</span>
                </div>
                <div
                  className={`flex items-center gap-1 ${
                    isPlayingTTS ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                  role="group"
                  aria-label="Chọn tốc độ đọc"
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
                          isPlayingTTS ? "cursor-not-allowed" : "cursor-pointer"
                        } ${
                          selected
                            ? "bg-amber-500 text-white font-black shadow-2xs"
                            : "bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200/80"
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
            {phase === "READY" ? (
              <div className="flex flex-col items-center justify-center gap-2 my-1">
                <button
                  type="button"
                  onClick={startRecording}
                  className="size-16 sm:size-20 rounded-full bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center border border-amber-600/20 shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 transition-all cursor-pointer active:scale-95 group"
                  title="Bắt đầu thu âm (Phím Space / R)"
                  aria-label="Bắt đầu thu âm"
                >
                  <Mic size={30} className="transition-transform group-hover:scale-105" />
                </button>
                <div className="text-center space-y-0.5">
                  <p className="text-sm sm:text-base font-black text-slate-900">
                    Nhấn nút Micro hoặc bấm phím <kbd className="px-2 py-0.5 rounded-lg bg-white border border-slate-300 font-mono text-xs font-black text-slate-800 shadow-2xs">Space</kbd> để nói
                  </p>
                  <p className="text-xs sm:text-sm text-slate-600 font-semibold">
                    Hệ thống tự động chuyển sang phân tích &amp; đối chiếu ngay khi dừng
                  </p>
                </div>
              </div>
            ) : (
              <div className="w-full max-w-md bg-white rounded-2xl border border-rose-200 p-4 flex flex-col items-center justify-center gap-3 shadow-xs animate-in fade-in my-1">
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
                    title="Dừng & Chấm điểm (Phím Space / R)"
                    aria-label="Dừng ghi âm và chấm điểm"
                  >
                    <StopCircle size={30} className="transition-transform group-hover:scale-105" />
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelRecording}
                    className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-all cursor-pointer shadow-2xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                    title="Hủy lượt thu âm này"
                  >
                    <X size={14} className="text-rose-500" />
                    <span>Hủy bỏ</span>
                  </button>
                </div>

                <p className="font-bold text-xs sm:text-sm text-rose-600 text-center">
                  Đang thu âm... Bấm nút đỏ hoặc nhấn [Space] để hoàn tất &amp; chấm điểm
                </p>
              </div>
            )}
          </div>

          {/* Collapsible Guidelines Drawer at the bottom */}
          <div className="max-w-5xl xl:max-w-6xl mx-auto w-full mt-3 sm:mt-4 rounded-2xl border border-slate-200/80 bg-white px-3.5 py-2.5 shadow-xs shrink-0">
            <button
              type="button"
              onClick={() => setShowTipsDrawer((v) => !v)}
              className="w-full flex items-center justify-between text-sm font-black text-slate-800 hover:text-slate-900 transition cursor-pointer"
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
              <div className="mt-2.5 border-t border-slate-100 pt-2.5 space-y-2 text-xs sm:text-sm text-slate-700 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="font-black text-sm text-slate-900">1. Độ chính xác</p>
                    <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1 leading-relaxed">
                      Đọc rõ từng từ, đặc biệt là âm cuối (ending sounds).
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="font-black text-sm text-slate-900">2. Độ lưu loát</p>
                    <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1 leading-relaxed">
                      Giữ nhịp điệu tự nhiên, không ngập ngừng quá lâu.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="font-black text-sm text-slate-900">3. Độ toàn vẹn</p>
                    <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1 leading-relaxed">
                      Không bỏ sót từ ngữ nào trong câu văn mẫu.
                    </p>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 font-semibold italic text-center pt-1">
                  Mẹo: Giữ khoảng cách micro 10-15cm và tránh đọc trong phòng có tiếng vang.
                </p>
              </div>
            )}
          </div>
        </main>
      ) : (
        /* STAGE 2: 1:1 COMPARATIVE ANALYSIS STUDIO (50/50 Split Canvas) */
        <main className="flex-1 w-full grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 overflow-hidden min-h-0 transition-all duration-500">
          {/* Left Panel: Target Text & Context Canvas */}
          <section className="w-full h-full p-5 sm:p-6 lg:p-7 flex flex-col justify-between overflow-y-auto bg-white min-h-0">
            <div className="flex-1 flex flex-col min-h-0">
              {/* Instruction Header */}
              <div className="flex items-center justify-between gap-2 mb-3 shrink-0">
                <div className="space-y-0.5">
                  <p className="text-sm sm:text-base font-black text-slate-900">
                    {phase === "COMPLETED"
                      ? "Kết quả đánh giá phát âm từng từ:"
                      : "Đọc to câu văn bên dưới với phát âm rõ ràng và tự nhiên:"}
                  </p>
                  <p className="text-xs text-slate-500 font-medium">
                    Màu sắc thể hiện mức độ chính xác của từng từ bạn đã phát âm
                  </p>
                </div>
                <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200/80 shrink-0">
                  <Target size={13} className="text-amber-600" />
                  <span>Đối chiếu trực quan</span>
                </div>
              </div>

              {/* Contextual Illustration Image (if available) */}
              {exercise.imageUrl && (
                <div className="w-full flex items-center justify-center my-2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xs shrink-0 max-h-[160px]">
                  <img
                    src={exercise.imageUrl}
                    alt="Contextual illustration"
                    className="w-full h-full object-contain max-h-[145px] rounded-xl"
                  />
                </div>
              )}

              {/* Hero Practice Sentence Canvas with Word-Level Color Grading */}
              <div className="w-full bg-gradient-to-b from-white to-slate-50/50 p-5 sm:p-6 rounded-3xl border-2 border-slate-200/90 shadow-sm my-2 flex flex-col items-center justify-center">
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black uppercase tracking-wider mb-2.5">
                  <Target size={14} className="text-amber-700" />
                  <span>Câu luyện đọc đối chiếu</span>
                </div>

                {renderInteractiveTargetWords(
                  exercise.targetText,
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
                      className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-4 pt-3.5 border-t border-slate-100 text-xs sm:text-sm font-extrabold text-slate-700"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <span className="size-2.5 rounded-full bg-emerald-500 shadow-2xs" />
                        <span className="underline decoration-emerald-500 decoration-2 underline-offset-4 text-emerald-800">
                          Đạt chuẩn (&ge; 80%)
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="size-2.5 rounded-full bg-amber-500 shadow-2xs" />
                        <span className="underline decoration-amber-500 decoration-wavy underline-offset-4 text-amber-900">
                          Cần chỉnh lại (60-79%)
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="size-2.5 rounded-full bg-rose-500 shadow-2xs" />
                        <span className="underline decoration-rose-500 decoration-wavy underline-offset-4 text-rose-800">
                          Chưa đạt (&lt; 60%)
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="size-2.5 rounded-full bg-rose-500 shadow-2xs" />
                        <span className="line-through decoration-rose-500 decoration-2 text-rose-700">
                          Bỏ sót
                        </span>
                      </span>
                    </div>
                  )}

                {/* Optional Bilingual translation box */}
                {isBilingual && (exercise.translation || exercise.description) && (
                  <div className="mt-3.5 w-full max-w-xl rounded-2xl border border-amber-200/90 bg-amber-50/80 p-3.5 text-center shadow-2xs">
                    <span className="font-black text-amber-950 block mb-1 uppercase tracking-wider text-xs">
                      Bản dịch tham khảo
                    </span>
                    <p className="font-semibold text-slate-800 italic text-sm sm:text-base">
                      "{exercise.translation || exercise.description}"
                    </p>
                  </div>
                )}

                {/* Dictionary hint pill */}
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100/90 text-slate-600 text-xs sm:text-sm font-semibold border border-slate-200/80 shadow-2xs">
                  <BookOpen size={14} className="text-amber-600 shrink-0" />
                  <span>Nhấp vào từ bất kỳ để tra nghĩa, phiên âm IPA và nghe cách đọc mẫu</span>
                </div>
              </div>
            </div>

            {/* Collapsible Guidelines Drawer */}
            <div className="mt-auto rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs shrink-0">
              <button
                type="button"
                onClick={() => setShowTipsDrawer((v) => !v)}
                className="w-full flex items-center justify-between text-sm font-black text-slate-800 hover:text-slate-900 transition cursor-pointer"
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
                <div className="mt-2.5 border-t border-slate-100 pt-2.5 space-y-2 text-xs sm:text-sm text-slate-700 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="font-black text-sm text-slate-900">1. Độ chính xác</p>
                      <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1 leading-relaxed">
                        Đọc rõ từng từ, đặc biệt là âm cuối (ending sounds).
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="font-black text-sm text-slate-900">2. Độ lưu loát</p>
                      <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1 leading-relaxed">
                        Giữ nhịp điệu tự nhiên, không ngập ngừng quá lâu.
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="font-black text-sm text-slate-900">3. Độ toàn vẹn</p>
                      <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1 leading-relaxed">
                        Không bỏ sót từ ngữ nào trong câu văn mẫu.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Right Panel: Unified Assessment Studio */}
          <section className="w-full h-full p-4 sm:p-5 lg:p-6 flex flex-col justify-between overflow-y-auto bg-slate-50/40 min-h-0">
            <PronunciationReportCard
              phase={phase}
              submission={currentSubmission}
              targetText={exercise.targetText}
              userAudioUrl={audioUrl}
              qualityWarning={qualityWarning}
              recordingSeconds={recordingSeconds}
              maxRecordingSeconds={MAX_RECORDING_SECONDS}
              canvasRef={canvasRef}
              onStartRecording={startRecording}
              onStopRecording={stopRecording}
              onCancelRecording={handleCancelRecording}
              onRetryRecord={handleRetryRecord}
              onRetrySubmit={handleRetrySubmit}
              onNextExercise={handleNextExercise}
              onSelectWord={(word) => setSelectedWordForLookup(word)}
              onPlaySample={handlePlayIsolatedWordSample}
              ttsAccent={ttsAccent}
              ttsRate={ttsRate}
              isNextAvailable={isNextAvailable}
            />
          </section>
        </main>
      )}

      {/* 3. Full-Width Bottom Action Dock */}
      <footer className="w-full h-14 bg-white border-t border-slate-200 px-4 md:px-6 flex items-center justify-between shrink-0 shadow-sm z-30 select-none">
        {/* Left: Quick utilities */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Báo lỗi */}
          <button
            type="button"
            onClick={handleReportIssue}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            title="Báo cáo bài tập có lỗi"
          >
            <Flag size={15} className="text-rose-500" />
            <span className="hidden sm:inline">Báo lỗi</span>
          </button>

          {/* Tra từ */}
          <button
            type="button"
            onClick={handleDictionaryLookup}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            title="Bôi đen một từ tiếng Anh rồi bấm để tra cứu"
          >
            <BookOpen size={15} className="text-sky-600" />
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
                ? "bg-amber-50 text-amber-800 border border-amber-200"
                : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
            }`}
            title={isSaved ? "Bỏ lưu bài tập" : "Lưu bài tập để luyện lại sau"}
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
          <button
            type="button"
            onClick={() => confirmExit("/practice/speaking")}
            className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer transition-colors text-xs sm:text-sm"
          >
            ← Danh sách bài
          </button>

          {/* Contextual Action Button */}
          {isAnalyzing ? (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm font-bold shadow-xs">
              <Loader2 size={16} className="animate-spin text-amber-600" />
              <span>Đang phân tích...</span>
            </div>
          ) : phase === "READY" ? (
            <button
              type="button"
              onClick={startRecording}
              className="px-4 sm:px-5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-xs hover:shadow-sm active:scale-95 transition-all cursor-pointer inline-flex items-center gap-1.5 text-xs sm:text-sm"
            >
              <Mic size={15} aria-hidden="true" />
              <span>Bắt đầu thu âm</span>
              <kbd className="hidden sm:inline px-1.5 py-0.5 rounded bg-amber-600/60 font-mono text-[10px] text-white">Space</kbd>
            </button>
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
                <span>Dừng &amp; Chấm điểm</span>
                <kbd className="hidden sm:inline px-1.5 py-0.5 rounded bg-rose-700 font-mono text-[10px] text-white">Space</kbd>
              </button>
            </div>
          ) : phase === "COMPLETED" ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRetryRecord}
                className="px-3.5 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm inline-flex items-center gap-1.5 transition-all shadow-xs hover:shadow-sm active:scale-95 cursor-pointer"
              >
                <RotateCcw size={14} aria-hidden="true" />
                <span>Thử đọc lại</span>
              </button>

              <button
                type="button"
                onClick={handleNextExercise}
                className="px-4 sm:px-5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs hover:shadow-sm active:scale-95 transition-all cursor-pointer inline-flex items-center gap-1.5 text-xs sm:text-sm"
              >
                <span>{isNextAvailable ? "Tiếp tục bài sau" : "Về danh sách"}</span>
                <ArrowLeft size={14} className="rotate-180" aria-hidden="true" />
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
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <StickyNote size={18} className="text-amber-500" />
                Ghi chú phát âm
              </h3>
              <button
                type="button"
                onClick={() => setShowNotesModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ghi chú các từ cần luyện tập thêm, mẹo phát âm..."
              rows={6}
              className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800"
            />
            <p className="mt-2 text-xs text-slate-500">
              Ghi chú được lưu tự động trên thiết bị này.
            </p>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowNotesModal(false)}
                className="rounded-xl bg-slate-900 text-white px-4 py-2 text-xs font-bold hover:bg-slate-800 cursor-pointer"
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
        />
      )}

      {/* Shared Exit Confirmation Modal */}
      <PracticeExitConfirmDialog {...exitDialogProps} />
    </div>
  );
}
