"use client";

import React, { useState, useRef } from "react";
import {
  SpeakingSubmissionDetail,
  WordAssessmentItem,
} from "@/lib/api/services/speaking.service";
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
  ChevronDown,
  ChevronUp,
  Target,
} from "lucide-react";

interface PronunciationReportCardProps {
  submission: SpeakingSubmissionDetail | null;
  targetText: string;
  isPolling?: boolean;
  onRetry?: () => void;
  onSelectWord?: (word: string) => void;
  onPlaySample?: (word: string) => void;
  userAudioUrl?: string | null;
}

interface AudioPlaybackDeckProps {
  audioSrc: string;
}

const AudioPlaybackDeck: React.FC<AudioPlaybackDeckProps> = ({ audioSrc }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const handleTogglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newPercent = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = newPercent * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatAudioTime = (sec: number) => {
    if (!sec || isNaN(sec) || !isFinite(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="p-3 bg-slate-50/90 rounded-2xl border border-slate-200/80 space-y-2">
      <audio
        ref={audioRef}
        src={audioSrc}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleAudioEnded}
        className="hidden"
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleTogglePlay}
          className="size-8.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center shrink-0 transition-all active:scale-95 shadow-xs cursor-pointer"
          aria-label={isPlaying ? "Tạm dừng" : "Nghe lại giọng đọc"}
          title={isPlaying ? "Tạm dừng" : "Nghe lại giọng đọc"}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
            <span className="truncate flex items-center gap-1.5">
              <Volume2 size={14} className="text-slate-500 shrink-0" />
              <span>Giọng đọc của bạn</span>
            </span>
            <span className="text-[11px] font-mono font-medium text-slate-500 shrink-0">
              {formatAudioTime(currentTime)} / {formatAudioTime(duration)}
            </span>
          </div>

          {/* Seekable Progress Bar */}
          <div
            className="h-2 w-full bg-slate-200/80 rounded-full overflow-hidden cursor-pointer relative"
            onClick={handleSeek}
            title="Tua âm thanh"
          >
            <div
              className="h-full bg-amber-500 rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export const PronunciationReportCard: React.FC<PronunciationReportCardProps> = ({
  submission,
  isPolling,
  onRetry,
  onSelectWord,
  onPlaySample,
  userAudioUrl,
}) => {
  const [isExpandedFocusWords, setIsExpandedFocusWords] = useState(false);
  const audioSrc = submission?.audioUrl || userAudioUrl || "";

  // State 0: Initial ready state (no submission yet)
  if (!submission && !isPolling) {
    return (
      <div className="h-full flex-1 flex flex-col items-center justify-center space-y-4 sm:space-y-4.5 rounded-3xl border border-dashed border-slate-300/90 bg-slate-50/70 p-4 sm:p-5 lg:p-6 text-center shadow-2xs animate-in fade-in">
        <div className="mx-auto flex size-18 sm:size-20 items-center justify-center rounded-3xl bg-amber-100 text-amber-700 shadow-xs">
          <Activity className="size-9 sm:size-10" />
        </div>
        <div className="space-y-2 max-w-sm mx-auto">
          <h3 className="text-lg sm:text-xl font-black text-slate-900">
            Bảng phân tích phát âm
          </h3>
          <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed">
            Ghi âm giọng đọc và bấm <strong>Chấm điểm phát âm</strong> để xem điểm số, nghe lại bài nói và cải thiện từng từ ngữ.
          </p>
        </div>

        {/* Feature Highlights Preview */}
        <div className="w-full max-w-sm lg:max-w-md space-y-3 pt-1 text-left">
          <div className="flex items-center gap-3.5 p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="size-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-[13px] font-bold text-slate-800">Đánh giá chuẩn xác theo từng từ</p>
              <p className="text-[11px] text-slate-500 truncate">Nhận diện từ đạt chuẩn (&ge; 80%) và từ cần chỉnh</p>
            </div>
          </div>
          <div className="flex items-center gap-3.5 p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="size-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <Volume2 size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-[13px] font-bold text-slate-800">Nghe lại giọng nói & audio mẫu</p>
              <p className="text-[11px] text-slate-500 truncate">Đối chiếu bài nói của bạn với audio mẫu bản xứ</p>
            </div>
          </div>
          <div className="flex items-center gap-3.5 p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="size-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <Target size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-[13px] font-bold text-slate-800">Phát hiện lỗi & gợi ý phát âm</p>
              <p className="text-[11px] text-slate-500 truncate">Chỉ rõ từ đọc sai, bỏ sót hoặc phát âm chưa chuẩn</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // State 1: PENDING or PROCESSING
  if (isPolling || submission?.status === "PENDING" || submission?.status === "PROCESSING") {
    return (
      <div className="h-full flex-1 flex flex-col items-center justify-center space-y-4 sm:space-y-4.5 rounded-3xl border border-amber-200 bg-amber-50/50 p-4 sm:p-5 lg:p-6.5 text-center animate-in fade-in shadow-2xs">
        <div className="mx-auto flex size-18 items-center justify-center rounded-3xl bg-amber-100 text-amber-700 shadow-xs">
          <Loader2 className="size-9 animate-spin" />
        </div>
        <div className="space-y-1.5 max-w-sm mx-auto">
          <h3 className="text-lg sm:text-xl font-black text-slate-900">
            {submission?.status === "PROCESSING"
              ? "Hệ thống đang phân tích ngữ âm..."
              : "Đang xếp hàng chờ đánh giá phát âm..."}
          </h3>
          <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed">
            Bản ghi âm đã được tiếp nhận an toàn. Kết quả điểm chi tiết sẽ hiển thị tự động sau vài giây.
          </p>
        </div>
      </div>
    );
  }

  // State 2: FAILED
  if (submission?.status === "FAILED") {
    const isTimeout = submission.lastErrorCode === "PROVIDER_TIMEOUT";
    const isInvalid = submission.lastErrorCode === "INVALID_AUDIO";

    return (
      <div className="h-full flex-1 flex flex-col items-center justify-center space-y-4 sm:space-y-4.5 rounded-3xl border border-red-200 bg-red-50/60 p-4 sm:p-5 lg:p-6.5 text-center animate-in fade-in shadow-2xs">
        <div className="mx-auto flex size-18 items-center justify-center rounded-3xl bg-red-100 text-red-600 shadow-xs">
          <AlertTriangle className="size-9" />
        </div>
        <div className="space-y-1.5 max-w-sm mx-auto">
          <h3 className="text-lg sm:text-xl font-black text-red-900">
            {isInvalid
              ? "Tệp âm thanh không hợp lệ"
              : isTimeout
                ? "Dịch vụ đánh giá phản hồi chậm"
                : "Không thể hoàn tất chấm điểm"}
          </h3>
          <p className="text-xs sm:text-[13px] text-red-700 leading-relaxed">
            {submission.lastErrorCode === "INVALID_AUDIO"
              ? "Bản ghi âm chưa đạt chuẩn kỹ thuật (mono 16kHz WAV). Vui lòng thử ghi âm lại trực tiếp trên trình duyệt."
              : submission.lastErrorCode === "PROVIDER_TIMEOUT"
                ? "Hệ thống đánh giá phát âm bị quá tải trong giây lát. Bạn hãy thử nộp lại nhé."
                : "Hệ thống đã nhận bài nhưng chưa thể trích xuất kết quả. Vui lòng ghi âm lại."}
          </p>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-1.5 inline-flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-red-700 active:scale-95 transition-all cursor-pointer"
          >
            <RefreshCw className="size-4" />
            Thử lại bài nộp
          </button>
        )}
      </div>
    );
  }

  // State 3: COMPLETED
  const feedback = submission?.aiFeedback;
  const overallScore = submission?.overallScore;
  const isNoSpeech =
    submission?.lastErrorCode === "NO_SPEECH" ||
    feedback?.isSilentOrNoSpeech === true;
  const displayScore = overallScore ?? 0;

  const accuracy = feedback?.accuracyScore ?? 0;
  const fluency = feedback?.fluencyScore ?? 0;
  const completeness = feedback?.completenessScore ?? 0;
  const wordsList: WordAssessmentItem[] = feedback?.words || [];

  // Determine score styling & title
  const getScoreTheme = (score: number, noSpeech: boolean) => {
    if (noSpeech) {
      return {
        badge: "border-slate-300 bg-slate-100 text-slate-600",
        feedbackBox: "bg-slate-50 border-slate-200 text-slate-700",
        title: "Chưa phát hiện giọng nói",
        titleColor: "text-slate-800",
      };
    }
    if (score >= 8) {
      return {
        badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
        feedbackBox: "bg-emerald-50/70 border-emerald-200/80 text-emerald-950",
        title: "Phát âm xuất sắc",
        titleColor: "text-emerald-900",
      };
    }
    if (score >= 6) {
      return {
        badge: "border-blue-200 bg-blue-50 text-blue-700",
        feedbackBox: "bg-blue-50/70 border-blue-200/80 text-blue-950",
        title: "Phát âm khá tốt",
        titleColor: "text-blue-900",
      };
    }
    if (score >= 4) {
      return {
        badge: "border-amber-200 bg-amber-50 text-amber-700",
        feedbackBox: "bg-amber-50/70 border-amber-200/80 text-amber-950",
        title: "Cần luyện tập thêm",
        titleColor: "text-amber-900",
      };
    }
    return {
      badge: "border-rose-200 bg-rose-50 text-rose-700",
      feedbackBox: "bg-rose-50/70 border-rose-200/80 text-rose-950",
      title: "Phát âm cần cải thiện",
      titleColor: "text-rose-900",
    };
  };

  const theme = getScoreTheme(displayScore, isNoSpeech);

  return (
    <div className="h-full flex-1 flex flex-col justify-between space-y-3 sm:space-y-3.5 rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 lg:p-6 shadow-xs animate-in fade-in duration-300">
      {/* 1. Header / Score Overview */}
      <div className="flex items-center gap-3 pb-2.5 border-b border-slate-100">
        <div
          className={`flex size-16 sm:size-18 flex-col items-center justify-center rounded-2xl border text-center shadow-inner shrink-0 ${theme.badge}`}
        >
          <span className="text-3xl font-black leading-none tracking-tight">
            {isNoSpeech ? "—" : displayScore.toFixed(1)}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">
            Điểm / 10
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`text-base sm:text-lg font-black ${theme.titleColor} truncate`}>
              {theme.title}
            </h3>
            {!isNoSpeech && displayScore >= 8 && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-800">
                <Award size={12} className="text-emerald-700 shrink-0" />
                <span>Xuất sắc</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {isNoSpeech
              ? "Chưa phát hiện giọng đọc rõ ràng"
              : `Đánh giá phát âm qua mô hình ngữ âm`}
          </p>
        </div>
      </div>

      {/* 2. Detailed Assessment Feedback Speech Card (Full Width) */}
      <div className={`p-3.5 sm:p-4 rounded-2xl border text-xs sm:text-sm leading-relaxed ${theme.feedbackBox}`}>
        <div className="flex items-center gap-1.5 text-xs font-bold mb-1.5 text-slate-700">
          <BookOpen size={14} className="text-amber-600 shrink-0" />
          <span>Nhận xét phát âm</span>
        </div>
        <p className="text-slate-700 font-medium">
          {feedback?.feedback ||
            (isNoSpeech
              ? "Micro chưa thu được âm thanh rõ nét. Hãy kiểm tra âm lượng micro và đọc to rõ ràng từng từ."
              : `Bạn đạt ${displayScore.toFixed(1)}/10 điểm cho lượt đọc này.`)}
        </p>
      </div>

      {/* 3. Custom Audio Recording Player */}
      {audioSrc && <AudioPlaybackDeck key={audioSrc} audioSrc={audioSrc} />}

      {/* 4. Score Breakdown Metrics */}
      {!isNoSpeech && (
        <div className="grid grid-cols-3 gap-2.5">
          <div className="rounded-2xl bg-slate-50 p-2.5 sm:p-3 border border-slate-200/70 text-center">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider block truncate">
              Chính xác
            </span>
            <p className="mt-0.5 text-base sm:text-lg font-black text-slate-900">{accuracy}%</p>
            <div className="mt-1.5 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, accuracy))}%` }}
              />
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-2.5 sm:p-3 border border-slate-200/70 text-center">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider block truncate">
              Trôi chảy
            </span>
            <p className="mt-0.5 text-base sm:text-lg font-black text-slate-900">{fluency}%</p>
            <div className="mt-1.5 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, fluency))}%` }}
              />
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-2.5 sm:p-3 border border-slate-200/70 text-center">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider block truncate">
              Hoàn thiện
            </span>
            <p className="mt-0.5 text-base sm:text-lg font-black text-slate-900">{completeness}%</p>
            <div className="mt-1.5 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, completeness))}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 5. 100% Perfect Celebration Banner or Focus Words (Từ cần chú ý) */}
      {(() => {
        const isAllPerfect =
          submission?.status === "COMPLETED" &&
          !isNoSpeech &&
          !feedback?.isSilentOrNoSpeech &&
          Array.isArray(wordsList) &&
          wordsList.length > 0 &&
          wordsList.every(
            (w) =>
              Number.isFinite(w.accuracyScore) &&
              (w.accuracyScore ?? 0) >= 80 &&
              w.errorType === "None" &&
              w.isCorrect === true,
          );

        if (isAllPerfect) {
          return (
            <div className="space-y-2">
              <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-emerald-500/10 p-3.5 text-center space-y-1.5 shadow-2xs animate-in fade-in">
                <div className="size-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-2xs">
                  <CheckCircle2 size={20} />
                </div>
                <h4 className="text-xs font-black text-emerald-900">
                  Tuyệt vời! 100% từ phát âm đạt chuẩn
                </h4>
                <p className="text-[11px] text-emerald-800 leading-snug font-medium max-w-xs mx-auto">
                  Tất cả các từ trong câu đều đạt độ chính xác từ 80% trở lên. Bạn đã hoàn thành xuất sắc lượt nói này!
                </p>
              </div>

              {/* Recognized Transcript Preview */}
              {submission?.transcript && (
                <div className="text-[10px] text-slate-600 bg-white/80 p-2 rounded-lg border border-slate-200/60 break-words">
                  <span className="font-bold text-slate-500">Giọng nói nhận diện: </span>
                  <span className="italic font-medium text-slate-700">
                    &ldquo;{submission.transcript}&rdquo;
                  </span>
                </div>
              )}
            </div>
          );
        }

        const needsAttentionWords = wordsList
          .map((item, originalIndex) => {
            const isOmitted = item.errorType === "Omission" || item.errorType === "Unspoken";
            const isUnassessed = !isOmitted && !Number.isFinite(item.accuracyScore);
            const isCorrect =
              !isOmitted &&
              !isUnassessed &&
              (item.accuracyScore ?? 0) >= 80 &&
              item.errorType === "None" &&
              item.isCorrect === true;

            let severity = 5;
            if (isOmitted) severity = 1;
            else if (item.errorType === "Mispronunciation") severity = 2;
            else if (item.errorType === "Insertion") severity = 3;
            else if (isUnassessed) severity = 4;

            return {
              item,
              originalIndex,
              isCorrect,
              isOmitted,
              isUnassessed,
              severity,
            };
          })
          .filter((w) => !w.isCorrect);

        // 4-tier tie-breaker: Severity (1) -> accuracyScore ASC (2) -> Token Index (3) -> original index
        needsAttentionWords.sort((a, b) => {
          if (a.severity !== b.severity) return a.severity - b.severity;
          const scoreA = Number.isFinite(a.item.accuracyScore)
            ? (a.item.accuracyScore as number)
            : Infinity;
          const scoreB = Number.isFinite(b.item.accuracyScore)
            ? (b.item.accuracyScore as number)
            : Infinity;
          if (scoreA !== scoreB) return scoreA - scoreB;
          if (a.originalIndex !== b.originalIndex) return a.originalIndex - b.originalIndex;
          return 0;
        });

        const displayedFocusWords = isExpandedFocusWords
          ? needsAttentionWords
          : needsAttentionWords.slice(0, 4);

        return (
          <div className="space-y-2.5 rounded-2xl bg-slate-50/80 p-3 sm:p-3.5 border border-slate-200/80">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Activity size={14} className="text-amber-600 shrink-0" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Từ cần chú ý ({needsAttentionWords.length})
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Ưu tiên luyện lại
              </span>
            </div>

            {needsAttentionWords.length > 0 ? (
              <div className="space-y-1.5 pt-0.5">
                {displayedFocusWords.map(({ item, originalIndex, isOmitted, isUnassessed }) => {
                  const cleanWord = item.word.trim().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
                  const lookupWord = cleanWord || item.word;

                  let badgeStyle = "bg-amber-100 text-amber-900 border-amber-200/60";
                  let badgeText = `${item.accuracyScore}%`;

                  if (isOmitted) {
                    badgeStyle = "bg-rose-100 text-rose-800 border-rose-200/60";
                    badgeText = "Bỏ sót";
                  } else if (isUnassessed) {
                    badgeStyle = "bg-slate-100 text-slate-700 border-slate-200/60";
                    badgeText = "Chưa có điểm";
                  } else if (item.errorType === "Insertion") {
                    badgeStyle = "bg-blue-100 text-blue-800 border-blue-200/60";
                    badgeText = "Từ thêm";
                  } else if (item.errorType === "Mispronunciation") {
                    badgeStyle = "bg-amber-100 text-amber-900 border-amber-200/60";
                    badgeText = Number.isFinite(item.accuracyScore) ? `${item.accuracyScore}%` : "Cần chỉnh";
                  }

                  return (
                    <div
                      key={`${item.word}-${originalIndex}`}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white border border-slate-200/80 hover:border-amber-300 hover:shadow-2xs transition-all"
                    >
                      {/* Sibling 1: Word & status badge -> opens dictionary */}
                      <button
                        type="button"
                        onClick={() => onSelectWord && onSelectWord(lookupWord)}
                        className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer group"
                        title={`Tra từ điển: "${item.word}"`}
                        aria-label={`Tra từ điển từ ${item.word}`}
                      >
                        <span className="font-bold text-xs sm:text-[13px] text-slate-800 group-hover:text-amber-700 transition-colors truncate">
                          {item.word}
                        </span>
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold border shrink-0 ${badgeStyle}`}
                        >
                          {badgeText}
                        </span>
                      </button>

                      {/* Sibling 2: Audio playback button -> plays isolated word */}
                      {onPlaySample && (
                        <button
                          type="button"
                          onClick={() => onPlaySample(lookupWord)}
                          className="size-6.5 rounded-lg flex items-center justify-center text-slate-400 hover:text-amber-700 hover:bg-amber-50 active:scale-95 transition-all shrink-0 cursor-pointer"
                          title={`Nghe phát âm mẫu: "${item.word}"`}
                          aria-label={`Nghe phát âm mẫu từ ${item.word}`}
                        >
                          <Volume2 size={13} />
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* Expand / Collapse Button if > 4 words */}
                {needsAttentionWords.length > 4 && (
                  <button
                    type="button"
                    onClick={() => setIsExpandedFocusWords(!isExpandedFocusWords)}
                    className="w-full mt-1.5 py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-bold text-xs text-slate-700 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    {isExpandedFocusWords ? (
                      <>
                        <ChevronUp size={13} />
                        <span>Thu gọn</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown size={13} />
                        <span>Xem thêm {needsAttentionWords.length - 4} từ</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-1">
                Không có từ nào cần chú ý đặc biệt.
              </p>
            )}

            {/* Recognized Transcript Preview */}
            {submission?.transcript && (
              <div className="pt-1 text-[11px] text-slate-600 bg-white/80 p-2.5 rounded-xl border border-slate-200/60 break-words">
                <span className="font-bold text-slate-500">Giọng nói nhận diện: </span>
                <span className="italic font-medium text-slate-700">
                  &ldquo;{submission.transcript}&rdquo;
                </span>
              </div>
            )}
          </div>
        );
      })()}

      {/* 6. Actionable Suggestions */}
      {feedback?.suggestions && feedback.suggestions.length > 0 && (
        <div className="rounded-2xl bg-amber-50/70 p-3 sm:p-3.5 border border-amber-200/80 text-xs sm:text-[13px]">
          <h4 className="font-bold text-amber-900 text-xs uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Activity size={14} className="text-amber-700" />
            <span>Gợi ý cải thiện phát âm</span>
          </h4>
          <ul className="space-y-1 text-slate-700 font-medium">
            {feedback.suggestions.map((sug, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-amber-600 font-bold">•</span>
                <span>{sug}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
