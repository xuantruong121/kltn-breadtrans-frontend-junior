"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import axiosClient from "@/lib/api/axiosClient";
import { needsConsent } from "@/lib/auth/accountPrivacy";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import { useAuthStore } from "@/stores/authStore";
import { ConsentDialog } from "@/components/auth/ConsentDialog";

/** Where the learner must be able to go without accepting first. */
function isExempt(pathname: string, tab: string | null) {
  if (pathname === "/terms" || pathname === "/privacy") return true;
  // Deleting the account instead of accepting stays possible.
  return pathname === "/hub" && tab === "account-privacy";
}

/**
 * Accounts created before consent was recorded, or after the terms changed,
 * accept once before using the app (owner 2026-11-16). Until then the only
 * ways on are to read the documents, sign out or delete the account.
 */
export function ConsentGate() {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const markConsentAccepted = useAuthStore((state) => state.markConsentAccepted);
  const logout = useAuthStore((state) => state.logout);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  const open =
    !!accessToken && needsConsent(user) && !isExempt(pathname, searchParams.get("tab"));

  const accept = async () => {
    setIsPending(true);
    setError("");
    try {
      await axiosClient.post("/auth/consent", { acceptTerms: true });
      markConsentAccepted();
    } catch (err) {
      setError(getApiErrorMessage(err, "Chưa lưu được lựa chọn. Hãy thử lại."));
    } finally {
      setIsPending(false);
    }
  };

  const signOut = async () => {
    await axiosClient.post("/auth/logout").catch(() => undefined);
    queryClient.clear();
    logout();
    router.replace("/");
  };

  return (
    <ConsentDialog
      open={open}
      title="Điều khoản và chính sách bảo mật"
      description="BreadTrans vừa cập nhật Điều khoản sử dụng và Chính sách bảo mật (16/11/2026). Hãy đọc và đồng ý để tiếp tục học."
      confirmLabel="Đồng ý và tiếp tục"
      isPending={isPending}
      error={error}
      onConfirm={accept}
    >
      <button
        type="button"
        onClick={signOut}
        disabled={isPending}
        className="min-h-11 rounded-xl px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        Đăng xuất
      </button>
      <Link
        href="/hub?tab=account-privacy"
        className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
      >
        Xoá tài khoản
      </Link>
    </ConsentDialog>
  );
}
