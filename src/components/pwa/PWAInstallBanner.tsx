"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Share, PlusSquare, X, Smartphone, Sparkles } from "lucide-react";
import { Button3D } from "@/components/ui";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showAndroidBanner, setShowAndroidBanner] = useState(false);
  const [showIOSBanner, setShowIOSBanner] = useState(() => {
    if (typeof window === "undefined") return false;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = (window.navigator as any).standalone === true;
    return isIOS && !isStandalone;
  });
  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    const dismissedAt = localStorage.getItem("breadtrans_pwa_dismissed");
    if (!dismissedAt) return false;
    const diff = Date.now() - parseInt(dismissedAt, 10);
    return diff < 7 * 24 * 60 * 60 * 1000;
  });

  useEffect(() => {
    if (isDismissed) return;

    // Android / Chrome / Desktop PWA event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowAndroidBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, [isDismissed]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowAndroidBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setShowAndroidBanner(false);
    setShowIOSBanner(false);
    localStorage.setItem("breadtrans_pwa_dismissed", Date.now().toString());
  };

  if (isDismissed) return null;

  return (
    <AnimatePresence>
      {/* 1. Android / Chrome Install Banner */}
      {showAndroidBanner && deferredPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-5 left-4 right-4 md:left-auto md:right-8 z-50 max-w-md bg-white rounded-3xl border-4 border-orange-400 shadow-[0_10px_0_0_#f97316] p-4.5 flex items-center justify-between gap-3.5"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 border-2 border-orange-300 flex items-center justify-center text-2xl shrink-0 shadow-inner">
              🍞
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-black text-slate-800 text-sm">Cài Đặt BreadTrans App</h4>
                <Sparkles size={14} className="text-amber-500" />
              </div>
              <p className="text-xs font-bold text-slate-500">
                Học mượt mà, offline & nhận thông báo nhắc lịch học!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button3D variant="orange" size="sm" onClick={handleInstallClick} className="text-xs px-3">
              <Download size={14} /> Cài đặt
            </Button3D>
            <button
              onClick={handleDismiss}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </motion.div>
      )}

      {/* 2. iOS Safari Add to Home Screen Instructions */}
      {showIOSBanner && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-5 left-4 right-4 z-50 max-w-md mx-auto bg-white rounded-3xl border-4 border-sky-400 shadow-[0_10px_0_0_#0284c7] p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-sky-100 border-2 border-sky-300 flex items-center justify-center text-xl shrink-0">
                <Smartphone size={20} className="text-sky-600" />
              </div>
              <div>
                <h4 className="font-black text-slate-800 text-sm">Cài đặt ứng dụng trên iPhone / iPad</h4>
                <p className="text-xs font-bold text-slate-400">Trải nghiệm toàn màn hình như App Store</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X size={18} />
            </button>
          </div>

          <div className="bg-sky-50 border-2 border-sky-200 rounded-2xl p-3 text-xs font-bold text-slate-700 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center text-[10px] shrink-0 font-black">1</span>
              <span>Nhấn nút <Share size={14} className="inline text-sky-600 mx-1" /> <b>Chia sẻ</b> (Share) ở thanh dưới Safari</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center text-[10px] shrink-0 font-black">2</span>
              <span>Cuộn xuống và chọn <PlusSquare size={14} className="inline text-sky-600 mx-1" /> <b>Thêm vào MH chính</b> (Add to Home Screen)</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
