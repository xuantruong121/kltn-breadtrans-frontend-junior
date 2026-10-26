"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Plus,
  Search,
  XCircle,
  Ban,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/stores/authStore";
import { Pagination } from "@/components/ui";
import {
  adminPlanPurchaseService,
  type AdminPlanPurchase,
  type PlanPurchaseStatus,
} from "@/lib/api/services/admin-plan-purchase.service";
import {
  adminSubscriptionService,
  type AdminSubscriptionItem,
  type AdminSubscriptionStatusFilter,
} from "@/lib/api/services/admin-subscription.service";
import { AdminGrantModal } from "@/modules/admin/subscription/components/AdminGrantModal";
import { AdminExtendModal } from "@/modules/admin/subscription/components/AdminExtendModal";
import { AdminRevokeModal } from "@/modules/admin/subscription/components/AdminRevokeModal";
import { AdminHistoryModal } from "@/modules/admin/subscription/components/AdminHistoryModal";

type MainTab = "ENTITLEMENTS" | "TRANSACTIONS";

const transactionTabs: Array<{ label: string; value?: PlanPurchaseStatus }> = [
  { label: "Chờ đối soát", value: "PENDING_PAYMENT" },
  { label: "Hoàn tất", value: "COMPLETED" },
  { label: "Đã từ chối", value: "REJECTED" },
  { label: "Hết hạn", value: "EXPIRED" },
  { label: "Tất cả" },
];

const entitlementTabs: Array<{
  label: string;
  value: AdminSubscriptionStatusFilter;
}> = [
  { label: "Đang hoạt động", value: "ACTIVE" },
  { label: "Tất cả", value: "ALL" },
  { label: "Đã hết hạn", value: "EXPIRED" },
  { label: "Đã thu hồi", value: "REVOKED" },
];

const money = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    amount,
  );

const dateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString("vi-VN") : "—";

const dateOnly = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    : "—";

const canConfirm = (item: AdminPlanPurchase) =>
  ["REPORTED", "REVIEW_REQUIRED"].includes(item.payment.status) &&
  item.status === "PENDING_PAYMENT";

const canReject = (item: AdminPlanPurchase) =>
  item.payment.status === "REPORTED" && item.status === "PENDING_PAYMENT";

function TransactionStatusBadge({ item }: { item: AdminPlanPurchase }) {
  const status = item.payment.status;
  const style =
    status === "CONFIRMED"
      ? "bg-emerald-50 text-emerald-700"
      : status === "REJECTED"
        ? "bg-rose-50 text-rose-700"
        : status === "REPORTED" || status === "REVIEW_REQUIRED"
          ? "bg-amber-50 text-amber-700"
          : "bg-slate-100 text-slate-600";
  const text: Record<string, string> = {
    PENDING: "Chờ thanh toán",
    REPORTED: "Chờ đối soát",
    REVIEW_REQUIRED: "Cần xử lý",
    CONFIRMED: "Đã kích hoạt",
    REJECTED: "Đã từ chối",
    EXPIRED: "Hết hạn",
    SUPERSEDED: "Đã thay thế",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${style}`}
    >
      {text[status] ?? status}
    </span>
  );
}

function EntitlementStatusBadge({
  status,
}: {
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
}) {
  switch (status) {
    case "ACTIVE":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
          <CheckCircle2 size={12} /> Đang hoạt động
        </span>
      );
    case "REVOKED":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
          <Ban size={12} /> Đã thu hồi
        </span>
      );
    case "EXPIRED":
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
          <Clock size={12} /> Đã hết hạn
        </span>
      );
  }
}

export default function AdminPlanPurchasesPage() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  // Primary top-level navigation: [ Quyền học viên ] vs [ Giao dịch ]
  const [mainTab, setMainTab] = useState<MainTab>("ENTITLEMENTS");

  // =================== STATE: ENTITLEMENTS TAB ===================
  const [entitlementStatus, setEntitlementStatus] =
    useState<AdminSubscriptionStatusFilter>("ACTIVE");
  const [entitlementSearchInput, setEntitlementSearchInput] = useState("");
  const [entitlementSearch, setEntitlementSearch] = useState("");
  const [entitlementPage, setEntitlementPage] = useState(1);

  // Modals state
  const [isGrantOpen, setIsGrantOpen] = useState(false);
  const [grantPreselectedLearner, setGrantPreselectedLearner] = useState<{
    id: number;
    email: string;
    fullName?: string | null;
  } | null>(null);

  const [extendTarget, setExtendTarget] =
    useState<AdminSubscriptionItem | null>(null);
  const [revokeTarget, setRevokeTarget] =
    useState<AdminSubscriptionItem | null>(null);
  const [historyTarget, setHistoryTarget] =
    useState<AdminSubscriptionItem | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setEntitlementSearch(entitlementSearchInput.trim());
      setEntitlementPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [entitlementSearchInput]);

  const subscriptionsQuery = useQuery({
    queryKey: [
      "admin-subscriptions",
      entitlementStatus,
      entitlementSearch,
      entitlementPage,
    ],
    queryFn: () =>
      adminSubscriptionService.list({
        status: entitlementStatus,
        search: entitlementSearch || undefined,
        page: entitlementPage,
        limit: 20,
      }),
    enabled: user?.role === "ADMIN" && mainTab === "ENTITLEMENTS",
  });

  const refreshEntitlements = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
  };

  // =================== STATE: TRANSACTIONS TAB ===================
  const [purchaseStatus, setPurchaseStatus] = useState<
    PlanPurchaseStatus | undefined
  >("PENDING_PAYMENT");
  const [purchaseSearchInput, setPurchaseSearchInput] = useState("");
  const [purchaseSearch, setPurchaseSearch] = useState("");
  const [purchasePage, setPurchasePage] = useState(1);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<number | null>(
    null,
  );
  const [rejectingPurchase, setRejectingPurchase] =
    useState<AdminPlanPurchase | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPurchaseSearch(purchaseSearchInput.trim());
      setPurchasePage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [purchaseSearchInput]);

  const purchasesQuery = useQuery({
    queryKey: [
      "admin-plan-purchases",
      purchaseStatus,
      purchaseSearch,
      purchasePage,
    ],
    queryFn: () =>
      adminPlanPurchaseService.list({
        status: purchaseStatus,
        search: purchaseSearch || undefined,
        page: purchasePage,
        limit: 20,
      }),
    enabled: user?.role === "ADMIN" && mainTab === "TRANSACTIONS",
  });

  const purchaseDetail = useQuery({
    queryKey: ["admin-plan-purchase", selectedPurchaseId],
    queryFn: () => adminPlanPurchaseService.get(selectedPurchaseId!),
    enabled: selectedPurchaseId !== null,
  });

  const refreshPurchases = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-plan-purchases"] });
  };

  const confirmPurchaseMutation = useMutation({
    mutationFn: adminPlanPurchaseService.confirm,
    onSuccess: () => {
      toast.success("Đã kích hoạt gói nâng cấp.");
      refreshPurchases();
      refreshEntitlements();
      if (selectedPurchaseId) {
        queryClient.invalidateQueries({
          queryKey: ["admin-plan-purchase", selectedPurchaseId],
        });
      }
    },
    onError: () => toast.error("Không thể xác nhận giao dịch này."),
  });

  const rejectPurchaseMutation = useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) =>
      adminPlanPurchaseService.reject(id, note),
    onSuccess: () => {
      toast.success("Đã từ chối giao dịch.");
      setRejectingPurchase(null);
      setRejectReason("");
      refreshPurchases();
    },
    onError: () => toast.error("Không thể từ chối giao dịch này."),
  });

  if (user?.role !== "ADMIN") {
    return (
      <div className="p-8 text-sm text-slate-600">
        Chỉ Quản trị viên mới có thể quản lý gói nâng cấp.
      </div>
    );
  }

  const entitlementRows = subscriptionsQuery.data?.items ?? [];
  const purchaseRows = purchasesQuery.data?.items ?? [];
  const selectedPurchase = purchaseDetail.data;

  // Compute KPI summary metrics
  const activeEntitlementCount =
    subscriptionsQuery.data?.total ??
    entitlementRows.filter((r) => r.status === "ACTIVE").length;
  const pendingTransactionsCount = purchaseRows.filter(
    (p) =>
      p.status === "PENDING_PAYMENT" ||
      p.payment.status === "REPORTED" ||
      p.payment.status === "REVIEW_REQUIRED",
  ).length;
  const totalTransactionsCount =
    purchasesQuery.data?.total ?? purchaseRows.length;

  return (
    <main className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* Top Header */}
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">
              Gói nâng cấp
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Quản lý gói cho học viên, cấp gói thủ công và đối soát giao dịch mua
            gói nâng cấp.
          </p>
        </div>

        {/* Primary Action in Entitlements Tab */}
        {mainTab === "ENTITLEMENTS" && (
          <button
            type="button"
            onClick={() => {
              setGrantPreselectedLearner(null);
              setIsGrantOpen(true);
            }}
            className="inline-flex items-center gap-2 self-start rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-xs transition-all hover:bg-slate-800 active:scale-[0.98] cursor-pointer sm:self-auto"
          >
            <Plus size={16} /> <span>Tặng gói</span>
          </button>
        )}
      </header>

      {/* 3 KPI Summary Cards */}
      <section
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
        aria-label="Thống kê gói nâng cấp"
      >
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Quyền gói hoạt động
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-950 font-mono tabular-nums">
              {activeEntitlementCount}
            </span>
            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200/50">
              Học viên có gói
            </span>
          </div>
          <p className="mt-2 text-xs font-medium text-slate-600">
            Tài khoản hiện đang có quyền học bài giảng và tính năng Plus/Pro.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Giao dịch cần đối soát
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-950 font-mono tabular-nums">
              {pendingTransactionsCount}
            </span>
            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200/50">
              Chờ xác nhận
            </span>
          </div>
          <p className="mt-2 text-xs font-medium text-slate-600">
            Giao dịch học viên đã chuyển khoản hoặc cần rà soát thanh toán.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Tổng lượt giao dịch
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-950 font-mono tabular-nums">
              {totalTransactionsCount}
            </span>
            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200/50">
              Đã ghi nhận
            </span>
          </div>
          <p className="mt-2 text-xs font-medium text-slate-600">
            Toàn bộ lịch sử yêu cầu mua gói trên hệ thống BreadTrans.
          </p>
        </div>
      </section>

      {/* Main Two-Tab Navigation */}
      <div className="flex gap-6 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setMainTab("ENTITLEMENTS")}
          className={`-mb-px border-b-2 px-1 py-3 text-sm font-bold transition-all cursor-pointer ${
            mainTab === "ENTITLEMENTS"
              ? "border-slate-900 text-slate-950"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Quyền học viên
        </button>
        <button
          type="button"
          onClick={() => setMainTab("TRANSACTIONS")}
          className={`-mb-px border-b-2 px-1 py-3 text-sm font-bold transition-all cursor-pointer ${
            mainTab === "TRANSACTIONS"
              ? "border-slate-900 text-slate-950"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Giao dịch mua gói
        </button>
      </div>

      {/* ===================== TAB 1: QUYỀN HỌC VIÊN ===================== */}
      {mainTab === "ENTITLEMENTS" && (
        <div className="space-y-4">
          {/* Sub Filters & Search */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {entitlementTabs.map((tab) => {
                const isActive = entitlementStatus === tab.value;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => {
                      setEntitlementStatus(tab.value);
                      setEntitlementPage(1);
                    }}
                    className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer transition-all shadow-2xs ${
                      isActive
                        ? "bg-slate-900 text-white"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <label className="relative block">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={entitlementSearchInput}
                onChange={(e) => setEntitlementSearchInput(e.target.value)}
                placeholder="Tìm email hoặc họ tên học viên..."
                className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-xs font-medium text-slate-800 placeholder:text-slate-400 lg:w-80 outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 shadow-2xs"
              />
            </label>
          </div>

          {/* Entitlement Table */}
          <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-xs">
            {subscriptionsQuery.isLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-slate-400 size-6" />
              </div>
            ) : subscriptionsQuery.isError ? (
              <div className="p-8 text-center text-rose-700">
                <AlertCircle className="mx-auto mb-2 size-8" />
                Không thể tải danh sách quyền học viên.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100/75 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                        <th className="px-5 py-3">Học viên</th>
                        <th className="px-5 py-3">Gói</th>
                        <th className="px-5 py-3">Trạng thái</th>
                        <th className="px-5 py-3">Hiệu lực</th>
                        <th className="px-5 py-3">Còn lại</th>
                        <th className="px-5 py-3">Nguồn cấp</th>
                        <th className="px-5 py-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {entitlementRows.map((item) => {
                        const isActive = item.status === "ACTIVE";
                        return (
                          <tr
                            key={item.id}
                            className="hover:bg-slate-50/70 transition"
                          >
                            {/* Learner */}
                            <td className="px-5 py-3.5">
                              <div className="font-bold text-slate-950">
                                {item.userFullName || "Chưa đặt tên"}
                              </div>
                              <div className="text-xs text-slate-500 font-mono">
                                {item.userEmail}
                              </div>
                            </td>

                            {/* Plan */}
                            <td className="px-5 py-3.5 font-semibold text-slate-800">
                              {item.planDisplayName}
                            </td>

                            {/* Status */}
                            <td className="px-5 py-3.5">
                              <EntitlementStatusBadge status={item.status} />
                            </td>

                            {/* Validity */}
                            <td className="px-5 py-3.5 text-xs text-slate-600 whitespace-nowrap font-mono">
                              <div>{dateOnly(item.startsAt)}</div>
                              <div className="text-slate-500">
                                đến {dateOnly(item.endsAt)}
                              </div>
                            </td>

                            {/* Remaining Days */}
                            <td className="px-5 py-3.5 text-xs">
                              {isActive ? (
                                <span className="font-bold text-emerald-700 font-mono">
                                  Còn {item.remainingDays} ngày
                                </span>
                              ) : item.status === "REVOKED" ? (
                                <span className="text-slate-500 font-medium">
                                  Đã thu hồi
                                </span>
                              ) : (
                                <span className="text-slate-500 font-medium">
                                  Đã hết hạn
                                </span>
                              )}
                            </td>

                            {/* Source */}
                            <td className="px-5 py-3.5">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                                  item.source === "PAYMENT"
                                    ? "bg-sky-50 text-sky-700 border-sky-200/80"
                                    : "bg-blue-50 text-blue-700 border-blue-200/80"
                                }`}
                              >
                                {item.source === "PAYMENT"
                                  ? "Thanh toán"
                                  : "Admin tặng"}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="px-5 py-3.5 text-right">
                              <div className="inline-flex items-center justify-end gap-3 font-semibold text-xs">
                                <button
                                  type="button"
                                  onClick={() => setHistoryTarget(item)}
                                  className="text-slate-600 hover:text-slate-950 transition active:scale-[0.98] cursor-pointer"
                                  title="Xem lịch sử kiểm toán"
                                >
                                  Lịch sử
                                </button>

                                {isActive ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => setExtendTarget(item)}
                                      className="text-slate-600 hover:text-slate-950 transition active:scale-[0.98] cursor-pointer"
                                      title="Gia hạn thêm ngày"
                                    >
                                      Gia hạn
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setRevokeTarget(item)}
                                      className="text-rose-600 hover:text-rose-700 transition active:scale-[0.98] cursor-pointer"
                                      title="Thu hồi quyền gói"
                                    >
                                      Thu hồi
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setGrantPreselectedLearner({
                                        id: item.userId,
                                        email: item.userEmail,
                                        fullName: item.userFullName,
                                      });
                                      setIsGrantOpen(true);
                                    }}
                                    className="text-slate-600 hover:text-slate-950 transition active:scale-[0.98] cursor-pointer"
                                    title="Tặng lại gói mới"
                                  >
                                    Tặng gói
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {entitlementRows.length === 0 && (
                  <div className="py-14 text-center text-sm font-medium text-slate-500">
                    Không có quyền học viên nào phù hợp bộ lọc.
                  </div>
                )}

                <div className="border-t border-slate-200/80 p-4">
                  {subscriptionsQuery.data && (
                    <Pagination
                      currentPage={subscriptionsQuery.data.page}
                      totalPages={subscriptionsQuery.data.totalPages}
                      onPageChange={setEntitlementPage}
                    />
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {/* ===================== TAB 2: GIAO DỊCH ===================== */}
      {mainTab === "TRANSACTIONS" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {transactionTabs.map((tab) => {
                const isActive = tab.value === purchaseStatus;
                return (
                  <button
                    key={tab.label}
                    type="button"
                    onClick={() => {
                      setPurchaseStatus(tab.value);
                      setPurchasePage(1);
                    }}
                    className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer transition-all shadow-2xs ${
                      isActive
                        ? "bg-slate-900 text-white"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <label className="relative block">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={purchaseSearchInput}
                onChange={(event) => setPurchaseSearchInput(event.target.value)}
                placeholder="Tìm email hoặc mã chuyển khoản"
                className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-xs font-medium text-slate-800 placeholder:text-slate-400 lg:w-80 outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 shadow-2xs"
              />
            </label>
          </div>

          <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-xs">
            {purchasesQuery.isLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-slate-400 size-6" />
              </div>
            ) : purchasesQuery.isError ? (
              <div className="p-8 text-center text-rose-700">
                <AlertCircle className="mx-auto mb-2 size-8" />
                Không thể tải giao dịch gói nâng cấp.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100/75 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                        <th className="px-5 py-3">Học viên</th>
                        <th className="px-5 py-3">Gói</th>
                        <th className="px-5 py-3">Mã giao dịch</th>
                        <th className="px-5 py-3 text-right">Giá trị</th>
                        <th className="px-5 py-3">Trạng thái</th>
                        <th className="px-5 py-3">Tạo lúc</th>
                        <th className="px-5 py-3 text-right">Chi tiết</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {purchaseRows.map((item) => (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/70 transition"
                        >
                          <td className="px-5 py-3.5 font-bold text-slate-950 font-mono text-xs">
                            {item.userEmail}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="font-semibold text-slate-800">
                              {item.planDisplayName}
                            </div>
                            <div className="text-xs text-slate-500 font-mono">
                              {item.durationDays} ngày
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-600 font-mono">
                            {item.payment.transferCode}
                          </td>
                          <td className="px-5 py-3.5 text-right tabular-nums font-bold text-slate-950 font-mono">
                            {money(item.amountVnd)}
                          </td>
                          <td className="px-5 py-3.5">
                            <TransactionStatusBadge item={item} />
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-600 font-mono">
                            {dateTime(item.createdAt)}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedPurchaseId(item.id)}
                              className="text-xs font-semibold text-slate-700 hover:text-slate-950 transition active:scale-[0.98] cursor-pointer"
                            >
                              Xem
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {purchaseRows.length === 0 && (
                  <div className="py-14 text-center text-sm font-medium text-slate-500">
                    Không có giao dịch phù hợp.
                  </div>
                )}
                <div className="border-t border-slate-200/80 p-4">
                  {purchasesQuery.data && (
                    <Pagination
                      currentPage={purchasesQuery.data.page}
                      totalPages={purchasesQuery.data.totalPages}
                      onPageChange={setPurchasePage}
                    />
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {/* Selected Transaction Detail Modal */}
      {selectedPurchaseId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <section className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Chi tiết giao dịch gói
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Thông tin đối soát và quyền truy cập đã kích hoạt.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPurchaseId(null)}
                className="text-sm text-slate-500 hover:text-slate-800"
              >
                Đóng
              </button>
            </div>
            {purchaseDetail.isLoading ? (
              <Loader2 className="mx-auto my-12 animate-spin" />
            ) : (
              selectedPurchase && (
                <div className="mt-6 space-y-4 text-sm">
                  <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4">
                    <div>
                      <p className="text-xs text-slate-500">Học viên</p>
                      <p className="font-medium">
                        {selectedPurchase.userEmail}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Trạng thái</p>
                      <TransactionStatusBadge item={selectedPurchase} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Gói</p>
                      <p className="font-medium">
                        {selectedPurchase.planDisplayName} ·{" "}
                        {selectedPurchase.durationDays} ngày
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Giá trị</p>
                      <p className="font-medium">
                        {money(selectedPurchase.amountVnd)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Mã chuyển khoản</p>
                      <p className="font-mono">
                        {selectedPurchase.payment.transferCode}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Hoàn tất</p>
                      <p>{dateTime(selectedPurchase.completedAt)}</p>
                    </div>
                  </div>
                  {selectedPurchase.payment.rejectionReason && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-800">
                      Lý do từ chối: {selectedPurchase.payment.rejectionReason}
                    </div>
                  )}
                  <p className="text-xs text-slate-500">
                    Nguồn xác nhận:{" "}
                    {selectedPurchase.confirmedById
                      ? "Quản trị viên"
                      : selectedPurchase.payment.status === "CONFIRMED"
                        ? "Tự động/PayOS"
                        : "Chưa xác nhận"}
                  </p>
                  <div className="flex justify-end gap-2 border-t pt-4">
                    {canReject(selectedPurchase) && (
                      <button
                        type="button"
                        onClick={() => setRejectingPurchase(selectedPurchase)}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 cursor-pointer"
                      >
                        <XCircle size={16} /> Từ chối
                      </button>
                    )}
                    {canConfirm(selectedPurchase) && (
                      <button
                        type="button"
                        disabled={confirmPurchaseMutation.isPending}
                        onClick={() =>
                          confirmPurchaseMutation.mutate(selectedPurchase.id)
                        }
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 cursor-pointer"
                      >
                        <CheckCircle2 size={16} /> Xác nhận & kích hoạt
                      </button>
                    )}
                  </div>
                </div>
              )
            )}
          </section>
        </div>
      )}

      {/* Reject Purchase Dialog */}
      {rejectingPurchase && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (rejectReason.trim()) {
                rejectPurchaseMutation.mutate({
                  id: rejectingPurchase.id,
                  note: rejectReason.trim(),
                });
              }
            }}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2 className="text-lg font-bold">Từ chối giao dịch</h2>
            <p className="mt-1 text-sm text-slate-500">
              Lý do sẽ được lưu cùng giao dịch của {rejectingPurchase.userEmail}
              .
            </p>
            <textarea
              required
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              className="mt-4 min-h-28 w-full rounded-lg border border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              placeholder="Nhập lý do từ chối"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectingPurchase(null)}
                className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={
                  rejectPurchaseMutation.isPending || !rejectReason.trim()
                }
                className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60 cursor-pointer"
              >
                Xác nhận từ chối
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===================== SUBSCRIPTION ENTITLEMENT MODALS ===================== */}
      <AdminGrantModal
        isOpen={isGrantOpen}
        onClose={() => {
          setIsGrantOpen(false);
          setGrantPreselectedLearner(null);
        }}
        onSuccess={refreshEntitlements}
        preselectedLearner={grantPreselectedLearner}
      />

      <AdminExtendModal
        subscription={extendTarget}
        isOpen={!!extendTarget}
        onClose={() => setExtendTarget(null)}
        onSuccess={refreshEntitlements}
      />

      <AdminRevokeModal
        subscription={revokeTarget}
        isOpen={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onSuccess={refreshEntitlements}
      />

      <AdminHistoryModal
        subscription={historyTarget}
        isOpen={!!historyTarget}
        onClose={() => setHistoryTarget(null)}
      />
    </main>
  );
}
