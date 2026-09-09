"use client";

import { useEffect } from "react";
import { X, Lock, CheckCircle2, ArrowRight } from "lucide-react";

interface AuthGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetLabel?: string;
  targetRoute?: string;
  onOpenLogin: () => void;
  onOpenRegister: () => void;
}

export function AuthGateModal({
  isOpen,
  onClose,
  targetLabel = "bài học này",
  targetRoute = "/dashboard",
  onOpenLogin,
  onOpenRegister,
}: AuthGateModalProps) {
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

  const handleLoginClick = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("breadtrans_redirect_url", targetRoute);
      sessionStorage.setItem("breadtrans_redirect_label", targetLabel);
    }
    onClose();
    onOpenLogin();
  };

  const handleRegisterClick = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("breadtrans_redirect_url", targetRoute);
      sessionStorage.setItem("breadtrans_redirect_label", targetLabel);
    }
    onClose();
    onOpenRegister();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-amber-100 z-10 animate-in zoom-in-95 duration-150">
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="absolute top-5 right-5 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-200 flex items-center justify-center text-amber-700 mb-4 shadow-xs">
            <Lock size={26} />
          </div>

          <span className="px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800 mb-2">
            Yêu cầu tài khoản học viên
          </span>

          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Đăng nhập để tiếp tục
          </h3>

          <p className="text-sm font-semibold text-slate-600 mt-2 leading-relaxed">
            Đăng nhập để bắt đầu <strong className="text-amber-700">{targetLabel}</strong> và lưu lại tiến độ học tập của bạn.
          </p>

          <div className="w-full bg-amber-50/70 border border-amber-100 rounded-2xl p-4 my-5 text-left space-y-2">
            <div className="flex items-start gap-2 text-xs font-semibold text-slate-700">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <span>Lưu lịch sử làm bài và theo dõi lộ trình tiến bộ</span>
            </div>
            <div className="flex items-start gap-2 text-xs font-semibold text-slate-700">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <span>Nhận phân tích phát âm chuẩn âm vị và gợi ý sửa lỗi ngữ pháp</span>
            </div>
            <div className="flex items-start gap-2 text-xs font-semibold text-slate-700">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <span>Tích lũy Bánh Mì và duy trì chuỗi học tập (Streak)</span>
            </div>
          </div>

          <div className="w-full space-y-2.5">
            <button
              type="button"
              onClick={handleLoginClick}
              className="btn-tactile-primary w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Đăng nhập ngay</span>
              <ArrowRight size={16} />
            </button>

            <button
              type="button"
              onClick={handleRegisterClick}
              className="w-full py-3 px-4 rounded-xl border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm transition-colors cursor-pointer"
            >
              Tạo tài khoản mới miễn phí
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
