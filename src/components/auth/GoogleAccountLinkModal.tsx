"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, X, ShieldAlert } from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import { useAuthStore } from "@/stores/authStore";
import { useGamificationStore } from "@/stores/gamificationStore";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getDeviceId, persistDeviceId } from "@/lib/auth/deviceId";
import { normalizeAuthResponse } from "@/lib/auth/authResponse";
import { hydrateSession } from "@/lib/auth/hydrateSession";

interface GoogleAccountLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  credential: string;
  defaultEmail?: string;
  redirectUrl?: string | null;
}

export default function GoogleAccountLinkModal({
  isOpen,
  onClose,
  credential,
  defaultEmail = "",
  redirectUrl,
}: GoogleAccountLinkModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setAuth } = useAuthStore();

  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (isOpen) {
      setEmail(defaultEmail);
      setPassword("");
      setErrorMsg("");
    }
  }, [defaultEmail, isOpen]);

  if (!isOpen) return null;

  const handleLinkAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Vui lòng nhập đầy đủ email và mật khẩu.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      const deviceId = getDeviceId();

      const res = normalizeAuthResponse(
        await axiosClient.post("/auth/google/link", {
          email,
          password,
          credential,
          deviceId,
        }),
      );

      queryClient.clear();
      useGamificationStore.getState().reset();
      setAuth(res.access_token, res.refresh_token, res.user);
      persistDeviceId(res.deviceId || deviceId);
      await hydrateSession(queryClient);

      toast.success("Liên kết tài khoản Google thành công!");
      onClose();

      const candidate = redirectUrl || "/dashboard";
      if (res.user.role === "ADMIN") {
        router.replace("/admin");
      } else {
        router.replace(candidate);
      }
    } catch (err: any) {
      const payload = err.response?.data?.message;
      const msg =
        (typeof payload === "object" ? payload?.message : payload) ||
        "Mật khẩu không chính xác hoặc liên kết thất bại.";
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl transition-all sm:p-8">
        <button
          onClick={onClose}
          type="button"
          className="absolute right-5 top-5 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          aria-label="Đóng"
        >
          <X size={20} />
        </button>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
            <ShieldAlert size={26} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              Liên kết tài khoản
            </h2>
            <p className="text-xs font-semibold text-slate-500">
              Xác thực để bảo vệ tài khoản của bạn
            </p>
          </div>
        </div>

        <p className="mb-5 text-sm text-slate-600 leading-relaxed">
          Email này đã được đăng ký trước đó bằng mật khẩu. Nhập mật khẩu
          BreadTrans để hoàn tất liên kết với tài khoản Google.
        </p>

        {errorMsg && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-600">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLinkAccount} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Email BreadTrans
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="example@gmail.com"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Mật khẩu hiện tại
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Nhập mật khẩu tài khoản"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 pl-10 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <Lock
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
          </div>

          <div className="mt-6 flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-md transition hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Đang liên kết...
                </>
              ) : (
                "Xác nhận liên kết"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
