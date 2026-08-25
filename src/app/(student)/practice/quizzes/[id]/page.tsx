"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, CheckCircle2, ChevronRight, Play, Square } from "lucide-react";
import { quizService, AnswerDto } from "@/lib/api/services/quiz.service";
import { BackButton } from "@/components/ui";

export default function TakeQuizPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const quizId = parseInt(params.id);

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [dictationResults, setDictationResults] = useState<Record<number, { isChecked: boolean, isCorrect: boolean, diff: any[] }>>({});

  const { data: quiz, isLoading } = useQuery({
    queryKey: ["quiz", quizId],
    queryFn: () => quizService.getQuizById(quizId),
    enabled: !isNaN(quizId),
  });

  const submitMutation = useMutation({
    mutationFn: (payload: AnswerDto[]) => quizService.submitQuiz(quizId, payload),
    onSuccess: (data) => {
      // Invalidate gamification and profile cache to update Daily Quests instantly
      queryClient.invalidateQueries({ queryKey: ["myQuests"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      
      // Redirect to analytics page
      router.push(`/practice/quizzes/submissions/${data.id}`);
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <Loader2 className="animate-spin text-junior-blue" size={48} />
      </div>
    );
  }

  if (!quiz) return <div>Không tìm thấy bài tập</div>;

  const questions = quiz.questions || [];
  const currentQuestion = questions[currentStep];

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
    return <div className="text-center p-12">Đề thi này chưa có câu hỏi nào.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* TOP HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border-4 border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <BackButton href="/practice/quizzes" label="Thoát bài thi" />
          <div className="h-6 w-0.5 bg-slate-200 hidden sm:block"></div>
          <div>
            <h1 className="text-xl font-black text-slate-800 line-clamp-1">{quiz.title}</h1>
            <p className="text-xs font-bold text-slate-400">
              Luyện nghe chép chính tả • Chuẩn âm giọng bản xứ
            </p>
          </div>
        </div>

        {/* Progress Pill */}
        <div className="flex items-center gap-3 bg-sky-50 px-4 py-2 rounded-2xl border-2 border-sky-200 shrink-0">
          <div className="w-24 bg-slate-200 h-2.5 rounded-full overflow-hidden">
            <motion.div 
              className="bg-junior-blue h-full"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}
            />
          </div>
          <span className="text-xs font-black text-sky-700">
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
            className="bg-white p-6 sm:p-8 rounded-[2.5rem] border-4 border-slate-100 shadow-sm"
          >
            {/* Render Audio */}
            {currentQuestion.content?.audioUrl ? (
              <div className="mb-6 flex justify-center bg-slate-50 p-6 rounded-3xl border-2 border-slate-100">
                <audio controls src={currentQuestion.content.audioUrl} className="w-full max-w-md rounded-full" />
              </div>
            ) : currentQuestion.content?.audioText ? (
              <div className="mb-8 flex flex-col items-center gap-4 bg-gradient-to-b from-sky-50/60 to-slate-50 p-8 rounded-3xl border-2 border-sky-100 relative overflow-hidden">
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

                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-xs">
                  <span className="text-xs font-bold text-slate-400 px-1">Tốc độ:</span>
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
                          : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            
            <h3 className="text-xl font-bold text-slate-800 mb-6 text-center break-words max-w-full px-2">
              {currentQuestion.content?.text || "Nghe đoạn âm thanh và điền câu trả lời vào bên dưới:"}
            </h3>

            {currentQuestion.type === 'WRITING' ? (
              <textarea
                value={answers[currentQuestion.id] || ""}
                onChange={(e) => setAnswers({ ...answers, [currentQuestion.id]: e.target.value })}
                placeholder="Nhập câu trả lời của bạn vào đây..."
                className="w-full bg-slate-50 border-4 border-slate-200 rounded-2xl p-6 text-lg font-medium text-slate-700 outline-none focus:border-junior-blue transition-colors min-h-[160px]"
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
                  className={`w-full bg-slate-50 border-4 rounded-2xl p-6 text-lg font-medium outline-none transition-colors min-h-[160px] ${
                    dictationResults[currentQuestion.id]?.isChecked
                      ? dictationResults[currentQuestion.id].isCorrect
                        ? "border-emerald-400 text-emerald-800 bg-emerald-50/50"
                        : "border-rose-300 text-slate-800 bg-rose-50/30"
                      : "border-slate-200 text-slate-700 focus:border-junior-blue"
                  }`}
                />
                
                {dictationResults[currentQuestion.id]?.isChecked && (
                  <div className="p-5 rounded-2xl bg-slate-50 border-2 border-slate-200">
                    {!dictationResults[currentQuestion.id].isCorrect ? (
                      <div className="bg-white p-6 rounded-2xl border-2 border-rose-200 shadow-sm">
                        <div className="flex items-center gap-2 text-rose-500 font-bold mb-3 text-base">
                          <span className="text-xl">⚠️</span> Cần chỉnh sửa một chút:
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
                                return <span key={idx} className="text-emerald-600 font-bold break-words">{word}</span>;
                              } else if (idx === firstWrongIdx) {
                                return <span key={idx} className="text-rose-600 font-black underline decoration-wavy break-words">{word}</span>;
                              } else {
                                const masked = word.replace(/[\p{L}\p{N}]/gu, '*');
                                return <span key={idx} className="text-slate-400 tracking-widest break-words">{masked}</span>;
                              }
                            });
                          })()}
                        </div>
                      </div>
                    ) : (
                      <div className="text-lg font-medium leading-relaxed">
                        <span className="text-emerald-600 block mb-2 text-sm font-black uppercase">🎉 Hoàn hảo! Bạn chép đúng 100%:</span>
                        <span className="text-slate-800 font-bold block mb-1 break-words">{currentQuestion.content?.correctAnswer}</span>
                        {currentQuestion.content?.translation && (
                          <span className="text-slate-500 block text-sm italic break-words">{currentQuestion.content.translation}</span>
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
                      className={`p-5 rounded-2xl border-4 font-bold text-left transition-all cursor-pointer ${
                        answers[currentQuestion.id] === opt 
                          ? "border-junior-blue bg-sky-50 text-junior-blue shadow-sm" 
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
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
              className="px-6 py-3.5 rounded-2xl font-bold text-slate-500 bg-white border-2 border-slate-200 hover:bg-slate-100 transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              ← Câu trước
            </button>

            {quiz.type === 'LISTENING_PRACTICE' && (!dictationResults[currentQuestion.id]?.isChecked || !dictationResults[currentQuestion.id]?.isCorrect) ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCheckDictation}
                className="flex items-center gap-2 text-white text-lg font-black px-8 py-3.5 rounded-2xl shadow-md bg-amber-500 hover:bg-amber-600 cursor-pointer"
              >
                {dictationResults[currentQuestion.id]?.isChecked ? "Kiểm tra lại" : "Kiểm tra đáp án"}
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleNext}
                disabled={submitMutation.isPending}
                className={`flex items-center gap-2 text-white text-lg font-black px-8 py-3.5 rounded-2xl shadow-md cursor-pointer ${
                  isLastStep ? "bg-emerald-500 hover:bg-emerald-600" : "bg-sky-500 hover:bg-sky-600"
                }`}
              >
                {submitMutation.isPending ? (
                  <Loader2 className="animate-spin" size={22} />
                ) : isLastStep ? (
                  <>Nộp bài <CheckCircle2 size={22} strokeWidth={2.5} /></>
                ) : (
                  <>Câu tiếp theo <ChevronRight size={22} strokeWidth={2.5} /></>
                )}
              </motion.button>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: QUESTION NAVIGATOR & SIDEBAR WIDGETS */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Question Matrix Card */}
          <div className="bg-white p-6 rounded-[2rem] border-4 border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-800 text-base">Danh Sách Câu Hỏi</h3>
              <span className="text-xs font-bold text-slate-400">
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
                    className={`h-11 rounded-xl font-black text-sm transition-all flex items-center justify-center cursor-pointer border-2 ${
                      isCurrent
                        ? "bg-sky-500 text-white border-sky-600 ring-4 ring-sky-100 shadow-sm scale-105"
                        : isPassed
                        ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                        : isAnswered
                        ? "bg-amber-100 text-amber-800 border-amber-300"
                        : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tips & Keyboard Shortcuts */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-[2rem] border-2 border-indigo-100/70 space-y-4">
            <h3 className="font-black text-indigo-900 text-base flex items-center gap-2">
              <span>⌨️</span> Phím Tắt & Mẹo Làm Bài
            </h3>

            <ul className="space-y-3 text-xs font-bold text-indigo-800">
              <li className="flex items-center justify-between bg-white/80 p-2.5 rounded-xl border border-indigo-100">
                <span>Nghe lại audio:</span>
                <kbd className="bg-slate-200 text-slate-700 px-2 py-1 rounded font-mono border-b border-slate-300">Ctrl</kbd>
              </li>
              <li className="flex items-center justify-between bg-white/80 p-2.5 rounded-xl border border-indigo-100">
                <span>Kiểm tra / Sang câu:</span>
                <kbd className="bg-slate-200 text-slate-700 px-2 py-1 rounded font-mono border-b border-slate-300">Enter</kbd>
              </li>
              <li className="bg-white/80 p-3 rounded-xl border border-indigo-100 text-[11px] leading-relaxed text-indigo-700 font-medium">
                💡 <span className="font-bold">Mẹo:</span> Giảm tốc độ xuống 0.8x nếu câu có các từ phát âm nối đuôi nhanh.
              </li>
            </ul>
          </div>

          {/* Gamification Reward Card */}
          <div className="bg-amber-50 border-2 border-amber-200 p-5 rounded-[2rem] flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-400 flex items-center justify-center text-2xl shadow-sm shrink-0">
              🍞
            </div>
            <div>
              <p className="font-black text-slate-800 text-sm">Phần Thưởng Hoàn Thành</p>
              <p className="text-xs font-bold text-amber-800 mt-0.5">+20 EXP • +1 Điểm Nhiệm Vụ Ngày</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
