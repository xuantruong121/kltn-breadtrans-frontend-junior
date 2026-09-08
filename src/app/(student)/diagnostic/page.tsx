"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, BarChart3, CheckCircle2, ClipboardCheck, Clock3, Headphones, Lightbulb, RotateCcw, Sparkles, Target } from "lucide-react";

const QUESTIONS = [
  { skill: "Listening", question: "You hear: “The meeting has been moved to Friday morning.” When is the meeting?", answers: ["Thursday afternoon", "Friday morning", "Friday evening", "Next Monday"], correct: 1 },
  { skill: "Reading", question: "Please submit the completed form _____ noon tomorrow.", answers: ["by", "since", "during", "from"], correct: 0 },
  { skill: "Grammar", question: "The new software _____ by the IT team last week.", answers: ["install", "was installed", "is installing", "has install"], correct: 1 },
  { skill: "Vocabulary", question: "Customers appreciate our prompt and _____ service.", answers: ["reliable", "reliably", "reliability", "rely"], correct: 0 },
  { skill: "Reading", question: "What is the main purpose of an email that confirms an appointment?", answers: ["To cancel a meeting", "To verify the meeting details", "To request a refund", "To advertise a product"], correct: 1 },
  { skill: "Speaking", question: "Choose the most professional reply: “Could you send the report today?”", answers: ["Yes, I will send it before 5 P.M.", "Report today.", "Why?", "Maybe I send."], correct: 0 },
] as const;

export default function DiagnosticPage() {
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const current = QUESTIONS[step];
  const score = useMemo(() => answers.reduce((total, answer, index) => total + (answer === QUESTIONS[index]?.correct ? 1 : 0), 0), [answers]);
  const percentage = Math.round((score / QUESTIONS.length) * 100);
  const level = percentage >= 75 ? "Intermediate" : percentage >= 45 ? "Foundation" : "Starter";

  const selectAnswer = (answerIndex: number) => {
    setAnswers((previous) => {
      const next = [...previous];
      next[step] = answerIndex;
      return next;
    });
  };

  const next = () => {
    if (step === QUESTIONS.length - 1) setSubmitted(true);
    else setStep((value) => value + 1);
  };

  const reset = () => {
    setStarted(false);
    setStep(0);
    setAnswers([]);
    setSubmitted(false);
  };

  if (!started) {
    return (
      <div className="mx-auto max-w-5xl space-y-8 pb-16">
        <section className="relative overflow-hidden rounded-[2rem] border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-sky-100 p-7 shadow-card sm:p-10">
          <div className="absolute -right-10 -top-10 size-48 rounded-full bg-violet-200/50 blur-3xl" aria-hidden="true" />
          <div className="relative max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/90 px-3 py-1 text-xs font-extrabold text-violet-700"><ClipboardCheck size={15} aria-hidden="true" /> UI preview • chưa lưu kết quả</span>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Kiểm tra trình độ đầu vào</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">Trả lời một nhóm câu hỏi ngắn để xem lộ trình gợi ý phù hợp. Bản này chỉ mô phỏng trải nghiệm giao diện, chưa gửi dữ liệu lên hệ thống.</p>
            <button type="button" onClick={() => setStarted(true)} className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-extrabold text-white shadow-sm transition-colors hover:bg-violet-700"><Sparkles size={18} aria-hidden="true" /> Bắt đầu kiểm tra <ArrowRight size={18} aria-hidden="true" /></button>
          </div>
        </section>
        <section className="grid gap-4 sm:grid-cols-3">
          {[{ icon: Clock3, title: "Khoảng 8 phút", text: "6 câu hỏi mẫu theo kỹ năng" }, { icon: Target, title: "4 kỹ năng", text: "Nghe, Đọc, Ngữ pháp, phản xạ" }, { icon: BarChart3, title: "Gợi ý trực quan", text: "Xem điểm mạnh và điểm cần luyện" }].map(({ icon: Icon, title, text }) => <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft"><Icon className="text-violet-600" size={22} aria-hidden="true" /><h2 className="mt-3 text-base font-extrabold text-slate-900">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{text}</p></article>)}
        </section>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 pb-16">
        <section className="rounded-[2rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-7 shadow-card sm:p-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-700"><CheckCircle2 size={15} aria-hidden="true" /> Hoàn thành bản xem trước</span>
          <h1 className="mt-4 text-3xl font-black text-slate-900">Bạn đang ở mức {level}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Kết quả UI demo: {score}/{QUESTIONS.length} câu đúng ({percentage}%). Khi có backend, kết quả sẽ được lưu để cá nhân hóa lộ trình và lịch sử học tập.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-white p-4 shadow-soft"><span className="text-xs font-bold text-slate-500">Độ chính xác</span><strong className="mt-1 block text-2xl font-black text-emerald-700">{percentage}%</strong></div><div className="rounded-2xl bg-white p-4 shadow-soft"><span className="text-xs font-bold text-slate-500">Nên bắt đầu</span><strong className="mt-1 block text-lg font-black text-slate-900">Luyện Nghe & Đọc</strong></div><div className="rounded-2xl bg-white p-4 shadow-soft"><span className="text-xs font-bold text-slate-500">Mục tiêu tuần</span><strong className="mt-1 block text-lg font-black text-slate-900">3 phiên ngắn</strong></div></div>
        </section>
        <section className="grid gap-4 md:grid-cols-2"><article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft"><div className="flex items-center gap-2 text-emerald-700"><CheckCircle2 size={19} aria-hidden="true" /><h2 className="font-extrabold">Điểm mạnh</h2></div><p className="mt-3 text-sm leading-6 text-slate-600">Bạn đã có nền tảng để làm bài theo ngữ cảnh. Tiếp tục luyện các bài ngắn để tăng tốc độ phản xạ.</p></article><article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft"><div className="flex items-center gap-2 text-amber-700"><Lightbulb size={19} aria-hidden="true" /><h2 className="font-extrabold">Gợi ý tiếp theo</h2></div><p className="mt-3 text-sm leading-6 text-slate-600">Dành 10 phút mỗi ngày cho Listening, sau đó xem lại giải thích ở các câu Reading và Grammar.</p></article></section>
        <div className="flex flex-wrap gap-3"><Link href="/practice" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-extrabold text-white hover:bg-violet-700">Bắt đầu lộ trình <ArrowRight size={17} aria-hidden="true" /></Link><button type="button" onClick={reset} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-700 hover:bg-slate-50"><RotateCcw size={17} aria-hidden="true" /> Làm lại bản xem trước</button></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft sm:p-6"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-violet-700">Kiểm tra đầu vào • UI preview</p><h1 className="mt-1 text-xl font-black text-slate-900">Câu {step + 1} / {QUESTIONS.length}</h1></div><span className="rounded-xl bg-violet-50 px-3 py-2 text-xs font-extrabold text-violet-700">{current.skill}</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-violet-600 transition-all" style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }} /></div></header>
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-card sm:p-9"><div className="flex size-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700"><Headphones size={23} aria-hidden="true" /></div><h2 className="mt-6 text-xl font-black leading-8 text-slate-900 sm:text-2xl">{current.question}</h2><div className="mt-7 grid gap-3 sm:grid-cols-2">{current.answers.map((answer, index) => <button key={answer} type="button" onClick={() => selectAnswer(index)} aria-pressed={answers[step] === index} className={`min-h-16 rounded-2xl border-2 px-5 text-left text-sm font-bold transition-colors ${answers[step] === index ? "border-violet-500 bg-violet-50 text-violet-900" : "border-slate-200 bg-white text-slate-700 hover:border-violet-200 hover:bg-violet-50/40"}`}><span className="mr-3 inline-flex size-6 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-500">{String.fromCharCode(65 + index)}</span>{answer}</button>)}</div><div className="mt-8 flex items-center justify-between gap-3"><button type="button" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0} className="min-h-11 rounded-xl px-4 text-sm font-extrabold text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Câu trước</button><button type="button" onClick={next} disabled={answers[step] === undefined} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-extrabold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50">{step === QUESTIONS.length - 1 ? "Xem kết quả" : "Câu tiếp theo"} <ArrowRight size={17} aria-hidden="true" /></button></div></section>
    </div>
  );
}
