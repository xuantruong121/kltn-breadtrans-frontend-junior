"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import { useAuthStore } from "@/stores/authStore";
import { useGamificationStore } from "@/stores/gamificationStore";
import { useQueryClient } from "@tanstack/react-query";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";

interface QuickLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetLabel?: string;
  targetRoute?: string;
  onSwitchToRegister: () => void;
}

export function QuickLoginModal({
  isOpen,
  onClose,
  targetLabel,
  targetRoute = "/dashboard",
  onSwitchToRegister,
}: QuickLoginModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setAuth } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Vui lòng nhập đầy đủ email và mật khẩu.");
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

      const res: any = await axiosClient.post("/auth/login", { email, password, deviceId });
      queryClient.clear();
      useGamificationStore.getState().reset();
      setAuth(res.access_token, res.refresh_token, res.user);

      onClose();

      // Destination resolution: check stored redirect first, then props
      const storedRedirect = typeof window !== "undefined" ? sessionStorage.getItem("breadtrans_redirect_url") : null;
      const destination = storedRedirect || targetRoute || (res.user.role === "ADMIN" ? "/admin" : "/dashboard");
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("breadtrans_redirect_url");
        sessionStorage.removeItem("breadtrans_redirect_label");
      }
      router.push(destination);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setErrorMsg(Array.isArray(msg) ? msg[0] : msg || "Email hoặc mật khẩu không chính xác.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-amber-100 z-10 animate-in zoom-in-95 duration-150">
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="absolute top-5 right-5 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-200 flex items-center justify-center text-amber-700 mx-auto mb-3 shadow-xs">
            <Lock size={22} />
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Đăng nhập BreadTrans
          </h3>
          {targetLabel ? (
            <p className="mt-1 text-xs font-semibold text-amber-700 bg-amber-50 py-1 px-3 rounded-full inline-block">
              Chuẩn bị truy cập: {targetLabel}
            </p>
          ) : (
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Tiếp tục hành trình học tiếng Anh và luyện 4 kỹ năng
            </p>
          )}
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
            {errorMsg}
          </div>
        )}

        {/* Google SSO Button */}
        <div className="mb-4">
          <GoogleSignInButton
            redirectUrl={targetRoute || "/dashboard"}
            onError={(msg) => setErrorMsg(msg)}
          />
        </div>

        <div className="relative my-4 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <span className="relative bg-white px-3 text-xs font-bold text-slate-400">
            Hoặc bằng email
          </span>
        </div>

        <form onSubmit={handleLogin} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Email học viên <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Mail size={16} />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50/50"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Mật khẩu <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push("/forgot-password");
                }}
                className="text-[11px] font-bold text-amber-700 hover:underline"
              >
                Quên mật khẩu?
              </button>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Lock size={16} />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-tactile-primary w-full mt-2 py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Đang xác thực...</span>
              </>
            ) : (
              <>
                <span>Đăng nhập ngay</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="mt-5 text-center text-xs font-semibold text-slate-500">
          Chưa có tài khoản?{" "}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="font-bold text-amber-700 hover:underline cursor-pointer"
          >
            Đăng ký miễn phí
          </button>
        </div>
      </div>
    </div>
  );
}
