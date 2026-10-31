"use client";

import React, { useState } from "react";
import { X, AlertTriangle, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  AdminMarketOrder,
  adminMarketService,
} from "@/lib/api/services/admin-market.service";
import { getApiErrorMessage } from "@/lib/utils/apiError";

interface AdminRejectOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: AdminMarketOrder | null;
  onSuccess: () => void;
}

export default function AdminRejectOrderModal({
  isOpen,
  onClose,
  order,
  onSuccess,
}: AdminRejectOrderModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối đơn hàng");
      return;
    }

    try {
      setIsSubmitting(true);
      await adminMarketService.reviewOrder(order.id, "rejected", reason.trim());
      toast.success(`Đã từ chối đơn #${order.id} và hoàn lại ${order.totalBanh} Bánh Mì cho học viên.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, "Không thể từ chối đơn hàng"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-rose-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-100 text-rose-600 rounded-xl">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Từ chối yêu cầu đổi quà #{order.id}
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
          <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-800 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <span>Cơ chế hoàn Bánh Mì & Tồn kho tự động:</span>
            </div>
            <p>
              Khi bạn từ chối, hệ thống sẽ tự động hoàn trả{" "}
              <strong className="text-amber-900 font-black">+{order.totalBanh} Bánh Mì</strong> vào
              tài khoản học viên và cộng lại tồn kho cho các vật phẩm trong đơn.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Lý do từ chối <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ví dụ: Hết quà tại kho, thông tin nhận quà không chính xác, đổi nhầm món quà..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
            />
            <p className="text-xs text-slate-400 mt-1">
              Lý do này sẽ được lưu vào lịch sử kiểm toán và gửi thông báo tới học viên.
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
              className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <span>Xác nhận từ chối</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
