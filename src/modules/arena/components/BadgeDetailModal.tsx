"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { BadgeView } from "../badges";
import { BadgeMedal } from "./BadgeMedal";

const GROUP_LABEL = {
  learning: "Học tập",
  streak: "Chuyên cần",
  arena: "Đấu trường",
  pet: "Thú ảo",
} as const;

export function BadgeDetailModal({ badge, onClose }: { badge: BadgeView | null; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!badge) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [badge, onClose]);

  if (!badge) return null;
  const earned = badge.earnedAt !== null;
  const earnedDate = badge.earnedAt
    ? new Date(badge.earnedAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
    : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="badge-dialog-title"
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex justify-end">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="-mr-2 -mt-2 rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={18} strokeWidth={2.25} />
          </button>
        </div>
        <div className="flex flex-col items-center text-center">
          <BadgeMedal name={badge.name} group={badge.group} earned={earned} size={96} />
          <h3 id="badge-dialog-title" className="mt-3 text-xl font-bold text-slate-900 dark:text-slate-100">
            {badge.name}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">{GROUP_LABEL[badge.group]}</p>
          <p className="mt-3 text-base text-slate-800 dark:text-slate-200">{badge.rule}</p>
        </div>

        <div className="mt-5 rounded-lg bg-slate-50 p-4 text-sm dark:bg-slate-800/60">
          {earned ? (
            <p className="font-semibold text-emerald-700 dark:text-emerald-400">{earnedDate ? `Đã đạt ngày ${earnedDate}.` : "Đã đạt."}</p>
          ) : badge.current ? (
            <>
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span>Tiến độ</span>
                <span className="font-semibold tabular-nums">
                  {badge.current.value.toLocaleString("vi-VN")}/{badge.current.target.toLocaleString("vi-VN")} {badge.current.unit}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.round(badge.current.ratio * 100)}%` }} />
              </div>
              {badge.name === "Siêu Sao" && badge.current.ratio >= 1 && (
                <p className="mt-2 text-slate-700 dark:text-slate-300">Đã đủ XP tuần. Còn cần đứng đầu bảng xếp hạng tuần.</p>
              )}
            </>
          ) : (
            <p className="text-slate-700 dark:text-slate-300">Chưa đạt. Huy hiệu được trao ngay khi bạn hoàn thành điều kiện trên.</p>
          )}
        </div>
      </div>
    </div>
  );
}
