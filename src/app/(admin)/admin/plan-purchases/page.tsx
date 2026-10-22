"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Award,
  CalendarPlus,
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  History,
  Loader2,
  Plus,
  Receipt,
  Search,
  ShieldCheck,
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

const entitlementTabs: Array<{ label: string; value: AdminSubscriptionStatusFilter }> = [
  { label: "Đang hoạt động", value: "ACTIVE" },
  { label: "Tất cả", value: "ALL" },
  { label: "Đã hết hạn", value: "EXPIRED" },
  { label: "Đã thu hồi", value: "REVOKED" },
];

const money = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

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
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "REJECTED"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : status === "REPORTED" || status === "REVIEW_REQUIRED"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-slate-100 text-slate-700 border-slate-200";
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
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style}`}
    >
      {text[status] ?? status}
    </span>
  );
}

function EntitlementStatusBadge({ status }: { status: "ACTIVE" | "EXPIRED" | "REVOKED" }) {
  switch (status) {
    case "ACTIVE":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
          <CheckCircle2 size={12} /> Đang hoạt động
        </span>
      );
    case "REVOKED":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
          <Ban size={12} /> Đã thu hồi
        </span>
      );
    case "EXPIRED":
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
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

  const [extendTarget, setExtendTarget] = useState<AdminSubscriptionItem | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<AdminSubscriptionItem | null>(null);
  const [historyTarget, setHistoryTarget] = useState<AdminSubscriptionItem | null>(null);

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
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<number | null>(null);
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

  return (
    <main className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* Top Header */}
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-950">
            <CreditCard className="text-orange-600" /> Gói nâng cấp
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Quản lý quyền học viên Pro và đối soát giao dịch mua gói nâng cấp.
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
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus size={16} /> Tặng gói Pro
          </button>
        )}
      </header>

      {/* Main Two-Tab Navigation */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          type="button"
          onClick={() => setMainTab("ENTITLEMENTS")}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            mainTab === "ENTITLEMENTS"
              ? "border-orange-600 text-orange-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <ShieldCheck size={18} />
          Quyền học viên
        </button>
        <button
          type="button"
          onClick={() => setMainTab("TRANSACTIONS")}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            mainTab === "TRANSACTIONS"
              ? "border-orange-600 text-orange-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Receipt size={18} />
          Giao dịch
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
                    className={`whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-semibold cursor-pointer transition-colors ${
                      isActive
                        ? "border-blue-600 bg-blue-600 text-white shadow-2xs"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <label className="relative block">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={entitlementSearchInput}
                onChange={(e) => setEntitlementSearchInput(e.target.value)}
                placeholder="Tìm email hoặc họ tên học viên..."
                className="h-10 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm lg:w-80 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </label>
          </div>

          {/* Entitlement Table */}
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {subscriptionsQuery.isLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-blue-600 size-8" />
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
                    <thead className="border-b bg-slate-50 text-xs font-semibold text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Học viên</th>
                        <th className="px-5 py-3">Gói</th>
                        <th className="px-5 py-3">Trạng thái</th>
                        <th className="px-5 py-3">Hiệu lực</th>
                        <th className="px-5 py-3">Còn lại</th>
                        <th className="px-5 py-3">Nguồn</th>
                        <th className="px-5 py-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {entitlementRows.map((item) => {
                        const isActive = item.status === "ACTIVE";
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/80">
                            {/* Learner */}
                            <td className="px-5 py-4">
                              <div className="font-semibold text-slate-900">
                                {item.userFullName || "Chưa đặt tên"}
                              </div>
                              <div className="text-xs text-slate-400 font-mono">
                                {item.userEmail}
                              </div>
                            </td>

                            {/* Plan */}
                            <td className="px-5 py-4">
                              <div className="font-medium text-slate-800">
                                {item.planDisplayName}
                              </div>
                            </td>

                            {/* Status */}
                            <td className="px-5 py-4">
                              <EntitlementStatusBadge status={item.status} />
                            </td>

                            {/* Validity */}
                            <td className="px-5 py-4 text-xs text-slate-600 whitespace-nowrap">
                              <div>{dateOnly(item.startsAt)}</div>
                              <div className="text-slate-400">đến {dateOnly(item.endsAt)}</div>
                            </td>

                            {/* Remaining Days */}
                            <td className="px-5 py-4 text-xs">
                              {isActive ? (
                                <span className="font-bold text-emerald-700">
                                  Còn {item.remainingDays} ngày
                                </span>
                              ) : item.status === "REVOKED" ? (
                                <span className="text-slate-400">Đã thu hồi</span>
                              ) : (
                                <span className="text-slate-400">Đã hết hạn</span>
                              )}
                            </td>

                            {/* Source */}
                            <td className="px-5 py-4">
                              {item.source === "PAYMENT" ? (
                                <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                                  Thanh toán
                                </span>
                              ) : (
                                <span className="inline-flex rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
                                  Admin tặng
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="px-5 py-4 text-right">
                              <div className="inline-flex items-center gap-1.5 justify-end">
                                <button
                                  type="button"
                                  onClick={() => setHistoryTarget(item)}
                                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                                  title="Xem lịch sử kiểm toán"
                                >
                                  <History size={13} /> Lịch sử
                                </button>

                                {isActive ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => setExtendTarget(item)}
                                      className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                                      title="Gia hạn thêm ngày"
                                    >
                                      <CalendarPlus size={13} /> Gia hạn
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setRevokeTarget(item)}
                                      className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 cursor-pointer"
                                      title="Thu hồi quyền Pro"
                                    >
                                      <Ban size={13} /> Thu hồi
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
                                    className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 cursor-pointer"
                                    title="Tặng lại gói Pro mới"
                                  >
                                    <Award size={13} /> Tặng gói
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
                  <div className="py-14 text-center text-sm text-slate-500">
                    Không có quyền học viên nào phù hợp bộ lọc.
                  </div>
                )}

                <div className="border-t p-4">
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
                    className={`whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-semibold cursor-pointer transition-colors ${
                      isActive
                        ? "border-orange-600 bg-orange-600 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <label className="relative block">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={purchaseSearchInput}
                onChange={(event) => setPurchaseSearchInput(event.target.value)}
                placeholder="Tìm email hoặc mã chuyển khoản"
                className="h-10 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm lg:w-80 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </label>
          </div>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {purchasesQuery.isLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-orange-600 size-8" />
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
                    <thead className="border-b bg-slate-50 text-xs font-semibold text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Học viên</th>
                        <th className="px-5 py-3">Gói</th>
                        <th className="px-5 py-3">Mã giao dịch</th>
                        <th className="px-5 py-3">Giá trị</th>
                        <th className="px-5 py-3">Trạng thái</th>
                        <th className="px-5 py-3">Tạo lúc</th>
                        <th className="px-5 py-3 text-right">Chi tiết</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {purchaseRows.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-5 py-4 font-medium text-slate-800">
                            {item.userEmail}
                          </td>
                          <td className="px-5 py-4">
                            <div className="font-medium">{item.planDisplayName}</div>
                            <div className="text-xs text-slate-500">
                              {item.durationDays} ngày
                            </div>
                          </td>
                          <td className="px-5 py-4 font-mono text-xs text-slate-600">
                            {item.payment.transferCode}
                          </td>
                          <td className="px-5 py-4 font-medium">
                            {money(item.amountVnd)}
                          </td>
                          <td className="px-5 py-4">
                            <TransactionStatusBadge item={item} />
                          </td>
                          <td className="px-5 py-4 text-xs text-slate-500">
                            {dateTime(item.createdAt)}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedPurchaseId(item.id)}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                              <Eye size={14} /> Xem
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {purchaseRows.length === 0 && (
                  <div className="py-14 text-center text-sm text-slate-500">
                    Không có giao dịch phù hợp.
                  </div>
                )}
                <div className="border-t p-4">
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
                      <p className="font-medium">{selectedPurchase.userEmail}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Trạng thái</p>
                      <TransactionStatusBadge item={selectedPurchase} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Gói</p>
                      <p className="font-medium">
                        {selectedPurchase.planDisplayName} · {selectedPurchase.durationDays} ngày
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Giá trị</p>
                      <p className="font-medium">{money(selectedPurchase.amountVnd)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Mã chuyển khoản</p>
                      <p className="font-mono">{selectedPurchase.payment.transferCode}</p>
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
                        onClick={() => confirmPurchaseMutation.mutate(selectedPurchase.id)}
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
              Lý do sẽ được lưu cùng giao dịch của {rejectingPurchase.userEmail}.
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
                disabled={rejectPurchaseMutation.isPending || !rejectReason.trim()}
                className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60 cursor-pointer"
              >
                Xác nhận từ chối
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===================== PRO ENTITLEMENT MODALS ===================== */}
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
