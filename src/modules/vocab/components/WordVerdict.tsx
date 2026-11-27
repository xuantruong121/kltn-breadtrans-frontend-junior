"use client";

import React from "react";
import { ArrowRight, Check, Loader2, Minus, RotateCcw, TriangleAlert, X } from "lucide-react";
import type { SrsGrade } from "@/lib/api/services/vocab.service";
import type { WordVerdictState } from "../hooks/useVocabStudyEngine";
import { stepLines, verdictHeadline, type StepTone } from "../utils/wordVerdict";

interface WordVerdictProps {
  verdict: WordVerdictState;
  onContinue: () => void;
  onRetry: () => void;
  onDefer: () => void;
}

// Semantic accents: rose to relearn, amber hard, emerald good, sky easy.
const GRADE_TEXT: Record<SrsGrade, string> = {
  AGAIN: "text-rose-700 dark:text-rose-300",
  HARD: "text-amber-700 dark:text-amber-300",
  GOOD: "text-emerald-700 dark:text-emerald-300",
  EASY: "text-sky-700 dark:text-sky-300",
};

const TONE_ICON: Record<StepTone, React.ReactNode> = {
  ok: <Check size={16} className="text-emerald-600 dark:text-emerald-400" aria-hidden="true" />,
  warn: <TriangleAlert size={16} className="text-amber-600 dark:text-amber-400" aria-hidden="true" />,
  miss: <X size={16} className="text-rose-600 dark:text-rose-400" aria-hidden="true" />,
  none: <Minus size={16} className="text-slate-500 dark:text-slate-400" aria-hidden="true" />,
};

/**
 * The grade the system gave the word just finished (thesis supervisor
 * 2026-11-26: the learner no longer rates themselves), why, and when the word
 * comes back.
 */
export const WordVerdict: React.FC<WordVerdictProps> = ({ verdict, onContinue, onRetry, onDefer }) => {
  const { word, evidence, status, grade, intervalDays } = verdict;
  const lines = stepLines(evidence, { speaking: !verdict.review });

  return (
    <div className="flex flex-col items-center w-full max-w-2xl sm:max-w-3xl md:max-w-4xl mx-auto space-y-5 short:space-y-3">
      <div className="glass-face w-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 short:p-5 shadow-xs">
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl short:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {word.word}
          </h2>
          <p className="mt-1 text-sm sm:text-base font-semibold text-slate-600 dark:text-slate-400">{word.meaning}</p>
        </div>

        <div className="mt-5 text-center" aria-live="polite">
          {status === "PENDING" && (
            <p className="inline-flex items-center gap-2 text-lg font-bold text-slate-700 dark:text-slate-200">
              <Loader2 size={18} className="animate-spin" aria-hidden="true" />
              Đang chấm…
            </p>
          )}
          {status === "READY" && grade && (
            <p className={`text-xl sm:text-2xl font-black ${GRADE_TEXT[grade]}`}>
              {verdictHeadline(grade, intervalDays)}
            </p>
          )}
          {status === "ERROR" && (
            <p className="text-base sm:text-lg font-bold text-rose-700 dark:text-rose-300">
              Chưa lưu được kết quả của từ này.
            </p>
          )}
        </div>

        <ul className="mt-5 mx-auto max-w-sm divide-y divide-slate-100 dark:divide-slate-800 border-y border-slate-100 dark:border-slate-800">
          {lines.map((line) => (
            <li key={line.label} className="flex items-center justify-between gap-3 py-2.5 text-sm sm:text-base">
              <span className="font-semibold text-slate-600 dark:text-slate-400">{line.label}</span>
              <span className="inline-flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100">
                {TONE_ICON[line.tone]}
                {line.text}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Mức nhớ được xếp tự động từ kết quả các bước trên.
        </p>
      </div>

      {status === "ERROR" ? (
        <div className="flex w-full items-center gap-3">
          <button
            type="button"
            onClick={onDefer}
            className="flex-1 inline-flex min-h-[52px] short:min-h-12 items-center justify-center rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-bold text-base transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            Để sau
          </button>
          <button
            type="button"
            onClick={onRetry}
            className="flex-1 inline-flex min-h-[52px] short:min-h-12 items-center justify-center gap-2 rounded-2xl bg-sky-700 hover:bg-sky-800 text-white font-black text-base transition-colors shadow-sm cursor-pointer"
          >
            <RotateCcw size={18} aria-hidden="true" />
            <span>Thử lại</span>
            <kbd className="hidden sm:inline text-xs font-mono font-bold bg-sky-700 text-white px-2 py-0.5 rounded-md">Enter</kbd>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onContinue}
          disabled={status !== "READY"}
          className="w-full inline-flex min-h-[52px] sm:min-h-[56px] short:min-h-12 items-center justify-center gap-2 rounded-2xl bg-sky-700 hover:bg-sky-800 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-500 text-white font-black text-base sm:text-lg transition-colors shadow-sm cursor-pointer disabled:cursor-default"
        >
          <span>Tiếp tục</span>
          <ArrowRight size={18} aria-hidden="true" />
          <kbd className="hidden sm:inline text-xs font-mono font-bold bg-sky-700 text-white px-2 py-0.5 rounded-md">Enter</kbd>
        </button>
      )}
    </div>
  );
};
