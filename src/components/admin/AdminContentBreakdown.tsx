"use client";

import React from "react";
import { motion } from "framer-motion";
import { BookOpen, Layers, GraduationCap, PenTool, Mic, Film, PieChart } from "lucide-react";

interface ContentBreakdown {
  vocab: number;
  grammar: number;
  quizzes: number;
  speaking: number;
  media: number;
}

interface AdminContentBreakdownProps {
  data?: ContentBreakdown;
}

export default function AdminContentBreakdown({ data }: AdminContentBreakdownProps) {
  const content = data || {
    vocab: 12,
    grammar: 6,
    quizzes: 8,
    speaking: 15,
    media: 4,
  };

  const totalItems =
    content.vocab + content.grammar + content.quizzes + content.speaking + content.media;

  const CATEGORIES = [
    {
      id: "vocab",
      label: "Từ vựng Flashcard",
      count: content.vocab,
      unit: "chủ đề",
      color: "bg-amber-500",
      textColor: "text-amber-700",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
      icon: Layers,
    },
    {
      id: "grammar",
      label: "Ngữ pháp TOEIC",
      count: content.grammar,
      unit: "chủ đề",
      color: "bg-emerald-500",
      textColor: "text-emerald-700",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
      icon: GraduationCap,
    },
    {
      id: "quizzes",
      label: "Đề thi trắc nghiệm",
      count: content.quizzes,
      unit: "bộ đề",
      color: "bg-purple-500",
      textColor: "text-purple-700",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
      icon: PenTool,
    },
    {
      id: "speaking",
      label: "Luyện phát âm AI",
      count: content.speaking,
      unit: "bài mẫu",
      color: "bg-sky-500",
      textColor: "text-sky-700",
      bgColor: "bg-sky-50",
      borderColor: "border-sky-200",
      icon: Mic,
    },
    {
      id: "media",
      label: "Video Phim & Nhạc",
      count: content.media,
      unit: "video",
      color: "bg-rose-500",
      textColor: "text-rose-700",
      bgColor: "bg-rose-50",
      borderColor: "border-rose-200",
      icon: Film,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <PieChart size={20} className="text-emerald-600" />
          <h3 className="text-lg font-black text-slate-800">Phân Bổ Nội Dung Học Liệu</h3>
        </div>
        <span className="text-xs font-black text-slate-400">
          Tổng: <strong className="text-slate-700 font-extrabold">{totalItems}</strong> danh mục
        </span>
      </div>

      {/* MULTI-SEGMENT PROGRESS BAR */}
      <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden flex border border-slate-200 shadow-inner">
        {CATEGORIES.map((cat) => {
          const widthPct = Math.max(4, (cat.count / totalItems) * 100);
          return (
            <div
              key={cat.id}
              className={`${cat.color} h-full transition-all duration-500 hover:opacity-80`}
              style={{ width: `${widthPct}%` }}
              title={`${cat.label}: ${cat.count} ${cat.unit}`}
            />
          );
        })}
      </div>

      {/* CATEGORY ITEMS LIST */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const percentage = Math.round((cat.count / totalItems) * 100);

          return (
            <motion.div
              key={cat.id}
              whileHover={{ y: -2 }}
              className={`p-3.5 rounded-2xl border-2 ${cat.borderColor} ${cat.bgColor} flex items-center justify-between transition-all`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl bg-white shadow-xs ${cat.textColor}`}>
                  <Icon size={18} />
                </div>
                <div>
                  <h4 className="font-black text-xs text-slate-800">{cat.label}</h4>
                  <span className="text-[11px] font-bold text-slate-400">
                    {cat.count} {cat.unit}
                  </span>
                </div>
              </div>
              <span className={`text-xs font-black px-2 py-0.5 rounded-lg bg-white border ${cat.borderColor} ${cat.textColor}`}>
                {percentage}%
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
