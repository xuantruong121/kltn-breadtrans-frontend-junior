"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

import { BTN_AI, BTN_SECONDARY } from "@/components/admin/cmsButtons";

const FIELD =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900";

export type AiCreateRequest = { name: string; level: string; count: number };

/**
 * Starts a deck or a grammar topic from a subject. The draft opens in its
 * editor, where nothing is added until the admin picks what to keep.
 */
export function AiCreateDialog({
  title,
  nameLabel,
  namePlaceholder,
  countLabel,
  maxCount,
  defaultCount,
  levels,
  onCreate,
  onClose,
}: {
  title: string;
  nameLabel: string;
  namePlaceholder: string;
  countLabel: string;
  maxCount: number;
  defaultCount: number;
  levels: Array<{ value: string; label: string }>;
  onCreate: (request: AiCreateRequest) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [level, setLevel] = useState(levels[0]?.value ?? "");
  const [count, setCount] = useState(defaultCount);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await onCreate({ name: name.trim(), level, count });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <form
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onSubmit={submit}
        className="w-full max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        <label className="block text-sm font-semibold text-slate-800">
          {nameLabel}
          <input
            autoFocus
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={namePlaceholder}
            className={FIELD}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-semibold text-slate-800">
            Trình độ
            <select value={level} onChange={(event) => setLevel(event.target.value)} className={FIELD}>
              {levels.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-800">
            {countLabel} (tối đa {maxCount})
            <input
              type="number"
              min={1}
              max={maxCount}
              value={count}
              onChange={(event) => setCount(Math.min(maxCount, Math.max(1, Number(event.target.value) || 1)))}
              className={FIELD}
            />
          </label>
        </div>
        <p className="text-sm text-slate-600">
          Hệ thống tạo bản nháp rồi mở trang soạn. Bạn xem gợi ý của AI và chọn nội dung cần giữ.
        </p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className={BTN_SECONDARY}>
            Hủy
          </button>
          <button type="submit" disabled={busy || !name.trim()} className={BTN_AI}>
            {busy && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
            Tạo bằng AI
          </button>
        </div>
      </form>
    </div>
  );
}
