"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  X,
  History,
  Loader2,
  CheckCircle2,
  Award,
  CalendarPlus,
  Ban,
  Clock,
  User,
} from "lucide-react";
import {
  adminSubscriptionService,
  type AdminSubscriptionItem,
  type AdminSubscriptionEvent,
} from "@/lib/api/services/admin-subscription.service";

interface AdminHistoryModalProps {
  subscription: AdminSubscriptionItem | null;
  isOpen: boolean;
  onClose: () => void;
}

const formatDateTime = (dateString?: string | null) => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDate = (dateString?: string | null) => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

export function AdminHistoryModal({
  subscription,
  isOpen,
  onClose,
}: AdminHistoryModalProps) {
  const {
    data: events = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin-subscription-history", subscription?.id],
    queryFn: () => adminSubscriptionService.getHistory(subscription!.id),
    enabled: isOpen && !!subscription,
  });

  if (!isOpen || !subscription) return null;

  const renderEventIcon = (type: AdminSubscriptionEvent["type"]) => {
    switch (type) {
      case "PAYMENT_ACTIVATED":
        return (
          <div className="p-2 bg-emerald-100 text-emerald-700 rounded-full">
            <CheckCircle2 size={16} />
          </div>
        );
      case "ADMIN_GRANTED":
        return (
          <div className="p-2 bg-blue-100 text-blue-700 rounded-full">
            <Award size={16} />
          </div>
        );
      case "ADMIN_EXTENDED":
        return (
          <div className="p-2 bg-teal-100 text-teal-700 rounded-full">
            <CalendarPlus size={16} />
          </div>
        );
      case "ADMIN_REVOKED":
        return (
          <div className="p-2 bg-rose-100 text-rose-700 rounded-full">
            <Ban size={16} />
          </div>
        );
      default:
        return (
          <div className="p-2 bg-slate-100 text-slate-700 rounded-full">
            <Clock size={16} />
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
              <History size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Lịch sử kiểm toán gói học viên</h2>
              <p className="text-xs text-slate-500">
                Toàn bộ các mốc thay đổi trạng thái của gói học viên.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Learner & Plan Summary */}
        <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs shrink-0">
          <div>
            <p className="font-semibold text-slate-800 text-sm">
              {subscription.userFullName || "Học viên"}
            </p>
            <p className="text-slate-500 font-mono">{subscription.userEmail}</p>
          </div>
          <div className="text-right">
            <span className="font-semibold text-slate-800">{subscription.planDisplayName}</span>
            <p className="text-slate-500">
              Hiệu lực: {formatDate(subscription.startsAt)} → {formatDate(subscription.endsAt)}
            </p>
          </div>
        </div>

        {/* Timeline Content */}
        <div className="mt-4 flex-1 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 size={28} className="animate-spin mb-2 text-blue-600" />
              <p className="text-xs">Đang tải lịch sử kiểm toán...</p>
            </div>
          ) : isError ? (
            <div className="p-6 text-center text-rose-700 bg-rose-50 rounded-xl text-xs">
              Không thể tải lịch sử kiểm toán của quyền này.
            </div>
          ) : events.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Chưa có sự kiện kiểm toán nào được ghi nhận.
            </div>
          ) : (
            <ol className="relative border-l border-slate-200 ml-4 space-y-6 my-2">
              {events.map((event) => (
                <li key={event.id} className="ml-6">
                  <span className="absolute -left-4 flex items-center justify-center">
                    {renderEventIcon(event.type)}
                  </span>
                  <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">
                        {event.typeLabel}
                      </span>
                      <span className="text-slate-400 font-mono">
                        {formatDateTime(event.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-600">
                      <User size={13} className="text-slate-400 shrink-0" />
                      <span>
                        Thực hiện bởi: <strong className="text-slate-800">{event.actorName}</strong>
                        {event.actorEmail && (
                          <span className="text-slate-400 font-mono ml-1">({event.actorEmail})</span>
                        )}
                      </span>
                    </div>

                    {event.reason && (
                      <div className="p-2.5 bg-slate-50 rounded-lg text-slate-700 border border-slate-100">
                        <span className="font-semibold text-slate-500 block mb-0.5">Lý do:</span>
                        <p className="whitespace-pre-wrap">{event.reason}</p>
                      </div>
                    )}

                    {event.newEndsAt && (
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        {event.previousEndsAt && (
                          <span>Từ {formatDate(event.previousEndsAt)}</span>
                        )}
                        <span>→ Hết hạn mới: <strong>{formatDate(event.newEndsAt)}</strong></span>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
