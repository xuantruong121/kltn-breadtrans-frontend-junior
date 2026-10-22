"use client";

import React, { useState } from "react";
import { X, AlertOctagon, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  AdminMarketOrder,
  adminMarketService,
} from "@/lib/api/services/admin-market.service";

interface AdminFulfillmentFailedModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: AdminMarketOrder | null;
  onSuccess: () => void;
}

export default function AdminFulfillmentFailedModal({
  isOpen,
  onClose,
  order,
  onSuccess,
}: AdminFulfillmentFailedModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      toast.error("Vui lòng nhập lý do giao/thực hiện thất bại");
      return;
    }

    try {
      setIsSubmitting(true);
      await adminMarketService.markFulfillmentFailed(order.id, reason.trim());
      toast.success(
        `Đã đánh dấu đơn #${order.id} giao thất bại và hoàn lại ${order.totalBanh} Bánh Mì cho học viên.`,
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Không thể xử lý giao thất bại");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-amber-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
              <AlertOctagon size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Đánh dấu Giao thất bại #{order.id}
              </h2>
              <p className="text-xs text-slate-500">
                Học viên: {order.studentName || order.user?.profile?.fullName || order.user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* BODY */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-xl text-xs text-rose-800 space-y-1">
            <div className="font-bold">Hành động bù trừ sau duyệt (Compensating action):</div>
            <p>
              Đơn hàng này trước đó đã được duyệt. Hành động này sẽ chuyển trạng thái sang{" "}
              <strong>Đã hoàn tiền (refunded)</strong>, hoàn lại{" "}
              <strong className="font-black">+{order.totalBanh} Bánh Mì</strong> và khôi phục tồn
              kho sản phẩm an toàn (chống hoàn tiền kép).
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Lý do giao/thực hiện thất bại <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ví dụ: Bưu tá không liên lạc được với người nhận sau 3 lần, bưu phẩm bị thất lạc, nhà cung cấp ngừng cung ứng voucher..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Lý do được lưu vết kiểm toán và hiển thị công khai cho học viên.
            </p>
          </div>

          {/* ACTIONS */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <span>Xác nhận giao thất bại</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
