"use client";

import React, { useRef, useEffect } from "react";
import { Lightbulb, Check, X, ArrowRight, Keyboard } from "lucide-react";
import { VocabWord } from "@/lib/api/services/vocab.service";

interface TypingStageProps {
  word: VocabWord;
  input: string;
  hintCount: number;
  feedback: "CORRECT" | "INCORRECT" | null;
  onInputChange: (val: string) => void;
  onCheck: () => void;
  onRevealHint: () => void;
}

export const TypingStage: React.FC<TypingStageProps> = ({
  word,
  input,
  hintCount,
  feedback,
  onInputChange,
  onCheck,
  onRevealHint,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="flex flex-col items-center w-full max-w-xl mx-auto space-y-6">
      {/* Prompt Card */}
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 text-center space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-sky-700 bg-sky-50 border border-sky-200 px-3 py-1 rounded-full">
            <Keyboard size={13} />
            Gõ từ tiếng Anh
          </span>
          {word.pos && (
            <span className="text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200 rounded-full px-3 py-0.5">
              ({word.pos})
            </span>
          )}
        </div>

        {/* Large Vietnamese definition */}
        <div className="py-3">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">
            Nghĩa tiếng Việt
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {word.meaning}
          </h2>
        </div>

        {/* Hint Pill if revealed */}
        {hintCount > 0 && (
          <div className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs font-bold text-amber-800 animate-fadeIn">
            <span>Gợi ý:</span>
            <span className="font-mono tracking-widest text-amber-900 uppercase">
              {word.word.slice(0, hintCount)}
              {"_".repeat(Math.max(0, word.word.length - hintCount))}
            </span>
          </div>
        )}
      </div>

      {/* Input Field & Controls */}
      <div className="w-full space-y-3">
        <div className="relative w-full">
          <input
            ref={inputRef}
            type="text"
            value={input}
            disabled={feedback !== null}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onCheck();
              }
            }}
            placeholder="Gõ từ tiếng Anh..."
            className={`w-full border-2 rounded-2xl text-center text-xl font-semibold py-3.5 px-12 transition-all outline-none ${
              feedback === "CORRECT"
                ? "border-emerald-500 bg-emerald-50 text-emerald-950 ring-4 ring-emerald-100"
                : feedback === "INCORRECT"
                ? "border-rose-500 bg-rose-50 text-rose-950 ring-4 ring-rose-100"
                : "border-sky-400 focus:ring-4 focus:ring-sky-100 bg-white text-slate-900"
            }`}
          />

          {/* Lightbulb Hint Button */}
          <button
            type="button"
            onClick={onRevealHint}
            disabled={feedback !== null}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center size-9 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer"
            title="Nhấn để nhận gợi ý chữ cái đầu"
          >
            <Lightbulb size={17} />
          </button>
        </div>

        {/* Instant Feedback Message */}
        {feedback === "CORRECT" && (
          <div className="flex items-center justify-center gap-2 text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-2xl py-2 animate-fadeIn">
            <Check size={16} />
            <span>Chính xác! Chuẩn bị chuyển qua luyện phát âm.</span>
          </div>
        )}

        {feedback === "INCORRECT" && (
          <div className="flex items-center justify-center gap-2 text-sm font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-2xl py-2 animate-fadeIn">
            <X size={16} />
            <span>
              Chưa chính xác! Đáp án đúng: <strong className="font-extrabold">{word.word}</strong>
            </span>
          </div>
        )}

        {/* Primary Submit Button */}
        <div className="flex flex-col items-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={onCheck}
            disabled={feedback !== null || !input.trim()}
            className="w-full inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-sky-500 hover:bg-sky-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold text-sm transition-all active:scale-98 shadow-sm cursor-pointer"
          >
            <span>Kiểm tra</span>
            <ArrowRight size={16} />
          </button>
          <span className="text-xs text-slate-400 font-medium">Enter để kiểm tra</span>
        </div>
      </div>
    </div>
  );
};
