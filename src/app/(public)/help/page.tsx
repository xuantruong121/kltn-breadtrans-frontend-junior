"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

const FAQS = [
  [
    "Đăng nhập, mật khẩu và Google",
    "Bạn có thể đăng nhập bằng email/mật khẩu hoặc Google. Nếu quên mật khẩu, chọn “Quên mật khẩu” ở màn hình đăng nhập và dùng email đã đăng ký để nhận liên kết đặt lại.",
  ],
  [
    "Hồ sơ và ảnh đại diện",
    "Vào menu tài khoản, chọn “Thông tin cá nhân”. Bạn có thể đổi tên hiển thị và ảnh đại diện; thay đổi sẽ được lưu vào hồ sơ của bạn.",
  ],
  [
    "Tiến độ học được lưu như thế nào?",
    "Khi đã đăng nhập, hệ thống lưu tiến độ khóa học, lượt luyện tập và kết quả theo tài khoản. Bạn có thể quay lại tiếp tục ở các khu vực học tương ứng.",
  ],
  [
    "Tôi có thể làm lại bài luyện không?",
    "Có. Bạn có thể mở lại một bài luyện hoặc bài kiểm tra để thực hành thêm. Kết quả hiển thị phụ thuộc vào loại nội dung và lần nộp bài của bạn.",
  ],
  [
    "Các kỹ năng và cấp độ",
    "BreadTrans hỗ trợ tự học tiếng Anh theo kỹ năng, chủ đề và cấp độ. Hãy chọn nội dung phù hợp với mục tiêu hiện tại, sau đó tăng dần độ khó khi đã vững nền tảng.",
  ],
  [
    "Luyện đề TOEIC",
    "TOEIC là một format đề đang được hỗ trợ. Bạn có thể xem danh sách đề, làm bài theo từng phần hoặc toàn bài tùy nội dung đã được xuất bản.",
  ],
  [
    "Kết quả và lịch sử làm bài",
    "Sau khi nộp bài, hệ thống hiển thị kết quả, phản hồi hoặc đáp án phù hợp với loại bài. Lịch sử và tiến độ chỉ hiển thị cho chính tài khoản của bạn.",
  ],
  [
    "Gói học và thanh toán",
    "Thông tin gói học của bạn nằm trong menu tài khoản tại “Gói của tôi”. Chỉ các giao dịch đã được hệ thống xác nhận mới thay đổi quyền truy cập.",
  ],
  [
    "Âm thanh, hình ảnh hoặc bài học không tải được",
    "Hãy kiểm tra kết nối mạng, thử tải lại trang và dùng phiên bản trình duyệt mới. Nếu vấn đề lặp lại, bạn có thể gửi thông tin ở mục “Đề xuất & Góp ý” sau khi đăng nhập.",
  ],
] as const;

export default function HelpPage() {
  const [query, setQuery] = useState("");
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const filtered = useMemo(
    () =>
      FAQS.map((item, index) => ({ item, index })).filter(({ item }) =>
        item
          .join(" ")
          .toLocaleLowerCase("vi-VN")
          .includes(query.trim().toLocaleLowerCase("vi-VN")),
      ),
    [query],
  );

  return (
    <main className="min-h-[calc(100dvh-5rem)] bg-slate-50 px-4 py-10 sm:px-6 sm:py-14">
      <section className="mx-auto max-w-3xl">
        <header className="border-b border-slate-200 pb-7 sm:pb-8">
          <p className="text-sm font-semibold text-slate-500">
            Trung tâm trợ giúp
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Câu hỏi thường gặp
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            Tìm nhanh hướng dẫn sử dụng BreadTrans và các câu trả lời cần thiết
            trước khi bắt đầu học.
          </p>
        </header>

        <label className="relative mt-7 block">
          <span className="sr-only">Tìm câu hỏi</span>
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo nội dung cần hỗ trợ"
            className="min-h-12 w-full rounded-lg border border-slate-300 bg-white py-3 pl-11 pr-4 text-base text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-slate-600 focus:ring-2 focus:ring-slate-200"
          />
        </label>

        <div className="mt-6 border-y border-slate-200 bg-white">
          {filtered.length ? (
            filtered.map(({ item, index }) => (
              <article
                key={item[0]}
                className="border-b border-slate-200 last:border-0"
              >
                <button
                  type="button"
                  aria-expanded={openIndex === index}
                  onClick={() =>
                    setOpenIndex((current) =>
                      current === index ? null : index,
                    )
                  }
                  className="flex min-h-14 w-full items-center justify-between gap-4 px-4 py-4 text-left text-base font-semibold text-slate-900 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-700 sm:px-5"
                >
                  <span>{item[0]}</span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-slate-500 transition-transform duration-150 ${openIndex === index ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  />
                </button>
                {openIndex === index && (
                  <div className="max-w-2xl px-4 pb-5 text-base leading-7 text-slate-600 sm:px-5">
                    {item[1]}
                  </div>
                )}
              </article>
            ))
          ) : (
            <div className="px-4 py-12 text-center text-base text-slate-600">
              Chưa có câu hỏi phù hợp. Hãy thử cụm từ khác.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
