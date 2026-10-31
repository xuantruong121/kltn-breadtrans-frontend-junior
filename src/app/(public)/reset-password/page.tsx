"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { ArrowRight, CircleAlert, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import axiosClient from "@/lib/api/axiosClient";
import { AuthShell } from "@/components/auth/AuthShell";
import { getApiErrorMessage } from "@/lib/utils/apiError";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!token) {
      setError("Liên kết đặt lại mật khẩu không hợp lệ.");
      return;
    }
    if (password.length < 8) {
      setError("Mật khẩu mới cần có ít nhất 8 ký tự.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Mật khẩu nhập lại chưa trùng khớp.");
      return;
    }

    setIsLoading(true);
    try {
      await axiosClient.post("/auth/reset-password", {
        token,
        newPassword: password,
      });
      setCompleted(true);
    } catch (requestError: any) {
      setError(getApiErrorMessage(requestError, "Liên kết đã hết hạn hoặc không hợp lệ."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="rounded-3xl border border-amber-100 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:p-10">
      <div className="text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
          Đặt lại mật khẩu
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Tạo mật khẩu mới để tiếp tục sử dụng tài khoản BreadTrans.
        </p>
      </div>

      {completed ? (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
            Mật khẩu đã được cập nhật. Bạn có thể đăng nhập bằng mật khẩu mới.
          </div>
          <Link href="/login" className="btn-tactile-primary flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 text-sm font-bold text-white shadow-md transition-all hover:bg-amber-700 sm:text-base">
            Đăng nhập ngay <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
              <CircleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
          {(["password", "confirmPassword"] as const).map((field) => (
            <div key={field} className="space-y-1.5">
              <label htmlFor={`reset-${field}`} className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                {field === "password" ? "Mật khẩu mới" : "Nhập lại mật khẩu"} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <KeyRound size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  id={`reset-${field}`}
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={field === "password" ? password : confirmPassword}
                  onChange={(event) => field === "password" ? setPassword(event.target.value) : setConfirmPassword(event.target.value)}
                  placeholder="Tối thiểu 8 ký tự"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-3 pl-10 pr-11 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-800"
                />
                <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} className="absolute inset-y-0 right-0 flex min-h-11 min-w-11 items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                  {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
              </div>
            </div>
          ))}
          <p className="text-xs leading-5 text-slate-400 dark:text-slate-500">Mật khẩu mới phải có ít nhất 8 ký tự.</p>
          <button type="submit" disabled={isLoading} className="btn-tactile-primary flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 text-sm font-bold text-white shadow-md transition-all hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60 sm:text-base">
            {isLoading ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}
            {isLoading ? "Đang cập nhật..." : "Đặt lại mật khẩu"}
          </button>
        </form>
      )}
    </section>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell>
      <Suspense fallback={<div className="rounded-3xl bg-white p-10 text-center text-sm text-slate-500 shadow-xl">Đang tải biểu mẫu...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
