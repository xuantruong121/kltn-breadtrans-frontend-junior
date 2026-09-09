"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, ImageOff, Loader2, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { toeicService } from "@/lib/api/services/toeic.service";

export default function ToeicExamPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId: rawExamId } = use(params);
  const examId = Number(rawExamId);
  const router = useRouter();
  const started = useRef(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [accent, setAccent] = useState<"US" | "UK">("US");
  const [rate, setRate] = useState(1);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);

  const { data: exam, isLoading, isError } = useQuery({
    queryKey: ["toeic-exam", examId],
    queryFn: () => toeicService.getExam(examId),
    enabled: Number.isInteger(examId),
  });

  const allQuestions = useMemo(
    () => (exam?.groups ?? []).flatMap((group) => group.questions.map((question) => ({ question, group }))),
    [exam],
  );
  const current = allQuestions[currentIndex];

  const saveMutation = useMutation({
    mutationFn: (payload: Record<number, number>) =>
      toeicService.saveAnswers(attemptId as number, payload),
  });
  const submitMutation = useMutation({
    mutationFn: () => toeicService.submitAttempt(attemptId as number),
    onSuccess: () => router.push(`/practice/toeic/results/${attemptId}`),
  });

  useEffect(() => {
    if (!exam || started.current) return;
    started.current = true;
    toeicService.startAttempt(exam.id).then((result) => setAttemptId(result.id));
  }, [exam]);

  useEffect(() => () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  const playAudio = async () => {
    if (!current || current.group.part === 1) return;
    setAudioLoading(true);
    try {
      const blob = await toeicService.getGroupAudio(current.group.id, accent, rate);
      const url = URL.createObjectURL(blob);
      setAudioUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return url;
      });
      window.setTimeout(() => void new Audio(url).play(), 0);
    } finally {
      setAudioLoading(false);
    }
  };

  const selectAnswer = (optionIndex: number) => {
    if (!current) return;
    setAnswers((previous) => ({ ...previous, [current.question.id]: optionIndex }));
  };

  const goNext = async () => {
    if (!attemptId) return;
    await saveMutation.mutateAsync(answers);
    if (currentIndex < allQuestions.length - 1) setCurrentIndex((value) => value + 1);
    else submitMutation.mutate();
  };

  if (isLoading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="animate-spin text-amber-600" /></div>;
  if (isError || !exam) return <div className="mx-auto max-w-2xl py-20 text-center text-slate-600">Không tải được đề TOEIC. Vui lòng thử lại.</div>;
  if (!current) return <div className="mx-auto max-w-2xl py-20 text-center text-slate-600">Đề thi chưa có dữ liệu câu hỏi.</div>;

  const isListening = current.group.part <= 4;
  const selected = answers[current.question.id];

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 pb-20 pt-6">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <button type="button" onClick={() => router.push("/practice/quizzes")} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:border-amber-400">
          <ArrowLeft size={17} /> Thoát bài thi
        </button>
        <div className="text-center"><h1 className="text-lg font-black text-slate-900">{exam.title}</h1><p className="text-xs text-slate-500">Câu {currentIndex + 1}/{allQuestions.length} · Part {current.group.part}</p></div>
        <div className="h-2 w-40 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-amber-500" style={{ width: `${((currentIndex + 1) / allQuestions.length) * 100}%` }} /></div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          {current.group.imageUrl ? <img src={current.group.imageUrl} alt={`Hình minh họa Part ${current.group.part}`} className="mx-auto mb-8 max-h-72 rounded-2xl border border-slate-200 object-contain" /> : current.group.part === 1 ? <div className="mb-8 flex items-center justify-center rounded-2xl border border-dashed border-slate-300 py-16 text-sm text-slate-500"><ImageOff size={18} className="mr-2" /> Chưa có hình minh họa</div> : null}
          {isListening && <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-sky-50 p-4"><span className="text-sm font-bold text-sky-900">Nội dung nghe · transcript được ẩn khi làm bài</span>{current.group.part > 1 && <button type="button" onClick={() => void playAudio()} disabled={audioLoading} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-sky-600 px-4 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-60">{audioLoading ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />} Phát audio</button>}</div>}
          {!isListening && current.group.passageText && <div className="mb-6 rounded-2xl bg-slate-50 p-5 text-sm leading-7 text-slate-700">{current.group.passageText}</div>}
          <h2 className="text-xl font-black text-slate-900">{current.question.text}</h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">{current.question.options.map((option, index) => <button key={`${current.question.id}-${index}`} type="button" onClick={() => selectAnswer(index)} className={`min-h-14 rounded-2xl border p-4 text-left text-sm font-semibold transition ${selected === index ? "border-amber-500 bg-amber-50 text-amber-900" : "border-slate-200 hover:border-amber-300"}`}><span className="mr-2 font-black">{String.fromCharCode(65 + index)}.</span>{option}</button>)}</div>
          <div className="mt-10 flex justify-end"><button type="button" onClick={goNext} disabled={!attemptId || submitMutation.isPending} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-amber-500 px-6 text-sm font-black text-white hover:bg-amber-600 disabled:opacity-60">{currentIndex === allQuestions.length - 1 ? <><CheckCircle2 size={17} /> Nộp bài</> : <>Câu tiếp theo <ArrowLeft size={17} className="rotate-180" /></>}</button></div>
        </article>
        <aside className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black text-slate-900">Thiết lập audio</h2><div className="flex gap-2">{(["US", "UK"] as const).map((value) => <button key={value} type="button" onClick={() => setAccent(value)} className={`min-h-11 flex-1 rounded-xl border text-sm font-bold ${accent === value ? "border-sky-500 bg-sky-50 text-sky-700" : "border-slate-200 text-slate-600"}`}>{value}</button>)}</div><div><p className="mb-2 text-xs font-bold text-slate-500">Tốc độ đọc</p><div className="grid grid-cols-3 gap-2">{[0.75, 1, 1.25].map((value) => <button key={value} type="button" onClick={() => setRate(value)} className={`min-h-10 rounded-lg border text-xs font-bold ${rate === value ? "border-sky-500 bg-sky-50 text-sky-700" : "border-slate-200 text-slate-600"}`}>{value}x</button>)}</div></div><div className="grid grid-cols-5 gap-2 pt-2">{allQuestions.slice(0, 100).map(({ question }, index) => <button key={question.id} type="button" onClick={() => setCurrentIndex(index)} className={`min-h-9 rounded-lg border text-xs font-bold ${index === currentIndex ? "border-amber-500 bg-amber-500 text-white" : answers[question.id] !== undefined ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600"}`}>{index + 1}</button>)}</div></aside>
      </section>
    </main>
  );
}
