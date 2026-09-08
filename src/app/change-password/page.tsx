"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CircleAlert, Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import { AuthShell } from "@/components/auth/AuthShell";
import { useAuthStore } from "@/stores/authStore";

type PasswordFieldProps = {
  id: string;
  label: string;
  value: string;
  show: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
  autoComplete: string;
  hint?: string;
  hasError: boolean;
};

function PasswordField({ id, label, value, show, onToggle, onChange, autoComplete, hint, hasError }: PasswordFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-bold text-on-surface">{label}</label>
      <div className="relative">
        <input id={id} required minLength={id === "new-password" ? 8 : undefined} type={show ? "text" : "password"} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} aria-invalid={hasError} className="w-full rounded-xl border border-surface-container-high bg-surface-container-low px-4 py-3 pr-12 text-sm text-on-surface outline-none transition-all placeholder:text-on-surface-variant/55 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10" />
        <button type="button" onClick={onToggle} aria-label={show ? `Ẩn ${label.toLowerCase()}` : `Hiện ${label.toLowerCase()}`} aria-pressed={show} className="absolute inset-y-0 right-0 flex min-h-11 min-w-11 items-center justify-center rounded-r-xl text-on-surface-variant hover:text-primary">
          {show ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
        </button>
      </div>
      {hint && <p className="text-xs leading-5 text-on-surface-variant">{hint}</p>}
    </div>
  );
}

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    if (error) setError("");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (form.newPassword.length < 8) {
      setError("Mật khẩu mới cần có ít nhất 8 ký tự.");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError("Xác nhận mật khẩu mới chưa khớp.");
      return;
    }

    setIsLoading(true);
    try {
      await axiosClient.post("/auth/change-password", {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      router.replace(user?.role === "ADMIN" ? "/admin" : "/dashboard");
    } catch (requestError: any) {
      const message = requestError?.response?.data?.message;
      setError(Array.isArray(message) ? message.join(". ") : message || "Không thể đổi mật khẩu. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell>
      <section className="rounded-2xl border border-surface-container-high/70 bg-surface-container-lowest p-6 shadow-card sm:p-10">
        <div className="text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary-fixed text-primary shadow-sm"><KeyRound size={27} aria-hidden="true" /></div>
          <p className="mt-4 text-xs font-extrabold uppercase tracking-[0.16em] text-primary">Bảo mật tài khoản</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-on-surface sm:text-3xl">Đổi mật khẩu bắt buộc</h1>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">Để bảo vệ tài khoản, hãy đặt một mật khẩu mới trước khi tiếp tục học.</p>
        </div>

        {error && <div role="alert" className="mt-6 flex items-start gap-2 rounded-xl border border-error/20 bg-error-container p-3 text-sm font-medium text-on-error-container"><CircleAlert size={19} className="mt-0.5 shrink-0 text-error" aria-hidden="true" />{error}</div>}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <PasswordField id="current-password" label="Mật khẩu hiện tại" value={form.currentPassword} show={showCurrent} onToggle={() => setShowCurrent((value) => !value)} onChange={(value) => updateField("currentPassword", value)} autoComplete="current-password" hasError={Boolean(error)} />
          <PasswordField id="new-password" label="Mật khẩu mới" value={form.newPassword} show={showNew} onToggle={() => setShowNew((value) => !value)} onChange={(value) => updateField("newPassword", value)} autoComplete="new-password" hint="Tối thiểu 8 ký tự. Không dùng lại mật khẩu cũ." hasError={Boolean(error)} />
          <PasswordField id="confirm-password" label="Xác nhận mật khẩu mới" value={form.confirmPassword} show={showConfirm} onToggle={() => setShowConfirm((value) => !value)} onChange={(value) => updateField("confirmPassword", value)} autoComplete="new-password" hasError={Boolean(error)} />
          <button type="submit" disabled={isLoading} className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-extrabold text-on-primary shadow-sm transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-70">
            {isLoading ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <ShieldCheck size={18} aria-hidden="true" />}
            {isLoading ? "Đang cập nhật..." : "Đổi mật khẩu và tiếp tục"}
            {!isLoading && <ArrowRight size={18} aria-hidden="true" />}
          </button>
        </form>
      </section>
    </AuthShell>
  );
}
