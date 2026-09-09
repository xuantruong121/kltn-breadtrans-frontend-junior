"use client";

import React from "react";
import { StudyMode } from "../types/study";

interface StudyFooterProps {
  currentMode: StudyMode;
  newCount: number;
  learnedCount: number;
  reviewCount: number;
}

const MODE_STAGE_NUMBERS: Record<StudyMode, { step: number; title: string }> = {
  FLASHCARD: { step: 1, title: "Flashcard" },
  QUIZ: { step: 2, title: "Trắc nghiệm" },
  TYPING: { step: 3, title: "Gõ từ" },
  SPEAKING: { step: 4, title: "Phát âm" },
};

export const StudyFooter: React.FC<StudyFooterProps> = ({
  currentMode,
  newCount,
  learnedCount,
  reviewCount,
}) => {
  const currentStageInfo = MODE_STAGE_NUMBERS[currentMode];

  return (
    <footer className="w-full bg-white/95 backdrop-blur-md border-t border-slate-200/80 py-3.5 px-4 sticky bottom-0 z-20">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-center sm:text-left">
        {/* Stage Counter Centered in muted text */}
        <div className="text-xs font-bold text-slate-500">
          Chế độ {currentStageInfo.step}/4:{" "}
          <span className="text-slate-800 font-extrabold">{currentStageInfo.title}</span>
        </div>

        {/* Queue Summary Bar */}
        <div className="flex items-center justify-center sm:justify-end gap-5 text-xs font-bold">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-sky-500" />
            <span className="text-sky-600">{newCount} Từ mới</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-purple-500" />
            <span className="text-purple-600">{learnedCount} Đã học</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-orange-500" />
            <span className="text-orange-500">{reviewCount} Ôn tập</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
