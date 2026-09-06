"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { paymentService } from "@/lib/api/services/payment.service";
import toast from "react-hot-toast";
import { Loader2, X, AlertCircle } from "lucide-react";

interface RejectPaymentDialogProps {
  paymentId: number;
  transferCode: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const RejectPaymentDialog: React.FC<RejectPaymentDialogProps> = ({
  paymentId,
  transferCode,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");

  const trimmedReason = reason.trim();
  const charCount = trimmedReason.length;
  const isTooShort = charCount > 0 && charCount < 5;
  const isTooLong = charCount > 500;
  const isValid = charCount >= 5 && charCount <= 500;

  const rejectMutation = useMutation({
    mutationFn: async (data: { reason: string }) => {
      return await paymentService.adminRejectPayment(paymentId, data);
    },
    onSuccess: () => {
      toast.success(`Đã từ chối thanh toán ${transferCode}`);
      queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
      queryClient.invalidateQueries({
        queryKey: ["admin-payment-detail", paymentId],
      });
      setReason("");
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ||
        "Không thể từ chối thanh toán. Vui lòng thử lại.";
      toast.error(msg);
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || rejectMutation.isPending) return;
    rejectMutation.mutate({ reason: trimmedReason });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Từ chối thanh toán
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Mã chuyển khoản: <span className="font-mono font-medium text-slate-700">{transferCode}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={rejectMutation.isPending}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label
              htmlFor="reject-reason"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
            >
              Lý do từ chối <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="reject-reason"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={rejectMutation.isPending}
              placeholder="Nhập chi tiết lý do từ chối (ví dụ: Số tiền không khớp, ảnh biên lai không đọc được...)"
              className={`w-full text-sm rounded-lg border p-3 focus:outline-none focus:ring-2 transition-colors ${
                isTooShort || isTooLong
                  ? "border-rose-300 focus:ring-rose-500/20 focus:border-rose-500"
                  : "border-slate-300 focus:ring-blue-500/20 focus:border-blue-500"
              }`}
            />

            {/* Validation & Character count row */}
            <div className="flex items-center justify-between mt-1.5 text-xs">
              <div className="text-rose-600 flex items-center gap-1">
                {isTooShort && (
                  <>
                    <AlertCircle size={14} />
                    <span>Lý do phải có ít nhất 5 ký tự.</span>
                  </>
                )}
                {isTooLong && (
                  <>
                    <AlertCircle size={14} />
                    <span>Lý do không được vượt quá 500 ký tự.</span>
                  </>
                )}
              </div>
              <span
                className={`font-mono ml-auto ${
                  isTooLong
                    ? "text-rose-600 font-semibold"
                    : charCount >= 5
                    ? "text-slate-600"
                    : "text-slate-400"
                }`}
              >
                {charCount} / 500
              </span>
            </div>
          </div>

          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 mb-6 text-xs text-amber-800 leading-relaxed">
            <span className="font-semibold">Lưu ý:</span> Trạng thái thanh toán sẽ chuyển thành{" "}
            <span className="font-bold text-amber-900">REJECTED</span>. Ghi danh của học viên vẫn được giữ ở trạng thái{" "}
            <span className="font-semibold text-slate-700">PENDING_PAYMENT</span> (học viên chưa được vào lớp cho đến khi có thanh toán hợp lệ).
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={rejectMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!isValid || rejectMutation.isPending}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {rejectMutation.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                "Xác nhận từ chối"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
