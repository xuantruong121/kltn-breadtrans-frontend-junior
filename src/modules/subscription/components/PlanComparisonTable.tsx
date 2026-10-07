"use client";

import React, { useState } from "react";
import { ChevronDown, Check, Minus, Clock } from "lucide-react";

interface ComparisonFeature {
  name: string;
  category?: string;
  free: string | boolean;
  plus: string | boolean;
  pro: string | boolean;
}

const COMPARISON_FEATURES: ComparisonFeature[] = [
  {
    category: "Nội dung & Luyện tập 4 kỹ năng",
    name: "Kho bài luyện 4 kỹ năng (Nghe, Nói, Đọc, Viết)",
    free: "Giới hạn bài cơ bản",
    plus: "Toàn bộ bài học & đề luyện tập",
    pro: "Toàn bộ bài học + Luyện đề nâng cao",
  },
  {
    name: "Chủ đề Từ vựng Premium",
    free: "Chủ đề cơ bản",
    plus: "Toàn bộ chủ đề nâng cao",
    pro: "Toàn bộ chủ đề + Thư viện từ chuyên ngành",
  },
  {
    name: "Luyện nghe chính tả & Audio Full-track",
    free: "Giới hạn 1/2 bài nghe",
    plus: "Toàn bộ kho nghe Full-track",
    pro: "Toàn bộ kho nghe + Tùy chỉnh tốc độ & giọng đọc",
  },
  {
    name: "Đề thi thử & Bài tập định kỳ",
    free: "Bộ đề mẫu cơ bản",
    plus: "Toàn bộ đề thi thử không giới hạn",
    pro: "Đề thi thử + Dự đoán band điểm chuẩn hóa",
  },
  {
    name: "Ngữ pháp & Luyện đề theo Part",
    free: "Nhóm từ loại & cơ bản",
    plus: "Toàn bộ chủ điểm ngữ pháp",
    pro: "Toàn bộ chủ điểm + Phân tích bẫy đề thi",
  },
  {
    category: "Công cụ & Chấm chữa AI",
    name: "Chấm chữa AI Writing (Sửa lỗi & Gợi ý câu)",
    free: "10 lượt miễn phí",
    plus: "Ưu tiên lượt chấm & Hạn mức cao",
    pro: "Chấm chi tiết không giới hạn + Band điểm",
  },
  {
    name: "Đánh giá phát âm & AI Speaking",
    free: "Chấm âm cơ bản",
    plus: "Chấm ngữ điệu & lưu loát chi tiết",
    pro: "Hội thoại 1-1 với Gia sư AI tương tác",
  },
  {
    name: "Flashcard & Thuật toán lặp lại ngắt quãng (SRS)",
    free: "Tối đa 100 từ",
    plus: "Không giới hạn từ vựng & thẻ",
    pro: "Không giới hạn + Thuật toán thông minh tối ưu",
  },
  {
    name: "Tra cứu từ điển & Dịch ngữ cảnh",
    free: "Tra từ cơ bản",
    plus: "Tra từ điển nâng cao & Collocations",
    pro: "Tra cứu ngữ cảnh AI không giới hạn",
  },
  {
    category: "Quản lý tiến độ & Đặc quyền học viên",
    name: "Theo dõi tiến độ & Báo cáo năng lực",
    free: "Thống kê hôm nay",
    plus: "Báo cáo chi tiết theo tuần, tháng",
    pro: "Radar năng lực AI & Lộ trình tự thích ứng",
  },
  {
    name: "Đồng bộ học tập đa thiết bị (Web, Mobile, Tablet)",
    free: "1 thiết bị",
    plus: "Đồng bộ đa thiết bị",
    pro: "Đồng bộ không giới hạn",
  },
  {
    name: "Hỗ trợ học viên & Kỹ thuật",
    free: "Cộng đồng học tập",
    plus: "Hỗ trợ kỹ thuật ưu tiên 24/7",
    pro: "Cố vấn học tập 1-on-1 riêng biệt",
  },
];

export function PlanComparisonTable() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <section className="space-y-4 pt-4" aria-label="Bảng so sánh chi tiết tính năng cả 3 gói">
      {/* ── Dropdown Toggle Button ────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-200/80 dark:border-slate-800 pt-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <span>So sánh chi tiết 3 gói dịch vụ</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Đối chiếu chi tiết quyền lợi giữa gói Free, gói Plus và gói Pro để lựa chọn phù hợp nhất
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-amber-400 dark:hover:border-amber-500 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 shadow-2xs transition-all cursor-pointer self-start sm:self-auto shrink-0"
        >
          <span>{isOpen ? "Thu gọn bảng so sánh" : "Xem chi tiết bảng so sánh"}</span>
          <ChevronDown
            size={16}
            className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
      </div>

      {/* ── Comparison Table Card (Collapsible) ───────────────── */}
      {isOpen && (
        <div className="overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/50">
                  <th scope="col" className="p-4 sm:p-5 font-black text-slate-700 dark:text-slate-200 w-[28%]">
                    Tính năng
                  </th>
                  <th scope="col" className="p-4 sm:p-5 font-black text-slate-700 dark:text-slate-300 w-[24%] text-center">
                    <div className="text-sm font-black">BreadTrans Free</div>
                    <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 block mt-0.5">
                      0 ₫ / vĩnh viễn
                    </span>
                  </th>
                  <th
                    scope="col"
                    className="p-4 sm:p-5 font-black text-amber-800 dark:text-amber-300 w-[24%] text-center bg-amber-50/60 dark:bg-amber-950/30 border-x border-amber-200/60 dark:border-amber-900/40 relative"
                  >
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white mb-1 shadow-2xs">
                      Đề xuất
                    </span>
                    <div className="text-sm font-black">BreadTrans PLUS</div>
                    <span className="text-[11px] font-bold text-amber-700/90 dark:text-amber-400 block mt-0.5">
                      69.000 ₫ / 30 ngày
                    </span>
                  </th>
                  <th
                    scope="col"
                    className="p-4 sm:p-5 font-black text-slate-700 dark:text-slate-200 w-[24%] text-center bg-slate-100/60 dark:bg-slate-800/40"
                  >
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300 mb-1 shrink-0 whitespace-nowrap">
                      <Clock size={11} /> Sắp ra mắt
                    </span>
                    <div className="text-sm font-black">BreadTrans PRO</div>
                    <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 block mt-0.5">
                      Chưa mở bán
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {COMPARISON_FEATURES.map((feature) => (
                  <React.Fragment key={feature.name}>
                    {feature.category && (
                      <tr className="bg-slate-50/50 dark:bg-slate-850/40">
                        <td
                          colSpan={4}
                          className="px-4 sm:px-5 py-2.5 text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500"
                        >
                          {feature.category}
                        </td>
                      </tr>
                    )}
                    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Cột Tên tính năng */}
                      <td className="p-4 sm:p-5 font-bold text-slate-800 dark:text-slate-200">
                        {feature.name}
                      </td>

                      {/* Cột Free */}
                      <td className="p-4 sm:p-5 text-center text-slate-600 dark:text-slate-400 font-medium">
                        {typeof feature.free === "boolean" ? (
                          feature.free ? (
                            <Check size={18} className="inline text-emerald-500" aria-label="Có" />
                          ) : (
                            <Minus size={18} className="inline text-slate-300 dark:text-slate-600" aria-label="Không" />
                          )
                        ) : (
                          feature.free
                        )}
                      </td>

                      {/* Cột PLUS */}
                      <td className="p-4 sm:p-5 text-center font-bold text-amber-900 dark:text-amber-200 bg-amber-50/30 dark:bg-amber-950/10 border-x border-amber-200/40 dark:border-amber-900/20">
                        {typeof feature.plus === "boolean" ? (
                          feature.plus ? (
                            <Check size={18} className="inline text-amber-600 dark:text-amber-400" aria-label="Có" />
                          ) : (
                            <Minus size={18} className="inline text-slate-300 dark:text-slate-600" aria-label="Không" />
                          )
                        ) : (
                          <span className="flex items-center justify-center gap-1.5">
                            <Check size={15} className="text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
                            <span>{feature.plus}</span>
                          </span>
                        )}
                      </td>

                      {/* Cột PRO */}
                      <td className="p-4 sm:p-5 text-center font-bold text-slate-700 dark:text-slate-300 bg-slate-50/40 dark:bg-slate-850/20">
                        {typeof feature.pro === "boolean" ? (
                          feature.pro ? (
                            <Check size={18} className="inline text-indigo-500 dark:text-indigo-400" aria-label="Có" />
                          ) : (
                            <Minus size={18} className="inline text-slate-300 dark:text-slate-600" aria-label="Không" />
                          )
                        ) : (
                          <span className="flex items-center justify-center gap-1.5">
                            <Check size={15} className="text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true" />
                            <span>{feature.pro}</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
