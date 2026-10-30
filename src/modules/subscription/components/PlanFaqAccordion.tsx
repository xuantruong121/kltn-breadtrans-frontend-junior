"use client";

import { COURSES_ENABLED } from "@/lib/featureFlags";
import React, { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    id: "payment-methods",
    question: "Tôi có thể thanh toán gói học qua những hình thức nào?",
    answer:
      "Thanh toán bằng chuyển khoản ngân hàng qua mã VietQR do PayOS tạo. Quét mã bằng ứng dụng ngân hàng hoặc ví điện tử có hỗ trợ VietQR; mã đã có sẵn số tiền và nội dung chuyển khoản.",
  },
  {
    id: "activation-time",
    question: "Sau khi chuyển khoản, bao lâu thì gói được kích hoạt?",
    answer:
      "Gói được kích hoạt khi PayOS xác nhận giao dịch, thường trong vài phút. Màn hình thanh toán tự cập nhật trạng thái, bạn không cần gửi ảnh chuyển khoản.",
  },
  {
    id: "auto-renew",
    question: "Gói có tự động gia hạn và trừ tiền không?",
    answer:
      "Không. Gói có thời hạn cố định 30 ngày và không tự gia hạn. Khi hết hạn, tài khoản trở về gói Free; bạn có thể mua lại bất cứ lúc nào.",
  },
  {
    id: "multi-device",
    question: "Tôi có thể học trên nhiều thiết bị (máy tính, điện thoại, máy tính bảng) không?",
    answer:
      "Có. Bạn đăng nhập được trên máy tính, điện thoại và máy tính bảng. Tiến độ học được lưu trên máy chủ nên giống nhau trên mọi thiết bị.",
  },
  {
    id: "ai-assessment",
    question: "Bài Nói và bài Viết được chấm như thế nào?",
    answer:
      "Bài Nói được chấm tự động về phát âm và độ trôi chảy; bài Viết được chấm tự động theo tiêu chí. Nhận xét do AI tạo, chỉ để tham khảo và có thể chưa phản ánh đầy đủ năng lực của bạn. Cách chấm như nhau ở mọi gói; gói trả phí chỉ mở thêm bài luyện.",
  },
  {
    id: "plus-vs-pro",
    question: "Gói Plus và gói Pro khác nhau thế nào?",
    answer:
      `Plus mở bài Nghe và Đọc Trung cấp, Nâng cao. Pro gồm toàn bộ Plus, thêm bài Nói và Viết Trung cấp, Nâng cao${COURSES_ENABLED ? " và mọi khóa học" : ""}. Bài Cơ bản của bốn kỹ năng, flashcard, từ vựng, ngữ pháp, bài kiểm tra đầu vào và luyện đề TOEIC miễn phí với mọi tài khoản.`,
  },
  {
    id: "support-channel",
    question: "Nếu gặp sự cố trong quá trình nâng cấp, tôi có thể liên hệ hỗ trợ ở đâu?",
    answer:
      "Dùng mục Trợ giúp hoặc gửi phản hồi ngay trong ứng dụng. Nhóm hỗ trợ sẽ trả lời sớm nhất có thể.",
  },
];

export function PlanFaqAccordion() {
  const [openIds, setOpenIds] = useState<string[]>([FAQS[0].id]);

  const toggleItem = (id: string) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <section className="space-y-6 pt-8 border-t border-slate-200/80 dark:border-slate-800" aria-labelledby="faq-heading">
      {/* ── Section Header ────────────────────────────────────────── */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-0.5 text-xs font-black uppercase tracking-wider text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          <HelpCircle size={13} aria-hidden="true" />
          <span>FAQ</span>
        </div>
        <h2 id="faq-heading" className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
          Các thắc mắc thường gặp
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Giải đáp nhanh các câu hỏi phổ biến về gói học và quyền lợi học viên tại BreadTrans
        </p>
      </div>

      {/* ── Accordion List ────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto space-y-3">
        {FAQS.map((faq) => {
          const isOpen = openIds.includes(faq.id);
          return (
            <div
              key={faq.id}
              className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs transition-colors overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggleItem(faq.id)}
                aria-expanded={isOpen}
                aria-controls={`faq-answer-${faq.id}`}
                className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100 hover:text-amber-800 dark:hover:text-amber-400 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 shrink-0 text-xs font-black">
                    ?
                  </span>
                  <span>{faq.question}</span>
                </div>
                <ChevronDown
                  size={18}
                  className={`text-slate-400 dark:text-slate-500 shrink-0 transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                />
              </button>

              {isOpen && (
                <div
                  id={`faq-answer-${faq.id}`}
                  className="px-4 sm:px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/80 animate-in fade-in duration-150"
                >
                  <p className="pl-10">{faq.answer}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
