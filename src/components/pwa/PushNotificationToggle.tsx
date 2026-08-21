"use client";

import React from "react";
import { Bell, BellOff, Send, Loader2, ShieldCheck, Flame, Calendar } from "lucide-react";
import { Button3D } from "@/components/ui";
import { usePushNotification } from "@/lib/hooks/usePushNotification";

export default function PushNotificationToggle() {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribeToPush,
    unsubscribeFromPush,
    sendTestPush,
  } = usePushNotification();

  if (!isSupported) {
    return (
      <div className="bg-slate-50 border-2 border-slate-200 rounded-3xl p-5 text-center text-slate-400 text-xs font-bold">
        Trình duyệt hiện tại chưa hỗ trợ Web Push Notification.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2rem] border-4 border-slate-200 shadow-[0_8px_0_0_#e2e8f0] p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-2xl border-3 flex items-center justify-center text-2xl shrink-0 transition-colors shadow-inner ${
              isSubscribed
                ? "bg-emerald-100 border-emerald-400 text-emerald-600"
                : "bg-orange-100 border-orange-400 text-orange-600"
            }`}
          >
            {isSubscribed ? <Bell size={24} className="animate-bounce" /> : <BellOff size={24} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-slate-800 text-base">Thông Báo Nhắc Nhở Học Tập</h3>
              {isSubscribed && (
                <span className="text-[10px] bg-emerald-500 text-white font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                  <ShieldCheck size={12} /> Đang bật
                </span>
              )}
            </div>
            <p className="text-xs font-bold text-slate-400 mt-0.5">
              Nhận thông báo giữ lửa chuỗi Streak, lịch học online và lời khen từ bạn học.
            </p>
          </div>
        </div>

        <div className="shrink-0">
          {isSubscribed ? (
            <Button3D
              variant="white"
              size="sm"
              disabled={isLoading}
              onClick={unsubscribeFromPush}
              className="text-xs text-slate-600 border-slate-300"
            >
              {isLoading ? <Loader2 size={14} className="animate-spin" /> : "Tắt thông báo"}
            </Button3D>
          ) : (
            <Button3D
              variant="orange"
              size="sm"
              disabled={isLoading || permission === "denied"}
              onClick={subscribeToPush}
              className="text-xs"
            >
              {isLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <>
                  <Bell size={14} /> Bật thông báo
                </>
              )}
            </Button3D>
          )}
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-3 flex items-center gap-2.5">
          <div className="p-2 bg-amber-100 rounded-xl text-amber-600">
            <Flame size={18} />
          </div>
          <div>
            <h5 className="font-black text-slate-800 text-xs">Bảo Vệ Chuỗi Streak</h5>
            <p className="text-[11px] font-bold text-slate-500">Tự động nhắc nhở lúc 20:00 hàng ngày</p>
          </div>
        </div>

        <div className="bg-sky-50 border-2 border-sky-200 rounded-2xl p-3 flex items-center gap-2.5">
          <div className="p-2 bg-sky-100 rounded-xl text-sky-600">
            <Calendar size={18} />
          </div>
          <div>
            <h5 className="font-black text-slate-800 text-xs">Lớp Học Trực Tuyến</h5>
            <p className="text-[11px] font-bold text-slate-500">Thông báo trước 30 phút giờ vào lớp</p>
          </div>
        </div>
      </div>

      {/* Test Push Button */}
      {isSubscribed && (
        <div className="pt-2 flex justify-end">
          <button
            onClick={sendTestPush}
            className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1.5 hover:underline cursor-pointer bg-sky-50 px-3 py-1.5 rounded-xl border border-sky-200"
          >
            <Send size={13} /> Thử gửi thông báo ngay tới thiết bị này
          </button>
        </div>
      )}
    </div>
  );
}
