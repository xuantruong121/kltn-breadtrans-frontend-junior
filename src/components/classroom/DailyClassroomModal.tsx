"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Video, 
  Maximize2, 
  Minimize2, 
  PhoneOff, 
  ExternalLink, 
  ShieldCheck,
  Loader2,
  AlertOctagon,
  LogOut
} from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import { useAuthStore } from "@/stores/authStore";

interface DailyClassroomModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomUrl?: string;
  sessionTitle: string;
  courseName?: string;
  sessionId?: number;
  isTeacher?: boolean;
  onSessionFinished?: () => void;
}

export default function DailyClassroomModal({
  isOpen,
  onClose,
  roomUrl,
  sessionTitle,
  courseName,
  sessionId,
  isTeacher = false,
  onSessionFinished,
}: DailyClassroomModalProps) {
  const { user } = useAuthStore();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setActiveUrl(null);
      setIsLoading(true);
      setShowFinishConfirm(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const setupRoom = async () => {
      try {
        let targetName = "";
        if (roomUrl && roomUrl.includes("daily.co")) {
          const parts = roomUrl.split("/").filter(Boolean);
          targetName = parts[parts.length - 1]?.split("?")[0] || "";
        }

        if (!targetName) {
          targetName = (sessionTitle || "classroom")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");
        }

        targetName = targetName.substring(0, 38);

        const res: any = await axiosClient.post("/classes/daily-room", {
          title: sessionTitle,
          roomName: targetName || "live-class",
        });

        if (isMounted) {
          const finalUrl =
            res?.url ||
            res?.data?.url ||
            (roomUrl && roomUrl.includes("daily.co")
              ? roomUrl
              : `https://breadtrans-kltn.daily.co/${targetName || "live-class"}`);
          setActiveUrl(finalUrl);
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.warn("Could not auto-create Daily room via API:", err);
      }

      if (isMounted) {
        let fallbackSlug = "live-class";
        if (roomUrl && roomUrl.includes("daily.co")) {
          const parts = roomUrl.split("/").filter(Boolean);
          fallbackSlug = parts[parts.length - 1]?.split("?")[0] || "live-class";
        } else if (sessionTitle) {
          fallbackSlug = sessionTitle
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "")
            .substring(0, 38);
        }
        setActiveUrl(
          roomUrl && roomUrl.includes("daily.co")
            ? roomUrl
            : `https://breadtrans-kltn.daily.co/${fallbackSlug || "live-class"}`
        );
        setIsLoading(false);
      }
    };

    setupRoom();

    return () => {
      isMounted = false;
    };
  }, [isOpen, roomUrl, sessionTitle]);

  const handleFinishSession = async () => {
    if (!sessionId) return;
    try {
      setIsFinishing(true);
      await axiosClient.patch(`/classes/sessions/${sessionId}/finish`);
      setShowFinishConfirm(false);
      if (onSessionFinished) {
        onSessionFinished();
      }
      onClose();
    } catch (err: any) {
      console.error("Error finishing session:", err);
      alert(err?.response?.data?.message || "Không thể kết thúc buổi học. Vui lòng thử lại!");
    } finally {
      setIsFinishing(false);
    }
  };

  if (!isOpen) return null;

  const participantName =
    user?.profile?.fullName ||
    user?.email?.split("@")[0] ||
    "Học viên";

  const baseUrl = activeUrl || "https://breadtrans-kltn.daily.co/live-class";
  const separator = baseUrl.includes("?") ? "&" : "?";
  const displayUrl = `${baseUrl}${separator}userName=${encodeURIComponent(participantName)}&lang=vi`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className={`bg-white rounded-[2.5rem] border-4 border-slate-200 shadow-[0_16px_0_0_#0f172a] flex flex-col overflow-hidden transition-all duration-300 relative ${
            isFullscreen
              ? "w-full h-full rounded-none border-0"
              : "w-full max-w-6xl h-[88vh]"
          }`}
        >
          {/* HEADER BAR */}
          <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b-4 border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-sm">
                <Video size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-base md:text-lg text-white leading-tight">
                    {sessionTitle}
                  </h3>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Trực Tuyến (Daily.co)
                  </span>
                </div>
                {courseName && (
                  <p className="text-xs font-bold text-slate-400 mt-0.5 truncate max-w-md">
                    {courseName}
                  </p>
                )}
              </div>
            </div>

            {/* CONTROLS */}
            <div className="flex items-center gap-2">
              <a
                href={displayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
                title="Mở trong tab mới nếu cần"
              >
                <ExternalLink size={14} /> Mở Tab Riêng
              </a>

              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                title={isFullscreen ? "Thu nhỏ" : "Toàn màn hình"}
              >
                {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>

              {/* RỜI PHÒNG (CÁ NHÂN) */}
              <button
                onClick={onClose}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-700"
                title="Rời phòng học (bạn có thể vào lại)"
              >
                <LogOut size={15} /> Rời Phòng
              </button>

              {/* KẾT THÚC BUỔI HỌC (CHO GIÁO VIÊN) */}
              {isTeacher && sessionId && (
                <button
                  onClick={() => setShowFinishConfirm(true)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer border border-rose-500"
                  title="Kết thúc buổi học cho cả lớp & ngắt phòng Daily.co"
                >
                  <AlertOctagon size={16} /> Kết Thúc Buổi Học
                </button>
              )}
            </div>
          </div>

          {/* EMBEDDED VIDEO ROOM CONTAINER */}
          <div className="flex-1 bg-slate-950 relative w-full h-full overflow-hidden flex items-center justify-center">
            {isLoading ? (
              <div className="text-center p-8">
                <Loader2 size={40} className="text-blue-500 animate-spin mx-auto mb-3" />
                <h4 className="text-white font-black text-base">Đang kết nối tới phòng học Daily.co...</h4>
                <p className="text-slate-400 text-xs mt-1">Đang khởi tạo mã hóa video và bảo mật phòng học</p>
              </div>
            ) : (
              <iframe
                src={displayUrl}
                allow="camera; microphone; fullscreen; display-capture; autoplay"
                className="w-full h-full border-0"
                title={`Lớp học trực tuyến: ${sessionTitle}`}
              />
            )}
          </div>

          {/* FOOTER HELPER */}
          <div className="bg-slate-50 border-t-2 border-slate-200 px-6 py-2.5 flex items-center justify-between text-xs font-bold text-slate-500 shrink-0">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-600" />
              <span>Phòng học được mã hóa đầu cuối &amp; truyền trực tiếp không qua bên thứ ba</span>
            </div>
            <span className="hidden sm:inline text-slate-400">
              Nhấn <strong>Esc</strong> hoặc nút <strong>Rời Phòng</strong> để quay lại
            </span>
          </div>

          {/* CONFIRMATION DIALOG FOR FINISHING SESSION */}
          {showFinishConfirm && (
            <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-[2rem] p-6 max-w-md w-full border-4 border-rose-200 shadow-2xl text-slate-800 space-y-4"
              >
                <div className="flex items-center gap-3 text-rose-600">
                  <div className="p-3 bg-rose-100 rounded-2xl shrink-0">
                    <AlertOctagon size={28} />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-slate-800">Kết Thúc Buổi Học?</h4>
                    <p className="text-xs text-slate-400 font-bold">Dành cho Giáo viên phụ trách</p>
                  </div>
                </div>

                <p className="text-xs sm:text-sm font-semibold text-slate-600 leading-relaxed">
                  Hành động này sẽ <strong>chốt hoàn tất buổi học ngay lập tức</strong>, ngắt phòng Daily.co và chuyển trạng thái lớp sang <strong>"Đã kết thúc"</strong> cho toàn bộ học sinh để tiết kiệm chi phí gọi.
                </p>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setShowFinishConfirm(false)}
                    disabled={isFinishing}
                    className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs cursor-pointer transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    onClick={handleFinishSession}
                    disabled={isFinishing}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {isFinishing ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <AlertOctagon size={16} />
                    )}
                    {isFinishing ? "Đang kết thúc..." : "Xác Nhận Kết Thúc"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
