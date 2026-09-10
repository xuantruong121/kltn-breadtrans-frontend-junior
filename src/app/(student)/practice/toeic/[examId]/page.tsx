"use client";

import { use, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  ImageOff,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Volume2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toeicService } from "@/lib/api/services/toeic.service";
import {
  isCurrentAudioRequest,
  nextAudioRequestGeneration,
} from "@/lib/audio/requestGeneration";
import { useAuthStore } from "@/stores/authStore";
import { AuthGateModal } from "@/components/auth/AuthGateModal";
import { PracticeLoadingScreen } from "@/components/practice/PracticeLoadingScreen";
import { PracticeExitConfirmDialog } from "@/components/practice/PracticeExitConfirmDialog";
import { usePracticeExitGuard } from "@/hooks/usePracticeExitGuard";

function useHydration() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

const ALLOWED_TOEIC_RATES = [0.5, 0.75, 1, 1.25, 1.5] as const;

function formatTime(seconds: number): string {
  if (Number.isNaN(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export default function ToeicExamPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId: rawExamId } = use(params);
  const examId = Number(rawExamId);
  const router = useRouter();
  const { user } = useAuthStore();

  const hasMounted = useHydration();
  const [authGateDismissed, setAuthGateDismissed] = useState(false);
  const showAuthGate = hasMounted && !user && !authGateDismissed;

  const started = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const audioControllerRef = useRef<AbortController | null>(null);
  const activeGroupIdRef = useRef<number | null>(null);
  const audioRequestGenerationRef = useRef(0);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [accent, setAccent] = useState<"US" | "UK">("US");
  const [rate, setRate] = useState<number>(1);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const { data: exam, isLoading, isError } = useQuery({
    queryKey: ["toeic-exam", examId],
    queryFn: () => toeicService.getExam(examId),
    enabled: hasMounted && !!user && Number.isInteger(examId),
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

  const [minLaunchReady, setMinLaunchReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMinLaunchReady(true), 350);
    return () => clearTimeout(timer);
  }, []);

  const shouldConfirmExit = !submitMutation.isSuccess;
  const { confirmExit, exitDialogProps } = usePracticeExitGuard({
    shouldConfirmExit,
    defaultFallbackUrl: "/practice/quizzes",
    enabled: hasMounted && !!user,
  });

  // Start attempt only if authenticated user
  useEffect(() => {
    if (!exam || started.current || !user) return;
    started.current = true;
    toeicService.startAttempt(exam.id).then((result) => setAttemptId(result.id));
  }, [exam, user]);

  // Clean up audio Object URL on group change or unmount
  useEffect(() => {
    const currentAudio = audioRef.current;
    activeGroupIdRef.current = current?.group.id ?? null;

    return () => {
      audioRequestGenerationRef.current = nextAudioRequestGeneration(
        audioRequestGenerationRef.current,
      );
      audioControllerRef.current?.abort();
      audioControllerRef.current = null;
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = "";
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    };
  }, [current?.group.id]);

  // Play / Pause audio using visible audio element
  const toggleAudio = async () => {
    if (!current) return;

    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      return;
    }

    if (audioUrlRef.current && audioRef.current && activeGroupIdRef.current === current.group.id) {
      audioRef.current.play().catch(() => setIsPlaying(false));
      return;
    }

    audioControllerRef.current?.abort();
    const controller = new AbortController();
    audioControllerRef.current = controller;

    const requestedGroupId = current.group.id;
    const requestGeneration = nextAudioRequestGeneration(
      audioRequestGenerationRef.current,
    );
    audioRequestGenerationRef.current = requestGeneration;
    setAudioLoading(true);
    setAudioError(false);

    try {
      const blob = await toeicService.getGroupAudio(
        requestedGroupId,
        accent,
        rate,
        controller.signal,
      );

      if (
        !isCurrentAudioRequest(
          audioRequestGenerationRef.current,
          requestGeneration,
          activeGroupIdRef.current,
          requestedGroupId,
        )
      ) {
        return;
      }

      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
      const url = URL.createObjectURL(blob);
      audioUrlRef.current = url;

      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.playbackRate = rate;
        audioRef.current.play().catch(() => setIsPlaying(false));
      }
    } catch (err: any) {
      if (
        err?.name === "AbortError" ||
        err?.name === "CanceledError" ||
        err?.code === "ERR_CANCELED"
      ) {
        return;
      }
      if (
        isCurrentAudioRequest(
          audioRequestGenerationRef.current,
          requestGeneration,
          activeGroupIdRef.current,
          requestedGroupId,
        )
      ) {
        setAudioError(true);
      }
    } finally {
      if (
        isCurrentAudioRequest(
          audioRequestGenerationRef.current,
          requestGeneration,
          activeGroupIdRef.current,
          requestedGroupId,
        )
      ) {
        setAudioLoading(false);
      }
    }
  };

  // Rewind 5 seconds
  const rewind5s = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5);
  };

  // Change playback speed
  const handleRateChange = (newRate: number) => {
    const validRate = ALLOWED_TOEIC_RATES.includes(newRate as any) ? newRate : 1;
    setRate(validRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = validRate;
    }
  };

  // Change accent and reload audio if needed
  const handleAccentChange = async (newAccent: "US" | "UK") => {
    setAccent(newAccent);
    if (!current || current.group.part > 4) return;

    audioControllerRef.current?.abort();
    const controller = new AbortController();
    audioControllerRef.current = controller;

    const requestedGroupId = current.group.id;
    const requestGeneration = nextAudioRequestGeneration(
      audioRequestGenerationRef.current,
    );
    audioRequestGenerationRef.current = requestGeneration;
    setAudioLoading(true);
    setAudioError(false);

    try {
      const blob = await toeicService.getGroupAudio(
        requestedGroupId,
        newAccent,
        rate,
        controller.signal,
      );

      if (
        !isCurrentAudioRequest(
          audioRequestGenerationRef.current,
          requestGeneration,
          activeGroupIdRef.current,
          requestedGroupId,
        )
      ) {
        return;
      }

      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
      const url = URL.createObjectURL(blob);
      audioUrlRef.current = url;

      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.playbackRate = rate;
        if (isPlaying) {
          audioRef.current.play().catch(() => setIsPlaying(false));
        }
      }
    } catch (err: any) {
      if (
        err?.name === "AbortError" ||
        err?.name === "CanceledError" ||
        err?.code === "ERR_CANCELED"
      ) {
        return;
      }
      if (
        isCurrentAudioRequest(
          audioRequestGenerationRef.current,
          requestGeneration,
          activeGroupIdRef.current,
          requestedGroupId,
        )
      ) {
        setAudioError(true);
      }
    } finally {
      if (
        isCurrentAudioRequest(
          audioRequestGenerationRef.current,
          requestGeneration,
          activeGroupIdRef.current,
          requestedGroupId,
        )
      ) {
        setAudioLoading(false);
      }
    }
  };

  const selectAnswer = (optionIndex: number) => {
    if (!current) return;
    setAnswers((previous) => ({ ...previous, [current.question.id]: optionIndex }));
  };

  const goToQuestion = (index: number) => {
    if (index === currentIndex) return;
    audioRequestGenerationRef.current = nextAudioRequestGeneration(
      audioRequestGenerationRef.current,
    );
    audioControllerRef.current?.abort();
    audioControllerRef.current = null;
    setAudioLoading(false);
    setAudioError(false);
    setCurrentIndex(index);
  };

  const goNext = async () => {
    if (!attemptId) return;
    await saveMutation.mutateAsync(answers);
    if (currentIndex < allQuestions.length - 1) {
      goToQuestion(currentIndex + 1);
    } else {
      submitMutation.mutate();
    }
  };

  if (hasMounted && !user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <Loader2 className="mb-4 animate-spin text-amber-600" size={36} />
        <p className="text-sm font-bold text-slate-600">Đang chuẩn bị đề thi TOEIC...</p>
        <AuthGateModal
          isOpen={showAuthGate}
          onClose={() => {
            setAuthGateDismissed(true);
            router.push("/practice/quizzes");
          }}
          targetLabel="đề thi TOEIC này"
          targetRoute={`/practice/toeic/${examId}`}
          onOpenLogin={() => router.push("/login")}
          onOpenRegister={() => router.push("/register")}
        />
      </div>
    );
  }

  if (isLoading || !hasMounted || !minLaunchReady || (!current && allQuestions.length > 0)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center py-12">
        <PracticeLoadingScreen skill="listening" className="max-w-4xl" />
      </div>
    );
  }

  if (isError || !exam) {
    return (
      <div className="mx-auto max-w-2xl py-20 text-center text-slate-600">
        Không tải được đề TOEIC. Vui lòng thử lại.
      </div>
    );
  }

  if (!current) {
    return (
      <div className="mx-auto max-w-2xl py-20 text-center text-slate-600">
        Đề thi chưa có câu hỏi để bắt đầu.
      </div>
    );
  }

  const isListening = current.group.part <= 4;
  const selected = answers[current.question.id];

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 pb-20 pt-6">
      {/* Hidden audio element with event bindings */}
      <audio
        ref={audioRef}
        onTimeUpdate={() => {
          if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) setDuration(audioRef.current.duration || 0);
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onEmptied={() => {
          setIsPlaying(false);
          setCurrentTime(0);
          setDuration(0);
        }}
      />

      <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <button
          type="button"
          onClick={() => confirmExit("/practice/quizzes")}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:border-amber-400 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          <ArrowLeft size={17} aria-hidden="true" /> Thoát bài thi
        </button>
        <div className="text-center">
          <h1 className="text-lg font-black text-slate-900">{exam.title}</h1>
          <p className="text-xs text-slate-500">
            Câu {currentIndex + 1}/{allQuestions.length} · Part {current.group.part}
          </p>
        </div>
        <div className="h-2 w-40 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full bg-amber-500 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / allQuestions.length) * 100}%` }}
          />
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          {/* Part 1 Picture (show when imageUrl exists) */}
          {current.group.imageUrl ? (
            <img
              src={current.group.imageUrl}
              alt={`Hình minh họa Part ${current.group.part}`}
              className="mx-auto mb-8 max-h-72 rounded-2xl border border-slate-200 object-contain"
            />
          ) : current.group.part === 1 ? (
            <div className="mb-8 flex items-center justify-center rounded-2xl border border-dashed border-slate-300 py-16 text-sm text-slate-500">
              <ImageOff size={18} className="mr-2" aria-hidden="true" />
              Chưa có hình minh họa
            </div>
          ) : null}

          {/* Listening Section Audio Controls with Visible Player (Part 1 - 4) */}
          {isListening && (
            <div className="mb-6 rounded-2xl border border-sky-200 bg-sky-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-sky-100 text-sky-800">
                    <Volume2 size={16} aria-hidden="true" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-sky-900">
                      Đoạn ghi âm Part {current.group.part}
                    </span>
                    <p className="text-[11px] text-sky-700">Transcript được ẩn trong khi làm bài</p>
                  </div>
                </div>

                {/* Visible Audio Controls */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleAudio}
                    disabled={audioLoading}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-sky-600 px-4 text-xs font-bold text-white shadow-xs transition hover:bg-sky-700 disabled:opacity-60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-sky-500"
                  >
                    {audioLoading ? (
                      <Loader2 className="animate-spin" size={15} aria-hidden="true" />
                    ) : isPlaying ? (
                      <Pause size={15} fill="currentColor" aria-hidden="true" />
                    ) : (
                      <Play size={15} fill="currentColor" aria-hidden="true" />
                    )}
                    <span>{isPlaying ? "Tạm dừng" : "Phát audio"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={rewind5s}
                    disabled={audioLoading}
                    title="Lùi 5 giây"
                    className="inline-flex size-11 items-center justify-center rounded-xl border border-sky-200 bg-white text-sky-700 transition hover:bg-sky-100 disabled:opacity-50"
                  >
                    <RotateCcw size={15} aria-hidden="true" />
                    <span className="sr-only">Lùi 5 giây</span>
                  </button>
                </div>
              </div>

              {/* Audio error banner with retry button */}
              {audioError && (
                <div className="mt-3 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  <span>Không thể tải đoạn audio cho phần thi này.</span>
                  <button
                    type="button"
                    onClick={() => void toggleAudio()}
                    className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1 text-xs font-bold text-white transition hover:bg-rose-700"
                  >
                    <RotateCcw size={12} aria-hidden="true" />
                    Thử lại
                  </button>
                </div>
              )}

              {/* Progress and duration bar if audio has duration */}
              {duration > 0 && (
                <div className="mt-3 flex items-center gap-3 pt-2">
                  <span className="w-10 text-right text-[11px] font-bold text-sky-800">
                    {formatTime(currentTime)}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sky-200">
                    <div
                      className="h-full bg-sky-600 transition-all"
                      style={{ width: `${(currentTime / duration) * 100}%` }}
                    />
                  </div>
                  <span className="w-10 text-[11px] font-bold text-sky-800">
                    {formatTime(duration)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Reading Section Passage (Parts 5-7, hidden for Listening) */}
          {!isListening && current.group.passageText && (
            <div className="mb-6 rounded-2xl bg-slate-50 p-5 text-sm leading-7 text-slate-700">
              {current.group.passageText}
            </div>
          )}

          <h2 className="text-xl font-black text-slate-900">{current.question.text}</h2>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {current.question.options.map((option, index) => (
              <button
                key={`${current.question.id}-${index}`}
                type="button"
                onClick={() => selectAnswer(index)}
                className={`min-h-14 rounded-2xl border p-4 text-left text-sm font-semibold transition ${
                  selected === index
                    ? "border-amber-500 bg-amber-50 text-amber-900 ring-1 ring-amber-400"
                    : "border-slate-200 hover:border-amber-300"
                }`}
              >
                <span className="mr-2 font-black">{String.fromCharCode(65 + index)}.</span>
                {option}
              </button>
            ))}
          </div>

          <div className="mt-10 flex justify-end">
            <button
              type="button"
              onClick={goNext}
              disabled={!attemptId || submitMutation.isPending}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-amber-500 px-6 text-sm font-black text-white shadow-xs hover:bg-amber-600 disabled:opacity-60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              {currentIndex === allQuestions.length - 1 ? (
                <>
                  <CheckCircle2 size={17} aria-hidden="true" /> Nộp bài
                </>
              ) : (
                <>
                  Câu tiếp theo <ArrowLeft size={17} className="rotate-180" aria-hidden="true" />
                </>
              )}
            </button>
          </div>
        </article>

        {/* Sidebar Controls */}
        <aside className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-black text-slate-900">Thiết lập audio</h2>

          {/* Accent selector */}
          <div className="flex gap-2">
            {(["US", "UK"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => void handleAccentChange(value)}
                className={`min-h-11 flex-1 rounded-xl border text-sm font-bold transition ${
                  accent === value
                    ? "border-sky-500 bg-sky-50 text-sky-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {value}
              </button>
            ))}
          </div>

          {/* Speed selector */}
          <div>
            <p className="mb-2 text-xs font-bold text-slate-500">Tốc độ đọc</p>
            <div className="grid grid-cols-4 gap-1.5">
              {[0.75, 1, 1.25, 1.5].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleRateChange(val)}
                  className={`min-h-10 rounded-lg border text-xs font-bold transition ${
                    rate === val
                      ? "border-sky-500 bg-sky-50 text-sky-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {val}x
                </button>
              ))}
            </div>
          </div>

          {/* Question Grid */}
          <div className="grid grid-cols-5 gap-2 pt-2">
            {allQuestions.slice(0, 100).map(({ question }, index) => (
              <button
                key={question.id}
                type="button"
                onClick={() => goToQuestion(index)}
                className={`min-h-9 rounded-lg border text-xs font-bold transition ${
                  index === currentIndex
                    ? "border-amber-500 bg-amber-500 text-white"
                    : answers[question.id] !== undefined
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </aside>
      </section>

      {/* Shared Exit Confirmation Modal */}
      <PracticeExitConfirmDialog {...exitDialogProps} />
    </main>
  );
}
