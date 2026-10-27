"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Mic } from "lucide-react";
import { speakingService } from "@/lib/api/services/speaking.service";
import type { ToeicSpeakingTask, ToeicTaskStatus, ToeicWritingTask } from "@/lib/api/services/toeic.service";
import { SPEAKING_GROUPS, TASK_STATUS_LABEL, WRITING_GROUPS, groupTasks } from "@/lib/toeic/resultReview";
import { ResultDialog } from "./ToeicAnswerDetail";

const STATUS_TONE: Record<ToeicTaskStatus, string> = {
  GRADED: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  PENDING: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  FAILED: "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
  NO_SPEECH: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  NOT_SUBMITTED: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

function TaskStatus({ status }: { status: ToeicTaskStatus }) {
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_TONE[status]}`}>{TASK_STATUS_LABEL[status]}</span>;
}

const pct = (v: number | null) => (v === null ? null : `${Math.round(v)}%`);

/** The learner's own recording, fetched only when asked, through a short-lived signed URL. */
function PrivateRecording({ submissionId }: { submissionId: number }) {
  const [state, setState] = useState<{ status: "idle" | "loading" | "ready" | "error"; url?: string }>({ status: "idle" });
  if (state.status === "ready") return <audio controls autoPlay src={state.url} className="w-full" data-testid="speaking-recording" />;
  return (
    <div>
      <button
        type="button"
        disabled={state.status === "loading"}
        onClick={async () => {
          setState({ status: "loading" });
          try {
            const { audioUrl } = await speakingService.getAudioSignedUrl(submissionId);
            setState({ status: "ready", url: audioUrl });
          } catch {
            setState({ status: "error" });
          }
        }}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
      >
        {state.status === "loading" ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Mic size={16} aria-hidden="true" />}
        Nghe bản ghi của bạn
      </button>
      {state.status === "error" && <p className="mt-1 text-sm text-rose-700 dark:text-rose-300">Không mở được bản ghi. Thử lại sau.</p>}
    </div>
  );
}

function SpeakingTaskDialog({ task, examTitle, onClose }: { task: ToeicSpeakingTask; examTitle: string; onClose: () => void }) {
  const s = task.submission;
  const criteria = s
    ? ([
        ["Độ chính xác", s.criteria.accuracy],
        ["Độ trôi chảy", s.criteria.fluency],
        ["Độ đầy đủ", s.criteria.completeness],
        ["Ngữ điệu", s.criteria.prosody],
      ] as const).filter(([, v]) => v !== null)
    : [];
  return (
    <ResultDialog title={`Speaking · Câu ${task.number}`} subtitle={`${examTitle} · ${task.title}`} badge={<TaskStatus status={task.status} />} onClose={onClose}>
      <div className="space-y-4">
        <section>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Đề bài</h3>
          <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed text-slate-800 dark:text-slate-200">{task.prompt}</p>
          {task.imageUrl && (
            <img src={task.imageUrl} alt={`Hình ảnh câu ${task.number}`} className="mt-2 max-h-72 rounded-lg border border-slate-200 dark:border-slate-700" />
          )}
        </section>
        {!s ? (
          <p className="text-slate-700 dark:text-slate-300">Bạn chưa nộp bài nói cho câu này.</p>
        ) : (
          <>
            {s.hasRecording && <PrivateRecording submissionId={s.id} />}
            <section>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Transcript</h3>
              <p className="mt-1 whitespace-pre-line text-[15px] text-slate-800 dark:text-slate-200">{s.transcript || "Chưa có transcript."}</p>
            </section>
            {task.status === "GRADED" && (
              <section>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Điểm luyện Speaking (BreadTrans): {s.overallScore}/10</h3>
                {criteria.length > 0 && (
                  <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {criteria.map(([label, v]) => (
                      <div key={label} className="rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                        <dt className="text-xs text-slate-600 dark:text-slate-400">{label}</dt>
                        <dd className="font-bold tabular-nums text-slate-900 dark:text-slate-100">{pct(v)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </section>
            )}
            {task.status === "PENDING" && <p className="text-amber-800 dark:text-amber-300">Bài nói đang được chấm. Kết quả sẽ hiện khi chấm xong.</p>}
            {task.status === "FAILED" && <p className="text-rose-700 dark:text-rose-300">Chấm điểm thất bại cho bản ghi này. Trang kết quả không tự chấm lại.</p>}
            {task.status === "NO_SPEECH" && <p className="text-amber-800 dark:text-amber-300">Không nhận ra lời nói trong bản ghi nên câu này không có điểm.</p>}
            {(s.feedback || s.suggestions.length > 0) && (
              <section className="border-t border-slate-200 pt-3 dark:border-slate-700">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Nhận xét</h3>
                {s.feedback && <p className="mt-1 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">{s.feedback}</p>}
                {s.suggestions.length > 0 && (
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[15px] text-slate-700 dark:text-slate-300">
                    {s.suggestions.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </ResultDialog>
  );
}

function GroupHeading({ range, label }: { range: string; label: string }) {
  return (
    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
      {range} <span className="font-semibold text-slate-600 dark:text-slate-400">· {label}</span>
    </h3>
  );
}

const rowClass = "flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-slate-100 py-2.5 text-[15px] dark:border-slate-800";
const detailClass = "shrink-0 rounded-md px-2 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/40";

export function SpeakingTasksResult({ tasks, examTitle }: { tasks: ToeicSpeakingTask[]; examTitle: string }) {
  const [open, setOpen] = useState<ToeicSpeakingTask | null>(null);
  return (
    <div className="space-y-5">
      {groupTasks(tasks, SPEAKING_GROUPS).map((g) => (
        <div key={g.range}>
          <GroupHeading range={g.range} label={g.label} />
          <ul className="mt-1">
            {g.tasks.map((t) => (
              <li key={t.exerciseId} data-speaking-task={t.number} className={rowClass}>
                <span className="w-14 shrink-0 font-bold text-slate-900 dark:text-slate-100">Câu {t.number}</span>
                <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-300">{t.title}</span>
                <span className="shrink-0 tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                  {t.status === "GRADED" ? `${t.submission?.overallScore}/10` : "—"}
                </span>
                <TaskStatus status={t.status} />
                <button type="button" onClick={() => setOpen(t)} className={detailClass}>
                  [Chi tiết]
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {open && <SpeakingTaskDialog task={open} examTitle={examTitle} onClose={() => setOpen(null)} />}
    </div>
  );
}

export function WritingTasksResult({ tasks }: { tasks: ToeicWritingTask[] }) {
  return (
    <div className="space-y-5">
      {groupTasks(tasks, WRITING_GROUPS).map((g) => (
        <div key={g.range}>
          <GroupHeading range={g.range} label={g.label} />
          <ul className="mt-1">
            {g.tasks.map((t) => (
              <li key={t.quizId} data-writing-task={t.number} className={rowClass}>
                <span className="w-14 shrink-0 font-bold text-slate-900 dark:text-slate-100">Câu {t.number}</span>
                <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-300">{t.title}</span>
                <span className="shrink-0 tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                  {t.status === "GRADED" && t.submission ? `${t.submission.score}${t.submission.maxScore ? `/${t.submission.maxScore}` : ""}` : "—"}
                </span>
                <TaskStatus status={t.status} />
                {t.submission ? (
                  <Link href={`/writing/submissions/${t.submission.id}`} className={detailClass}>
                    [Chi tiết]
                  </Link>
                ) : (
                  <span className="w-[76px]" aria-hidden="true" />
                )}
                {t.submission && t.submission.criteria.length > 0 && (
                  <p className="basis-full text-sm text-slate-600 dark:text-slate-400">
                    {t.submission.criteria.map((c) => `${c.label} ${c.score ?? "—"}/${c.max ?? "—"}`).join(" · ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
