"use client";

/**
 * Thống kê kết quả luyện thi. Top tabs are certifications (TOEIC now, IELTS
 * coming soon). TOEIC shows: time filter, overview with the learner's exam
 * date and target score (editable, kept on the profile), Listening/Reading
 * cards, accuracy trend, per-Part question-type table, the submitted tests
 * (first five, "Xem tất cả" opens the full paginated list), and the
 * Speaking & Writing / 4 Skills attempts. Scores are BreadTrans practice
 * conversions, never ETS scores.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, BookOpen, CalendarDays, Check, Clock3, Hourglass, Loader2, Pencil, Target, X } from "lucide-react";

import { toeicService, type ToeicLrSkillStats, type ToeicLrStats } from "@/lib/api/services/toeic.service";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import { formatClock } from "@/lib/toeic/examPaper";

const RANGES = [
  { value: 7, label: "7 ngày" },
  { value: 30, label: "30 ngày" },
  { value: 90, label: "90 ngày" },
  { value: 365, label: "1 năm" },
  { value: 0, label: "Toàn bộ" },
];
const PAGE_SIZE = 10;

const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
const fmtPct = (value: number | null) => (value === null ? "—" : `${value.toFixed(2)}%`);
type Attempt = ToeicLrStats["attempts"][number];

function Card({ label, children, icon }: { label: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-white px-3 py-4 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
      {icon && <div className="mb-1.5 text-slate-500 dark:text-slate-400">{icon}</div>}
      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}
const Big = ({ children }: { children: React.ReactNode }) => (
  <p className="text-2xl font-black tabular-nums text-slate-900 dark:text-white">{children}</p>
);
const Unit = ({ children }: { children: React.ReactNode }) => <p className="text-sm text-slate-500 dark:text-slate-400">{children}</p>;

function TrendChart({ trend, legend }: { trend: ToeicLrSkillStats["trend"]; legend: string }) {
  const points = trend.filter((t) => t.accuracy !== null);
  if (points.length === 0) return <p className="py-10 text-center text-sm text-slate-500">Chưa có dữ liệu để vẽ biểu đồ.</p>;
  const W = 900;
  const H = 280;
  const pad = { l: 40, r: 20, t: 34, b: 30 };
  const x = (i: number) => (points.length === 1 ? pad.l + 8 : pad.l + 8 + (i * (W - pad.l - pad.r - 16)) / (points.length - 1));
  const y = (v: number) => pad.t + ((100 - v) * (H - pad.t - pad.b)) / 100;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Độ chính xác theo từng lần làm bài">
      <rect x={W / 2 - 70} y={6} width={28} height={12} className="fill-rose-400" />
      <text x={W / 2 - 36} y={16} className="fill-slate-600 text-[12px] dark:fill-slate-300">
        {legend}
      </text>
      {[0, 20, 40, 60, 80, 100].map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} className="stroke-slate-200 dark:stroke-slate-700" />
          <text x={pad.l - 8} y={y(v) + 4} textAnchor="end" className="fill-slate-500 text-[11px]">
            {v}
          </text>
        </g>
      ))}
      <polyline points={points.map((p, i) => `${x(i)},${y(p.accuracy!)}`).join(" ")} fill="none" className="stroke-rose-400" strokeWidth={2} />
      {points.map((p, i) => (
        <g key={p.attemptId}>
          <circle cx={x(i)} cy={y(p.accuracy!)} r={4} className="fill-rose-500" />
          <text x={x(i)} y={y(p.accuracy!) + 16} textAnchor="middle" className="fill-rose-600 text-[11px]">
            {p.accuracy!.toFixed(2)}%
          </text>
          <text x={x(i)} y={H - 8} textAnchor="middle" className="fill-slate-500 text-[11px]">
            {p.submittedAt.slice(0, 10)}
          </text>
        </g>
      ))}
    </svg>
  );
}

function AttemptTable({ rows }: { rows: Attempt[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] text-left text-base">
        <thead className="border-b border-slate-200 text-slate-800 dark:border-slate-700 dark:text-slate-100">
          <tr>
            <th className="py-2.5 pr-4 font-bold">Ngày làm</th>
            <th className="py-2.5 pr-4 font-bold">Đề thi</th>
            <th className="py-2.5 pr-4 font-bold">Kết quả</th>
            <th className="py-2.5 pr-4 font-bold">Thời gian làm bài</th>
            <th className="py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-800 dark:divide-slate-800 dark:text-slate-100">
          {rows.map((a) => (
            <tr key={a.id} className="odd:bg-slate-50/70 dark:odd:bg-slate-800/30">
              <td className="py-2.5 pr-4 tabular-nums">{fmtDate(a.submittedAt)}</td>
              <td className="py-2.5 pr-4">
                {a.examTitle}{" "}
                <span className={`ml-1 rounded px-1.5 py-0.5 text-xs font-bold text-white ${a.inAssessment ? "bg-sky-600" : a.mode === "FULL_TEST" ? "bg-emerald-600" : "bg-slate-500"}`}>
                  {a.inAssessment ? "4 kỹ năng" : a.mode === "FULL_TEST" ? "Full test" : a.parts?.length ? `Part ${a.parts.join(", ")}` : "Luyện tập"}
                </span>
              </td>
              <td className="py-2.5 pr-4 tabular-nums">
                {a.listeningCorrect + a.readingCorrect}/{a.listeningTotal + a.readingTotal}
                {a.totalScore !== null && ` (Điểm: ${a.totalScore})`}
              </td>
              <td className="py-2.5 pr-4 tabular-nums">{a.durationSeconds === null ? "—" : formatClock(a.durationSeconds)}</td>
              <td className="py-2.5 text-right">
                <Link href={`/toeic/results/${a.id}`} className="font-semibold text-blue-700 hover:underline dark:text-blue-300">
                  Xem chi tiết
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AllAttemptsDialog({ rows, title, onClose }: { rows: Attempt[]; title: string; onClose: () => void }) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} className="max-h-[85dvh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900">
        <div className="mb-3 flex items-start justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Đóng" className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={20} />
          </button>
        </div>
        <AttemptTable rows={rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)} />
        <div className="mt-4 flex flex-wrap gap-1.5" aria-label="Trang">
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPage(i)}
              aria-current={page === i ? "page" : undefined}
              className={`min-h-10 min-w-10 rounded-md text-sm font-bold ${page === i ? "bg-blue-700 text-white" : "border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function GoalEditor({ goal, field }: { goal: ToeicLrStats["goal"]; field: "examDate" | "targetScore" }) {
  const client = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(field === "examDate" ? (goal.examDate ?? "") : goal.targetScore ? String(goal.targetScore) : "");
  const save = useMutation({
    mutationFn: () =>
      toeicService.saveToeicGoal({
        examDate: field === "examDate" ? value || null : goal.examDate,
        targetScore: field === "targetScore" ? (value ? Number(value) : null) : goal.targetScore,
      }),
    onSuccess: async () => {
      setEditing(false);
      await client.invalidateQueries({ queryKey: ["toeic-lr-stats"] });
    },
  });
  const label = field === "examDate" ? "ngày dự thi" : "điểm mục tiêu";
  if (!editing)
    return (
      <div className="flex flex-col items-center">
        {field === "examDate" ? (
          <Big>{goal.examDate ? fmtDate(goal.examDate) : "—"}</Big>
        ) : (
          <p className="text-2xl font-black tabular-nums text-blue-700 dark:text-blue-300">{goal.targetScore ?? "—"}</p>
        )}
        <button type="button" onClick={() => setEditing(true)} aria-label={`Sửa ${label}`} className="mt-1 inline-flex min-h-8 min-w-8 items-center justify-center rounded-md text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/40">
          <Pencil size={15} />
        </button>
      </div>
    );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
      className="flex flex-col items-center gap-1.5"
    >
      <input
        type={field === "examDate" ? "date" : "number"}
        min={field === "targetScore" ? 10 : undefined}
        max={field === "targetScore" ? 990 : undefined}
        step={field === "targetScore" ? 5 : undefined}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label={label}
        className="min-h-10 w-full max-w-40 rounded-md border border-slate-300 px-2 text-center text-base dark:border-slate-700 dark:bg-slate-950"
      />
      <span className="flex gap-1">
        <button type="submit" disabled={save.isPending} aria-label="Lưu" className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
          <Check size={16} />
        </button>
        <button type="button" onClick={() => setEditing(false)} aria-label="Hủy" className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300">
          <X size={16} />
        </button>
      </span>
      {save.isError && <p className="text-xs font-semibold text-rose-600">{getApiErrorMessage(save.error, "Không lưu được.")}</p>}
    </form>
  );
}

function AssessmentSection() {
  const { data, isLoading } = useQuery({ queryKey: ["toeic-assessment-history"], queryFn: toeicService.getAssessmentHistory });
  const rows = data ?? [];
  const skillText = (s: any) => {
    if (s.kind === "LISTENING_READING") return s.complete ? `L&R ${s.totalCorrect ?? "—"}/200 (Điểm: ${s.totalScore ?? "—"})` : "L&R chưa xong";
    if (s.kind === "SPEAKING") return s.meanScore !== null ? `Speaking ${s.meanScore}/10 · ${s.gradedCount}/${s.taskCount} bài` : `Speaking ${s.gradedCount ?? 0}/${s.taskCount ?? 0} bài`;
    return s.maxPoints ? `Writing ${s.points}/${s.maxPoints} điểm · ${s.gradedCount}/${s.taskCount} bài` : `Writing ${s.gradedCount ?? 0}/${s.taskCount ?? 0} bài`;
  };
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">Speaking & Writing và 4 kỹ năng:</h2>
      {isLoading ? (
        <Loader2 className="animate-spin text-blue-600" />
      ) : rows.length === 0 ? (
        <p className="text-slate-600 dark:text-slate-300">Chưa có lượt làm bài nào.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-base">
            <thead className="border-b border-slate-200 text-slate-800 dark:border-slate-700 dark:text-slate-100">
              <tr>
                <th className="py-2.5 pr-4 font-bold">Ngày làm</th>
                <th className="py-2.5 pr-4 font-bold">Đề thi</th>
                <th className="py-2.5 pr-4 font-bold">Kết quả theo kỹ năng</th>
                <th className="py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 dark:divide-slate-800 dark:text-slate-100">
              {rows.map((a: any) => (
                <tr key={a.id} className="odd:bg-slate-50/70 dark:odd:bg-slate-800/30">
                  <td className="py-2.5 pr-4 tabular-nums">{fmtDate(a.completedAt ?? a.startedAt)}</td>
                  <td className="py-2.5 pr-4">
                    {a.assessment.title}
                    {a.status !== "COMPLETED" && <span className="ml-2 rounded bg-amber-500 px-1.5 py-0.5 text-xs font-bold text-white">Đang làm dở</span>}
                  </td>
                  <td className="py-2.5 pr-4 text-sm">
                    {(a.result?.skills ?? []).map((s: any) => (
                      <p key={s.kind}>{skillText(s)}</p>
                    ))}
                  </td>
                  <td className="py-2.5 text-right">
                    <Link
                      href={`/toeic/assessments/${a.assessmentId}/attempts/${a.id}${a.status === "COMPLETED" ? "/result" : ""}`}
                      className="font-semibold text-blue-700 hover:underline dark:text-blue-300"
                    >
                      {a.status === "COMPLETED" ? "Xem chi tiết" : "Làm tiếp"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ToeicTab() {
  const [pending, setPending] = useState(30);
  const [days, setDays] = useState(30);
  const [skill, setSkill] = useState<"LISTENING" | "READING">("LISTENING");
  const [part, setPart] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const { data, isLoading, isError } = useQuery<ToeicLrStats>({
    queryKey: ["toeic-lr-stats", days],
    queryFn: () => toeicService.getLrStats(days || null),
  });
  const s = data?.skills[skill];
  const parts = s?.parts ?? [];
  const activePart = parts.find((p) => p.part === part) ?? parts[0] ?? null;
  const skillAttempts = useMemo(
    () => (data?.attempts ?? []).filter((a) => (skill === "LISTENING" ? a.listeningTotal : a.readingTotal) > 0),
    [data, skill],
  );
  const skillName = skill === "LISTENING" ? "Listening" : "Reading";
  const rangeLabel = RANGES.find((r) => r.value === days)?.label ?? "";

  return (
    <div className="space-y-7">
      <p className="text-base italic text-rose-600 dark:text-rose-400">
        Chú ý: Mặc định trang thống kê hiển thị các bài làm trong khoảng 30 ngày gần nhất (tính từ bài nộp cuối). Để xem kết quả trong khoảng thời gian khác, chọn ở ô bên dưới.
      </p>
      <div>
        <p className="mb-1.5 text-base text-slate-800 dark:text-slate-100">Lọc kết quả theo ngày (tính từ bài thi cuối):</p>
        <div className="flex flex-wrap gap-2">
          <select value={pending} onChange={(e) => setPending(Number(e.target.value))} aria-label="Khoảng thời gian" className="min-h-11 w-56 rounded-lg border border-slate-300 bg-white px-3 text-base dark:border-slate-700 dark:bg-slate-900">
            {RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => setDays(pending)} className="min-h-11 rounded-lg bg-blue-700 px-4 font-bold text-white hover:bg-blue-800">
            Tìm kiếm
          </button>
          <button
            type="button"
            onClick={() => {
              setPending(30);
              setDays(30);
            }}
            className="min-h-11 rounded-lg bg-slate-100 px-4 font-bold text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100"
          >
            Xóa
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-blue-600" />
        </div>
      ) : isError || !data ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800">Không tải được thống kê. Vui lòng thử lại.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            <Card label="Số đề đã làm" icon={<BookOpen size={20} />}>
              <Big>{data.overview.attempts}</Big>
              <Unit>đề thi</Unit>
            </Card>
            <Card label="Thời gian luyện thi" icon={<Clock3 size={20} />}>
              <Big>{Math.round(data.overview.practiceSeconds / 60)}</Big>
              <Unit>phút</Unit>
            </Card>
            <Card label="Ngày dự thi" icon={<CalendarDays size={20} />}>
              <GoalEditor goal={data.goal} field="examDate" />
            </Card>
            <Card label="Tới kỳ thi" icon={<Hourglass size={20} />}>
              <Big>{data.goal.daysUntilExam ?? "—"}</Big>
              <Unit>ngày</Unit>
            </Card>
            <Card label="Điểm mục tiêu" icon={<Target size={20} />}>
              <GoalEditor goal={data.goal} field="targetScore" />
            </Card>
          </div>

          <div className="flex gap-2" role="tablist" aria-label="Kỹ năng">
            {(["LISTENING", "READING"] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={skill === k}
                onClick={() => {
                  setSkill(k);
                  setPart(null);
                }}
                className={`min-h-11 rounded-full px-4 text-base font-semibold ${skill === k ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300" : "bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200"}`}
              >
                {k === "LISTENING" ? "Listening" : "Reading"}
              </button>
            ))}
          </div>

          {s && (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
                <Card label="Số đề đã làm">
                  <Big>{s.attempts}</Big>
                  <Unit>đề thi</Unit>
                </Card>
                <Card label="Độ chính xác (#đúng/#tổng)">
                  <Big>{fmtPct(s.accuracy)}</Big>
                  <Unit>
                    {s.correct}/{s.total} câu
                  </Unit>
                </Card>
                <Card label="Thời gian trung bình">
                  <Big>{s.averageSeconds === null ? "—" : formatClock(s.averageSeconds)}</Big>
                </Card>
                <Card label="Điểm trung bình">
                  <Big>{s.averageScore === null ? "—" : `${s.averageScore}/495`}</Big>
                </Card>
                <Card label="Điểm cao nhất">
                  <Big>{s.bestScore === null ? "—" : `${s.bestScore}/495`}</Big>
                </Card>
              </div>

              <TrendChart trend={s.trend} legend={`% đúng (${rangeLabel})`} />

              {activePart && (
                <section>
                  <div className="mb-3 flex flex-wrap gap-2" role="tablist" aria-label="Part">
                    {parts.map((p) => (
                      <button
                        key={p.part}
                        type="button"
                        role="tab"
                        aria-selected={activePart.part === p.part}
                        onClick={() => setPart(p.part)}
                        className={`min-h-10 rounded-full px-4 text-base font-semibold ${activePart.part === p.part ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300" : "bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200"}`}
                      >
                        Part {p.part}
                      </button>
                    ))}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] text-left text-base">
                      <thead className="border-y border-slate-200 text-slate-800 dark:border-slate-700 dark:text-slate-100">
                        <tr>
                          <th className="py-2.5 pr-4 font-bold">Phân loại câu hỏi</th>
                          <th className="py-2.5 pr-4 font-bold">Số câu đúng</th>
                          <th className="py-2.5 pr-4 font-bold">Số câu sai</th>
                          <th className="py-2.5 pr-4 font-bold">Bỏ trống</th>
                          <th className="py-2.5 font-bold">Độ chính xác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800 dark:divide-slate-800 dark:text-slate-100">
                        {activePart.types.map((t) => (
                          <tr key={t.type} className="odd:bg-slate-50/70 dark:odd:bg-slate-800/30">
                            <td className="py-2.5 pr-4">
                              [Part {activePart.part}] {t.type}
                            </td>
                            <td className="py-2.5 pr-4 tabular-nums">{t.correct}</td>
                            <td className="py-2.5 pr-4 tabular-nums">{t.wrong}</td>
                            <td className="py-2.5 pr-4 tabular-nums">{t.unanswered}</td>
                            <td className="py-2.5 tabular-nums">{fmtPct(t.accuracy)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Dạng câu hỏi được phân loại tự động theo nội dung câu hỏi, không phải nhãn do người soạn đề gán. Câu mà quy tắc không nhận ra chắc chắn được xếp vào "Chưa phân loại".</p>
                </section>
              )}

              <section>
                <h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">Danh sách đề thi đã làm:</h2>
                {skillAttempts.length === 0 ? (
                  <p className="text-slate-600 dark:text-slate-300">
                    Chưa có bài thi nào trong khoảng này.{" "}
                    <Link href="/exams" className="font-semibold text-blue-700 hover:underline dark:text-blue-300">
                      Chọn đề thi
                    </Link>
                  </p>
                ) : (
                  <>
                    <AttemptTable rows={skillAttempts.slice(0, 5)} />
                    <button type="button" onClick={() => setShowAll(true)} className="mt-3 text-base font-semibold text-blue-700 hover:underline dark:text-blue-300">
                      Xem tất cả &gt;&gt;
                    </button>
                  </>
                )}
              </section>
              {showAll && <AllAttemptsDialog rows={skillAttempts} title={`Kết quả luyện thi: ${skillName}`} onClose={() => setShowAll(false)} />}
            </>
          )}
        </>
      )}
      <AssessmentSection />
    </div>
  );
}

export default function ToeicStatsPage() {
  const [cert, setCert] = useState<"TOEIC" | "IELTS">("TOEIC");
  return (
    <div className="w-full">
      <div className="border-b border-slate-200 bg-blue-50/60 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto w-full max-w-6xl px-4 pt-8 sm:px-6">
          <h1 className="flex items-center gap-3 text-3xl font-extrabold text-slate-900 sm:text-4xl dark:text-white">
            <BarChart3 size={30} aria-hidden="true" /> Thống kê kết quả luyện thi
          </h1>
          <div className="mt-6 flex gap-1" role="tablist" aria-label="Chứng chỉ">
            {(["TOEIC", "IELTS"] as const).map((c) => (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={cert === c}
                onClick={() => setCert(c)}
                className={`-mb-px min-h-12 border-b-2 px-4 text-base font-semibold ${cert === c ? "border-blue-700 text-blue-700 dark:text-blue-300" : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-300"}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6">
        {cert === "TOEIC" ? (
          <>
            <ToeicTab />
            <p className="mt-8 text-sm text-slate-500 dark:text-slate-400">Điểm là điểm quy đổi luyện tập của BreadTrans, không phải điểm thi chính thức của ETS.</p>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
            <p className="text-xl font-bold text-slate-900 dark:text-white">IELTS — sắp ra mắt</p>
            <p className="mt-2 text-slate-600 dark:text-slate-300">Thống kê IELTS sẽ có khi BreadTrans mở đề luyện IELTS.</p>
          </div>
        )}
      </div>
    </div>
  );
}
