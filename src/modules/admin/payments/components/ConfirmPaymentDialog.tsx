"use client";

import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  paymentService,
  AdminPaymentDetail,
} from "@/lib/api/services/payment.service";
import toast from "react-hot-toast";
import { Loader2, X, CheckCircle2, AlertTriangle } from "lucide-react";

interface ConfirmPaymentDialogProps {
  paymentId: number;
  transferCode: string;
  amountVnd: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (updated: AdminPaymentDetail) => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

export const ConfirmPaymentDialog: React.FC<ConfirmPaymentDialogProps> = ({
  paymentId,
  transferCode,
  amountVnd,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  const confirmMutation = useMutation({
    mutationFn: async () => {
      return await paymentService.adminConfirmPayment(paymentId);
    },
    onSuccess: (updated: AdminPaymentDetail) => {
      if (updated.activationIssue === "CLASS_FULL") {
        toast.error("Đã xác nhận thanh toán nhưng lớp hiện đã đủ chỗ.");
      } else if (updated.activationIssue === "CLASS_NOT_ELIGIBLE") {
        toast.error(
          "Đã xác nhận thanh toán nhưng lớp không còn đủ điều kiện kích hoạt tự động.",
        );
      } else {
        toast.success("Đã xác nhận thanh toán và kích hoạt ghi danh.");
      }

      queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
      queryClient.invalidateQueries({
        queryKey: ["admin-payment-detail", paymentId],
      });
      onSuccess?.(updated);
      onClose();
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ||
        "Không thể xác nhận thanh toán. Vui lòng thử lại.";
      toast.error(msg);
    },
  });

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (confirmMutation.isPending) return;
    confirmMutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Xác nhận thanh toán
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Mã chuyển khoản:{" "}
                <span className="font-mono font-medium text-slate-700">
                  {transferCode}
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={confirmMutation.isPending}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-lg">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block mb-1">
              Số tiền đối soát thực tế
            </span>
            <span className="text-2xl font-black text-emerald-700">
              {formatCurrency(amountVnd)}
            </span>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-800">
              Xác nhận trung tâm đã nhận được khoản chuyển khoản này?
            </p>
            <div className="flex items-start gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
              <AlertTriangle
                size={16}
                className="text-amber-600 shrink-0 mt-0.5"
              />
              <p>
                Hệ thống sẽ tự động xác định kích hoạt ghi danh dựa trên trạng
                thái lớp học và sĩ số thực tế (không cần chọn thủ công).
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            disabled={confirmMutation.isPending}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={confirmMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            {confirmMutation.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Đang xác nhận...
              </>
            ) : (
              <>
                <CheckCircle2 size={16} /> Xác nhận thanh toán
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
