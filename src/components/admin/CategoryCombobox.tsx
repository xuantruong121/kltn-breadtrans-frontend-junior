"use client";

import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";
import { exactCategory, filterCategories, nearCategory, newCategoryName } from "./categoryMatch";

const INPUT =
  "w-full rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-10 text-sm font-medium text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100 disabled:text-slate-600";

/** "near": the existing category the typed name only differs from in case or accents. */
type Row = { kind: "new" | "near" | "existing"; name: string };

/**
 * The category of a deck: pick one that exists or type a new name (owner
 * 2026-11-28). A category is only text kept on each deck, so there is no
 * "add" button; the first row of the list says a typed name will be a new
 * category, and a name that only differs from an existing one in case or
 * accents is pointed out first, so a slip does not make a second group.
 */
export default function CategoryCombobox({
  value,
  onChange,
  options,
  label = "Chuyên mục",
  labelClassName = "text-sm font-medium text-slate-800",
  required,
  disabled,
  placeholder = "Chọn hoặc gõ chuyên mục mới",
}: {
  value: string;
  onChange: (next: string) => void;
  options: string[];
  label?: string;
  labelClassName?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}) {
  const id = useId();
  const listId = `${id}-list`;
  const hintId = `${id}-hint`;
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  // The list is the whole set until the admin types, then it narrows.
  const [typing, setTyping] = useState(false);

  const near = nearCategory(options, value);
  const exact = exactCategory(options, value);
  const rows = useMemo<Row[]>(() => {
    const fresh = newCategoryName(options, value);
    // The list covers the lines under the box while it is open, so the "use
    // the name that exists" offer is its first row, not only the line below.
    const nearRow: Row[] = typing && near ? [{ kind: "near", name: near }] : [];
    const existing = filterCategories(options, typing ? value : "")
      .filter((name) => !(typing && name === near))
      .map<Row>((name) => ({ kind: "existing", name }));
    return [...nearRow, ...(typing && fresh ? [{ kind: "new", name: fresh } as Row] : []), ...existing];
  }, [options, value, typing, near]);

  const choose = (row: Row) => {
    onChange(row.name);
    setTyping(false);
    setOpen(false);
    setActive(-1);
  };
  const show = (nextTyping: boolean) => {
    setTyping(nextTyping);
    setOpen(true);
    setActive(-1);
  };
  const move = (step: 1 | -1) => {
    if (!open) return show(false);
    if (!rows.length) return;
    setActive((current) => (current + step + rows.length) % rows.length);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      move(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      move(-1);
    } else if (event.key === "Enter" && open && active >= 0 && rows[active]) {
      // Choosing from the list must not also send the form.
      event.preventDefault();
      choose(rows[active]);
    } else if (event.key === "Escape" && open) {
      // Closes the list only, not the dialog the box may sit in.
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      setActive(-1);
    }
  };

  return (
    <div className="relative">
      <label htmlFor={id} className={labelClassName}>
        {label}
      </label>
      <div className="relative mt-1">
        <input
          ref={input}
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && active >= 0 ? `${id}-row-${active}` : undefined}
          aria-describedby={hintId}
          autoComplete="off"
          required={required}
          disabled={disabled}
          value={value}
          placeholder={placeholder}
          onChange={(event) => {
            onChange(event.target.value);
            show(true);
          }}
          onFocus={() => show(false)}
          onClick={() => !open && show(false)}
          onBlur={() => {
            setOpen(false);
            setActive(-1);
          }}
          onKeyDown={onKeyDown}
          className={INPUT}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          aria-label={open ? "Đóng danh sách chuyên mục" : "Mở danh sách chuyên mục"}
          // Keeps the focus in the box, so its blur does not close the list the click opens.
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            if (open) setOpen(false);
            else {
              input.current?.focus();
              show(false);
            }
          }}
          className="absolute inset-y-0 right-0 flex w-10 cursor-pointer items-center justify-center rounded-r-lg text-slate-500 hover:text-slate-800 disabled:cursor-not-allowed"
        >
          <ChevronDown size={16} aria-hidden="true" className={open ? "rotate-180" : ""} />
        </button>
        {open && (
          <ul
            id={listId}
            role="listbox"
            aria-label={label}
            className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-sm"
          >
            {rows.length === 0 && (
              <li role="presentation" className="px-3 py-2 text-sm text-slate-600">
                Chưa có chuyên mục nào. Gõ tên để tạo.
              </li>
            )}
            {rows.map((row, index) => (
              <li
                key={`${row.kind}-${row.name}`}
                id={`${id}-row-${index}`}
                role="option"
                aria-selected={row.kind === "existing" && row.name === exact}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(row)}
                onMouseEnter={() => setActive(index)}
                className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm ${
                  index === active ? "bg-slate-100" : ""
                } ${row.kind === "existing" ? "text-slate-900" : "font-semibold text-blue-700"}`}
              >
                <span className="min-w-0 flex-1 truncate">
                  {row.kind === "new"
                    ? `Tạo chuyên mục mới “${row.name}”`
                    : row.kind === "near"
                      ? `Dùng “${row.name}” đã có`
                      : row.name}
                </span>
                {row.kind === "existing" && row.name === exact && (
                  <Check size={14} aria-hidden="true" className="flex-none text-emerald-700" />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p id={hintId} className="mt-1 text-xs text-slate-600">
        Chọn từ danh sách hoặc gõ tên mới để tạo chuyên mục.
      </p>
      {near && (
        <p role="status" className="mt-1 text-xs font-medium text-amber-900">
          Đã có chuyên mục “{near}”.{" "}
          <button
            type="button"
            onClick={() => onChange(near)}
            className="cursor-pointer font-semibold text-blue-700 underline-offset-4 hover:underline"
          >
            Dùng tên này
          </button>{" "}
          để không tách thành nhóm khác.
        </p>
      )}
    </div>
  );
}
