"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, CircleSlash2, CircleX, Clock3, Loader2, Target } from "lucide-react";
import { toeicService, type ToeicReview, type ToeicReviewQuestion, type ToeicReviewTally } from "@/lib/api/services/toeic.service";
import { PART_TITLES } from "@/lib/toeic/examPaper";
import { REVIEW_FILTERS, filterReview, formatAccuracy, formatDuration, groupByPart, groupSegment, type ReviewFilter } from "@/lib/toeic/resultReview";
import { useCanonicalExamPath } from "@/lib/toeic/useCanonicalExamPath";
import { StatusBadge, ToeicAnswerDialog, type GroupAudio } from "./ToeicAnswerDetail";

const MARKER_TONE: Record<ToeicReviewQuestion["status"], string> = {
  CORRECT: "bg-emerald-600 text-white hover:bg-emerald-700",
  INCORRECT: "bg-rose-600 text-white hover:bg-rose-700",
  SKIPPED: "bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100",
};
const STATUS_WORD = { CORRECT: "đúng", INCORRECT: "sai", SKIPPED: "bỏ qua" } as const;
const letter = (i: number | null) => (i === null ? "—" : String.fromCharCode(65 + i));

/** Listening master of the attempt, used to replay each group in the review. */
function useReviewAudio(attemptId: number, needed: boolean) {
  const { data, isLoading } = useQuery({
    queryKey: ["toeic-review-master", attemptId],
    queryFn: () => toeicService.getListeningMaster(attemptId),
    enabled: needed,
    staleTime: 10 * 60_000,
  });
  const src = data?.available ? (data.url ?? (data.path ? toeicService.apiUrl(data.path) : null)) : null;
  const audioFor = useCallback(
    (q: ToeicReviewQuestion): GroupAudio => {
      if (!data?.available || !src || q.part > 4) return null;
      const seg = groupSegment(data.timeline, q.groupId);
      return seg ? { src, ...seg } : null;
    },
    [data, src],
  );
  const note = isLoading ? "Đang tải audio…" : data && !data.available ? "Audio của đề chưa sẵn sàng trên máy chủ này." : null;
  return { audioFor, note };
}

function Metric({ icon: Icon, label, value, tone }: { icon: typeof Target; label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <p className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
        <Icon size={16} strokeWidth={2.25} className={tone} aria-hidden="true" /> {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}

function SkillCard({ title, tally, score }: { title: string; tally: ToeicReviewTally; score: number | null }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-blue-700 dark:text-blue-300">
        {tally.correct}/{tally.total} <span className="text-base font-semibold text-slate-600 dark:text-slate-400">câu đúng</span>
      </p>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Độ chính xác {formatAccuracy(tally.accuracy)}
        {score !== null && <> · Điểm luyện {score}</>}
      </p>
    </div>
  );
}

function Markers({ questions, onOpen }: { questions: ToeicReviewQuestion[]; onOpen: (q: ToeicReviewQuestion) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {questions.map((q) => (
        <button
          key={q.questionId}
          type="button"
          onClick={() => onOpen(q)}
          aria-label={`Câu ${q.questionNumber}, ${STATUS_WORD[q.status]}. Xem chi tiết`}
          className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full px-1.5 text-xs font-bold tabular-nums transition-colors ${MARKER_TONE[q.status]}`}
        >
          {q.questionNumber}
        </button>
      ))}
    </div>
  );
}

/**
 * Post-submission result of a TOEIC L&R attempt: overview, Part analysis,
 * the answer list and the per-question detail. Read-only: it only reads the
 * stored review. `section` limits it to Listening or Reading (4 Skills tabs).
 */
export function ToeicLrResult({
  attemptId,
  section,
  embedded = false,
  extraActions,
}: {
  attemptId: number;
  section?: "LISTENING" | "READING";
  embedded?: boolean;
  extraActions?: React.ReactNode;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["toeic-review", attemptId],
    queryFn: () => toeicService.getReview(attemptId),
    enabled: Number.isInteger(attemptId),
  });
  if (isLoading)
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" aria-label="Đang tải kết quả" />
      </div>
    );
  if (isError || !data)
    return (
      <p className="mx-auto max-w-xl py-16 text-center text-slate-700 dark:text-slate-300">
        Chưa thể tải kết quả. Đáp án chỉ xem được sau khi lượt thi đã nộp.
      </p>
    );
  return <LrResultView review={data} section={section} embedded={embedded} extraActions={extraActions} />;
}

function LrResultView({
  review,
  section,
  embedded,
  extraActions,
}: {
  review: ToeicReview;
  section?: "LISTENING" | "READING";
  embedded: boolean;
  extraActions?: React.ReactNode;
}) {
  const questions = useMemo(
    () => review.questions.filter((q) => !section || (section === "LISTENING" ? q.part <= 4 : q.part >= 5)),
    [review.questions, section],
  );
  const parts = useMemo(() => review.summary.parts.filter((p) => questions.some((q) => q.part === p.part)), [review.summary.parts, questions]);
  const tally = section === "LISTENING" ? review.summary.listening : section === "READING" ? review.summary.reading : review.summary.overall;
  const [tab, setTab] = useState<number | "ALL">("ALL");
  const [filter, setFilter] = useState<ReviewFilter>("ALL");
  const [openId, setOpenId] = useState<number | null>(null);
  const { audioFor, note } = useReviewAudio(review.attemptId, questions.some((q) => q.part <= 4));
  const { path: examPath } = useCanonicalExamPath({ examSetId: review.exam.id });
  const byNumber = useMemo(() => [...questions].sort((a, b) => a.questionNumber - b.questionNumber), [questions]);
  const openIndex = openId === null ? -1 : byNumber.findIndex((q) => q.questionId === openId);
  const open = openIndex >= 0 ? byNumber[openIndex] : null;
  const onOpen = useCallback((q: ToeicReviewQuestion) => setOpenId(q.questionId), []);
  const partial = review.selectedParts.length > 0;
  const scope = partial ? `Luyện tập Part ${review.selectedParts.join(", ")}` : review.mode === "FULL_TEST" ? "Full Test" : "Luyện tập toàn bộ đề";
  const filtered = filterReview(questions, filter);
  const counts: Record<ReviewFilter, number> = {
    ALL: questions.length,
    CORRECT: questions.filter((q) => q.status === "CORRECT").length,
    INCORRECT: questions.filter((q) => q.status === "INCORRECT").length,
    SKIPPED: questions.filter((q) => q.status === "SKIPPED").length,
    FLAGGED: questions.filter((q) => q.flagged).length,
  };
  const tableParts = tab === "ALL" ? parts : parts.filter((p) => p.part === tab);
  const showScore = review.scores.total !== null;
  const Heading = embedded ? "h2" : "h1";

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Heading className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">
            {embedded ? (section === "LISTENING" ? "Listening" : section === "READING" ? "Reading" : "Listening & Reading") : `Kết quả thi: ${review.exam.title}`}
          </Heading>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            <span className="mr-2 rounded bg-blue-50 px-2 py-0.5 font-semibold text-blue-800 dark:bg-blue-950/50 dark:text-blue-200">{scope}</span>
            {review.submittedAt && <>Nộp lúc {new Date(review.submittedAt).toLocaleString("vi-VN")}</>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="#answers" className="inline-flex min-h-11 items-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700">
            Xem đáp án
          </a>
          {!embedded && (
            <Link
              href={examPath ?? "/exams"}
              className="inline-flex min-h-11 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              Về trang đề thi
            </Link>
          )}
          {extraActions}
        </div>
      </header>

      <section aria-label="Tổng quan kết quả" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric icon={Target} label="Kết quả làm bài" value={`${tally.correct}/${tally.total}`} tone="text-blue-600" />
        <Metric icon={Target} label="Độ chính xác" value={formatAccuracy(tally.accuracy)} tone="text-blue-600" />
        <Metric icon={Clock3} label="Thời gian hoàn thành" value={formatDuration(review.durationSeconds) ?? "—"} tone="text-slate-500" />
        <Metric icon={CircleSlash2} label="Bỏ qua" value={String(tally.skipped)} tone="text-slate-500" />
        <Metric icon={CheckCircle2} label="Trả lời đúng" value={String(tally.correct)} tone="text-emerald-600" />
        <Metric icon={CircleX} label="Trả lời sai" value={String(tally.incorrect)} tone="text-rose-600" />
        {showScore && !section && (
          <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm text-slate-600 dark:text-slate-400">Điểm luyện L&amp;R (BreadTrans)</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{review.scores.total}</p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Quy đổi nội bộ 5 điểm mỗi câu đúng, không phải điểm thi ETS.</p>
          </div>
        )}
      </section>
      {!showScore && (
        <p className="-mt-4 text-sm text-slate-600 dark:text-slate-400">Luyện tập theo Part không quy đổi điểm; kết quả tính theo số câu đúng.</p>
      )}

      {!section && (
        <section aria-label="Theo kỹ năng" className="grid gap-3 sm:grid-cols-2">
          {review.summary.listening.total > 0 && <SkillCard title="Listening" tally={review.summary.listening} score={review.scores.listening} />}
          {review.summary.reading.total > 0 && <SkillCard title="Reading" tally={review.summary.reading} score={review.scores.reading} />}
        </section>
      )}

      <section aria-labelledby="analysis-title">
        <h2 id="analysis-title" className="text-xl font-bold text-slate-900 dark:text-slate-100">Phân tích chi tiết</h2>
        <div role="tablist" aria-label="Chọn Part" className="mt-3 flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-700">
          {(["ALL", ...parts.map((p) => p.part)] as Array<number | "ALL">).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`shrink-0 border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${tab === id ? "border-blue-600 text-blue-700 dark:text-blue-300" : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"}`}
            >
              {id === "ALL" ? "Tổng quát" : `Part ${id}`}
            </button>
          ))}
        </div>
        {/* Phones: one card per Part, markers under the counts. */}
        <ul className="mt-3 space-y-3 md:hidden">
          {tableParts.map((p) => (
            <li key={p.part} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                Part {p.part} <span className="text-xs font-normal text-slate-600 dark:text-slate-400">· {PART_TITLES[p.part]}</span>
              </p>
              <p className="mt-1 text-sm tabular-nums text-slate-700 dark:text-slate-300">
                Đúng <span className="font-semibold text-emerald-700 dark:text-emerald-300">{p.correct}</span> · Sai{" "}
                <span className="font-semibold text-rose-700 dark:text-rose-300">{p.incorrect}</span> · Bỏ qua {p.skipped} · {formatAccuracy(p.accuracy)}
              </p>
              <div className="mt-2">
                <Markers questions={questions.filter((q) => q.part === p.part)} onOpen={onOpen} />
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-3 hidden overflow-x-auto md:block">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-800 dark:bg-slate-800/60 dark:text-slate-100">
              <tr>
                <th className="px-3 py-2 font-bold">Phần</th>
                <th className="px-3 py-2 font-bold">Đúng</th>
                <th className="px-3 py-2 font-bold">Sai</th>
                <th className="px-3 py-2 font-bold">Bỏ qua</th>
                <th className="px-3 py-2 font-bold">Độ chính xác</th>
                <th className="px-3 py-2 font-bold">Danh sách câu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 dark:divide-slate-800 dark:text-slate-200">
              {tableParts.map((p) => (
                <tr key={p.part} className="align-top">
                  <td className="px-3 py-2.5">
                    <p className="font-semibold">Part {p.part}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{PART_TITLES[p.part]}</p>
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-emerald-700 dark:text-emerald-300">{p.correct}</td>
                  <td className="px-3 py-2.5 tabular-nums text-rose-700 dark:text-rose-300">{p.incorrect}</td>
                  <td className="px-3 py-2.5 tabular-nums">{p.skipped}</td>
                  <td className="px-3 py-2.5 tabular-nums">{formatAccuracy(p.accuracy)}</td>
                  <td className="px-3 py-2.5">
                    <Markers questions={questions.filter((q) => q.part === p.part)} onOpen={onOpen} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
          Thống kê theo Part. Đề chưa có nhãn dạng câu hỏi do người soạn gán, nên không chia theo dạng câu.
        </p>
      </section>

      <section id="answers" aria-labelledby="answers-title" className="scroll-mt-24">
        <h2 id="answers-title" className="text-xl font-bold text-slate-900 dark:text-slate-100">Đáp án và giải thích</h2>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Lọc câu hỏi">
          {REVIEW_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`inline-flex min-h-10 items-center rounded-full border px-3.5 text-sm font-semibold transition-colors ${filter === f.id ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"}`}
            >
              {f.label} ({counts[f.id]})
            </button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <p className="mt-4 text-slate-600 dark:text-slate-400">Không có câu nào trong mục này.</p>
        ) : (
          groupByPart(filtered).map((g) => (
            <div key={g.part} className="mt-5">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Part {g.part}</h3>
              <ul className="mt-2 grid gap-x-6 gap-y-1 md:grid-cols-2">
                {g.questions.map((q) => (
                  <li key={q.questionId} data-review-row={q.questionNumber} className="flex items-center gap-2 border-b border-slate-100 py-2 text-[15px] dark:border-slate-800">
                    <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-blue-50 px-1.5 text-sm font-bold text-blue-800 dark:bg-blue-950/50 dark:text-blue-200">
                      {q.questionNumber}
                    </span>
                    <span className="min-w-0 flex-1 text-slate-800 dark:text-slate-200">
                      Bạn chọn: <strong className={q.status === "INCORRECT" ? "text-rose-700 dark:text-rose-300" : ""}>{letter(q.selectedIndex)}</strong>
                      <span className="mx-1.5 text-slate-400">·</span>
                      Đáp án: <strong className="text-emerald-700 dark:text-emerald-300">{letter(q.correctIndex)}</strong>
                    </span>
                    <StatusBadge status={q.status} />
                    <button type="button" onClick={() => onOpen(q)} className="shrink-0 rounded-md px-2 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/40">
                      [Chi tiết]
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
        {!embedded && (
          <Link
            href={`/toeic/review/${review.attemptId}`}
            className="mt-6 inline-flex min-h-11 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            Xem chi tiết đáp án
          </Link>
        )}
      </section>

      {open && (
        <ToeicAnswerDialog
          examTitle={review.exam.title}
          question={open}
          audio={audioFor(open)}
          audioNote={note}
          hasPrev={openIndex > 0}
          hasNext={openIndex < byNumber.length - 1}
          onPrev={() => setOpenId(byNumber[openIndex - 1].questionId)}
          onNext={() => setOpenId(byNumber[openIndex + 1].questionId)}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}

export { useReviewAudio };
