"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronRight, Clock3, ListOrdered, Maximize2, X } from "lucide-react";

import { PracticeHeader } from "@/components/practice/PracticeHeader";
import { ExamQuestionPanel } from "@/components/toeic/paper/ExamQuestionPanel";
import { ExamRestoreDialog, type RestoreOption } from "@/components/toeic/paper/ExamRestoreDialog";
import { formatMinutes } from "@/lib/toeic/examPaper";
import {
  SECTION_LABEL,
  examSecondsLeft,
  groupIndexOf,
  groupLabel,
  liveSession,
  questionsOf,
  secondsLeft,
  sessionOptionDetail,
  sessionOptionTitle,
  type PreviousSession,
  type RoomComponent,
  type RoomGroup,
} from "@/lib/toeic/assessmentRoom";
import { enterFullscreen, useIsFullscreen } from "@/lib/toeic/useExamFullscreen";

/** A section's own save: what the panel says and, if any, a saved copy to return to. */
export type RoomSave = {
  status: string;
  error?: boolean;
  onSave: () => void;
  restore?: { title: string; detail: string; onPick: () => void } | null;
};

type Props = {
  title: string;
  component: RoomComponent;
  sections: RoomComponent[];
  groups: readonly RoomGroup[];
  activeGroup: number;
  onGroupChange: (index: number) => void;
  answered: Set<number>;
  marked: Set<number>;
  totalQuestions: number;
  submitting: boolean;
  submitError: boolean;
  save: RoomSave;
  previousSession: PreviousSession | null;
  onContinueSession: (attemptId: number) => void;
  onSubmit: () => void;
  onExit: () => void;
  children: ReactNode;
};

/**
 * The frame of a Speaking or Writing section, laid out like the Listening &
 * Reading room: tabs above the questions, and the shared panel on the right.
 * Reaching zero submits the section.
 */
export function AssessmentRoom({
  title,
  component,
  sections,
  groups,
  activeGroup,
  onGroupChange,
  answered,
  marked,
  totalQuestions,
  submitting,
  submitError,
  save,
  previousSession,
  onContinueSession,
  onSubmit,
  onExit,
  children,
}: Props) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [confirming, setConfirming] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [expired, setExpired] = useState(false);
  const [currentNumber, setCurrentNumber] = useState(groups[activeGroup].from);
  const isFullscreen = useIsFullscreen();

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
  // The main clock is the whole exam; the section still closes on its own clock.
  const examLeft = examSecondsLeft(sections, nowMs);
  const group = groups[activeGroup];
  const unanswered = totalQuestions - answered.size;

  const openGroup = (index: number) => {
    onGroupChange(index);
    setCurrentNumber(groups[index].from);
  };
  const jump = (questionNumber: number) => {
    onGroupChange(groupIndexOf(groups, questionNumber));
    setCurrentNumber(questionNumber);
    setDrawer(false);
    window.setTimeout(
      () => document.getElementById(`question-${questionNumber}`)?.scrollIntoView({ behavior: "smooth", block: "start" }),
      50,
    );
  };

  const session = liveSession(previousSession, nowMs);
  const restoreOptions: RestoreOption[] = [
    ...(save.restore
      ? [
          {
            key: "save",
            ...save.restore,
            onPick: () => {
              save.restore?.onPick();
              setRestoring(false);
            },
          },
        ]
      : []),
    ...(session
      ? [
          {
            key: "session",
            title: sessionOptionTitle(session),
            detail: sessionOptionDetail(session, nowMs),
            onPick: () => {
              setRestoring(false);
              onContinueSession(session.id);
            },
          },
        ]
      : []),
  ];

  const panel = (
    <ExamQuestionPanel
      sections={groups.map((g) => ({
        key: g.from,
        label: groupLabel(g),
        questions: questionsOf(g).map((n) => ({
          key: n,
          number: n,
          answered: answered.has(n),
          flagged: marked.has(n),
          current: n === currentNumber,
        })),
      }))}
      timerValue={formatMinutes(examLeft)}
      timerLabel="Thời gian còn lại của đề"
      timerNote={`Phần ${label}: ${formatMinutes(left)}`}
      saveStatus={save.status}
      saveError={Boolean(save.error)}
      saving={false}
      restoreDisabled={restoreOptions.length === 0}
      restoreTitle={restoreOptions.length ? "Quay lại bản đã lưu hoặc phiên làm dở" : "Chưa có bản lưu hay phiên làm dở nào còn giờ"}
      submitting={submitting}
      onJumpQuestion={jump}
      onSubmit={() => setConfirming(true)}
      onSave={save.onSave}
      onRestore={() => setRestoring(true)}
      notice={
        submitError && expired ? (
          <button
            type="button"
            onClick={onSubmit}
            className="mt-2 rounded-md bg-rose-50 p-2 text-left text-sm font-semibold text-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
          >
            Hết giờ nhưng chưa nộp được. Bấm để thử lại.
          </button>
        ) : null
      }
    />
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
                {formatMinutes(examLeft)}
                <span className="hidden font-semibold text-slate-300 sm:inline">
                  · {label} {formatMinutes(left)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDrawer(true)}
                aria-label="Mở bảng câu hỏi"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-bold text-white hover:bg-slate-700 lg:hidden"
              >
                <ListOrdered size={14} aria-hidden="true" /> {answered.size}/{totalQuestions}
              </button>
              {!isFullscreen && (
                <button
                  type="button"
                  onClick={enterFullscreen}
                  aria-label="Vào toàn màn hình"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-bold text-white hover:bg-slate-700"
                >
                  <Maximize2 size={14} aria-hidden="true" />
                  <span className="hidden md:inline">Vào toàn màn hình</span>
                </button>
              )}
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
                onClick={() => openGroup(index)}
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
                  openGroup(activeGroup + 1);
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
            <div className="h-[calc(100%-3rem)]">{panel}</div>
          </div>
        </div>
      )}

      {restoring && <ExamRestoreDialog options={restoreOptions} onClose={() => setRestoring(false)} />}

      {confirming && (
        <Dialog
          title={`Nộp phần ${label}?`}
          body="Sau khi nộp không quay lại phần này được."
          stats={[
            { value: answered.size, label: "Đã trả lời", tone: "bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200" },
            { value: unanswered, label: "Chưa trả lời", tone: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200" },
            { value: marked.size, label: "Cần xem lại", tone: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200" },
          ]}
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
          body="Đồng hồ vẫn chạy khi bạn rời đi. Lần sau bấm Bắt đầu làm bài để mở phiên mới, rồi bấm Khôi phục dưới nút Nộp bài để quay lại phiên này khi còn giờ."
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
  stats,
  error,
  stay,
  go,
  busy,
  onStay,
  onGo,
}: {
  title: string;
  body: string;
  stats?: Array<{ value: number; label: string; tone: string }>;
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
        {stats && (
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {stats.map((stat) => (
              <div key={stat.label} className={`rounded-md p-3 ${stat.tone}`}>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm font-semibold">{stat.label}</p>
              </div>
            ))}
          </div>
        )}
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
