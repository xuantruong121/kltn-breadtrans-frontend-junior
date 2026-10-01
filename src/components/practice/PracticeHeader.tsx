"use client";

import React, { useState, useRef, useEffect, type ReactNode } from "react";
import {
  ArrowLeft,
  Languages,
  StickyNote,
  Keyboard,
  Volume2,
  VolumeX,
  X,
  Activity,
} from "lucide-react";

export interface PracticeHeaderProps {
  /**
   * Title of the practice activity or topic.
   */
  title: string;
  /**
   * Optional subtitle or category (e.g. "Part 1 - Photographs" or "Daily Routine").
   */
  category?: string;
  subtitle?: string;
  /**
   * Optional difficulty level badge (e.g. "EASY", "MEDIUM", "HARD", "B1").
   */
  difficulty?: string;
  /**
   * Current question/item index (1-based).
   */
  currentItem?: number;
  /**
   * Total number of questions/items.
   */
  totalItems?: number;
  /**
   * Pre-formatted position label (e.g. "Câu 3/10" or "Part 5").
   * Overrides currentItem/totalItems if provided.
   */
  positionText?: string;
  /**
   * Activity mode or badge label (e.g. "Đánh giá phát âm", "Luyện nghe").
   */
  activityLabel?: string;
  /**
   * Callback fired when the user clicks the exit/back button.
   */
  onExit: () => void;
  /**
   * Label for the exit button. Defaults to "Thoát".
   */
  exitLabel?: string;
  /**
   * Disable the exit button (e.g. during an ongoing critical network submission).
   */
  exitDisabled?: boolean;

  /**
   * Bilingual toggle support. Only rendered when bilingualEnabled is true and handler is provided.
   */
  bilingualEnabled?: boolean;
  isBilingual?: boolean;
  onToggleBilingual?: () => void;

  /**
   * Notes modal trigger support. Only rendered when notesEnabled is true and handler is provided.
   */
  notesEnabled?: boolean;
  onOpenNotes?: () => void;

  /**
   * Keyboard shortcuts modal or popover support.
   */
  shortcutsEnabled?: boolean;
  onOpenShortcuts?: () => void;
  shortcutsContent?: ReactNode;

  /**
   * SFX / Audio mute toggle support.
   */
  soundEnabled?: boolean;
  soundMuted?: boolean;
  onToggleSound?: () => void;

  /**
   * Additional custom action buttons or status indicators on the right side.
   */
  additionalActions?: ReactNode;
  /**
   * Status content such as timer, live score, or word count.
   */
  statusContent?: ReactNode;
}

export const PracticeHeader: React.FC<PracticeHeaderProps> = ({
  title,
  category,
  subtitle,
  difficulty,
  currentItem,
  totalItems,
  positionText,
  activityLabel,
  onExit,
  exitLabel = "Thoát",
  exitDisabled = false,
  bilingualEnabled = false,
  isBilingual = false,
  onToggleBilingual,
  notesEnabled = false,
  onOpenNotes,
  shortcutsEnabled = false,
  onOpenShortcuts,
  shortcutsContent,
  soundEnabled = false,
  soundMuted = false,
  onToggleSound,
  additionalActions,
  statusContent,
}) => {
  const [showShortcutsPopover, setShowShortcutsPopover] = useState(false);
  const shortcutsRef = useRef<HTMLDivElement>(null);

  // Close shortcuts popover on outside click
  useEffect(() => {
    if (!showShortcutsPopover) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (shortcutsRef.current && !shortcutsRef.current.contains(e.target as Node)) {
        setShowShortcutsPopover(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showShortcutsPopover]);

  const displayCategory = category || subtitle;
  const displayPosition =
    positionText ??
    (typeof currentItem === "number" && typeof totalItems === "number"
      ? `Câu ${currentItem}/${totalItems}`
      : undefined);

  return (
    <header className="w-full h-14 bg-slate-900 text-white px-3 sm:px-6 flex items-center justify-between shrink-0 select-none border-b border-slate-800 z-30">
      {/* Left: Exit button + Title + Badges */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={onExit}
          disabled={exitDisabled}
          aria-label={exitLabel}
          className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-2.5 sm:px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          <span className="text-xs sm:text-sm">{exitLabel}</span>
        </button>

        <span className="text-slate-600 hidden xs:inline" aria-hidden="true">
          |
        </span>

        <div className="flex items-center gap-2 min-w-0">
          <span
            className="text-xs sm:text-sm font-bold text-slate-100 truncate max-w-[130px] xs:max-w-[200px] sm:max-w-[320px] md:max-w-[440px] lg:max-w-[560px]"
            title={title}
          >
            {title}
          </span>

          {difficulty && (
            <span className="shrink-0 rounded bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] font-bold text-amber-400 uppercase tracking-wider hidden sm:inline-block">
              {difficulty}
            </span>
          )}

          {displayPosition && (
            <span className="shrink-0 rounded bg-amber-500/15 border border-amber-400/30 px-2 py-0.5 text-[10px] font-bold text-amber-300">
              {displayPosition}
            </span>
          )}

          {displayCategory && (
            <span className="hidden md:inline-block shrink-0 rounded bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] font-bold text-slate-300 uppercase tracking-wider truncate max-w-[160px]">
              {displayCategory}
            </span>
          )}
        </div>
      </div>

      {/* Right: Functional Utility Actions & Status */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {statusContent}

        {/* Bilingual Mode Toggle */}
        {bilingualEnabled && onToggleBilingual && (
          <button
            type="button"
            onClick={onToggleBilingual}
            aria-pressed={isBilingual}
            aria-label="Bật / tắt dịch nghĩa song ngữ"
            title="Bật / tắt dịch nghĩa song ngữ"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
              isBilingual
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
            }`}
          >
            <Languages size={14} aria-hidden="true" />
            <span className="hidden md:inline">Song ngữ</span>
          </button>
        )}

        {/* Study Notes */}
        {notesEnabled && onOpenNotes && (
          <button
            type="button"
            onClick={onOpenNotes}
            aria-label="Ghi chú bài học"
            title="Ghi chú bài học"
            className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <StickyNote size={14} aria-hidden="true" />
            <span className="hidden md:inline">Ghi chú</span>
          </button>
        )}

        {/* Keyboard Shortcuts */}
        {shortcutsEnabled && (shortcutsContent || onOpenShortcuts) && (
          <div className="relative hidden sm:block" ref={shortcutsRef}>
            <button
              type="button"
              onClick={() => {
                if (onOpenShortcuts) {
                  onOpenShortcuts();
                } else if (shortcutsContent) {
                  setShowShortcutsPopover((v) => !v);
                }
              }}
              aria-label="Xem phím tắt nhanh"
              title="Xem phím tắt nhanh"
              aria-expanded={showShortcutsPopover}
              className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <Keyboard size={14} aria-hidden="true" />
              <span className="hidden md:inline">Phím tắt</span>
            </button>

            {shortcutsContent && showShortcutsPopover && (
              <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xl z-50 text-slate-800 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-2.5">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                    Phím tắt nhanh
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowShortcutsPopover(false)}
                    aria-label="Đóng bảng phím tắt"
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-md cursor-pointer"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                </div>
                {shortcutsContent}
              </div>
            )}
          </div>
        )}

        {/* SFX / Sound Toggle */}
        {soundEnabled && onToggleSound && (
          <button
            type="button"
            onClick={onToggleSound}
            aria-label={soundMuted ? "Âm thanh: Đã tắt" : "Âm thanh: Đang bật"}
            title={soundMuted ? "Âm thanh: Đã tắt" : "Âm thanh: Đang bật"}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
              soundMuted
                ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                : "bg-slate-800 text-slate-300 border-slate-700 hover:text-white"
            }`}
          >
            {soundMuted ? (
              <VolumeX size={14} aria-hidden="true" />
            ) : (
              <Volume2 size={14} aria-hidden="true" />
            )}
            <span className="hidden md:inline">Âm thanh</span>
          </button>
        )}

        {/* Activity Mode Pill */}
        {activityLabel && (
          <div className="hidden sm:flex items-center gap-1.5 rounded-lg bg-slate-800 border border-slate-700 px-3 py-1 text-xs font-bold text-amber-400 shrink-0">
            <Activity size={13} className="text-amber-400" aria-hidden="true" />
            <span>{activityLabel}</span>
          </div>
        )}

        {additionalActions}
      </div>
    </header>
  );
};
