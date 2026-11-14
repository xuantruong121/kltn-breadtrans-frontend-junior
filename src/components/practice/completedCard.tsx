import { Check } from "lucide-react";

/**
 * One completed look for every practice catalog card (owner 2026-11-12/14):
 * emerald border and faint ground, an emerald pill on the first line, an
 * emerald footer rule and an emerald outlined retry button.
 */
export const COMPLETED_CARD_CLASS =
  "relative flex min-h-[220px] flex-col justify-between rounded-xl border border-emerald-300 dark:border-emerald-800/70 bg-emerald-50/40 dark:bg-emerald-950/20 p-5 shadow-2xs transition-[border-color,box-shadow] duration-200 hover:border-emerald-400 dark:hover:border-emerald-700 hover:shadow-xs cursor-pointer group";

export const COMPLETED_FOOTER_BORDER = "border-emerald-100 dark:border-emerald-900/50";

export const COMPLETED_RETRY_CLASS =
  "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900 px-3.5 text-sm font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer disabled:opacity-60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-teal-500";

export function CompletedPill({ label = "Đã hoàn thành" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[13px] font-semibold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
      <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
      {label}
    </span>
  );
}
