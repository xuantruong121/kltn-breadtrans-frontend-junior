"use client";

import Link from "next/link";
import { Check, RotateCcw, Undo2 } from "lucide-react";

import { AskTutorButton } from "@/components/tutor/AskTutorButton";
import type { MistakeItem } from "@/lib/api/services/mistakes.service";
import {
  MISTAKE_SKILL_LABEL,
  choiceText,
  mistakeRedoLink,
  mistakeTagLabel,
  mistakeTutorContext,
  progressLabel,
} from "@/lib/mistakes/mistakeView";

/** One mistake of the notebook: what was asked, what the learner gave, the right answer, and what to do next. */
export function MistakeCard({
  item,
  resolveAfter,
  busy,
  onToggleResolved,
}: {
  item: MistakeItem;
  resolveAfter: number;
  busy: boolean;
  onToggleResolved: (resolved: boolean) => void;
}) {
  const { detail } = item;
  const tag = mistakeTagLabel(item);
  const redo = mistakeRedoLink(item);
  const tutor = mistakeTutorContext(item);
  const progress = item.resolvedAt ? null : progressLabel(item, resolveAfter);
  const yours =
    detail.kind === "CHOICE"
      ? (choiceText(detail.options, detail.selectedIndex) ?? detail.yourAnswer ?? null)
      : (detail.yourAnswer ?? null);
  const right =
    detail.kind === "CHOICE" ? choiceText(detail.options, detail.correctIndex) : (detail.correctAnswer ?? null);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
          {MISTAKE_SKILL_LABEL[item.skill]}
        </span>
        {tag && (
          <span className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-300">
            {tag}
          </span>
        )}
        {item.wrongCount > 1 && (
          <span className="rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
            Sai {item.wrongCount} lần
          </span>
        )}
        <span className="ml-auto text-xs text-slate-600 dark:text-slate-400">
          {new Date(item.lastSeenAt).toLocaleDateString("vi-VN")}
        </span>
      </div>

      <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{detail.title}</p>

      {detail.kind === "WORD" ? (
        <p className="mt-2 text-lg font-black text-slate-900 dark:text-slate-100">
          {detail.correctAnswer}
          {typeof detail.score === "number" && (
            <span className="ml-2 text-sm font-semibold text-rose-700 dark:text-rose-300">
              phát âm đạt {detail.score}/100
            </span>
          )}
        </p>
      ) : (
        <>
          {detail.passage && (
            <div className="mt-2 max-h-40 overflow-y-auto whitespace-pre-line rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
              <span className="font-bold">{detail.passageKind === "TRANSCRIPT" ? "Lời thoại: " : "Đoạn văn: "}</span>
              {detail.passage}
            </div>
          )}
          {detail.question && (
            <h2 className="mt-2 text-base font-bold text-slate-900 dark:text-slate-100">{detail.question}</h2>
          )}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 dark:border-rose-900/60 dark:bg-rose-950/20">
              <p className="text-xs font-bold uppercase tracking-wide text-rose-800 dark:text-rose-300">
                {detail.kind === "CORRECTION" ? "Bạn đã viết" : "Bạn đã trả lời"}
              </p>
              <p className="mt-1 break-words text-sm font-semibold text-slate-900 dark:text-slate-100">
                {yours || "Bỏ trống"}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/20">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                {detail.kind === "CORRECTION" ? "Nên viết" : "Đáp án đúng"}
              </p>
              <p className="mt-1 break-words text-sm font-semibold text-slate-900 dark:text-slate-100">
                {right || "Chưa có đáp án để hiển thị"}
              </p>
            </div>
          </div>
          {detail.explanation && (
            <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
              <span className="font-bold">Giải thích:</span> {detail.explanation}
            </p>
          )}
        </>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {redo && (
          <Link
            href={redo.href}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RotateCcw size={14} strokeWidth={2} aria-hidden="true" />
            {redo.label}
          </Link>
        )}
        {tutor && <AskTutorButton context={tutor} />}
        <button
          type="button"
          disabled={busy}
          onClick={() => onToggleResolved(!item.resolvedAt)}
          className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-300 px-3 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
        >
          {item.resolvedAt ? (
            <>
              <Undo2 size={14} strokeWidth={2} aria-hidden="true" /> Mở lại lỗi này
            </>
          ) : (
            <>
              <Check size={14} strokeWidth={2} aria-hidden="true" /> Đã hiểu, bỏ khỏi sổ
            </>
          )}
        </button>
        {progress && <span className="text-xs text-slate-600 dark:text-slate-400">{progress}</span>}
      </div>
    </article>
  );
}
