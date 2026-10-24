"use client";

import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { X, Ban, Loader2, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import {
  adminSubscriptionService,
  type AdminSubscriptionItem,
} from "@/lib/api/services/admin-subscription.service";

interface AdminRevokeModalProps {
  subscription: AdminSubscriptionItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AdminRevokeModal({
  subscription,
  isOpen,
  onClose,
  onSuccess,
}: AdminRevokeModalProps) {
  const [reason, setReason] = useState("");
  const operationIdRef = React.useRef("");

  useEffect(() => {
    if (isOpen && subscription) {
      operationIdRef.current = `revoke-${subscription.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    }
  }, [isOpen, subscription]);

  const revokeMutation = useMutation({
    mutationFn: async () => {
      if (!subscription) throw new Error("Không tìm thấy thông tin gói");
      if (!reason.trim()) throw new Error("Lý do thu hồi quyền không được để trống");

      return await adminSubscriptionService.revoke(subscription.id, {
        reason: reason.trim(),
        idempotencyKey: operationIdRef.current,
      });
    },
    onSuccess: () => {
      toast.success("Đã thu hồi quyền gói của học viên.");
      onSuccess();
      onClose();
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message || err?.message || "Không thể thu hồi quyền của học viên.";
      toast.error(msg);
    },
  });

  if (!isOpen || !subscription) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-50 text-rose-700 rounded-lg">
              <Ban size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Thu hồi quyền gói</h2>
              <p className="text-xs text-slate-500">
                Ngừng quyền truy cập tính năng nâng cấp (Plus/Pro) của học viên.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            revokeMutation.mutate();
          }}
          className="mt-4 space-y-4 text-sm"
        >
          {/* Warning Banner (Requirement #29) */}
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-2.5">
            <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Cảnh báo thu hồi quyền</p>
              <p className="mt-0.5 text-rose-800 leading-relaxed">
                Học viên sẽ mất quyền truy cập gói nâng cấp ngay sau khi xác nhận. Dữ liệu gói vẫn được lưu vết kiểm toán và không bị xóa khỏi cơ sở dữ liệu.
              </p>
            </div>
          </div>

          {/* Target Learner Details */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
            <p className="text-slate-500">Học viên bị thu hồi:</p>
            <p className="font-semibold text-slate-800 text-sm">
              {subscription.userFullName || "Học viên"}
            </p>
            <p className="text-slate-500 font-mono">{subscription.userEmail}</p>
            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-slate-600">
              <span>Gói đang thu hồi:</span>
              <span className="font-semibold text-slate-800">{subscription.planDisplayName}</span>
            </div>
          </div>

          {/* Reason Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Lý do thu hồi (Bắt buộc kiểm toán) <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ví dụ: Gian lận thanh toán, hoàn tiền theo yêu cầu, vi phạm điều khoản sử dụng..."
              className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={revokeMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={revokeMutation.isPending || !reason.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {revokeMutation.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Đang thu hồi...
                </>
              ) : (
                "Xác nhận thu hồi quyền"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
