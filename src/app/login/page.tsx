"use client";

import { useState, useEffect, useSyncExternalStore, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import axiosClient from "@/lib/api/axiosClient";
import { useAuthStore } from "@/stores/authStore";
import { useGamificationStore } from "@/stores/gamificationStore";
import { useQueryClient } from "@tanstack/react-query";
import { AuthShell } from "@/components/auth/AuthShell";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import GoogleAccountLinkModal from "@/components/auth/GoogleAccountLinkModal";

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
  const [showReturnBanner, setShowReturnBanner] = useState(Boolean(safeRedirect));
  const [linkModalData, setLinkModalData] = useState<{
    isOpen: boolean;
    credential: string;
  }>({ isOpen: false, credential: "" });

  const { user, setAuth } = useAuthStore();
  const isReady = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
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
      let deviceId = typeof window !== "undefined" ? localStorage.getItem("deviceId") : null;
      if (!deviceId && typeof window !== "undefined") {
        deviceId = crypto.randomUUID();
        localStorage.setItem("deviceId", deviceId);
      }

      const res: any = await axiosClient.post("/auth/login", {
        email: email.trim().toLowerCase(),
        password,
        deviceId,
      });

      // Clear any previous user's cached queries and gamification store
      queryClient.clear();
      useGamificationStore.getState().reset();

      // Set user session in authStore
      setAuth(res.access_token, res.refresh_token, res.user);

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
          : msg || "Email hoặc mật khẩu không chính xác. Vui lòng thử lại."
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
        <div className="mb-4 bg-secondary-fixed/40 text-on-secondary-fixed border border-secondary-fixed-dim/40 p-3 rounded-xl shadow-xs flex items-start justify-between gap-2 transition-all duration-200">
          <div className="flex items-start gap-2 text-xs sm:text-sm leading-snug">
            <span className="material-symbols-outlined text-secondary text-[20px] shrink-0 mt-0.5">
              info
            </span>
            <div>
              Bạn cần đăng nhập để truy cập tính năng vừa chọn. Hệ thống sẽ tự động chuyển tiếp ngay
              sau khi xác thực thành công.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowReturnBanner(false)}
            aria-label="Đóng thông báo"
            className="text-on-secondary-fixed/70 hover:text-on-secondary-fixed p-0.5 rounded-md hover:bg-secondary-fixed-dim/20 transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* Authentication Card */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-xl p-6 sm:p-10 relative border border-surface-container-high/60">
        {/* Header Info */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary-fixed flex items-center justify-center mx-auto mb-3 shadow-xs">
            <span
              className="material-symbols-outlined text-primary text-[28px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              lock_open
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
            Đăng nhập BreadTrans
          </h1>
          <p className="text-sm text-on-surface-variant mt-1.5 leading-relaxed">
            Chào mừng bạn quay trở lại! Tiếp tục hành trình học tiếng Anh của bạn.
          </p>
        </div>

        {/* Alert Notification Box */}
        {errorMsg && (
          <div role="alert" className="mb-5 bg-error-container text-on-error-container border border-error/20 p-3 rounded-xl text-sm font-medium flex items-center justify-between gap-2 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-error text-[20px] shrink-0">
                error
              </span>
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMsg("")}
              aria-label="Đóng thông báo lỗi"
              className="text-on-error-container/80 hover:text-on-error-container p-0.5 rounded-md transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        )}

        {/* Form Elements */}
        <form className="space-y-4" onSubmit={handleLogin}>
          {/* Email Input Field */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-on-surface" htmlFor="emailInput">
              Địa chỉ Email <span className="text-error">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-on-surface-variant/70">
                <span className="material-symbols-outlined text-[20px]">mail</span>
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
                className="w-full pl-10 pr-4 py-3 bg-surface-container-low border border-transparent rounded-xl text-on-surface text-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:bg-surface-container-lowest focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
              />
            </div>
          </div>

          {/* Password Input Field */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-on-surface" htmlFor="passwordInput">
              Mật khẩu <span className="text-error">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-on-surface-variant/70">
                <span className="material-symbols-outlined text-[20px]">key</span>
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
                className="w-full pl-10 pr-11 py-3 bg-surface-container-low border border-transparent rounded-xl text-on-surface text-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:bg-surface-container-lowest focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
              />
              <button
                type="button"
                id="togglePassBtn"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex min-h-11 min-w-11 items-center justify-center text-on-surface-variant/70 hover:text-on-surface transition-colors"
                title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          {/* Options Row: Remember & Forgot */}
          <div className="flex items-center justify-between text-xs sm:text-sm pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none text-on-surface-variant hover:text-on-surface">
              <input
                id="rememberMe"
                name="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded bg-surface-container-low text-primary accent-primary cursor-pointer"
              />
              <span>Ghi nhớ đăng nhập</span>
            </label>
            <Link
              href="mailto:support@breadtrans.edu.vn?subject=Y%C3%AAu%20c%E1%BA%A7u%20h%E1%BB%97%20tr%E1%BB%A3%20%C4%91%E1%BA%B7t%20l%E1%BA%A1i%20m%E1%BA%ADt%20kh%E1%BA%A9u"
              className="font-semibold text-primary hover:text-primary-container transition-colors"
            >
              Quên mật khẩu?
            </Link>
          </div>

          {/* CTA Primary Action */}
          <button
            type="submit"
            id="submitBtn"
            disabled={isLoading}
            className="w-full py-3.5 px-6 rounded-xl font-bold text-sm sm:text-base bg-primary text-on-primary hover:bg-primary-container shadow-md transition-all duration-150 flex items-center justify-center gap-2 select-none active:scale-[0.99] disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
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
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <span>Đăng nhập</span>
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
        <div className="mt-6 text-center pt-3 bg-surface-container-low/50 rounded-xl p-3">
          <p className="text-sm text-on-surface-variant">
            Chưa có tài khoản BreadTrans?{" "}
            <Link
              href={registerHref}
              className="font-bold text-primary hover:underline ml-1 inline-block"
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
