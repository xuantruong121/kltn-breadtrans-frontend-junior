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
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  RotateCcw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import { Button3D } from "@/components/ui";
import { AuthShell } from "./AuthShell";

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

function StepProgress({ current }: { current: 1 | 2 }) {
  return (
    <div className="mb-7" aria-label={`Bước ${current} trên 2`}>
      <div className="mb-3 flex items-center justify-between text-sm font-bold">
        <span className={current === 1 ? "text-junior-blue" : "text-slate-500"}>
          1. Thông tin
        </span>
        <span className={current === 2 ? "text-junior-blue" : "text-slate-400"}>
          2. Xác thực
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
        <motion.div
          initial={false}
          animate={{ width: current === 1 ? "50%" : "100%" }}
          transition={{ type: "spring", stiffness: 180, damping: 24 }}
          className="h-full rounded-full bg-junior-blue"
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

  useEffect(() => {
    if (step !== "otp" || resendSeconds <= 0) return;
    const timer = window.setTimeout(
      () => setResendSeconds((seconds) => Math.max(0, seconds - 1)),
      1000,
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
    if (form.fullName.trim().length < 2) next.fullName = "Họ và tên cần có ít nhất 2 ký tự.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = "Hãy nhập một địa chỉ email hợp lệ.";
    }
    if (form.password.length < 6) next.password = "Mật khẩu cần có ít nhất 6 ký tự.";
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
        getErrorMessage(requestError, "Chưa thể gửi mã OTP. Hãy kiểm tra kết nối và thử lại."),
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
          "Chưa thể xác thực tài khoản. Hãy kiểm tra mã OTP và thử lại.",
        ),
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

  const inputClassName =
    "w-full rounded-2xl border-4 border-slate-200 bg-white py-4 pl-14 pr-5 text-lg font-semibold text-slate-800 shadow-sm outline-none transition-colors placeholder:font-medium placeholder:text-slate-400 focus:border-junior-blue focus:ring-4 focus:ring-blue-100";

  return (
    <AuthShell contentPosition="start">
      <AnimatePresence mode="wait" initial={false}>
        {step === "details" && (
          <motion.section
            key="details"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25 }}
            className="mx-auto w-full max-w-lg"
          >
            <Link
              href={loginHref}
              className="mb-6 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 font-bold text-slate-600 transition-colors hover:text-junior-blue focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
            >
              <ArrowLeft size={20} aria-hidden="true" />
              Quay lại đăng nhập
            </Link>

            <StepProgress current={1} />
            <header className="mb-7">
              <p className="mb-2 font-bold uppercase tracking-[0.18em] text-junior-orange">
                Dành cho học viên
              </p>
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-800 sm:text-5xl">
                Bắt đầu hành trình!
              </h1>
              <p className="mt-3 text-base font-medium leading-relaxed text-slate-500 sm:text-lg">
                Tạo tài khoản để tham gia lớp học và khám phá thế giới tiếng Anh cùng BreadTrans.
              </p>
            </header>

            {error && (
              <div role="alert" className="mb-5 rounded-2xl border-2 border-red-200 bg-red-50 p-4 font-semibold text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={submitDetails} noValidate className="space-y-5">
              <div>
                <label htmlFor="register-full-name" className="mb-2 block text-base font-bold text-slate-700">
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <UserRound size={22} aria-hidden="true" className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="register-full-name"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    value={form.fullName}
                    onChange={(event) => updateField("fullName", event.target.value)}
                    aria-invalid={Boolean(fieldErrors.fullName)}
                    aria-describedby={fieldErrors.fullName ? "full-name-error" : undefined}
                    className={`${inputClassName} ${fieldErrors.fullName ? "border-red-300 focus:border-red-500 focus:ring-red-100" : ""}`}
                    placeholder="Ví dụ: Nguyễn Minh Anh"
                  />
                </div>
                {fieldErrors.fullName && <p id="full-name-error" className="mt-2 text-sm font-semibold text-red-600">{fieldErrors.fullName}</p>}
              </div>

              <div>
                <label htmlFor="register-email" className="mb-2 block text-base font-bold text-slate-700">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail size={22} aria-hidden="true" className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="register-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={fieldErrors.email ? "email-error" : undefined}
                    className={`${inputClassName} ${fieldErrors.email ? "border-red-300 focus:border-red-500 focus:ring-red-100" : ""}`}
                    placeholder="hocsinh@gmail.com"
                  />
                </div>
                {fieldErrors.email && <p id="email-error" className="mt-2 text-sm font-semibold text-red-600">{fieldErrors.email}</p>}
              </div>

              <div>
                <label htmlFor="register-password" className="mb-2 block text-base font-bold text-slate-700">
                  Mật khẩu <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <LockKeyhole size={22} aria-hidden="true" className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="register-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(event) => updateField("password", event.target.value)}
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby={fieldErrors.password ? "password-help password-error" : "password-help"}
                    className={`${inputClassName} pr-16 ${fieldErrors.password ? "border-red-300 focus:border-red-500 focus:ring-red-100" : ""}`}
                    placeholder="Ít nhất 6 ký tự"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    aria-pressed={showPassword}
                    className="absolute right-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-junior-blue focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
                  >
                    {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                  </button>
                </div>
                <p id="password-help" className="mt-2 text-sm font-medium text-slate-500">
                  Dùng tối thiểu 6 ký tự và không chia sẻ mật khẩu với người khác.
                </p>
                {fieldErrors.password && <p id="password-error" className="mt-1 text-sm font-semibold text-red-600">{fieldErrors.password}</p>}
              </div>

              <Button3D
                type="submit"
                size="xl"
                variant="orange"
                disabled={isSubmitting}
                className="mt-2 min-h-14 w-full"
                icon={isSubmitting ? <Loader2 className="animate-spin motion-reduce:animate-none" size={24} /> : undefined}
              >
                {isSubmitting ? "Đang gửi mã..." : "Gửi mã xác thực"}
                {!isSubmitting && <ArrowRight size={24} aria-hidden="true" />}
              </Button3D>
            </form>

            <p className="mt-7 text-center font-medium text-slate-600">
              Đã có tài khoản?{" "}
              <Link href={loginHref} className="inline-flex min-h-11 items-center font-bold text-junior-blue underline decoration-2 underline-offset-4 focus-visible:rounded-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200">
                Đăng nhập ngay
              </Link>
            </p>
          </motion.section>
        )}

        {step === "otp" && (
          <motion.section
            key="otp"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25 }}
            className="mx-auto w-full max-w-lg text-center"
          >
            <StepProgress current={2} />
            <div className="mx-auto mb-5 flex size-20 items-center justify-center rounded-[1.75rem] border-4 border-sky-200 bg-white text-junior-blue shadow-[0_7px_0_0_#bae6fd]">
              <ShieldCheck size={42} strokeWidth={2.5} aria-hidden="true" />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-800 sm:text-5xl">Kiểm tra email nhé!</h1>
            <p className="mx-auto mt-3 max-w-md text-base font-medium leading-relaxed text-slate-500 sm:text-lg">
              BreadTrans đã gửi mã gồm 6 chữ số tới
              <strong className="mt-1 block break-all text-slate-700">{form.email}</strong>
            </p>

            {error && <div role="alert" className="mt-6 rounded-2xl border-2 border-red-200 bg-red-50 p-4 text-left font-semibold text-red-700">{error}</div>}

            <form onSubmit={verifyOtp} className="mt-7">
              <fieldset>
                <legend className="mb-3 text-left text-base font-bold text-slate-700">Mã xác thực OTP</legend>
                <div className="grid grid-cols-6 gap-2 sm:gap-3">
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(element) => { otpRefs.current[index] = element; }}
                      type="text"
                      inputMode="numeric"
                      autoComplete={index === 0 ? "one-time-code" : "off"}
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(event) => updateOtpDigit(index, event.target.value)}
                      onKeyDown={(event) => handleOtpKeyDown(index, event)}
                      onPaste={handleOtpPaste}
                      aria-label={`Chữ số OTP thứ ${index + 1}`}
                      className="h-14 min-w-0 rounded-2xl border-4 border-slate-200 bg-white text-center text-2xl font-extrabold tabular-nums text-slate-800 shadow-sm outline-none transition-colors focus:border-junior-blue focus:ring-4 focus:ring-blue-100 sm:h-16 sm:text-3xl"
                    />
                  ))}
                </div>
                <p className="mt-3 text-left text-sm font-medium text-slate-500">
                  Mã có hiệu lực trong 5 phút. Bạn có thể dán toàn bộ mã vào bất kỳ ô nào.
                </p>
              </fieldset>

              <Button3D
                type="submit"
                size="xl"
                variant="orange"
                disabled={isSubmitting}
                className="mt-7 min-h-14 w-full"
                icon={isSubmitting ? <Loader2 className="animate-spin motion-reduce:animate-none" size={24} /> : undefined}
              >
                {isSubmitting ? "Đang xác thực..." : "Xác nhận tài khoản"}
                {!isSubmitting && <ArrowRight size={24} aria-hidden="true" />}
              </Button3D>
            </form>

            <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-5">
              <button
                type="button"
                onClick={() => { setError(""); setStep("details"); }}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 font-bold text-slate-600 transition-colors hover:bg-white hover:text-junior-blue focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
              >
                <ArrowLeft size={19} aria-hidden="true" />
                Thay đổi email
              </button>
              <button
                type="button"
                onClick={resendOtp}
                disabled={resendSeconds > 0 || isResending}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 font-bold text-junior-blue transition-colors hover:bg-white disabled:cursor-not-allowed disabled:text-slate-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
              >
                {isResending ? <Loader2 size={19} className="animate-spin motion-reduce:animate-none" /> : <RotateCcw size={19} aria-hidden="true" />}
                {resendSeconds > 0 ? `Gửi lại sau ${resendSeconds}s` : "Gửi lại mã"}
              </button>
            </div>
          </motion.section>
        )}

        {step === "success" && (
          <motion.section
            key="success"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 180, damping: 20 }}
            className="mx-auto w-full max-w-lg text-center"
            aria-live="polite"
          >
            <div className="mx-auto mb-7 flex size-24 items-center justify-center rounded-[2rem] border-4 border-emerald-200 bg-white text-junior-green shadow-[0_8px_0_0_#a7f3d0]">
              <CheckCircle2 size={52} strokeWidth={2.5} aria-hidden="true" />
            </div>
            <p className="mb-2 font-bold uppercase tracking-[0.18em] text-junior-green">Hoàn tất đăng ký</p>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-800 sm:text-5xl">Tài khoản đã sẵn sàng!</h1>
            <p className="mx-auto mt-4 max-w-md text-base font-medium leading-relaxed text-slate-500 sm:text-lg">
              Chào mừng {form.fullName.trim()} đến với BreadTrans Junior. Bạn có thể đăng nhập và bắt đầu học ngay bây giờ.
            </p>
            <Button3D type="button" size="xl" variant="orange" onClick={() => router.push(loginHref)} className="mt-8 min-h-14 w-full">
              Đăng nhập ngay
              <ArrowRight size={24} aria-hidden="true" />
            </Button3D>
          </motion.section>
        )}
      </AnimatePresence>
    </AuthShell>
  );
}
