"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, CreditCard, Eye, Loader2, Search, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/stores/authStore";
import { Pagination } from "@/components/ui";
import {
  adminPlanPurchaseService,
  type AdminPlanPurchase,
  type PlanPurchaseStatus,
} from "@/lib/api/services/admin-plan-purchase.service";

const tabs: Array<{ label: string; value?: PlanPurchaseStatus }> = [
  { label: "Chờ đối soát", value: "PENDING_PAYMENT" },
  { label: "Hoàn tất", value: "COMPLETED" },
  { label: "Đã từ chối", value: "REJECTED" },
  { label: "Hết hạn", value: "EXPIRED" },
  { label: "Tất cả" },
];

const money = (amount: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
const dateTime = (value?: string | null) => value ? new Date(value).toLocaleString("vi-VN") : "—";
const canConfirm = (item: AdminPlanPurchase) => ["REPORTED", "REVIEW_REQUIRED"].includes(item.payment.status) && item.status === "PENDING_PAYMENT";
const canReject = (item: AdminPlanPurchase) => item.payment.status === "REPORTED" && item.status === "PENDING_PAYMENT";

function Status({ item }: { item: AdminPlanPurchase }) {
  const status = item.payment.status;
  const style = status === "CONFIRMED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : status === "REJECTED" ? "bg-rose-50 text-rose-700 border-rose-200" : status === "REPORTED" || status === "REVIEW_REQUIRED" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-100 text-slate-700 border-slate-200";
  const text: Record<string, string> = { PENDING: "Chờ thanh toán", REPORTED: "Chờ đối soát", REVIEW_REQUIRED: "Cần xử lý", CONFIRMED: "Đã kích hoạt", REJECTED: "Đã từ chối", EXPIRED: "Hết hạn", SUPERSEDED: "Đã thay thế" };
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${style}`}>{text[status] ?? status}</span>;
}

export default function AdminPlanPurchasesPage() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<PlanPurchaseStatus | undefined>("PENDING_PAYMENT");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<AdminPlanPurchase | null>(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const list = useQuery({
    queryKey: ["admin-plan-purchases", status, search, page],
    queryFn: () => adminPlanPurchaseService.list({ status, search: search || undefined, page, limit: 20 }),
    enabled: user?.role === "ADMIN",
  });
  const detail = useQuery({ queryKey: ["admin-plan-purchase", selectedId], queryFn: () => adminPlanPurchaseService.get(selectedId!), enabled: selectedId !== null });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-plan-purchases"] });
  const confirm = useMutation({ mutationFn: adminPlanPurchaseService.confirm, onSuccess: () => { toast.success("Đã kích hoạt gói nâng cấp."); refresh(); if (selectedId) queryClient.invalidateQueries({ queryKey: ["admin-plan-purchase", selectedId] }); }, onError: () => toast.error("Không thể xác nhận giao dịch này.") });
  const reject = useMutation({ mutationFn: ({ id, note }: { id: number; note: string }) => adminPlanPurchaseService.reject(id, note), onSuccess: () => { toast.success("Đã từ chối giao dịch."); setRejecting(null); setReason(""); refresh(); }, onError: () => toast.error("Không thể từ chối giao dịch này.") });
  const selected = detail.data;
  const rows = list.data?.items ?? [];
  const activeTab = useMemo(() => tabs.find((tab) => tab.value === status)?.label ?? "Tất cả", [status]);

  if (user?.role !== "ADMIN") return <div className="p-8 text-sm text-slate-600">Chỉ Quản trị viên mới có thể quản lý gói nâng cấp.</div>;
  return <main className="mx-auto max-w-7xl space-y-6 pb-12">
    <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="flex items-center gap-2 text-2xl font-bold text-slate-950"><CreditCard className="text-orange-600" /> Gói nâng cấp</h1><p className="mt-1 text-sm text-slate-500">Đối soát và theo dõi giao dịch mua gói Pro của học viên.</p></div></header>
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="flex gap-2 overflow-x-auto pb-1">{tabs.map((tab) => <button key={tab.label} onClick={() => { setStatus(tab.value); setPage(1); }} className={`whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-semibold ${activeTab === tab.label ? "border-orange-600 bg-orange-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>{tab.label}</button>)}</div><label className="relative block"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Tìm email hoặc mã chuyển khoản" className="h-10 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm lg:w-80" /></label></div>
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">{list.isLoading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-orange-600" /></div> : list.isError ? <div className="p-8 text-center text-rose-700"><AlertCircle className="mx-auto mb-2" />Không thể tải giao dịch gói nâng cấp.</div> : <><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="border-b bg-slate-50 text-xs font-semibold text-slate-500"><tr><th className="px-5 py-3">Học viên</th><th className="px-5 py-3">Gói</th><th className="px-5 py-3">Mã giao dịch</th><th className="px-5 py-3">Giá trị</th><th className="px-5 py-3">Trạng thái</th><th className="px-5 py-3">Tạo lúc</th><th className="px-5 py-3 text-right">Chi tiết</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((item) => <tr key={item.id} className="hover:bg-slate-50"><td className="px-5 py-4 font-medium text-slate-800">{item.userEmail}</td><td className="px-5 py-4"><div className="font-medium">{item.planDisplayName}</div><div className="text-xs text-slate-500">{item.durationDays} ngày · v{item.version}</div></td><td className="px-5 py-4 font-mono text-xs text-slate-600">{item.payment.transferCode}</td><td className="px-5 py-4 font-medium">{money(item.amountVnd)}</td><td className="px-5 py-4"><Status item={item} /></td><td className="px-5 py-4 text-xs text-slate-500">{dateTime(item.createdAt)}</td><td className="px-5 py-4 text-right"><button onClick={() => setSelectedId(item.id)} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Eye size={14}/> Xem</button></td></tr>)}</tbody></table></div>{rows.length === 0 && <div className="py-14 text-center text-sm text-slate-500">Không có giao dịch phù hợp.</div>}<div className="border-t p-4">{list.data && <Pagination currentPage={list.data.page} totalPages={list.data.totalPages} onPageChange={setPage} />}</div></>}</section>
    {selectedId !== null && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"><section className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-bold text-slate-900">Chi tiết giao dịch gói</h2><p className="mt-1 text-sm text-slate-500">Thông tin đối soát và quyền truy cập đã kích hoạt.</p></div><button onClick={() => setSelectedId(null)} className="text-sm text-slate-500">Đóng</button></div>{detail.isLoading ? <Loader2 className="mx-auto my-12 animate-spin" /> : selected && <div className="mt-6 space-y-4 text-sm"><div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4"><div><p className="text-xs text-slate-500">Học viên</p><p className="font-medium">{selected.userEmail}</p></div><div><p className="text-xs text-slate-500">Trạng thái</p><Status item={selected}/></div><div><p className="text-xs text-slate-500">Gói</p><p className="font-medium">{selected.planDisplayName} · {selected.durationDays} ngày</p></div><div><p className="text-xs text-slate-500">Giá trị</p><p className="font-medium">{money(selected.amountVnd)}</p></div><div><p className="text-xs text-slate-500">Mã chuyển khoản</p><p className="font-mono">{selected.payment.transferCode}</p></div><div><p className="text-xs text-slate-500">Hoàn tất</p><p>{dateTime(selected.completedAt)}</p></div></div>{selected.payment.rejectionReason && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-800">Lý do từ chối: {selected.payment.rejectionReason}</div>}<p className="text-xs text-slate-500">Nguồn xác nhận: {selected.confirmedById ? "Quản trị viên" : selected.payment.status === "CONFIRMED" ? "Tự động/PayOS" : "Chưa xác nhận"}</p><div className="flex justify-end gap-2 border-t pt-4">{canReject(selected) && <button onClick={() => setRejecting(selected)} className="inline-flex items-center gap-1 rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700"><XCircle size={16}/> Từ chối</button>}{canConfirm(selected) && <button disabled={confirm.isPending} onClick={() => confirm.mutate(selected.id)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"><CheckCircle2 size={16}/> Xác nhận & kích hoạt</button>}</div></div>}</section></div>}
    {rejecting && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4"><form onSubmit={(event) => { event.preventDefault(); if (reason.trim()) reject.mutate({ id: rejecting.id, note: reason.trim() }); }} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"><h2 className="text-lg font-bold">Từ chối giao dịch</h2><p className="mt-1 text-sm text-slate-500">Lý do sẽ được lưu cùng giao dịch của {rejecting.userEmail}.</p><textarea required value={reason} onChange={(event) => setReason(event.target.value)} className="mt-4 min-h-28 w-full rounded-lg border border-slate-300 p-3 text-sm" placeholder="Nhập lý do từ chối"/><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setRejecting(null)} className="rounded-lg border px-3 py-2 text-sm">Hủy</button><button disabled={reject.isPending || !reason.trim()} className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">Xác nhận từ chối</button></div></form></div>}
  </main>;
}
