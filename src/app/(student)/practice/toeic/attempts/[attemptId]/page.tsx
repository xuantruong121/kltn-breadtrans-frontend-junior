"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Maximize2, Volume2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toeicService } from "@/lib/api/services/toeic.service";

export default function ToeicAttemptPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId: raw } = use(params);
  const attemptId = Number(raw);
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number> | null>(null);
  const [showExit, setShowExit] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { data: attempt, isLoading, isError } = useQuery({ queryKey: ["toeic-attempt", attemptId], queryFn: () => toeicService.getAttempt(attemptId), enabled: Number.isInteger(attemptId) });
  const questions = useMemo(() => (attempt?.exam.groups ?? []).flatMap((group) => group.questions.map((question) => ({ question, group }))), [attempt]);
  const current = questions[index];
  const persistedAnswers = useMemo(() => Object.fromEntries((attempt?.answers ?? []).filter((a) => a.selectedIndex !== null).map((a) => [a.questionId, a.selectedIndex as number])), [attempt]);
  const currentAnswers = answers ?? persistedAnswers;
  const save = useMutation({ mutationFn: () => toeicService.saveAnswers(attemptId, currentAnswers) });
  const submit = useMutation({ mutationFn: () => toeicService.submitAttempt(attemptId), onSuccess: () => router.push(`/practice/toeic/results/${attemptId}`) });
  const cancel = useMutation({ mutationFn: () => toeicService.cancelAttempt(attemptId), onSuccess: () => router.push("/practice/quizzes") });

  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);
  useEffect(() => {
    if (!attempt || attempt.status !== "IN_PROGRESS") return;
    const report = (eventType: Parameters<typeof toeicService.recordIntegrityEvent>[1]) => {
      void toeicService.recordIntegrityEvent(attempt.id, eventType, current?.question.id).catch(() => undefined);
    };
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) report("FULLSCREEN_EXIT");
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") report("TAB_HIDDEN");
    };
    const onBlur = () => report("WINDOW_BLUR");
    const onCopy = (event: ClipboardEvent) => { event.preventDefault(); report("COPY_ATTEMPT"); };
    const onPaste = (event: ClipboardEvent) => { event.preventDefault(); report("PASTE_ATTEMPT"); };
    const onContextMenu = (event: MouseEvent) => { event.preventDefault(); report("CONTEXT_MENU_ATTEMPT"); };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onContextMenu);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onContextMenu);
    };
  }, [attempt, current?.question.id]);
  const playAudio = async () => {
    if (!current || current.group.part > 4) return;
    setAudioLoading(true);
    try {
      const blob = await toeicService.getGroupAudio(current.group.id, attemptId);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      const url = URL.createObjectURL(blob); setAudioUrl(url);
      if (audioRef.current) { audioRef.current.src = url; await audioRef.current.play(); }
    } finally { setAudioLoading(false); }
  };
  const next = async () => { await save.mutateAsync(); if (index === questions.length - 1) submit.mutate(); else setIndex((value) => value + 1); };
  const enterFullscreen = () => document.documentElement.requestFullscreen?.().catch(() => undefined);
  if (isLoading) return <div className="flex min-h-[70vh] items-center justify-center"><Loader2 className="animate-spin text-amber-600" /></div>;
  if (isError || !attempt || !current) return <div className="mx-auto max-w-xl py-24 text-center text-slate-600">Không tải được lượt thi.</div>;
  const isListening = current.group.part <= 4;
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-900 p-4 text-white">
          <div><p className="text-xs text-slate-300">Đang làm bài</p><h1 className="font-black">{attempt.exam.title}</h1></div>
          <div className="flex items-center gap-2"><button type="button" onClick={enterFullscreen} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-600 px-3 text-sm font-bold hover:bg-slate-800"><Maximize2 size={16}/> Toàn màn hình</button><button type="button" onClick={() => setShowExit(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rose-600 px-3 text-sm font-bold hover:bg-rose-700"><X size={16}/> Thoát bài thi</button></div>
        </header>
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="mb-6 flex items-center justify-between"><span className="text-xs font-black uppercase tracking-wider text-amber-600">Part {current.group.part} · Câu {index + 1}/{questions.length}</span>{isListening && <button type="button" onClick={() => void playAudio()} disabled={audioLoading} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-sky-600 px-4 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-60">{audioLoading ? <Loader2 size={16} className="animate-spin"/> : <Volume2 size={16}/>} Phát audio</button>}</div>
            {current.group.imageUrl && <img src={current.group.imageUrl} alt={`Hình minh họa Part ${current.group.part}`} className="mx-auto mb-6 max-h-80 rounded-xl object-contain"/>}
            {!isListening && current.group.passageText && <div className="mb-6 rounded-xl bg-slate-50 p-4 leading-7 text-slate-700">{current.group.passageText}</div>}
            <h2 className="text-2xl font-black text-slate-900">{current.question.text}</h2>
            <div className="mt-7 grid gap-3">{current.question.options.map((option, optionIndex) => <button key={optionIndex} type="button" onClick={() => setAnswers((old) => ({ ...(old ?? persistedAnswers), [current.question.id]: optionIndex }))} className={`min-h-14 rounded-xl border-2 p-4 text-left font-semibold ${currentAnswers[current.question.id] === optionIndex ? "border-amber-500 bg-amber-50" : "border-slate-200 hover:border-amber-300"}`}><span className="mr-2 font-black">{String.fromCharCode(65 + optionIndex)}.</span>{option}</button>)}</div>
            <button type="button" onClick={() => void next()} disabled={save.isPending || submit.isPending} className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl bg-amber-500 px-6 text-sm font-black text-white hover:bg-amber-600 disabled:opacity-60">{submit.isPending ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle2 size={16}/>} {index === questions.length - 1 ? "Nộp bài" : "Lưu và sang câu tiếp"}</button>
          </section>
          <aside className="rounded-2xl border border-slate-200 bg-white p-5"><p className="font-black text-slate-900">Bảng câu hỏi</p><div className="mt-4 grid grid-cols-5 gap-2">{questions.map(({ question }, questionIndex) => <button key={question.id} type="button" onClick={() => setIndex(questionIndex)} className={`min-h-10 rounded-lg border text-sm font-bold ${index === questionIndex ? "border-amber-500 bg-amber-500 text-white" : currentAnswers[question.id] !== undefined ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600"}`}>{questionIndex + 1}</button>)}</div></aside>
        </div>
      </div>
      <audio ref={audioRef} onEnded={() => undefined}/>
      {showExit && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"><AlertTriangle className="text-rose-600"/><h2 className="mt-3 text-xl font-black text-slate-900">Thoát và làm lại từ đầu?</h2><p className="mt-2 text-sm leading-6 text-slate-600">Lượt thi đang làm dở sẽ bị hủy và toàn bộ câu trả lời chưa nộp sẽ mất.</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setShowExit(false)} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-bold">Ở lại làm bài</button><button type="button" onClick={() => cancel.mutate()} disabled={cancel.isPending} className="min-h-11 rounded-xl bg-rose-600 px-4 text-sm font-bold text-white">{cancel.isPending ? "Đang hủy..." : "Hủy lượt thi"}</button></div></div></div>}
    </main>
  );
}
