"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { use, useState, useEffect, useMemo, useSyncExternalStore, type MouseEvent } from "react";
import { motion } from "framer-motion";
import { BookOpen, CheckCircle2, ChevronRight, Cookie, Lightbulb, Loader2, Play, Square } from "lucide-react";
import { quizService, AnswerDto } from "@/lib/api/services/quiz.service";
import { BackButton } from "@/components/ui";
import { useAuthStore } from "@/stores/authStore";
import { AuthGateModal } from "@/components/auth/AuthGateModal";
import { ListeningComprehensionWorkspace } from "../../listening/components/ListeningComprehensionWorkspace";
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

export default function TakeQuizPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const quizId = parseInt(params.id);

  const hasMounted = useHydration();
  const { user } = useAuthStore();
  const [authModalDismissed, setAuthModalDismissed] = useState(false);
  const showAuthModal = hasMounted && !user && !authModalDismissed;

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [dictationResults, setDictationResults] = useState<Record<number, { isChecked: boolean, isCorrect: boolean, diff: any[] }>>({});
  const [failedImageKeys, setFailedImageKeys] = useState<Set<string>>(new Set());

  const { data: quiz, isLoading } = useQuery({
    queryKey: ["quiz", quizId],
    queryFn: () => quizService.getQuizById(quizId),
    enabled: hasMounted && !!user && !Number.isNaN(quizId),
  });

  const submitMutation = useMutation({
    mutationFn: (payload: AnswerDto[]) => quizService.submitQuiz(quizId, payload),
    onSuccess: (data) => {
      // Invalidate gamification and profile cache to update Daily Quests instantly
      queryClient.invalidateQueries({ queryKey: ["myQuests"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["daily-quests"] });
      queryClient.invalidateQueries({ queryKey: ["user-stats", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["listeningPractices"] });
      queryClient.invalidateQueries({ queryKey: ["listening-practices"] });
      
      // Redirect to analytics page
      router.push(`/practice/quizzes/submissions/${data.id}`);
    }
  });

  const isReading = quiz?.type === 'BILINGUAL_READING';
  const isListening = quiz?.type === 'LISTENING_PRACTICE';
  const reviewQuestionIds = useMemo(() => {
    if (searchParams.get("review") !== "wrong") return [];
    return (searchParams.get("questionIds") || "")
      .split(",")
      .map((value) => Number(value))
      .filter((value, index, values) => Number.isInteger(value) && value > 0 && values.indexOf(value) === index);
  }, [searchParams]);
  const isWrongAnswerReview = isListening && reviewQuestionIds.length > 0;
  const readingTopicId = searchParams.get("topic");
  const hasValidReadingTopic = Boolean(readingTopicId && /^\d+$/.test(readingTopicId));
  const backHref = isListening
    ? '/practice/listening'
    : isReading
      ? hasValidReadingTopic
        ? `/practice/reading/${readingTopicId}`
        : '/practice/reading'
      : '/practice/quizzes';
  const currentQuizRoute = hasValidReadingTopic
    ? `/practice/quizzes/${quizId}?topic=${readingTopicId}`
    : `/practice/quizzes/${quizId}`;

  const [minLaunchReady, setMinLaunchReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMinLaunchReady(true), 350);
    return () => clearTimeout(timer);
  }, []);

  // Single ownership: TakeQuizPage owns exit guard only when NOT listening
  const shouldConfirmExit = !submitMutation.isSuccess;
  const { confirmExit, exitDialogProps } = usePracticeExitGuard({
    shouldConfirmExit,
    defaultFallbackUrl: backHref,
    enabled: !isListening && hasMounted && !!user,
  });
  const handleExitRequest = (event?: MouseEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    confirmExit(backHref);
  };

  if (hasMounted && !user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={36} />
        <p className="text-sm font-bold text-slate-600">Đang chuyển hướng đăng nhập...</p>
        <AuthGateModal
          isOpen={showAuthModal}
          onClose={() => {
            setAuthModalDismissed(true);
            router.push("/practice/listening");
          }}
          targetLabel="bài luyện tập này"
          targetRoute={currentQuizRoute}
          onOpenLogin={() => router.push("/login")}
          onOpenRegister={() => router.push("/register")}
        />
      </div>
    );
  }

  if (isLoading || !hasMounted) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh] py-12">
        <PracticeLoadingScreen
          skill={isReading ? "reading" : undefined}
          className="max-w-4xl"
        />
      </div>
    );
  }

  if (!quiz) return <div className="text-center p-12">Không tìm thấy bài tập</div>;

  // Delegate LISTENING_PRACTICE exclusively to ListeningComprehensionWorkspace
  // ListeningComprehensionWorkspace owns the 350ms minimum duration gate
  if (quiz.type === 'LISTENING_PRACTICE') {
    return (
      <ListeningComprehensionWorkspace
        quiz={quiz}
        reviewOnly={isWrongAnswerReview}
        reviewQuestionIds={reviewQuestionIds}
      />
    );
  }

  const questions = quiz.questions || [];
  const currentQuestion = questions[currentStep];

  // BILINGUAL_READING and generic quiz: quizzes/[id]/page.tsx owns the 350ms gate
  if (!minLaunchReady || (!currentQuestion && questions.length > 0)) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh] py-12">
        <PracticeLoadingScreen
          skill={isReading ? "reading" : undefined}
          className="max-w-4xl"
        />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl py-20 text-center">
        <p className="text-base font-bold text-slate-700 dark:text-slate-300">
          Bài tập này chưa có câu hỏi nào.
        </p>
        <button
          type="button"
          onClick={() => confirmExit(backHref)}
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-extrabold text-white hover:bg-blue-700 cursor-pointer"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }
  const skillLabel = quiz.bilingualContent?.skillLabel || "TOEIC";
  const sectionLabel = currentQuestion?.content?.section;

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Submit
      const payload: AnswerDto[] = Object.keys(answers).map(qId => ({
        questionId: parseInt(qId),
        answer: answers[parseInt(qId)]
      }));
      submitMutation.mutate(payload);
    }
  };

  const playAudio = (text: string, rate: number = 1) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      if (isPlaying && playbackRate === rate) {
        setIsPlaying(false);
        return;
      }
      
      setPlaybackRate(rate);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = rate;
      
      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      
      window.speechSynthesis.speak(utterance);
    }
  };

  const WORD_TO_NUMBER: Record<string, string> = {
    'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4', 
    'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 
    'ten': '10', 'eleven': '11', 'twelve': '12', 'thirteen': '13',
    'fourteen': '14', 'fifteen': '15', 'sixteen': '16', 'seventeen': '17',
    'eighteen': '18', 'nineteen': '19', 'twenty': '20',
    'thirty': '30', 'forty': '40', 'fifty': '50', 'sixty': '60'
  };

  const normalizeStr = (str: string) => {
    const cleaned = str.toLowerCase().replace(/[.,!?]/g, '').replace(/-/g, ' ').trim();
    return cleaned.split(/\s+/).map(w => WORD_TO_NUMBER[w] || w).join(' ');
  };

  const handleCheckDictation = () => {
    const userAnswer = answers[currentQuestion.id] || "";
    const correctAnswer = currentQuestion.content?.correctAnswer || currentQuestion.content?.correct || "";
    
    // Clean strings for comparison
    const userWords = normalizeStr(userAnswer).split(/\s+/).filter(Boolean);
    const correctWords = normalizeStr(correctAnswer).split(/\s+/).filter(Boolean);
    
    let isCorrect = true;
    const diff = userWords.map((word, idx) => {
      const correctWord = correctWords[idx];
      if (word !== correctWord) {
        isCorrect = false;
        return { word, status: 'wrong' };
      }
      return { word, status: 'correct' };
    });

    if (userWords.length !== correctWords.length) {
       isCorrect = false;
    }

    setDictationResults({
      ...dictationResults,
      [currentQuestion.id]: { isChecked: true, isCorrect, diff }
    });
  };

  const isLastStep = currentStep === questions.length - 1;

  if (questions.length === 0) {
    return <div className="text-center p-12 dark:text-slate-400">Đề thi này chưa có câu hỏi nào.</div>;
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-20 px-4 sm:px-6 lg:px-8">
      {/* TOP HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <BackButton
            href={backHref}
            onClick={handleExitRequest}
            label={isReading ? "Thoát bài đọc" : "Thoát bài luyện"}
          />
          <div className="h-6 w-0.5 bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>
          <div>
            <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 line-clamp-1">{quiz.title}</h1>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {isReading
                ? "Đọc hiểu theo trình độ và chủ đề"
                : `Luyện tập ${skillLabel} theo từng phần`}
            </p>
          </div>
        </div>

        {/* Progress Pill */}
        <div className="flex items-center gap-3 bg-sky-50 dark:bg-sky-950/40 px-4 py-2 rounded-2xl border border-sky-200 dark:border-sky-900/50 shrink-0">
          <div className="w-24 bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
            <motion.div 
              className="bg-junior-blue h-full"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}
            />
          </div>
          <span className="text-xs font-black text-sky-700 dark:text-sky-300">
            Câu {currentStep + 1}/{questions.length}
          </span>
        </div>
      </div>

      {/* 2-COLUMN MAIN CONTENT */}
      <div className="grid grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: ACTIVE EXERCISE AREA */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Question Card */}
          <motion.div 
            key={currentQuestion.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 p-5 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm"
          >
            {/* Render Audio */}
            {currentQuestion.content?.audioUrl ? (
              <div className="mb-6 flex justify-center bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                <audio controls src={currentQuestion.content.audioUrl} className="w-full max-w-md rounded-full" />
              </div>
            ) : currentQuestion.content?.audioText ? (
              <div className="mb-8 flex flex-col items-center gap-4 bg-gradient-to-b from-sky-50/60 to-slate-50 dark:from-sky-950/40 dark:to-slate-850 p-8 rounded-2xl border border-sky-100 dark:border-sky-900/50 relative overflow-hidden">
                <button
                  onClick={() => playAudio(currentQuestion.content.audioText, playbackRate)}
                  className={`flex items-center justify-center w-24 h-24 rounded-full transition-all shadow-md active:scale-95 border-4 cursor-pointer ${
                    isPlaying 
                      ? 'bg-rose-500 text-white border-rose-600 animate-pulse shadow-rose-500/30' 
                      : 'bg-gradient-to-br from-sky-400 to-blue-600 text-white border-sky-300 hover:scale-105 shadow-sky-500/30'
                  }`}
                  title="Nghe phát âm"
                >
                  {isPlaying ? <Square size={36} fill="currentColor" /> : <Play size={36} fill="currentColor" className="ml-1.5" />}
                </button>

                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-xs">
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 px-1">Tốc độ:</span>
                  {[0.8, 1, 1.2].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => {
                        setPlaybackRate(rate);
                        if (isPlaying) {
                          playAudio(currentQuestion.content.audioText, rate);
                        }
                      }}
                      className={`px-3 py-1 rounded-full font-black text-xs transition-colors cursor-pointer ${
                        playbackRate === rate 
                          ? 'bg-sky-600 text-white shadow-xs' 
                          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Reading Passage: show for BILINGUAL_READING quizzes */}
            {isReading && currentQuestion.content?.passage && (
              <div className="mb-8 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl p-5 sm:p-7">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300 uppercase tracking-[0.14em]">Đoạn văn</p>
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Đọc kỹ trước khi chọn đáp án</span>
                </div>
                <p className="whitespace-pre-line text-lg leading-9 tracking-[0.01em] text-slate-800 dark:text-slate-100 font-medium sm:text-xl sm:leading-10 lg:text-[1.35rem]">
                  {currentQuestion.content.passage}
                </p>
              </div>
            )}

            {/* Question Illustration / Visual Context (rendered only when imageUrl is provided) */}
            {currentQuestion.content?.imageUrl &&
              !failedImageKeys.has(
                `${currentQuestion.id}:${currentQuestion.content.imageUrl}`,
              ) && (
                <div className="mb-6 flex justify-center overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2 shadow-2xs">
                  <img
                    src={currentQuestion.content.imageUrl}
                    alt={
                      currentQuestion.content.imageAlt ||
                      (isReading
                        ? "Hình minh họa ngữ cảnh bài đọc"
                        : "Hình minh họa câu hỏi")
                    }
                    loading="eager"
                    decoding="async"
                    onError={() =>
                      setFailedImageKeys(
                        (prev) =>
                          new Set(prev).add(
                            `${currentQuestion.id}:${currentQuestion.content.imageUrl}`,
                          ),
                      )
                    }
                    className="max-h-[380px] w-full object-contain rounded-xl"
                  />
                </div>
              )}
            {currentQuestion.content?.imageUrl &&
              failedImageKeys.has(
                `${currentQuestion.id}:${currentQuestion.content.imageUrl}`,
              ) && (
                <div
                  role="img"
                  aria-label="Hình minh họa bài tập hiện chưa tải được"
                  className="mb-6 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 p-4 text-center"
                >
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Hình minh họa hiện chưa tải được. Bạn vẫn có thể tiếp tục
                    đọc và hoàn thành câu hỏi.
                  </p>
                </div>
              )}
            
            {sectionLabel && (
              <div className="mb-4 flex justify-center">
                <span className="rounded-full bg-amber-50 dark:bg-amber-950/50 px-3 py-1 text-xs font-black text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50">
                  {sectionLabel}
                </span>
              </div>
            )}
            <h3 className="text-2xl font-extrabold leading-snug text-slate-900 dark:text-slate-100 mb-7 text-center break-words max-w-3xl mx-auto px-2 sm:text-3xl">
              {currentQuestion.content?.text || "Nghe đoạn âm thanh và điền câu trả lời vào bên dưới:"}
            </h3>

            {currentQuestion.type === 'WRITING' ? (
              <textarea
                value={answers[currentQuestion.id] || ""}
                onChange={(e) => setAnswers({ ...answers, [currentQuestion.id]: e.target.value })}
                placeholder="Nhập câu trả lời của bạn vào đây..."
                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-lg font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-junior-blue transition-colors min-h-[160px]"
              />
            ) : quiz.type === 'LISTENING_PRACTICE' ? (
              <div className="flex flex-col gap-4">
                <textarea
                  value={answers[currentQuestion.id] || ""}
                  onChange={(e) => {
                     setAnswers({ ...answers, [currentQuestion.id]: e.target.value });
                     if (dictationResults[currentQuestion.id]?.isChecked) {
                       setDictationResults(prev => ({ ...prev, [currentQuestion.id]: { ...prev[currentQuestion.id], isChecked: false } }));
                     }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Control') {
                      e.preventDefault();
                      if (currentQuestion.content?.audioText) {
                        playAudio(currentQuestion.content.audioText, playbackRate);
                      } else if (currentQuestion.content?.audioUrl) {
                        const audioEl = document.querySelector('audio');
                        if (audioEl) {
                          audioEl.currentTime = 0;
                          audioEl.play();
                        }
                      }
                    } else if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (!dictationResults[currentQuestion.id]?.isChecked) {
                        handleCheckDictation();
                      } else {
                        handleNext();
                      }
                    }
                  }}
                  placeholder="Nhập những gì bạn vừa nghe được vào đây..."
                  className={`w-full bg-slate-50 dark:bg-slate-850 border-2 rounded-2xl p-6 text-lg font-medium outline-none transition-colors min-h-[160px] ${
                    dictationResults[currentQuestion.id]?.isChecked
                      ? dictationResults[currentQuestion.id].isCorrect
                        ? "border-emerald-400 dark:border-emerald-600 text-emerald-800 dark:text-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/30"
                        : "border-rose-300 dark:border-rose-900/60 text-slate-800 dark:text-slate-100 bg-rose-50/30 dark:bg-rose-950/30"
                      : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-100 focus:border-amber-500 focus:bg-white dark:focus:bg-slate-800"
                  }`}
                />
                
                {dictationResults[currentQuestion.id]?.isChecked && (
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700">
                    {!dictationResults[currentQuestion.id].isCorrect ? (
                      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-rose-200 dark:border-rose-900/50 shadow-2xs">
                        <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold mb-3 text-base">
                          <span className="text-lg">⚠️</span> Cần chỉnh sửa một chút:
                        </div>
                        <div className="text-xl font-medium leading-relaxed font-mono flex flex-wrap gap-x-2 gap-y-2 break-words max-w-full">
                          {(() => {
                            const correctStr = currentQuestion.content?.correctAnswer || currentQuestion.content?.correct || "";
                            const userStr = answers[currentQuestion.id] || "";
                            const uWords = normalizeStr(userStr).split(/\s+/).filter(Boolean);
                            const cWords = normalizeStr(correctStr).split(/\s+/).filter(Boolean);
                            const origCWords = correctStr.trim().split(/[\s-]+/).filter(Boolean);

                            let firstWrongIdx = cWords.length;
                            for (let i = 0; i < cWords.length; i++) {
                              if (uWords[i] !== cWords[i]) {
                                firstWrongIdx = i;
                                break;
                              }
                            }

                            return origCWords.map((word: string, idx: number) => {
                              if (idx < firstWrongIdx) {
                                return <span key={idx} className="text-emerald-600 dark:text-emerald-400 font-bold break-words">{word}</span>;
                              } else if (idx === firstWrongIdx) {
                                return <span key={idx} className="text-rose-600 dark:text-rose-400 font-black underline decoration-wavy break-words">{word}</span>;
                              } else {
                                const masked = word.replace(/[\p{L}\p{N}]/gu, '*');
                                return <span key={idx} className="text-slate-400 dark:text-slate-500 tracking-widest break-words">{masked}</span>;
                              }
                            });
                          })()}
                        </div>
                      </div>
                    ) : (
                      <div className="text-lg font-medium leading-relaxed">
                        <span className="text-emerald-600 dark:text-emerald-400 block mb-2 text-sm font-black uppercase">🎉 Hoàn hảo! Bạn chép đúng 100%:</span>
                        <span className="text-slate-800 dark:text-slate-100 font-bold block mb-1 break-words">{currentQuestion.content?.correctAnswer}</span>
                        {currentQuestion.content?.translation && (
                          <span className="text-slate-500 dark:text-slate-400 block text-sm italic break-words">{currentQuestion.content.translation}</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {(currentQuestion.content?.options || ["A", "B", "C", "D"]).map((opt: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => setAnswers({ ...answers, [currentQuestion.id]: opt })}
                      className={`min-h-[72px] p-5 rounded-2xl border-2 text-base sm:text-lg font-semibold text-left leading-relaxed transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 ${
                        answers[currentQuestion.id] === opt 
                          ? "border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 shadow-2xs" 
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 hover:border-amber-300 dark:hover:border-amber-600"
                      }`}
                    >
                      <span className="break-words">{opt}</span>
                    </button>
                 ))}
              </div>
            )}
          </motion.div>

          {/* Action Buttons Bar */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => {
                if (currentStep > 0) setCurrentStep(currentStep - 1);
              }}
              disabled={currentStep === 0}
              className="px-6 py-3.5 rounded-2xl font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              ← Câu trước
            </button>

            {quiz.type === 'LISTENING_PRACTICE' && (!dictationResults[currentQuestion.id]?.isChecked || !dictationResults[currentQuestion.id]?.isCorrect) ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCheckDictation}
                className="flex items-center gap-2 text-white text-base font-black px-7 py-3 rounded-2xl shadow-sm bg-amber-500 hover:bg-amber-600 cursor-pointer"
              >
                {dictationResults[currentQuestion.id]?.isChecked ? "Kiểm tra lại" : "Kiểm tra đáp án"}
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleNext}
                disabled={submitMutation.isPending}
                className={`flex items-center gap-2 text-white text-base font-black px-7 py-3 rounded-2xl shadow-sm cursor-pointer ${
                  isLastStep ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-600 hover:bg-amber-700"
                }`}
              >
                {submitMutation.isPending ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : isLastStep ? (
                  <>Nộp bài <CheckCircle2 size={20} strokeWidth={2.5} /></>
                ) : (
                  <>Câu tiếp theo <ChevronRight size={20} strokeWidth={2.5} /></>
                )}
              </motion.button>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: QUESTION NAVIGATOR & SIDEBAR WIDGETS */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Question Matrix Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-base">Danh Sách Câu Hỏi</h3>
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                {Object.keys(answers).length}/{questions.length} Đã làm
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2.5">
              {questions.map((q: any, idx: number) => {
                const isCurrent = idx === currentStep;
                const isAnswered = !!answers[q.id];
                const isPassed = dictationResults[q.id]?.isCorrect;

                return (
                  <button
                    key={q.id || idx}
                    onClick={() => setCurrentStep(idx)}
                    className={`h-10 rounded-xl font-extrabold text-sm transition-all flex items-center justify-center cursor-pointer border ${
                      isCurrent
                        ? "bg-amber-500 text-white border-amber-600 shadow-2xs"
                        : isPassed
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                        : isAnswered
                        ? "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tips & Keyboard Shortcuts */}
          {isReading ? (
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 space-y-4">
              <h3 className="font-extrabold text-emerald-900 dark:text-emerald-200 text-base flex items-center gap-2">
                <BookOpen size={18} aria-hidden="true" /> Mẹo Đọc Hiểu
              </h3>
              <ul className="space-y-3 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <li className="flex items-start gap-2 bg-white/80 dark:bg-slate-850/80 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                  <span className="text-emerald-500 mt-0.5 shrink-0">1.</span>
                  <span>Đọc câu hỏi <strong>trước</strong> rồi mới đọc đoạn văn để tìm thông tin cần thiết.</span>
                </li>
                <li className="flex items-start gap-2 bg-white/80 dark:bg-slate-850/80 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                  <span className="text-emerald-500 mt-0.5 shrink-0">2.</span>
                  <span>Chú ý <strong>từ khóa</strong> trong câu hỏi và tìm chúng trong đoạn văn.</span>
                </li>
                <li className="flex items-start gap-2 bg-white/80 dark:bg-slate-850/80 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                  <span className="text-emerald-500 mt-0.5 shrink-0">3.</span>
                  <span>Loại trừ các đáp án sai dựa trên thông tin được nêu rõ trong đoạn văn.</span>
                </li>
              </ul>
            </div>
          ) : (
              <div className="bg-slate-50 dark:bg-slate-850 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
              <Lightbulb size={18} aria-hidden="true" /> Phím Tắt & Mẹo Làm Bài
            </h3>
            <ul className="space-y-3 text-xs font-bold text-indigo-800 dark:text-indigo-300">
              <li className="flex items-center justify-between bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                <span>Nghe lại audio:</span>
                <kbd className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-2 py-1 rounded font-mono border-b border-slate-300 dark:border-slate-600">Ctrl</kbd>
              </li>
              <li className="flex items-center justify-between bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                <span>Kiểm tra / Sang câu:</span>
                <kbd className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-2 py-1 rounded font-mono border-b border-slate-300 dark:border-slate-600">Enter</kbd>
              </li>
              <li className="bg-white/80 dark:bg-slate-800/80 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/40 text-[11px] leading-relaxed text-indigo-700 dark:text-indigo-300 font-medium">
                <span className="font-bold">Mẹo:</span> Đọc câu hỏi trước, sau đó quay lại đoạn văn để tìm bằng chứng.
              </li>
            </ul>
          </div>
          )}

          {/* Gamification Reward Card */}
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 p-5 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-400 flex items-center justify-center shadow-sm shrink-0">
              <Cookie size={24} aria-hidden="true" className="text-amber-950" />
            </div>
            <div>
              <p className="font-black text-slate-800 dark:text-slate-100 text-sm">Phần Thưởng Hoàn Thành</p>
              <p className="text-xs font-bold text-amber-800 dark:text-amber-300 mt-0.5">+20 EXP • +1 Điểm Nhiệm Vụ Ngày</p>
            </div>
          </div>
        </div>
      </div>

      {/* Shared Exit Confirmation Modal */}
      <PracticeExitConfirmDialog {...exitDialogProps} />
    </div>
  );
}
