"use client";

import { AlertTriangle } from "lucide-react";

type RequiredMediaNoticeProps = {
  className?: string;
};

export default function RequiredMediaNotice({
  className = "",
}: RequiredMediaNoticeProps) {
  return (
    <div
      role="alert"
      className={`flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-950 ${className}`}
    >
      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-700" aria-hidden="true" />
      <p>
        Thiếu ảnh bắt buộc. Bạn vẫn có thể lưu bản nháp, nhưng cần bổ sung ảnh trước khi xuất bản.
      </p>
    </div>
  );
}
