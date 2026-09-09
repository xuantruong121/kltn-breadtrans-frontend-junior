"use client";

import {
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import axiosClient from "@/lib/api/axiosClient";
import { AuthShell } from "./AuthShell";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import GoogleAccountLinkModal from "@/components/auth/GoogleAccountLinkModal";

type RegisterStep = "details" | "otp" | "success";
type FieldName = "fullName" | "email" | "password";

interface RegistrationForm {
  fullName: string;
  email: string;
  password: string;
}

interface ApiErrorShape {
  response?: { data?: { message?: string | string[] } };
}

const OTP_LENGTH = 6;
const RESEND_DELAY_SECONDS = 60;
const emptyOtp = () => Array.from({ length: OTP_LENGTH }, () => "");

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

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error !== "object" || error === null) return fallback;
  const message = (error as ApiErrorShape).response?.data?.message;
  const raw = Array.isArray(message) ? message.join(". ") : message;
  if (!raw) return fallback;

  const normalized = raw.toLowerCase();
  if (normalized.includes("already") || normalized.includes("exist")) {
    return "Email này đã được sử dụng. Bạn hãy đăng nhập hoặc dùng email khác.";
  }
  if (normalized.includes("expired")) {
    return "Mã OTP đã hết hạn. Hãy yêu cầu gửi một mã mới.";
  }
  if (normalized.includes("attempt")) {
    return "Bạn đã nhập sai quá số lần cho phép. Hãy gửi lại mã OTP mới.";
  }
  if (normalized.includes("otp") || normalized.includes("invalid")) {
    return "Mã OTP chưa đúng. Hãy kiểm tra email và thử lại.";
  }
  return raw;
}

function StepProgressBar({ current }: { current: 1 | 2 }) {
  return (
    <div className="mb-6" aria-label={`Bước ${current} trên 2`}>
      <div className="mb-2 flex items-center justify-between text-xs font-bold">
        <span className={current === 1 ? "text-primary font-bold" : "text-on-surface-variant/60"}>
          1. Thông tin tài khoản
        </span>
        <span className={current === 2 ? "text-primary font-bold" : "text-on-surface-variant/60"}>
          2. Xác thực email
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-container-highest" aria-hidden="true">
        <motion.div
          initial={false}
          animate={{ width: current === 1 ? "50%" : "100%" }}
          transition={{ type: "spring", stiffness: 180, damping: 24 }}
          className="h-full rounded-full bg-primary"
        />
      </div>
    </div>
  );
}

export default function RegisterFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const safeRedirect = getSafeRedirect(searchParams.get("redirect"));
  const loginHref = safeRedirect
    ? `/login?redirect=${encodeURIComponent(safeRedirect)}`
    : "/login";

  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [step, setStep] = useState<RegisterStep>("details");
  const [form, setForm] = useState<RegistrationForm>({
    fullName: "",
    email: "",
    password: "",
  });
  const [otpDigits, setOtpDigits] = useState<string[]>(emptyOtp);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(RESEND_DELAY_SECONDS);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [linkModalData, setLinkModalData] = useState<{
    isOpen: boolean;
    credential: string;
  }>({ isOpen: false, credential: "" });

  useEffect(() => {
    if (step !== "otp" || resendSeconds <= 0) return;
    const timer = window.setTimeout(
      () => setResendSeconds((seconds) => Math.max(0, seconds - 1)),
      1000
    );
    return () => window.clearTimeout(timer);
  }, [step, resendSeconds]);

  useEffect(() => {
    if (step === "otp") otpRefs.current[0]?.focus();
  }, [step]);

  const updateField = (field: FieldName, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
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
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const registrationPayload = () => ({
    email: form.email.trim().toLowerCase(),
    password: form.password,
    fullName: form.fullName.trim(),
  });

  const submitDetails = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!validateDetails()) return;

    setIsSubmitting(true);
    try {
      await axiosClient.post("/auth/register", registrationPayload());
      setOtpDigits(emptyOtp());
      setResendSeconds(RESEND_DELAY_SECONDS);
      setStep("otp");
    } catch (requestError: unknown) {
      setError(
        getErrorMessage(requestError, "Chưa thể gửi mã OTP. Hãy kiểm tra kết nối và thử lại.")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateOtpDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    setOtpDigits((current) => {
      const next = [...current];
      next[index] = digit;
      return next;
    });
    setError("");
    if (digit && index < OTP_LENGTH - 1) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowLeft" && index > 0) otpRefs.current[index - 1]?.focus();
    if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const digits = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH)
      .split("");
    if (!digits.length) return;

    event.preventDefault();
    setOtpDigits(Array.from({ length: OTP_LENGTH }, (_, index) => digits[index] ?? ""));
    setError("");
    otpRefs.current[Math.min(digits.length, OTP_LENGTH) - 1]?.focus();
  };

  const verifyOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const otp = otpDigits.join("");
    setError("");
    if (otp.length !== OTP_LENGTH) {
      setError("Hãy nhập đủ 6 chữ số trong mã OTP.");
      const firstEmpty = otpDigits.findIndex((digit) => !digit);
      otpRefs.current[Math.max(firstEmpty, 0)]?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      await axiosClient.post("/auth/register/verify", {
        email: form.email.trim().toLowerCase(),
        otp,
      });
      setStep("success");
    } catch (requestError: unknown) {
      setError(
        getErrorMessage(
          requestError,
          "Chưa thể xác thực tài khoản. Hãy kiểm tra mã OTP và thử lại."
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendOtp = async () => {
    if (resendSeconds > 0 || isResending) return;
    setError("");
    setIsResending(true);
    try {
      await axiosClient.post("/auth/register", registrationPayload());
      setOtpDigits(emptyOtp());
      setResendSeconds(RESEND_DELAY_SECONDS);
      otpRefs.current[0]?.focus();
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError, "Chưa thể gửi lại OTP. Hãy thử lại sau một lát."));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthShell>
      <AnimatePresence mode="wait" initial={false}>
        {step === "details" && (
          <motion.div
            key="details"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="bg-surface-container-lowest rounded-2xl shadow-xl p-6 sm:p-10 relative border border-surface-container-high/60"
          >
            <StepProgressBar current={1} />

            {/* Header Info */}
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-primary-fixed flex items-center justify-center mx-auto mb-3 shadow-xs">
                <span
                  className="material-symbols-outlined text-primary text-[28px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  person_add
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
                Đăng ký BreadTrans
              </h1>
              <p className="text-sm text-on-surface-variant mt-1.5 leading-relaxed">
                Tạo tài khoản học viên để bắt đầu hành trình nâng cao 4 kỹ năng tiếng Anh.
              </p>
            </div>

            {/* Error Alert Box */}
            {error && (
              <div className="mb-5 bg-error-container text-on-error-container border border-error/20 p-3 rounded-xl text-sm font-medium flex items-center justify-between gap-2 animate-in fade-in duration-150">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-error text-[20px] shrink-0">
                    error
                  </span>
                  <span>{error}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setError("")}
                  aria-label="Đóng thông báo lỗi"
                  className="text-on-error-container/80 hover:text-on-error-container p-0.5 rounded-md transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            )}

            {/* Form Elements */}
            <form onSubmit={submitDetails} noValidate className="space-y-4">
              {/* Full Name Field */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-on-surface" htmlFor="register-full-name">
                  Họ và tên <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-on-surface-variant/70">
                    <span className="material-symbols-outlined text-[20px]">person</span>
                  </span>
                  <input
                    id="register-full-name"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    required
                    value={form.fullName}
                    onChange={(e) => updateField("fullName", e.target.value)}
                    placeholder="Ví dụ: Nguyễn Minh Anh"
                    className={`w-full pl-10 pr-4 py-3 bg-surface-container-low border rounded-xl text-on-surface text-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:bg-surface-container-lowest transition-all ${
                      fieldErrors.fullName
                        ? "border-error focus:ring-4 focus:ring-error/10"
                        : "border-transparent focus:border-primary focus:ring-4 focus:ring-primary/10"
                    }`}
                  />
                </div>
                {fieldErrors.fullName && (
                  <p className="text-xs text-error font-medium mt-1">{fieldErrors.fullName}</p>
                )}
              </div>

              {/* Email Field */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-on-surface" htmlFor="register-email">
                  Địa chỉ Email <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-on-surface-variant/70">
                    <span className="material-symbols-outlined text-[20px]">mail</span>
                  </span>
                  <input
                    id="register-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    required
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="name@example.com"
                    className={`w-full pl-10 pr-4 py-3 bg-surface-container-low border rounded-xl text-on-surface text-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:bg-surface-container-lowest transition-all ${
                      fieldErrors.email
                        ? "border-error focus:ring-4 focus:ring-error/10"
                        : "border-transparent focus:border-primary focus:ring-4 focus:ring-primary/10"
                    }`}
                  />
                </div>
                {fieldErrors.email && (
                  <p className="text-xs text-error font-medium mt-1">{fieldErrors.email}</p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-on-surface" htmlFor="register-password">
                  Mật khẩu <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-on-surface-variant/70">
                    <span className="material-symbols-outlined text-[20px]">key</span>
                  </span>
                  <input
                    id="register-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={form.password}
                    onChange={(e) => updateField("password", e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    className={`w-full pl-10 pr-11 py-3 bg-surface-container-low border rounded-xl text-on-surface text-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:bg-surface-container-lowest transition-all ${
                      fieldErrors.password
                        ? "border-error focus:ring-4 focus:ring-error/10"
                        : "border-transparent focus:border-primary focus:ring-4 focus:ring-primary/10"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-on-surface-variant/70 hover:text-on-surface transition-colors"
                    title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
                {fieldErrors.password ? (
                  <p className="text-xs text-error font-medium mt-1">{fieldErrors.password}</p>
                ) : (
                  <p className="text-xs text-on-surface-variant/70 mt-1">
                    Mật khẩu gồm ít nhất 6 ký tự để bảo vệ tài khoản của bạn.
                  </p>
                )}
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 rounded-xl font-bold text-sm sm:text-base bg-primary text-on-primary hover:bg-primary-container shadow-md transition-all duration-150 flex items-center justify-center gap-2 select-none active:scale-[0.99] disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer mt-2"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-on-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        fill="currentColor"
                      />
                    </svg>
                    <span>Đang gửi mã xác thực...</span>
                  </>
                ) : (
                  <>
                    <span>Đăng ký tài khoản</span>
                    <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                  </>
                )}
              </button>
            </form>

            {/* Divider with Text */}
            <div className="relative my-6 flex items-center justify-center">
              <div className="w-full bg-surface-container-highest h-[1px]" />
              <span className="absolute px-3 bg-surface-container-lowest text-xs font-semibold text-on-surface-variant/70 uppercase tracking-wider">
                Hoặc tiếp tục với
              </span>
            </div>

            {/* Google SSO */}
            <div className="space-y-2">
              <GoogleSignInButton
                redirectUrl={safeRedirect}
                onAccountLinkRequired={({ credential }) =>
                  setLinkModalData({ isOpen: true, credential })
                }
                onError={(msg) => setError(msg)}
              />
            </div>

            {/* Footer Card Direction */}
            <div className="mt-6 text-center pt-3 bg-surface-container-low/50 rounded-xl p-3">
              <p className="text-sm text-on-surface-variant">
                Đã có tài khoản BreadTrans?{" "}
                <Link
                  href={loginHref}
                  className="font-bold text-primary hover:underline ml-1 inline-block"
                >
                  Đăng nhập ngay
                </Link>
              </p>
            </div>
          </motion.div>
        )}

        {step === "otp" && (
          <motion.div
            key="otp"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="bg-surface-container-lowest rounded-2xl shadow-xl p-6 sm:p-10 relative border border-surface-container-high/60"
          >
            <StepProgressBar current={2} />

            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-primary-fixed flex items-center justify-center mx-auto mb-3 shadow-xs">
                <span
                  className="material-symbols-outlined text-primary text-[28px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  mark_email_read
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
                Kiểm tra email nhé!
              </h1>
              <p className="text-sm text-on-surface-variant mt-1.5 leading-relaxed">
                BreadTrans đã gửi mã xác thực 6 chữ số tới địa chỉ
              </p>
              <div className="mt-1 font-bold text-primary break-all text-sm">{form.email}</div>
            </div>

            {error && (
              <div className="mb-5 bg-error-container text-on-error-container border border-error/20 p-3 rounded-xl text-sm font-medium flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-error text-[20px] shrink-0">
                    error
                  </span>
                  <span>{error}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setError("")}
                  className="text-on-error-container/80 hover:text-on-error-container p-0.5 rounded-md"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            )}

            <form onSubmit={verifyOtp} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-3 text-center">
                  Nhập mã 6 chữ số
                </label>
                <div className="grid grid-cols-6 gap-2 sm:gap-3">
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(element) => {
                        otpRefs.current[index] = element;
                      }}
                      type="text"
                      inputMode="numeric"
                      autoComplete={index === 0 ? "one-time-code" : "off"}
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => updateOtpDigit(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      onPaste={handleOtpPaste}
                      aria-label={`Chữ số OTP thứ ${index + 1}`}
                      className="h-13 sm:h-14 min-w-0 rounded-xl bg-surface-container-low border border-outline-variant/40 text-center text-xl sm:text-2xl font-bold text-on-surface focus:outline-none focus:bg-surface-container-lowest focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                    />
                  ))}
                </div>
                <p className="mt-3 text-center text-xs text-on-surface-variant/70">
                  Mã có hiệu lực trong 5 phút. Bạn có thể dán toàn bộ mã vào bất kỳ ô nào.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 rounded-xl font-bold text-sm sm:text-base bg-primary text-on-primary hover:bg-primary-container shadow-md transition-all duration-150 flex items-center justify-center gap-2 select-none active:scale-[0.99] disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-on-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        fill="currentColor"
                      />
                    </svg>
                    <span>Đang xác thực...</span>
                  </>
                ) : (
                  <>
                    <span>Xác nhận tài khoản</span>
                    <span className="material-symbols-outlined text-[20px]">check</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-surface-container-high/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setStep("details");
                }}
                className="inline-flex items-center gap-1.5 font-semibold text-on-surface-variant hover:text-primary transition-colors py-1 px-2 rounded-lg hover:bg-surface-container-low"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                <span>Thay đổi email</span>
              </button>

              <button
                type="button"
                onClick={resendOtp}
                disabled={resendSeconds > 0 || isResending}
                className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline disabled:text-on-surface-variant/50 disabled:no-underline disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[18px]">replay</span>
                <span>
                  {resendSeconds > 0 ? `Gửi lại sau ${resendSeconds}s` : "Gửi lại mã OTP"}
                </span>
              </button>
            </div>
          </motion.div>
        )}

        {step === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="bg-surface-container-lowest rounded-2xl shadow-xl p-6 sm:p-10 relative border border-surface-container-high/60 text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-xs">
              <span
                className="material-symbols-outlined text-[32px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
            </div>

            <div className="inline-block px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-2">
              Hoàn tất đăng ký
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
              Tài khoản đã sẵn sàng!
            </h1>

            <p className="text-sm text-on-surface-variant mt-2 max-w-sm mx-auto leading-relaxed">
              Chào mừng <strong className="text-on-surface">{form.fullName.trim()}</strong> đến
              với BreadTrans. Bạn có thể đăng nhập và bắt đầu học tập ngay bây giờ.
            </p>

            <button
              type="button"
              onClick={() => router.push(loginHref)}
              className="mt-6 w-full py-3.5 px-6 rounded-xl font-bold text-sm sm:text-base bg-primary text-on-primary hover:bg-primary-container shadow-md transition-all duration-150 flex items-center justify-center gap-2 select-none active:scale-[0.99] cursor-pointer"
            >
              <span>Đăng nhập ngay</span>
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
