"use client";

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
      "BreadTrans hỗ trợ thanh toán chuyển khoản ngân hàng qua mã VietQR tự động 24/7 đối với tất cả các ngân hàng tại Việt Nam (Vietcombank, MB, Techcombank, ACB, v.v.) và các ứng dụng ví điện tử (MoMo, ZaloPay, ViettelPay). Bạn chỉ cần mở app ngân hàng quét mã QR có sẵn số tiền và mã giao dịch để hoàn tất trong vài giây.",
  },
  {
    id: "activation-time",
    question: "Sau khi chuyển khoản, bao lâu thì tài khoản của tôi được kích hoạt gói Plus?",
    answer:
      "Hệ thống sẽ đối soát tự động ngay khi nhận được biến động số dư (thông thường chỉ mất từ 30 giây đến 1 phút). Sau khi chuyển khoản xong, bạn bấm nút 'Tôi đã chuyển khoản' trên màn hình để hệ thống ưu tiên kích hoạt và cập nhật quyền lợi ngay lập tức.",
  },
  {
    id: "auto-renew",
    question: "Gói BreadTrans Plus có tự động trừ tiền gia hạn hàng tháng không?",
    answer:
      "Không. BreadTrans cam kết KHÔNG tự động trừ tiền trong thẻ hay tài khoản của bạn. Gói học có thời hạn sử dụng cố định (ví dụ 30 ngày). Khi hết hạn, tài khoản của bạn sẽ tự chuyển về gói Free cơ bản và bạn có thể chủ động lựa chọn có tiếp tục gia hạn hay không.",
  },
  {
    id: "multi-device",
    question: "Tôi có thể học trên nhiều thiết bị (máy tính, điện thoại, máy tính bảng) không?",
    answer:
      "Có. Bạn có thể đăng nhập tài khoản BreadTrans trên máy tính, điện thoại thông minh và máy tính bảng. Mọi tiến độ học tập, bài thi thử đã làm và kho từ vựng cá nhân đều được đồng bộ tự động theo thời gian thực giữa các thiết bị.",
  },
  {
    id: "ai-credits",
    question: "Lượt chấm AI Writing & Speaking được tính như thế nào?",
    answer:
      "Mỗi tài khoản được cấp lượt chấm miễn phí hàng ngày để trải nghiệm. Khi nâng cấp gói Plus, bạn được ưu tiên xử lý và mở rộng hạn mức chấm chữa chi tiết (phân tích phát âm, sửa lỗi ngữ pháp, gợi ý nâng cấp từ vựng chuẩn band điểm thi quốc tế).",
  },
  {
    id: "support-channel",
    question: "Nếu gặp sự cố trong quá trình nâng cấp, tôi có thể liên hệ hỗ trợ ở đâu?",
    answer:
      "Bạn có thể bấm vào mục 'Trợ giúp & Liên hệ' trên thanh điều hướng hoặc gửi đề xuất phản hồi trực tiếp. Đội ngũ hỗ trợ học viên và kỹ thuật của BreadTrans luôn túc trực để hỗ trợ kiểm tra và giải đáp cho bạn nhanh nhất.",
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
