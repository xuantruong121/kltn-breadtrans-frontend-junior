"use client";

import Link from "next/link";
import { CircleAlert, RefreshCw } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";

export default function GoogleAuthErrorPage() {
  return (
    <AuthShell>
      <section className="rounded-2xl border border-rose-200 bg-card p-7 text-center shadow-card dark:border-rose-900/70 dark:bg-slate-900 sm:p-10">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300">
          <CircleAlert size={30} aria-hidden="true" />
        </div>
        <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.16em] text-rose-600">Không thể xác thực</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">Đăng nhập Google chưa hoàn tất</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Phiên xác thực đã hết hạn hoặc bị hủy. Hãy thử lại, hoặc dùng email và mật khẩu BreadTrans của bạn.
        </p>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Link href="/login" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 text-sm font-extrabold text-white transition-colors hover:bg-amber-700">
            <RefreshCw size={17} aria-hidden="true" />
            Thử đăng nhập lại
          </Link>
          <Link href="/help" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-card px-4 text-sm font-extrabold text-slate-700 transition-colors hover:border-amber-300 hover:bg-amber-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-amber-700 dark:hover:bg-amber-950/40">
            Cần hỗ trợ
          </Link>
        </div>
      </section>
    </AuthShell>
  );
}
