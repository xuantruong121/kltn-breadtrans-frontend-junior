"use client";

import React from "react";
import { motion } from "framer-motion";
import { Layers, GraduationCap, PenTool, Mic, Film, PieChart } from "lucide-react";

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
      label: "Từ vựng (Flashcard & SRS)",
      count: content.vocab,
      unit: "chủ đề",
      barColor: "bg-amber-500",
      textColor: "text-amber-700",
      badgeBg: "bg-amber-50",
      badgeBorder: "border-amber-200",
      icon: Layers,
    },
    {
      id: "grammar",
      label: "Ngữ pháp TOEIC (Video)",
      count: content.grammar,
      unit: "bài học",
      barColor: "bg-emerald-500",
      textColor: "text-emerald-700",
      badgeBg: "bg-emerald-50",
      badgeBorder: "border-emerald-200",
      icon: GraduationCap,
    },
    {
      id: "quizzes",
      label: "Đề thi & Bộ câu hỏi",
      count: content.quizzes,
      unit: "bộ đề",
      barColor: "bg-blue-500",
      textColor: "text-blue-700",
      badgeBg: "bg-blue-50",
      badgeBorder: "border-blue-200",
      icon: PenTool,
    },
    {
      id: "speaking",
      label: "Luyện phát âm & Phỏng vấn",
      count: content.speaking,
      unit: "bài mẫu",
      barColor: "bg-indigo-500",
      textColor: "text-indigo-700",
      badgeBg: "bg-indigo-50",
      badgeBorder: "border-indigo-200",
      icon: Mic,
    },
    {
      id: "media",
      label: "Nội dung đa phương tiện",
      count: content.media,
      unit: "tư liệu",
      barColor: "bg-slate-500",
      textColor: "text-slate-700",
      badgeBg: "bg-slate-100",
      badgeBorder: "border-slate-200",
      icon: Film,
    },
  ];

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
            <PieChart size={18} strokeWidth={2} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Phân Bổ Nội Dung Học Liệu
            </h3>
            <p className="text-xs text-slate-500">
              Tỷ lệ phân phối các dạng học phần và tài nguyên giáo trình trên nền tảng
            </p>
          </div>
        </div>
        <span className="text-xs text-slate-500">
          Tổng cộng: <strong className="text-slate-900 font-bold">{totalItems}</strong> danh mục
        </span>
      </div>

      {/* MULTI-SEGMENT PROGRESS BAR */}
      <div className="w-full bg-slate-100 h-3 rounded-md overflow-hidden flex border border-slate-200/80">
        {CATEGORIES.map((cat) => {
          const widthPct = Math.max(3, (cat.count / totalItems) * 100);
          return (
            <div
              key={cat.id}
              className={`${cat.barColor} h-full transition-all duration-300 hover:opacity-90`}
              style={{ width: `${widthPct}%` }}
              title={`${cat.label}: ${cat.count} ${cat.unit}`}
            />
          );
        })}
      </div>

      {/* CATEGORY GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const percentage = Math.round((cat.count / totalItems) * 100);

          return (
            <div
              key={cat.id}
              className="p-3.5 rounded-lg border border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/50 transition-all flex items-center justify-between shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-slate-100 text-slate-700 border border-slate-200/60">
                  <Icon size={16} strokeWidth={2} />
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-slate-800">{cat.label}</h4>
                  <span className="text-[11px] text-slate-500">
                    {cat.count} {cat.unit}
                  </span>
                </div>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${cat.badgeBg} ${cat.badgeBorder} ${cat.textColor}`}>
                {percentage}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
