"use client";

import Link from "next/link";

interface ConsentCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
  disabled?: boolean;
}

/**
 * Explicit consent to the terms and the privacy policy (owner 2026-11-16):
 * never ticked in advance; both documents open in a new tab so the form keeps
 * what the learner typed.
 */
export function ConsentCheckbox({
  checked,
  onChange,
  id = "acceptTerms",
  disabled = false,
}: ConsentCheckboxProps) {
  return (
    <div className="flex items-start gap-2.5 text-sm leading-6 text-slate-700 dark:text-slate-300">
      <input
        id={id}
        name="acceptTerms"
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-amber-700 focus:ring-amber-500 disabled:cursor-not-allowed dark:border-slate-700 dark:text-amber-400"
      />
      <label htmlFor={id} className="cursor-pointer select-none">
        Tôi đồng ý với{" "}
        <Link
          href="/terms"
          target="_blank"
          rel="noopener"
          className="font-bold text-amber-700 underline-offset-2 hover:underline dark:text-amber-400"
        >
          Điều khoản sử dụng
        </Link>{" "}
        và{" "}
        <Link
          href="/privacy"
          target="_blank"
          rel="noopener"
          className="font-bold text-amber-700 underline-offset-2 hover:underline dark:text-amber-400"
        >
          Chính sách bảo mật
        </Link>{" "}
        của BreadTrans.
      </label>
    </div>
  );
}
