"use client";

import React from "react";
import { Volume2, CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { VocabWord } from "@/lib/api/services/vocab.service";
import { QuizOption } from "../types/study";

interface QuizStageProps {
  word: VocabWord;
  options: QuizOption[];
  selectedKey: string | null;
  answered: boolean;
  onSelectOption: (key: string) => void;
  onPlayAudio: (accent?: "us" | "uk") => void;
}

export const QuizStage: React.FC<QuizStageProps> = ({
  word,
  options,
  selectedKey,
  answered,
  onSelectOption,
  onPlayAudio,
}) => {
  const ipaUsText = word.ipaUs ? `/${word.ipaUs.replace(/^\/|\/$/g, "")}/` : "/US/";
  const ipaUkText = word.ipaUk ? `/${word.ipaUk.replace(/^\/|\/$/g, "")}/` : "/UK/";

  return (
    <div className="flex flex-col items-center w-full max-w-xl mx-auto space-y-5">
      {/* Question Header Card */}
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-6 text-center space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-sky-700 bg-sky-50 border border-sky-200 px-3 py-1 rounded-full">
            <HelpCircle size={13} />
            Trắc nghiệm ý nghĩa
          </span>
          <span className="text-xs text-slate-400 font-medium">Bấm 1, 2, 3, hoặc 4</span>
        </div>

        {/* Target Word */}
        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          {word.word}
        </h2>

        {word.pos && (
          <span className="inline-block text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200 rounded-full px-3 py-0.5">
            ({word.pos})
          </span>
        )}

        {/* Dual Audio Pronunciation Pills */}
        <div className="flex items-center justify-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => onPlayAudio("us")}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold hover:bg-blue-100 transition-colors"
            title="Nghe phát âm Mỹ"
          >
            <Volume2 size={14} className="text-blue-600" />
            <span>{ipaUsText}</span>
          </button>

          <button
            type="button"
            onClick={() => onPlayAudio("uk")}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-100 transition-colors"
            title="Nghe phát âm Anh"
          >
            <Volume2 size={14} className="text-rose-600" />
            <span>{ipaUkText}</span>
          </button>
        </div>
      </div>

      {/* Answer Grid: 4 Vertical Option Cards */}
      <div className="w-full space-y-2.5" role="radiogroup" aria-label="Lựa chọn câu trả lời">
        {options.map((option) => {
          const isSelected = selectedKey === option.key;
          let styleClass =
            "bg-white border-slate-200 text-slate-800 hover:border-sky-400 hover:bg-sky-50/40";

          if (answered) {
            if (option.isCorrect) {
              styleClass =
                "bg-emerald-50 border-emerald-500 text-emerald-950 font-bold shadow-xs";
            } else if (isSelected && !option.isCorrect) {
              styleClass =
                "bg-rose-50 border-rose-500 text-rose-950 font-bold shadow-xs";
            } else {
              styleClass = "bg-slate-50/60 border-slate-200 text-slate-400 opacity-60";
            }
          }

          return (
            <button
              key={option.id}
              type="button"
              disabled={answered}
              onClick={() => onSelectOption(option.key)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-150 text-left cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none min-h-[54px] ${styleClass}`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <span
                  className={`size-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-colors ${
                    answered && option.isCorrect
                      ? "bg-emerald-500 text-white"
                      : answered && isSelected && !option.isCorrect
                      ? "bg-rose-500 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {option.key}
                </span>
                <span className="text-sm font-semibold truncate sm:whitespace-normal">
                  {option.text}
                </span>
              </div>

              {answered && (
                <div className="shrink-0 ml-2">
                  {option.isCorrect ? (
                    <CheckCircle2 size={20} className="text-emerald-600" />
                  ) : isSelected && !option.isCorrect ? (
                    <XCircle size={20} className="text-rose-600" />
                  ) : null}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
