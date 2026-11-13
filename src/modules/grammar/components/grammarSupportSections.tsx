"use client";

import React, { useState } from "react";
import { BookOpenText, Lightbulb, MousePointerClick } from "lucide-react";

import type { GrammarTopicDetail } from "../types";
import { GrammarVideoPlayer } from "./GrammarVideoPlayer";
import {
  DEFAULT_SECTION_PREFS,
  SECTION_PREFS_KEY,
  readSectionPrefs,
  toggleSection,
  type GrammarCheck,
  type SectionKey,
  type SectionPrefs,
} from "./grammarPracticeLogic";

const LETTERS = "ABCDEFGH";

/**
 * Which sections are open, kept across questions and visits (owner
 * 2026-11-13: each section has its own switch). Browser storage is a
 * convenience: without it the defaults apply.
 */
export function useSectionPrefs(): [SectionPrefs, (key: SectionKey) => void] {
  // The workspace only renders in the browser, after its data has loaded.
  const [prefs, setPrefs] = useState<SectionPrefs>(() => {
    try {
      return readSectionPrefs(window.localStorage.getItem(SECTION_PREFS_KEY));
    } catch {
      return { ...DEFAULT_SECTION_PREFS };
    }
  });
  const toggle = (key: SectionKey) =>
    setPrefs((previous) => {
      const next = toggleSection(previous, key);
      try {
        window.localStorage.setItem(SECTION_PREFS_KEY, JSON.stringify(next));
      } catch {
        // storage blocked: the switch still works for this visit
      }
      return next;
    });
  return [prefs, toggle];
}

function Switch({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      aria-hidden="true"
      data-label={label}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        on ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600"
      }`}
    >
      <span
        className={`inline-block size-5 rounded-full bg-white transition-transform ${on ? "translate-x-5" : "translate-x-0.5"}`}
      />
    </span>
  );
}

/** One support section: a titled card whose switch opens and closes its body. */
function SupportSection({
  id,
  title,
  icon,
  open,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  icon: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <button
        type="button"
        role="switch"
        aria-checked={open}
        aria-controls={id}
        onClick={onToggle}
        className="flex min-h-12 w-full items-center gap-2.5 rounded-xl px-4 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <span className="text-blue-700 dark:text-blue-400">{icon}</span>
        <span className="min-w-0 flex-1 text-[15px] font-bold text-slate-900 dark:text-slate-100">{title}</span>
        <Switch on={open} label={title} />
      </button>
      {open && (
        <div id={id} className="border-t border-slate-100 px-4 py-3.5 dark:border-slate-800">
          {children}
        </div>
      )}
    </section>
  );
}

/** Before an answer: one quiet line in the middle of the column. */
export function SupportPlaceholder() {
  return (
    <div className="flex h-full min-h-48 flex-col items-center justify-center gap-3 px-6 text-center">
      <MousePointerClick size={28} strokeWidth={1.75} className="text-slate-400 dark:text-slate-400" aria-hidden="true" />
      <p className="max-w-xs text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">
        Chọn đáp án để xem giải thích chi tiết và kiến thức trọng tâm.
      </p>
    </div>
  );
}

/**
 * After an answer: the explanation and the topic's key points, each behind a
 * switch. No right/wrong line here: the options already show it.
 */
export function SupportSections({
  check,
  topic,
  prefs,
  onToggle,
  idPrefix,
}: {
  check: GrammarCheck;
  topic: GrammarTopicDetail;
  prefs: SectionPrefs;
  onToggle: (key: SectionKey) => void;
  /** Keeps element ids unique when the sections render twice (column and phone). */
  idPrefix: string;
}) {
  const why =
    !check.isCorrect && check.selectedOption !== undefined
      ? check.optionExplanations?.[check.selectedOption]
      : null;
  return (
    <div className="space-y-3">
      <SupportSection
        id={`${idPrefix}-explanation`}
        title="Giải thích chi tiết"
        icon={<BookOpenText size={18} strokeWidth={2} aria-hidden="true" />}
        open={prefs.explanation}
        onToggle={() => onToggle("explanation")}
      >
        <div className="space-y-3">
          {why && (
            <div className="rounded-lg bg-rose-50 p-3 dark:bg-rose-950/30">
              <p className="text-[15px] font-semibold text-rose-900 dark:text-rose-200">
                Vì sao {LETTERS[check.selectedOption as number]} sai
              </p>
              <p className="mt-1 text-[15px] leading-relaxed text-slate-800 dark:text-slate-200">{why}</p>
            </div>
          )}
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-slate-800 dark:text-slate-200">
            {check.explanation || "Câu này chưa có lời giải chi tiết."}
          </p>
        </div>
      </SupportSection>
      <SupportSection
        id={`${idPrefix}-theory`}
        title="Kiến thức trọng tâm"
        icon={<Lightbulb size={18} strokeWidth={2} aria-hidden="true" />}
        open={prefs.theory}
        onToggle={() => onToggle("theory")}
      >
        <GrammarVideoPlayer topic={topic} />
      </SupportSection>
    </div>
  );
}
