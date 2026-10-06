"use client";

import React, { useEffect, useRef, useState } from "react";
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
  planService,
  formatVnd,
  mapPlanPurchaseErrorMessage,
  PLAN_QUERY_KEYS,
  type PlanPurchase,
} from "@/lib/api/services/plan.service";
import { getPaymentStatusBadgeInfo, resolvePaymentPollingInterval } from "../planLogic";
import { useModalAccessibility } from "@/hooks/useModalAccessibility";

export interface PlanPaymentModalProps {
  purchaseId: number | null;
  onClose: () => void;
}

export const PlanPaymentModal: React.FC<PlanPaymentModalProps> = ({
  purchaseId,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showConfirmReport, setShowConfirmReport] = useState(false);
  const confirmedNotifiedRef = useRef(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useModalAccessibility({
    isOpen: !!purchaseId,
    onClose,
    modalRef,
  });

  useEffect(() => {
    confirmedNotifiedRef.current = false;
  }, [purchaseId]);

  const {
    data: purchase,
    isLoading,
    isError,
  } = useQuery({
    queryKey: PLAN_QUERY_KEYS.purchaseDetail(purchaseId || 0),
    queryFn: () => planService.getPurchaseById(purchaseId!),
    enabled: !!purchaseId,
    refetchInterval: (query) => {
      const current = query.state.data;
      // Controlled polling only while REPORTED: 5000ms, otherwise false
      return resolvePaymentPollingInterval(current?.payment?.status || current?.status);
    },
  });

  // Watch for confirmation transition to trigger subscription & vocab refetch
  useEffect(() => {
    if (
      purchase &&
      !confirmedNotifiedRef.current &&
      (purchase.payment?.status === "CONFIRMED" || purchase.status === "COMPLETED")
    ) {
      confirmedNotifiedRef.current = true;
      queryClient.invalidateQueries({ queryKey: PLAN_QUERY_KEYS.effectivePlan });
      queryClient.invalidateQueries({ queryKey: PLAN_QUERY_KEYS.vocabTopics });
      queryClient.invalidateQueries({ queryKey: PLAN_QUERY_KEYS.readingTopics });
      queryClient.invalidateQueries({ queryKey: PLAN_QUERY_KEYS.listeningPractices });
      queryClient.invalidateQueries({ queryKey: PLAN_QUERY_KEYS.speakingExercises });
      queryClient.invalidateQueries({ queryKey: PLAN_QUERY_KEYS.writingTopics });
      queryClient.invalidateQueries({ queryKey: PLAN_QUERY_KEYS.myPurchases });
    }
  }, [purchase, queryClient]);

  const reportMutation = useMutation({
    mutationFn: () => planService.reportTransfer(purchaseId!),
    onSuccess: (updated: PlanPurchase) => {
      toast.success("Đã gửi thông báo chuyển khoản! Vui lòng chờ quản trị viên xác nhận.");
      setShowConfirmReport(false);
      queryClient.invalidateQueries({ queryKey: PLAN_QUERY_KEYS.myPurchases });
      queryClient.setQueryData(PLAN_QUERY_KEYS.purchaseDetail(purchaseId || 0), updated);
    },
    onError: (err: any) => {
      const msg = mapPlanPurchaseErrorMessage(err, "Không thể gửi báo cáo chuyển khoản. Vui lòng thử lại.");
      toast.error(msg);
      if (err?.response?.status === 409) {
        queryClient.invalidateQueries({ queryKey: PLAN_QUERY_KEYS.myPurchases });
        queryClient.invalidateQueries({ queryKey: PLAN_QUERY_KEYS.purchaseDetail(purchaseId || 0) });
      }
    },
  });

  const handleCopy = async (text: string, fieldName: string) => {
    try {
      if (typeof navigator !== "undefined" && navigator?.clipboard?.writeText) {
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

  if (!purchaseId) return null;

  const paymentStatus = purchase?.payment?.status || purchase?.status || "PENDING";
  const statusInfo = getPaymentStatusBadgeInfo(paymentStatus);

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-modal-title"
        aria-describedby="payment-modal-desc"
      >
        <motion.div
          ref={modalRef}
          tabIndex={-1}
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-xl w-full max-h-[min(90dvh,calc(100dvh-3rem))] flex flex-col overflow-hidden outline-none"
        >
          {/* Modal Header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                <CreditCard size={22} aria-hidden="true" />
              </div>
              <div>
                <h2 id="payment-modal-title" className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  Thanh toán gói dịch vụ
                </h2>
                <p id="payment-modal-desc" className="text-xs text-slate-500 dark:text-slate-400">
                  Giao dịch: #{purchaseId}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng cửa sổ thanh toán"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 overflow-y-auto space-y-5 flex-1 min-h-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-3">
                <Loader2 className="animate-spin text-amber-600 dark:text-amber-400" size={36} />
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                  Đang tải thông tin chuyển khoản...
                </p>
              </div>
            ) : isError || !purchase ? (
              <div className="p-6 text-center space-y-3">
                <AlertCircle size={40} className="text-rose-500 mx-auto" />
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  Không thể tải thông tin thanh toán
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Giao dịch không tồn tại hoặc bạn không có quyền truy cập.
                </p>
              </div>
            ) : (
              <>
                {/* Plan Summary Card */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 dark:bg-slate-800/40 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                        {purchase.planDisplayName} (v{purchase.version})
                      </p>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                        Thời hạn: {purchase.durationDays} ngày
                      </h3>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusInfo.badgeClass}`}
                    >
                      {paymentStatus === "CONFIRMED" || paymentStatus === "COMPLETED" ? (
                        <CheckCircle2 size={14} className="text-emerald-600" />
                      ) : paymentStatus === "REPORTED" ? (
                        <Clock size={14} className="text-sky-600" />
                      ) : paymentStatus === "REJECTED" ? (
                        <XCircle size={14} className="text-rose-600" />
                      ) : (
                        <Clock size={14} className="text-amber-600" />
                      )}
                      {statusInfo.label}
                    </span>
                  </div>
                </div>

                {/* Bank Instructions Card */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Hướng dẫn chuyển khoản ngân hàng
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* VietQR Section */}
                    {purchase.bankInstructions?.vietQrUrl && (
                      <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 border border-slate-200 text-center dark:bg-slate-800/50 dark:border-slate-800">
                        <img
                          src={purchase.bankInstructions.vietQrUrl}
                          alt="Mã QR thanh toán VietQR"
                          className="w-48 h-48 object-contain rounded-xl border border-slate-200 bg-white p-2 shadow-xs dark:border-slate-700"
                          loading="lazy"
                        />
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1 font-medium">
                          <QrCode size={13} className="text-amber-600" />
                          Quét mã QR bằng App ngân hàng
                        </p>
                      </div>
                    )}

                    {/* Transfer Details Form */}
                    <div className="space-y-2.5">
                      {/* Amount */}
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs dark:bg-slate-800/50 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                            Số tiền thanh toán:
                          </span>
                          <span className="font-extrabold text-slate-900 dark:text-slate-100 text-base">
                            {formatVnd(purchase.amountVnd)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(String(purchase.amountVnd), "Số tiền")}
                          className="p-1.5 rounded-md hover:bg-slate-200 text-slate-600 dark:hover:bg-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                          title="Sao chép số tiền"
                        >
                          {copiedField === "Số tiền" ? (
                            <Check size={15} className="text-emerald-600" />
                          ) : (
                            <Copy size={15} />
                          )}
                        </button>
                      </div>

                      {/* Bank Name */}
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs dark:bg-slate-800/50 dark:border-slate-800">
                        <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                          Ngân hàng:
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {purchase.bankInstructions?.bankName} (BIN: {purchase.bankInstructions?.bin})
                        </span>
                      </div>

                      {/* Account Number */}
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs dark:bg-slate-800/50 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                            Số tài khoản:
                          </span>
                          <span className="font-bold text-slate-900 dark:text-slate-100 font-mono text-sm tracking-wide">
                            {purchase.bankInstructions?.accountNumber}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(purchase.bankInstructions?.accountNumber || "", "Số tài khoản")}
                          className="p-1.5 rounded-md hover:bg-slate-200 text-slate-600 dark:hover:bg-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                          title="Sao chép số tài khoản"
                        >
                          {copiedField === "Số tài khoản" ? (
                            <Check size={15} className="text-emerald-600" />
                          ) : (
                            <Copy size={15} />
                          )}
                        </button>
                      </div>

                      {/* Account Name */}
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs dark:bg-slate-800/50 dark:border-slate-800">
                        <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                          Chủ tài khoản:
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">
                          {purchase.bankInstructions?.accountName}
                        </span>
                      </div>

                      {/* Transfer Code */}
                      <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 text-xs dark:bg-amber-950/30 dark:border-amber-900/60 flex items-center justify-between">
                        <div>
                          <span className="text-amber-800 dark:text-amber-300 font-medium block text-[11px]">
                            Nội dung chuyển khoản (bắt buộc):
                          </span>
                          <span className="font-extrabold text-amber-900 dark:text-amber-200 text-sm tracking-wider font-mono">
                            {purchase.bankInstructions?.transferCode || purchase.payment?.transferCode}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(
                              purchase.bankInstructions?.transferCode || purchase.payment?.transferCode || "",
                              "Nội dung chuyển khoản",
                            )
                          }
                          className="p-1.5 rounded-md hover:bg-amber-200 text-amber-800 dark:hover:bg-amber-900/50 dark:text-amber-200 transition-colors flex items-center gap-1 cursor-pointer"
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

                  <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                    * Vui lòng nhập chính xác nội dung chuyển khoản{" "}
                    <strong className="text-slate-700 dark:text-slate-300">
                      {purchase.bankInstructions?.transferCode || purchase.payment?.transferCode}
                    </strong>{" "}
                    để hệ thống có thể đối soát và kích hoạt gói học nhanh nhất.
                  </p>
                </div>

                {/* Status Notice or Report Action */}
                {paymentStatus === "PENDING" ? (
                  <div className="pt-2">
                    {!showConfirmReport ? (
                      <button
                        type="button"
                        onClick={() => setShowConfirmReport(true)}
                        className="w-full min-h-11 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                      >
                        <CheckCircle2 size={18} />
                        Tôi đã chuyển khoản
                      </button>
                    ) : (
                      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-900/60 space-y-3">
                        <div className="flex items-start gap-2.5">
                          <AlertCircle
                            size={18}
                            className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
                          />
                          <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
                            Bạn xác nhận đã hoàn tất chuyển khoản{" "}
                            <strong>{formatVnd(purchase.amountVnd)}</strong> với nội dung{" "}
                            <strong>
                              {purchase.bankInstructions?.transferCode || purchase.payment?.transferCode}
                            </strong>
                            ?
                          </p>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setShowConfirmReport(false)}
                            disabled={reportMutation.isPending}
                            className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
                ) : paymentStatus === "REPORTED" ? (
                  <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 dark:bg-sky-950/40 dark:border-sky-900/60 flex items-start gap-3">
                    <Clock size={18} className="text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-sky-900 dark:text-sky-200 space-y-0.5">
                      <p className="font-bold">Đã báo chuyển khoản</p>
                      <p className="text-sky-700 dark:text-sky-300 leading-relaxed">
                        Đang chờ quản trị viên xác nhận. Trạng thái sẽ tự động cập nhật khi giao dịch được duyệt.
                      </p>
                    </div>
                  </div>
                ) : paymentStatus === "CONFIRMED" || paymentStatus === "COMPLETED" ? (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900/60 flex items-start gap-3">
                    <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-emerald-900 dark:text-emerald-200 space-y-0.5">
                      <p className="font-bold">Giao dịch đã xác nhận thành công!</p>
                      <p className="text-emerald-700 dark:text-emerald-300 leading-relaxed">
                        Gói {purchase.planDisplayName} đã được kích hoạt trên tài khoản của bạn.
                      </p>
                    </div>
                  </div>
                ) : paymentStatus === "REJECTED" ? (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900/60 flex items-start gap-3">
                    <XCircle size={18} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-rose-900 dark:text-rose-200 space-y-0.5">
                      <p className="font-bold">Giao dịch bị từ chối</p>
                      <p className="text-rose-700 dark:text-rose-300 leading-relaxed">
                        {purchase.payment?.rejectionReason || "Không tìm thấy giao dịch chuyển khoản tương ứng."}
                      </p>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex justify-end shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
