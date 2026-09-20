"use client";

import { useState, useEffect, use } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, ChevronRight, Loader2, Mic, PenLine } from "lucide-react";
import { useRouter } from "next/navigation";
import { toeicService } from "@/lib/api/services/toeic.service";
import { PracticeLoadingScreen } from "@/components/practice/PracticeLoadingScreen";
import { useAuthStore } from "@/stores/authStore";
import { AuthGateModal } from "@/components/auth/AuthGateModal";

export default function ToeicBundlePage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId: rawQuizId } = use(params);
  const quizId = Number(rawQuizId);
  const router = useRouter();
  const { user } = useAuthStore();
  const [isLaunching, setIsLaunching] = useState(false);
  const [authGate, setAuthGate] = useState(false);

  const { data: bundle, isLoading, isError } = useQuery({
    queryKey: ["toeic-bundle", quizId],
    queryFn: () => toeicService.getBundle(quizId),
    enabled: Number.isInteger(quizId),
  });

  useEffect(() => {
    if (!isLaunching || !bundle?.listeningReading?.id) return;

    let animId2: number;

    const animId1 = requestAnimationFrame(() => {
      animId2 = requestAnimationFrame(() => {
        router.push(`/practice/toeic/${bundle.listeningReading.id}`);
      });
    });

    return () => {
      cancelAnimationFrame(animId1);
      if (animId2) cancelAnimationFrame(animId2);
    };
  }, [isLaunching, bundle?.listeningReading?.id, router]);

  if (isLaunching) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center py-12">
        <PracticeLoadingScreen skill="listening" className="max-w-4xl" />
      </div>
    );
  }

  if (isLoading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="animate-spin text-amber-600" /></div>;
  if (isError || !bundle) return <div className="mx-auto max-w-2xl py-20 text-center text-slate-600">Không tải được gói TOEIC 4 kỹ năng.</div>;
  const lrCount = bundle.listeningReading.parts?.reduce((total, part) => total + part.questionCount, 0) ?? 0;
  const speakingTasks = bundle.speakingWriting.questions.filter((question) => question.type === "SPEAKING");
  const writingTasks = bundle.speakingWriting.questions.filter((question) => question.type === "WRITING");
  const speakingGroups = [[1, 2], [3, 4], [5, 6, 7], [8, 9, 10], [11]];
  const writingGroups = [[1, 2, 3, 4, 5], [6, 7], [8]];

  const handleStartLR = () => {
    if (!user) {
      setAuthGate(true);
      return;
    }
    if (isLaunching) return;
    setIsLaunching(true);
  };
  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 pb-20 pt-8">
      <header className="rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-8">
        <p className="text-xs font-black uppercase tracking-widest text-amber-700">TOEIC 4 kỹ năng · Bundle đánh giá</p>
        <h1 className="mt-3 text-3xl font-black text-slate-900">{bundle.title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{bundle.description}</p>
      </header>
      <div className="grid gap-5 md:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <BookOpen className="text-sky-600" size={28} />
          <h2 className="mt-4 text-xl font-black">TOEIC L&amp;R</h2>
          <p className="mt-2 text-sm text-slate-600">Listening + Reading · {lrCount} câu · 45 phút Listening + 75 phút Reading.</p>
          <button
            type="button"
            disabled={isLaunching}
            onClick={handleStartLR}
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-500 px-4 text-sm font-black text-white hover:bg-amber-600 disabled:opacity-50 cursor-pointer"
          >
            Bắt đầu phần L&amp;R <ArrowRight size={16} />
          </button>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex gap-2">
            <Mic className="text-violet-600" size={28} />
            <PenLine className="text-rose-600" size={28} />
          </div>
          <h2 className="mt-4 text-xl font-black">TOEIC S&amp;W</h2>
          <p className="mt-2 text-sm text-slate-600">Speaking + Writing · {speakingTasks.length} Speaking · {writingTasks.length} Writing · khoảng 80 phút.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => router.push("/practice/speaking")} className="inline-flex min-h-11 items-center justify-between rounded-xl border border-violet-200 bg-violet-50 px-3 text-sm font-bold text-violet-800 hover:bg-violet-100">Speaking ({speakingTasks.length}) <ChevronRight size={16} /></button>
            <button type="button" onClick={() => router.push("/practice/writing")} className="inline-flex min-h-11 items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-3 text-sm font-bold text-rose-800 hover:bg-rose-100">Writing ({writingTasks.length}) <ChevronRight size={16} /></button>
          </div>
          <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">Bundle giữ hai bài đánh giá độc lập để kết quả Speaking và Writing được chấm đúng module, sau đó tổng hợp cùng phần L&amp;R.</p>
        </article>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-3xl border border-violet-200 bg-white p-6 shadow-sm" aria-labelledby="bundle-speaking-groups">
          <div className="flex items-center justify-between gap-3"><h2 id="bundle-speaking-groups" className="text-lg font-black text-slate-900">Speaking · 11 nhiệm vụ</h2><button type="button" onClick={() => router.push("/practice/speaking")} className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-violet-200 px-3 text-xs font-bold text-violet-800 hover:bg-violet-50">Mở luyện nói <ArrowRight size={14} /></button></div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">{speakingGroups.map((group) => <div key={group[0]} className="rounded-xl border border-violet-100 bg-violet-50/50 p-3"><p className="text-sm font-bold text-violet-900">Câu {group[0]}–{group[group.length - 1]}</p><p className="mt-1 text-xs text-slate-600">{group.length === 1 ? "Express an opinion" : group[0] <= 2 ? "Read aloud" : group[0] <= 4 ? "Describe a picture" : group[0] <= 7 ? "Respond to questions" : "Respond using information"}</p></div>)}</div>
        </section>
        <section className="rounded-3xl border border-rose-200 bg-white p-6 shadow-sm" aria-labelledby="bundle-writing-groups">
          <div className="flex items-center justify-between gap-3"><h2 id="bundle-writing-groups" className="text-lg font-black text-slate-900">Writing · 8 nhiệm vụ</h2><button type="button" onClick={() => router.push("/practice/writing")} className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-rose-200 px-3 text-xs font-bold text-rose-800 hover:bg-rose-50">Mở luyện viết <ArrowRight size={14} /></button></div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">{writingGroups.map((group) => <div key={group[0]} className="rounded-xl border border-rose-100 bg-rose-50/50 p-3"><p className="text-sm font-bold text-rose-900">Câu {group[0]}–{group[group.length - 1]}</p><p className="mt-1 text-xs text-slate-600">{group[0] === 1 ? "Picture sentence" : group[0] === 6 ? "Written request" : "Opinion essay"}</p></div>)}</div>
        </section>
      </div>
      <AuthGateModal
        isOpen={authGate}
        onClose={() => setAuthGate(false)}
        targetLabel={bundle?.title ? `Gói đề ${bundle.title}` : "Gói luyện thi TOEIC"}
        targetRoute={bundle?.listeningReading ? `/practice/toeic/${bundle.listeningReading.id}` : `/practice/toeic/bundle/${quizId}`}
        onOpenLogin={() => router.push("/login")}
        onOpenRegister={() => router.push("/register")}
      />
    </main>
  );
}
