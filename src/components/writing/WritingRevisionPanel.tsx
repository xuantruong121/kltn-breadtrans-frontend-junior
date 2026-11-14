"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, Loader2, PencilLine, X } from "lucide-react";
import toast from "react-hot-toast";

import { writingService, type WritingRevisionView } from "@/lib/api/services/writing.service";
import { diffCounts, wordDiff } from "@/lib/writing/wordDiff";

const attemptLabel = (number: number) => (number === 0 ? "Bản gốc" : `Bản sửa ${number}`);
const countWords = (text: string) => (text.trim() ? text.trim().split(/\s+/u).length : 0);

/**
 * Guided rewrite on a graded Writing practice answer: the chain of texts, the
 * comparison with the text before, and the editor for one more revision (the
 * server allows two per first submission and gives no reward for them).
 */
export function WritingRevisionPanel({
  submissionId,
  revision,
  answer,
  wordRange,
}: {
  submissionId: number;
  revision: WritingRevisionView;
  answer: string;
  wordRange: [number, number] | null;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(answer);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // One id per text: a retry of the same text is the same request.
  const attempt = useRef<{ id: string; text: string } | null>(null);

  const comparison = revision.comparison;
  const diff = useMemo(
    () => (comparison ? wordDiff(comparison.previousAnswer, answer) : []),
    [comparison, answer],
  );
  const changed = diffCounts(diff);
  const unchanged = text.trim().replace(/\s+/g, " ") === answer.trim().replace(/\s+/g, " ");
  const words = countWords(text);
  const latest = revision.chain[revision.chain.length - 1];

  const submit = async () => {
    const value = text.trim();
    if (!value || unchanged || sending) return;
    if (attempt.current?.text !== value) attempt.current = { id: crypto.randomUUID(), text: value };
    setSending(true);
    setError(null);
    try {
      const result = await writingService.revise(submissionId, value, attempt.current.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["submission-analytics"] }),
        queryClient.invalidateQueries({ queryKey: ["learning-history"] }),
      ]);
      toast.success("Đã chấm xong bản sửa.");
      router.push(`/writing/submissions/${result.submissionId}`);
    } catch (err) {
      const response = (err as { response?: { status?: number; data?: { message?: unknown } } }).response;
      const message = response?.data?.message;
      setError(
        typeof message === "string" && response?.status !== 500
          ? message
          : "Chưa chấm được bản sửa. Bài viết của bạn vẫn còn, hãy thử gửi lại.",
      );
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      {revision.used > 0 && (
        <nav aria-label="Các bản của bài viết này" className="flex flex-wrap gap-2">
          {revision.chain.map((item) =>
            item.submissionId === submissionId ? (
              <span
                key={item.submissionId}
                aria-current="page"
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-bold text-white dark:bg-slate-100 dark:text-slate-900"
              >
                {attemptLabel(item.number)} · {item.score}/{item.maxScore}
              </span>
            ) : (
              <Link
                key={item.submissionId}
                href={`/writing/submissions/${item.submissionId}`}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {attemptLabel(item.number)} · {item.score}/{item.maxScore}
              </Link>
            ),
          )}
        </nav>
      )}

      {comparison && (
        <section aria-labelledby="revision-compare" className="space-y-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="revision-compare" className="text-sm font-bold text-slate-900 dark:text-slate-100">
              So với {attemptLabel(revision.number - 1).toLowerCase()}
            </h2>
            <p className="text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {comparison.scoreBefore}/{comparison.maxScore}
              <ArrowRight size={14} className="mx-1.5 inline align-[-2px] text-slate-500" aria-hidden="true" />
              <span className="sr-only">thành</span>
              {comparison.scoreAfter}/{comparison.maxScore}
              <ScoreDelta before={comparison.scoreBefore} after={comparison.scoreAfter} />
            </p>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[13px] font-semibold text-slate-500 dark:text-slate-400">
                <th scope="col" className="py-1.5 font-bold">Tiêu chí</th>
                <th scope="col" className="py-1.5 text-right font-bold">Trước</th>
                <th scope="col" className="py-1.5 text-right font-bold">Sau</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {comparison.criteria.map((c) => (
                <tr key={c.key}>
                  <th scope="row" className="py-2 text-left font-semibold text-slate-800 dark:text-slate-200">
                    {c.label}
                  </th>
                  <td className="py-2 text-right tabular-nums text-slate-700 dark:text-slate-300">
                    {c.before === null ? "—" : `${c.before}/${c.max}`}
                  </td>
                  <td className="py-2 text-right font-bold tabular-nums text-slate-900 dark:text-slate-100">
                    {c.after}/{c.max}
                    {c.before !== null && <ScoreDelta before={c.before} after={c.after} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Chỗ bạn đã đổi</h3>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
              Bỏ {changed.removed} từ, thêm {changed.added} từ.
            </p>
            <p className="mt-2 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm leading-7 text-slate-800 dark:bg-slate-800/60 dark:text-slate-200">
              {diff.map((part, index) =>
                part.kind === "same" ? (
                  <span key={index}>{part.text} </span>
                ) : part.kind === "removed" ? (
                  <span key={index}>
                    <del className="rounded bg-rose-100 px-1 text-rose-800 decoration-rose-500 dark:bg-rose-950/50 dark:text-rose-300">
                      {part.text}
                    </del>{" "}
                  </span>
                ) : (
                  <span key={index}>
                    <ins className="rounded bg-emerald-100 px-1 font-semibold text-emerald-900 no-underline dark:bg-emerald-950/50 dark:text-emerald-300">
                      {part.text}
                    </ins>{" "}
                  </span>
                ),
              )}
            </p>
          </div>

          {(comparison.fixed.length > 0 || comparison.remaining.length > 0) && (
            <div className="grid gap-4 sm:grid-cols-2">
              <CorrectionList
                title={`Lỗi đã sửa (${comparison.fixed.length})`}
                empty="Chưa có lỗi nào của bản trước được sửa."
                items={comparison.fixed}
                fixed
              />
              <CorrectionList
                title={`Lỗi còn lại (${comparison.remaining.length})`}
                empty="Không còn lỗi nào của bản trước."
                items={comparison.remaining}
              />
            </div>
          )}
        </section>
      )}

      {revision.canRevise && !editing && (
        <div className="flex flex-col gap-3 rounded-xl bg-blue-50 p-4 dark:bg-sky-950/40 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-800 dark:text-slate-200">
            Sửa bài theo nhận xét rồi nộp lại để được chấm lần nữa. Còn {revision.remaining}/{revision.limit} lần sửa. Bản sửa
            không cộng thêm Bánh Mì.
          </p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <PencilLine size={16} strokeWidth={2} aria-hidden="true" /> Sửa và nộp lại
          </button>
        </div>
      )}

      {revision.canRevise && editing && (
        <section aria-labelledby="revision-editor" className="space-y-3 rounded-xl border border-blue-200 p-4 dark:border-sky-800">
          <h2 id="revision-editor" className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Bản sửa {revision.used + 1}
          </h2>
          <label htmlFor="revision-text" className="block text-sm text-slate-700 dark:text-slate-300">
            Sửa trực tiếp trên bài của bạn. Các lỗi cần sửa nằm ở phần nhận xét phía trên.
          </label>
          <textarea
            id="revision-text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={10}
            maxLength={20000}
            disabled={sending}
            spellCheck={false}
            className="w-full rounded-xl border border-slate-300 bg-white p-3 text-base leading-7 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Số từ: <strong className="tabular-nums">{words}</strong>
            {wordRange ? ` (yêu cầu ${wordRange[0]}–${wordRange[1]})` : ""}
          </p>
          {error && (
            <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={sending || unchanged || !text.trim()}
              className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
            >
              {sending && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
              {sending ? "Đang chấm bản sửa..." : "Nộp bản sửa"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setText(answer);
                setError(null);
              }}
              disabled={sending}
              className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Huỷ
            </button>
            {unchanged && (
              <span className="text-sm text-slate-600 dark:text-slate-400">Hãy sửa bài trước khi nộp.</span>
            )}
          </div>
        </section>
      )}

      {/* The plan decides how many revisions an answer gets: none on Free, 2 on Plus, 5 on Pro. */}
      {!revision.canRevise && revision.isLatest && revision.limit === 0 && (
        <div className="flex flex-col gap-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-800 dark:text-slate-200">
            Sửa bài theo nhận xét rồi nộp lại để được chấm lần nữa là quyền lợi của gói Plus (2 lần mỗi bài) và Pro (5
            lần mỗi bài).
          </p>
          <Link
            href="/plans"
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-amber-500 px-4 text-sm font-bold text-white hover:bg-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
          >
            Xem các gói
          </Link>
        </div>
      )}
      {!revision.canRevise && revision.isLatest && revision.limit > 0 && revision.remaining === 0 && (
        <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
          Bạn đã dùng hết {revision.limit} lần sửa cho bài viết này.
          {revision.limit < 5 && (
            <>
              {" "}
              <Link href="/plans" className="font-bold text-blue-700 underline underline-offset-2 dark:text-sky-300">
                Gói Pro được sửa 5 lần mỗi bài
              </Link>
              .
            </>
          )}
        </p>
      )}
      {!revision.isLatest && latest && (
        <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
          Đây không phải bản mới nhất.{" "}
          <Link
            href={`/writing/submissions/${latest.submissionId}`}
            className="font-bold text-blue-700 underline underline-offset-2 dark:text-sky-300"
          >
            Xem {attemptLabel(latest.number).toLowerCase()}
          </Link>
        </p>
      )}
    </div>
  );
}

function ScoreDelta({ before, after }: { before: number; after: number }) {
  const delta = after - before;
  if (delta === 0) return <span className="ml-2 text-xs font-semibold text-slate-600 dark:text-slate-400">không đổi</span>;
  return (
    <span
      className={`ml-2 text-xs font-bold ${
        delta > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"
      }`}
    >
      {delta > 0 ? `tăng ${delta}` : `giảm ${-delta}`}
    </span>
  );
}

function CorrectionList({
  title,
  empty,
  items,
  fixed = false,
}: {
  title: string;
  empty: string;
  items: Array<{ original: string; corrected: string }>;
  fixed?: boolean;
}) {
  const Icon = fixed ? Check : X;
  return (
    <div>
      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{empty}</p>
      ) : (
        <ul className="mt-1 space-y-1.5">
          {items.map((item, index) => (
            <li key={`${item.original}-${index}`} className="flex items-start gap-2 text-sm text-slate-800 dark:text-slate-200">
              <Icon
                size={16}
                strokeWidth={2}
                aria-hidden="true"
                className={`mt-0.5 shrink-0 ${fixed ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}
              />
              <span>
                {item.original} <span className="text-slate-500">→</span> <strong>{item.corrected}</strong>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
