"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Eye, Gamepad2, SlidersHorizontal } from "lucide-react";
import { PracticeHeader } from "@/components/practice/PracticeHeader";

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
  const router = useRouter();

  return (
    <div className="sticky top-0 z-30 w-full">
      <PracticeHeader
        title={topicTitle || "Luyện từ vựng"}
        activityLabel="Học từ vựng"
        onExit={() => router.push("/flashcard")}
        exitLabel="Thoát"
        statusContent={
          <div className="flex items-center gap-1.5 xs:gap-2">
            <div className="text-xs font-bold text-slate-300 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-lg whitespace-nowrap">
              <span className="text-sky-400 font-black">{learnedCount}</span>
              <span className="text-slate-500">/{totalWordsCount} từ</span>
            </div>
          </div>
        }
        additionalActions={
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={onOpenWordList}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 border border-slate-700 transition-colors cursor-pointer"
              title="Xem danh sách từ"
            >
              <Eye size={14} className="text-slate-400" aria-hidden="true" />
              <span className="hidden sm:inline">Xem từ</span>
            </button>

            {onSwitchToGame && (
              <button
                type="button"
                onClick={onSwitchToGame}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 border border-slate-700 transition-colors cursor-pointer"
                title="Chơi trò chơi ôn tập"
              >
                <Gamepad2 size={14} className="text-slate-400" aria-hidden="true" />
                <span className="hidden sm:inline">Chơi</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenSettings}
              className="inline-flex items-center justify-center size-7 rounded-lg text-slate-400 hover:text-white bg-slate-800 border border-slate-700 transition-colors cursor-pointer"
              title="Cài đặt âm thanh & phím tắt"
              aria-label="Cài đặt âm thanh và phím tắt"
            >
              <SlidersHorizontal size={13} aria-hidden="true" />
            </button>
          </div>
        }
      />

      {/* Top Progress Line across screen width */}
      <div
        className="w-full h-1 bg-slate-800 overflow-hidden"
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
