"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, CircleSlash2, CircleX, Pause, Play, X } from "lucide-react";
import type { ToeicReviewQuestion } from "@/lib/api/services/toeic.service";
import { PART_TITLES, formatClock, isPassageWorthShowing, splitPassageDocuments } from "@/lib/toeic/examPaper";

export type GroupAudio = { src: string; start: number; end: number } | null;

const STATUS = {
  CORRECT: { label: "Đúng", icon: CheckCircle2, tone: "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300" },
  INCORRECT: { label: "Sai", icon: CircleX, tone: "text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300" },
  SKIPPED: { label: "Bỏ qua", icon: CircleSlash2, tone: "text-slate-700 bg-slate-100 dark:bg-slate-800 dark:text-slate-300" },
} as const;

export function StatusBadge({ status }: { status: ToeicReviewQuestion["status"] }) {
  const s = STATUS[status];
  const Icon = s.icon;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${s.tone}`}>
      <Icon size={14} strokeWidth={2.25} aria-hidden="true" /> {s.label}
    </span>
  );
}

const letter = (index: number | null) => (index === null ? null : String.fromCharCode(65 + index));

/** Plays one question group's span of the Listening master, nothing outside it. */
function GroupAudioPlayer({ audio }: { audio: NonNullable<GroupAudio> }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [at, setAt] = useState(0);
  const length = Math.max(0, audio.end - audio.start);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setPlaying(false);
    setAt(0);
    el.pause();
    const onTime = () => {
      const t = el.currentTime - audio.start;
      if (t >= length) {
        el.pause();
        el.currentTime = audio.start;
        setAt(0);
        return;
      }
      setAt(Math.max(0, t));
    };
    const onPause = () => setPlaying(false);
    const onPlay = () => setPlaying(true);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("pause", onPause);
    el.addEventListener("play", onPlay);
    return () => {
      el.pause();
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("play", onPlay);
    };
  }, [audio.src, audio.start, length]);
  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (playing) return el.pause();
    if (el.currentTime < audio.start || el.currentTime >= audio.end) el.currentTime = audio.start;
    void el.play().catch(() => setPlaying(false));
  };
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
      <audio ref={ref} src={audio.src} preload="metadata" data-testid="review-group-audio" />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Tạm dừng audio" : "Nghe audio đoạn này"}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-700"
      >
        {playing ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
      </button>
      <input
        type="range"
        min={0}
        max={length || 1}
        step={0.1}
        value={Math.min(at, length)}
        aria-label="Vị trí audio"
        onChange={(e) => {
          const el = ref.current;
          if (!el) return;
          const t = Number(e.target.value);
          el.currentTime = audio.start + t;
          setAt(t);
        }}
        className="min-w-0 flex-1 accent-blue-600"
      />
      <span className="shrink-0 text-sm tabular-nums text-slate-700 dark:text-slate-200">
        {formatClock(at)} / {formatClock(length)}
      </span>
    </div>
  );
}

/** Full read-only context of one question: media, passage, options, key, explanation. */
export function ToeicAnswerBody({
  question,
  audio,
  audioNote,
}: {
  question: ToeicReviewQuestion;
  audio: GroupAudio;
  audioNote?: string | null;
}) {
  const [showTranscript, setShowTranscript] = useState(false);
  const listening = question.part <= 4;
  return (
    <div className="space-y-4">
      {listening && (audio ? <GroupAudioPlayer audio={audio} /> : audioNote ? <p className="text-sm text-slate-600 dark:text-slate-300">{audioNote}</p> : null)}
      {question.imageUrl && (
        <img src={question.imageUrl} alt={`Hình ảnh câu ${question.questionNumber}`} className="max-h-80 w-auto rounded-lg border border-slate-200 dark:border-slate-700" />
      )}
      {listening && question.transcript && (
        <div>
          <button
            type="button"
            onClick={() => setShowTranscript((v) => !v)}
            aria-expanded={showTranscript}
            className="text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300"
          >
            {showTranscript ? "Ẩn Transcript" : "Hiện Transcript"}
          </button>
          {showTranscript && (
            <p className="mt-2 whitespace-pre-line rounded-xl bg-slate-50 p-3 text-[15px] leading-relaxed text-slate-800 dark:bg-slate-800/60 dark:text-slate-200">
              {question.transcript}
            </p>
          )}
        </div>
      )}
      {!listening && isPassageWorthShowing(question.part, question.passageText) && (
        <div className="max-h-72 space-y-3 overflow-y-auto rounded-xl border border-slate-200 p-3 dark:border-slate-700">
          {splitPassageDocuments(question.passageText).map((doc, i) => (
            <div key={i}>
              {doc.heading && <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{doc.heading}</p>}
              <p className="whitespace-pre-line text-[15px] leading-relaxed text-slate-800 dark:text-slate-200">{doc.body}</p>
            </div>
          ))}
        </div>
      )}
      {question.questionText && <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{question.questionText}</p>}
      <ul className="space-y-1.5">
        {question.options.map((option, index) => {
          const correct = index === question.correctIndex;
          const chosen = index === question.selectedIndex;
          const tone = correct
            ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40"
            : chosen
              ? "border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/40"
              : "border-slate-200 dark:border-slate-700";
          return (
            <li key={index} className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-[15px] ${tone}`}>
              <span className="font-bold text-slate-900 dark:text-slate-100">{letter(index)}.</span>
              <span className="min-w-0 flex-1 text-slate-800 dark:text-slate-200">{option}</span>
              {correct && <span className="shrink-0 text-xs font-bold text-emerald-700 dark:text-emerald-300">Đáp án đúng</span>}
              {chosen && !correct && <span className="shrink-0 text-xs font-bold text-rose-700 dark:text-rose-300">Bạn chọn</span>}
              {chosen && correct && <span className="sr-only">, bạn chọn</span>}
            </li>
          );
        })}
      </ul>
      <p className="text-sm text-slate-700 dark:text-slate-300">
        Bạn chọn: <strong>{letter(question.selectedIndex) ?? "Không trả lời"}</strong> · Đáp án: <strong>{letter(question.correctIndex)}</strong>
      </p>
      <section className="border-t border-slate-200 pt-3 dark:border-slate-700">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Giải thích chi tiết đáp án</h3>
        <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
          {question.explanation ?? "Câu này chưa có lời giải thích."}
        </p>
      </section>
    </div>
  );
}

/** Modal shell for result details: Esc closes, focus stays inside and returns on close. */
export function ResultDialog({
  title,
  subtitle,
  badge,
  footer,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeBtn.current?.focus();
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
      previous?.focus?.();
    };
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Tab" && panel.current) {
        const items = panel.current.querySelectorAll<HTMLElement>("button:not([disabled]), [href], input:not([disabled]), audio[controls], [tabindex]:not([tabindex='-1'])");
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  const titleId = "toeic-result-dialog-title";
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-t-2xl bg-white shadow-xl dark:bg-slate-900 sm:rounded-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {title}
            </h2>
            {subtitle && <p className="mt-0.5 truncate text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            {badge}
            <button
              ref={closeBtn}
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
        </header>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="flex justify-between gap-3 border-t border-slate-200 px-5 py-3 dark:border-slate-700">{footer}</footer>}
      </div>
    </div>
  );
}

/** Modal "Đáp án chi tiết #N" with previous/next. */
export function ToeicAnswerDialog({
  examTitle,
  question,
  audio,
  audioNote,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onClose,
}: {
  examTitle: string;
  question: ToeicReviewQuestion;
  audio: GroupAudio;
  audioNote?: string | null;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  return (
    <ResultDialog
      title={`Đáp án chi tiết #${question.questionNumber}`}
      subtitle={`${examTitle} · Part ${question.part} · ${PART_TITLES[question.part]}`}
      badge={<StatusBadge status={question.status} />}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onPrev}
            disabled={!hasPrev}
            className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ChevronLeft size={16} aria-hidden="true" /> Câu trước
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!hasNext}
            className="inline-flex min-h-11 items-center gap-1 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
          >
            Câu tiếp theo <ChevronRight size={16} aria-hidden="true" />
          </button>
        </>
      }
    >
      <ToeicAnswerBody key={question.questionId} question={question} audio={audio} audioNote={audioNote} />
    </ResultDialog>
  );
}
