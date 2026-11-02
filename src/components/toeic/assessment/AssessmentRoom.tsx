"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronRight, Clock3, ListOrdered, X } from "lucide-react";

import { PracticeHeader } from "@/components/practice/PracticeHeader";
import { formatMinutes } from "@/lib/toeic/examPaper";
import {
  SECTION_LABEL,
  groupIndexOf,
  groupLabel,
  questionsOf,
  secondsLeft,
  type RoomComponent,
  type RoomGroup,
} from "@/lib/toeic/assessmentRoom";

type Props = {
  title: string;
  component: RoomComponent;
  sections: RoomComponent[];
  groups: readonly RoomGroup[];
  activeGroup: number;
  onGroupChange: (index: number) => void;
  answered: Set<number>;
  totalQuestions: number;
  submitting: boolean;
  submitError: boolean;
  onSubmit: () => void;
  onExit: () => void;
  children: ReactNode;
};

/**
 * The frame of a Speaking or Writing section, laid out like the Listening &
 * Reading room: tabs above the questions, and the clock, Nộp bài and question
 * numbers on the right. Reaching zero submits the section.
 */
export function AssessmentRoom({
  title,
  component,
  sections,
  groups,
  activeGroup,
  onGroupChange,
  answered,
  totalQuestions,
  submitting,
  submitError,
  onSubmit,
  onExit,
  children,
}: Props) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [confirming, setConfirming] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const left = secondsLeft(component.deadlineAt, nowMs) ?? 0;
  useEffect(() => {
    if (left > 0 || expired || !component.deadlineAt) return;
    const timer = window.setTimeout(() => {
      setExpired(true);
      onSubmit();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [left, expired, component.deadlineAt, onSubmit]);

  const label = SECTION_LABEL[component.kind] ?? "Phần thi";
  const group = groups[activeGroup];
  const unanswered = totalQuestions - answered.size;

  const jump = (questionNumber: number) => {
    onGroupChange(groupIndexOf(groups, questionNumber));
    setDrawer(false);
    window.setTimeout(
      () => document.getElementById(`question-${questionNumber}`)?.scrollIntoView({ behavior: "smooth", block: "start" }),
      50,
    );
  };

  const panel = (
    <div className="flex h-full flex-col">
      <p className="text-sm text-slate-600 dark:text-slate-300">Thời gian còn lại:</p>
      <p role="timer" aria-label="Thời gian còn lại" className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
        {formatMinutes(left)}
      </p>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={submitting}
        className="mt-2 min-h-10 w-full rounded-md border border-blue-600 text-sm font-bold uppercase text-blue-700 transition-colors hover:bg-blue-600 hover:text-white disabled:opacity-60 dark:text-blue-300"
      >
        Nộp bài
      </button>
      {submitError && expired && (
        <button
          type="button"
          onClick={onSubmit}
          className="mt-2 rounded-md bg-rose-50 p-2 text-left text-sm font-semibold text-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
        >
          Hết giờ nhưng chưa nộp được. Bấm để thử lại.
        </button>
      )}
      <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
        Đã làm {answered.size}/{totalQuestions} câu
      </p>
      <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1">
        {groups.map((g) => (
          <section key={g.from} aria-label={groupLabel(g)}>
            <p className="mb-1 text-sm font-bold text-slate-800 dark:text-slate-100">{groupLabel(g)}</p>
            <div className="grid grid-cols-5 gap-1">
              {questionsOf(g).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => jump(n)}
                  aria-label={`Câu ${n}, ${answered.has(n) ? "đã làm" : "chưa làm"}`}
                  className={`min-h-7 rounded border text-xs font-semibold tabular-nums transition-colors ${
                    answered.has(n)
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:border-blue-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-white font-sans dark:bg-slate-950">
      <div className="sticky top-0 z-30">
        <PracticeHeader
          title={title}
          category={label}
          activityLabel={sections.map((s) => SECTION_LABEL[s.kind]).join(" · ")}
          onExit={() => setExiting(true)}
          exitLabel="Thoát"
          additionalActions={
            <>
              <div
                aria-hidden="true"
                className="flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800/90 px-2 py-1 text-xs font-bold tabular-nums text-white sm:gap-1.5 sm:px-3 lg:hidden"
              >
                <Clock3 size={14} className="text-amber-400" />
                {formatMinutes(left)}
              </div>
              <button
                type="button"
                onClick={() => setDrawer(true)}
                aria-label="Mở bảng câu hỏi"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-bold text-white hover:bg-slate-700 lg:hidden"
              >
                <ListOrdered size={14} aria-hidden="true" /> {answered.size}/{totalQuestions}
              </button>
            </>
          }
        />
      </div>

      <div className="grid gap-5 px-3 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_220px]">
        <main className="min-w-0 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <div role="tablist" aria-label="Nhóm câu" className="flex gap-1.5 overflow-x-auto pb-1">
            {groups.map((g, index) => (
              <button
                key={g.from}
                type="button"
                role="tab"
                aria-selected={index === activeGroup}
                onClick={() => onGroupChange(index)}
                className={`min-h-9 shrink-0 rounded-full px-3.5 text-sm font-semibold transition-colors ${
                  index === activeGroup
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {groupLabel(g)}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
            {group.title}
            {group.hint && <span className="font-normal text-slate-600 dark:text-slate-400"> · {group.hint}</span>}
          </p>
          <div className="mt-3">{children}</div>
          {activeGroup < groups.length - 1 && (
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  onGroupChange(activeGroup + 1);
                  window.scrollTo({ top: 0 });
                }}
                className="inline-flex min-h-10 items-center gap-1 text-sm font-bold uppercase text-blue-700 hover:text-blue-900 dark:text-blue-300"
              >
                Tiếp theo <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          )}
        </main>
        <aside className="sticky top-20 hidden h-[calc(100dvh-6rem)] rounded-lg border border-slate-200 p-3 lg:block dark:border-slate-800">
          {panel}
        </aside>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 lg:hidden" onClick={() => setDrawer(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Bảng câu hỏi"
            onClick={(event) => event.stopPropagation()}
            className="absolute inset-y-0 right-0 w-72 max-w-[85vw] bg-white p-4 dark:bg-slate-900"
          >
            <button
              type="button"
              onClick={() => setDrawer(false)}
              aria-label="Đóng bảng câu hỏi"
              className="absolute right-2 top-2 inline-flex h-11 w-11 items-center justify-center text-slate-600 dark:text-slate-300"
            >
              <X size={18} aria-hidden="true" />
            </button>
            {panel}
          </div>
        </div>
      )}

      {confirming && (
        <Dialog
          title={`Nộp phần ${label}?`}
          body={
            unanswered > 0
              ? `Còn ${unanswered} câu chưa làm. Sau khi nộp không quay lại phần này được.`
              : "Sau khi nộp không quay lại phần này được."
          }
          error={submitError ? "Chưa nộp được. Kiểm tra kết nối rồi thử lại; bài làm vẫn được giữ." : null}
          stay="Quay lại làm bài"
          go={submitting ? "Đang nộp..." : "Xác nhận nộp bài"}
          busy={submitting}
          onStay={() => setConfirming(false)}
          onGo={onSubmit}
        />
      )}
      {exiting && (
        <Dialog
          title="Thoát khỏi phòng thi?"
          body="Đồng hồ vẫn chạy khi bạn rời đi. Mở lại đề thi để làm tiếp; hết giờ thì phần này tự nộp."
          stay="Ở lại làm bài"
          go="Thoát"
          onStay={() => setExiting(false)}
          onGo={onExit}
        />
      )}
    </div>
  );
}

function Dialog({
  title,
  body,
  error,
  stay,
  go,
  busy,
  onStay,
  onGo,
}: {
  title: string;
  body: string;
  error?: string | null;
  stay: string;
  go: string;
  busy?: boolean;
  onStay: () => void;
  onGo: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{body}</p>
        {error && (
          <p role="alert" className="mt-3 text-sm font-semibold text-rose-700 dark:text-rose-300">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-col-reverse justify-end gap-2.5 sm:flex-row">
          <button type="button" onClick={onStay} className="min-h-11 rounded-md border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
            {stay}
          </button>
          <button type="button" onClick={onGo} disabled={busy} className="min-h-11 rounded-md bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
            {go}
          </button>
        </div>
      </div>
    </div>
  );
}
