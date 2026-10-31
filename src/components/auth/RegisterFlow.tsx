"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  User,
  X,
} from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import { AuthShell } from "./AuthShell";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import GoogleAccountLinkModal from "@/components/auth/GoogleAccountLinkModal";
import { getApiErrorMessage } from "@/lib/utils/apiError";

type RegisterStep = "details" | "success";
type FieldName = "fullName" | "email" | "password" | "confirmPassword";

interface RegistrationForm {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface ApiErrorShape {
  response?: { status?: number };
}

function getSafeRedirect(raw: string | null) {
  if (!raw) return null;
  const value = raw.trim();
  if (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes(":") &&
    !value.startsWith("/login")
  ) {
    return value;
  }
  return null;
}

function getErrorMessage(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return "Chưa thể tạo tài khoản. Hãy thử lại sau.";
  }
  if ((error as ApiErrorShape).response?.status === 409) {
    return "Email này đã được sử dụng. Bạn hãy đăng nhập hoặc dùng email khác.";
  }
  return getApiErrorMessage(error, "Chưa thể tạo tài khoản. Hãy thử lại sau.");
}

export default function RegisterFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const safeRedirect = getSafeRedirect(searchParams.get("redirect"));
  const loginHref = safeRedirect
    ? `/login?redirect=${encodeURIComponent(safeRedirect)}`
    : "/login";

  const [step, setStep] = useState<RegisterStep>("details");
  const [form, setForm] = useState<RegistrationForm>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<FieldName, string>>
  >({});
  const [linkModalData, setLinkModalData] = useState<{
    isOpen: boolean;
    credential: string;
  }>({ isOpen: false, credential: "" });

  const updateField = (field: FieldName, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
    if (fieldErrors[field]) {
      setFieldErrors((current) => ({ ...current, [field]: undefined }));
    }
  };

  const validateDetails = () => {
    const next: Partial<Record<FieldName, string>> = {};
    if (form.fullName.trim().length < 2) {
      next.fullName = "Họ và tên cần có ít nhất 2 ký tự.";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = "Hãy nhập một địa chỉ email hợp lệ.";
    }
    if (form.password.length < 6) {
      next.password = "Mật khẩu cần có ít nhất 6 ký tự.";
    }
    if (form.password !== form.confirmPassword) {
      next.confirmPassword = "Mật khẩu nhập lại chưa trùng khớp.";
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const passwordMismatch =
    form.confirmPassword.length > 0 && form.password !== form.confirmPassword;

  const submitDetails = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!validateDetails()) return;

    setIsSubmitting(true);
    try {
      await axiosClient.post("/auth/register", {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        fullName: form.fullName.trim(),
      });
      setStep("success");
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell>
      {step === "details" ? (
        <div className="rounded-3xl border border-amber-100 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:p-10">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
              Đăng ký BreadTrans
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              Tạo tài khoản để bắt đầu lộ trình tự học tiếng Anh của bạn.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-sm font-medium text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
            >
              <div className="flex items-center gap-2.5">
                <AlertCircle
                  size={18}
                  className="shrink-0 text-rose-600 dark:text-rose-400"
                />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError("")}
                aria-label="Đóng thông báo lỗi"
                className="rounded-lg p-1 text-rose-600 transition-colors hover:bg-rose-100 hover:text-rose-800 dark:text-rose-400 dark:hover:bg-rose-900/40 dark:hover:text-rose-200"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <form onSubmit={submitDetails} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <label
                className="block text-sm font-bold text-slate-700 dark:text-slate-300"
                htmlFor="register-full-name"
              >
                Họ và tên <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                  size={18}
                />
                <input
                  id="register-full-name"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  value={form.fullName}
                  onChange={(event) =>
                    updateField("fullName", event.target.value)
                  }
                  placeholder="Ví dụ: Nguyễn Minh Anh"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10 dark:border-slate-700 dark:bg-slate-850 dark:text-slate-100 dark:focus:bg-slate-800"
                />
              </div>
              {fieldErrors.fullName && (
                <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
                  {fieldErrors.fullName}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                className="block text-sm font-bold text-slate-700 dark:text-slate-300"
                htmlFor="register-email"
              >
                Địa chỉ Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                  size={18}
                />
                <input
                  id="register-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  required
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10 dark:border-slate-700 dark:bg-slate-850 dark:text-slate-100 dark:focus:bg-slate-800"
                />
              </div>
              {fieldErrors.email ? (
                <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
                  {fieldErrors.email}
                </p>
              ) : (
                <p className="text-xs leading-relaxed text-slate-400 dark:text-slate-500">
                  Nên dùng Gmail bạn đang sử dụng để sau này dễ xác nhận khi cần
                  đổi mật khẩu.
                </p>
              )}
            </div>

            {(["password", "confirmPassword"] as const).map((field) => (
              <div key={field} className="space-y-1.5">
                <label
                  className="block text-sm font-bold text-slate-700 dark:text-slate-300"
                  htmlFor={`register-${field}`}
                >
                  {field === "password" ? "Mật khẩu" : "Nhập lại mật khẩu"}{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <KeyRound
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                    size={18}
                  />
                  <input
                    id={`register-${field}`}
                    name={field}
                    type={showPassword ? "text" : "password"}
                    autoComplete={
                      field === "password" ? "new-password" : "new-password"
                    }
                    required
                    value={form[field]}
                    onChange={(event) => updateField(field, event.target.value)}
                    placeholder={
                      field === "password"
                        ? "Tối thiểu 6 ký tự"
                        : "Nhập lại mật khẩu"
                    }
                    aria-invalid={Boolean(
                      fieldErrors[field] ||
                      (field === "confirmPassword" && passwordMismatch),
                    )}
                    className={`w-full rounded-xl border bg-slate-50/70 py-3 pl-10 pr-11 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-4 dark:bg-slate-850 dark:text-slate-100 dark:focus:bg-slate-800 ${
                      fieldErrors[field] ||
                      (field === "confirmPassword" && passwordMismatch)
                        ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/10 dark:border-rose-700"
                        : "border-slate-200 focus:border-amber-500 focus:ring-amber-500/10 dark:border-slate-700"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute inset-y-0 right-0 flex min-h-11 min-w-11 items-center justify-center text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {fieldErrors[field] ||
                (field === "confirmPassword" && passwordMismatch) ? (
                  <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
                    {fieldErrors[field] || "Mật khẩu nhập lại chưa trùng khớp."}
                  </p>
                ) : field === "password" ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Mật khẩu gồm ít nhất 6 ký tự.
                  </p>
                ) : null}
              </div>
            ))}

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-tactile-primary mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-amber-600 px-6 py-3.5 text-sm font-bold text-white shadow-md transition-all duration-150 hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50 sm:text-base"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Đang tạo tài khoản...</span>
                </>
              ) : (
                <>
                  <span>Đăng ký tài khoản</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="relative my-6 flex items-center justify-center">
            <div className="h-px w-full bg-slate-200 dark:bg-slate-800" />
            <span className="absolute bg-white px-3 text-xs font-bold uppercase tracking-wider text-slate-400 dark:bg-slate-900 dark:text-slate-500">
              Hoặc tiếp tục với
            </span>
          </div>

          <GoogleSignInButton
            redirectUrl={safeRedirect}
            onAccountLinkRequired={({ credential }) =>
              setLinkModalData({ isOpen: true, credential })
            }
            onError={(message) => setError(message)}
          />

          <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 text-center dark:border-slate-800 dark:bg-slate-800/40">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Đã có tài khoản BreadTrans?{" "}
              <Link
                href={loginHref}
                className="ml-1 inline-block font-bold text-amber-700 hover:underline dark:text-amber-400"
              >
                Đăng nhập ngay
              </Link>
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-amber-100 bg-white p-6 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:p-10">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-100 text-emerald-600 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-400">
            <CheckCircle2 size={32} />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
            Tạo tài khoản thành công!
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Tài khoản của bạn đã sẵn sàng. Đăng nhập để bắt đầu học tiếng Anh
            theo lộ trình.
          </p>
          <button
            type="button"
            onClick={() => router.push(loginHref)}
            className="btn-tactile-primary mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-6 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-amber-700 sm:text-base"
          >
            <span>Đăng nhập ngay</span>
            <ArrowRight size={18} />
          </button>
        </div>
      )}

      <GoogleAccountLinkModal
        isOpen={linkModalData.isOpen}
        credential={linkModalData.credential}
        defaultEmail={form.email}
        redirectUrl={safeRedirect}
        onClose={() => setLinkModalData({ isOpen: false, credential: "" })}
      />
    </AuthShell>
  );
}
