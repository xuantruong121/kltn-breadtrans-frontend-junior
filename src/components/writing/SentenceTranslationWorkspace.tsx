"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Loader2,
  MousePointerClick,
  RotateCcw,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import { ReportIssueButton } from "@/components/issue-report/ReportIssueButton";
import {
  writingService,
  type TranslationCheck,
  type WritingExerciseSummary,
  type WritingExerciseTask,
} from "@/lib/api/services/writing.service";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import { dependsOnLevel } from "@/lib/learning-path/levelLock";
import {
  enterAction,
  isChecked,
  isRight,
  nextUnchecked,
  sentenceStatus,
  sentencesToRedo,
  translationTally,
  VERDICT_LABEL,
  type SentenceStatus,
} from "./sentenceTranslationLogic";

const VERDICT_TONE: Record<Exclude<SentenceStatus, "NONE">, string> = {
  CORRECT: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200",
  MINOR: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200",
  WRONG: "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200",
  UNMATCHED: "border-slate-300 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100",
};

function markClass(status: SentenceStatus) {
  if (status === "NONE") return "border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-400";
  if (status === "CORRECT") return "border-emerald-500 bg-emerald-500 text-white";
  if (status === "MINOR") return "border-amber-500 bg-amber-500 text-white";
  return "border-rose-500 bg-rose-500 text-white";
}

/** Explanation column: the right answer, other answers, the AI note and the grammar tip. */
function TranslationSupport({ check }: { check: TranslationCheck }) {
  return (
    <div className="space-y-4">
      <section>
        <h3 className="text-[15px] font-semibold text-slate-700 dark:text-slate-300">Đáp án đúng</h3>
        <p className="mt-1.5 text-[17px] leading-relaxed text-slate-900 dark:text-slate-100" lang="en">
          {check.diff
            ? check.diff.reference.map((w, i) => (
                <span key={i}>
                  {i > 0 && " "}
                  <span className={w.ok ? "" : "rounded bg-emerald-100 px-0.5 font-semibold text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-200"}>
                    {w.text}
                  </span>
                </span>
              ))
            : check.closest}
        </p>
      </section>
      {check.otherAnswers.length > 0 && (
        <section>
          <h3 className="text-[15px] font-semibold text-slate-700 dark:text-slate-300">Cách dịch khác</h3>
          <ul className="mt-1.5 space-y-1 text-base leading-relaxed text-slate-800 dark:text-slate-200" lang="en">
            {check.otherAnswers.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </section>
      )}
      {check.correctedSentence && check.verdict !== "CORRECT" && check.correctedSentence !== check.closest && (
        <section>
          <h3 className="text-[15px] font-semibold text-slate-700 dark:text-slate-300">Câu của bạn sau khi sửa</h3>
          <p className="mt-1.5 text-base leading-relaxed text-slate-900 dark:text-slate-100" lang="en">
            {check.correctedSentence}
          </p>
        </section>
      )}
      {check.explanation && (
        <section>
          <h3 className="text-[15px] font-semibold text-slate-700 dark:text-slate-300">Giải thích</h3>
          <p className="mt-1.5 text-base leading-relaxed text-slate-800 dark:text-slate-200">{check.explanation}</p>
        </section>
      )}
      {check.grammarTip && (
        <p className="rounded-lg bg-amber-50 px-3.5 py-3 text-base leading-relaxed text-slate-800 dark:bg-amber-950/30 dark:text-slate-200">
          <span className="font-semibold text-amber-900 dark:text-amber-300">Lưu ý ngữ pháp: </span>
          {check.grammarTip}
        </p>
      )}
    </div>
  );
}

/**
 * "Dịch câu" workspace (owner 2026-11-14): one screen in three columns like
 * the grammar practice. Left: the sentences with their marks. Centre: one
 * Vietnamese sentence, the English answer, Enter to check and Enter again to
 * move on. Right: the right answer and why, once checked.
 */
export function SentenceTranslationWorkspace({
  quizId,
  title,
  tasks,
  initialTaskId,
}: {
  quizId: number;
  title: string;
  tasks: WritingExerciseTask[];
  initialTaskId: number | null;
}) {
  const queryClient = useQueryClient();
  const [index, setIndex] = useState(() =>
    Math.max(0, tasks.findIndex((t) => t.id === initialTaskId)),
  );
  const [checks, setChecks] = useState<Record<number, TranslationCheck>>({});
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [hintsOpen, setHintsOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [summary, setSummary] = useState<WritingExerciseSummary | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const task = tasks[index];
  const check = checks[task.id];
  const answer = drafts[task.id] ?? "";
  const statuses = useMemo(
    () => tasks.map((t) => sentenceStatus(t, checks[t.id])),
    [tasks, checks],
  );
  const tally = translationTally(statuses);
  const redo = sentencesToRedo(statuses);

  useEffect(() => {
    inputRef.current?.focus();
  }, [index]);

  const goTo = (i: number) => {
    setIndex(i);
    setHintsOpen(false);
  };

  const runCheck = async () => {
    if (pending || check || !answer.trim()) return;
    setPending(true);
    try {
      const result = await writingService.translateSentence(quizId, task.id, answer.trim(), crypto.randomUUID());
      setChecks((prev) => ({ ...prev, [task.id]: result }));
      setSummary(result.exercise);
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["writing-topics"] }),
        queryClient.invalidateQueries({ queryKey: ["writing-topic", quizId] }),
        queryClient.invalidateQueries({ predicate: (q) => dependsOnLevel(q.queryKey) }),
      ]);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Chưa kiểm tra được câu này, hãy thử lại."));
    } finally {
      setPending(false);
    }
  };

  const goNext = () => {
    const next = nextUnchecked(statuses, index);
    goTo(next ?? Math.min(index + 1, tasks.length - 1));
  };

  const retry = (i: number) => {
    const id = tasks[i].id;
    setChecks((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    setDrafts((prev) => ({ ...prev, [id]: "" }));
    goTo(i);
  };

  const retryWrong = () => {
    if (redo.length === 0) return;
    setChecks((prev) => {
      const copy = { ...prev };
      for (const i of redo) delete copy[tasks[i].id];
      return copy;
    });
    setDrafts((prev) => {
      const copy = { ...prev };
      for (const i of redo) copy[tasks[i].id] = "";
      return copy;
    });
    goTo(redo[0]);
  };

  // A sentence graded in an earlier visit shows its mark but no answer to compare.
  const checkedEarlier = !check && isChecked(statuses[index]);

  return (
    <div className="flex flex-1 flex-col lg:min-h-0" data-testid="translation-workspace">
      <div className="flex flex-1 lg:min-h-0">
        {/* Left: the sentences */}
        <aside
          aria-label="Danh sách câu"
          className="hidden w-72 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex lg:min-h-0 xl:w-80 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="border-b border-slate-200 p-5 dark:border-slate-800">
            <h2 className="text-base font-bold leading-snug text-slate-900 dark:text-slate-100">{title}</h2>
            <div
              className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
              role="progressbar"
              aria-label="Tiến độ"
              aria-valuenow={tally.answered}
              aria-valuemin={0}
              aria-valuemax={tally.total}
            >
              <div className="h-full rounded-full bg-blue-600" style={{ width: `${(tally.answered / tally.total) * 100}%` }} />
            </div>
            <p className="mt-2 text-[15px] text-slate-700 dark:text-slate-300">
              {tally.answered}/{tally.total} câu
              <span className="ml-2 font-semibold text-emerald-700 dark:text-emerald-400">đúng {tally.correct}</span>
              <span className="ml-2 font-semibold text-rose-700 dark:text-rose-400">chưa đúng {tally.wrong}</span>
            </p>
          </div>
          <nav aria-label="Các câu" className="min-h-0 flex-1 overflow-y-auto p-2">
            <ol className="space-y-0.5">
              {tasks.map((t, i) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => goTo(i)}
                    aria-current={i === index ? "step" : undefined}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer ${
                      i === index
                        ? "bg-blue-50 text-slate-900 dark:bg-blue-950/40 dark:text-slate-100"
                        : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <span
                      className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-[13px] font-bold tabular-nums ${markClass(statuses[i])}`}
                      aria-hidden="true"
                    >
                      {i + 1}
                    </span>
                    <span className={`min-w-0 flex-1 truncate text-[15px] ${i === index ? "font-semibold" : ""}`}>{t.prompt}</span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>
          {redo.length > 0 && (
            <div className="border-t border-slate-200 p-3 dark:border-slate-800">
              <button
                type="button"
                onClick={retryWrong}
                className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 text-[15px] font-semibold text-rose-800 transition-colors hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-950/50 cursor-pointer"
              >
                <RotateCcw size={15} aria-hidden="true" />
                Làm lại câu chưa đúng ({redo.length})
              </button>
            </div>
          )}
        </aside>

        {/* Centre: one sentence */}
        <main className="flex-1 bg-slate-50 lg:min-h-0 lg:overflow-y-auto dark:bg-slate-950" aria-label="Câu hiện tại">
          <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6 lg:px-8">
            {summary?.complete && summary.percent !== null && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                <p className="text-base font-semibold text-emerald-900 dark:text-emerald-200">
                  Đã xong bài: {tally.correct}/{tally.total} câu đúng · điểm bài {summary.percent}%
                </p>
                {redo.length > 0 && (
                  <button
                    type="button"
                    onClick={retryWrong}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 text-[15px] font-semibold text-rose-800 hover:bg-rose-50 dark:border-rose-900/60 dark:bg-slate-900 dark:text-rose-300 cursor-pointer"
                  >
                    <RotateCcw size={15} aria-hidden="true" />
                    Làm lại câu chưa đúng
                  </button>
                )}
              </div>
            )}

            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="rounded-full bg-white px-3 py-1 text-[15px] font-semibold text-slate-800 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800">
                Câu {index + 1}/{tasks.length}
              </span>
              <span className="hidden text-[15px] text-slate-600 sm:inline dark:text-slate-400">
                {check ? "Enter để sang câu tiếp" : "Enter để kiểm tra · Shift+Enter xuống dòng"}
              </span>
            </div>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-[15px] font-semibold text-slate-600 dark:text-slate-400">Dịch câu này sang tiếng Anh</p>
              <p className="mt-1.5 text-[22px] font-semibold leading-snug text-slate-900 dark:text-slate-100">{task.prompt}</p>

              {(task.hints?.length ?? 0) > 0 && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setHintsOpen((open) => !open)}
                    aria-expanded={hintsOpen}
                    aria-controls="translation-hints"
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[15px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Lightbulb size={16} aria-hidden="true" />
                    {hintsOpen ? "Ẩn gợi ý" : "Gợi ý từ vựng"}
                  </button>
                  {hintsOpen && (
                    <ul id="translation-hints" className="mt-2.5 flex flex-wrap gap-2">
                      {task.hints!.map((hint) => (
                        <li
                          key={`${hint.vi}-${hint.en}`}
                          className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-base text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200"
                        >
                          {hint.vi} <span aria-hidden="true">→</span>{" "}
                          <span className="font-semibold" lang="en">
                            {hint.en}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <label htmlFor="translation-answer" className="mt-5 block text-[15px] font-semibold text-slate-700 dark:text-slate-300">
                Câu tiếng Anh của bạn
              </label>
              <textarea
                id="translation-answer"
                ref={inputRef}
                rows={2}
                lang="en"
                spellCheck={false}
                value={check ? check.answer : answer}
                readOnly={Boolean(check) || pending}
                maxLength={400}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [task.id]: e.target.value }))}
                onKeyDown={(e) => {
                  const action = enterAction(e.key, e.shiftKey, Boolean(check), answer);
                  if (!action) return;
                  e.preventDefault();
                  if (action === "check") void runCheck();
                  else goNext();
                }}
                placeholder="Gõ câu tiếng Anh..."
                className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-4 text-lg leading-relaxed text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white read-only:cursor-default dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-900 placeholder:text-slate-500 dark:placeholder:text-slate-400"
              />

              {check && (
                <div aria-live="polite" className={`mt-4 rounded-xl border p-4 ${VERDICT_TONE[check.verdict]}`}>
                  <p className="flex items-center gap-2 text-base font-bold">
                    {isRight(check.verdict) ? (
                      <Check size={18} strokeWidth={2.5} aria-hidden="true" />
                    ) : (
                      <X size={18} strokeWidth={2.5} aria-hidden="true" />
                    )}
                    {VERDICT_LABEL[check.verdict]}
                    <span className="ml-auto tabular-nums">
                      {check.score}/{check.maxScore}
                    </span>
                  </p>
                  {check.diff && (
                    <p className="mt-2 text-[17px] leading-relaxed" lang="en">
                      {check.diff.answer.map((w, i) => (
                        <span key={i}>
                          {i > 0 && " "}
                          <span className={w.ok ? "" : "font-semibold underline decoration-rose-500 decoration-2 underline-offset-4"}>{w.text}</span>
                        </span>
                      ))}
                    </p>
                  )}
                  {check.typo && (
                    <p className="mt-1.5 text-[15px]">
                      Sai chính tả: <span className="font-semibold" lang="en">{check.typo.typed}</span> →{" "}
                      <span className="font-semibold" lang="en">{check.typo.expected}</span>
                    </p>
                  )}
                  {check.quotaExhausted && (
                    <p className="mt-1.5 text-[15px]">Hôm nay đã hết lượt AI chấm, câu này chỉ được so với đáp án mẫu.</p>
                  )}
                </div>
              )}
              {checkedEarlier && (
                <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-[15px] text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                  Bạn đã làm câu này lần trước: {VERDICT_LABEL[statuses[index] as Exclude<SentenceStatus, "NONE">]}. Gõ lại câu dịch để kiểm tra lần nữa.
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                {check ? (
                  <>
                    <button
                      key="retry"
                      type="button"
                      onClick={() => retry(index)}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-300 px-4 text-base font-semibold text-slate-800 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <RotateCcw size={16} aria-hidden="true" />
                      Làm lại câu này
                    </button>
                    {nextUnchecked(statuses, index) !== null && (
                      <button
                        key="next"
                        type="button"
                        onClick={goNext}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-blue-600 px-5 text-base font-semibold text-white transition-colors hover:bg-blue-700 cursor-pointer"
                      >
                        Câu tiếp theo
                        <ChevronRight size={18} aria-hidden="true" />
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    key="check"
                    type="button"
                    onClick={() => void runCheck()}
                    disabled={pending || !answer.trim()}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-base font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                  >
                    {pending ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Check size={18} aria-hidden="true" />}
                    {pending ? "Đang kiểm tra..." : "Kiểm tra"}
                  </button>
                )}
              </div>
            </article>

            {/* Phone: the explanation sits under the sentence. */}
            {check && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 md:hidden dark:border-slate-800 dark:bg-slate-900">
                <TranslationSupport check={check} />
              </div>
            )}
          </div>
        </main>

        {/* Right: the explanation once the sentence is checked */}
        <aside
          aria-label="Giải thích"
          className="hidden w-80 shrink-0 flex-col border-l border-slate-200 bg-white md:flex lg:min-h-0 lg:overflow-y-auto xl:w-96 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex flex-1 flex-col p-5">
            {check ? (
              <TranslationSupport check={check} />
            ) : (
              <div className="flex min-h-48 flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
                <MousePointerClick size={28} strokeWidth={1.75} className="text-slate-400" aria-hidden="true" />
                <p className="max-w-xs text-base leading-relaxed text-slate-600 dark:text-slate-400">
                  Dịch xong bấm &quot;Kiểm tra&quot; để xem đáp án đúng và giải thích.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>

      <footer
        aria-label="Chuyển câu"
        className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-2.5 sm:px-5 dark:border-slate-800 dark:bg-slate-900"
      >
        <ReportIssueButton
          labelFromSm
          area="WRITING"
          context={{
            route: typeof window !== "undefined" ? window.location.pathname + window.location.search : undefined,
            sourceType: "WRITING_TASK",
            sourceId: task.id,
            context: { quizId, exercise: title, sentence: task.prompt },
          }}
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => goTo(index - 1)}
            aria-label="Câu trước"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-300 px-3.5 text-[15px] font-semibold text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
          >
            <ChevronLeft size={18} aria-hidden="true" />
            <span className="hidden sm:inline">Câu trước</span>
          </button>
          <span className="min-w-14 text-center text-[15px] font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {index + 1}/{tasks.length}
          </span>
          <button
            type="button"
            disabled={index >= tasks.length - 1}
            onClick={() => goTo(index + 1)}
            aria-label="Câu tiếp"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          >
            <span className="hidden sm:inline">Câu tiếp</span>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      </footer>
    </div>
  );
}
