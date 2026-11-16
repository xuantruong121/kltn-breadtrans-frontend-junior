"use client";

import { useEffect, useMemo, useState } from "react";
import { RotateCcw, RotateCw, Volume2 } from "lucide-react";

import type { SavedWord } from "@/lib/api/services/vocab.service";
import {
  answerCard,
  flipCard,
  reviewDone,
  reviewForgotten,
  startReview,
  type ReviewState,
} from "@/lib/vocab/savedWords";
import { playWordAudio } from "../utils/audio";

const ipa = (value?: string | null) => (value ? `/${value.replace(/^\/|\/$/g, "")}/` : null);

/**
 * Quick review of the saved words on the saved page (owner 2026-11-16): one
 * card at a time, flip to see the meaning, then "Chưa nhớ" or "Đã nhớ". Local
 * only; the SRS schedule of topic words is not touched.
 */
export function SavedWordReview({ words, onExit }: { words: SavedWord[]; onExit: () => void }) {
  const byId = useMemo(() => new Map(words.map((w) => [w.id, w])), [words]);
  const [state, setState] = useState<ReviewState>(() => startReview(words.map((w) => w.id)));
  const done = reviewDone(state);
  const current = done ? null : byId.get(state.order[state.index]) ?? null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space") {
        e.preventDefault();
        setState(flipCard);
      } else if (e.key === "1") setState((s) => answerCard(s, false));
      else if (e.key === "2") setState((s) => answerCard(s, true));
      else if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onExit]);

  if (done) {
    const total = state.order.length;
    return (
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Đã ôn xong {total} từ</h2>
        <p className="mt-2 text-[15px] text-slate-700 dark:text-slate-300">
          Nhớ <span className="font-semibold text-emerald-700 dark:text-emerald-400">{state.remembered.length}</span>, chưa nhớ{" "}
          <span className="font-semibold text-rose-700 dark:text-rose-400">{state.forgotten.length}</span>.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {state.forgotten.length > 0 && (
            <button
              type="button"
              onClick={() => setState((s) => reviewForgotten(s))}
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-amber-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
            >
              <RotateCcw size={16} aria-hidden="true" /> Ôn lại {state.forgotten.length} từ chưa nhớ
            </button>
          )}
          <button
            type="button"
            onClick={() => setState(startReview(words.map((w) => w.id)))}
            className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Ôn lại từ đầu
          </button>
          <button
            type="button"
            onClick={onExit}
            className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Về danh sách
          </button>
        </div>
      </section>
    );
  }

  if (!current) return null;
  const position = state.index + 1;
  const total = state.order.length;
  const speak = (text: string, audio?: string | null) => void playWordAudio(text, audio ?? undefined, "us");

  return (
    <section className="mt-6" aria-label="Ôn từ đã lưu">
      <div className="flex items-center justify-between gap-3 text-sm text-slate-600 dark:text-slate-400">
        <span>
          Thẻ <span className="font-semibold text-slate-900 dark:text-slate-100">{position}</span>/{total}
        </span>
        <button type="button" onClick={onExit} className="cursor-pointer font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100">
          Dừng ôn
        </button>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" aria-hidden="true">
        <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${((position - 1) / total) * 100}%` }} />
      </div>

      <div
        role="button"
        tabIndex={0}
        aria-label={state.flipped ? "Quay lại mặt từ" : "Lật thẻ xem nghĩa"}
        onClick={() => setState(flipCard)}
        onKeyDown={(e) => {
          if (e.key === "Enter") setState(flipCard);
        }}
        className="mt-4 flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-8 text-center transition-colors hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
      >
        {!state.flipped ? (
          <>
            <p className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-5xl">{current.word}</p>
            <div className="mt-3 flex items-center gap-2">
              {ipa(current.ipaUs) && <span className="font-mono text-base text-slate-600 dark:text-slate-400">{ipa(current.ipaUs)}</span>}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  speak(current.canonicalWord || current.word, current.audioUs);
                }}
                aria-label={`Nghe ${current.word}`}
                className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                <Volume2 size={18} aria-hidden="true" />
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
              {current.word}
              {current.pos && <span className="ml-2 font-normal">{current.pos}</span>}
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100 sm:text-4xl">{current.meaning || "Chưa có nghĩa"}</p>
            {current.exampleEn && (
              <p className="mt-5 max-w-xl text-[15px] italic text-slate-800 dark:text-slate-200">{current.exampleEn}</p>
            )}
            {current.exampleVi && <p className="mt-1 max-w-xl text-sm text-slate-600 dark:text-slate-400">{current.exampleVi}</p>}
          </>
        )}
        <p className="mt-8 inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
          <RotateCw size={14} aria-hidden="true" />
          {state.flipped ? "Bấm để xem lại từ (hoặc Space)" : "Bấm để xem nghĩa (hoặc Space)"}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setState((s) => answerCard(s, false))}
          className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border border-rose-300 bg-white text-[15px] font-semibold text-rose-800 transition-colors hover:bg-rose-50 dark:border-rose-900 dark:bg-slate-900 dark:text-rose-300 dark:hover:bg-rose-950/40"
        >
          Chưa nhớ <kbd className="rounded border border-current/30 px-1.5 font-mono text-xs">1</kbd>
        </button>
        <button
          type="button"
          onClick={() => setState((s) => answerCard(s, true))}
          className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-white text-[15px] font-semibold text-emerald-800 transition-colors hover:bg-emerald-50 dark:border-emerald-900 dark:bg-slate-900 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
        >
          Đã nhớ <kbd className="rounded border border-current/30 px-1.5 font-mono text-xs">2</kbd>
        </button>
      </div>
    </section>
  );
}
