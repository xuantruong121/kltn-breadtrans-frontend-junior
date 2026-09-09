"use client";

import React from "react";
import { Mic, Volume2, FastForward } from "lucide-react";
import { VocabWord } from "@/lib/api/services/vocab.service";
import { SrsRating } from "../types/study";

interface SpeakingStageProps {
  word: VocabWord;
  isRecording: boolean;
  transcript: string;
  score: number | null;
  feedback: string | null;
  onToggleRecord: () => void;
  onPlayAudio: (accent?: "us" | "uk") => void;
  onRateSrs: (rating: SrsRating) => void;
  onSkip: () => void;
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
    styleClass: "bg-amber-50 hover:bg-amber-100/80 border-amber-200 text-amber-800",
    keyNumber: "2",
  },
  {
    rating: "GOOD",
    label: "Tốt",
    intervalText: "6d",
    styleClass: "bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200 text-emerald-800",
    keyNumber: "3",
  },
  {
    rating: "EASY",
    label: "Dễ",
    intervalText: "8d",
    styleClass: "bg-blue-50 hover:bg-blue-100/80 border-blue-200 text-blue-800",
    keyNumber: "4",
  },
];

export const SpeakingStage: React.FC<SpeakingStageProps> = ({
  word,
  isRecording,
  transcript,
  score,
  feedback,
  onToggleRecord,
  onPlayAudio,
  onRateSrs,
  onSkip,
}) => {
  return (
    <div className="flex flex-col items-center w-full max-w-xl mx-auto space-y-6">
      {/* Target Word & Meaning Card */}
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 text-center space-y-3 shadow-xs">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-sky-700 bg-sky-50 border border-sky-200 px-3 py-1 rounded-full">
          <Mic size={13} />
          Phát âm từ này
        </span>

        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
          {word.meaning}
        </p>

        <div className="flex items-center justify-center gap-3">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            {word.word}
          </h2>

          {/* Audio preview button */}
          <button
            type="button"
            onClick={() => onPlayAudio("us")}
            className="flex items-center justify-center size-10 rounded-full bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors"
            title="Nghe mẫu phát âm"
          >
            <Volume2 size={18} />
          </button>
        </div>

        {word.ipaUs && (
          <p className="text-sm font-semibold text-slate-500 font-mono">
            /{word.ipaUs.replace(/^\/|\/$/g, "")}/
          </p>
        )}
      </div>

      {/* Large Circular Blue Microphone Button */}
      <div className="relative flex flex-col items-center justify-center py-2">
        {/* Pulsing Wave Animation Rings */}
        {isRecording && (
          <>
            <span className="absolute size-28 rounded-full bg-sky-400/30 animate-ping" />
            <span className="absolute size-36 rounded-full bg-sky-400/20 animate-pulse" />
          </>
        )}

        <button
          type="button"
          onClick={onToggleRecord}
          className={`relative z-10 size-20 rounded-full shadow-lg flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer ${
            isRecording
              ? "bg-rose-500 shadow-rose-200 ring-4 ring-rose-200"
              : "bg-sky-500 hover:bg-sky-600 shadow-sky-200 ring-4 ring-sky-100"
          }`}
          aria-label={isRecording ? "Dừng ghi âm" : "Bắt đầu phát âm"}
          title={isRecording ? "Nhấn để dừng ghi âm" : "Nhấn để ghi âm phát âm"}
        >
          <Mic size={32} className={isRecording ? "animate-bounce" : ""} />
        </button>

        <p className="mt-3 text-xs font-bold text-slate-500">
          {isRecording ? "Đang lắng nghe... Hãy đọc to từ vựng" : "Nhấn vào micro để bắt đầu nói (hoặc Space)"}
        </p>

        {/* Skip Option */}
        <button
          type="button"
          onClick={onSkip}
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <FastForward size={13} />
          <span>Bỏ qua chế độ này</span>
        </button>
      </div>

      {/* Evaluation Feedback if spoken */}
      {feedback && (
        <div className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center space-y-1 animate-fadeIn">
          {score !== null && (
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-white border border-slate-200 shadow-2xs">
              <span>Điểm phát âm:</span>
              <span className={score >= 80 ? "text-emerald-600" : "text-amber-600"}>
                {score}/100
              </span>
            </div>
          )}
          {transcript && (
            <p className="text-xs text-slate-500 font-semibold">
              Đã thu âm: &ldquo;<span className="text-slate-800">{transcript}</span>&rdquo;
            </p>
          )}
          <p className="text-xs font-medium text-slate-600">{feedback}</p>
        </div>
      )}

      {/* SRS Rating Buttons (Post-Evaluation / Active Rate) */}
      <div className="w-full space-y-2">
        <p className="text-xs font-bold text-slate-500 text-center uppercase tracking-wider">
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
    </div>
  );
};
