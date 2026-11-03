"use client";

import { ShieldCheck } from "lucide-react";
import {
  CONFIRMATION_LABEL,
  STATUS_LABEL,
  VERDICT_LABEL,
  confirmationFor,
  provenanceLines,
  verdictDetail,
  type ConfirmationMethod,
  type GroupReview,
  type Tone,
} from "@/lib/examAi/answerReview";

const TONE: Record<Tone, string> = {
  positive: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  error: "border-rose-200 bg-rose-50 text-rose-700",
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
};

type Props = {
  part: number;
  review: GroupReview | null | undefined;
  /** Why Apply would hold the group back, already in words. */
  holdBack?: string | null;
  busy?: boolean;
  onConfirm?: (method: ConfirmationMethod) => void;
  /** Part 1 on the Draft: run the Vision check again on the current content. */
  onRecheck?: () => void;
};

/** The answer review of one group: status, provenance, verdicts and history. */
export function AnswerReviewPanel({
  part,
  review,
  holdBack,
  busy,
  onConfirm,
  onRecheck,
}: Props) {
  const status = review?.status ?? "UNREVIEWED";
  const { label, tone } = STATUS_LABEL[status];
  const lines = provenanceLines(review);
  const method = onConfirm ? confirmationFor(part, review) : null;
  const refused = (review?.verdicts ?? []).filter((row) => row.verdict !== "AGREE");
  const history = review?.history ?? [];

  return (
    <section
      aria-label="Kiểm định đáp án"
      className="mt-3 space-y-2 rounded-lg border border-slate-200 p-3 text-sm"
    >
      <div className="flex flex-wrap items-center gap-2">
        <ShieldCheck size={14} strokeWidth={2} className="text-slate-500" aria-hidden="true" />
        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${TONE[tone]}`}>
          {label}
        </span>
        {holdBack && (
          <span className="text-xs text-amber-800">Chưa áp dụng được: {holdBack}</span>
        )}
        <div className="ml-auto flex gap-2">
          {onRecheck && (
            <button
              type="button"
              onClick={onRecheck}
              disabled={busy}
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Kiểm tra lại bằng Vision
            </button>
          )}
          {method && (
            <button
              type="button"
              onClick={() => onConfirm?.(method)}
              disabled={busy}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            >
              {CONFIRMATION_LABEL[method]}
            </button>
          )}
        </div>
      </div>

      {lines.length > 0 && (
        <ul className="space-y-0.5 text-xs text-slate-600">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}

      {refused.length > 0 && (
        <ul className="space-y-1">
          {refused.map((row) => (
            <li
              key={row.questionNumber}
              className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-800"
            >
              Câu {row.questionNumber} · {VERDICT_LABEL[row.verdict]}: {verdictDetail(row)}
            </li>
          ))}
        </ul>
      )}

      {history.length > 0 && (
        <details className="text-xs text-slate-600">
          <summary className="cursor-pointer font-medium text-slate-700">
            Kết quả kiểm định phiên bản trước ({history.length})
          </summary>
          <ul className="mt-1 space-y-1">
            {history.map((entry) => (
              <li key={`${entry.contentHash}-${entry.staleAt}`}>
                {STATUS_LABEL[entry.status].label} · hash {entry.contentHash.slice(0, 10)} ·
                mất hiệu lực {new Date(entry.staleAt).toLocaleString("vi-VN")} (
                {entry.staleReason})
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
