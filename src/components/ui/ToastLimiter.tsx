"use client";

import { useEffect } from "react";
import toast, { useToasterStore } from "react-hot-toast";
import { toastsToDismiss } from "@/lib/ui/toastLimit";

/**
 * Keeps at most four toasts on screen (owner 2026-11-27). The library's own
 * limit drops a toast at once; dismissing it instead lets it fade out.
 * Rendered once, beside the Toaster.
 */
export function ToastLimiter() {
  const { toasts } = useToasterStore();
  useEffect(() => {
    for (const id of toastsToDismiss(toasts)) toast.dismiss(id);
  }, [toasts]);
  return null;
}
