"use client";

import { useEffect } from "react";
import { X, Headphones, Mic, BookOpen, PenTool, Layers, Bookmark, Target } from "lucide-react";

interface MobileSkillsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRoute?: (label: string, route: string) => void;
}

export function MobileSkillsSheet({ isOpen, onClose, onSelectRoute }: MobileSkillsSheetProps) {
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

  const handleClick = (label: string, route: string) => {
    onClose();
    if (onSelectRoute) {
      onSelectRoute(label, route);
    } else {
      window.location.assign(route);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-xs transition-opacity lg:hidden">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Sheet panel */}
      <div className="relative w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl animate-in slide-in-from-bottom duration-200">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />

        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-black text-slate-900">Luyện tập 4 kỹ năng</h3>
            <p className="text-xs font-semibold text-slate-500">Chọn kỹ năng bạn muốn tập trung hôm nay</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* 4 skills grid */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleClick("bài luyện nghe", "/practice")}
            className="flex flex-col items-start p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/60 hover:bg-blue-100/70 transition-colors text-left group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
              <Headphones size={18} />
            </div>
            <span className="text-sm font-black text-slate-900">Luyện Nghe</span>
            <span className="text-[11px] font-semibold text-blue-700 mt-0.5">Part 1-4 & Chép chính tả</span>
          </button>

          <button
            type="button"
            onClick={() => handleClick("bài luyện nói AI", "/practice/speaking")}
            className="flex flex-col items-start p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200/60 hover:bg-purple-100/70 transition-colors text-left group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
              <Mic size={18} />
            </div>
            <span className="text-sm font-black text-slate-900">Luyện Nói AI</span>
            <span className="text-[11px] font-semibold text-purple-700 mt-0.5">AI chấm âm vị chuẩn IPA</span>
          </button>

          <button
            type="button"
            onClick={() => handleClick("bài luyện đọc", "/practice")}
            className="flex flex-col items-start p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/60 hover:bg-emerald-100/70 transition-colors text-left group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
              <BookOpen size={18} />
            </div>
            <span className="text-sm font-black text-slate-900">Luyện Đọc</span>
            <span className="text-[11px] font-semibold text-emerald-700 mt-0.5">Part 5-7 & Đọc lướt</span>
          </button>

          <button
            type="button"
            onClick={() => handleClick("bài luyện viết AI", "/practice/writing")}
            className="flex flex-col items-start p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/60 hover:bg-rose-100/70 transition-colors text-left group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
              <PenTool size={18} />
            </div>
            <span className="text-sm font-black text-slate-900">Luyện Viết AI</span>
            <span className="text-[11px] font-semibold text-rose-700 mt-0.5">AI sửa ngữ pháp & văn phong</span>
          </button>
        </div>

        {/* Auxiliary tools */}
        <p className="mt-5 mb-2.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
          Công cụ hỗ trợ bổ trợ
        </p>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => handleClick("thẻ từ vựng Flashcard", "/flashcard")}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-900 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                <Layers size={15} />
              </span>
              <span className="text-xs font-bold">Flashcard Từ vựng cốt lõi SRS</span>
            </div>
            <span className="text-xs font-bold text-amber-700">Mở →</span>
          </button>

          <button
            type="button"
            onClick={() => handleClick("ngữ pháp trọng điểm", "/grammar")}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <Bookmark size={15} />
              </span>
              <span className="text-xs font-bold">Ngữ pháp cấu trúc câu</span>
            </div>
            <span className="text-xs font-bold text-emerald-700">Mở →</span>
          </button>

          <button
            type="button"
            onClick={() => handleClick("đề thi thử TOEIC", "/practice/quizzes")}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-orange-50 text-slate-700 hover:text-orange-900 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-lg bg-orange-100 text-orange-800 flex items-center justify-center">
                <Target size={15} />
              </span>
              <span className="text-xs font-bold">Luyện đề thi thử TOEIC bấm giờ</span>
            </div>
            <span className="text-xs font-bold text-orange-700">Mở →</span>
          </button>
        </div>
      </div>
    </div>
  );
}
