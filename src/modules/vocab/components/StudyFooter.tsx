"use client";

import React from "react";
import { StudyMode } from "../types/study";
import { stageCounter } from "../utils/dueReview";

interface StudyFooterProps {
  currentMode: StudyMode;
  newCount: number;
  learnedCount: number;
  reviewCount: number;
  /** Over the forest scene: a glass bar (see .scene-glass in globals.css). */
  glass?: boolean;
  /** The steps this word goes through; all four when left out. */
  stages?: readonly StudyMode[];
  /** A due-word review: the words still to ask are not new words. */
  dueReview?: boolean;
}

const ALL_STAGES: readonly StudyMode[] = ["FLASHCARD", "QUIZ", "TYPING", "SPEAKING"];
const STAGE_TITLE: Record<StudyMode, string> = {
  FLASHCARD: "Flashcard",
  QUIZ: "Trắc nghiệm",
  TYPING: "Gõ từ",
  SPEAKING: "Phát âm",
};

export const StudyFooter: React.FC<StudyFooterProps> = ({
  currentMode,
  newCount,
  learnedCount,
  reviewCount,
  glass = false,
  stages,
  dueReview = false,
}) => {
  const counter = stageCounter(currentMode, stages ?? ALL_STAGES);

  return (
    <footer className={`w-full ${glass ? "glass-bar" : "bg-white/95 dark:bg-slate-900/95 backdrop-blur-md"} border-t border-slate-200/80 dark:border-slate-800 py-3.5 phone-land:py-2 px-4 sticky bottom-0 phone-land:static z-20`}>
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-center sm:text-left">
        {/* Stage Counter Centered in muted text */}
        <div className="text-xs font-bold text-slate-600 dark:text-slate-400">
          Chế độ {counter.step}/{counter.total}:{" "}
          <span className="text-slate-800 dark:text-slate-100 font-extrabold">{STAGE_TITLE[currentMode]}</span>
        </div>

        {/* Queue Summary Bar */}
        <div className="flex items-center justify-center sm:justify-end gap-5 text-xs font-bold">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-sky-500" />
            <span className="text-sky-700 dark:text-sky-400">{newCount} {dueReview ? "Chờ ôn" : "Từ mới"}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-teal-500" />
            <span className="text-teal-700 dark:text-teal-400">{learnedCount} Đã học</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-orange-500" />
            <span className="text-orange-700 dark:text-orange-400">{reviewCount} Ôn tập</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
