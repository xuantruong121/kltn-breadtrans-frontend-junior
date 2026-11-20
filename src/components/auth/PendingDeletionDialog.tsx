"use client";

import { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";

import axiosClient from "@/lib/api/axiosClient";
import { formatVnDate, type PendingDeletion } from "@/lib/auth/accountPrivacy";
import { getApiErrorMessage } from "@/lib/utils/apiError";

interface PendingDeletionDialogProps {
  pending: PendingDeletion | null;
  /** Called once the deletion is cancelled; sign in again from here. */
  onCancelled: () => void;
  onClose: () => void;
}

/**
 * A sign-in to an account waiting for deletion (owner 2026-11-16): shows the
 * date and lets the learner cancel the request with the one-time token the
 * sign-in returned.
 */
export function PendingDeletionDialog({
  pending,
  onCancelled,
  onClose,
}: PendingDeletionDialogProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!pending || !mounted) return null;
  const day = formatVnDate(pending.scheduledAt);

  const cancelDeletion = async () => {
    setIsPending(true);
    setError("");
    try {
      await axiosClient.post("/account/deletion/cancel", {
        cancelToken: pending.cancelToken,
      });
      onCancelled();
    } catch (err) {
      setError(
        getApiErrorMessage(err, "Không huỷ được yêu cầu xoá. Hãy đăng nhập lại rồi thử lần nữa."),
      );
    } finally {
      setIsPending(false);
    }
  };

  // Portal to <body>: a parent with backdrop-filter (the login card) would
  // otherwise confine `fixed inset-0` to its own box (owner 2026-11-17).
  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-4"
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="pending-deletion-title"
        aria-describedby="pending-deletion-description"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div>
          <div>
            <h2 id="pending-deletion-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Tài khoản đang chờ xoá
            </h2>
            <p
              id="pending-deletion-description"
              className="mt-1.5 text-sm leading-6 text-slate-600 dark:text-slate-400"
            >
              {day
                ? `Tài khoản này sẽ bị xoá vĩnh viễn vào ngày ${day}.`
                : "Tài khoản này đang chờ xoá vĩnh viễn."}{" "}
              Huỷ yêu cầu xoá để tiếp tục học với dữ liệu hiện có.
            </p>
          </div>
        </div>

        {error ? (
          <p role="alert" className="mt-3 text-sm font-medium text-rose-700 dark:text-rose-400">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="cursor-pointer transition-colors min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 disabled:cursor-not-allowed"
          >
            Giữ yêu cầu xoá
          </button>
          <button
            type="button"
            onClick={cancelDeletion}
            disabled={isPending}
            className="cursor-pointer transition-colors inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 text-sm font-bold text-white hover:bg-amber-700 disabled:cursor-not-allowed"
          >
            {isPending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
            Huỷ yêu cầu xoá
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
