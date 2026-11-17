"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";

import { ConsentCheckbox } from "@/components/auth/ConsentCheckbox";

interface ConsentDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  isPending?: boolean;
  error?: string;
  onConfirm: () => void;
  /** Secondary actions under the main button (cancel, sign out, …). */
  children?: ReactNode;
}

/**
 * Asks for consent where no form exists yet: a first Google sign-in, and an
 * existing account that never accepted the current terms (owner 2026-11-16).
 */
export function ConsentDialog({
  open,
  title,
  description,
  confirmLabel,
  isPending = false,
  error,
  onConfirm,
  children,
}: ConsentDialogProps) {
  const [checked, setChecked] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.querySelector<HTMLInputElement>("input")?.focus();
  }, [open]);

  if (!open || !mounted) return null;
  // Portal to <body>: a parent with backdrop-filter (the login card) would
  // otherwise confine `fixed inset-0` to its own box (owner 2026-11-17).
  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-4"
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-dialog-title"
        aria-describedby="consent-dialog-description"
        className="max-h-[min(90dvh,calc(100dvh-2rem))] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div>
          <div>
            <h2
              id="consent-dialog-title"
              className="text-lg font-bold text-slate-900 dark:text-slate-100"
            >
              {title}
            </h2>
            <p
              id="consent-dialog-description"
              className="mt-1.5 text-sm leading-6 text-slate-600 dark:text-slate-400"
            >
              {description}
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
          <ConsentCheckbox
            id="consent-dialog-accept"
            checked={checked}
            onChange={setChecked}
            disabled={isPending}
          />
        </div>

        {error ? (
          <p role="alert" className="mt-3 text-sm font-medium text-rose-700 dark:text-rose-400">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={onConfirm}
          disabled={!checked || isPending}
          className="cursor-pointer transition-colors mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 text-sm font-bold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
          {confirmLabel}
        </button>
        {children ? (
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:justify-center">{children}</div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
