"use client";

import Link from "next/link";
import { CircleAlert, RefreshCw } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";

export default function GoogleAuthErrorPage() {
  return (
    <AuthShell>
      <section className="rounded-2xl border border-rose-200 bg-white p-7 text-center shadow-card sm:p-10">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <CircleAlert size={30} aria-hidden="true" />
        </div>
        <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.16em] text-rose-600">Không thể xác thực</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Đăng nhập Google chưa hoàn tất</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Phiên xác thực đã hết hạn hoặc bị hủy. Hãy thử lại, hoặc dùng email và mật khẩu BreadTrans của bạn.
        </p>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Link href="/login" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 text-sm font-extrabold text-white transition-colors hover:bg-amber-700">
            <RefreshCw size={17} aria-hidden="true" />
            Thử đăng nhập lại
          </Link>
          <Link href="/help" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-700 transition-colors hover:border-amber-300 hover:bg-amber-50">
            Cần hỗ trợ
          </Link>
        </div>
      </section>
    </AuthShell>
  );
}
