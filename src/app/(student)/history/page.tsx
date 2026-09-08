"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Clock3, Headphones, LineChart, Mic, PenTool, Target } from "lucide-react";

const ACTIVITIES = [
  { type: "Listening", title: "Office Announcements", detail: "8/10 câu đúng • 12 phút", time: "Hôm nay, 20:15", icon: Headphones, tone: "blue" },
  { type: "Vocabulary", title: "Business Travel", detail: "Đã ôn 24 từ • 9 phút", time: "Hôm qua, 19:40", icon: BookOpen, tone: "amber" },
  { type: "Speaking", title: "Client Meeting Introduction", detail: "Độ chính xác phát âm 82%", time: "Hôm qua, 18:05", icon: Mic, tone: "violet" },
  { type: "Writing", title: "Follow-up Email", detail: "Đã nhận phản hồi AI • 16 phút", time: "05/09, 20:20", icon: PenTool, tone: "rose" },
  { type: "Exam", title: "TOEIC 2 kỹ năng - Mock 01", detail: "9/12 câu đúng • 22 phút", time: "04/09, 19:15", icon: Target, tone: "emerald" },
] as const;

const TONES = {
  blue: "bg-blue-50 text-blue-700 border-blue-100",
  amber: "bg-amber-50 text-amber-700 border-amber-100",
  violet: "bg-violet-50 text-violet-700 border-violet-100",
  rose: "bg-rose-50 text-rose-700 border-rose-100",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
};

export default function LearningHistoryPage() {
  const [filter, setFilter] = useState("Tất cả");
  const filters = ["Tất cả", "Listening", "Vocabulary", "Speaking", "Writing", "Exam"];
  const activities = useMemo(() => filter === "Tất cả" ? ACTIVITIES : ACTIVITIES.filter((item) => item.type === filter), [filter]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      <section className="rounded-[2rem] border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-amber-50 p-7 shadow-card sm:p-10"><span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/90 px-3 py-1 text-xs font-extrabold text-sky-700"><LineChart size={15} aria-hidden="true" /> UI preview • dữ liệu minh họa</span><h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Lịch sử luyện tập</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">Theo dõi các hoạt động học, thời lượng và kết quả theo từng kỹ năng. Dữ liệu bên dưới chỉ dùng để duyệt giao diện trước khi kết nối backend.</p></section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[{ label: "Tổng thời gian", value: "3 giờ 18 phút", icon: Clock3, tone: "blue" }, { label: "Phiên đã hoàn thành", value: "12", icon: CheckCircle2, tone: "emerald" }, { label: "Chuỗi hiện tại", value: "5 ngày", icon: Target, tone: "amber" }, { label: "Kỹ năng nổi bật", value: "Listening", icon: Headphones, tone: "violet" }].map(({ label, value, icon: Icon, tone }) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft"><div className={`flex size-10 items-center justify-center rounded-xl ${TONES[tone as keyof typeof TONES]}`}><Icon size={20} aria-hidden="true" /></div><p className="mt-4 text-xs font-bold text-slate-500">{label}</p><strong className="mt-1 block text-xl font-black text-slate-900">{value}</strong></article>)}</section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-sky-700">Hoạt động gần đây</p><h2 className="mt-1 text-xl font-black text-slate-900">Nhịp học của bạn</h2></div><div className="flex gap-2 overflow-x-auto pb-1">{filters.map((item) => <button key={item} type="button" onClick={() => setFilter(item)} aria-pressed={filter === item} className={`min-h-10 shrink-0 rounded-xl px-3 text-xs font-extrabold transition-colors ${filter === item ? "bg-sky-600 text-white" : "bg-slate-50 text-slate-600 hover:bg-sky-50 hover:text-sky-700"}`}>{item === "Listening" ? "Nghe" : item === "Vocabulary" ? "Từ vựng" : item === "Speaking" ? "Nói" : item === "Writing" ? "Viết" : item === "Exam" ? "Luyện đề" : item}</button>)}</div></div><div className="mt-6 space-y-3">{activities.map((activity) => { const Icon = activity.icon; return <article key={activity.title} className="flex flex-col gap-4 rounded-2xl border border-slate-100 p-4 transition-colors hover:border-sky-200 hover:bg-sky-50/30 sm:flex-row sm:items-center"><div className={`flex size-11 shrink-0 items-center justify-center rounded-xl border ${TONES[activity.tone]}`}><Icon size={20} aria-hidden="true" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-extrabold text-slate-900">{activity.title}</h3><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-500">{activity.type}</span></div><p className="mt-1 text-sm text-slate-600">{activity.detail}</p></div><time className="shrink-0 text-xs font-bold text-slate-400">{activity.time}</time></article>; })}{activities.length === 0 && <p className="rounded-xl bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500">Chưa có hoạt động phù hợp với bộ lọc này.</p>}</div></section>
      <Link href="/practice" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-sky-600 px-5 text-sm font-extrabold text-white transition-colors hover:bg-sky-700">Tiếp tục luyện tập <ArrowRight size={17} aria-hidden="true" /></Link>
    </div>
  );
}
