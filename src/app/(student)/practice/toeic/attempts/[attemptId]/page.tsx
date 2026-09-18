"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Flag,
  ListOrdered,
  Loader2,
  Maximize2,
  Pause,
  Play,
  Settings,
  Volume2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toeicService, type ToeicQuestionGroup } from "@/lib/api/services/toeic.service";

type QuestionEntry = {
  question: NonNullable<ToeicQuestionGroup["questions"]>[number];
  group: ToeicQuestionGroup;
};

const LISTENING_SECONDS = 45 * 60;
const READING_SECONDS = 75 * 60;

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60).toString().padStart(2, "0");
  const remainder = (safe % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

export default function ToeicAttemptPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId: raw } = use(params);
  const attemptId = Number(raw);
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number> | null>(null);
  const [marked, setMarked] = useState<Set<number>>(new Set());
  const [showExit, setShowExit] = useState(false);
  const [showQuestionDrawer, setShowQuestionDrawer] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [audioFinished, setAudioFinished] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioPosition, setAudioPosition] = useState(0);
  const [audioVolume, setAudioVolume] = useState(1);
  const [audioRate, setAudioRate] = useState(1);
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioRequestRef = useRef(0);
  const playedAudioGroupsRef = useRef<Set<number>>(new Set());
  const loadedAudioGroupRef = useRef<number | null>(null);

  const { data: attempt, isLoading, isError } = useQuery({
    queryKey: ["toeic-attempt", attemptId],
    queryFn: () => toeicService.getAttempt(attemptId),
    enabled: Number.isInteger(attemptId),
  });
  const questions = useMemo<QuestionEntry[]>(
    () => (attempt?.exam.groups ?? []).flatMap((group) =>
      group.questions.map((question) => ({ question, group })),
    ),
    [attempt],
  );
  const current = questions[index];
  const persistedAnswers = useMemo(
    () => Object.fromEntries(
      (attempt?.answers ?? [])
        .filter((answer) => answer.selectedIndex !== null)
        .map((answer) => [answer.questionId, answer.selectedIndex as number]),
    ),
    [attempt],
  );
  const currentAnswers = answers ?? persistedAnswers;
  const answeredCount = Object.keys(currentAnswers).length;
  const fullTest = attempt?.mode === "FULL_TEST";
  const isListening = (current?.group.part ?? 5) <= 4;
  const currentGroupId = current?.group.id;
  const currentGroupEntries = useMemo(
    () => current ? questions.filter(({ group }) => group.id === current.group.id) : [],
    [current, questions],
  );
  const renderedEntries = fullTest ? currentGroupEntries : current ? [current] : [];
  const groups = useMemo(() => {
    const seen = new Set<number>();
    return questions
      .filter(({ group }) => {
        if (seen.has(group.id)) return false;
        seen.add(group.id);
        return true;
      })
      .map(({ group }) => group);
  }, [questions]);
  const groupsByPart = useMemo(() => {
    const result = new Map<number, ToeicQuestionGroup[]>();
    for (const group of groups) {
      const partGroups = result.get(group.part) ?? [];
      partGroups.push(group);
      result.set(group.part, partGroups);
    }
    return [...result.entries()].sort(([a], [b]) => a - b);
  }, [groups]);
  const save = useMutation({
    mutationFn: () => toeicService.saveAnswers(attemptId, currentAnswers),
  });
  const submit = useMutation({
    mutationFn: () => toeicService.submitAttempt(attemptId),
    onSuccess: () => { exitFullscreen(); router.push(`/practice/toeic/results/${attemptId}`); },
  });
  const cancel = useMutation({
    mutationFn: () => toeicService.cancelAttempt(attemptId),
    onSuccess: () => { exitFullscreen(); router.push("/practice/quizzes"); },
  });

  useEffect(() => () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  useEffect(() => () => {
    if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!fullTest || !attempt?.startedAt) return;
    const startedAt = Date.parse(attempt.startedAt);
    if (!Number.isFinite(startedAt)) return;
    const update = () => setElapsedSeconds(Math.max(0, (Date.now() - startedAt) / 1000));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [attempt?.startedAt, fullTest]);

  useEffect(() => {
    if (!attempt) return;
    const timer = window.setInterval(() => setCurrentTimeMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [attempt]);

  useEffect(() => {
    if (!attempt || attempt.status !== "IN_PROGRESS") return;
    const report = (eventType: Parameters<typeof toeicService.recordIntegrityEvent>[1]) => {
      void toeicService.recordIntegrityEvent(attempt.id, eventType, current?.question.id).catch(() => undefined);
    };
    const onFullscreenChange = () => { if (!document.fullscreenElement) report("FULLSCREEN_EXIT"); };
    const onVisibilityChange = () => { if (document.visibilityState === "hidden") report("TAB_HIDDEN"); };
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

  const loadAudio = async (group: ToeicQuestionGroup, autoPlay: boolean) => {
    const requestId = ++audioRequestRef.current;
    setAudioLoading(true);
    setAudioBlocked(false);
    setAudioError(false);
    try {
      const blob = await toeicService.getGroupAudio(group.id, attemptId);
      if (requestId !== audioRequestRef.current) return;
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      loadedAudioGroupRef.current = group.id;
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.volume = audioVolume;
        audioRef.current.playbackRate = audioRate;
        setAudioPosition(0);
        setAudioDuration(0);
        if (autoPlay) {
          try {
            await audioRef.current.play();
          } catch {
            if (requestId === audioRequestRef.current) setAudioBlocked(true);
          }
        }
      }
    } catch {
      if (requestId === audioRequestRef.current) setAudioError(true);
    } finally {
      if (requestId === audioRequestRef.current) setAudioLoading(false);
    }
  };

  useEffect(() => {
    if (!attempt || !current?.group || !fullTest || !isListening) return;
    if (playedAudioGroupsRef.current.has(current.group.id) && loadedAudioGroupRef.current === current.group.id) return;
    setAudioFinished(false);
    const audioElement = audioRef.current;
    setAudioPosition(0);
    setAudioDuration(0);
    setAudioPlaying(false);
    if (audioElement) audioElement.src = "";
    window.setTimeout(() => { void loadAudio(current.group, true); }, 0);
    playedAudioGroupsRef.current.add(current.group.id);
    return () => { audioRequestRef.current += 1; audioElement?.pause(); };
    // Loading is intentionally tied to the audio group, not each question.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt?.id, currentGroupId, fullTest, isListening]);

  const playPracticeAudio = () => {
    if (current && isListening) void loadAudio(current.group, true);
  };
  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      void audioRef.current.play().then(() => setAudioBlocked(false)).catch(() => setAudioBlocked(true));
    } else audioRef.current.pause();
  };
  const changeAudioPosition = (value: number) => {
    if (!audioRef.current || !Number.isFinite(value)) return;
    audioRef.current.currentTime = value;
    setAudioPosition(value);
  };
  const changeAudioVolume = (value: number) => {
    setAudioVolume(value);
    if (audioRef.current) audioRef.current.volume = value;
  };
  const changeAudioRate = (value: number) => {
    if (fullTest) return;
    setAudioRate(value);
    if (audioRef.current) audioRef.current.playbackRate = value;
  };
  const retryBlockedAudio = () => {
    if (audioRef.current) void audioRef.current.play().then(() => setAudioBlocked(false)).catch(() => setAudioBlocked(true));
  };

  const nextIndex = () => {
    if (!current) return -1;
    if (!fullTest) return index + 1;
    const groupPosition = groups.findIndex((group) => group.id === current.group.id);
    const nextGroup = groups[groupPosition + 1];
    return nextGroup ? questions.findIndex(({ group }) => group.id === nextGroup.id) : -1;
  };
  const previousIndex = () => {
    if (!current || fullTest) return Math.max(0, index - 1);
    return index - 1;
  };
  const next = async (fromAudio = false) => {
    if (fullTest && isListening && !audioFinished && !audioError && !fromAudio) return;
    await save.mutateAsync();
    const target = nextIndex();
    if (target < 0) submit.mutate();
    else setIndex(target);
  };
  const enterFullscreen = () => document.documentElement.requestFullscreen?.().catch(() => undefined);
  const exitFullscreen = () => {
    if (document.fullscreenElement && document.exitFullscreen) void document.exitFullscreen().catch(() => undefined);
  };
  const toggleMarked = (questionId: number) => setMarked((old) => {
    const nextMarked = new Set(old);
    if (nextMarked.has(questionId)) nextMarked.delete(questionId);
    else nextMarked.add(questionId);
    return nextMarked;
  });
  const navigateToQuestion = (target: QuestionEntry) => {
    if (fullTest && isListening && target.group.part > 4) return;
    if (fullTest && !isListening && target.group.part <= 4) return;
    const targetIndex = questions.findIndex(({ question }) => question.id === target.question.id);
    if (targetIndex >= 0) setIndex(targetIndex);
  };

  const navigateToPart = (part: number) => {
    const first = groupsByPart.find(([candidate]) => candidate === part)?.[1][0];
    if (first) {
      const target = questions.find((entry) => entry.group.id === first.id);
      if (target) navigateToQuestion(target);
    }
  };

  if (isLoading) return <div className="flex min-h-[70vh] items-center justify-center"><Loader2 className="animate-spin text-amber-600" /></div>;
  if (isError || !attempt || !current) return <div className="mx-auto max-w-xl py-24 text-center text-slate-600">Không tải được lượt thi.</div>;

  const partLabel = `Part ${current.group.part}`;
  const firstQuestionNumber = renderedEntries[0]?.question.questionNumber ?? index + 1;
  const lastQuestionNumber = renderedEntries.at(-1)?.question.questionNumber ?? index + 1;
  const readingPhase = !isListening;
  const sectionRemaining = fullTest
    ? (readingPhase
      ? Math.max(0, READING_SECONDS - Math.max(0, elapsedSeconds - LISTENING_SECONDS))
      : Math.max(0, LISTENING_SECONDS - elapsedSeconds))
    : attempt.deadline
      ? currentTimeMs > 0
        ? Math.max(0, (Date.parse(attempt.deadline) - currentTimeMs) / 1000)
        : attempt.durationSeconds
      : attempt.durationSeconds;

  return (
    <main className="min-h-dvh bg-slate-50 px-3 py-4 sm:px-4 sm:py-5">
      <div className="mx-auto max-w-7xl space-y-4 sm:space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-900 p-3 text-white sm:p-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-300">{fullTest ? "TOEIC Listening & Reading · Đề thi đầy đủ" : "Chế độ luyện tập"}</p>
            <h1 className="truncate text-sm font-black sm:text-base">{attempt.exam.title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {fullTest && <div className="flex items-center gap-1 sm:gap-1.5 rounded-xl border border-slate-700 bg-slate-800/90 px-2 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold text-white"><Clock3 size={14} className="text-amber-400" /> <span className="hidden sm:inline">{readingPhase ? "Reading" : "Listening"} </span>{formatTime(sectionRemaining)}</div>}
            <button type="button" onClick={() => setShowQuestionDrawer(true)} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-600 bg-slate-800 px-3 text-xs font-bold text-white hover:bg-slate-700 lg:hidden" aria-label="Mở bảng câu hỏi"><ListOrdered size={15} /> Câu hỏi ({answeredCount}/{questions.length})</button>
            <button type="button" onClick={enterFullscreen} className="hidden min-h-11 items-center gap-2 rounded-xl border border-slate-600 px-3 text-sm font-bold hover:bg-slate-800 sm:inline-flex"><Maximize2 size={16} /> Toàn màn hình</button>
            <button type="button" onClick={() => setShowExit(true)} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-rose-600 px-3 text-xs font-bold hover:bg-rose-700 sm:gap-2"><X size={16} /> Thoát</button>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-amber-600">{partLabel} · Câu {firstQuestionNumber}{firstQuestionNumber !== lastQuestionNumber ? `–${lastQuestionNumber}` : ""}/{questions.length}</p>
                <p className="mt-1 text-sm text-slate-500">{fullTest ? (isListening ? "Audio chạy theo luồng thi · có thể tạm dừng hoặc tua trên thanh audio" : "Đọc đoạn văn và trả lời theo thời gian còn lại") : "Chế độ luyện tập · có thể nghe lại audio"}</p>
              </div>
              <button type="button" onClick={() => toggleMarked(current.question.id)} className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-bold ${marked.has(current.question.id) ? "border-amber-300 bg-amber-50 text-amber-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}><Flag size={16} /> {marked.has(current.question.id) ? "Đã đánh dấu" : "Đánh dấu"}</button>
            </div>

            <nav aria-label="Điều hướng Part TOEIC" className="mb-5 flex flex-wrap gap-2">
              {groupsByPart.map(([part]) => {
                const active = current.group.part === part;
                const disabled = fullTest && ((isListening && part > 4) || (!isListening && part <= 4));
                return <button key={part} type="button" disabled={disabled} onClick={() => navigateToPart(part)} className={`min-h-11 rounded-xl border px-4 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${active ? "border-amber-500 bg-amber-500 text-white" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-amber-300 hover:bg-amber-50"}`}>Part {part}</button>;
              })}
            </nav>

            {isListening && (
              <div className="mb-5 rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-3 text-sm text-sky-900">
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={audioUrl ? toggleAudio : playPracticeAudio} disabled={audioLoading} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-sky-600 px-3 text-white hover:bg-sky-700 disabled:opacity-60" aria-label={audioPlaying ? "Tạm dừng audio" : "Phát audio"}>
                    {audioLoading ? <Loader2 size={17} className="animate-spin" /> : audioPlaying ? <Pause size={17} /> : <Play size={17} />}
                  </button>
                  <span className="min-w-20 text-xs font-semibold tabular-nums">{formatTime(audioPosition)}</span>
                  <input aria-label="Tua audio" type="range" min={0} max={audioDuration || 0} step={0.1} value={Math.min(audioPosition, audioDuration || 0)} onChange={(event) => changeAudioPosition(Number(event.target.value))} disabled={!audioUrl || !audioDuration} className="min-w-[140px] flex-1 accent-sky-600" />
                  <span className="text-xs font-semibold tabular-nums">{formatTime(audioDuration)}</span>
                  <Volume2 size={16} aria-hidden="true" />
                  <input aria-label="Âm lượng audio" type="range" min={0} max={1} step={0.05} value={audioVolume} onChange={(event) => changeAudioVolume(Number(event.target.value))} className="w-20 accent-sky-600" />
                  <button type="button" onClick={() => setShowAudioSettings((value) => !value)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-sky-200 bg-white text-sky-800 hover:bg-sky-100" aria-expanded={showAudioSettings} aria-label="Cài đặt audio"><Settings size={17} /></button>
                </div>
                {showAudioSettings && <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-sky-100 pt-3 text-xs font-semibold"><span>Tốc độ đọc:</span>{[0.75, 1, 1.25, 1.5].map((rate) => <button type="button" key={rate} onClick={() => changeAudioRate(rate)} disabled={fullTest && rate !== 1} className={`min-h-10 rounded-lg border px-3 ${audioRate === rate ? "border-sky-600 bg-sky-600 text-white" : "border-sky-200 bg-white text-sky-800"} disabled:cursor-not-allowed disabled:opacity-50`}>{rate.toFixed(2).replace(".00", "")}x{fullTest && rate !== 1 ? " · thi thật" : ""}</button>)}</div>}
                <div className="mt-2 flex items-center justify-between gap-2 text-xs text-sky-800"><span className="inline-flex items-center gap-2 font-semibold"><Volume2 size={15} /> {fullTest ? (audioError ? "Không tải được audio" : "Audio theo nhóm câu · có thể tạm dừng và tua") : "Đoạn ghi âm"}</span>{audioBlocked && <button type="button" onClick={retryBlockedAudio} className="min-h-10 rounded-lg border border-sky-200 bg-white px-3 font-bold text-sky-700">Bấm để bắt đầu audio</button>}{audioError && <button type="button" onClick={() => { playedAudioGroupsRef.current.delete(current.group.id); void loadAudio(current.group, true); }} className="min-h-10 rounded-lg border border-rose-200 bg-white px-3 font-bold text-rose-700">Thử tải lại audio</button>}</div>
              </div>
            )}

            <div className={!isListening && fullTest ? "grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)]" : undefined}>
              <div>
                {current.group.imageUrl && <img src={current.group.imageUrl} alt={`Hình minh họa Part ${current.group.part}`} className="mx-auto mb-6 max-h-96 rounded-xl object-contain" />}
                {!isListening && current.group.passageText && <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-5 text-base leading-8 text-slate-800 sm:text-lg">{current.group.passageText}</div>}
              </div>
            <div className="space-y-6">
              {renderedEntries.map(({ question }) => {
                const audioOnly = fullTest && current.group.part <= 2;
                return (
                  <article key={question.id} className="rounded-2xl border border-slate-100 bg-white">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><h2 className="text-base font-black text-slate-900 sm:text-lg">Câu {question.questionNumber}{audioOnly ? " · Chọn đáp án" : question.text ? ` · ${question.text}` : ""}</h2>{marked.has(question.id) && <Flag size={16} className="text-amber-600" aria-label="Đã đánh dấu xem lại" />}</div>
                    <div className="grid gap-2.5 p-4 sm:grid-cols-2 sm:gap-3">
                      {question.options.map((option, optionIndex) => <button key={optionIndex} type="button" onClick={() => setAnswers((old) => ({ ...(old ?? persistedAnswers), [question.id]: optionIndex }))} className={`min-h-14 rounded-xl border-2 p-3.5 text-left text-sm font-semibold transition-colors sm:p-4 sm:text-base ${currentAnswers[question.id] === optionIndex ? "border-amber-500 bg-amber-50 text-amber-950" : "border-slate-200 text-slate-700 hover:border-amber-300"}`}><span className="mr-2 font-black">{String.fromCharCode(65 + optionIndex)}.</span>{audioOnly ? <span className="sr-only">Lựa chọn {String.fromCharCode(65 + optionIndex)}</span> : option}</button>)}
                    </div>
                  </article>
                );
              })}
            </div>
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
              <button type="button" onClick={() => setIndex(Math.max(0, previousIndex()))} disabled={fullTest || index === 0} className="inline-flex min-h-12 items-center gap-1.5 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40">Câu trước</button>
              <button type="button" onClick={() => void next()} disabled={save.isPending || submit.isPending || (fullTest && isListening && !audioFinished && !audioError)} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-amber-500 px-5 text-sm font-black text-white shadow-xs hover:bg-amber-600 disabled:opacity-60">{submit.isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}{nextIndex() < 0 ? "Nộp bài" : fullTest ? "Sang nhóm tiếp theo" : "Lưu và sang câu tiếp"}</button>
            </div>
          </section>

          <aside className="hidden rounded-2xl border border-slate-200 bg-white p-5 lg:block">
            <div className="mb-4 flex items-center justify-between"><div><p className="font-black text-slate-900">Bảng câu hỏi</p><p className="mt-1 text-xs text-slate-500">Đã trả lời {answeredCount}/{questions.length}</p></div><span className="text-xs font-bold text-slate-500">{fullTest ? (isListening ? "Listening" : "Reading") : "Luyện tập"}</span></div>
            <div className="mb-4 grid grid-cols-2 gap-2 text-[11px] text-slate-500"><span>● Hiện tại</span><span>● Đã trả lời</span><span>○ Chưa trả lời</span><span>⚑ Đánh dấu xem lại</span></div>
            <div className="max-h-[calc(100dvh-300px)] space-y-4 overflow-y-auto pr-1">
              {groupsByPart.map(([part, partGroups]) => <section key={part}><p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">Part {part}</p><div className="grid grid-cols-5 gap-2">{partGroups.flatMap((group) => group.questions).map((question) => { const target = questions.find((entry) => entry.question.id === question.id); if (!target) return null; const active = current.question.id === question.id; const disabled = fullTest && ((isListening && part > 4) || (!isListening && part <= 4)); return <button key={question.id} type="button" disabled={disabled} onClick={() => navigateToQuestion(target)} className={`relative min-h-10 rounded-lg border text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${active ? "border-amber-500 bg-amber-500 text-white" : currentAnswers[question.id] !== undefined ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{question.questionNumber}{marked.has(question.id) && <Flag size={11} className="absolute -right-1 -top-1 fill-amber-500 text-amber-600" />}</button>; })}</div></section>)}
            </div>
          </aside>
        </div>
      </div>

      {showQuestionDrawer && <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/60 lg:hidden"><button type="button" className="flex-1" onClick={() => setShowQuestionDrawer(false)} aria-label="Đóng bảng câu hỏi" /><div role="dialog" aria-modal="true" aria-label="Bảng câu hỏi" className="max-h-[80dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"><div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3"><div><p className="font-black text-slate-900">Bảng câu hỏi</p><p className="text-xs text-slate-500">Đã trả lời {answeredCount}/{questions.length} câu</p></div><button type="button" onClick={() => setShowQuestionDrawer(false)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100" aria-label="Đóng"><X size={20} /></button></div>{groupsByPart.map(([part, partGroups]) => <section key={part} className="mb-4"><p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">Part {part}</p><div className="grid grid-cols-5 gap-2">{partGroups.flatMap((group) => group.questions).map((question) => { const target = questions.find((entry) => entry.question.id === question.id); if (!target) return null; const disabled = fullTest && ((isListening && part > 4) || (!isListening && part <= 4)); return <button key={question.id} type="button" disabled={disabled} onClick={() => { navigateToQuestion(target); setShowQuestionDrawer(false); }} className={`min-h-11 rounded-xl border text-sm font-bold disabled:opacity-35 ${current.question.id === question.id ? "border-amber-500 bg-amber-500 text-white" : currentAnswers[question.id] !== undefined ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600"}`}>{question.questionNumber}</button>; })}</div></section>)}</div></div>}

      <audio ref={audioRef} preload="auto" onLoadedMetadata={(event) => setAudioDuration(event.currentTarget.duration)} onTimeUpdate={(event) => setAudioPosition(event.currentTarget.currentTime)} onPlay={() => setAudioPlaying(true)} onPause={() => setAudioPlaying(false)} onEnded={() => { setAudioPlaying(false); setAudioFinished(true); if (fullTest && isListening) void next(true); }} className="sr-only" />

      {showExit && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"><AlertTriangle className="text-rose-600" /><h2 className="mt-3 text-xl font-black text-slate-900">Thoát và làm lại từ đầu?</h2><p className="mt-2 text-sm leading-6 text-slate-600">Lượt thi đang làm dở sẽ bị hủy và toàn bộ câu trả lời chưa nộp sẽ mất.</p><div className="mt-6 flex flex-col-reverse justify-end gap-2.5 sm:flex-row"><button type="button" onClick={() => setShowExit(false)} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-bold hover:bg-slate-50">Ở lại làm bài</button><button type="button" onClick={() => cancel.mutate()} disabled={cancel.isPending} className="min-h-11 rounded-xl bg-rose-600 px-4 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-60">{cancel.isPending ? "Đang hủy..." : "Hủy lượt thi"}</button></div></div></div>}
    </main>
  );
}
