"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CircleAlert, Loader2, Mail } from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import { AuthShell } from "@/components/auth/AuthShell";
import { getApiErrorMessage } from "@/lib/utils/apiError";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await axiosClient.post("/auth/forgot-password", {
        email: email.trim().toLowerCase(),
      });
      setSubmitted(true);
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, "Chưa thể gửi yêu cầu. Vui lòng thử lại sau."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell>
      <section className="rounded-3xl border border-amber-100 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:p-10">
        <div className="text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
            Quên mật khẩu?
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            Nhập email đã đăng ký. Nếu tài khoản tồn tại, bạn sẽ nhận được liên kết đặt lại mật khẩu.
          </p>
        </div>

        {submitted ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
            Hãy kiểm tra hộp thư của bạn. Liên kết có hiệu lực trong 15 phút và chỉ dùng được một lần.
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
                <CircleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="forgot-email" className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                Địa chỉ Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  id="forgot-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-800"
                />
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="btn-tactile-primary flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 text-sm font-bold text-white shadow-md transition-all hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60 sm:text-base">
              {isLoading ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}
              {isLoading ? "Đang gửi yêu cầu..." : "Gửi liên kết đặt lại"}
            </button>
          </form>
        )}

        <Link href="/login" className="mt-6 block text-center text-sm font-semibold text-amber-700 hover:underline dark:text-amber-400">
          Quay lại đăng nhập
        </Link>
      </section>
    </AuthShell>
  );
}
