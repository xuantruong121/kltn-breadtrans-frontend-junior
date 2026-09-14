"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  SpeakingSubmissionDetail,
  WordAssessmentItem,
  speakingService,
} from "@/lib/api/services/speaking.service";
import type { SpeakingAttemptPhase } from "@/lib/speaking/speakingPracticeLogic";
import {
  formatSpeakingTime,
  formatAudioTime,
  getAccuracyTier,
  getSpeakingScoreLabel,
  getWordDiagnosticDetails,
  RHYTHM_GUIDANCE_TEXT,
} from "@/lib/speaking/speakingPracticeLogic";
import {
  AlertTriangle,
  RefreshCw,
  Volume2,
  Award,
  Loader2,
  Activity,
  Play,
  Pause,
  BookOpen,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  Headphones,
  Mic,
  Flame,
  StopCircle,
  X,
  Target,
} from "lucide-react";

export interface PronunciationReportCardProps {
  phase: SpeakingAttemptPhase;
  submission: SpeakingSubmissionDetail | null;
  targetText: string;
  userAudioUrl?: string | null;
  qualityWarning?: string | null;
  recordingSeconds?: number;
  maxRecordingSeconds?: number;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  onCancelRecording?: () => void;
  onRetryRecord: () => void;
  onRetrySubmit?: () => void;
  onNextExercise?: () => void;
  onSelectWord?: (word: string) => void;
  onPlaySample?: (word: string) => void;
  ttsAccent?: "US" | "UK";
  ttsRate?: number;
  isNextAvailable?: boolean;
}

/**
 * Renders a circular progress SVG ring with high contrast and smooth dashoffset.
 */
const CircularGauge: React.FC<{
  value: number;
  colorClass: string;
  trailColorClass?: string;
  size?: number;
}> = ({
  value,
  colorClass,
  trailColorClass = "text-slate-100",
  size = 68,
}) => {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = Math.min(100, Math.max(0, value));
  const offset = circumference - (clampedValue / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className={trailColorClass}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`${colorClass} transition-all duration-700 ease-out`}
          fill="transparent"
        />
      </svg>
      <span className="absolute font-black text-sm sm:text-base text-slate-900">
        {Math.round(clampedValue)}%
      </span>
    </div>
  );
};

export const PronunciationReportCard: React.FC<PronunciationReportCardProps> = ({
  phase,
  submission,
  targetText,
  userAudioUrl,
  qualityWarning,
  recordingSeconds = 0,
  canvasRef,
  onStartRecording,
  onStopRecording,
  onCancelRecording,
  onRetryRecord,
  onRetrySubmit,
  onNextExercise,
  onSelectWord,
  onPlaySample,
  ttsAccent = "US",
  ttsRate = 1.0,
  isNextAvailable = true,
}) => {
  const [selectedWordIndex, setSelectedWordIndex] = useState<number | null>(null);

  // Comparative Dual Audio Player State
  const [isComparing, setIsComparing] = useState(false);
  const [comparingTrack, setComparingTrack] = useState<"native" | "learner" | null>(null);

  // Native Track State
  const nativeAudioRef = useRef<HTMLAudioElement | null>(null);
  const [nativeSrc, setNativeSrc] = useState<string | null>(null);
  const [isPlayingNative, setIsPlayingNative] = useState(false);
  const [nativeCurrentTime, setNativeCurrentTime] = useState(0);
  const [nativeDuration, setNativeDuration] = useState(0);
  const [isLoadingNative, setIsLoadingNative] = useState(false);

  // Learner Track State
  const learnerAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingLearner, setIsPlayingLearner] = useState(false);
  const [learnerCurrentTime, setLearnerCurrentTime] = useState(0);
  const [learnerDuration, setLearnerDuration] = useState(0);

  const activeLearnerSrc = userAudioUrl || submission?.audioUrl || null;

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (nativeSrc && nativeSrc.startsWith("blob:")) {
        URL.revokeObjectURL(nativeSrc);
      }
    };
  }, [nativeSrc]);

  // Key focus words in the sentence for prep preview
  const keyWords = useMemo(() => {
    if (!targetText) return [];
    const tokens = targetText
      .split(/\s+/)
      .map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""))
      .filter((w) => w.length >= 4);
    return Array.from(new Set(tokens)).slice(0, 5);
  }, [targetText]);

  // Fetch or generate native TTS audio
  const getOrFetchNativeAudio = useCallback(async (): Promise<HTMLAudioElement | null> => {
    if (nativeAudioRef.current && nativeSrc) {
      return nativeAudioRef.current;
    }
    try {
      setIsLoadingNative(true);
      const blob = await speakingService.generateTts(targetText, ttsAccent, ttsRate);
      const objectUrl = URL.createObjectURL(blob);
      setNativeSrc(objectUrl);
      setIsLoadingNative(false);

      const audio = new Audio(objectUrl);
      nativeAudioRef.current = audio;

      audio.onloadedmetadata = () => {
        setNativeDuration(audio.duration || 0);
      };
      audio.ontimeupdate = () => {
        setNativeCurrentTime(audio.currentTime);
      };

      return audio;
    } catch (err) {
      console.error("Failed to load native reference audio:", err);
      setIsLoadingNative(false);
      return null;
    }
  }, [targetText, ttsAccent, ttsRate, nativeSrc]);

  // Handle single track playback for Native audio
  const handleTogglePlayNative = async () => {
    if (isComparing) {
      stopComparativePlayback();
    }
    const audio = await getOrFetchNativeAudio();
    if (!audio) return;

    if (isPlayingNative) {
      audio.pause();
      setIsPlayingNative(false);
    } else {
      if (learnerAudioRef.current) {
        learnerAudioRef.current.pause();
        setIsPlayingLearner(false);
      }
      audio.onended = () => {
        setIsPlayingNative(false);
        setNativeCurrentTime(0);
      };
      audio.play().then(() => setIsPlayingNative(true)).catch(() => setIsPlayingNative(false));
    }
  };

  // Handle single track playback for Learner audio
  const handleTogglePlayLearner = () => {
    if (isComparing) {
      stopComparativePlayback();
    }
    const audio = learnerAudioRef.current;
    if (!audio) return;

    if (isPlayingLearner) {
      audio.pause();
      setIsPlayingLearner(false);
    } else {
      if (nativeAudioRef.current) {
        nativeAudioRef.current.pause();
        setIsPlayingNative(false);
      }
      audio.onended = () => {
        setIsPlayingLearner(false);
        setLearnerCurrentTime(0);
      };
      audio.play().then(() => setIsPlayingLearner(true)).catch(() => setIsPlayingLearner(false));
    }
  };

  // Sequential Comparative Playback: Native Audio -> Learner Audio
  const handleToggleComparativePlayback = async () => {
    if (isComparing) {
      stopComparativePlayback();
      return;
    }

    const nativeAudio = await getOrFetchNativeAudio();
    const learnerAudio = learnerAudioRef.current;

    if (!nativeAudio) return;

    setIsComparing(true);
    setComparingTrack("native");
    setIsPlayingNative(true);
    setIsPlayingLearner(false);

    nativeAudio.currentTime = 0;
    nativeAudio.onended = () => {
      setIsPlayingNative(false);
      setNativeCurrentTime(0);

      if (learnerAudio && activeLearnerSrc) {
        setComparingTrack("learner");
        setIsPlayingLearner(true);
        learnerAudio.currentTime = 0;
        learnerAudio.onended = () => {
          setIsPlayingLearner(false);
          setLearnerCurrentTime(0);
          setComparingTrack(null);
          setIsComparing(false);
        };
        learnerAudio.play().catch(() => {
          setIsPlayingLearner(false);
          setIsComparing(false);
          setComparingTrack(null);
        });
      } else {
        setIsComparing(false);
        setComparingTrack(null);
      }
    };

    nativeAudio.play().catch(() => {
      setIsComparing(false);
      setIsPlayingNative(false);
      setComparingTrack(null);
    });
  };

  const stopComparativePlayback = () => {
    if (nativeAudioRef.current) {
      nativeAudioRef.current.pause();
      setIsPlayingNative(false);
    }
    if (learnerAudioRef.current) {
      learnerAudioRef.current.pause();
      setIsPlayingLearner(false);
    }
    setIsComparing(false);
    setComparingTrack(null);
  };

  // Computed results in COMPLETED phase
  const feedback = submission?.aiFeedback;
  const overallScore = submission?.overallScore;
  const isNoSpeech =
    submission?.lastErrorCode === "NO_SPEECH" ||
    feedback?.isSilentOrNoSpeech === true;
  const displayScore = overallScore ?? 0;

  // Truthful scores from provider
  const accuracy = feedback?.accuracyScore;
  const fluency = feedback?.fluencyScore;
  const completeness = feedback?.completenessScore;
  const wordsList: WordAssessmentItem[] = feedback?.words || [];

  const accuracyTier = getAccuracyTier(accuracy);

  // Selected word diagnostics
  const selectedWordItem =
    selectedWordIndex !== null && wordsList[selectedWordIndex]
      ? wordsList[selectedWordIndex]
      : null;

  return (
    <div className="h-full flex-1 flex flex-col justify-between space-y-3.5 rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs animate-in fade-in duration-300 min-h-0 overflow-y-auto">
      {/* Hidden audio element for learner recording */}
      {activeLearnerSrc && (
        <audio
          ref={learnerAudioRef}
          src={activeLearnerSrc}
          onTimeUpdate={() => {
            if (learnerAudioRef.current) {
              setLearnerCurrentTime(learnerAudioRef.current.currentTime);
            }
          }}
          onLoadedMetadata={() => {
            if (learnerAudioRef.current) {
              setLearnerDuration(learnerAudioRef.current.duration || 0);
            }
          }}
          className="hidden"
        />
      )}

      {/* 1. Header Studio Bar */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5 shrink-0">
        <span className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <Headphones size={16} className="text-amber-600" />
          <span>Phòng thu âm &amp; Đánh giá phát âm</span>
        </span>

        {phase === "COMPLETED" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black border border-emerald-200 bg-emerald-50 text-emerald-800 shadow-2xs">
            <CheckCircle2 size={13} aria-hidden="true" /> Đã hoàn thành
          </span>
        ) : phase === "RECORDING" ? (
          <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black border border-rose-200 bg-rose-50 text-rose-700 shadow-2xs">
            <span className="size-2 rounded-full bg-rose-500 animate-ping" />
            <span>Đang thu âm</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold border border-slate-200 bg-slate-50 text-slate-700 shadow-2xs">
            Sẵn sàng
          </span>
        )}
      </div>

      {/* 2. DYNAMIC COMMAND DECK (Clean, accessible BreadTrans controls) */}
      {phase === "READY" && (
        <div className="bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-200 flex flex-col items-center justify-center gap-3 shrink-0 shadow-2xs">
          <button
            type="button"
            onClick={onStartRecording}
            className="size-14 sm:size-16 rounded-full bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center shadow-sm hover:shadow active:scale-95 transition-all cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
            title="Bắt đầu thu âm (Phím Space / R)"
            aria-label="Bắt đầu thu âm"
          >
            <Mic size={28} />
          </button>
          <div className="text-center space-y-1">
            <p className="text-sm sm:text-base font-black text-slate-900">
              Nhấn vào Micro hoặc bấm phím <kbd className="px-2 py-0.5 rounded-lg bg-white border border-slate-300 font-mono text-xs font-black text-slate-800 shadow-2xs">Space</kbd> để bắt đầu đọc
            </p>
            <p className="text-xs font-semibold text-slate-600">
              Chuẩn hóa 16kHz mono WAV • Tự động chấm điểm và đánh giá ngay khi dừng
            </p>
          </div>
        </div>
      )}

      {phase === "RECORDING" && (
        <div className="bg-rose-50/60 p-4 sm:p-5 rounded-2xl border border-rose-200 flex flex-col items-center justify-center gap-3 shrink-0 shadow-2xs animate-in fade-in">
          {/* Timer pill */}
          <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-slate-900 text-white font-mono font-bold text-xs shadow-xs">
            <span className="size-2 rounded-full bg-rose-500 animate-ping" />
            <span>{formatSpeakingTime(recordingSeconds)}</span>
            <span className="text-slate-400">/ 00:45</span>
          </div>

          {/* Live Audio Visualizer Canvas */}
          <div className="w-full max-w-sm h-12 flex items-center justify-center bg-slate-900 rounded-xl p-1 shadow-inner">
            <canvas
              ref={canvasRef}
              width={280}
              height={40}
              className="w-full h-full"
            />
          </div>

          {/* Action buttons: Stop + Cancel */}
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={onStopRecording}
              className="size-14 sm:size-16 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-sm hover:shadow active:scale-95 transition-all cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 animate-pulse"
              title="Dừng ghi âm & chấm điểm (Space / R)"
              aria-label="Dừng ghi âm & chấm điểm"
            >
              <StopCircle size={28} />
            </button>

            {onCancelRecording && (
              <button
                type="button"
                onClick={onCancelRecording}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-all cursor-pointer shadow-2xs active:scale-95"
                title="Hủy lượt thu âm này"
              >
                <X size={14} className="text-rose-500" />
                <span>✕ Hủy</span>
              </button>
            )}
          </div>

          <p className="font-bold text-xs text-rose-600 text-center">
            Đang thu âm giọng đọc... Bấm nút đỏ hoặc phím [Space] để dừng &amp; chấm điểm tức thì
          </p>
        </div>
      )}

      {(phase === "ENCODING" ||
        phase === "VALIDATING_AUDIO" ||
        phase === "SUBMITTING" ||
        phase === "POLLING") && (
        <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-200 flex flex-col items-center justify-center gap-3 shrink-0 shadow-2xs animate-in fade-in">
          <div className="relative mx-auto flex size-16 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-amber-400/20 animate-ping" />
            <div className="relative flex size-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 shadow-xs">
              <Loader2 className="size-7 animate-spin text-amber-700" />
            </div>
          </div>
          <div className="text-center space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-100 border border-amber-200 text-amber-900 text-[11px] font-black uppercase tracking-wider">
              <Activity size={12} className="animate-pulse" />
              <span>Đang phân tích bài nói...</span>
            </span>
            <p className="text-xs text-slate-600 font-medium max-w-sm mx-auto">
              {phase === "POLLING"
                ? "Hệ thống đang so khớp bài nói với câu văn mẫu và chuẩn bị kết quả..."
                : "Đang xử lý định dạng âm thanh và chuẩn bị dữ liệu đánh giá..."}
            </p>
          </div>
        </div>
      )}

      {phase === "INVALID_AUDIO" && (
        <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200 flex items-center justify-between gap-3 shrink-0 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="size-6 text-amber-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-slate-900">Âm thanh chưa đạt chuẩn</p>
              <p className="text-[11px] text-slate-600">{qualityWarning || "Vui lòng nói to rõ và thu lại."}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRetryRecord}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer shadow-2xs shrink-0"
          >
            <RotateCcw size={13} />
            <span>Thu lại</span>
          </button>
        </div>
      )}

      {phase === "FAILED" && (
        <div className="bg-rose-50/80 p-4 rounded-2xl border border-rose-200 flex items-center justify-between gap-3 shrink-0 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="size-6 text-rose-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-rose-900">Đánh giá chưa thành công</p>
              <p className="text-[11px] text-rose-700">Có lỗi khi chấm bài. Bạn có thể thử lại với bản ghi này.</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {onRetrySubmit && activeLearnerSrc && (
              <button
                type="button"
                onClick={onRetrySubmit}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer shadow-2xs"
              >
                <RefreshCw size={13} />
                <span>Thử lại</span>
              </button>
            )}
            <button
              type="button"
              onClick={onRetryRecord}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold text-xs cursor-pointer shadow-2xs"
            >
              <RotateCcw size={13} />
              <span>Thu mới</span>
            </button>
          </div>
        </div>
      )}

      {phase === "COMPLETED" && (
        <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/90 flex items-center justify-between gap-3 shrink-0 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div
              className={`flex size-15 sm:size-16 flex-col items-center justify-center rounded-2xl border text-center shadow-inner shrink-0 ${
                isNoSpeech
                  ? "border-slate-300 bg-slate-100 text-slate-600"
                  : displayScore >= 8
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : displayScore >= 6
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              <span className="text-2xl sm:text-3xl font-black leading-none tracking-tight">
                {isNoSpeech ? "—" : displayScore.toFixed(1)}
              </span>
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-500 mt-0.5">
                Điểm / 10
              </span>
            </div>

            {(() => {
              const scoreMeta = getSpeakingScoreLabel(displayScore, isNoSpeech);
              return (
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 truncate">
                      {scoreMeta.title}
                    </h3>
                    {scoreMeta.isStandard && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-black bg-emerald-100 text-emerald-800 shadow-2xs">
                        <Award size={13} className="text-emerald-700 shrink-0" />
                        <span>Đạt chuẩn</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-600 mt-0.5">
                    {scoreMeta.subtitle}
                  </p>
                </div>
              );
            })()}
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs sm:text-sm font-extrabold shrink-0 shadow-2xs">
            <Flame size={15} className="text-amber-600" />
            <span>Luyện phát âm</span>
          </div>
        </div>
      )}

      {/* 3. INTERACTIVE DUAL AUDIO TRACKS & SEQUENTIAL COMPARISON */}
      <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-blue-50 text-blue-700 shrink-0">
                <Headphones size={16} />
              </span>
              <h4 className="text-sm sm:text-base font-black text-slate-900">
                Nghe đối chiếu mẫu và bản ghi
              </h4>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
              Hệ thống sẽ phát audio mẫu trước, sau đó tự động phát bản ghi của bạn.
            </p>
          </div>

          {/* [ ⏯ Nghe lần lượt ] Button */}
          <button
            type="button"
            onClick={handleToggleComparativePlayback}
            disabled={isLoadingNative}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all active:scale-95 shadow-xs cursor-pointer shrink-0 ${
              isComparing
                ? "bg-rose-600 hover:bg-rose-700 text-white ring-2 ring-rose-500/30 animate-pulse"
                : "bg-slate-900 hover:bg-slate-800 text-white"
            }`}
            title="Hệ thống sẽ phát audio mẫu trước, sau đó phát bản ghi của bạn."
          >
            {isComparing ? (
              <>
                <Pause size={15} />
                <span>Dừng nghe</span>
              </>
            ) : (
              <>
                <Play size={15} className="fill-white" />
                <span>Nghe lần lượt</span>
              </>
            )}
          </button>
        </div>

        {/* Comparison active notification banner */}
        {isComparing && (
          <div className="px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs sm:text-sm font-bold flex items-center justify-between animate-in fade-in">
            <span className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-amber-600 animate-ping" />
              <span>
                {comparingTrack === "native"
                  ? "Bước 1/2: Đang phát audio mẫu giáo viên..."
                  : "Bước 2/2: Đang phát bản ghi của bạn..."}
              </span>
            </span>
            <span className="text-xs text-amber-800 font-extrabold uppercase">Tự động chuyển tiếp</span>
          </div>
        )}

        {/* Dual Tracks List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Track 1: Audio mẫu */}
          <div
            className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
              comparingTrack === "native" || isPlayingNative
                ? "bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20 shadow-xs"
                : "bg-slate-50/70 border-slate-200/90 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2 font-black text-slate-900 truncate text-xs sm:text-sm">
                <Volume2 size={16} className="text-blue-600 shrink-0" />
                <span className="truncate">Audio mẫu</span>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-extrabold uppercase">
                  {ttsAccent}
                </span>
              </div>
              <span className="text-xs sm:text-sm font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200/80 shadow-2xs shrink-0">
                {formatAudioTime(nativeCurrentTime)} / {formatAudioTime(nativeDuration)}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleTogglePlayNative}
                disabled={isLoadingNative}
                className="size-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer shadow-xs"
                title={isPlayingNative ? "Tạm dừng" : "Nghe mẫu"}
              >
                {isLoadingNative ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : isPlayingNative ? (
                  <Pause size={16} />
                ) : (
                  <Play size={16} className="ml-0.5 fill-white" />
                )}
              </button>

              {/* Truthful Audio Progress Bar */}
              <div className="flex-1 flex items-center h-8 bg-white rounded-xl border border-slate-200/80 px-3 shadow-2xs">
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-150"
                    style={{
                      width: `${nativeDuration > 0 ? Math.min(100, (nativeCurrentTime / nativeDuration) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Track 2: Bản ghi của bạn */}
          <div
            className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
              comparingTrack === "learner" || isPlayingLearner
                ? "bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20 shadow-xs"
                : "bg-slate-50/70 border-slate-200/90 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2 font-black text-slate-900 truncate text-xs sm:text-sm">
                <Mic size={16} className="text-amber-700 shrink-0" />
                <span className="truncate">Bản ghi của bạn</span>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-extrabold uppercase">
                  {activeLearnerSrc ? "Ghi âm" : "Chờ thu"}
                </span>
              </div>
              <span className="text-xs sm:text-sm font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200/80 shadow-2xs shrink-0">
                {activeLearnerSrc
                  ? `${formatAudioTime(learnerCurrentTime)} / ${formatAudioTime(learnerDuration)}`
                  : "0:00 / 0:00"}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleTogglePlayLearner}
                disabled={!activeLearnerSrc}
                className="size-10 rounded-xl bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                title={activeLearnerSrc ? (isPlayingLearner ? "Tạm dừng" : "Nghe lại") : "Chưa có bản ghi"}
              >
                {isPlayingLearner ? <Pause size={16} /> : <Play size={16} className="ml-0.5 fill-white" />}
              </button>

              {/* Truthful Audio Progress Bar */}
              <div className="flex-1 flex items-center h-8 bg-white rounded-xl border border-slate-200/80 px-3 shadow-2xs">
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-150"
                    style={{
                      width: `${learnerDuration > 0 ? Math.min(100, (learnerCurrentTime / learnerDuration) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. 4-DIMENSION METRIC DASHBOARD & RHYTHM GUIDANCE */}
      <div className="space-y-3">
        {/* Row A: 3 Provider-Backed Numeric Dimension Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Dimension 1: Độ chính xác (Accuracy) */}
          <div className="rounded-2xl bg-white p-4 border border-slate-200/90 flex flex-col items-center justify-between text-center shadow-xs">
            <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-700">
              Độ chính xác (Accuracy)
            </span>
            <div className="my-2.5">
              {phase === "COMPLETED" && !isNoSpeech && Number.isFinite(accuracy) ? (
                <CircularGauge value={accuracy!} colorClass={accuracyTier.ring} size={68} />
              ) : (
                <div className="flex size-17 items-center justify-center rounded-full border-2 border-dashed border-slate-300 text-sm font-black text-slate-400">
                  &ge; 80%
                </div>
              )}
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-700 truncate">
              {phase === "COMPLETED" && !isNoSpeech && Number.isFinite(accuracy)
                ? accuracy! >= 80 ? "Đạt chuẩn" : "Cần rèn luyện"
                : "Mục tiêu chuẩn"}
            </span>
          </div>

          {/* Dimension 2: Độ trôi chảy (Fluency) */}
          <div className="rounded-2xl bg-white p-4 border border-slate-200/90 flex flex-col items-center justify-between text-center shadow-xs">
            <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-700">
              Độ trôi chảy (Fluency)
            </span>
            <div className="my-2.5">
              {phase === "COMPLETED" && !isNoSpeech && Number.isFinite(fluency) ? (
                <CircularGauge value={fluency!} colorClass="text-blue-500" size={68} />
              ) : (
                <div className="flex size-17 items-center justify-center rounded-full border-2 border-dashed border-slate-300 text-sm font-black text-slate-400">
                  Tự nhiên
                </div>
              )}
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-700 truncate">
              {phase === "COMPLETED" && !isNoSpeech && Number.isFinite(fluency)
                ? "Nhịp điệu câu"
                : "Mục tiêu lưu loát"}
            </span>
          </div>

          {/* Dimension 3: Độ hoàn thiện (Completeness) */}
          <div className="rounded-2xl bg-white p-4 border border-slate-200/90 flex flex-col items-center justify-between text-center shadow-xs">
            <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-700">
              Độ hoàn thiện (Completeness)
            </span>
            <div className="my-2.5">
              {phase === "COMPLETED" && !isNoSpeech && Number.isFinite(completeness) ? (
                <CircularGauge value={completeness!} colorClass="text-amber-500" size={68} />
              ) : (
                <div className="flex size-17 items-center justify-center rounded-full border-2 border-dashed border-slate-300 text-sm font-black text-slate-400">
                  100%
                </div>
              )}
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-700 truncate">
              {phase === "COMPLETED" && !isNoSpeech && Number.isFinite(completeness)
                ? "Đủ các từ trong câu"
                : "Đọc đủ từng từ"}
            </span>
          </div>
        </div>

        {/* Row B: Dedicated Rhythm Guidance Card (Full width, clear legible typography) */}
        <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-r from-amber-50/90 via-amber-50/60 to-orange-50/40 p-4 sm:p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-xs">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="size-11 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <BookOpen size={20} />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-950">
                  Gợi ý về nhịp điệu &amp; ngữ điệu
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-900">
                  Hướng dẫn phát âm tự nhiên
                </span>
              </div>
              <p className="text-sm sm:text-base font-semibold text-slate-800 leading-relaxed">
                {RHYTHM_GUIDANCE_TEXT}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTogglePlayNative}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-amber-100/80 border border-amber-200 text-xs sm:text-sm font-extrabold text-amber-900 transition-all shadow-2xs cursor-pointer active:scale-95 shrink-0 self-start sm:self-auto"
            title="Nghe lại audio mẫu để cảm nhận nhịp điệu"
          >
            <Volume2 size={15} className="text-amber-700" />
            <span>Nghe nhịp mẫu</span>
          </button>
        </div>
      </div>

      {/* 5. BOTTOM DIAGNOSTIC DECK: Word-Level Assessment */}
      {phase === "COMPLETED" && !isNoSpeech ? (
        <div className="space-y-3 rounded-2xl bg-slate-50/80 p-4 sm:p-5 border border-slate-200/90 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <span className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
              <Activity size={18} className="text-amber-700" />
              <span>Đánh giá theo từng từ</span>
            </span>
            <span className="text-xs sm:text-sm font-semibold text-slate-600">
              Nhấp vào từ để xem chi tiết và tra từ điển
            </span>
          </div>

          {/* Word-level diagnostic badges */}
          {wordsList && wordsList.length > 0 ? (
            <div className="flex flex-wrap gap-2 py-1">
              {wordsList.map((item, idx) => {
                const isSelected = selectedWordIndex === idx;
                const isOmitted = item.errorType === "Omission" || item.errorType === "Unspoken";
                const isCorrect = !isOmitted && (item.accuracyScore ?? 0) >= 80 && item.errorType === "None";
                const isMispronounced = !isOmitted && !isCorrect && item.errorType === "Mispronunciation";

                let tokenStyle = "bg-white text-slate-800 border-slate-200 hover:border-slate-300";
                if (isCorrect) {
                  tokenStyle = "bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100";
                } else if (isMispronounced) {
                  tokenStyle = "bg-amber-50 text-amber-950 border-amber-300 hover:bg-amber-100";
                } else if (isOmitted) {
                  tokenStyle = "bg-rose-50 text-rose-800 border-rose-300 line-through opacity-80";
                } else {
                  tokenStyle = "bg-red-50 text-red-800 border-red-300 underline decoration-red-400";
                }

                if (isSelected) {
                  tokenStyle += " ring-2 ring-amber-500 shadow-xs";
                }

                return (
                  <button
                    key={`${item.word}-${idx}`}
                    type="button"
                    onClick={() => setSelectedWordIndex(isSelected ? null : idx)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-black border transition-all cursor-pointer active:scale-95 ${tokenStyle}`}
                    title={`Điểm chính xác: ${item.accuracyScore ?? "—"}% • Lỗi: ${item.errorType}`}
                  >
                    <span>{item.word}</span>
                    {Number.isFinite(item.accuracyScore) && (
                      <span className="text-[11px] sm:text-xs font-mono font-black opacity-90">
                        {item.accuracyScore}%
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic">Chưa có dữ liệu từ ngữ.</p>
          )}

          {/* Word Inspector Card (Activated when learner clicks any word token) */}
          {selectedWordItem && (() => {
            const details = getWordDiagnosticDetails(selectedWordItem);
            return (
              <div className="mt-3 p-4 rounded-xl bg-white border border-amber-200 shadow-xs space-y-3 animate-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <span className="font-black text-lg sm:text-xl text-slate-900">
                      {selectedWordItem.word}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-lg text-xs sm:text-sm font-black border ${details.statusClass}`}
                    >
                      {details.statusBadge}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {onPlaySample && (
                      <button
                        type="button"
                        onClick={() => onPlaySample(selectedWordItem.word)}
                        className="size-9 rounded-xl bg-amber-50 text-amber-800 hover:bg-amber-100 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                        title={`Nghe phát âm chuẩn: ${selectedWordItem.word}`}
                      >
                        <Volume2 size={16} />
                      </button>
                    )}
                    {onSelectWord && (
                      <button
                        type="button"
                        onClick={() => onSelectWord(selectedWordItem.word)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs sm:text-sm font-bold hover:bg-slate-800 transition-colors cursor-pointer shadow-2xs"
                        title="Mở từ điển tra IPA và nghĩa"
                      >
                        <BookOpen size={14} />
                        <span>Tra từ</span>
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-sm sm:text-base text-slate-800 font-semibold leading-relaxed">
                  {details.explanation}
                </p>
              </div>
            );
          })()}

          {/* Suggestions Accordion if present */}
          {feedback?.suggestions && feedback.suggestions.length > 0 && (
            <div className="rounded-2xl bg-amber-50/90 p-4 border border-amber-200 mt-3">
              <div className="flex items-center gap-2 text-sm sm:text-base font-black text-amber-950 uppercase tracking-wider mb-2">
                <Activity size={16} className="text-amber-700" />
                <span>Gợi ý cải thiện phát âm</span>
              </div>
              <ul className="space-y-2 text-slate-800 text-sm sm:text-base font-semibold pl-5 list-disc leading-relaxed">
                {feedback.suggestions.map((sug, i) => (
                  <li key={i}>{sug}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Result Actions: [ ↺ Thử đọc lại ] and [ Bài tiếp theo → ] */}
          <div className="pt-3 border-t border-slate-200/80 flex items-center gap-3">
            <button
              type="button"
              onClick={onRetryRecord}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 font-extrabold text-sm sm:text-base text-slate-800 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-xs hover:shadow-sm"
            >
              <RotateCcw size={16} />
              <span>Thử đọc lại</span>
            </button>

            {onNextExercise && (
              <button
                type="button"
                onClick={onNextExercise}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-extrabold text-sm sm:text-base text-white flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-xs hover:shadow-sm"
              >
                <span>{isNextAvailable ? "Bài tiếp theo" : "Về danh sách"}</span>
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      ) : (
        /* READY / RECORDING Phase: Key words for pronunciation practice */
        <div className="rounded-2xl bg-slate-50/80 p-3 border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Target size={13} className="text-amber-600" />
              <span>Trọng tâm phát âm trong câu này</span>
            </span>
            <span className="text-[11px] text-slate-500">Nhấp để nghe âm mẫu</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {keyWords.map((word) => (
              <button
                key={word}
                type="button"
                onClick={() => {
                  if (onPlaySample) onPlaySample(word);
                  if (onSelectWord) onSelectWord(word);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-slate-200 hover:border-amber-300 hover:bg-amber-50 text-xs font-bold text-slate-800 transition-all shadow-2xs cursor-pointer active:scale-95"
                title={`Nghe phát âm từ "${word}"`}
              >
                <Volume2 size={12} className="text-amber-600" />
                <span>{word}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
