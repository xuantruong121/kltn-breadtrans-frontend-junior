"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Gauge,
  Loader2,
  Mic,
  StopCircle,
  Volume2,
  Activity,
  AlertTriangle,
  Target,
  Square,
  Award,
  BookOpen,
} from "lucide-react";
import {
  speakingService,
  SpeakingSubmissionDetail,
} from "@/lib/api/services/speaking.service";
import { BackButton } from "@/components/ui";
import { WordDictionaryPopup } from "@/components/speaking/WordDictionaryPopup";
import { PronunciationReportCard } from "@/components/speaking/PronunciationReportCard";
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
  const audioBuffer = offlineCtx.createBuffer(1, audioData.length, inputSampleRate);
  audioBuffer.getChannelData(0).set(audioData);

  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start(0);

  const renderedBuffer = await offlineCtx.startRendering();
  return renderedBuffer.getChannelData(0);
}

const TTS_SPEED_OPTIONS = [
  { value: 0.5, label: "0.5x", title: "0.5x - Rất chậm: Nghe rõ từng âm vị & khẩu hình" },
  { value: 0.75, label: "0.75x", title: "0.75x - Chậm: Luyện nối âm & ngữ điệu câu" },
  { value: 1.0, label: "1.0x", title: "1.0x - Chuẩn: Tốc độ đàm thoại & chuẩn thi TOEIC" },
  { value: 1.25, label: "1.25x", title: "1.25x - Nhanh: Thử thách phản xạ nghe" },
  { value: 1.5, label: "1.5x", title: "1.5x - Rất nhanh: Tốc độ nâng cao" },
] as const;

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
  const [selectedWordForLookup, setSelectedWordForLookup] = useState<string | null>(null);

  // Submission & Polling State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [currentSubmission, setCurrentSubmission] = useState<SpeakingSubmissionDetail | null>(null);
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { data: exercise, isLoading } = useQuery({
    queryKey: ["speaking-exercise", exerciseId],
    queryFn: () => speakingService.getExerciseById(exerciseId),
    enabled: !!exerciseId,
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
   * Phase 3.1: Starts microphone recording with hardware constraints,
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

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
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
   * Phase 3.1 & 3.2: Stops recording, resamples audio to 16,000 Hz, calculates
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
        setQualityWarning("Âm thanh quá nhỏ hoặc im lặng. Vui lòng nói to và rõ hơn.");
      } else if (clippingRatio > 0.05) {
        setQualityWarning("Âm thanh bị rè hoặc quá gần micro. Hãy giữ khoảng cách phù hợp.");
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
   * Phase 1.3 & 2: Submits audio with Idempotency-Key and polls until completion.
   */
  const handleSubmit = async () => {
    if (!audioBlob) return;

    if (qualityWarning?.includes("im lặng") || qualityWarning?.includes("rỗng")) {
      toast.error("Bản ghi âm không có âm thanh rõ ràng. Vui lòng thu âm lại.");
      return;
    }

    setIsSubmitting(true);
    setIsPolling(true);
    setCurrentSubmission(null);

    try {
      const response = await speakingService.submitAudio(
        exerciseId,
        audioBlob,
      );

      // Start polling submission status
      pollSubmissionStatus(response.submissionId, 0);
    } catch (err: any) {
      setIsSubmitting(false);
      setIsPolling(false);
      const msg = err?.response?.data?.message || "Có lỗi xảy ra khi nộp bài phát âm.";
      toast.error(msg);
    }
  };

  /**
   * Polls GET /speaking/submissions/:id every 1.5s until COMPLETED or FAILED (max 45 polls = ~60s).
   */
  const pollSubmissionStatus = (submissionId: number, attempt: number) => {
    if (attempt > 40) {
      setIsPolling(false);
      setIsSubmitting(false);
      toast.error("Thời gian chấm điểm kéo dài hơn dự kiến. Vui lòng tải lại trang.");
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
            toast.error("Đánh giá phát âm chưa thành công. Bạn vui lòng thử lại.");
          }
        } else {
          // Still PENDING or PROCESSING -> continue polling
          pollSubmissionStatus(submissionId, attempt + 1);
        }
      } catch (err: any) {
        console.error("Polling error:", err);
        // Retry next tick
        pollSubmissionStatus(submissionId, attempt + 1);
      }
    }, 1500);
  };

  /**
   * Phase 5: Neural TTS playback. Locks speed & accent controls while playing.
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
      // 1. Try high-quality Neural TTS from backend
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
      // 2. Fallback to Web Speech API if backend TTS unavailable
      fallbackBrowserTTS();
    }
  };

  const fallbackBrowserTTS = () => {
    if (!exercise?.targetText || typeof window === "undefined" || !("speechSynthesis" in window)) {
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

  /**
   * Phase 4.2: Tokenizes target sentence preserving words, apostrophes, and contractions.
   * Each word is clickable and keyboard accessible for dictionary lookup.
   */
  const renderInteractiveTargetWords = (text: string) => {
    const tokens = text.match(/[\w'-]+|[^\s\w]/g) || [text];

    return (
      <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-2 text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 leading-relaxed px-2 break-words max-w-3xl mx-auto">
        {tokens.map((token, index) => {
          const isWord = /[\w]/.test(token);
          if (!isWord) {
            return (
              <span key={index} className="text-slate-500 font-bold select-none">
                {token}
              </span>
            );
          }

          return (
            <button
              key={`${token}-${index}`}
              type="button"
              onClick={() => setSelectedWordForLookup(token)}
              title={`Nhấn để tra từ điển: "${token}"`}
              className="inline-block rounded-lg px-1.5 py-0.5 transition-all text-slate-900 hover:text-amber-700 hover:bg-amber-100/70 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-amber-50 cursor-pointer"
            >
              {token}
            </button>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-amber-500" size={48} />
      </div>
    );
  }

  if (!exercise) {
    return <div className="text-center mt-12 text-slate-600">Không tìm thấy bài tập phát âm.</div>;
  }

  return (
    <div className="w-full space-y-6 pb-20">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:px-7 rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-4">
          <BackButton href="/practice/speaking" label="Quay lại danh sách bài nói" />
          <div className="h-6 w-px bg-slate-200 hidden sm:block" />
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-800 line-clamp-1">
              {exercise.title}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase">
                {exercise.category}
              </span>
              <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase">
                {exercise.difficulty}
              </span>
            </div>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200/60">
          <Activity size={15} className="text-amber-600" />
          <span>Luyện phát âm chuẩn âm vị quốc tế</span>
        </div>
      </div>

      {/* 3-Column Responsive Layout */}
      <div className="grid grid-cols-12 gap-6 xl:gap-8 items-start">
        {/* LEFT COLUMN: Guidance & Tips */}
        <div className="order-3 lg:order-1 col-span-12 lg:col-span-3 space-y-6">
          {exercise.imageUrl && (
            <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="rounded-2xl overflow-hidden border border-slate-100 max-h-48 mb-2.5">
                <img
                  src={exercise.imageUrl}
                  alt="Exercise illustration"
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-xs text-slate-500 font-semibold text-center">
                Hình ảnh minh họa ngữ cảnh bài nói
              </p>
            </div>
          )}

          {/* Tips Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <Mic size={18} className="text-amber-600" />
              <span>Bí quyết phát âm chuẩn</span>
            </h3>

            <ul className="space-y-3 text-xs sm:text-sm text-slate-700 font-medium">
              <li className="bg-white p-3.5 rounded-2xl border border-slate-200/80 flex items-start gap-3 shadow-2xs">
                <span className="size-6 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                  1
                </span>
                <span>
                  Bấm trực tiếp vào từng từ trên màn hình để <strong>tra từ điển & phiên âm IPA</strong>.
                </span>
              </li>
              <li className="bg-white p-3.5 rounded-2xl border border-slate-200/80 flex items-start gap-3 shadow-2xs">
                <span className="size-6 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                  2
                </span>
                <span>
                  Bấm <strong>Nghe mẫu phát âm</strong> để làm quen ngữ điệu và trọng âm trước khi đọc.
                </span>
              </li>
              <li className="bg-white p-3.5 rounded-2xl border border-slate-200/80 flex items-start gap-3 shadow-2xs">
                <span className="size-6 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                  3
                </span>
                <span>
                  Nói to, rõ ràng, giữ khoảng cách khoảng 10-15cm so với micro của thiết bị.
                </span>
              </li>
            </ul>
          </div>

          {/* Reward Badge Card */}
          <div className="bg-amber-50/80 border border-amber-200 p-5 rounded-3xl flex items-center gap-4 shadow-xs">
            <div className="size-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
              <Award size={24} />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">Phần thưởng luyện nói</p>
              <p className="text-xs font-semibold text-amber-800 mt-0.5">
                Cộng EXP khi đạt điểm &ge; 6.0/10
              </p>
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: Practice Canvas */}
        <div className="order-1 lg:order-2 col-span-12 lg:col-span-6 space-y-6">
          <div className="bg-white p-6 sm:p-8 lg:p-9 rounded-3xl border border-slate-200/90 shadow-sm space-y-6">
            {/* Target Text Card with Interactive Word Lookup */}
            <div className="bg-gradient-to-b from-amber-50/40 via-orange-50/20 to-white p-6 sm:p-8 rounded-3xl border border-amber-200/70 text-center relative">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold uppercase tracking-wider mb-4">
                <Target size={14} className="text-amber-700" />
                <span>Câu cần luyện đọc</span>
              </div>

              {/* Render interactive words */}
              {renderInteractiveTargetWords(exercise.targetText)}

              <p className="mt-4 text-xs text-slate-400 font-medium flex items-center justify-center gap-1.5">
                <BookOpen size={13} />
                <span>Mẹo: Nhấn vào bất kỳ từ nào để tra cứu nghĩa và nghe đọc mẫu</span>
              </p>
            </div>

            {/* Neural TTS Control Deck */}
            <div className="w-full bg-slate-50/80 rounded-2xl border border-slate-200/90 p-4 sm:p-5 flex flex-col gap-3.5 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleTogglePlayTTS}
                  aria-pressed={isPlayingTTS}
                  aria-label={isPlayingTTS ? "Dừng nghe mẫu" : "Nghe mẫu phát âm"}
                  className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all active:scale-95 cursor-pointer shadow-xs ${
                    isPlayingTTS
                      ? "bg-rose-600 hover:bg-rose-700 text-white"
                      : "bg-amber-600 hover:bg-amber-700 text-white"
                  }`}
                >
                  {isPlayingTTS ? (
                    <>
                      <Square size={15} className="fill-white shrink-0" />
                      <span>Dừng phát âm</span>
                    </>
                  ) : (
                    <>
                      <Volume2 size={18} className="shrink-0" />
                      <span>Nghe mẫu phát âm</span>
                    </>
                  )}
                </button>

                {/* Accent selector (locked during playback) */}
                <div
                  className={`flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 transition-opacity ${
                    isPlayingTTS ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                  role="group"
                  aria-label="Chọn chất giọng"
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
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          isPlayingTTS ? "cursor-not-allowed" : "cursor-pointer"
                        } ${
                          selected
                            ? "bg-amber-100 text-amber-900 font-extrabold"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                        title={isPlayingTTS ? "Đang phát âm, tạm khóa chỉnh giọng" : undefined}
                      >
                        {accent === "US" ? "Giọng Mỹ (US)" : "Giọng Anh (UK)"}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Speed rate controls (locked during playback) */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-slate-200/70">
                <div className="flex items-center gap-1.5 text-slate-500 font-bold text-xs shrink-0">
                  <Gauge size={14} className="text-amber-600" />
                  <span>Tốc độ đọc:</span>
                </div>

                <div
                  className={`flex items-center gap-1.5 overflow-x-auto transition-opacity ${
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
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          isPlayingTTS ? "cursor-not-allowed" : "cursor-pointer"
                        } ${
                          selected
                            ? "bg-amber-500 text-white font-extrabold shadow-2xs"
                            : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
                        }`}
                        title={isPlayingTTS ? "Đang phát âm, tạm khóa chỉnh tốc độ" : opt.title}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Recording & Submission Dock */}
            <div className="flex flex-col items-center justify-center gap-5 pt-3">
              {!audioBlob ? (
                <div className="flex flex-col items-center gap-4 w-full max-w-lg mx-auto">
                  {isRecording && (
                    <div className="w-full flex flex-col items-center gap-3">
                      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800 text-white font-mono font-bold text-xs shadow-xs">
                        <span className="size-2.5 rounded-full bg-rose-400 animate-ping" />
                        <span>{formatTime(recordingSeconds)}</span>
                        <span className="text-slate-400">/ 00:45</span>
                      </div>

                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
                        <div
                          className={`h-full transition-all duration-300 ${
                            recordingSeconds > 35 ? "bg-rose-500" : "bg-emerald-500"
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
                    className={`size-24 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      isRecording
                        ? "bg-rose-500 text-white animate-pulse shadow-lg scale-105"
                        : "bg-amber-500 text-white hover:bg-amber-600 hover:scale-105 shadow-md shadow-amber-500/25"
                    }`}
                    title={isRecording ? "Dừng ghi âm" : "Bắt đầu thu âm"}
                    aria-label={isRecording ? "Dừng ghi âm" : "Bắt đầu thu âm"}
                  >
                    {isRecording ? <StopCircle size={40} /> : <Mic size={40} />}
                  </button>

                  <div className="text-center">
                    <p
                      className={`font-bold text-sm ${
                        isRecording ? "text-rose-600" : "text-slate-700"
                      }`}
                    >
                      {isRecording
                        ? "Đang thu âm giọng đọc... Bấm nút để kết thúc"
                        : "Nhấn vào Micro để bắt đầu đọc"}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Mono 16kHz WAV • Tối đa 45s • Không tiếng vang loa
                    </p>
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-lg flex flex-col items-center gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                  <audio src={audioUrl!} controls className="w-full h-11" />

                  {/* Client Quality Warning Banner */}
                  {qualityWarning && (
                    <div className="w-full p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2">
                      <AlertTriangle size={16} className="shrink-0 text-amber-600" />
                      <span>{qualityWarning}</span>
                    </div>
                  )}

                  <div className="flex gap-3 w-full">
                    <button
                      type="button"
                      onClick={() => {
                        setAudioBlob(null);
                        setAudioUrl(null);
                        setQualityWarning(null);
                      }}
                      disabled={isSubmitting}
                      className="flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Thu lại
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isSubmitting || isPolling}
                      className="flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-amber-600 hover:bg-amber-700 shadow-xs transition-all disabled:opacity-70 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isSubmitting || isPolling ? (
                        <>
                          <Loader2 className="animate-spin" size={18} />
                          <span>Đang xử lý...</span>
                        </>
                      ) : (
                        <>
                          <Activity size={18} />
                          <span>Chấm điểm phát âm</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Pronunciation Report Card */}
        <div className="order-2 lg:order-3 col-span-12 lg:col-span-3 space-y-6">
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
    </div>
  );
}
