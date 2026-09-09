"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  Clock,
  Dumbbell,
  Headphones,
  History,
  Layers,
  Mic,
  PenTool,
  Target,
} from "lucide-react";

const SKILLS = [
  {
    title: "Luyện nghe",
    description: "Làm quen với hội thoại, thông báo và các tình huống tiếng Anh thường gặp.",
    href: "/practice/listening",
    icon: Headphones,
    label: "Nghe hiểu",
    duration: "10–15 phút",
    theme: "border-blue-200 bg-blue-50 text-blue-700",
  },
  {
    title: "Luyện nói",
    description: "Ghi âm trực tiếp, luyện phản xạ và nhận nhận xét phát âm chuẩn IPA.",
    href: "/practice/speaking",
    icon: Mic,
    label: "Giao tiếp",
    duration: "5–10 phút",
    theme: "border-violet-200 bg-violet-50 text-violet-700",
  },
  {
    title: "Luyện đọc",
    description: "Rèn tìm ý chính, vốn từ theo ngữ cảnh và cách xử lý thông tin.",
    href: "/practice/reading",
    icon: BookOpen,
    label: "Đọc hiểu",
    duration: "10–15 phút",
    theme: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  {
    title: "Luyện viết học thuật",
    description: "Viết câu, email và đoạn văn; nhận góp ý rõ ràng để viết tự tin hơn.",
    href: "/practice/writing",
    icon: PenTool,
    label: "Diễn đạt",
    duration: "15–20 phút",
    theme: "border-rose-200 bg-rose-50 text-rose-700",
  },
];

const LEARNING_TOOLS = [
  {
    title: "Flashcard từ vựng",
    description: "Ghi nhớ từ mới theo chủ đề bằng thẻ học, âm thanh và ôn tập lặp lại.",
    href: "/flashcard",
    icon: Layers,
    action: "Mở Flashcard",
    theme: "border-amber-200 bg-amber-50 text-amber-700",
  },
  {
    title: "Ngữ pháp tiếng Anh",
    description: "Nắm vững các cấu trúc cốt lõi qua bài học ngắn và câu hỏi có giải thích.",
    href: "/grammar",
    icon: BookOpen,
    action: "Học ngữ pháp",
    theme: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  {
    title: "Kiểm tra đầu vào",
    description: "Làm bài kiểm tra ngắn để xác định điểm xuất phát và chọn hướng học phù hợp.",
    href: "/diagnostic",
    icon: ClipboardCheck,
    action: "Bắt đầu kiểm tra",
    theme: "border-blue-200 bg-blue-50 text-blue-700",
  },
  {
    title: "Lịch sử luyện tập",
    description: "Xem lại các hoạt động đã hoàn thành và duy trì nhịp học của bạn.",
    href: "/history",
    icon: History,
    action: "Xem lịch sử",
    theme: "border-violet-200 bg-violet-50 text-violet-700",
  },
];

export default function PracticeHubPage() {
  return (
    <div className="space-y-10 pb-16">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-blue-50 via-white to-amber-50 p-7 shadow-2xs sm:p-10">
        <div className="pointer-events-none absolute -right-12 -top-16 size-56 rounded-full bg-blue-200/35 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/90 px-3 py-1 text-xs font-extrabold text-blue-700">
              <Dumbbell size={15} aria-hidden="true" /> Trung tâm học tiếng Anh
            </span>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Học từng kỹ năng. Tiến bộ từng ngày.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Luyện Nghe, Nói, Đọc, Viết; củng cố từ vựng và ngữ pháp theo nhịp học của riêng bạn.
              Khi cần kiểm tra năng lực theo định dạng TOEIC, hãy vào khu vực Luyện đề riêng.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/history" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50">
              Lịch sử luyện tập
            </Link>
            <Link href="/diagnostic" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-extrabold text-white transition-colors hover:bg-blue-700">
              <ClipboardCheck size={17} aria-hidden="true" /> Kiểm tra đầu vào
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="skills-heading">
        <div className="mb-6">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-700">Bốn kỹ năng</p>
          <h2 id="skills-heading" className="mt-1 text-2xl font-black text-slate-900">Hôm nay bạn muốn luyện gì?</h2>
          <p className="mt-1 text-sm text-slate-600">Chọn một bài ngắn để duy trì nhịp học đều đặn.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {SKILLS.map((skill) => {
            const Icon = skill.icon;
            return (
              <Link key={skill.href} href={skill.href} className="group flex min-h-64 flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs transition duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-md">
                <div className={`flex size-12 items-center justify-center rounded-2xl border ${skill.theme}`}><Icon size={22} aria-hidden="true" /></div>
                <p className="mt-5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-400">{skill.label}</p>
                <h3 className="mt-2 text-lg font-black text-slate-900 transition-colors group-hover:text-blue-700">{skill.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{skill.description}</p>
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-bold">
                  <span className="inline-flex items-center gap-1 text-slate-500"><Clock size={14} aria-hidden="true" /> {skill.duration}</span>
                  <span className="inline-flex items-center gap-1 text-blue-700">Vào luyện <ArrowRight size={14} aria-hidden="true" /></span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="foundation-heading">
        <div className="mb-6">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-700">Công cụ học bổ trợ</p>
          <h2 id="foundation-heading" className="mt-1 text-2xl font-black text-slate-900">Củng cố và theo dõi việc học</h2>
          <p className="mt-1 text-sm text-slate-600">Các công cụ này hỗ trợ việc học tiếng Anh, tách biệt với bốn kỹ năng và khu Luyện đề TOEIC.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {LEARNING_TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link key={tool.href} href={tool.href} className="group flex gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs transition hover:border-emerald-300 hover:shadow-md">
                <div className={`flex size-12 shrink-0 items-center justify-center rounded-2xl border ${tool.theme}`}><Icon size={22} aria-hidden="true" /></div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-black text-slate-900 transition-colors group-hover:text-emerald-700">{tool.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{tool.description}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-extrabold text-emerald-700">{tool.action} <ArrowRight size={15} aria-hidden="true" /></span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-orange-200 bg-gradient-to-r from-orange-50 via-white to-amber-50 p-6 shadow-2xs sm:p-8" aria-labelledby="toeic-heading">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-sm"><Target size={23} aria-hidden="true" /></span>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-orange-700">Khu vực luyện đề</p>
              <h2 id="toeic-heading" className="mt-1 text-xl font-black text-slate-900">Luyện đề TOEIC</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Làm đề 2 kỹ năng hoặc 4 kỹ năng, bấm giờ và xem kết quả theo từng đề.</p>
            </div>
          </div>
          <Link href="/practice/quizzes" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 text-sm font-extrabold text-white transition-colors hover:bg-orange-700">
            Vào kho đề <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
