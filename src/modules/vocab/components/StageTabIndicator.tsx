"use client";

import React from "react";
import { RotateCw, HelpCircle, Keyboard, Mic } from "lucide-react";
import { StudyMode } from "../types/study";

interface StageTabIndicatorProps {
  currentMode: StudyMode;
  onSelectMode: (mode: StudyMode) => void;
}

const STAGES: Array<{
  id: StudyMode;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
  { id: "FLASHCARD", label: "Flashcard", icon: RotateCw },
  { id: "QUIZ", label: "Trắc nghiệm", icon: HelpCircle },
  { id: "TYPING", label: "Gõ từ", icon: Keyboard },
  { id: "SPEAKING", label: "Phát âm", icon: Mic },
];

export const StageTabIndicator: React.FC<StageTabIndicatorProps> = ({
  currentMode,
  onSelectMode,
}) => {
  return (
    <nav
      className="flex items-center justify-center gap-2 overflow-x-auto pb-1 scrollbar-none"
      aria-label="Các giai đoạn làm chủ từ vựng"
    >
      {STAGES.map((stage) => {
        const Icon = stage.icon;
        const isActive = currentMode === stage.id;

        return (
          <button
            key={stage.id}
            type="button"
            onClick={() => onSelectMode(stage.id)}
            className={`inline-flex items-center gap-1.5 text-xs transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none whitespace-nowrap ${
              isActive
                ? "bg-sky-500 text-white shadow-sm font-semibold rounded-full px-4 py-1.5 scale-102"
                : "bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200/80 rounded-full px-4 py-1.5 font-medium border border-transparent"
            }`}
            aria-current={isActive ? "step" : undefined}
          >
            <Icon size={14} className={isActive ? "text-white" : "text-slate-400"} />
            <span>{stage.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
