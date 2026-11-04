"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import axiosClient from "@/lib/api/axiosClient";
import { formatVnd } from "@/modules/subscription/planLogic";
import {
  EMPTY_PROMO_DRAFT,
  promoDraftToBody,
  promoStatus,
  type AdminPromoCode,
  type PromoCodeDraft,
} from "@/lib/admin/promoCodes";

const KEY = ["admin", "promo-codes"] as const;
const TH = "px-4 py-3";
const INPUT =
  "mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400/30";

const dateText = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "—";

const STATUS_STYLE: Record<string, string> = {
  "Còn hiệu lực": "bg-emerald-50 text-emerald-800 border-emerald-200",
  "Hết hạn": "bg-slate-100 text-slate-700 border-slate-200",
  "Hết lượt": "bg-amber-50 text-amber-800 border-amber-200",
  "Đã tắt": "bg-rose-50 text-rose-800 border-rose-200",
};

export default function PromoCodesPage() {
  const queryClient = useQueryClient();
  const [source, setSource] = useState<"ADMIN" | "WINBACK">("ADMIN");
  const [draft, setDraft] = useState<PromoCodeDraft>(EMPTY_PROMO_DRAFT);
  const [formError, setFormError] = useState<string | null>(null);

  const list = useQuery({
    queryKey: [...KEY, source],
    queryFn: () =>
      axiosClient.get("/admin/promo-codes", { params: { source } }) as Promise<AdminPromoCode[]>,
  });

  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      axiosClient.post("/admin/promo-codes", body) as Promise<AdminPromoCode>,
    onSuccess: (row) => {
      toast.success(`Đã tạo mã ${row.code}`);
      setDraft(EMPTY_PROMO_DRAFT);
      queryClient.invalidateQueries({ queryKey: KEY });
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) =>
      setFormError(error?.response?.data?.message ?? error?.message ?? "Không tạo được mã."),
  });

  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      axiosClient.patch(`/admin/promo-codes/${id}`, { active }) as Promise<AdminPromoCode>,
    onSuccess: (row) => {
      toast.success(row.active ? `Đã bật mã ${row.code}` : `Đã tắt mã ${row.code}`);
      queryClient.invalidateQueries({ queryKey: KEY });
    },
    onError: () => toast.error("Không đổi được trạng thái mã."),
  });

  const set = (field: keyof PromoCodeDraft) => (value: string) =>
    setDraft((d) => ({ ...d, [field]: value }));

  return (
    <main className="mx-auto max-w-7xl space-y-6 pb-12">
      <header className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">Mã giảm giá</h1>
        <p className="mt-1 text-sm text-slate-600">
          Tạo mã cho đợt khuyến mãi và theo dõi số lượt dùng. Mã kéo quay lại do hệ thống tự tạo: giảm 20%,
          dùng trong 7 ngày, gửi 3 ngày sau khi gói của học viên hết hạn.
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="new-code">
        <h2 id="new-code" className="text-sm font-semibold text-slate-900">
          Tạo mã mới
        </h2>
        <form
          className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6"
          onSubmit={(e) => {
            e.preventDefault();
            const result = promoDraftToBody(draft);
            if (!result.ok) {
              setFormError(result.error);
              return;
            }
            setFormError(null);
            create.mutate(result.body);
          }}
        >
          <label className="text-sm font-medium text-slate-700 lg:col-span-2">
            Mã
            <input className={`${INPUT} uppercase`} value={draft.code} onChange={(e) => set("code")(e.target.value)} placeholder="TET2027" maxLength={30} />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Giảm (%)
            <input className={INPUT} type="number" min={1} max={90} value={draft.percentOff} onChange={(e) => set("percentOff")(e.target.value)} />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Gói áp dụng
            <select className={INPUT} value={draft.plan} onChange={(e) => set("plan")(e.target.value)}>
              <option value="ALL">Mọi gói</option>
              <option value="PLUS">Chỉ Plus</option>
              <option value="PRO">Chỉ Pro</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Hết hạn (hết ngày)
            <input className={INPUT} type="date" value={draft.validTo} onChange={(e) => set("validTo")(e.target.value)} />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Lượt tối đa
            <input className={INPUT} type="number" min={1} value={draft.maxRedemptions} onChange={(e) => set("maxRedemptions")(e.target.value)} placeholder="Không giới hạn" />
          </label>
          <label className="text-sm font-medium text-slate-700 sm:col-span-2 lg:col-span-4">
            Ghi chú
            <input className={INPUT} value={draft.note} onChange={(e) => set("note")(e.target.value)} maxLength={200} />
          </label>
          <div className="flex items-end lg:col-span-2">
            <button
              type="submit"
              disabled={create.isPending}
              className="h-10 w-full rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {create.isPending ? "Đang tạo…" : "Tạo mã"}
            </button>
          </div>
          <p className="text-xs text-slate-600 sm:col-span-2 lg:col-span-6">
            Mỗi học viên dùng một mã một lần. Phần giảm làm tròn xuống bội số 1.000 đ.
          </p>
          {formError && (
            <p role="alert" className="text-sm text-rose-700 sm:col-span-2 lg:col-span-6">
              {formError}
            </p>
          )}
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Danh sách mã</h2>
          <div className="flex gap-2" role="group" aria-label="Nguồn mã">
            {(
              [
                ["ADMIN", "Do admin tạo"],
                ["WINBACK", "Kéo quay lại"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={source === value}
                onClick={() => setSource(value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  source === value
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {list.isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-5 animate-spin text-slate-500" />
          </div>
        ) : list.isError ? (
          <div className="p-6 text-center text-sm text-rose-700">
            <AlertCircle className="mx-auto mb-2 size-6" />
            Không tải được danh sách mã.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="whitespace-nowrap border-b border-slate-200 bg-slate-100/75 text-xs font-bold uppercase tracking-wider text-slate-700">
                  <th className={`${TH} pl-5`}>Mã</th>
                  <th className={TH}>Giảm</th>
                  <th className={TH}>Gói</th>
                  <th className={TH}>{source === "WINBACK" ? "Học viên" : "Ghi chú"}</th>
                  <th className={TH}>Hết hạn</th>
                  <th className={`${TH} text-right`}>Đã dùng</th>
                  <th className={`${TH} text-right`}>Đã giảm</th>
                  <th className={TH}>Trạng thái</th>
                  <th className={`${TH} pr-5 text-right`}>Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {(list.data ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-8 text-center text-slate-500">
                      Chưa có mã nào.
                    </td>
                  </tr>
                ) : (
                  (list.data ?? []).map((row) => {
                    const status = promoStatus(row);
                    return (
                      <tr key={row.id}>
                        <td className={`${TH} pl-5 font-mono font-semibold text-slate-900`}>{row.code}</td>
                        <td className={`${TH} tabular-nums`}>{row.percentOff}%</td>
                        <td className={TH}>{row.planCodes.length ? row.planCodes.join(", ") : "Mọi gói"}</td>
                        <td className={`${TH} max-w-56 truncate`}>{source === "WINBACK" ? row.ownerEmail : row.note ?? "—"}</td>
                        <td className={`${TH} whitespace-nowrap`}>{dateText(row.validTo)}</td>
                        <td className={`${TH} text-right tabular-nums`}>
                          {row.redemptions}
                          {row.maxRedemptions !== null ? `/${row.maxRedemptions}` : ""}
                        </td>
                        <td className={`${TH} whitespace-nowrap text-right tabular-nums`}>{formatVnd(row.discountGivenVnd)}</td>
                        <td className={TH}>
                          <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[status]}`}>
                            {status}
                          </span>
                        </td>
                        <td className={`${TH} pr-5 text-right`}>
                          <button
                            type="button"
                            disabled={toggle.isPending}
                            onClick={() => toggle.mutate({ id: row.id, active: !row.active })}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          >
                            {row.active ? "Tắt" : "Bật"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
