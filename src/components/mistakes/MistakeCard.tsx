"use client";

import Link from "next/link";
import { Check, RotateCcw } from "lucide-react";

import type { MistakeItem } from "@/lib/api/services/mistakes.service";
import {
  MISTAKE_SKILL_LABEL,
  choiceText,
  mistakeRedoLink,
  mistakeSourceTitle,
  mistakeTagLabel,
  progressLabel,
  sentenceMistakeSummary,
} from "@/lib/mistakes/mistakeView";

/** One mistake of the notebook: what was asked, what the learner gave, the right answer, and what to do next. */
export function MistakeCard({
  item,
  resolveAfter,
  busy,
  onResolve,
  positionLabel,
}: {
  item: MistakeItem;
  /** Where the mistake sits in its exercise, "Câu 1/2"; matches the list beside it. */
  positionLabel?: string;
  resolveAfter: number;
  busy: boolean;
  /** "Đã hiểu": takes the mistake out of the notebook (the page offers an undo). */
  onResolve: () => void;
}) {
  const { detail } = item;
  const tag = mistakeTagLabel(item);
  const redo = mistakeRedoLink(item);
  const progress = item.resolvedAt ? null : progressLabel(item, resolveAfter);
  const yours =
    detail.kind === "CHOICE"
      ? (choiceText(detail.options, detail.selectedIndex) ?? detail.yourAnswer ?? null)
      : (detail.yourAnswer ?? null);
  const right =
    detail.kind === "CHOICE" ? choiceText(detail.options, detail.correctIndex) : (detail.correctAnswer ?? null);

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
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

      <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
        {mistakeSourceTitle(item.skill, detail.title, detail.ref)}
        {positionLabel && <span className="font-normal text-slate-500 dark:text-slate-400"> · {positionLabel}</span>}
      </p>

      {detail.kind === "SENTENCE" ? (
        <SentenceMistake item={item} resolveAfter={resolveAfter} />
      ) : detail.kind === "WORD" ? (
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
            <div className="mt-2 max-h-48 overflow-y-auto whitespace-pre-line rounded-lg bg-slate-50 p-3 text-[15px] leading-relaxed text-slate-800 dark:bg-slate-800/60 dark:text-slate-200">
              <span className="font-bold">{detail.passageKind === "TRANSCRIPT" ? "Lời thoại: " : "Đoạn văn: "}</span>
              {detail.passage}
            </div>
          )}
          {detail.kind === "TRANSLATION" && (
            <p className="mt-3 text-[13px] font-semibold text-slate-600 dark:text-slate-400">Dịch sang tiếng Anh</p>
          )}
          {detail.question && (
            <h2
              className={`${detail.kind === "TRANSLATION" ? "mt-1" : "mt-3"} text-[17px] font-bold leading-snug text-slate-900 dark:text-slate-100`}
            >
              {detail.question}
            </h2>
          )}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 dark:border-rose-900/60 dark:bg-rose-950/20">
              <p className="text-[13px] font-semibold text-rose-800 dark:text-rose-300">
                {detail.kind === "CORRECTION" ? "Bạn đã viết" : detail.kind === "TRANSLATION" ? "Bạn đã dịch" : "Bạn đã trả lời"}
              </p>
              <p className="mt-1 break-words text-base font-semibold text-slate-900 dark:text-slate-100">
                {yours || "Bỏ trống"}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/20">
              <p className="text-[13px] font-semibold text-emerald-800 dark:text-emerald-300">
                {detail.kind === "CORRECTION" ? "Nên viết" : "Đáp án đúng"}
              </p>
              <p className="mt-1 break-words text-base font-semibold text-slate-900 dark:text-slate-100">
                {right || "Chưa có đáp án để hiển thị"}
              </p>
            </div>
          </div>
          {detail.explanation && (
            <p className="mt-3 text-[15px] leading-relaxed text-slate-800 dark:text-slate-200">
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
        <button
          type="button"
          disabled={busy}
          onClick={onResolve}
          className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-300 px-3 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
        >
          <Check size={14} strokeWidth={2} aria-hidden="true" /> Đã hiểu, bỏ khỏi sổ
        </button>
        {progress && <span className="text-xs text-slate-600 dark:text-slate-400">{progress}</span>}
      </div>
    </article>
  );
}

/**
 * A read-aloud sentence: the whole sentence with the words read wrong (red,
 * with their score) and the words omitted (struck through), then a one-line
 * summary, as the Speaking result screen shows them (owner 2026-11-16).
 */
function SentenceMistake({ item, resolveAfter }: { item: MistakeItem; resolveAfter: number }) {
  const words = item.detail.words ?? [];
  const summary = sentenceMistakeSummary(words);
  const done = Math.min(item.correctStreak, resolveAfter);
  return (
    <>
      <p className="mt-3 text-[19px] font-semibold leading-[2.1rem] text-slate-900 dark:text-slate-100">
        {words.length > 0
          ? words.map((w, i) => (
              <span key={i}>
                {i > 0 && " "}
                {w.status === "WEAK" ? (
                  <span className="rounded-md bg-rose-50 px-1 text-rose-800 underline decoration-rose-400 decoration-wavy underline-offset-4 dark:bg-rose-950/40 dark:text-rose-300">
                    {w.word}
                    <sup className="ml-0.5 text-[11px] font-bold">{w.score}</sup>
                    <span className="sr-only"> (đọc sai, {w.score} điểm)</span>
                  </span>
                ) : w.status === "OMITTED" ? (
                  <span className="text-slate-500 line-through decoration-2 dark:text-slate-400">
                    {w.word}
                    <span className="sr-only"> (bỏ sót)</span>
                  </span>
                ) : (
                  w.word
                )}
              </span>
            ))
          : item.detail.question}
      </p>

      <div className="mt-3 space-y-1 text-[15px] leading-relaxed text-slate-800 dark:text-slate-200">
        {summary.weak.length > 0 && (
          <p>
            <span className="font-bold text-rose-700 dark:text-rose-300">Đọc sai:</span>{" "}
            {summary.weak.map((w) => `${w.word} (${w.score}/100)`).join(", ")}
          </p>
        )}
        {summary.omitted.length > 0 && (
          <p>
            <span className="font-bold text-slate-700 dark:text-slate-300">Bỏ sót:</span> {summary.omitted.join(", ")}
          </p>
        )}
        {typeof item.detail.score === "number" && (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Lần ghi âm gần nhất đạt {item.detail.score.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}/10.
          </p>
        )}
      </div>

      <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
        Ghi âm lại {resolveAfter} lần liền không còn từ đọc sai hay bỏ sót thì câu ra khỏi sổ
        {item.resolvedAt ? "." : ` (đã đạt ${done}/${resolveAfter}).`}
      </p>
    </>
  );
}
