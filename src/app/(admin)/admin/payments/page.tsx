"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import {
  paymentService,
  PaymentStatus,
  AdminPaymentItem,
} from "@/lib/api/services/payment.service";
import { AdminPaymentDetailModal } from "@/modules/admin/payments/components/AdminPaymentDetailModal";
import { RejectPaymentDialog } from "@/modules/admin/payments/components/RejectPaymentDialog";
import { Pagination } from "@/components/ui";
import {
  Search,
  Loader2,
  CreditCard,
  Eye,
  Ban,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

type FilterTab = "REPORTED" | "ALL" | "PENDING" | "CONFIRMED" | "REJECTED" | "REVIEW_REQUIRED";

const TABS: { id: FilterTab; label: string; status?: PaymentStatus }[] = [
  { id: "REPORTED", label: "Chờ đối soát", status: "REPORTED" },
  { id: "ALL", label: "Tất cả" },
  { id: "PENDING", label: "Chờ chuyển khoản", status: "PENDING" },
  { id: "CONFIRMED", label: "Đã xác nhận", status: "CONFIRMED" },
  { id: "REJECTED", label: "Đã từ chối", status: "REJECTED" },
  { id: "REVIEW_REQUIRED", label: "Cần xử lý thêm", status: "REVIEW_REQUIRED" },
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

const formatDate = (dateString?: string | null) => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const renderStatusBadge = (status: PaymentStatus) => {
  switch (status) {
    case "REPORTED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock size={12} /> Chờ đối soát
        </span>
      );
    case "CONFIRMED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 size={12} /> Đã xác nhận
        </span>
      );
    case "REJECTED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <Ban size={12} /> Đã từ chối
        </span>
      );
    case "REVIEW_REQUIRED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          <AlertCircle size={12} /> Cần xử lý thêm
        </span>
      );
    case "PENDING":
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          <Clock size={12} /> Chờ chuyển khoản
        </span>
      );
  }
};

export default function AdminPaymentsPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  // Teacher manual access protection
  useEffect(() => {
    if (user && user.role !== "ADMIN") {
      router.replace("/admin");
    }
  }, [user, router]);

  // Query states (Default view is REPORTED review queue)
  const [activeTab, setActiveTab] = useState<FilterTab>("REPORTED");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal states
  const [detailModalId, setDetailModalId] = useState<number | null>(null);
  const [rejectDialogTarget, setRejectDialogTarget] = useState<AdminPaymentItem | null>(null);

  // Debounce search by ~300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const selectedStatus = TABS.find((t) => t.id === activeTab)?.status;

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["admin-payments", selectedStatus, debouncedSearch, page, pageSize],
    queryFn: () =>
      paymentService.adminGetPayments({
        status: selectedStatus,
        search: debouncedSearch || undefined,
        page,
        limit: pageSize,
      }),
    enabled: !!user && user.role === "ADMIN",
  });

  if (!user || user.role !== "ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
        <ShieldAlert size={40} className="text-amber-500 mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Quyền truy cập bị từ chối</h2>
        <p className="text-sm text-slate-500 mt-1">
          Chỉ quản trị viên (Admin) mới có quyền truy cập trang đối soát thanh toán.
        </p>
      </div>
    );
  }

  const handleTabChange = (tabId: FilterTab) => {
    setActiveTab(tabId);
    setPage(1);
  };

  const payments = data?.items || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <CreditCard size={26} className="text-blue-600" />
            Đối Soát Thanh Toán
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Hàng đợi kiểm tra biên lai và đối soát chuyển khoản học phí của học viên
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw size={14} className={isFetching ? "animate-spin text-blue-600" : ""} />
          Làm mới
        </button>
      </div>

      {/* Tabs & Search Controls */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-blue-600 text-white shadow-xs shadow-blue-500/20"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[260px] sm:min-w-[320px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm theo mã GD, tên hoặc email..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 size={32} className="animate-spin mb-3 text-blue-600" />
            <p className="text-sm font-medium">Đang tải danh sách thanh toán...</p>
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-rose-700 bg-rose-50/50">
            <AlertCircle size={32} className="mx-auto mb-2 text-rose-600" />
            <p className="font-semibold text-sm">Không thể tải danh sách thanh toán</p>
            <p className="text-xs mt-1 text-rose-600">
              {(error as any)?.response?.data?.message || "Vui lòng kiểm tra lại kết nối máy chủ."}
            </p>
          </div>
        ) : payments.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <CreditCard size={36} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">Không có giao dịch nào phù hợp</p>
            <p className="text-xs text-slate-400 mt-1">
              {activeTab === "REPORTED"
                ? "Hàng đợi kiểm tra hiện tại trống. Không có học viên nào đang chờ đối soát."
                : debouncedSearch
                ? `Không tìm thấy kết quả nào cho "${debouncedSearch}".`
                : "Chưa có dữ liệu thanh toán trong bộ lọc này."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Mã Chuyển Khoản</th>
                  <th className="py-3 px-4">Học Viên</th>
                  <th className="py-3 px-4">Khóa Học & Lớp</th>
                  <th className="py-3 px-4 text-right">Số Tiền (Snapshot)</th>
                  <th className="py-3 px-4 text-center">Trạng Thái</th>
                  <th className="py-3 px-4">Thời Gian Báo</th>
                  <th className="py-3 px-4 text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {payments.map((p) => {
                  const isReported = p.status === "REPORTED";
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      {/* Transfer Code */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 select-all">
                        {p.transferCode}
                      </td>

                      {/* Student Info */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {p.student.fullName || "—"}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {p.student.email}
                        </div>
                      </td>

                      {/* Course / Class */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800 line-clamp-1">
                          {p.class.name}
                        </div>
                        <div className="text-[11px] text-slate-400 line-clamp-1">
                          {p.class.course.title}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {formatCurrency(p.amountVnd)}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4 text-center">
                        {renderStatusBadge(p.status)}
                      </td>

                      {/* Reported At */}
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {formatDate(p.reportedAt || p.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Detail Button */}
                          <button
                            type="button"
                            onClick={() => setDetailModalId(p.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:text-blue-600 transition-colors cursor-pointer"
                            title="Xem chi tiết đối soát"
                          >
                            <Eye size={13} /> Chi tiết
                          </button>

                          {/* Reject Button (Only REPORTED payments can be rejected) */}
                          {isReported && (
                            <button
                              type="button"
                              onClick={() => setRejectDialogTarget(p)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-md shadow-2xs transition-colors cursor-pointer"
                              title="Từ chối thanh toán này"
                            >
                              <Ban size={13} /> Từ chối
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
        )}

        {/* Pagination Controls */}
        {pagination && pagination.totalPages > 0 && (
          <div className="p-4 border-t border-slate-100">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              pageSize={pagination.limit}
              onPageChange={(newPage) => setPage(newPage)}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
            />
          </div>
        )}
      </div>

      {/* Admin Payment Detail Modal */}
      <AdminPaymentDetailModal
        paymentId={detailModalId}
        isOpen={!!detailModalId}
        onClose={() => setDetailModalId(null)}
      />

      {/* Reject Payment Dialog */}
      {rejectDialogTarget && (
        <RejectPaymentDialog
          paymentId={rejectDialogTarget.id}
          transferCode={rejectDialogTarget.transferCode}
          isOpen={!!rejectDialogTarget}
          onClose={() => setRejectDialogTarget(null)}
        />
      )}
    </div>
  );
}
