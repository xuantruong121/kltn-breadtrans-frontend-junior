"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Volume2, Gauge, Play, Keyboard, SlidersHorizontal } from "lucide-react";
import { StudySettings } from "../types/study";

interface StudySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StudySettings;
  onUpdateSettings: (newSettings: Partial<StudySettings>) => void;
}

export const StudySettingsModal: React.FC<StudySettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-5 z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-sky-50 text-sky-600 rounded-xl border border-sky-200/80">
                <SlidersHorizontal size={18} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Cài đặt phòng học từ vựng</h3>
                <p className="text-xs text-slate-500 font-medium">Tùy biến âm thanh và trải nghiệm học</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              aria-label="Đóng cài đặt"
            >
              <X size={18} />
            </button>
          </div>

          {/* Settings Options List */}
          <div className="space-y-4">
            {/* 1. Tự động phát âm */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl text-sky-600 border border-slate-200">
                  <Play size={16} />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-800">Tự động phát âm</span>
                  <p className="text-xs text-slate-500 font-medium">Tự động đọc từ khi chuyển sang từ mới</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.autoPlayAudio}
                onClick={() => onUpdateSettings({ autoPlayAudio: !settings.autoPlayAudio })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                  settings.autoPlayAudio ? "bg-sky-500" : "bg-slate-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.autoPlayAudio ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* 2. Âm thanh hiệu ứng */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl text-emerald-600 border border-slate-200">
                  <Volume2 size={16} />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-800">Âm thanh phản hồi</span>
                  <p className="text-xs text-slate-500 font-medium">Hiệu ứng chuông khi đúng, sai, lật thẻ</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.soundEnabled}
                onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                  settings.soundEnabled ? "bg-sky-500" : "bg-slate-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.soundEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* 3. Tốc độ đọc audio */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <Gauge size={15} className="text-slate-500" />
                  <span>Tốc độ đọc phát âm</span>
                </div>
                <span className="text-xs font-extrabold text-sky-600">{settings.speechRate}x</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[0.75, 1.0, 1.25].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => onUpdateSettings({ speechRate: rate })}
                    className={`py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                      settings.speechRate === rate
                        ? "bg-sky-500 text-white border-sky-600 shadow-2xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {rate === 0.75 ? "0.75x (Chậm)" : rate === 1.0 ? "1.0x (Chuẩn)" : "1.25x (Nhanh)"}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Giọng ưu tiên */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
              <div>
                <span className="text-sm font-bold text-slate-800">Giọng đọc ưu tiên</span>
                <p className="text-xs text-slate-500 font-medium">Lựa chọn phát âm mặc định</p>
              </div>
              <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ preferUkAccent: false })}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                    !settings.preferUkAccent
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Mỹ (US)
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ preferUkAccent: true })}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                    settings.preferUkAccent
                      ? "bg-rose-600 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Anh (UK)
                </button>
              </div>
            </div>
          </div>

          {/* Quick Cheatsheet Section */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
              <Keyboard size={14} className="text-slate-500" />
              <span>Phím tắt thao tác nhanh:</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-medium text-slate-600">
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border text-slate-800 font-mono">Space</kbd>
                <span>Lật thẻ / Thu âm</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border text-slate-800 font-mono">Tab / 2</kbd>
                <span>Đã thuộc từ này</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border text-slate-800 font-mono">Enter / 1</kbd>
                <span>Chưa nhớ / Kiểm tra</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border text-slate-800 font-mono">1, 2, 3, 4</kbd>
                <span>Chọn đáp án / Đánh giá SRS</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Hoàn tất
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
