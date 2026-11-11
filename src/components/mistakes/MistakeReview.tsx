"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, Loader2, X } from "lucide-react";

import {
  mistakesService,
  type MistakeAnswerResult,
  type MistakeSkill,
} from "@/lib/api/services/mistakes.service";
import { MISTAKE_SKILL_LABEL, optionLetter } from "@/lib/mistakes/mistakeView";

/**
 * A short review: the learner answers again the questions they got wrong,
 * one at a time. The server checks each answer; two right answers in a row
 * close a mistake. No AI is involved.
 */
export function MistakeReview({ skill, onClose }: { skill?: MistakeSkill; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["mistakes", "review", skill ?? "ALL"],
    queryFn: () => mistakesService.getReview(skill),
    // One fixed set per review: no refetch while the learner is answering.
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [result, setResult] = useState<MistakeAnswerResult | null>(null);
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [score, setScore] = useState({ right: 0, closed: 0 });

  const finish = () => {
    void queryClient.invalidateQueries({ queryKey: ["mistakes"] });
    onClose();
  };

  if (isLoading)
    return (
      <div className="flex min-h-40 items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <Loader2 className="animate-spin text-blue-600" size={28} aria-label="Đang tải câu ôn" />
      </div>
    );
  if (isError || !data)
    return (
      <Panel>
        <p className="text-sm text-rose-800 dark:text-rose-300">Chưa tải được câu ôn. Hãy thử lại sau.</p>
        <CloseButton onClick={onClose} />
      </Panel>
    );

  const items = data.items;
  if (items.length === 0)
    return (
      <Panel>
        <p className="text-sm text-slate-800 dark:text-slate-200">
          Chưa có câu nào để trả lời lại ở đây. Lỗi nghe, nói và viết được ôn bằng cách làm lại bài; nút ở từng thẻ sẽ
          đưa bạn tới đó.
        </p>
        <CloseButton onClick={onClose} />
      </Panel>
    );

  if (index >= items.length)
    return (
      <Panel>
        <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">Xong phiên ôn</h2>
        <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
          Bạn trả lời đúng {score.right}/{items.length} câu. {score.closed} lỗi đã được khắc phục.
        </p>
        <CloseButton onClick={finish} label="Về sổ lỗi" />
      </Panel>
    );

  const item = items[index];
  const send = async () => {
    if (picked === null || sending) return;
    setSending(true);
    setFailed(false);
    try {
      const answer = await mistakesService.answer(item.id, picked);
      setResult(answer);
      setScore((s) => ({
        right: s.right + (answer.correct ? 1 : 0),
        closed: s.closed + (answer.resolved ? 1 : 0),
      }));
    } catch {
      setFailed(true);
    } finally {
      setSending(false);
    }
  };
  const next = () => {
    setIndex((i) => i + 1);
    setPicked(null);
    setResult(null);
  };

  return (
    <section
      aria-labelledby="mistake-review-heading"
      className="rounded-2xl border border-blue-200 bg-white p-5 shadow-xs dark:border-sky-800 dark:bg-slate-900 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="mistake-review-heading" className="text-base font-black text-slate-900 dark:text-slate-100">
          Ôn lỗi · Câu {index + 1}/{items.length}
        </h2>
        <button
          type="button"
          onClick={finish}
          className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <X size={14} strokeWidth={2} aria-hidden="true" /> Dừng ôn
        </button>
      </div>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        {MISTAKE_SKILL_LABEL[item.skill]} · {item.title}
      </p>

      {item.passage && (
        <div className="mt-3 max-h-56 overflow-y-auto whitespace-pre-line rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-800 dark:bg-slate-800/60 dark:text-slate-200">
          {item.passage}
        </div>
      )}
      {item.question && (
        <p className="mt-3 text-base font-bold text-slate-900 dark:text-slate-100">{item.question}</p>
      )}

      <fieldset className="mt-3 space-y-2" disabled={!!result || sending}>
        <legend className="sr-only">Chọn một đáp án</legend>
        {item.options.map((option, i) => {
          const isRight = result?.correctIndex === i;
          const isWrongPick = !!result && !result.correct && result.selectedIndex === i;
          return (
            <label
              key={i}
              className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm transition-colors ${
                isRight
                  ? "border-emerald-400 bg-emerald-50 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100"
                  : isWrongPick
                    ? "border-rose-400 bg-rose-50 text-rose-950 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-100"
                    : picked === i
                      ? "border-blue-500 bg-blue-50 text-slate-900 dark:border-sky-500 dark:bg-sky-950/40 dark:text-slate-100"
                      : "border-slate-200 text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              <input
                type="radio"
                name={`mistake-${item.id}`}
                checked={picked === i}
                onChange={() => setPicked(i)}
                className="size-4 accent-blue-600"
              />
              <span className="font-bold">{optionLetter(i)}.</span>
              <span className="min-w-0 break-words">{option}</span>
              {isRight && <Check size={16} strokeWidth={2} className="ml-auto shrink-0" aria-label="Đáp án đúng" />}
              {isWrongPick && <X size={16} strokeWidth={2} className="ml-auto shrink-0" aria-label="Bạn chọn sai" />}
            </label>
          );
        })}
      </fieldset>

      {failed && (
        <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
          Chưa gửi được câu trả lời. Hãy thử lại.
        </p>
      )}

      {result && (
        <div
          role="status"
          className={`mt-3 rounded-xl p-3 text-sm ${
            result.correct
              ? "bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100"
              : "bg-rose-50 text-rose-950 dark:bg-rose-950/40 dark:text-rose-100"
          }`}
        >
          <p className="font-bold">
            {result.correct
              ? result.resolved
                ? "Đúng. Lỗi này đã được khắc phục."
                : `Đúng. Đúng thêm ${Math.max(1, result.resolveAfterCorrect - result.correctStreak)} lần nữa thì lỗi này được khắc phục.`
              : "Chưa đúng. Câu này ở lại trong sổ."}
          </p>
          {result.explanation && <p className="mt-1 leading-6">{result.explanation}</p>}
        </div>
      )}

      <div className="mt-4">
        {result ? (
          <button
            type="button"
            onClick={next}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            {index + 1 < items.length ? "Câu tiếp theo" : "Xem kết quả"}
            <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={send}
            disabled={picked === null || sending}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
          >
            {sending && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            Trả lời
          </button>
        )}
      </div>
    </section>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      {children}
    </section>
  );
}

function CloseButton({ onClick, label = "Đóng" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 inline-flex min-h-11 cursor-pointer items-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      {label}
    </button>
  );
}
