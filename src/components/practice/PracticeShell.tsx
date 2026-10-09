"use client";

import type { ReactNode } from "react";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { practiceProgressPercent } from "./practiceShellLogic";

export type PracticeStage = "INTRO" | "PRACTICE" | "FEEDBACK" | "REVIEW";

export interface PracticeShellProps {
  skill: "listening" | "reading" | "speaking" | "writing";
  title: string;
  stage: PracticeStage;
  current?: number;
  total?: number;
  level?: string;
  mode?: string;
  onExit?: () => void;
  children: ReactNode;
  footer?: ReactNode;
  isLoading?: boolean;
  /** Keeps the common lifecycle semantics without changing immersive legacy layouts. */
  variant?: "default" | "immersive";
}

const SKILL_LABEL: Record<PracticeShellProps["skill"], string> = {
  listening: "Luyện nghe",
  reading: "Luyện đọc",
  speaking: "Luyện nói",
  writing: "Luyện viết",
};

const STAGE_LABEL: Record<PracticeStage, string> = {
  INTRO: "Chuẩn bị",
  PRACTICE: "Đang luyện",
  FEEDBACK: "Phản hồi",
  REVIEW: "Ôn lại",
};

/** Presentation-only shell. Skill engines continue to own their own state/scoring. */
export function PracticeShell({
  skill,
  title,
  stage,
  current,
  total,
  level,
  mode,
  onExit,
  children,
  footer,
  isLoading = false,
  variant = "default",
}: PracticeShellProps) {
  const hasProgress = Number.isFinite(current) && Number.isFinite(total) && (total ?? 0) > 0;
  const progress = practiceProgressPercent(current, total);

  if (variant === "immersive") {
    return (
      <section
        data-practice-shell="true"
        data-practice-stage={stage.toLowerCase()}
        aria-label={`${SKILL_LABEL[skill]}: ${title}`}
        className="min-h-dvh"
      >
        {children}
      </section>
    );
  }

  return (
    <section
      data-practice-shell="true"
      data-practice-stage={stage.toLowerCase()}
      aria-label={`${SKILL_LABEL[skill]}: ${title}`}
      className="mx-auto w-full max-w-7xl space-y-4"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white px-4 py-3 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              aria-label="Quay lại danh sách luyện tập"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <ArrowLeft size={15} aria-hidden="true" />
              <span className="hidden sm:inline">Quay lại</span>
            </button>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <span>{SKILL_LABEL[skill]}</span>
              <span aria-hidden="true">·</span>
              <span className="text-sky-700 dark:text-sky-300">{STAGE_LABEL[stage]}</span>
              {mode && <span className="rounded-full bg-slate-100 px-2 py-0.5 normal-case tracking-normal dark:bg-slate-800">{mode}</span>}
              {level && <span className="rounded-full bg-amber-50 px-2 py-0.5 normal-case tracking-normal text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">{level}</span>}
            </div>
            <h1 className="mt-1 truncate text-base font-black text-slate-900 dark:text-slate-100 sm:text-lg">{title}</h1>
          </div>
        </div>
        {hasProgress && (
          <div className="min-w-[150px] sm:min-w-[190px]" aria-label={`Tiến độ câu ${current} trên ${total}`}>
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <span>Câu {current}/{total}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </header>
      {isLoading ? (
        <div className="flex min-h-40 items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" role="status">
          <Loader2 className="animate-spin text-sky-600" aria-label="Đang tải" />
        </div>
      ) : (
        children
      )}
      {footer && <footer className="flex flex-wrap items-center justify-between gap-3">{footer}</footer>}
    </section>
  );
}

export function PracticeCompletionSummary({
  score,
  correct,
  total,
  onRetry,
  onNext,
}: {
  score?: number | null;
  correct?: number;
  total?: number;
  onRetry?: () => void;
  onNext?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-black text-emerald-900 dark:text-emerald-200">
          <CheckCircle2 size={18} aria-hidden="true" />
          Hoàn thành phiên luyện
        </div>
        <div className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
          {typeof score === "number" ? `${score}%` : "Đã ghi nhận"}
          {typeof correct === "number" && typeof total === "number" ? ` · ${correct}/${total} câu đúng` : ""}
        </div>
      </div>
      {(onRetry || onNext) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {onRetry && <button type="button" onClick={onRetry} className="min-h-10 rounded-xl border border-emerald-300 px-3 text-xs font-bold text-emerald-900 hover:bg-emerald-100 dark:border-emerald-800 dark:text-emerald-200 dark:hover:bg-emerald-900/40">Luyện lại</button>}
          {onNext && <button type="button" onClick={onNext} className="min-h-10 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700">Bài tiếp theo</button>}
        </div>
      )}
    </div>
  );
}
