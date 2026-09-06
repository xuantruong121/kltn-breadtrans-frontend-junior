"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { paymentService, PaymentStatus } from "@/lib/api/services/payment.service";
import { RejectPaymentDialog } from "./RejectPaymentDialog";
import {
  X,
  Loader2,
  Calendar,
  CreditCard,
  User,
  GraduationCap,
  Building2,
  Clock,
  Ban,
  CheckCircle2,
  AlertCircle,
  QrCode,
} from "lucide-react";
import Image from "next/image";

interface AdminPaymentDetailModalProps {
  paymentId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

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

const getStatusBadge = (status: PaymentStatus) => {
  switch (status) {
    case "REPORTED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock size={13} /> Chờ đối soát
        </span>
      );
    case "CONFIRMED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 size={13} /> Đã xác nhận
        </span>
      );
    case "REJECTED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <Ban size={13} /> Đã từ chối
        </span>
      );
    case "REVIEW_REQUIRED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          <AlertCircle size={13} /> Cần xử lý thêm
        </span>
      );
    case "PENDING":
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          <Clock size={13} /> Chờ chuyển khoản
        </span>
      );
  }
};

export const AdminPaymentDetailModal: React.FC<AdminPaymentDetailModalProps> = ({
  paymentId,
  isOpen,
  onClose,
}) => {
  const [isRejectOpen, setIsRejectOpen] = useState(false);

  const {
    data: detail,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["admin-payment-detail", paymentId],
    queryFn: () => paymentService.adminGetPaymentDetail(paymentId!),
    enabled: isOpen && !!paymentId,
  });

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                <CreditCard size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Chi tiết đối soát thanh toán #{paymentId}
                </h3>
                <p className="text-xs text-slate-500">
                  Xem xét thông tin giao dịch, học viên và đối chiếu tài khoản
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Loader2 size={32} className="animate-spin mb-3 text-blue-600" />
                <p className="text-sm font-medium">Đang tải chi tiết thanh toán...</p>
              </div>
            ) : isError || !detail ? (
              <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-center text-rose-800">
                <AlertCircle size={32} className="mx-auto mb-2 text-rose-600" />
                <p className="font-semibold">Không thể tải thông tin thanh toán</p>
                <p className="text-xs mt-1 text-rose-600">
                  {(error as any)?.response?.data?.message || "Dữ liệu không tồn tại hoặc đã bị xóa."}
                </p>
              </div>
            ) : (
              <>
                {/* Status Bar */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Trạng thái hiện tại:
                    </span>
                    {getStatusBadge(detail.status)}
                  </div>
                  <div className="text-xs text-slate-500">
                    Cập nhật lần cuối: <span className="font-medium">{formatDate(detail.updatedAt)}</span>
                  </div>
                </div>

                {/* Section A: Financial Snapshot */}
                <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-xs">
                  <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
                    <CreditCard size={18} className="text-blue-600" />
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                      A. Snapshot Tài Chính (Dữ liệu gốc hóa đơn)
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                      <span className="text-xs text-slate-500 font-medium block mb-1">
                        Số tiền thanh toán (Snapshot)
                      </span>
                      <span className="text-xl font-black text-blue-700">
                        {formatCurrency(detail.amountVnd)}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-xs text-slate-500 font-medium block mb-1">
                        Mã chuyển khoản (Transfer Code)
                      </span>
                      <span className="font-mono font-bold text-base text-slate-900 select-all">
                        {detail.transferCode}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block mb-0.5">Ngày tạo hóa đơn:</span>
                      <span className="text-sm font-medium text-slate-800">
                        {formatDate(detail.createdAt)}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block mb-0.5">Học viên báo chuyển tiền lúc:</span>
                      <span className="text-sm font-medium text-slate-800">
                        {formatDate(detail.reportedAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section B: Student & Enrollment */}
                <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-xs">
                  <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
                    <User size={18} className="text-emerald-600" />
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                      B. Thông tin Học Viên & Ghi Danh
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-xs text-slate-500 block mb-0.5">Họ và tên:</span>
                      <span className="font-semibold text-slate-900">
                        {detail.student.fullName || "Chưa cập nhật"}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block mb-0.5">Email liên hệ:</span>
                      <span className="text-slate-800 font-mono text-xs">{detail.student.email}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block mb-0.5">Số điện thoại:</span>
                      <span className="text-slate-800">{detail.student.phone || "—"}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block mb-0.5">Trạng thái ghi danh:</span>
                      <span className="inline-block px-2 py-0.5 text-xs rounded font-semibold bg-slate-100 text-slate-700">
                        {detail.enrollment.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section C: Current Class Reference */}
                <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-xs">
                  <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
                    <GraduationCap size={18} className="text-purple-600" />
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                      C. Khóa Học & Lớp Học
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-xs text-slate-500 block mb-0.5">Khóa học:</span>
                      <span className="font-semibold text-slate-900">{detail.class.course.title}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block mb-0.5">Lớp học:</span>
                      <span className="font-semibold text-slate-900">{detail.class.name}</span>
                    </div>
                    <div className="sm:col-span-2 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                      <span className="text-slate-500 block mb-1">
                        Học phí niêm yết hiện tại của lớp (Giá tham chiếu danh mục):
                      </span>
                      <span className="font-bold text-slate-700 text-sm">
                        {formatCurrency(detail.class.tuitionFeeVnd)}
                      </span>
                      <span className="block mt-1 text-[11px] text-slate-400">
                        * Giá trị tham chiếu catalog hiện tại. Số tiền thanh toán thực tế của học viên căn cứ theo Snapshot Tài Chính ở mục A.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section D: Bank Transfer Context */}
                {detail.bankInstructions && (
                  <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-xs">
                    <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
                      <Building2 size={18} className="text-sky-600" />
                      <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                        D. Hướng Dẫn Chuyển Khoản & VietQR
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-slate-500 block">Ngân hàng:</span>
                          <span className="font-semibold text-slate-800 text-sm">
                            {detail.bankInstructions.bankName} (BIN: {detail.bankInstructions.bin})
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Số tài khoản:</span>
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            {detail.bankInstructions.accountNumber}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Chủ tài khoản:</span>
                          <span className="font-semibold text-slate-800">
                            {detail.bankInstructions.accountName}
                          </span>
                        </div>
                      </div>
                      {detail.bankInstructions.vietQrUrl && (
                        <div className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <Image
                            src={detail.bankInstructions.vietQrUrl}
                            alt="VietQR"
                            width={160}
                            height={160}
                            className="rounded-md border border-slate-200"
                            unoptimized
                          />
                          <span className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                            <QrCode size={12} /> Mã VietQR QuickLink
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Section E: Review History */}
                {(detail.reviewedBy || detail.adminNote || detail.reviewedAt) && (
                  <div className="border border-slate-200 rounded-xl p-5 bg-slate-50 shadow-xs">
                    <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-200">
                      <Clock size={18} className="text-slate-600" />
                      <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                        E. Lịch Sử Kiểm Tra & Đánh Giá
                      </h4>
                    </div>
                    <div className="space-y-3 text-xs">
                      {detail.reviewedBy && (
                        <div>
                          <span className="text-slate-500 block mb-0.5">Người kiểm tra:</span>
                          <span className="font-semibold text-slate-800">
                            {detail.reviewedBy.fullName || detail.reviewedBy.email} ({detail.reviewedBy.email})
                          </span>
                        </div>
                      )}
                      {detail.reviewedAt && (
                        <div>
                          <span className="text-slate-500 block mb-0.5">Thời gian kiểm tra:</span>
                          <span className="text-slate-800">{formatDate(detail.reviewedAt)}</span>
                        </div>
                      )}
                      {detail.adminNote && (
                        <div className="p-3 bg-white rounded-lg border border-slate-200">
                          <span className="text-slate-500 block mb-1 font-semibold">Ghi chú / Lý do từ chối:</span>
                          <p className="text-slate-800 text-sm whitespace-pre-wrap">{detail.adminNote}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/70">
            <div className="text-xs text-slate-500">
              {detail?.status === "REPORTED" && (
                <span className="text-amber-700 font-medium">
                  Đang trong hàng đợi kiểm tra (Review Queue)
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Đóng
              </button>
              {/* Only REPORTED exposes Reject button. No confirm button in Phase 3C-4 */}
              {detail && detail.status === "REPORTED" && (
                <button
                  type="button"
                  onClick={() => setIsRejectOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  <Ban size={16} /> Từ chối thanh toán
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reject Dialog */}
      {detail && (
        <RejectPaymentDialog
          paymentId={detail.id}
          transferCode={detail.transferCode}
          isOpen={isRejectOpen}
          onClose={() => setIsRejectOpen(false)}
        />
      )}
    </>
  );
};
