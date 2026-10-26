"use client";

import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { X, CalendarPlus, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  adminSubscriptionService,
  type AdminSubscriptionItem,
} from "@/lib/api/services/admin-subscription.service";

interface AdminExtendModalProps {
  subscription: AdminSubscriptionItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const formatDate = (dateString?: string | null) => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

export function AdminExtendModal({
  subscription,
  isOpen,
  onClose,
  onSuccess,
}: AdminExtendModalProps) {
  const [nowMs] = useState(() => Date.now());
  const [extensionDays, setExtensionDays] = useState<number>(30);
  const [customDays, setCustomDays] = useState<string>("");
  const [isCustom, setIsCustom] = useState(false);
  const [reason, setReason] = useState("");
  const operationIdRef = React.useRef("");

  useEffect(() => {
    if (isOpen && subscription) {
      operationIdRef.current = `extend-${subscription.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    }
  }, [isOpen, subscription]);

  const extendMutation = useMutation({
    mutationFn: async () => {
      if (!subscription) throw new Error("Không tìm thấy thông tin gói");
      if (!reason.trim()) throw new Error("Lý do gia hạn không được để trống");

      const days = isCustom ? parseInt(customDays, 10) : extensionDays;
      if (!days || days <= 0) throw new Error("Số ngày gia hạn không hợp lệ");

      return await adminSubscriptionService.extend(subscription.id, {
        extensionDays: days,
        reason: reason.trim(),
        idempotencyKey: operationIdRef.current,
      });
    },
    onSuccess: () => {
      toast.success("Gia hạn gói cho học viên thành công.");
      setReason("");
      onSuccess();
      onClose();
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message || err?.message || "Không thể gia hạn gói cho học viên.";
      toast.error(msg);
    },
  });

  if (!isOpen || !subscription) return null;

  const currentEndsAtDate = new Date(subscription.endsAt);
  const effectiveDays = isCustom ? parseInt(customDays, 10) || 0 : extensionDays;
  const baseDate = new Date(Math.max(nowMs, currentEndsAtDate.getTime()));
  const newEndsAtDate = new Date(baseDate.getTime() + effectiveDays * 24 * 60 * 60 * 1000);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <CalendarPlus size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Gia hạn gói học viên</h2>
              <p className="text-xs text-slate-500">
                Bảo toàn số ngày còn lại của học viên và cộng dồn thời hạn mới.
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
            extendMutation.mutate();
          }}
          className="mt-4 space-y-4 text-sm"
        >
          {/* Learner Info */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-xs text-slate-500">Học viên nhận gia hạn:</p>
            <p className="font-semibold text-slate-800 mt-0.5">
              {subscription.userFullName || "Học viên"}
            </p>
            <p className="text-xs text-slate-500 font-mono">{subscription.userEmail}</p>
            <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
              <span className="text-slate-500">Gói hiện tại:</span>
              <span className="font-medium text-slate-800">{subscription.planDisplayName}</span>
            </div>
          </div>

          {/* Extension Presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Thời gian gia hạn thêm <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {[30, 60, 90].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => {
                    setIsCustom(false);
                    setExtensionDays(days);
                  }}
                  className={`py-2 text-xs font-semibold rounded-lg border transition-colors ${
                    !isCustom && extensionDays === days
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  +{days} ngày
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCustom(true)}
                className={`py-1.5 px-3 text-xs font-semibold rounded-lg border transition-colors ${
                  isCustom
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                Tùy chỉnh số ngày
              </button>
              {isCustom && (
                <input
                  type="number"
                  min="1"
                  max="3650"
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                  placeholder="Nhập số ngày"
                  className="w-32 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              )}
            </div>
          </div>

          {/* Calculation Preview (Requirement #28) */}
          <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-700">
              <span>Hiện hết hạn:</span>
              <span className="font-mono font-medium">{formatDate(subscription.endsAt)}</span>
            </div>
            <div className="flex items-center justify-between text-emerald-800 font-semibold">
              <span>Gia hạn thêm:</span>
              <span>+{effectiveDays} ngày</span>
            </div>
            <div className="pt-2 border-t border-emerald-200/80 flex items-center justify-between text-slate-900 font-bold text-sm">
              <span>Hết hạn mới:</span>
              <span className="font-mono text-emerald-700">
                {effectiveDays > 0 ? formatDate(newEndsAtDate.toISOString()) : "—"}
              </span>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Lý do gia hạn (Bắt buộc kiểm toán) <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ví dụ: Bù ngày nghỉ lễ, hỗ trợ kỳ thi chứng chỉ, gia hạn ưu đãi đặc cách..."
              className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={extendMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={extendMutation.isPending || !reason.trim() || effectiveDays <= 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {extendMutation.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Đang gia hạn...
                </>
              ) : (
                "Xác nhận gia hạn"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
