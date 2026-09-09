import React from "react";

export type StatusType =
  | "ACTIVE"
  | "PENDING_PAYMENT"
  | "PUBLISHED"
  | "DRAFT"
  | "CONFIRMED"
  | "REJECTED"
  | "COMPLETED"
  | "PENDING"
  | "SUBMITTED"
  | "GRADED"
  | "UNSUBMITTED"
  | string;

interface StatusBadgeProps {
  status: StatusType;
  size?: "sm" | "md";
  className?: string;
}

const statusMap: Record<string, { label: string; className: string }> = {
  ACTIVE: {
    label: "Đang học",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  PENDING_PAYMENT: {
    label: "Chờ thanh toán",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  PENDING: {
    label: "Đang xử lý",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  PUBLISHED: {
    label: "Đã xuất bản",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  DRAFT: {
    label: "Bản nháp",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
  CONFIRMED: {
    label: "Đã xác nhận",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  REJECTED: {
    label: "Đã từ chối",
    className: "bg-rose-50 text-rose-700 border-rose-200",
  },
  COMPLETED: {
    label: "Hoàn thành",
    className: "bg-slate-100 text-slate-700 border-slate-300",
  },
  SUBMITTED: {
    label: "Đã nộp bài",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  GRADED: {
    label: "Đã chấm điểm",
    className: "bg-purple-50 text-purple-700 border-purple-200",
  },
  UNSUBMITTED: {
    label: "Chưa nộp bài",
    className: "bg-slate-50 text-slate-600 border-slate-200",
  },
};

export function StatusBadge({ status, size = "md", className = "" }: StatusBadgeProps) {
  const norm = (status || "").toUpperCase();
  const config = statusMap[norm] || {
    label: status,
    className: "bg-slate-100 text-slate-700 border-slate-200",
  };

  const sizeClasses =
    size === "sm"
      ? "px-2 py-0.5 text-[11px] font-bold"
      : "px-2.5 py-1 text-xs font-bold";

  return (
    <span
      className={`inline-flex items-center rounded-lg border leading-none tracking-wide ${sizeClasses} ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
}

export default StatusBadge;
