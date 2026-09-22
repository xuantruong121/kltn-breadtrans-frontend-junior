"use client";

import { useState, useEffect, useSyncExternalStore, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Lock,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  X,
  Info,
  Loader2,
} from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import { useAuthStore } from "@/stores/authStore";
import { useGamificationStore } from "@/stores/gamificationStore";
import { useQueryClient } from "@tanstack/react-query";
import { AuthShell } from "@/components/auth/AuthShell";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import GoogleAccountLinkModal from "@/components/auth/GoogleAccountLinkModal";
import { getDeviceId, persistDeviceId } from "@/lib/auth/deviceId";
import { normalizeAuthResponse } from "@/lib/auth/authResponse";
import { hydrateSession } from "@/lib/auth/hydrateSession";

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
      const msg = error.response?.data?.message;
      setErrorMsg(
        Array.isArray(msg)
          ? msg.join(". ")
          : msg || "Email hoặc mật khẩu không chính xác. Vui lòng thử lại.",
      );
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
        <div className="mb-4 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-900/60 p-3.5 rounded-2xl shadow-xs flex items-start justify-between gap-3 transition-all duration-200">
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
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl p-6 sm:p-10 relative border border-amber-100 dark:border-slate-800">
        {/* Header Info */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-center justify-center mx-auto mb-3 shadow-xs text-amber-700 dark:text-amber-400">
            <Lock size={22} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Đăng nhập BreadTrans
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
            Chào mừng bạn quay trở lại! Tiếp tục hành trình học tiếng Anh của
            bạn.
          </p>
        </div>

        {/* Alert Notification Box */}
        {errorMsg && (
          <div
            role="alert"
            className="mb-5 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-900/60 p-3.5 rounded-2xl text-sm font-medium flex items-center justify-between gap-3 animate-in fade-in duration-150"
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle size={18} className="text-rose-600 dark:text-rose-400 shrink-0" />
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

        {/* Form Elements */}
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
              href="mailto:support@breadtrans.edu.vn?subject=Y%C3%AAu%20c%E1%BA%A7u%20h%E1%BB%97%20tr%E1%BB%A3%20%C4%91%E1%BA%B7t%20l%E1%BA%A1i%20m%E1%BA%ADt%20kh%E1%BA%A9u"
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

        {/* Divider with Text */}
        <div className="relative my-6 flex items-center justify-center">
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-[1px]" />
          <span className="absolute px-3 bg-white dark:bg-slate-900 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Hoặc tiếp tục với
          </span>
        </div>

        {/* Social SSO: Google Authentication */}
        <div className="space-y-2">
          <GoogleSignInButton
            redirectUrl={safeRedirect}
            onAccountLinkRequired={({ credential }) =>
              setLinkModalData({ isOpen: true, credential })
            }
            onError={(msg) => setErrorMsg(msg)}
          />
        </div>

        {/* Footer Card Direction */}
        <div className="mt-6 text-center pt-3 bg-slate-50/80 dark:bg-slate-850/60 border border-slate-100 dark:border-slate-800 rounded-2xl p-3.5">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Chưa có tài khoản BreadTrans?{" "}
            <Link
              href={registerHref}
              className="font-bold text-amber-700 dark:text-amber-400 hover:underline ml-1 inline-block"
            >
              Đăng ký ngay miễn phí
            </Link>
          </p>
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
    <AuthShell>
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
