"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  adminPlanCatalogService,
  type PlanCatalogRow,
  type PlanEntitlementRow,
  type PlanVersionRow,
} from "@/lib/api/services/admin-subscription.service";
import { formatVnd } from "@/modules/subscription/planLogic";
import { getApiErrorMessage } from "@/lib/utils/apiError";

const FEATURE_LABELS: Record<string, string> = {
  AI_SPEAKING_ASSESSMENT: "Chấm nói bằng AI",
  AI_WRITING_REVIEW: "Chấm viết bằng AI",
  AI_TUTOR_MESSAGE: "Tin nhắn trợ lý AI",
  AI_EXPLANATION: "Giải thích bằng AI",
  PREMIUM_VOCAB: "Từ vựng nâng cao",
  PREMIUM_READING: "Đọc nâng cao",
  PREMIUM_LISTENING: "Nghe nâng cao",
  PREMIUM_SPEAKING_CONTENT: "Nói nâng cao",
  PREMIUM_WRITING_CONTENT: "Viết nâng cao",
};

const PERIOD_LABELS: Record<string, string> = {
  DAY: "ngày",
  CALENDAR_MONTH: "tháng",
  BILLING_CYCLE: "kỳ gói",
  LIFETIME: "trọn đời",
};

const FIELD =
  "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const limitText = (entitlement: PlanEntitlementRow) => {
  if (!entitlement.enabled) return "Không có";
  if (entitlement.limitValue === null) return "Không giới hạn";
  const period = PERIOD_LABELS[entitlement.period ?? ""];
  return period
    ? `${entitlement.limitValue} / ${period}`
    : String(entitlement.limitValue);
};

const featureLabel = (key: string) => FEATURE_LABELS[key] ?? key;

function useCatalogAction<T>(
  action: (input: T) => Promise<unknown>,
  success: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: action,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plan-catalog"] });
      toast.success(success);
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Không thể cập nhật bảng giá.")),
  });
}

function DraftEditor({
  draft,
  onPublish,
}: {
  draft: PlanVersionRow;
  onPublish: () => void;
}) {
  const [form, setForm] = useState({
    displayName: draft.displayName ?? "",
    description: draft.description ?? "",
    priceVnd: String(draft.priceVnd ?? ""),
    durationDays: String(draft.durationDays ?? ""),
  });
  const save = useCatalogAction(
    () =>
      adminPlanCatalogService.updateDraft(draft.id, {
        displayName: form.displayName.trim(),
        description: form.description.trim(),
        priceVnd: Number(form.priceVnd),
        durationDays: Number(form.durationDays),
      }),
    "Đã lưu bản nháp.",
  );
  const entitlement = useCatalogAction(
    (input: {
      id: number;
      enabled?: boolean;
      limitValue?: number | null;
    }) => {
      const { id, ...change } = input;
      return adminPlanCatalogService.updateEntitlement(draft.id, id, change);
    },
    "Đã cập nhật quyền lợi.",
  );
  const discard = useCatalogAction(
    () => adminPlanCatalogService.retire(draft.id),
    "Đã bỏ bản nháp.",
  );
  const set = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
      <p className="text-sm font-semibold text-slate-900">
        Bản nháp phiên bản {draft.version}
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Tên gói
          <input
            value={form.displayName}
            onChange={(event) => set("displayName")(event.target.value)}
            className={FIELD}
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Giá (đồng)
          <input
            type="number"
            min={1}
            value={form.priceVnd}
            onChange={(event) => set("priceVnd")(event.target.value)}
            className={FIELD}
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Thời hạn (ngày)
          <input
            type="number"
            min={1}
            value={form.durationDays}
            onChange={(event) => set("durationDays")(event.target.value)}
            className={FIELD}
          />
        </label>
        <label className="text-sm font-medium text-slate-700 sm:col-span-2">
          Mô tả
          <textarea
            rows={2}
            value={form.description}
            onChange={(event) => set("description")(event.target.value)}
            className={FIELD}
          />
        </label>
      </div>

      <table className="mt-4 w-full text-left text-sm">
        <thead className="text-xs text-slate-500">
          <tr>
            <th className="py-1.5 font-semibold">Quyền lợi</th>
            <th className="py-1.5 font-semibold">Bật</th>
            <th className="py-1.5 font-semibold">Giới hạn</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {draft.entitlements.map((row) => (
            <tr key={row.id}>
              <td className="py-2 text-slate-800">
                {featureLabel(row.featureKey)}
              </td>
              <td className="py-2">
                <input
                  type="checkbox"
                  aria-label={`Bật ${featureLabel(row.featureKey)}`}
                  checked={row.enabled}
                  disabled={entitlement.isPending}
                  onChange={(event) =>
                    entitlement.mutate({
                      id: row.id,
                      enabled: event.target.checked,
                    })
                  }
                />
              </td>
              <td className="py-2">
                {row.limitValue === null ? (
                  <span className="text-slate-500">Không giới hạn</span>
                ) : (
                  <input
                    type="number"
                    min={1}
                    aria-label={`Giới hạn ${featureLabel(row.featureKey)}`}
                    defaultValue={row.limitValue}
                    onBlur={(event) => {
                      const next = Number(event.target.value);
                      if (next !== row.limitValue)
                        entitlement.mutate({ id: row.id, limitValue: next });
                    }}
                    className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-sm"
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          disabled={discard.isPending}
          onClick={() => discard.mutate(undefined)}
          className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Bỏ bản nháp
        </button>
        <button
          type="button"
          disabled={save.isPending}
          onClick={() => save.mutate(undefined)}
          className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Lưu bản nháp
        </button>
        <button
          type="button"
          onClick={onPublish}
          className="min-h-10 rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Xuất bản
        </button>
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  onPublish,
}: {
  plan: PlanCatalogRow;
  onPublish: (draft: PlanVersionRow) => void;
}) {
  const current = plan.versions.find((version) => version.isCurrent);
  const draft = plan.versions.find((version) => version.status === "DRAFT");
  const create = useCatalogAction(
    () =>
      adminPlanCatalogService.createDraft(plan.code, {
        priceVnd: current?.priceVnd ?? undefined,
        durationDays: current?.durationDays ?? undefined,
      }),
    "Đã tạo bản nháp từ phiên bản hiện hành.",
  );

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950">
            {current?.displayName ?? plan.displayName}
          </h2>
          <p className="mt-0.5 text-sm text-slate-600">
            {current
              ? `${formatVnd(current.priceVnd)} · ${current.durationDays} ngày · phiên bản ${current.version}`
              : "Chưa có phiên bản hiện hành"}
          </p>
          {current?.description && (
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              {current.description}
            </p>
          )}
        </div>
        {!draft && (
          <button
            type="button"
            disabled={create.isPending}
            onClick={() => create.mutate(undefined)}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Plus size={16} /> Tạo bản nháp
          </button>
        )}
      </div>

      {current && (
        <ul className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          {current.entitlements.map((row) => (
            <li key={row.id} className="flex justify-between gap-3">
              <span className="text-slate-700">
                {featureLabel(row.featureKey)}
              </span>
              <span className="text-slate-500">{limitText(row)}</span>
            </li>
          ))}
        </ul>
      )}

      {draft && (
        <div className="mt-4">
          <DraftEditor
            key={draft.id}
            draft={draft}
            onPublish={() => onPublish(draft)}
          />
        </div>
      )}
    </section>
  );
}

export function PlanCatalogPanel() {
  const [publishing, setPublishing] = useState<PlanVersionRow | null>(null);
  const query = useQuery({
    queryKey: ["admin-plan-catalog"],
    queryFn: adminPlanCatalogService.list,
  });
  const queryClient = useQueryClient();
  const publish = useMutation({
    mutationFn: (id: number) => adminPlanCatalogService.publish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plan-catalog"] });
      setPublishing(null);
      toast.success("Đã xuất bản bảng giá mới.");
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Không thể xuất bản bảng giá.")),
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

  const plans = (query.data ?? []).filter((plan) => plan.code !== "FREE");
  return (
    <div className="space-y-4">
      {plans.map((plan) => (
        <PlanCard key={plan.id} plan={plan} onPublish={setPublishing} />
      ))}
      <ConfirmDialog
        open={publishing !== null}
        title={`Xuất bản giá ${formatVnd(publishing?.priceVnd)}?`}
        description="Học viên mua mới sẽ thấy giá này ngay. Người đã mua giữ nguyên gói và thời hạn hiện tại."
        confirmLabel="Xuất bản"
        isPending={publish.isPending}
        onConfirm={() => {
          if (publishing) publish.mutate(publishing.id);
        }}
        onCancel={() => setPublishing(null)}
      />
    </div>
  );
}
