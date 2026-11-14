"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, Loader2, X } from "lucide-react";

import {
  mistakesService,
  type MistakeAnswerResult,
  type MistakeSkill,
  type MistakeTranslationResult,
} from "@/lib/api/services/mistakes.service";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import { VERDICT_LABEL } from "@/components/writing/sentenceTranslationLogic";
import { MISTAKE_SKILL_LABEL, mistakeSourceTitle, optionLetter } from "@/lib/mistakes/mistakeView";

/**
 * A short review: the learner answers again the questions they got wrong,
 * one at a time. The server checks each answer; two right answers in a row
 * close a mistake. A choice is checked by its key; a "Dịch câu" sentence is
 * typed and graded like the exercise (accepted answers first, the AI only
 * when none matches).
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
  const [typed, setTyped] = useState("");
  const [tResult, setTResult] = useState<MistakeTranslationResult | null>(null);
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
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
          Chưa có câu nào để trả lời lại ở đây. Lỗi nghe, nói và bài viết được ôn bằng cách làm lại bài; nút ở từng thẻ
          sẽ đưa bạn tới đó.
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
  const isTranslation = item.kind === "TRANSLATION";
  const outcome = isTranslation ? tResult : result;
  const send = async () => {
    if (sending || (isTranslation ? !typed.trim() : picked === null)) return;
    setSending(true);
    setFailed(null);
    try {
      const answer = isTranslation
        ? await mistakesService.reviewTranslation(item.id, typed.trim())
        : await mistakesService.answer(item.id, picked as number);
      if (isTranslation) setTResult(answer as MistakeTranslationResult);
      else setResult(answer as MistakeAnswerResult);
      setScore((s) => ({
        right: s.right + (answer.correct ? 1 : 0),
        closed: s.closed + (answer.resolved ? 1 : 0),
      }));
    } catch (error) {
      setFailed(getApiErrorMessage(error, "Chưa gửi được câu trả lời. Hãy thử lại."));
    } finally {
      setSending(false);
    }
  };
  const next = () => {
    setIndex((i) => i + 1);
    setPicked(null);
    setResult(null);
    setTyped("");
    setTResult(null);
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
        {MISTAKE_SKILL_LABEL[item.skill]} · {mistakeSourceTitle(item.skill, item.title, item)}
      </p>

      {item.passage && (
        <div className="mt-3 max-h-56 overflow-y-auto whitespace-pre-line rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-800 dark:bg-slate-800/60 dark:text-slate-200">
          {item.passage}
        </div>
      )}
      {isTranslation && (
        <p className="mt-3 text-[13px] font-semibold text-slate-600 dark:text-slate-400">Dịch sang tiếng Anh</p>
      )}
      {item.question && (
        <p className={`${isTranslation ? "mt-1 text-lg" : "mt-3 text-base"} font-bold text-slate-900 dark:text-slate-100`}>
          {item.question}
        </p>
      )}

      {isTranslation ? (
        <div className="mt-3">
          <label htmlFor={`mistake-translation-${item.id}`} className="sr-only">
            Câu tiếng Anh của bạn
          </label>
          <textarea
            id={`mistake-translation-${item.id}`}
            rows={2}
            lang="en"
            spellCheck={false}
            maxLength={400}
            value={typed}
            readOnly={!!tResult || sending}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || e.shiftKey) return;
              e.preventDefault();
              if (tResult) next();
              else void send();
            }}
            placeholder="Gõ câu tiếng Anh, Enter để kiểm tra"
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-base leading-relaxed text-slate-900 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-900 placeholder:text-slate-500 dark:placeholder:text-slate-400"
          />
        </div>
      ) : (
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
      )}

      {failed && (
        <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
          {failed}
        </p>
      )}

      {outcome && (
        <div
          role="status"
          className={`mt-3 rounded-xl p-3 text-sm ${
            outcome.correct
              ? "bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100"
              : "bg-rose-50 text-rose-950 dark:bg-rose-950/40 dark:text-rose-100"
          }`}
        >
          <p className="font-bold">
            {tResult
              ? `${VERDICT_LABEL[tResult.check.verdict]}. `
              : outcome.correct
                ? "Đúng. "
                : "Chưa đúng. "}
            {outcome.correct
              ? outcome.resolved
                ? "Lỗi này đã được khắc phục."
                : `Đúng thêm ${Math.max(1, outcome.resolveAfterCorrect - outcome.correctStreak)} lần nữa thì lỗi này được khắc phục.`
              : "Câu này ở lại trong sổ."}
          </p>
          {tResult ? (
            <div className="mt-2 space-y-1.5 leading-6">
              <p>
                <span className="font-semibold">Đáp án đúng: </span>
                <span lang="en">{tResult.check.closest}</span>
              </p>
              {tResult.check.explanation && <p>{tResult.check.explanation}</p>}
              {tResult.check.quotaExhausted && (
                <p className="text-amber-900 dark:text-amber-200">
                  Hôm nay đã hết lượt AI chấm, câu này chỉ được so với đáp án mẫu.
                </p>
              )}
            </div>
          ) : (
            result?.explanation && <p className="mt-1 leading-6">{result.explanation}</p>
          )}
        </div>
      )}

      <div className="mt-4">
        {outcome ? (
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
            onClick={() => void send()}
            disabled={(isTranslation ? !typed.trim() : picked === null) || sending}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
          >
            {sending && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            {isTranslation ? "Kiểm tra" : "Trả lời"}
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
