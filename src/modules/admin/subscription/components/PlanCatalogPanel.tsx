"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  adminPlanCatalogService,
  type PlanCatalogRow,
} from "@/lib/api/services/admin-subscription.service";
import {
  grantedFeatureKeys,
  pricePer30Days,
  priceWarning,
  readPriceInput,
  savingPercent,
  termRows,
  type TermRow,
} from "@/lib/admin/planPriceLogic";
import { formatVnd } from "@/modules/subscription/planLogic";
import { getApiErrorMessage } from "@/lib/utils/apiError";

/** What each feature a plan grants is called to the admin. */
const FEATURE_LABELS: Record<string, string> = {
  PREMIUM_VOCAB: "Từ vựng",
  PREMIUM_READING: "Đọc",
  PREMIUM_LISTENING: "Nghe",
  PREMIUM_SPEAKING_CONTENT: "Nói",
  PREMIUM_WRITING_CONTENT: "Viết",
  AI_SPEAKING_ASSESSMENT: "Chấm nói bằng AI",
  AI_WRITING_REVIEW: "Chấm viết bằng AI",
  AI_TUTOR_MESSAGE: "Tin nhắn trợ lý AI",
  AI_EXPLANATION: "Giải thích bằng AI",
};

const dayText = (iso: string) => new Date(iso).toLocaleDateString("vi-VN");

type Pending = {
  code: string;
  planName: string;
  days: number;
  from: number;
  to: number;
  warning: string | null;
};

function PlanBlock({
  plan,
  onAsk,
}: {
  plan: PlanCatalogRow;
  onAsk: (pending: Pending) => void;
}) {
  const rows = termRows(plan.versions);
  const base = rows.find((row) => row.days === 30)?.current?.priceVnd ?? null;
  const granted = grantedFeatureKeys(plan.versions).map((key) => FEATURE_LABELS[key] ?? key);
  const [editing, setEditing] = useState<number | null>(null);
  const [value, setValue] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  const startEdit = (row: TermRow) => {
    setEditing(row.days);
    setValue(String(row.current?.priceVnd ?? ""));
    setProblem(null);
  };
  const save = (row: TermRow) => {
    const input = readPriceInput(value, row.current?.priceVnd ?? null);
    if (input.problem || input.value === null) {
      setProblem(input.problem);
      return;
    }
    setProblem(null);
    onAsk({
      code: plan.code,
      planName: plan.displayName,
      days: row.days,
      from: row.current?.priceVnd ?? 0,
      to: input.value,
      warning: priceWarning(rows, row.days, input.value),
    });
  };
  const hasHistory = rows.some((row) => row.history.length > 1);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-950">{plan.displayName}</h2>
      {granted.length > 0 && (
        <p className="mt-0.5 text-sm text-slate-600">Nội dung nâng cao: {granted.join(", ")}.</p>
      )}

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <thead className="text-xs text-slate-500">
            <tr>
              <th className="py-1.5 pr-3 font-semibold">Thời hạn</th>
              <th className="py-1.5 pr-3 font-semibold">Giá đang bán</th>
              <th className="py-1.5 pr-3 font-semibold">So với mua 30 ngày</th>
              <th className="py-1.5 text-right font-semibold">
                <span className="sr-only">Thao tác</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map((row) => {
              const price = row.current?.priceVnd ?? 0;
              const saving = savingPercent(price, row.days, base);
              const isEditing = editing === row.days;
              return (
                <tr key={row.days} className="align-top">
                  <td className="py-2.5 pr-3 font-medium text-slate-800">{row.days} ngày</td>
                  <td className="py-2.5 pr-3 text-slate-900">
                    {isEditing ? (
                      <div>
                        <input
                          value={value}
                          onChange={(event) => setValue(event.target.value)}
                          inputMode="numeric"
                          autoFocus
                          aria-label={`Giá mới của ${plan.displayName} ${row.days} ngày`}
                          aria-invalid={problem ? true : undefined}
                          className="w-40 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          onKeyDown={(event) => {
                            if (event.key === "Enter") save(row);
                            if (event.key === "Escape") setEditing(null);
                          }}
                        />
                        <span className="ml-1.5 text-slate-500">₫</span>
                        {problem && (
                          <p role="alert" className="mt-1 text-xs text-rose-700">
                            {problem}
                          </p>
                        )}
                      </div>
                    ) : (
                      formatVnd(price)
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-slate-600">
                    {row.days > 30 && price > 0
                      ? `≈ ${formatVnd(pricePer30Days(price, row.days))} / 30 ngày${saving ? `, rẻ hơn ${saving}%` : ""}`
                      : ""}
                  </td>
                  <td className="py-2.5 text-right">
                    {isEditing ? (
                      <span className="inline-flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEditing(null)}
                          className="min-h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          onClick={() => save(row)}
                          className="min-h-9 rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-700"
                        >
                          Lưu
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEdit(row)}
                        aria-label={`Sửa giá ${plan.displayName} ${row.days} ngày`}
                        className="min-h-9 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Sửa giá
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer font-semibold text-slate-700">Lịch sử giá</summary>
        {hasHistory ? (
          <ul className="mt-2 space-y-2 text-slate-600">
            {rows.map((row) => (
              <li key={row.days}>
                <span className="font-medium text-slate-800">{row.days} ngày: </span>
                {row.history.map((entry, index) => (
                  <span key={entry.versionId}>
                    {index > 0 && "; "}
                    {formatVnd(entry.priceVnd)} từ {dayText(entry.since)}
                    {entry.isCurrent ? " (đang bán)" : ""}
                  </span>
                ))}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-slate-500">Chưa đổi giá lần nào.</p>
        )}
      </details>
    </section>
  );
}

export function PlanCatalogPanel() {
  const [pending, setPending] = useState<Pending | null>(null);
  // Each price change starts the rows afresh (closes the input that was open).
  const [changes, setChanges] = useState(0);
  const query = useQuery({
    queryKey: ["admin-plan-catalog"],
    queryFn: adminPlanCatalogService.list,
  });
  const queryClient = useQueryClient();
  const change = useMutation({
    mutationFn: (item: Pending) => adminPlanCatalogService.changePrice(item.code, item.days, item.to),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plan-catalog"] });
      setPending(null);
      setChanges((count) => count + 1);
      toast.success("Đã đổi giá.");
    },
    onError: (error) => {
      setPending(null);
      toast.error(getApiErrorMessage(error, "Không đổi được giá."));
    },
  });

  if (query.isLoading)
    return (
      <div className="flex justify-center py-12 text-slate-500">
        <Loader2 className="animate-spin" />
      </div>
    );
  if (query.isError)
    return (
      <div role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
        Không tải được bảng giá.
      </div>
    );

  // Plus before Pro: the cheaper plan first, whatever order the rows were made in.
  const lowestPrice = (plan: PlanCatalogRow) => termRows(plan.versions)[0]?.current?.priceVnd ?? Infinity;
  const plans = (query.data ?? [])
    .filter((plan) => plan.code !== "FREE")
    .sort((a, b) => lowestPrice(a) - lowestPrice(b));
  return (
    <div className="space-y-4">
      {plans.map((plan) => (
        <PlanBlock key={`${plan.id}-${changes}`} plan={plan} onAsk={setPending} />
      ))}
      <ConfirmDialog
        open={pending !== null}
        title={pending ? `Đổi giá ${pending.planName} ${pending.days} ngày?` : ""}
        description={
          pending
            ? `Từ ${formatVnd(pending.from)} thành ${formatVnd(pending.to)}. Học viên mua mới thấy giá này ngay. Người đã mua và đơn đang chờ thanh toán giữ giá cũ.${pending.warning ? ` Lưu ý: ${pending.warning}` : ""}`
            : ""
        }
        confirmLabel="Đổi giá"
        isPending={change.isPending}
        onConfirm={() => {
          if (pending) change.mutate(pending);
        }}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
