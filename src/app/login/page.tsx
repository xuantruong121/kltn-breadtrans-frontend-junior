"use client";

import { useState, useEffect, useSyncExternalStore, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  X,
  Info,
  Loader2,
  ChevronDown,
} from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import {
  setAuthPersistenceMode,
  useAuthStore,
} from "@/stores/authStore";
import { useGamificationStore } from "@/stores/gamificationStore";
import { useQueryClient } from "@tanstack/react-query";
import { AuthShell } from "@/components/auth/AuthShell";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import GoogleAccountLinkModal from "@/components/auth/GoogleAccountLinkModal";
import { getDeviceId, persistDeviceId } from "@/lib/auth/deviceId";
import { normalizeAuthResponse } from "@/lib/auth/authResponse";
import { hydrateSession } from "@/lib/auth/hydrateSession";
import { getApiErrorMessage } from "@/lib/utils/apiError";

const emptySubscribe = () => () => {};

function getSafeRedirect(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (
    trimmed.startsWith("/") &&
    !trimmed.startsWith("//") &&
    !trimmed.includes(":") &&
    !trimmed.startsWith("/login")
  ) {
    return trimmed;
  }
  return null;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const safeRedirect = getSafeRedirect(searchParams.get("redirect"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showReturnBanner, setShowReturnBanner] = useState(
    Boolean(safeRedirect),
  );
  const [linkModalData, setLinkModalData] = useState<{
    isOpen: boolean;
    credential: string;
  }>({ isOpen: false, credential: "" });

  const { user, setAuth } = useAuthStore();
  const isReady = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  // Auto redirect if already logged in
  useEffect(() => {
    if (isReady && user) {
      if (user.role === "ADMIN") {
        router.push("/admin");
      } else {
        router.push(safeRedirect || "/dashboard");
      }
    }
  }, [isReady, user, router, safeRedirect]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg("Vui lòng nhập đầy đủ địa chỉ email và mật khẩu.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      const deviceId = getDeviceId();

      const res = normalizeAuthResponse(
        await axiosClient.post("/auth/login", {
          email: email.trim().toLowerCase(),
          password,
          deviceId,
        }),
      );

      // Clear any previous user's cached queries and gamification store
      queryClient.clear();
      useGamificationStore.getState().reset();

      // Set user session in authStore
      setAuthPersistenceMode(rememberMe);
      setAuth(res.access_token, res.refresh_token, res.user);
      persistDeviceId(res.deviceId || deviceId);
      await hydrateSession(queryClient);

      if (res.user.role === "ADMIN") {
        router.push("/admin");
      } else {
        router.push(safeRedirect || "/dashboard");
      }
    } catch (error: any) {
      console.error("Login failed:", error);
      setErrorMsg(getApiErrorMessage(error, "Email hoặc mật khẩu không chính xác. Vui lòng thử lại."));
    } finally {
      setIsLoading(false);
    }
  };

  const registerHref = safeRedirect
    ? `/register?redirect=${encodeURIComponent(safeRedirect)}`
    : "/register";

  return (
    <>
      {/* Return URL Context Notification Banner */}
      {showReturnBanner && (
        <div className="mx-auto mb-4 w-full max-w-[480px] bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-900/60 p-3.5 rounded-2xl shadow-xs flex items-start justify-between gap-3 transition-all duration-200">
          <div className="flex items-start gap-2.5 text-xs sm:text-sm leading-snug">
            <Info className="text-amber-600 dark:text-amber-400 size-5 shrink-0 mt-0.5" />
            <div>
              Bạn cần đăng nhập để truy cập tính năng vừa chọn. Hệ thống sẽ tự
              động chuyển tiếp ngay sau khi xác thực thành công.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowReturnBanner(false)}
            aria-label="Đóng thông báo"
            className="text-amber-700/70 hover:text-amber-900 p-1 rounded-lg hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/50 transition-colors shrink-0 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Authentication Card */}
      <div className="relative mx-auto w-full max-w-[480px] overflow-hidden rounded-3xl border border-orange-100/90 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(255,237,213,0.55)_0%,rgba(255,255,255,1)_55%)] p-8 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.08),0_0_0_1px_rgba(251,146,60,0.08)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900 sm:p-10">
        {/* Header Info */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-[30px]">
            Chào mừng trở lại
          </h1>
          <p className="mt-2 text-[15px] text-slate-500 dark:text-slate-400">
            Đăng nhập nhanh bằng Google để tiếp tục học.
          </p>
        </div>

        {/* Alert Notification Box */}
        {errorMsg && (
          <div
            role="alert"
            className="mb-5 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-900/60 p-3.5 rounded-2xl text-sm font-medium flex items-center justify-between gap-3 animate-in fade-in duration-150"
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle
                size={18}
                className="text-rose-600 dark:text-rose-400 shrink-0"
              />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMsg("")}
              aria-label="Đóng thông báo lỗi"
              className="text-rose-600 hover:text-rose-800 p-1 rounded-lg hover:bg-rose-100 dark:text-rose-300 dark:hover:bg-rose-900/50 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Google-first sign in */}
        <div className="mb-6">
          <GoogleSignInButton
            redirectUrl={safeRedirect}
            onAccountLinkRequired={({ credential }) =>
              setLinkModalData({ isOpen: true, credential })
            }
            onError={(msg) => setErrorMsg(msg)}
          />
        </div>

        <div className="my-6 flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-700" />
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            hoặc
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-700" />
        </div>

        <button
          type="button"
          aria-expanded={showEmailLogin}
          aria-controls="email-login-panel"
          onClick={() => setShowEmailLogin((current) => !current)}
          className="group flex w-full flex-col items-center rounded-2xl px-3 py-3.5 text-center transition-all duration-200 hover:-translate-y-0.5 hover:bg-orange-50/70 hover:shadow-[0_8px_20px_-12px_rgba(234,88,12,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.99] dark:hover:bg-slate-800/60"
        >
          <span className="mb-0.5 block text-[13px] text-slate-400 dark:text-slate-500">
            Đã có tài khoản email?
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-white sm:text-[14px]">
            Đăng nhập bằng email/mật khẩu
            <ChevronDown
              size={16}
              className={`transition-transform duration-200 ${
                showEmailLogin ? "rotate-180" : ""
              }`}
              aria-hidden="true"
            />
          </span>
        </button>

        {showEmailLogin && (
          <div id="email-login-panel" className="mt-4">
            <form className="space-y-4" onSubmit={handleLogin}>
          {/* Email Input Field */}
          <div className="space-y-1.5">
            <label
              className="block text-sm font-bold text-slate-700 dark:text-slate-300"
              htmlFor="emailInput"
            >
              Địa chỉ Email <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 dark:text-slate-500">
                <Mail size={18} />
              </span>
              <input
                id="emailInput"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                aria-invalid={Boolean(errorMsg)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50/70 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all"
              />
            </div>
          </div>

          {/* Password Input Field */}
          <div className="space-y-1.5">
            <label
              className="block text-sm font-bold text-slate-700 dark:text-slate-300"
              htmlFor="passwordInput"
            >
              Mật khẩu <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 dark:text-slate-500">
                <KeyRound size={18} />
              </span>
              <input
                id="passwordInput"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                aria-invalid={Boolean(errorMsg)}
                className="w-full pl-10 pr-11 py-3 bg-slate-50/70 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all"
              />
              <button
                type="button"
                id="togglePassBtn"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex min-h-11 min-w-11 items-center justify-center text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors cursor-pointer"
                title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Options Row: Remember & Forgot */}
          <div className="flex items-center justify-between text-xs sm:text-sm pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
              <input
                id="rememberMe"
                name="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
              <span>Ghi nhớ đăng nhập</span>
            </label>
            <Link
              href="/forgot-password"
              className="font-bold text-amber-700 dark:text-amber-400 hover:underline transition-colors"
            >
              Quên mật khẩu?
            </Link>
          </div>

          {/* CTA Primary Action */}
          <button
            type="submit"
            id="submitBtn"
            disabled={isLoading}
            className="btn-tactile-primary w-full py-3.5 px-6 rounded-xl font-bold text-sm sm:text-base bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 text-white dark:text-slate-950 shadow-md transition-all duration-150 flex items-center justify-center gap-2 select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <span>Đăng nhập</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
            </form>
          </div>
        )}

        {/* Footer Card Direction */}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-1.5 border-t border-slate-100 pt-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <span>Chưa có tài khoản BreadTrans?</span>
          <Link
            href={registerHref}
            className="group inline-flex items-center gap-1 font-semibold text-orange-600 transition-colors hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
          >
            Đăng ký ngay miễn phí
            <ArrowRight
              size={14}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>

      <GoogleAccountLinkModal
        isOpen={linkModalData.isOpen}
        credential={linkModalData.credential}
        defaultEmail={email}
        redirectUrl={safeRedirect}
        onClose={() => setLinkModalData({ isOpen: false, credential: "" })}
      />
    </>
  );
}

export default function LoginPage() {
  return (
    <AuthShell contentClassName="max-w-xl">
      <Suspense
        fallback={
          <div className="p-12 text-center text-sm text-on-surface-variant animate-pulse">
            Đang tải biểu mẫu...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
