"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ChevronDown, Loader2 } from "lucide-react";

import { BTN_AI, BTN_SECONDARY } from "@/components/admin/cmsButtons";
import CategoryCombobox from "@/components/admin/CategoryCombobox";

const FIELD =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100 disabled:text-slate-600";
const LABEL = "text-sm font-semibold text-slate-800";

/** A select drawn like the other boxes: the browser's own arrow and look are hidden. */
function SelectBox({
  value,
  onChange,
  children,
}: {
  value: string | undefined;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative mt-1">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${FIELD} appearance-none pr-10`}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
      />
    </div>
  );
}

export type AiCreateRequest = {
  name: string;
  level: string;
  count: number;
  kind?: string;
  /** Vocab: the deck's category, picked or typed by the admin. */
  category?: string;
};

const clampCount = (text: string, max: number) => Math.min(max, Math.max(1, Math.floor(Number(text)) || 1));

/**
 * Starts a deck or a grammar topic from a subject. The draft opens in its
 * editor, where nothing is added until the admin picks what to keep.
 *
 * Esc and a click on the backdrop close it (not while it is creating); the
 * focus stays inside; the button is always there and says why it waits.
 */
export function AiCreateDialog({
  title,
  nameLabel,
  namePlaceholder,
  countLabel,
  maxCount,
  defaultCount,
  levels,
  kinds,
  category,
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
  /** Writing: which kind of exercise the AI drafts. Vocab and grammar leave it out. */
  kinds?: Array<{ value: string; label: string }>;
  /** Vocab: a category field, with the existing ones to pick from. */
  category?: { options: string[]; initial?: string };
  onCreate: (request: AiCreateRequest) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [level, setLevel] = useState(levels[0]?.value ?? "");
  // Kept as typed so the box can be emptied and retyped; clamped when left and when sent.
  const [countText, setCountText] = useState(String(defaultCount));
  const [kind, setKind] = useState(kinds?.[0]?.value);
  const [categoryName, setCategoryName] = useState(category?.initial ?? "");
  const [busy, setBusy] = useState(false);
  const ready = Boolean(name.trim()) && (!category || Boolean(categoryName.trim()));
  const form = useRef<HTMLFormElement>(null);
  const titleId = useId();
  const noteId = useId();
  const nameField = nameLabel.charAt(0).toLocaleLowerCase("vi") + nameLabel.slice(1);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    try {
      await onCreate({
        name: name.trim(),
        level,
        count: clampCount(countText, maxCount),
        ...(kind ? { kind } : {}),
        ...(category ? { category: categoryName.trim() } : {}),
      });
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === "Escape" && !busy) {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    // Keeps the focus inside the dialog.
    const focusable = [
      ...(form.current?.querySelectorAll<HTMLElement>(
        'input:not([disabled]), select:not([disabled]), button:not([disabled]):not([tabindex="-1"]), [href]',
      ) ?? []),
    ];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <form
        ref={form}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={noteId}
        aria-busy={busy}
        onSubmit={submit}
        onKeyDown={onKeyDown}
        className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 id={titleId} className="text-lg font-semibold text-slate-950">
          {title}
        </h2>
        <p id={noteId} className="mt-1 text-sm text-slate-600">
          AI chỉ soạn bản nháp. Bạn xem từng gợi ý và chọn phần cần giữ trước khi xuất bản.
        </p>

        <fieldset disabled={busy} className="mt-5 min-w-0 space-y-4">
          <div>
            <label htmlFor={`${titleId}-name`} className={LABEL}>
              {nameLabel}
            </label>
            <input
              id={`${titleId}-name`}
              autoFocus
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={namePlaceholder}
              className={`${FIELD} mt-1`}
            />
          </div>

          {category && (
            <CategoryCombobox
              value={categoryName}
              onChange={setCategoryName}
              options={category.options}
              labelClassName={LABEL}
              required
            />
          )}

          {kinds && (
            <label className={`block ${LABEL}`}>
              Dạng bài
              <SelectBox value={kind} onChange={setKind}>
                {kinds.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </SelectBox>
            </label>
          )}

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem]">
            <label className={`block ${LABEL}`}>
              Trình độ
              <SelectBox value={level} onChange={setLevel}>
                {levels.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </SelectBox>
            </label>
            <div>
              <label htmlFor={`${titleId}-count`} className={LABEL}>
                {countLabel}
              </label>
              <input
                id={`${titleId}-count`}
                type="number"
                inputMode="numeric"
                min={1}
                max={maxCount}
                value={countText}
                onChange={(event) => setCountText(event.target.value)}
                onBlur={() => setCountText(String(clampCount(countText, maxCount)))}
                aria-describedby={`${titleId}-count-hint`}
                className={`${FIELD} mt-1`}
              />
              <p id={`${titleId}-count-hint`} className="mt-1 text-xs text-slate-600">
                Tối đa {maxCount}
              </p>
            </div>
          </div>
        </fieldset>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
          {!ready && !busy && (
            <p className="mr-auto text-sm text-slate-600">
              Nhập {nameField}
              {category ? " và chuyên mục" : ""} để tạo.
            </p>
          )}
          <button type="button" onClick={onClose} disabled={busy} className={`${BTN_SECONDARY} disabled:opacity-60`}>
            Hủy
          </button>
          <button
            type="submit"
            disabled={!ready || busy}
            className={`${BTN_AI} disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500`}
          >
            {busy && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
            {busy ? "Đang tạo bản nháp…" : "Tạo bằng AI"}
          </button>
        </div>
      </form>
    </div>
  );
}
