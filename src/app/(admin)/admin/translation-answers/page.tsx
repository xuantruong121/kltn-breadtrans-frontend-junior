"use client";

import { useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";

import { Pagination } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { BTN_DANGER, BTN_SUCCESS } from "@/components/admin/cmsButtons";
import {
  translationReviewService,
  type TranslationReviewRow,
} from "@/lib/api/services/translation-review.service";
import { quizDisplayTitle } from "@/lib/catalog/displayTitles";
import { getApiErrorMessage } from "@/lib/utils/apiError";

const PAGE_SIZE = 20;

/**
 * Duyệt câu dịch (owner 2026-11-14): learner translations of a "Dịch câu"
 * sentence that the AI judged right but no accepted answer covers. Adding one
 * lets later learners who write it be checked without the AI; dismissing it
 * keeps it out of this list.
 */
export default function AdminTranslationAnswersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [pendingDismiss, setPendingDismiss] = useState<TranslationReviewRow | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-translation-answers", page],
    queryFn: () => translationReviewService.list(page, PAGE_SIZE),
    placeholderData: keepPreviousData,
  });

  const rowId = (row: TranslationReviewRow) => `${row.questionId}|${row.key}`;
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-translation-answers"] });

  const approve = async (row: TranslationReviewRow) => {
    setBusy(rowId(row));
    try {
      await translationReviewService.approve(row.questionId, row.answer);
      toast.success("Đã thêm vào đáp án mẫu.");
      await refresh();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Chưa thêm được câu này."));
    } finally {
      setBusy(null);
    }
  };

  const dismiss = async (row: TranslationReviewRow) => {
    setBusy(rowId(row));
    try {
      await translationReviewService.dismiss(row.questionId, row.answer);
      toast.success("Đã bỏ qua câu này.");
      await refresh();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Chưa bỏ qua được câu này."));
    } finally {
      setBusy(null);
    }
  };

  const rows = data?.data ?? [];

  return (
    <main className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-950">Duyệt câu dịch</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Câu học viên dịch trong bài Dịch câu được AI chấm là đúng nhưng chưa có trong đáp án mẫu. Thêm vào đáp án thì
          lần sau học viên viết câu đó được chấm ngay, không tốn lượt AI. Câu sai nghĩa hoặc không tự nhiên thì bỏ qua.
        </p>
      </header>

      {isLoading ? (
        <div className="flex min-h-40 items-center justify-center">
          <Loader2 className="animate-spin text-blue-600" size={28} aria-label="Đang tải" />
        </div>
      ) : isError ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          Chưa tải được danh sách. Hãy thử lại.
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-700">
          Chưa có câu dịch nào cần duyệt.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="bg-slate-50 text-[13px] text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Câu tiếng Việt</th>
                <th className="px-4 py-3 font-semibold">Câu học viên dịch</th>
                <th className="px-4 py-3 font-semibold">Đáp án mẫu hiện có</th>
                <th className="px-4 py-3 font-semibold">Số lần</th>
                <th className="px-4 py-3 font-semibold">
                  <span className="sr-only">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={rowId(row)} className="align-top">
                  <td className="px-4 py-3">
                    <p className="text-[13px] text-slate-600">{quizDisplayTitle(row.quizId, row.quizTitle)}</p>
                    <p className="mt-0.5 text-[15px] font-semibold text-slate-900">{row.prompt}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-[15px] font-semibold text-slate-900" lang="en">
                      {row.answer}
                    </p>
                    {row.explanation && <p className="mt-1 text-[13px] text-slate-600">AI: {row.explanation}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <ul className="space-y-0.5 text-[13px] text-slate-700" lang="en">
                      {row.acceptedAnswers.map((a) => (
                        <li key={a}>{a}</li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-800">
                    {row.count}
                    <span className="block text-[13px] text-slate-600">{row.learners} học viên</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => void approve(row)}
                        className={BTN_SUCCESS}
                      >
                        {busy === rowId(row) ? (
                          <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                        ) : (
                          <Check size={15} aria-hidden="true" />
                        )}
                        Thêm vào đáp án
                      </button>
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => setPendingDismiss(row)}
                        className={BTN_DANGER}
                      >
                        <X size={15} aria-hidden="true" /> Bỏ qua
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.total > PAGE_SIZE && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm tabular-nums text-slate-600">{data.total} câu cần duyệt</span>
          <Pagination currentPage={page} totalPages={data.totalPages} onPageChange={setPage} />
        </div>
      )}

      {pendingDismiss && (
        <ConfirmDialog
          open={true}
          title="Bỏ qua câu dịch"
          description={`Bỏ qua "${pendingDismiss.answer}"? Câu này sẽ không hiện lại trong danh sách, kể cả khi học viên khác viết giống vậy.`}
          confirmLabel="Bỏ qua"
          onConfirm={() => {
            const row = pendingDismiss;
            setPendingDismiss(null);
            void dismiss(row);
          }}
          onCancel={() => setPendingDismiss(null)}
        />
      )}
    </main>
  );
}
