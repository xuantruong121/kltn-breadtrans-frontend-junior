"use client";

import React from "react";
import { Mic, Volume2, FastForward, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { VocabWord } from "@/lib/api/services/vocab.service";

interface SpeakingStageProps {
  word: VocabWord;
  isRecording: boolean;
  transcript: string;
  score: number | null;
  feedback: string | null;
  isSkipped?: boolean;
  onToggleRecord: () => void;
  onPlayAudio: (accent?: "us" | "uk") => void;
  /** Grade the word without the speaking step ("Bỏ qua phần phát âm"). */
  onSkipSpeaking?: () => void;
  /** Grade the word after a failed or impossible attempt ("Tiếp tục"). */
  onContinue?: () => void;
}

/**
 * The last step of a word. Its result goes into the grade the system gives
 * the word (thesis supervisor 2026-11-26); the learner no longer rates it.
 */
export const SpeakingStage: React.FC<SpeakingStageProps> = ({
  word,
  isRecording,
  score,
  feedback,
  isSkipped = false,
  onToggleRecord,
  onPlayAudio,
  onSkipSpeaking,
  onContinue,
}) => {
  const attempted = score !== null || feedback !== null || isSkipped;
  const canContinue = feedback !== null && score !== 100;

  return (
    <div className="flex flex-col items-center w-full max-w-2xl sm:max-w-3xl md:max-w-4xl mx-auto space-y-6 short:space-y-3">
      {/* Target Word & Meaning Card */}
      <div className="glass-face w-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 md:p-9 short:p-5 text-center space-y-4 short:space-y-2 shadow-xs">
        <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-extrabold uppercase tracking-wider text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 px-3.5 py-1.5 rounded-full">
          <Mic size={15} />
          Phát âm từ này
        </span>

        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider">
          {word.meaning}
        </p>

        <div className="flex items-center justify-center gap-3.5">
          <h2 className="text-4xl sm:text-5xl md:text-6xl short:text-5xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {word.word}
          </h2>

          {/* Audio preview button */}
          <button
            type="button"
            onClick={() => onPlayAudio("us")}
            className="flex items-center justify-center size-11 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
            title="Nghe mẫu phát âm"
          >
            <Volume2 size={20} />
          </button>
        </div>

        {word.ipaUs && (
          <p className="text-base sm:text-lg font-bold text-slate-600 dark:text-slate-400 font-mono">
            /{word.ipaUs.replace(/^\/|\/$/g, "")}/
          </p>
        )}
      </div>

      {/* Large Circular Blue Microphone Button */}
      <div className="flex flex-col items-center justify-center py-2">
        {/* Concentric Microphone Container */}
        <div className="relative flex items-center justify-center size-24 short:size-20">
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
            className={`relative z-10 size-20 short:size-16 rounded-full shadow-lg flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer ${
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

        {/* Skip Option: the word is graded without the speaking step */}
        {!attempted && (
          <button
            type="button"
            onClick={onSkipSpeaking}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <FastForward size={13} />
            <span>Bỏ qua phần phát âm</span>
            <kbd className="text-xs font-mono opacity-80 border border-current/30 px-1 rounded">Enter</kbd>
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
              ? "Rất tốt! Đang chấm từ này…"
              : score === 0
              ? "Bạn có thể nhấn micro ở trên để nói lại, hoặc bấm Tiếp tục."
              : feedback}
          </p>
        </div>
      )}

      {/* After a failed or impossible attempt: grade the word as it stands */}
      {canContinue && onContinue && (
        <button
          type="button"
          onClick={onContinue}
          className="w-full inline-flex min-h-[52px] sm:min-h-[56px] short:min-h-12 items-center justify-center gap-2 rounded-2xl bg-sky-700 hover:bg-sky-800 text-white font-black text-base sm:text-lg transition-colors shadow-sm cursor-pointer animate-fadeIn"
        >
          <span>Tiếp tục</span>
          <ArrowRight size={18} aria-hidden="true" />
          <kbd className="hidden sm:inline text-xs font-mono font-bold bg-sky-700 text-white px-2 py-0.5 rounded-md">Enter</kbd>
        </button>
      )}
    </div>
  );
};
