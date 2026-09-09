"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Eye, BookOpen, Gamepad2, SlidersHorizontal, Zap } from "lucide-react";

interface StudyTopHeaderProps {
  topicTitle: string;
  learnedCount: number;
  totalWordsCount: number;
  completionPercentage: number;
  onOpenWordList: () => void;
  onOpenSettings: () => void;
  onSwitchToGame?: () => void;
}

export const StudyTopHeader: React.FC<StudyTopHeaderProps> = ({
  topicTitle,
  learnedCount,
  totalWordsCount,
  completionPercentage,
  onOpenWordList,
  onOpenSettings,
  onSwitchToGame,
}) => {
  return (
    <div className="w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30">
      {/* Top Header Bar */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        {/* Left: Back Arrow & Optional Topic Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            href="/flashcard"
            className="flex size-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none shrink-0"
            aria-label="Quay lại danh mục flashcard"
            title="Quay lại danh mục"
          >
            <ArrowLeft size={18} />
          </Link>
          {topicTitle && (
            <span
              className="hidden lg:inline-block text-xs font-bold text-slate-600 truncate max-w-[160px]"
              title={topicTitle}
            >
              {topicTitle}
            </span>
          )}
        </div>

        {/* Center Pill Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-full border border-slate-200/80">
          <button
            type="button"
            onClick={onOpenWordList}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-full hover:bg-white/60 transition-colors"
            title="Xem danh sách từ"
          >
            <Eye size={14} className="text-slate-500" />
            <span className="hidden sm:inline">Xem từ</span>
          </button>

          <button
            type="button"
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 text-xs font-black text-white bg-sky-500 rounded-full shadow-xs"
            title="Chế độ học"
          >
            <BookOpen size={14} />
            <span>Học</span>
          </button>

          <button
            type="button"
            onClick={onSwitchToGame}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-full hover:bg-white/60 transition-colors"
            title="Chơi trò chơi ôn tập"
          >
            <Gamepad2 size={14} className="text-slate-500" />
            <span className="hidden sm:inline">Chơi</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center justify-center size-7 rounded-full text-slate-500 hover:text-slate-900 hover:bg-white/80 transition-colors"
            title="Cài đặt âm thanh & phím tắt"
          >
            <SlidersHorizontal size={13} />
          </button>
        </div>

        {/* Right Side: Energy & Word Counter */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-extrabold shadow-2xs">
            <Zap size={13} className="fill-amber-500 text-amber-500" />
            <span>+0</span>
          </div>

          <div className="text-xs font-black text-slate-700 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full whitespace-nowrap">
            <span className="text-sky-600">{learnedCount}</span>
            <span className="text-slate-400">/{totalWordsCount} từ</span>
          </div>
        </div>
      </div>

      {/* Top Progress Line across screen width */}
      <div
        className="w-full h-1 bg-slate-100 overflow-hidden"
        role="progressbar"
        aria-valuenow={completionPercentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Tiến độ hoàn thành bài học"
      >
        <div
          className="h-full bg-sky-500 transition-all duration-300 ease-out"
          style={{ width: `${completionPercentage}%` }}
        />
      </div>
    </div>
  );
};
