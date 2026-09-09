"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Headphones, Loader2, Volume2 } from "lucide-react";
import { quizService, type Quiz } from "@/lib/api/services/quiz.service";

export default function ListeningPracticePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["listening-practices"],
    queryFn: quizService.getListeningPractices,
  });
  const quizzes = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-8 pb-16">
      <section className="relative overflow-hidden rounded-[2rem] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-sky-100 p-7 shadow-card sm:p-10">
        <div className="absolute -right-8 -top-8 size-44 rounded-full bg-blue-200/40 blur-2xl" aria-hidden="true" />
        <div className="relative max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-3 py-1 text-xs font-extrabold text-blue-700">
            <Headphones size={15} aria-hidden="true" /> Luyện nghe tiếng Anh
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Nghe kỹ hơn, hiểu nhanh hơn</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">Chọn một bài luyện ngắn, nghe lại theo nhịp phù hợp và lưu kết quả học tập của bạn.</p>
        </div>
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-700">Kho bài luyện</p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">Bài nghe sẵn sàng cho bạn</h2>
          </div>
        </div>

        {isLoading ? (
          <div className="flex min-h-56 items-center justify-center rounded-3xl border border-slate-200 bg-white">
            <Loader2 className="animate-spin text-blue-600" size={32} aria-label="Đang tải bài luyện nghe" />
          </div>
        ) : quizzes.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {quizzes.map((quiz: Quiz & { isCompleted?: boolean }) => (
              <article key={quiz.id} className="flex min-h-64 flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-soft transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><Volume2 size={23} aria-hidden="true" /></div>
                  {quiz.isCompleted && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700"><CheckCircle2 size={13} aria-hidden="true" /> Đã hoàn thành</span>}
                </div>
                <p className="mt-5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-blue-700">Listening practice</p>
                <h3 className="mt-2 text-lg font-black text-slate-900">{quiz.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{quiz.description || "Luyện nghe, nhận biết từ khóa và kiểm tra mức độ hiểu bài của bạn."}</p>
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-bold text-slate-500">
                  <span>{quiz._count?.questions || 0} câu hỏi</span>
                  <Link href={`/practice/quizzes/${quiz.id}`} className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-blue-600 px-3 text-xs font-extrabold text-white transition-colors hover:bg-blue-700">
                    Bắt đầu <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-blue-200 bg-white p-12 text-center">
            <Headphones className="mx-auto text-blue-300" size={38} aria-hidden="true" />
            <h3 className="mt-4 text-lg font-black text-slate-900">Chưa có bài luyện nghe</h3>
            <p className="mt-2 text-sm text-slate-600">Đội ngũ học thuật đang chuẩn bị thêm nội dung cho bạn.</p>
          </div>
        )}
      </section>
    </div>
  );
}
