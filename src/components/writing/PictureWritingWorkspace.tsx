"use client";

import { ArrowRight, CheckCircle2, ImageOff, Loader2 } from "lucide-react";
import { useState } from "react";

import type {
  WritingEvaluation,
  WritingExerciseTask,
} from "@/lib/api/services/writing.service";
import { practiceDetailOf } from "@/lib/api/services/writing.service";
import { PICTURE_MAX_WORDS } from "@/lib/writing/pictureWriting";

/**
 * "Viết câu theo tranh" workspace: picture and cue words on the left;
 * instructions, editor, word count, grading and the result on the right.
 */
export function PictureWritingWorkspace({
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

  return (
    <div className="grid grid-cols-12 gap-6 items-start">
      {/* Picture and cue words */}
      <section
        aria-label="Tranh và từ gợi ý"
        className="col-span-12 lg:col-span-6 lg:sticky lg:top-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
            {exerciseLabel}
          </p>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Tranh {task.position}/{tasks.length}
          </p>
        </div>
        {task.imageUrl && imageFailed !== task.imageUrl ? (
          <img
            key={task.imageUrl}
            src={task.imageUrl}
            alt={`Tranh ${task.position} để viết câu với từ gợi ý ${task.keywords.join(" và ")}`}
            onError={() => setImageFailed(task.imageUrl)}
            className="aspect-[4/3] w-full rounded-xl object-cover"
          />
        ) : (
          <div
            role="img"
            aria-label="Tranh chưa tải được"
            className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800"
          >
            <ImageOff size={22} strokeWidth={2} aria-hidden="true" />
            Tranh chưa tải được. Hãy tải lại trang.
          </div>
        )}
        <div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Từ gợi ý
          </p>
          <div className="mt-2 flex flex-wrap gap-2" lang="en">
            {task.keywords.map((keyword) => (
              <span
                key={keyword}
                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-base font-semibold text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
        {tasks.length > 1 && (
          <nav aria-label="Các tranh trong bài" className="flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            {tasks.map((t) => {
              const active = t.id === task.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-current={active ? "step" : undefined}
                  onClick={() => onSelectTask(t.id)}
                  className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold transition-colors cursor-pointer ${
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

      {/* Instructions, editor and result */}
      <section aria-label="Bài viết của bạn" className="col-span-12 lg:col-span-6 space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Hướng dẫn
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {task.prompt}
            </p>
            {task.requirements.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-400">
                {task.requirements.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <label htmlFor="picture-answer" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Câu trả lời
            </label>
            <textarea
              id="picture-answer"
              rows={6}
              lang="en"
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              placeholder={`Viết câu tiếng Anh dùng "${task.keywords.join('" và "')}"`}
              aria-describedby="picture-word-count"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-base leading-relaxed text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-900"
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <span
                id="picture-word-count"
                aria-live="polite"
                className={`text-sm font-semibold tabular-nums ${tooLong ? "text-rose-600" : "text-slate-600 dark:text-slate-400"}`}
              >
                {wordCount}/{PICTURE_MAX_WORDS} từ
                {tooLong ? ` · vượt ${wordCount - PICTURE_MAX_WORDS} từ` : ""}
              </span>
              <button
                type="button"
                onClick={onEvaluate}
                disabled={isEvaluating || wordCount === 0 || tooLong}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                {isEvaluating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                    Đang chấm...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} strokeWidth={2} aria-hidden="true" />
                    Chấm bài
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {result && (
          <div
            aria-live="polite"
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Kết quả
              </h2>
              <span className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {result.score}/{result.maxScore}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {result.feedback}
            </p>
            {detail && (
              <>
                <ul className="space-y-2">
                  {detail.criteria.map((c) => (
                    <li key={c.key} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                      <p className="flex justify-between text-sm font-semibold text-slate-800 dark:text-slate-200">
                        <span>{c.label}</span>
                        <span className="tabular-nums">
                          {c.score}/{c.max}
                        </span>
                      </p>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{c.comment}</p>
                    </li>
                  ))}
                </ul>
                {detail.keywords.length > 0 && (
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    Từ gợi ý:{" "}
                    {detail.keywords.map((k) => `${k.keyword} ${k.present ? "(đã dùng)" : "(chưa dùng)"}`).join(", ")}
                  </p>
                )}
                {detail.linking && (
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    Câu nối hai ý:{" "}
                    {detail.linking.found
                      ? `có từ nối "${detail.linking.found}"`
                      : "chưa có từ nối"}
                    {detail.linking.sentences > 1
                      ? ` · bài có ${detail.linking.sentences} câu, yêu cầu một câu`
                      : ""}
                  </p>
                )}
                {detail.corrections.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Sửa lỗi</p>
                    <ul className="mt-1 space-y-1.5 text-sm">
                      {detail.corrections.map((c) => (
                        <li key={`${c.original}-${c.corrected}`} className="text-slate-700 dark:text-slate-300">
                          <span className="line-through text-rose-600" lang="en">{c.original}</span>{" "}
                          <ArrowRight size={12} className="inline" aria-hidden="true" />{" "}
                          <span className="font-semibold text-emerald-700" lang="en">{c.corrected}</span>
                          <span className="block text-slate-500 dark:text-slate-400">{c.explanation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
            {result.suggestions.length > 0 && (
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-400">
                {result.suggestions.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            )}
            {result.exercise && (
              <p className="text-sm text-slate-600 dark:text-slate-400">
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
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300 cursor-pointer"
              >
                Tranh tiếp theo
                <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
