"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Volume2,
  RotateCw,
  Check,
  Settings,
  AlertTriangle,
} from "lucide-react";
import { VocabWord } from "@/lib/api/services/vocab.service";

interface FlashcardStageProps {
  word: VocabWord;
  isFlipped: boolean;
  onFlip: () => void;
  onPlayAudio: (accent?: "us" | "uk", text?: string) => void;
  onMarkMastered: () => void;
  onEscalate: () => void;
  onOpenSettings?: () => void;
}

export const FlashcardStage: React.FC<FlashcardStageProps> = ({
  word,
  isFlipped,
  onFlip,
  onPlayAudio,
  onMarkMastered,
  onEscalate,
  onOpenSettings,
}) => {
  // Format phonetics
  const ipaUsText = word.ipaUs ? `/${word.ipaUs.replace(/^\/|\/$/g, "")}/` : "/US/";
  const ipaUkText = word.ipaUk ? `/${word.ipaUk.replace(/^\/|\/$/g, "")}/` : "/UK/";

  return (
    <div className="flex flex-col items-center w-full max-w-xl mx-auto space-y-6">
      {/* 3D Flippable Card Container */}
      <div
        className="w-full h-[400px] sm:h-[420px] [perspective:1000px] cursor-pointer select-none"
        onClick={onFlip}
      >
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          className="relative w-full h-full [transform-style:preserve-3d]"
        >
          {/* ==================================================== */}
          {/* FRONT FACE */}
          {/* ==================================================== */}
          <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-sky-600 bg-sky-50 border border-sky-200/80 px-3 py-1 rounded-full">
                Flashcard
              </span>

              <div
                className="flex items-center gap-2 text-slate-400"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={onMarkMastered}
                  className="min-h-11 min-w-11 p-1.5 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                  title="Đánh dấu đã thuộc"
                  aria-label="Đánh dấu đã thuộc"
                >
                  <Check size={16} />
                </button>
                {onOpenSettings && (
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className="min-h-11 min-w-11 p-1.5 rounded-xl hover:bg-slate-100 hover:text-slate-700 transition-colors"
                    title="Cài đặt thẻ"
                    aria-label="Cài đặt thẻ"
                  >
                    <Settings size={16} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => alert("Cảm ơn bạn đã phản hồi về từ vựng này.")}
                  className="min-h-11 min-w-11 p-1.5 rounded-xl hover:bg-rose-50 hover:text-rose-500 transition-colors"
                  title="Báo cáo lỗi từ vựng"
                  aria-label="Báo cáo lỗi từ vựng"
                >
                  <AlertTriangle size={15} />
                </button>
              </div>
            </div>

            {/* Main Word Body */}
            <div className="flex flex-col items-center justify-center text-center my-auto space-y-3">
              <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-800 tracking-tight">
                {word.word}
              </h2>

              {word.pos && (
                <span className="text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200 rounded-full px-3 py-0.5">
                  ({word.pos})
                </span>
              )}

              {/* Dual Audio Buttons with Phonetics */}
              <div
                className="flex items-center justify-center gap-3 pt-2"
                onClick={(e) => e.stopPropagation()}
              >
                {/* US Audio Button (Blue) */}
                <button
                  type="button"
                  onClick={() => onPlayAudio("us")}
                  className="min-h-11 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold hover:bg-blue-100 transition-all active:scale-95"
                  title="Nghe phát âm Mỹ"
                  aria-label="Nghe phát âm Mỹ"
                >
                  <Volume2 size={15} className="text-blue-600" />
                  <span>{ipaUsText}</span>
                </button>

                {/* UK Audio Button (Red) */}
                <button
                  type="button"
                  onClick={() => onPlayAudio("uk")}
                  className="min-h-11 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-100 transition-all active:scale-95"
                  title="Nghe phát âm Anh"
                  aria-label="Nghe phát âm Anh"
                >
                  <Volume2 size={15} className="text-rose-600" />
                  <span>{ipaUkText}</span>
                </button>
              </div>
            </div>

            {/* Bottom Hint */}
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 font-medium pt-2 border-t border-slate-100">
              <RotateCw size={13} className="text-slate-400" />
              <span>Nhấn để xem nghĩa (hoặc Space)</span>
            </div>
          </div>

          {/* ==================================================== */}
          {/* BACK FACE (Zero-scroll, single-glance layout) */}
          {/* ==================================================== */}
          <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-3xl border border-sky-200/90 bg-white p-5 sm:p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow overflow-hidden select-none">
            {/* Top Header Bar */}
            <div className="flex items-center justify-between shrink-0">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Nghĩa & Ngữ cảnh
              </span>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayAudio("us");
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors text-xs font-bold cursor-pointer"
                title="Nghe phát âm từ vựng"
                aria-label="Nghe phát âm từ vựng"
              >
                <Volume2 size={14} className="text-blue-600" />
                <span>{word.word}</span>
              </button>
            </div>

            {/* Primary Meaning Block */}
            <div className="text-center my-auto py-1">
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                {word.meaning}
              </h3>
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <span className="text-xs sm:text-sm font-semibold text-slate-600">
                  {word.word}
                </span>
                {word.pos && (
                  <span className="rounded-md border border-slate-200 bg-slate-100/80 px-1.5 py-0.2 text-[10px] font-extrabold uppercase text-slate-600">
                    {word.pos}
                  </span>
                )}
              </div>
            </div>

            {/* Example Sentence Card */}
            {(word.exampleEn || word.exampleVi) && (
              <div
                className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 sm:p-3.5 space-y-1 text-left shrink-0 transition-colors hover:bg-slate-50"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug italic">
                    &ldquo;{word.exampleEn}&rdquo;
                  </p>
                  {word.exampleEn && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onPlayAudio("us", word.exampleEn);
                      }}
                      className="p-1 text-slate-400 hover:text-sky-600 rounded-md hover:bg-white transition-colors shrink-0 cursor-pointer"
                      title="Nghe câu ví dụ"
                      aria-label="Nghe câu ví dụ"
                    >
                      <Volume2 size={14} />
                    </button>
                  )}
                </div>
                {word.exampleVi && (
                  <p className="text-[11px] sm:text-xs text-slate-500 leading-normal font-normal">
                    {word.exampleVi}
                  </p>
                )}
              </div>
            )}

            {/* Collocations (Cụm từ thường gặp) */}
            {word.collocations && word.collocations.length > 0 && (
              <div
                className="pt-2 text-left shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-900/80">
                    Cụm từ thường gặp
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {word.collocations.slice(0, 3).map((collocation) => (
                    <button
                      key={collocation.phrase}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onPlayAudio("us", collocation.phrase);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200/90 bg-amber-50/70 hover:bg-amber-100/90 px-2.5 py-1 text-xs font-semibold text-amber-900 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500 cursor-pointer"
                      title={`Nghe cụm từ: ${collocation.phrase}`}
                      aria-label={`Nghe cụm từ ${collocation.phrase}`}
                    >
                      <span>{collocation.phrase}</span>
                      <span className="text-amber-700/80 border-l border-amber-300/80 pl-1.5 font-normal text-[11px]">
                        {collocation.meaningVi}
                      </span>
                      <Volume2 size={12} className="text-amber-600/80 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Card Footer: Flip back hint */}
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 font-medium pt-2 border-t border-slate-100 shrink-0">
              <RotateCw size={13} className="text-slate-400" />
              <span>Nhấn để quay lại từ vựng (Space)</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Action Buttons Below Card */}
      <div className="w-full flex flex-col items-center gap-2">
        <div className="flex items-center gap-3 w-full">
          {/* Left: [✔ Đã thuộc] */}
          <button
            type="button"
            onClick={onMarkMastered}
            className="flex-1 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border-2 border-emerald-500 bg-white hover:bg-emerald-50 text-emerald-700 font-extrabold text-sm transition-all active:scale-98 shadow-2xs focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none cursor-pointer"
          >
            <Check size={18} />
            <span>Đã thuộc</span>
            <kbd className="hidden sm:inline text-[10px] font-mono bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded ml-1">
              Tab
            </kbd>
          </button>

          {/* Right: [Chưa nhớ] */}
          <button
            type="button"
            onClick={onEscalate}
            className="flex-1 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-sm transition-all active:scale-98 shadow-sm focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none cursor-pointer"
          >
            <span>Chưa nhớ</span>
            <kbd className="hidden sm:inline text-[10px] font-mono bg-sky-600 text-white px-1.5 py-0.5 rounded ml-1">
              Enter
            </kbd>
          </button>
        </div>

        {/* Subtext Hint */}
        <p className="text-xs text-slate-400 text-center font-medium">
          Bấm &ldquo;Chưa nhớ&rdquo; để qua chế độ học tiếp theo
        </p>
      </div>
    </div>
  );
};
