"use client";

import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ImageOff,
  Loader2,
  MousePointerClick,
} from "lucide-react";
import { useState } from "react";

import { ReportIssueButton } from "@/components/issue-report/ReportIssueButton";
import type {
  WritingEvaluation,
  WritingExerciseTask,
} from "@/lib/api/services/writing.service";
import { practiceDetailOf } from "@/lib/api/services/writing.service";
import { PICTURE_MAX_WORDS } from "@/lib/writing/pictureWriting";

const CARD =
  "flex flex-col rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:min-h-0 lg:overflow-y-auto";

/**
 * "Viết câu theo tranh" workspace, one screen in three columns (owner
 * 2026-11-14): picture and cue words; instructions and the editor; the
 * result. A footer moves between the pictures.
 */
export function PictureWritingWorkspace({
  quizId,
  task,
  tasks,
  exerciseLabel,
  content,
  onContentChange,
  wordCount,
  isEvaluating,
  onEvaluate,
  result,
  onSelectTask,
  nextTaskId,
}: {
  quizId: number;
  task: WritingExerciseTask;
  tasks: WritingExerciseTask[];
  exerciseLabel: string;
  content: string;
  onContentChange: (value: string) => void;
  wordCount: number;
  isEvaluating: boolean;
  onEvaluate: () => void;
  result: WritingEvaluation | null;
  onSelectTask: (questionId: number) => void;
  nextTaskId: number | null;
}) {
  const [imageFailed, setImageFailed] = useState<string | null>(null);
  const tooLong = wordCount > PICTURE_MAX_WORDS;
  const detail = practiceDetailOf(result);
  const index = Math.max(
    0,
    tasks.findIndex((t) => t.id === task.id),
  );

  return (
    <div className="flex flex-1 flex-col lg:min-h-0">
      <div className="grid flex-1 grid-cols-1 gap-4 p-4 lg:min-h-0 lg:grid-cols-3 lg:p-5">
        {/* Picture and cue words */}
        <section aria-label="Tranh và từ gợi ý" className={`${CARD} gap-4`}>
          <div className="flex items-baseline justify-between gap-3">
            <p className="min-w-0 truncate text-[15px] font-semibold text-slate-600 dark:text-slate-400">
              {exerciseLabel}
            </p>
            <p className="shrink-0 text-base font-bold tabular-nums text-slate-900 dark:text-slate-100">
              Tranh {task.position}/{tasks.length}
            </p>
          </div>
          {task.imageUrl && imageFailed !== task.imageUrl ? (
            <img
              key={task.imageUrl}
              src={task.imageUrl}
              alt={`Tranh ${task.position} để viết câu với từ gợi ý ${task.keywords.join(" và ")}`}
              onError={() => setImageFailed(task.imageUrl)}
              className="aspect-[4/3] w-full shrink-0 rounded-xl object-cover"
            />
          ) : (
            <div
              role="img"
              aria-label="Tranh chưa tải được"
              className="flex aspect-[4/3] w-full shrink-0 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-base text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
            >
              <ImageOff size={24} strokeWidth={2} aria-hidden="true" />
              Tranh chưa tải được. Hãy tải lại trang.
            </div>
          )}
          <div>
            <p className="text-[15px] font-semibold text-slate-700 dark:text-slate-300">Từ gợi ý</p>
            <div className="mt-2 flex flex-wrap gap-2" lang="en">
              {task.keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-[17px] font-semibold text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
          {tasks.length > 1 && (
            <nav
              aria-label="Các tranh trong bài"
              className="flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800"
            >
              {tasks.map((t) => {
                const active = t.id === task.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-current={active ? "step" : undefined}
                    onClick={() => onSelectTask(t.id)}
                    className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-3 text-[15px] font-semibold transition-colors cursor-pointer ${
                      active
                        ? "border-blue-600 bg-blue-600 text-white"
                        : t.latest
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    }`}
                  >
                    Tranh {t.position}
                    {t.latest && (
                      <span className="tabular-nums opacity-90">
                        {t.latest.score}/{t.latest.maxScore}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          )}
        </section>

        {/* Instructions and the editor */}
        <section aria-label="Bài viết của bạn" className={`${CARD} gap-4`}>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Hướng dẫn</h2>
            <p className="mt-1.5 text-[17px] leading-relaxed text-slate-800 dark:text-slate-200">{task.prompt}</p>
            {task.requirements.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-base leading-relaxed text-slate-700 dark:text-slate-300">
                {task.requirements.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex flex-1 flex-col">
            <label htmlFor="picture-answer" className="text-[15px] font-semibold text-slate-700 dark:text-slate-300">
              Câu trả lời
            </label>
            <textarea
              id="picture-answer"
              rows={5}
              lang="en"
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              placeholder={`Viết câu tiếng Anh dùng "${task.keywords.join('" và "')}"`}
              aria-describedby="picture-word-count"
              className="mt-2 min-h-40 w-full flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 p-4 text-[17px] leading-relaxed text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-900"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <span
                id="picture-word-count"
                aria-live="polite"
                className={`text-[15px] font-semibold tabular-nums ${tooLong ? "text-rose-700 dark:text-rose-400" : "text-slate-600 dark:text-slate-400"}`}
              >
                {wordCount}/{PICTURE_MAX_WORDS} từ
                {tooLong ? ` · vượt ${wordCount - PICTURE_MAX_WORDS} từ` : ""}
              </span>
              <button
                type="button"
                onClick={onEvaluate}
                disabled={isEvaluating || wordCount === 0 || tooLong}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-base font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                {isEvaluating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                    Đang chấm...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} strokeWidth={2} aria-hidden="true" />
                    Chấm bài
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* The result: a hint until the picture is graded */}
        <section aria-label="Kết quả" aria-live="polite" className={`${CARD} gap-4`}>
          {result ? (
            <>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Kết quả</h2>
                <span className="text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                  {result.score}/{result.maxScore}
                </span>
              </div>
              <p className="text-base leading-relaxed text-slate-800 dark:text-slate-200">{result.feedback}</p>
              {detail && (
                <>
                  <ul className="space-y-2">
                    {detail.criteria.map((c) => (
                      <li key={c.key} className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60">
                        <p className="flex justify-between text-base font-semibold text-slate-900 dark:text-slate-100">
                          <span>{c.label}</span>
                          <span className="tabular-nums">
                            {c.score}/{c.max}
                          </span>
                        </p>
                        <p className="mt-1 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">{c.comment}</p>
                      </li>
                    ))}
                  </ul>
                  {detail.keywords.length > 0 && (
                    <p className="text-[15px] text-slate-700 dark:text-slate-300">
                      Từ gợi ý:{" "}
                      {detail.keywords.map((k) => `${k.keyword} ${k.present ? "(đã dùng)" : "(chưa dùng)"}`).join(", ")}
                    </p>
                  )}
                  {detail.scoreAdjustment && (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[15px] text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                      Câu trả lời không mô tả nội dung bức tranh nên điểm tối đa là{" "}
                      {detail.scoreAdjustment.cap}/{result.maxScore}.
                    </p>
                  )}
                  {detail.linking && (
                    <p className="text-[15px] text-slate-700 dark:text-slate-300">
                      Câu nối hai ý:{" "}
                      {detail.linking.found ? `có từ nối "${detail.linking.found}"` : "chưa có từ nối"}
                      {detail.linking.sentences > 1
                        ? ` · bài có ${detail.linking.sentences} câu, yêu cầu một câu`
                        : ""}
                    </p>
                  )}
                  {detail.corrections.length > 0 && (
                    <div>
                      <p className="text-base font-semibold text-slate-900 dark:text-slate-100">Sửa lỗi</p>
                      <ul className="mt-1.5 space-y-2 text-base">
                        {detail.corrections.map((c) => (
                          <li key={`${c.original}-${c.corrected}`} className="text-slate-800 dark:text-slate-200">
                            <span className="line-through text-rose-700 dark:text-rose-400" lang="en">
                              {c.original}
                            </span>{" "}
                            <ArrowRight size={14} className="inline" aria-hidden="true" />{" "}
                            <span className="font-semibold text-emerald-700 dark:text-emerald-400" lang="en">
                              {c.corrected}
                            </span>
                            <span className="block text-[15px] text-slate-600 dark:text-slate-400">{c.explanation}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
              {result.suggestions.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
                  {result.suggestions.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              )}
              {result.exercise && (
                <p className="text-[15px] text-slate-700 dark:text-slate-300">
                  Đã chấm {result.exercise.answered}/{result.exercise.total} tranh
                  {result.exercise.complete && result.exercise.percent !== null
                    ? ` · hoàn thành bài, điểm ${result.exercise.percent}%`
                    : ""}
                </p>
              )}
              {nextTaskId !== null && (
                <button
                  type="button"
                  onClick={() => onSelectTask(nextTaskId)}
                  className="inline-flex min-h-11 items-center gap-2 self-start rounded-xl border border-blue-200 bg-blue-50 px-4 text-base font-semibold text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300 cursor-pointer"
                >
                  Tranh tiếp theo
                  <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
                </button>
              )}
            </>
          ) : (
            <div className="flex min-h-40 flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
              <MousePointerClick size={28} strokeWidth={1.75} className="text-slate-400" aria-hidden="true" />
              <p className="max-w-xs text-base leading-relaxed text-slate-600 dark:text-slate-400">
                Viết câu rồi bấm &quot;Chấm bài&quot; để xem điểm, nhận xét và lỗi cần sửa.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Footer: always in view on a wide screen */}
      <footer
        aria-label="Chuyển tranh"
        className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-2.5 sm:px-5 dark:border-slate-800 dark:bg-slate-900"
      >
        <ReportIssueButton
          labelFromSm
          area="WRITING"
          context={{
            route: typeof window !== "undefined" ? window.location.pathname + window.location.search : undefined,
            sourceType: "WRITING_TASK",
            sourceId: task.id,
            context: { quizId, exercise: exerciseLabel, keywords: task.keywords },
          }}
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => onSelectTask(tasks[index - 1].id)}
            aria-label="Tranh trước"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-300 px-3.5 text-[15px] font-semibold text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
          >
            <ChevronLeft size={18} aria-hidden="true" />
            <span className="hidden sm:inline">Tranh trước</span>
          </button>
          <span className="min-w-16 text-center text-[15px] font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {index + 1}/{tasks.length}
          </span>
          <button
            type="button"
            disabled={index >= tasks.length - 1}
            onClick={() => onSelectTask(tasks[index + 1].id)}
            aria-label="Tranh tiếp"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          >
            <span className="hidden sm:inline">Tranh tiếp</span>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      </footer>
    </div>
  );
}
