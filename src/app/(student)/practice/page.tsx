"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Clock,
  Dumbbell,
  GraduationCap,
  Headphones,
  Layers,
  Mic,
  PenTool,
  Target,
  Trophy,
  Zap,
} from "lucide-react";

const PRACTICE_AREAS = [
  {
    title: "Từ vựng cốt lõi",
    desc: "Học và ôn luyện từ vựng qua thẻ Flashcard thông minh. Ghi nhớ nhanh với phiên âm và câu ví dụ ngữ cảnh.",
    outcome: "Mở rộng vốn từ vựng",
    format: "Flashcard 2 mặt",
    duration: "5 - 10 phút",
    href: "/flashcard",
    icon: Layers,
    badge: "Vocabulary",
    tone: "bg-amber-50 text-amber-600 border-amber-200",
  },
  {
    title: "Ngữ pháp trọng điểm",
    desc: "Nắm vững các chủ điểm ngữ pháp cốt lõi thường xuất hiện trong đề thi TOEIC qua các câu hỏi tương tác có giải thích chi tiết.",
    outcome: "Dùng câu chuẩn xác",
    format: "Trắc nghiệm kèm giải thích",
    duration: "10 - 15 phút",
    href: "/grammar",
    icon: BookOpen,
    badge: "Grammar",
    tone: "bg-emerald-50 text-emerald-600 border-emerald-200",
  },
  {
    title: "Luyện Nói AI (Azure Speech)",
    desc: "Ghi âm phát âm trực tiếp trên trình duyệt. Nhận chấm điểm độ chính xác từng âm tiết, độ trôi chảy và ngữ điệu tức thì.",
    outcome: "Tự tin phát âm chuẩn",
    format: "Ghi âm & Đánh giá âm tiết",
    duration: "5 - 10 phút",
    href: "/practice/speaking",
    icon: Mic,
    badge: "Azure AI Speech",
    tone: "bg-violet-50 text-violet-600 border-violet-200",
  },
  {
    title: "Luyện Viết AI (Gemini)",
    desc: "Viết mô tả tranh, email và bài luận theo tiêu chuẩn TOEIC Writing. Nhận phản hồi chuyên sâu về ngữ pháp và từ vựng từ AI.",
    outcome: "Viết câu mạch lạc",
    format: "Viết bài luận theo đề",
    duration: "15 - 20 phút",
    href: "/practice/writing",
    icon: PenTool,
    badge: "AI Feedback",
    tone: "bg-rose-50 text-rose-600 border-rose-200",
  },
  {
    title: "Luyện Nghe & Đọc",
    desc: "Rèn luyện khả năng đọc hiểu nhanh và bắt âm chuẩn xác qua các đoạn văn song ngữ và bài nghe thực tế.",
    outcome: "Tăng tốc độ đọc hiểu",
    format: "Audio & Đọc hiểu",
    duration: "10 - 15 phút",
    href: "/practice/quizzes",
    icon: Headphones,
    badge: "Listening & Reading",
    tone: "bg-blue-50 text-blue-600 border-blue-200",
  },
  {
    title: "Luyện đề TOEIC bấm giờ",
    desc: "Kho đề thi thử trắc nghiệm mô phỏng đúng cấu trúc bài thi chuẩn hóa, tính giờ tự động và báo cáo phân tích điểm số.",
    outcome: "Làm quen áp lực phòng thi",
    format: "Thi thử có bấm giờ",
    duration: "20 - 45 phút",
    href: "/practice/quizzes",
    icon: Target,
    badge: "Mock Test",
    tone: "bg-orange-50 text-orange-600 border-orange-200",
  },
];

export default function PracticeHubPage() {
  return (
    <div className="space-y-10 pb-16">
      {/* 1. Practice Hub Hero */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-2xs">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 uppercase tracking-wider">
            <Dumbbell size={15} /> Trung tâm luyện kỹ năng tiếng Anh & TOEIC
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Luyện tập tập trung. Phản hồi tức thì.
          </h1>
          <p className="text-sm sm:text-base leading-relaxed text-slate-600">
            Chọn kỹ năng bạn cần cải thiện hôm nay. Mỗi bài tập đều được thiết kế ngắn gọn,
            hướng đến kết quả cụ thể và tích hợp công nghệ AI hỗ trợ chỉnh sửa chi tiết.
          </p>
        </div>
      </section>

      {/* 2. Skills Grid */}
      <section>
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-orange-600">
              Khu vực luyện tập
            </p>
            <h2 className="mt-0.5 text-2xl font-extrabold text-slate-900">
              Bắt đầu luyện tập
            </h2>
          </div>
          <Link
            href="/dashboard"
            className="text-xs sm:text-sm font-extrabold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
          >
            Về trang chủ <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PRACTICE_AREAS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.title}
                href={item.href}
                className="group flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs transition duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-md"
              >
                <div>
                  {/* Top Bar: Icon + Badge */}
                  <div className="flex items-center justify-between">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${item.tone}`}
                    >
                      <Icon size={22} />
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                      {item.badge}
                    </span>
                  </div>

                  {/* Title & Desc */}
                  <h3 className="mt-5 text-lg font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-600">
                    {item.desc}
                  </p>
                </div>

                {/* Footer metadata */}
                <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      <Clock size={13} /> {item.duration}
                    </span>
                    <span className="font-semibold text-slate-700">
                      {item.format}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-100">
                      {item.outcome}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-extrabold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                      Vào luyện <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
