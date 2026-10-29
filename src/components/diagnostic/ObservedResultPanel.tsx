"use client";

import { ChevronDown, Info } from "lucide-react";
import type {
  DiagnosticBreakdownGroup,
  DiagnosticObjectiveBreakdown,
  DiagnosticObservedResult,
} from "@/lib/api/services/diagnostic.service";
import {
  describeCoverage,
  explainObservedScore,
  formatDifficulty,
  formatNumber,
  formatSubskill,
  withheldMessage,
} from "@/lib/diagnostic/observedResultLogic";

const TONE_CLASS = {
  done: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  missing: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
} as const;

/**
 * FOUR_SKILL_OBSERVED_V3 overview: observed score, objective core, coverage
 * per skill, and how the score was computed. Shared by the diagnostic result
 * page and the profile tab (`compact` leaves out the item breakdown).
 */
export function ObservedResultPanel({
  observed,
  breakdown,
  compact = false,
}: {
  observed: DiagnosticObservedResult;
  breakdown?: DiagnosticObjectiveBreakdown | null;
  compact?: boolean;
}) {
  const score = observed.observed.score;
  const withheld = withheldMessage(observed.observed.withheldReason);
  const explanation = explainObservedScore(observed);
  const objective = [
    { key: "LISTENING", name: "Nghe", skill: observed.listening },
    { key: "READING", name: "Đọc", skill: observed.reading },
  ];
  const productive = [
    { key: "SPEAKING", name: "Nói", skill: observed.speaking },
    { key: "WRITING", name: "Viết", skill: observed.writing },
  ];

  return (
    <div className="mt-4">
      <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Điểm quan sát</p>
          <p className="mt-1 text-4xl font-black text-slate-900 dark:text-slate-100 sm:text-5xl">
            {score !== null ? (
              <>
                {formatNumber(score)}
                <span className="text-2xl font-extrabold text-slate-500 dark:text-slate-400">/100</span>
              </>
            ) : (
              <span className="text-2xl">Chưa có điểm tổng</span>
            )}
          </p>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            {withheld ??
              "Tính trên các phần đã thực sự được chấm trong bài này. Bài bỏ qua không bị tính 0 và cũng không được tính trọng số."}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-850">
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Điểm cốt lõi khách quan (Nghe + Đọc)</p>
          <p className="mt-1 text-2xl font-black text-slate-900 dark:text-slate-100">
            {observed.objectiveCore !== null ? `${formatNumber(observed.objectiveCore)}/100` : "—"}
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
            Chỉ từ câu trắc nghiệm, mỗi kỹ năng 50%. Dùng để so sánh khi bạn bỏ qua Nói hoặc Viết.
          </p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Bằng chứng đã dùng: <span className="font-bold">{formatNumber(observed.coverageWeight * 100)}%</span> trọng số của bài đầy đủ.
          </p>
        </div>
      </div>

      <h2 className="mt-7 text-sm font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
        Hồ sơ bốn kỹ năng
      </h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {objective.map(({ key, name, skill }) => (
          <div key={key} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-black text-slate-700 dark:text-slate-300">{name}</p>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${TONE_CLASS.done}`}>Trắc nghiệm</span>
            </div>
            <p className="mt-2 text-3xl font-black text-slate-900 dark:text-slate-100">
              {skill.score !== null ? formatNumber(skill.score) : "—"}
            </p>
            <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
              {skill.correct}/{skill.total} câu đúng · trọng số 35%
            </p>
          </div>
        ))}
        {productive.map(({ key, name, skill }) => {
          const coverage = describeCoverage(name, skill.graded, skill.total);
          const tone = skill.pending > 0 || skill.failed > 0 ? "pending" : coverage.tone;
          const label =
            skill.pending > 0 ? "Đang chấm" : skill.failed > 0 ? "Chấm chưa thành công" : coverage.label;
          return (
            <div key={key} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-black text-slate-700 dark:text-slate-300">{name}</p>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${TONE_CLASS[tone]}`}>{label}</span>
              </div>
              <p className="mt-2 text-3xl font-black text-slate-900 dark:text-slate-100">
                {skill.score !== null && skill.pending === 0 && skill.failed === 0 ? formatNumber(skill.score) : "—"}
              </p>
              <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
                {skill.graded}/{skill.total} bài đã chấm · 7,5% mỗi bài
              </p>
              {coverage.notice && skill.pending === 0 && skill.failed === 0 && (
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{coverage.notice}</p>
              )}
            </div>
          );
        })}
      </div>

      {observed.languageUse.total > 0 && (
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
          Ngữ pháp & Từ vựng: {observed.languageUse.correct}/{observed.languageUse.total} câu đúng. Phần này chỉ dùng
          để gợi ý luyện tập và không tính vào điểm (trọng số 0).
        </p>
      )}

      {!compact && breakdown && (
        <div className="mt-7 grid gap-4 lg:grid-cols-2">
          {(["LISTENING", "READING"] as const).map((section) => (
            <BreakdownCard key={section} title={section === "LISTENING" ? "Nghe" : "Đọc"} data={breakdown[section]} />
          ))}
        </div>
      )}

      <details className="group mt-6 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-base font-bold text-slate-800 dark:text-slate-200">
          <span>Điểm được tính như thế nào?</span>
          <ChevronDown size={18} strokeWidth={2.25} aria-hidden="true" className="transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-slate-200 px-4 py-4 text-sm leading-6 text-slate-700 dark:border-slate-800 dark:text-slate-300">
          <p>
            Nghe và Đọc mỗi phần chiếm 35%. Mỗi bài Nói và mỗi bài Viết chiếm 7,5% (2 bài mỗi kỹ năng). Điểm quan sát
            chỉ chia cho trọng số của những phần đã được chấm, nên bài bỏ qua không kéo điểm xuống 0, nhưng điểm cũng
            dựa trên ít bằng chứng hơn.
          </p>
          <dl className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {explanation.lines.map((line) => (
              <div key={line.label} className="flex flex-wrap justify-between gap-x-4 py-1.5">
                <dt className={line.counted ? "font-semibold" : "text-slate-500 dark:text-slate-400"}>{line.label}</dt>
                <dd className={line.counted ? "font-bold" : "text-slate-500 dark:text-slate-400"}>{line.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3">Trọng số đã dùng: {explanation.denominator}.</p>
          {explanation.outcome && <p className="mt-1 font-bold">{explanation.outcome}</p>}
          <p className="mt-3 text-slate-600 dark:text-slate-400">
            Bài Nói và Viết được chấm theo tiêu chí có trọng số. Tiêu chí không đủ dữ liệu để đánh giá (ví dụ phát âm khi
            không có dữ liệu âm thanh) được ghi là chưa đánh giá, không được cộng điểm và không bị tính 0.
          </p>
        </div>
      </details>

      <p className="mt-4 flex gap-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
        <Info size={16} strokeWidth={2.25} aria-hidden="true" className="mt-1 shrink-0" />
        <span>
          Đây là chỉ số luyện tập nội bộ của BreadTrans để gợi ý bài học, không phải điểm thi chính thức, không phải
          chứng chỉ và không quy đổi sang trình độ CEFR. Độ khó câu hỏi (1–4) là mức thiết kế của câu, không phải trình
          độ của bạn.
        </span>
      </p>
    </div>
  );
}

function BreakdownCard({
  title,
  data,
}: {
  title: string;
  data?: { byDifficulty: DiagnosticBreakdownGroup[]; bySubskill: DiagnosticBreakdownGroup[] };
}) {
  if (!data) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-base font-black text-slate-900 dark:text-slate-100">{title}: kết quả theo nhóm câu</h3>
      <GroupList heading="Theo độ khó thiết kế" groups={data.byDifficulty} format={formatDifficulty} />
      <GroupList heading="Theo kỹ năng thành phần" groups={data.bySubskill} format={formatSubskill} />
    </div>
  );
}

function GroupList({
  heading,
  groups,
  format,
}: {
  heading: string;
  groups: DiagnosticBreakdownGroup[];
  format: (key: string) => string;
}) {
  if (!groups.length) return null;
  return (
    <div className="mt-3">
      <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{heading}</p>
      <ul className="mt-1.5 space-y-1.5">
        {groups.map((group) => (
          <li key={group.key} className="flex items-center gap-3 text-sm">
            <span className="w-40 shrink-0 text-slate-700 dark:text-slate-300">{format(group.key)}</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
              <span
                className="block h-full rounded-full bg-blue-600 dark:bg-blue-500"
                style={{ width: `${group.total ? (group.correct / group.total) * 100 : 0}%` }}
              />
            </span>
            <span className="w-12 shrink-0 text-right font-bold text-slate-800 dark:text-slate-200">
              {group.correct}/{group.total}
            </span>
          </li>
        ))}
      </ul>
      {groups.some((group) => group.total < 3) && (
        <p className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
          Nhóm có ít hơn 3 câu chỉ là tín hiệu, chưa đủ để kết luận.
        </p>
      )}
    </div>
  );
}
