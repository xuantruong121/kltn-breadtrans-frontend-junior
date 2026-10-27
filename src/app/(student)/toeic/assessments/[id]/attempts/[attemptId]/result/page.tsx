"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  toeicService,
  type ToeicAssessmentReviewComponent,
  type ToeicSpeakingTask,
  type ToeicWritingTask,
} from "@/lib/api/services/toeic.service";
import { ToeicLrResult } from "@/components/toeic/result/ToeicLrResult";
import { SpeakingTasksResult, WritingTasksResult } from "@/components/toeic/result/ToeicSkillTasks";

type Tab = "OVERVIEW" | "LISTENING" | "READING" | "SPEAKING" | "WRITING";
const TAB_LABEL: Record<Tab, string> = {
  OVERVIEW: "Tổng quan",
  LISTENING: "Listening",
  READING: "Reading",
  SPEAKING: "Speaking",
  WRITING: "Writing",
};

function SkillCard({ title, value, detail, pending }: { title: string; value: string; detail: string; pending?: string | null }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-blue-700 dark:text-blue-300">{value}</p>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{detail}</p>
      {pending && <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">{pending}</p>}
    </div>
  );
}

function pendingNote(tasks: Array<{ status: string }>) {
  const pending = tasks.filter((t) => t.status === "PENDING").length;
  const failed = tasks.filter((t) => t.status === "FAILED").length;
  const missing = tasks.filter((t) => t.status === "NOT_SUBMITTED").length;
  const parts = [pending && `${pending} câu đang chấm`, failed && `${failed} câu chấm lỗi`, missing && `${missing} câu chưa làm`].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/** Read-only result of a TOEIC S&W or 4 Skills attempt, one tab per skill. */
export default function ToeicAssessmentResultPage({ params }: { params: Promise<{ id: string; attemptId: string }> }) {
  const { id, attemptId: raw } = use(params);
  const attemptId = Number(raw);
  const [tab, setTab] = useState<Tab>("OVERVIEW");
  const { data, isLoading, isError } = useQuery({
    queryKey: ["toeic-assessment-review", attemptId],
    queryFn: () => toeicService.getAssessmentReview(attemptId),
    enabled: Number.isInteger(attemptId),
    // Tasks still being graded refresh on their own; nothing is regraded here.
    refetchInterval: (q) =>
      q.state.data?.components.some((c) => c.tasks?.some((t) => t.status === "PENDING")) ? 10_000 : false,
  });
  if (isLoading)
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" aria-label="Đang tải kết quả" />
      </div>
    );
  if (isError || !data)
    return <main className="mx-auto max-w-2xl px-4 py-16 text-center text-slate-700 dark:text-slate-300">Không tải được kết quả bài thi.</main>;

  const byKind = (kind: ToeicAssessmentReviewComponent["kind"]) => data.components.find((c) => c.kind === kind);
  const lr = byKind("LISTENING_READING");
  const speaking = byKind("SPEAKING");
  const writing = byKind("WRITING");
  const speakingTasks = (speaking?.tasks ?? []) as ToeicSpeakingTask[];
  const writingTasks = (writing?.tasks ?? []) as ToeicWritingTask[];
  const skill = (kind: string) => data.skills.find((s) => s.kind === kind);
  const lrSkill = skill("LISTENING_READING");
  const spSkill = skill("SPEAKING");
  const wrSkill = skill("WRITING");
  const lrReady = Boolean(lr?.childAttemptId && lr.childStatus === "SUBMITTED");
  const tabs: Tab[] = ["OVERVIEW", ...(lr ? (["LISTENING", "READING"] as Tab[]) : []), ...(speaking ? (["SPEAKING"] as Tab[]) : []), ...(writing ? (["WRITING"] as Tab[]) : [])];
  const graded = <T extends { status: string }>(tasks: T[]) => tasks.filter((t) => t.status === "GRADED").length;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6">
      <Link href={`/toeic/assessments/${id}/attempts/${attemptId}`} className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-300">
        <ArrowLeft size={16} aria-hidden="true" /> Tiến độ bài thi
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">Kết quả thi: {data.assessment.title}</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        <span className={`mr-2 rounded px-2 py-0.5 font-semibold ${data.status === "COMPLETED" ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"}`}>
          {data.status === "COMPLETED" ? "Đã hoàn thành" : "Chưa hoàn thành"}
        </span>
        Điểm luyện tập nội bộ của BreadTrans theo từng kỹ năng, không phải điểm ETS và không gộp thành một điểm tổng.
      </p>

      <div role="tablist" aria-label="Kỹ năng" className="mt-6 flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-700">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`shrink-0 border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${tab === t ? "border-blue-600 text-blue-700 dark:text-blue-300" : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"}`}
          >
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "OVERVIEW" && (
          <section aria-label="Kết quả theo kỹ năng" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {lr && (
              <>
                <SkillCard
                  title="Listening"
                  value={lrReady && lrSkill?.listeningScore != null ? String(lrSkill.listeningScore) : "—"}
                  detail="Điểm luyện Listening (BreadTrans), quy đổi nội bộ"
                  pending={lrReady ? null : "Phần Listening & Reading chưa nộp"}
                />
                <SkillCard
                  title="Reading"
                  value={lrReady && lrSkill?.readingScore != null ? String(lrSkill.readingScore) : "—"}
                  detail="Điểm luyện Reading (BreadTrans), quy đổi nội bộ"
                  pending={lrReady ? null : "Phần Listening & Reading chưa nộp"}
                />
              </>
            )}
            {speaking && (
              <SkillCard
                title="Speaking"
                value={spSkill?.meanScore != null ? `${spSkill.meanScore}/10` : "—"}
                detail={`Điểm luyện Speaking (BreadTrans) · đã chấm ${graded(speakingTasks)}/${speakingTasks.length} câu`}
                pending={pendingNote(speakingTasks)}
              />
            )}
            {writing && (
              <SkillCard
                title="Writing"
                value={wrSkill?.maxPoints ? `${wrSkill.points}/${wrSkill.maxPoints}` : "—"}
                detail={`Điểm luyện Writing (BreadTrans) · đã chấm ${graded(writingTasks)}/${writingTasks.length} câu`}
                pending={pendingNote(writingTasks)}
              />
            )}
          </section>
        )}
        {(tab === "LISTENING" || tab === "READING") &&
          (lrReady ? (
            <ToeicLrResult attemptId={lr!.childAttemptId!} section={tab} embedded />
          ) : (
            <p className="text-slate-700 dark:text-slate-300">Phần Listening &amp; Reading chưa nộp, nên chưa có kết quả.</p>
          ))}
        {tab === "SPEAKING" && <SpeakingTasksResult tasks={speakingTasks} examTitle={data.assessment.title} />}
        {tab === "WRITING" && <WritingTasksResult tasks={writingTasks} />}
      </div>
    </main>
  );
}
