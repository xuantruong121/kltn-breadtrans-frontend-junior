"use client";

import React from "react";
import { Mic, Volume2, FastForward, CheckCircle2, AlertCircle } from "lucide-react";
import { VocabWord } from "@/lib/api/services/vocab.service";
import { SrsRating } from "../types/study";

interface SpeakingStageProps {
  word: VocabWord;
  isRecording: boolean;
  transcript: string;
  score: number | null;
  feedback: string | null;
  isSkipped?: boolean;
  onToggleRecord: () => void;
  onPlayAudio: (accent?: "us" | "uk") => void;
  onRateSrs: (rating: SrsRating) => void;
  onSkipSpeaking?: () => void;
  onSkip?: () => void;
}

const SRS_OPTIONS: Array<{
  rating: SrsRating;
  label: string;
  intervalText: string;
  styleClass: string;
  keyNumber: string;
}> = [
  {
    rating: "AGAIN",
    label: "Học lại",
    intervalText: "1m",
    styleClass: "bg-rose-500 hover:bg-rose-600 text-white border-rose-600 shadow-xs",
    keyNumber: "1",
  },
  {
    rating: "HARD",
    label: "Khó",
    intervalText: "4d",
    styleClass: "bg-amber-50 hover:bg-amber-100/80 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-900/60 dark:text-amber-300",
    keyNumber: "2",
  },
  {
    rating: "GOOD",
    label: "Tốt",
    intervalText: "6d",
    styleClass: "bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900/60 dark:text-emerald-300",
    keyNumber: "3",
  },
  {
    rating: "EASY",
    label: "Dễ",
    intervalText: "8d",
    styleClass: "bg-blue-50 hover:bg-blue-100/80 border-blue-200 text-blue-800 dark:bg-blue-950/40 dark:border-blue-900/60 dark:text-blue-300",
    keyNumber: "4",
  },
];

export const SpeakingStage: React.FC<SpeakingStageProps> = ({
  word,
  isRecording,
  score,
  feedback,
  isSkipped = false,
  onToggleRecord,
  onPlayAudio,
  onRateSrs,
  onSkipSpeaking,
  onSkip,
}) => {
  const canRateSrs = score !== null || feedback !== null || isSkipped;

  return (
    <div className="flex flex-col items-center w-full max-w-2xl sm:max-w-3xl mx-auto space-y-6">
      {/* Target Word & Meaning Card */}
      <div className="w-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 text-center space-y-3 shadow-xs">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 px-3 py-1 rounded-full">
          <Mic size={13} />
          Phát âm từ này
        </span>

        <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
          {word.meaning}
        </p>

        <div className="flex items-center justify-center gap-3">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            {word.word}
          </h2>

          {/* Audio preview button */}
          <button
            type="button"
            onClick={() => onPlayAudio("us")}
            className="flex items-center justify-center size-10 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            title="Nghe mẫu phát âm"
          >
            <Volume2 size={18} />
          </button>
        </div>

        {word.ipaUs && (
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 font-mono">
            /{word.ipaUs.replace(/^\/|\/$/g, "")}/
          </p>
        )}
      </div>

      {/* Large Circular Blue Microphone Button */}
      <div className="flex flex-col items-center justify-center py-2">
        {/* Concentric Microphone Container */}
        <div className="relative flex items-center justify-center size-24">
          {/* Pulsing Wave Animation Rings (Concentric with button) */}
          {isRecording && (
            <>
              <span className="absolute size-24 rounded-full bg-rose-400/30 animate-ping" />
              <span className="absolute size-28 rounded-full bg-rose-400/20 animate-pulse" />
            </>
          )}

          <button
            type="button"
            onClick={onToggleRecord}
            className={`relative z-10 size-20 rounded-full shadow-lg flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer ${
              isRecording
                ? "bg-rose-500 shadow-rose-200 dark:shadow-rose-950/50 ring-4 ring-rose-200 dark:ring-rose-950/60"
                : "bg-sky-500 hover:bg-sky-600 shadow-sky-200 dark:shadow-sky-950/50 ring-4 ring-sky-100 dark:ring-sky-950/60"
            }`}
            aria-label={isRecording ? "Dừng ghi âm" : "Bắt đầu phát âm"}
            title={isRecording ? "Nhấn để dừng ghi âm" : "Nhấn để ghi âm phát âm"}
          >
            <Mic size={32} className={isRecording ? "animate-bounce" : ""} />
          </button>
        </div>

        <p className="mt-3 text-sm font-bold text-slate-600 dark:text-slate-300">
          {isRecording ? "Đang lắng nghe... Hãy đọc to từ vựng" : "Nhấn vào micro để bắt đầu nói (hoặc Space)"}
        </p>

        {/* Skip Option: Allow skipping pronunciation to reveal SRS ratings */}
        {!canRateSrs && (
          <button
            type="button"
            onClick={onSkipSpeaking || onSkip}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <FastForward size={13} />
            <span>Bỏ qua phần phát âm</span>
          </button>
        )}
      </div>

      {/* Evaluation Feedback if spoken */}
      {feedback && (
        <div
          className={`w-full p-5 sm:p-6 rounded-3xl border text-center space-y-2 animate-fadeIn shadow-xs ${
            score === 100
              ? "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60"
              : score === 0
              ? "bg-amber-50/70 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60"
              : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            {score === 100 ? (
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-base sm:text-lg font-black bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 shadow-2xs">
                <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400" />
                <span>Phát âm chính xác!</span>
              </span>
            ) : score === 0 ? (
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-base sm:text-lg font-black bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 shadow-2xs">
                <AlertCircle size={20} className="text-amber-600 dark:text-amber-400" />
                <span>Chưa chính xác, cần cải thiện thêm</span>
              </span>
            ) : null}
          </div>

          <p className="text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-200 max-w-lg mx-auto">
            {score === 100
              ? "Rất tốt! Hãy chọn mức độ ghi nhớ của bạn ở các nút bên dưới:"
              : score === 0
              ? "Bạn có thể nhấn micro ở trên để phát âm lại, hoặc chọn mức độ ghi nhớ bên dưới:"
              : feedback}
          </p>
        </div>
      )}

      {/* Note when pronunciation was skipped */}
      {isSkipped && !feedback && (
        <div className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-3xl text-center space-y-1 animate-fadeIn shadow-xs">
          <p className="text-sm sm:text-base font-bold text-slate-700 dark:text-slate-200">
            Đã bỏ qua phần phát âm. Hãy đánh giá mức độ ghi nhớ của bạn bên dưới:
          </p>
        </div>
      )}

      {/* SRS Rating Buttons (Shown post-evaluation OR when learner clicked skip speaking) */}
      {canRateSrs && (
        <div className="w-full space-y-2 animate-fadeIn">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 text-center uppercase tracking-wider">
            Đánh giá mức độ ghi nhớ (Spaced Repetition SRS):
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {SRS_OPTIONS.map((opt) => (
              <button
                key={opt.rating}
                type="button"
                onClick={() => onRateSrs(opt.rating)}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all active:scale-95 cursor-pointer ${opt.styleClass}`}
              >
                <div className="flex items-center gap-1">
                  <span className="text-xs font-extrabold">{opt.label}</span>
                  <kbd className="text-[9px] font-mono opacity-80 border border-current/30 px-1 rounded">
                    {opt.keyNumber}
                  </kbd>
                </div>
                <span className="text-[10px] font-medium opacity-85 mt-0.5">
                  Ôn lại: {opt.intervalText}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
