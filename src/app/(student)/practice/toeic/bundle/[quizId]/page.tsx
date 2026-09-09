"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, Loader2, Mic, PenLine } from "lucide-react";
import { useRouter } from "next/navigation";
import { toeicService } from "@/lib/api/services/toeic.service";

export default function ToeicBundlePage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId: rawQuizId } = use(params);
  const quizId = Number(rawQuizId);
  const router = useRouter();
  const { data: bundle, isLoading, isError } = useQuery({
    queryKey: ["toeic-bundle", quizId],
    queryFn: () => toeicService.getBundle(quizId),
    enabled: Number.isInteger(quizId),
  });
  if (isLoading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="animate-spin text-amber-600" /></div>;
  if (isError || !bundle) return <div className="mx-auto max-w-2xl py-20 text-center text-slate-600">Không tải được gói TOEIC 4 kỹ năng.</div>;
  const lrCount = bundle.listeningReading.groups.reduce((total, group) => total + group.questions.length, 0);
  return <main className="mx-auto max-w-5xl space-y-8 px-4 pb-20 pt-8"><header className="rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-8"><p className="text-xs font-black uppercase tracking-widest text-amber-700">Gói luyện thi TOEIC 4 kỹ năng</p><h1 className="mt-3 text-3xl font-black text-slate-900">{bundle.title}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{bundle.description}</p></header><div className="grid gap-5 md:grid-cols-2"><article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><BookOpen className="text-sky-600" size={28} /><h2 className="mt-4 text-xl font-black">Listening &amp; Reading</h2><p className="mt-2 text-sm text-slate-600">{lrCount} câu theo cấu trúc 100 Listening và 100 Reading.</p><button type="button" onClick={() => router.push(`/practice/toeic/${bundle.listeningReading.id}`)} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-500 px-4 text-sm font-black text-white hover:bg-amber-600">Bắt đầu phần L&amp;R <ArrowRight size={16} /></button></article><article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex gap-2"><Mic className="text-violet-600" size={28} /><PenLine className="text-rose-600" size={28} /></div><h2 className="mt-4 text-xl font-black">Speaking &amp; Writing</h2><p className="mt-2 text-sm text-slate-600">{bundle.speakingWriting.questions.length} nhiệm vụ gồm 11 Speaking và 8 Writing.</p><p className="mt-6 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">Các nhiệm vụ nói/viết được mở từ module luyện kỹ năng tương ứng để bảo đảm chấm điểm đúng loại bài.</p></article></div></main>;
}
