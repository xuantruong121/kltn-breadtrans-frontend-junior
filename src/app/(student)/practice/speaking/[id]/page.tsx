"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
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
import { WordDictionaryPopup } from "@/components/speaking/WordDictionaryPopup";
import { PronunciationReportCard } from "@/components/speaking/PronunciationReportCard";
import { PracticeLoadingScreen } from "@/components/practice/PracticeLoadingScreen";
import { PracticeExitConfirmDialog } from "@/components/practice/PracticeExitConfirmDialog";
import { usePracticeExitGuard } from "@/hooks/usePracticeExitGuard";
import toast from "react-hot-toast";

/**
 * Encodes linear 16-bit PCM mono samples into a standard RIFF/WAV Blob.
 */
const encodeWAV = (samples: Float32Array, sampleRate = 16000): Blob => {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");

  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat 1 = PCM
  view.setUint16(22, 1, true); // NumChannels = 1 (Mono)
  view.setUint32(24, sampleRate, true); // SampleRate = 16000
  view.setUint32(28, sampleRate * 2, true); // ByteRate = 16000 * 1 * 2 = 32000
  view.setUint16(32, 2, true); // BlockAlign = 1 * 2 = 2
  view.setUint16(34, 16, true); // BitsPerSample = 16

  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);

  for (let i = 0, offset = 44; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([view], { type: "audio/wav" });
};

/**
 * Resamples raw audio data to exactly 16,000 Hz using native OfflineAudioContext.
 */
async function resampleTo16kHz(
  audioData: Float32Array,
  inputSampleRate: number,
): Promise<Float32Array> {
  if (inputSampleRate === 16000) return audioData;
  const targetLength = Math.round((audioData.length * 16000) / inputSampleRate);
  if (targetLength <= 0) return audioData;

  const OfflineCtx =
    window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
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
    title: "0.5x - Rất chậm: Nghe rõ từng âm vị & khẩu hình",
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

/**
 * Pure normalization helper for matching word tokens with assessment items.
 */
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
  const exerciseId = Number(id);
  const queryClient = useQueryClient();

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const MAX_RECORDING_SECONDS = 45;

  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const recordedSamplesRef = useRef<Float32Array[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Audio Quality Metrics State
  const [qualityWarning, setQualityWarning] = useState<string | null>(null);

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [currentSubmission, setCurrentSubmission] =
    useState<SpeakingSubmissionDetail | null>(null);
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Modern Exam toolbar & utilities state
  const [isBilingual, setIsBilingual] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showTipsDrawer, setShowTipsDrawer] = useState(false);
  const [notes, setNotes] = useState("");
  const [soundMuted, setSoundMuted] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loadedUtilityId, setLoadedUtilityId] = useState<number | null>(null);

  const shortcutsRef = useRef<HTMLDivElement | null>(null);

  const showToast = (message: string, duration = 3000) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), duration);
  };

  // Persistent notes & saved exercise state
  useEffect(() => {
    if (!exerciseId) return;

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

  const [minLaunchReady, setMinLaunchReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMinLaunchReady(true), 350);
    return () => clearTimeout(timer);
  }, []);

  const isCompleted = currentSubmission?.status === "COMPLETED";
  const shouldConfirmExit = !isCompleted;

  const { confirmExit, exitDialogProps } = usePracticeExitGuard({
    shouldConfirmExit,
    defaultFallbackUrl: "/practice/speaking",
    enabled: !!exerciseId,
    onConfirmExit: () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    },
  });

  // Clean up resources on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (pollingTimerRef.current) clearTimeout(pollingTimerRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      if (ttsAudioElementRef.current) {
        ttsAudioElementRef.current.pause();
        ttsAudioElementRef.current = null;
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [audioUrl]);

  /**
   * Starts microphone recording with hardware constraints,
   * ZERO speaker loopback, and mono audio capture.
   */
  const startRecording = async () => {
    try {
      setQualityWarning(null);
      setRecordingSeconds(0);
      recordedSamplesRef.current = [];

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
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        recordedSamplesRef.current.push(new Float32Array(inputData));
      };

      // Connect to a Zero-Gain node to avoid microphone audio feeding back into speakers!
      const zeroGain = audioCtx.createGain();
      zeroGain.gain.value = 0.0;

      source.connect(processor);
      processor.connect(zeroGain);
      zeroGain.connect(audioCtx.destination);

      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      toast.error(
        "Không thể truy cập Microphone. Vui lòng kiểm tra và cấp quyền micro trong cài đặt trình duyệt.",
      );
    }
  };

  /**
   * Stops recording, resamples audio to 16,000 Hz, calculates
   * client-side quality metrics (RMS, peak, clipping, silence), and produces WAV.
   */
  const stopRecording = useCallback(async () => {
    setIsRecording(false);

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      const inputSampleRate = audioContextRef.current.sampleRate || 44100;
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;

      const chunks = recordedSamplesRef.current;
      let totalLength = 0;
      for (const chunk of chunks) totalLength += chunk.length;

      if (totalLength === 0) {
        setQualityWarning("Bản ghi âm rỗng. Vui lòng bấm micro và đọc lại.");
        return;
      }

      const merged = new Float32Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }

      // 1. Resample to exactly 16,000 Hz via native Web Audio API
      let resampled: Float32Array<any> = merged;
      try {
        resampled = await resampleTo16kHz(merged, inputSampleRate);
      } catch (resampleErr) {
        console.warn("OfflineAudioContext resampling fallback:", resampleErr);
      }

      // 2. Client-side quality inspection
      let sumSquares = 0;
      let peak = 0;
      let clippingCount = 0;

      for (let i = 0; i < resampled.length; i++) {
        const val = Math.abs(resampled[i]);
        sumSquares += val * val;
        if (val > peak) peak = val;
        if (val >= 0.99) clippingCount++;
      }

      const rms = Math.sqrt(sumSquares / resampled.length);
      const clippingRatio = clippingCount / resampled.length;

      if (peak < 0.01 || rms < 0.001) {
        setQualityWarning(
          "Âm thanh quá nhỏ hoặc im lặng. Vui lòng nói to và rõ hơn.",
        );
      } else if (clippingRatio > 0.05) {
        setQualityWarning(
          "Âm thanh bị rè hoặc quá gần micro. Hãy giữ khoảng cách phù hợp.",
        );
      } else {
        setQualityWarning(null);
      }

      // 3. Encode into 16-bit PCM WAV
      const wavBlob = encodeWAV(resampled, 16000);
      setAudioBlob(wavBlob);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(URL.createObjectURL(wavBlob));
    }
  }, [audioUrl]);

  // Countdown timer during recording (max 45s)
  useEffect(() => {
    if (isRecording) {
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
  }, [isRecording, stopRecording]);

  /**
   * Submits audio with Idempotency-Key and polls until completion.
   */
  const handleSubmit = async () => {
    if (!audioBlob) return;

    if (
      qualityWarning?.includes("im lặng") ||
      qualityWarning?.includes("rỗng")
    ) {
      toast.error("Bản ghi âm không có âm thanh rõ ràng. Vui lòng thu âm lại.");
      return;
    }

    setIsSubmitting(true);
    setIsPolling(true);
    setCurrentSubmission(null);

    try {
      const response = await speakingService.submitAudio(exerciseId, audioBlob);
      pollSubmissionStatus(response.submissionId, 0);
    } catch (err: any) {
      setIsSubmitting(false);
      setIsPolling(false);
      const msg =
        err?.response?.data?.message || "Có lỗi xảy ra khi nộp bài phát âm.";
      toast.error(msg);
    }
  };

  /**
   * Polls GET /speaking/submissions/:id every 1.5s until COMPLETED or FAILED.
   */
  const pollSubmissionStatus = (submissionId: number, attempt: number) => {
    if (attempt > 40) {
      setIsPolling(false);
      setIsSubmitting(false);
      toast.error(
        "Thời gian chấm điểm kéo dài hơn dự kiến. Vui lòng tải lại trang.",
      );
      return;
    }

    pollingTimerRef.current = setTimeout(async () => {
      try {
        const sub = await speakingService.getSubmission(submissionId);
        setCurrentSubmission(sub);

        if (sub.status === "COMPLETED" || sub.status === "FAILED") {
          setIsPolling(false);
          setIsSubmitting(false);

          if (sub.status === "COMPLETED") {
            toast.success("Đã hoàn thành đánh giá phát âm!");
            queryClient.invalidateQueries({ queryKey: ["daily-quests"] });
            queryClient.invalidateQueries({ queryKey: ["user-stats"] });
            queryClient.invalidateQueries({ queryKey: ["myPet"] });
          } else {
            toast.error(
              "Đánh giá phát âm chưa thành công. Bạn vui lòng thử lại.",
            );
          }
        } else {
          pollSubmissionStatus(submissionId, attempt + 1);
        }
      } catch (err: any) {
        console.error("Polling error:", err);
        pollSubmissionStatus(submissionId, attempt + 1);
      }
    }, 1500);
  };

  /**
   * Neural TTS playback. Locks speed & accent controls while playing.
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
      const audioBlob = await speakingService.generateTts(
        exercise.targetText,
        ttsAccent,
        ttsRate,
      );

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      ttsAudioElementRef.current = audio;

      audio.onended = () => {
        setIsPlayingTTS(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setIsPlayingTTS(false);
        URL.revokeObjectURL(audioUrl);
        fallbackBrowserTTS();
      };

      await audio.play();
    } catch {
      fallbackBrowserTTS();
    }
  };

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

  const handlePlayIsolatedWordSample = (word: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.rate = Number(ttsRate);
      utterance.lang = ttsAccent === "US" ? "en-US" : "en-GB";
      window.speechSynthesis.speak(utterance);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
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
   * Renders interactive target sentence tokens with in-context phonetic highlighting.
   */
  const renderInteractiveTargetWords = (
    text: string,
    wordsAssessment?: WordAssessmentItem[],
  ) => {
    const tokens = text.match(WORD_TOKEN_REGEX) || [text];
    let wordIndex = 0;

    return (
      <div className="flex flex-wrap items-center justify-center gap-x-2.5 sm:gap-x-3 gap-y-2 text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 leading-relaxed px-3 break-words max-w-2xl mx-auto py-2">
        {tokens.map((token, index) => {
          const isWord = IS_WORD_REGEX.test(token);
          if (!isWord) {
            return (
              <span
                key={index}
                className="text-slate-500 font-bold select-none"
              >
                {token}
              </span>
            );
          }

          const cleanLookupWord =
            token.trim().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "") ||
            token;

          let wordStyle =
            "text-slate-900 hover:text-amber-700 hover:bg-amber-100/70 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-amber-50";
          let tooltip = `Nhấn để tra từ điển: "${cleanLookupWord}"`;

          if (wordsAssessment && Array.isArray(wordsAssessment)) {
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
              const needsImprovement =
                !isTokenMismatch && !isOmitted && !isUnassessed && !isCorrect;

              if (isOmitted) {
                wordStyle =
                  "text-rose-600 line-through decoration-rose-500 decoration-2 opacity-80 hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-400";
                tooltip = `"${cleanLookupWord}": Bỏ sót hoặc chưa đọc - Nhấn để tra từ điển`;
              } else if (isUnassessed) {
                wordStyle =
                  "text-slate-600 underline decoration-slate-400 decoration-dashed decoration-2 underline-offset-8 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400";
                tooltip = `"${cleanLookupWord}": Chưa có dữ liệu chấm điểm - Nhấn để tra từ điển`;
              } else if (isCorrect) {
                wordStyle =
                  "text-emerald-700 underline decoration-emerald-400 decoration-2 underline-offset-8 hover:bg-emerald-50 hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-400";
                tooltip = `"${cleanLookupWord}": Phát âm chuẩn (${item.accuracyScore}%) - Nhấn để tra từ điển`;
              } else if (needsImprovement) {
                wordStyle =
                  "text-amber-800 bg-amber-100/70 rounded-lg px-2 underline decoration-amber-500 decoration-wavy decoration-2 underline-offset-8 hover:bg-amber-200/80 focus:outline-none focus:ring-2 focus:ring-amber-500";
                tooltip = `"${cleanLookupWord}": Cần chỉnh lại (${Number.isFinite(item.accuracyScore) ? `${item.accuracyScore}%` : "chưa chuẩn"}) - Nhấn để tra từ điển`;
              }
            } else {
              wordStyle =
                "text-slate-600 underline decoration-slate-400 decoration-dashed decoration-2 underline-offset-8 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400";
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
              className={`inline-block rounded-xl px-2 py-1 transition-all cursor-pointer ${wordStyle}`}
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
    <div className="fixed inset-0 z-[45] w-screen h-[100dvh] flex flex-col bg-white overflow-hidden select-none font-['Quicksand',sans-serif]">
      {/* 1. Full-Width Top Exam Header */}
      <header className="w-full h-14 bg-slate-900 text-white px-4 md:px-6 flex items-center justify-between shrink-0 select-none border-b border-slate-800 z-30">
        {/* Left: Thoát button + Breadcrumb / Title */}
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
                    <span>Nghe mẫu phát âm:</span>
                    <kbd className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800">
                      Space
                    </kbd>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Bắt đầu / Dừng thu âm:</span>
                    <kbd className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800">
                      R
                    </kbd>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Chấm điểm phát âm:</span>
                    <kbd className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800">
                      Enter
                    </kbd>
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
            <span>Phát âm chuẩn IPA</span>
          </div>
        </div>
      </header>

      {/* 2. Main Split Workspace (50/50 Edge-to-Edge Grid) */}
      <main className="flex-1 w-full grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 overflow-hidden min-h-0">
        {/* Left Panel: Target Text & Context Canvas (50% Width) */}
        <section className="w-full h-full p-6 md:p-8 flex flex-col justify-between overflow-y-auto bg-slate-50/50 min-h-0">
          <div className="flex-1 flex flex-col min-h-0">
            {/* Instruction Header */}
            <p className="text-sm font-medium text-slate-600 mb-3 shrink-0">
              Đọc to câu văn bên dưới với phát âm và ngữ điệu tự nhiên:
            </p>

            {/* Neural TTS Control Bar */}
            <div className="w-full bg-white rounded-2xl border border-slate-200/90 p-3 flex flex-col gap-2.5 shadow-2xs shrink-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleTogglePlayTTS}
                  aria-pressed={isPlayingTTS}
                  aria-label={
                    isPlayingTTS ? "Dừng nghe mẫu" : "Nghe mẫu phát âm"
                  }
                  className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs sm:text-[13px] transition-all active:scale-95 cursor-pointer shadow-xs ${
                    isPlayingTTS
                      ? "bg-rose-600 hover:bg-rose-700 text-white"
                      : "bg-amber-600 hover:bg-amber-700 text-white"
                  }`}
                >
                  {isPlayingTTS ? (
                    <>
                      <Square size={13} className="fill-white shrink-0" />
                      <span>Dừng phát âm</span>
                    </>
                  ) : (
                    <>
                      <Volume2 size={15} className="shrink-0" />
                      <span>Nghe mẫu phát âm</span>
                    </>
                  )}
                </button>

                {/* Accent selector pills */}
                <div
                  className={`flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 transition-opacity ${
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
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
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
              <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1 text-slate-500 font-bold text-[11px] shrink-0">
                  <Gauge size={13} className="text-amber-600" />
                  <span>Tốc độ đọc:</span>
                </div>

                <div
                  className={`flex items-center gap-1 overflow-x-auto ${
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
                        className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all ${
                          isPlayingTTS ? "cursor-not-allowed" : "cursor-pointer"
                        } ${
                          selected
                            ? "bg-amber-500 text-white font-extrabold shadow-2xs"
                            : "bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200/80"
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

            {/* Contextual Illustration Image (if available) */}
            {exercise.imageUrl && (
              <div className="w-full flex items-center justify-center my-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xs shrink-0 max-h-[220px]">
                <img
                  src={exercise.imageUrl}
                  alt="Contextual illustration"
                  className="w-full h-full object-contain max-h-[200px] rounded-xl"
                />
              </div>
            )}

            {/* Target Sentence Card with Interactive Word Lookup */}
            <div className="w-full flex-1 flex flex-col justify-center items-center bg-white p-5 sm:p-7 rounded-2xl border border-slate-200/90 shadow-xs my-3 min-h-[220px]">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold uppercase tracking-wider mb-3">
                <Target size={13} className="text-amber-700" />
                <span>Câu cần luyện đọc</span>
              </div>

              {renderInteractiveTargetWords(
                exercise.targetText,
                currentSubmission?.status === "COMPLETED" &&
                  !currentSubmission?.aiFeedback?.isSilentOrNoSpeech &&
                  currentSubmission?.lastErrorCode !== "NO_SPEECH"
                  ? currentSubmission?.aiFeedback?.words
                  : undefined,
              )}

              {/* In-Context Assessment Legend */}
              {currentSubmission?.status === "COMPLETED" &&
                !currentSubmission?.aiFeedback?.isSilentOrNoSpeech &&
                currentSubmission?.lastErrorCode !== "NO_SPEECH" &&
                Array.isArray(currentSubmission?.aiFeedback?.words) &&
                currentSubmission.aiFeedback.words.length > 0 && (
                  <div
                    role="note"
                    aria-label="Chú thích màu sắc phát âm"
                    className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 mt-3 pt-2.5 border-t border-slate-100 text-xs font-bold text-slate-600"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2.5 rounded-full bg-emerald-500 shadow-2xs" />
                      <span className="underline decoration-emerald-400 decoration-2 underline-offset-4 text-emerald-800">
                        Đạt chuẩn (&ge; 80%)
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2.5 rounded-full bg-amber-500 shadow-2xs" />
                      <span className="underline decoration-amber-500 decoration-wavy underline-offset-4 text-amber-900">
                        Cần chỉnh lại
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2.5 rounded-full bg-rose-500 shadow-2xs" />
                      <span className="line-through decoration-rose-500 decoration-2 text-rose-700">
                        Bỏ sót
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2.5 rounded-full bg-slate-400 shadow-2xs" />
                      <span className="underline decoration-slate-400 decoration-dashed underline-offset-4 text-slate-600">
                        Chưa xác định
                      </span>
                    </span>
                  </div>
                )}

              {/* Optional Bilingual translation box */}
              {isBilingual && (exercise.translation || exercise.description) && (
                <div className="mt-3 w-full rounded-xl border border-amber-200/80 bg-amber-50/60 p-3 text-xs text-slate-700 text-center">
                  <span className="font-bold text-amber-900 block mb-0.5">
                    Bản dịch tham khảo:
                  </span>
                  <p className="italic text-slate-800">
                    {exercise.translation || exercise.description}
                  </p>
                </div>
              )}

              <p className="mt-3 text-xs text-slate-400 font-medium flex items-center justify-center gap-1.5">
                <BookOpen size={13} />
                <span>Nhấp vào từ bất kỳ để tra phiên âm IPA &amp; nghĩa</span>
              </p>
            </div>
          </div>

          {/* Collapsible Guidelines Drawer (Bottom) */}
          <div className="mt-auto rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-xs shrink-0">
            <button
              type="button"
              onClick={() => setShowTipsDrawer((v) => !v)}
              className="w-full flex items-center justify-between text-xs font-bold text-slate-700 hover:text-slate-900 transition cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <HelpCircle size={15} className="text-amber-600" />
                <span>Tiêu chuẩn đánh giá IPA &amp; Mẹo thu âm</span>
              </span>
              <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
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
              <div className="mt-3 border-t border-slate-100 pt-3 space-y-2.5 text-xs text-slate-600 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="font-bold text-slate-800">1. Độ chính xác</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Đọc rõ từng âm tiết, đặc biệt là âm đuôi (ending sounds).
                    </p>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="font-bold text-slate-800">2. Độ lưu loát</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Giữ nhịp điệu tự nhiên, không ngập ngừng quá lâu.
                    </p>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="font-bold text-slate-800">3. Độ toàn vẹn</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Không bỏ sót từ ngữ nào trong câu văn mẫu.
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 italic text-center pt-1">
                  Mẹo: Giữ khoảng cách micro 10-15cm và tránh đọc trong phòng có tiếng vang.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Right Panel: Recording Studio & Evaluation Report (50% Width) */}
        <section className="w-full h-full p-6 md:p-10 flex flex-col justify-between overflow-y-auto bg-white min-h-0">
          <div className="flex-1 flex flex-col min-h-0">
            {/* Header Tracker */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4 shrink-0">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                PHÒNG THU ÂM &amp; ĐÁNH GIÁ PHÁT ÂM
              </span>

              {isCompleted && (
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold border border-emerald-200 bg-emerald-50 text-emerald-700">
                  <Check size={12} aria-hidden="true" /> Đã hoàn thành
                </span>
              )}
            </div>

            {/* Recording Dock Station */}
            <div className="mb-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 flex flex-col items-center justify-center gap-3 shrink-0">
              {!audioBlob ? (
                <div className="flex flex-col items-center gap-2.5 w-full max-w-sm mx-auto">
                  {isRecording && (
                    <div className="w-full flex flex-col items-center gap-1.5">
                      <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-slate-800 text-white font-mono font-bold text-xs shadow-xs">
                        <span className="size-2.5 rounded-full bg-rose-400 animate-ping" />
                        <span>{formatTime(recordingSeconds)}</span>
                        <span className="text-slate-400">/ 00:45</span>
                      </div>

                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            recordingSeconds > 35
                              ? "bg-rose-500"
                              : "bg-emerald-500"
                          }`}
                          style={{
                            width: `${(recordingSeconds / MAX_RECORDING_SECONDS) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`size-18 sm:size-20 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95 ${
                      isRecording
                        ? "bg-rose-500 text-white animate-pulse shadow-rose-500/30 scale-105"
                        : "bg-amber-500 text-white hover:bg-amber-600 hover:scale-105 shadow-amber-500/25"
                    }`}
                    title={isRecording ? "Dừng ghi âm" : "Bắt đầu thu âm"}
                    aria-label={
                      isRecording ? "Dừng ghi âm" : "Bắt đầu thu âm"
                    }
                  >
                    {isRecording ? (
                      <StopCircle size={32} />
                    ) : (
                      <Mic size={32} />
                    )}
                  </button>

                  <div className="text-center">
                    <p
                      className={`font-bold text-xs sm:text-sm ${
                        isRecording ? "text-rose-600" : "text-slate-700"
                      }`}
                    >
                      {isRecording
                        ? "Đang thu âm giọng đọc... Bấm nút để kết thúc"
                        : "Nhấn vào Micro để bắt đầu đọc"}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Mono 16kHz WAV • Tối đa 45s • Không lẫn tiếng vang
                    </p>
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-md flex flex-col items-center gap-2.5">
                  <audio src={audioUrl!} controls className="w-full h-9" />

                  {/* Quality warning banner */}
                  {qualityWarning && (
                    <div className="w-full p-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] flex items-center gap-1.5">
                      <AlertTriangle
                        size={15}
                        className="shrink-0 text-amber-600"
                      />
                      <span>{qualityWarning}</span>
                    </div>
                  )}

                  <div className="flex gap-2 w-full">
                    <button
                      type="button"
                      onClick={() => {
                        setAudioBlob(null);
                        setAudioUrl(null);
                        setQualityWarning(null);
                      }}
                      disabled={isSubmitting || isPolling}
                      className="flex-1 py-2 px-3 rounded-xl font-bold text-xs sm:text-sm text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Thu lại
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isSubmitting || isPolling}
                      className="flex-1 py-2 px-3 rounded-xl font-bold text-xs sm:text-sm text-white bg-amber-600 hover:bg-amber-700 shadow-xs transition-all disabled:opacity-70 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {isSubmitting || isPolling ? (
                        <>
                          <Loader2 className="animate-spin" size={15} />
                          <span>Đang phân tích...</span>
                        </>
                      ) : (
                        <>
                          <Activity size={15} />
                          <span>Chấm điểm phát âm</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Embedded Evaluation Scorecard */}
            <div className="flex-1 flex flex-col min-h-0">
              <PronunciationReportCard
                submission={currentSubmission}
                targetText={exercise.targetText}
                isPolling={isPolling}
                onRetry={handleSubmit}
                onSelectWord={(word) => setSelectedWordForLookup(word)}
                onPlaySample={handlePlayIsolatedWordSample}
                userAudioUrl={audioUrl}
              />
            </div>
          </div>
        </section>
      </main>

      {/* 3. Full-Width Bottom Action Dock */}
      <footer className="w-full h-16 bg-white border-t border-slate-200 px-4 md:px-6 flex items-center justify-between shrink-0 shadow-sm z-30 select-none">
        {/* Left: Quick utilities */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Báo lỗi */}
          <button
            type="button"
            onClick={handleReportIssue}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            title="Báo cáo bài tập có lỗi"
          >
            <Flag size={15} className="text-rose-500" />
            <span className="hidden sm:inline">Báo lỗi</span>
          </button>

          {/* Tra từ */}
          <button
            type="button"
            onClick={handleDictionaryLookup}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
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
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
              isSaved
                ? "bg-amber-50 text-amber-700 border border-amber-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
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
          <div className="absolute left-1/2 -translate-x-1/2 bottom-20 z-50 rounded-xl bg-slate-900 text-white px-4 py-2 text-xs font-bold shadow-lg animate-in fade-in zoom-in-95 duration-150">
            {toastMessage}
          </div>
        )}

        {/* Right Navigation Dock */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => confirmExit("/practice/speaking")}
            className="px-3.5 sm:px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer transition-colors text-sm"
          >
            ← Danh sách bài
          </button>

          {/* Dynamic Contextual Action */}
          {!audioBlob && !isRecording ? (
            <button
              type="button"
              onClick={startRecording}
              className="px-5 sm:px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-sm transition-all active:scale-95 cursor-pointer inline-flex items-center gap-2 text-sm"
            >
              <Mic size={16} aria-hidden="true" />
              <span>Bắt đầu thu âm</span>
            </button>
          ) : isRecording ? (
            <button
              type="button"
              onClick={stopRecording}
              className="px-5 sm:px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-sm transition-all active:scale-95 cursor-pointer inline-flex items-center gap-2 text-sm"
            >
              <StopCircle size={16} aria-hidden="true" />
              <span>Dừng thu âm</span>
            </button>
          ) : !isCompleted ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || isPolling}
              className="px-5 sm:px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-sm transition-all active:scale-95 disabled:opacity-70 cursor-pointer inline-flex items-center gap-2 text-sm"
            >
              {isSubmitting || isPolling ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  <span>Đang chấm điểm...</span>
                </>
              ) : (
                <>
                  <Activity size={16} aria-hidden="true" />
                  <span>Chấm điểm phát âm</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setAudioBlob(null);
                setAudioUrl(null);
                setCurrentSubmission(null);
                setQualityWarning(null);
              }}
              className="px-5 sm:px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm transition-all active:scale-95 cursor-pointer inline-flex items-center gap-2 text-sm"
            >
              <RotateCcw size={16} aria-hidden="true" />
              <span>Luyện lại câu này</span>
            </button>
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
              placeholder="Ghi chú các âm vị, trọng âm hoặc mẹo ngữ điệu..."
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
