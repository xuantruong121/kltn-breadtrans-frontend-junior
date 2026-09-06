"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Copy,
  Check,
  CreditCard,
  QrCode,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  paymentService,
  StudentPaymentDetail,
} from "@/lib/api/services/payment.service";
import { getApiErrorMessage } from "@/lib/utils/apiError";

interface PaymentDetailModalProps {
  paymentId: number | null;
  onClose: () => void;
  onReportSuccess?: () => void;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string; icon: React.ReactNode }
> = {
  PENDING: {
    label: "Chờ chuyển khoản",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
    icon: <Clock size={16} className="text-amber-700" />,
  },
  REPORTED: {
    label: "Đã báo chuyển khoản — Chờ xác nhận",
    badgeClass: "bg-sky-100 text-sky-800 border-sky-300",
    icon: <Clock size={16} className="text-sky-700" />,
  },
  CONFIRMED: {
    label: "Đã xác nhận thanh toán",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
    icon: <CheckCircle2 size={16} className="text-emerald-700" />,
  },
  REJECTED: {
    label: "Thanh toán bị từ chối",
    badgeClass: "bg-rose-100 text-rose-800 border-rose-300",
    icon: <XCircle size={16} className="text-rose-700" />,
  },
  REVIEW_REQUIRED: {
    label: "Cần xử lý thêm",
    badgeClass: "bg-purple-100 text-purple-800 border-purple-300",
    icon: <AlertCircle size={16} className="text-purple-700" />,
  },
};

export const PaymentDetailModal: React.FC<PaymentDetailModalProps> = ({
  paymentId,
  onClose,
  onReportSuccess,
}) => {
  const queryClient = useQueryClient();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showConfirmReport, setShowConfirmReport] = useState(false);

  const {
    data: payment,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["payment-detail", paymentId],
    queryFn: () => paymentService.getPaymentById(paymentId!),
    enabled: !!paymentId,
  });

  const reportMutation = useMutation({
    mutationFn: () => paymentService.reportTransfer(paymentId!),
    onSuccess: (updatedPayment: StudentPaymentDetail) => {
      toast.success(
        "Báo chuyển khoản thành công! Trung tâm sẽ đối soát và kích hoạt lớp học cho bạn.",
      );
      setShowConfirmReport(false);
      queryClient.invalidateQueries({ queryKey: ["my-payments"] });
      queryClient.invalidateQueries({ queryKey: ["my-enrolled-classes"] });
      queryClient.setQueryData(["payment-detail", paymentId], updatedPayment);
      onReportSuccess?.();
    },
    onError: (err: any) => {
      const msg = getApiErrorMessage(
        err,
        "Không thể báo chuyển khoản. Vui lòng thử lại.",
      );
      toast.error(msg);
      if (err?.response?.status === 409) {
        queryClient.invalidateQueries({ queryKey: ["my-payments"] });
        queryClient.invalidateQueries({ queryKey: ["payment-detail", paymentId] });
      }
    },
  });

  const handleCopy = async (text: string, fieldName: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedField(fieldName);
      toast.success(`Đã sao chép ${fieldName}`);
      setTimeout(() => setCopiedField(null), 2500);
    } catch {
      toast.error("Không thể sao chép");
    }
  };

  if (!paymentId) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Modal Header */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-sky-100 text-sky-700">
                <CreditCard size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Thông tin thanh toán học phí
                </h2>
                <p className="text-xs text-slate-500">
                  Mã thanh toán: #{paymentId}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 overflow-y-auto space-y-5 flex-1">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-3">
                <Loader2 className="animate-spin text-sky-600" size={36} />
                <p className="text-sm text-slate-500 font-medium">
                  Đang tải thông tin thanh toán...
                </p>
              </div>
            ) : isError || !payment ? (
              <div className="p-6 text-center space-y-3">
                <AlertCircle size={40} className="text-rose-500 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">
                  Không thể tải thông tin thanh toán
                </h3>
                <p className="text-sm text-slate-500">
                  Thanh toán không tồn tại hoặc bạn không có quyền truy cập.
                </p>
              </div>
            ) : (
              <>
                {/* Course & Class Context */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  <p className="text-xs font-semibold text-sky-600 uppercase tracking-wide">
                    {payment.class?.course?.title || "Khóa học"}
                  </p>
                  <h3 className="text-base font-bold text-slate-800 mt-0.5">
                    {payment.class?.name || "Lớp học"}
                  </h3>
                  <div className="mt-3 flex items-center justify-between pt-3 border-t border-slate-200/60">
                    <span className="text-xs text-slate-500">
                      Trạng thái thanh toán:
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                        STATUS_CONFIG[payment.status]?.badgeClass ||
                        "bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {STATUS_CONFIG[payment.status]?.icon}
                      {STATUS_CONFIG[payment.status]?.label || payment.status}
                    </span>
                  </div>
                </div>

                {/* Bank Instructions Card */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Hướng dẫn chuyển khoản ngân hàng
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* VietQR Section */}
                    {payment.bankInstructions?.vietQrUrl && (
                      <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                        <img
                          src={payment.bankInstructions.vietQrUrl}
                          alt="Mã VietQR chuyển khoản"
                          className="w-48 h-48 object-contain rounded-xl border border-slate-200 bg-white p-2 shadow-xs"
                          loading="lazy"
                        />
                        <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1 font-medium">
                          <QrCode size={13} className="text-sky-600" />
                          Quét mã QR bằng App ngân hàng
                        </p>
                      </div>
                    )}

                    {/* Transfer Details Form */}
                    <div className="space-y-2.5">
                      {/* Amount */}
                      <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-amber-900 font-medium">
                            Số tiền cần chuyển:
                          </span>
                          <span className="text-base font-extrabold text-amber-700">
                            {new Intl.NumberFormat("vi-VN").format(
                              payment.amountVnd,
                            )}{" "}
                            đ
                          </span>
                        </div>
                      </div>

                      {/* Bank Name */}
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                        <span className="text-slate-500 block text-[11px]">
                          Ngân hàng:
                        </span>
                        <span className="font-bold text-slate-800">
                          {payment.bankInstructions?.bankName} (Mã BIN:{" "}
                          {payment.bankInstructions?.bin})
                        </span>
                      </div>

                      {/* Account Number */}
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                        <div>
                          <span className="text-slate-500 block text-[11px]">
                            Số tài khoản:
                          </span>
                          <span className="font-bold text-slate-800 text-sm tracking-wider">
                            {payment.bankInstructions?.accountNumber}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(
                              payment.bankInstructions?.accountNumber || "",
                              "Số tài khoản",
                            )
                          }
                          className="p-1.5 rounded-md hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                          title="Sao chép số tài khoản"
                        >
                          {copiedField === "Số tài khoản" ? (
                            <Check size={15} className="text-emerald-600" />
                          ) : (
                            <Copy size={15} />
                          )}
                        </button>
                      </div>

                      {/* Account Holder Name */}
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                        <span className="text-slate-500 block text-[11px]">
                          Chủ tài khoản:
                        </span>
                        <span className="font-bold text-slate-800 uppercase">
                          {payment.bankInstructions?.accountName}
                        </span>
                      </div>

                      {/* Transfer Code */}
                      <div className="p-2.5 rounded-lg bg-sky-50/70 border border-sky-200 text-xs flex items-center justify-between">
                        <div>
                          <span className="text-sky-800 font-medium block text-[11px]">
                            Nội dung chuyển khoản (bắt buộc):
                          </span>
                          <span className="font-extrabold text-sky-900 text-sm tracking-wider">
                            {payment.transferCode}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(
                              payment.transferCode,
                              "Nội dung chuyển khoản",
                            )
                          }
                          className="p-1.5 rounded-md hover:bg-sky-200 text-sky-700 transition-colors flex items-center gap-1 cursor-pointer"
                          title="Sao chép nội dung chuyển khoản"
                        >
                          {copiedField === "Nội dung chuyển khoản" ? (
                            <Check size={15} className="text-emerald-600" />
                          ) : (
                            <Copy size={15} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 italic">
                    * Vui lòng nhập chính xác nội dung chuyển khoản{" "}
                    <strong className="text-slate-600">
                      {payment.transferCode}
                    </strong>{" "}
                    để hệ thống có thể đối soát và kích hoạt lớp học nhanh nhất.
                  </p>
                </div>

                {/* Status Notice or Report Action */}
                {payment.status === "PENDING" ? (
                  <div className="pt-2">
                    {!showConfirmReport ? (
                      <button
                        type="button"
                        onClick={() => setShowConfirmReport(true)}
                        className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                      >
                        <CheckCircle2 size={18} />
                        Tôi đã chuyển khoản
                      </button>
                    ) : (
                      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
                        <div className="flex items-start gap-2.5">
                          <AlertCircle
                            size={18}
                            className="text-amber-600 flex-shrink-0 mt-0.5"
                          />
                          <p className="text-xs text-amber-900 leading-relaxed font-medium">
                            Bạn xác nhận đã hoàn tất giao dịch chuyển khoản{" "}
                            <strong>
                              {new Intl.NumberFormat("vi-VN").format(
                                payment.amountVnd,
                              )}{" "}
                              đ
                            </strong>{" "}
                            với nội dung{" "}
                            <strong>{payment.transferCode}</strong>?
                          </p>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setShowConfirmReport(false)}
                            disabled={reportMutation.isPending}
                            className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            Hủy bỏ
                          </button>
                          <button
                            type="button"
                            onClick={() => reportMutation.mutate()}
                            disabled={reportMutation.isPending}
                            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            {reportMutation.isPending ? (
                              <>
                                <Loader2 size={14} className="animate-spin" />
                                Đang gửi...
                              </>
                            ) : (
                              "Xác nhận đã chuyển"
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : payment.status === "REPORTED" ? (
                  <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 flex items-start gap-3">
                    <Clock
                      size={18}
                      className="text-sky-600 flex-shrink-0 mt-0.5"
                    />
                    <div className="text-xs text-sky-900 space-y-0.5">
                      <p className="font-bold">
                        Đã thông báo chuyển khoản thành công!
                      </p>
                      <p className="text-sky-700 leading-relaxed">
                        Thời gian báo:{" "}
                        {payment.reportedAt
                          ? new Date(payment.reportedAt).toLocaleString("vi-VN")
                          : "Vừa xong"}
                        . Ban Quản Trị đang đối soát và sẽ kích hoạt lớp học cho bạn
                        sớm nhất.
                      </p>
                    </div>
                  </div>
                ) : payment.status === "CONFIRMED" ? (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                    <CheckCircle2
                      size={18}
                      className="text-emerald-600 flex-shrink-0 mt-0.5"
                    />
                    <div className="text-xs text-emerald-900 space-y-0.5">
                      <p className="font-bold">
                        Khoản thanh toán đã được xác nhận!
                      </p>
                      <p className="text-emerald-700 leading-relaxed">
                        Lớp học đã được kích hoạt. Bạn có thể vào học ngay bây giờ.
                      </p>
                    </div>
                  </div>
                ) : payment.status === "REJECTED" ? (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
                    <XCircle
                      size={18}
                      className="text-rose-600 flex-shrink-0 mt-0.5"
                    />
                    <div className="text-xs text-rose-900 space-y-0.5">
                      <p className="font-bold">Khoản thanh toán bị từ chối.</p>
                      <p className="text-rose-700 leading-relaxed">
                        Vui lòng liên hệ ban quản trị để được hỗ trợ kiểm tra lại
                        thông tin giao dịch.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 flex items-start gap-3">
                    <AlertCircle
                      size={18}
                      className="text-purple-600 flex-shrink-0 mt-0.5"
                    />
                    <div className="text-xs text-purple-900 space-y-0.5">
                      <p className="font-bold">Cần xử lý thêm.</p>
                      <p className="text-purple-700 leading-relaxed">
                        Khoản thanh toán đang được xem xét đặc biệt. Vui lòng liên
                        hệ bộ phận hỗ trợ.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
