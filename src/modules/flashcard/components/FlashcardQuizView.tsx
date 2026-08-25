"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle2, 
  XCircle, 
  Trophy, 
  RotateCcw, 
  ArrowRight, 
  Volume2, 
  Sparkles, 
  Star, 
  Check, 
  X,
  Flame,
  Award
} from "lucide-react";
import { FlashcardWord } from "../types";
import { Button3D } from "@/components/ui";
import { useGamificationStore } from "@/stores/gamificationStore";
import { useAuthStore } from "@/stores/authStore";
import { useQueryClient } from "@tanstack/react-query";
import { gamificationService } from "@/lib/api/services/gamification.service";

interface FlashcardQuizViewProps {
  lessonId: number;
  lessonTitle: string;
  words: FlashcardWord[];
  allWords: FlashcardWord[];
  onFinish: () => void;
}

interface Question {
  targetWord: FlashcardWord;
  options: string[];
  correctAnswer: string;
}

interface UserAnswerHistory {
  question: Question;
  selectedOption: string;
  isCorrect: boolean;
}

// True unbiased Fisher-Yates shuffle algorithm
function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export const FlashcardQuizView: React.FC<FlashcardQuizViewProps> = ({
  lessonId,
  lessonTitle,
  words,
  allWords,
  onFinish,
}) => {
  const { user } = useAuthStore();
  const { addBreads, addExp } = useGamificationStore();
  const queryClient = useQueryClient();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [answerHistory, setAnswerHistory] = useState<UserAnswerHistory[]>([]);

  // High Score & Anti-Exploit tracking per user + lesson
  const bestScoreKey = `breadtrans_quiz_best_${user?.id || "guest"}_${lessonId}`;
  const [previousBestScore, setPreviousBestScore] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const val = localStorage.getItem(bestScoreKey);
        return val !== null ? parseInt(val, 10) : -1;
      } catch {
        return -1;
      }
    }
    return -1;
  });

  const [rewardSummary, setRewardSummary] = useState<{
    exp: number;
    breads: number;
    isNewRecord: boolean;
    isFirstTime: boolean;
  }>({
    exp: 0,
    breads: 0,
    isNewRecord: false,
    isFirstTime: false,
  });

  // Generate randomized questions with 100% unbiased option distribution
  const buildQuestions = useCallback(() => {
    if (words.length === 0) return [];

    const generated: Question[] = words.map((target) => {
      // Find other words that don't share the same Vietnamese meaning
      const otherWords = allWords.filter(
        (w) => w.id !== target.id && w.mean !== target.mean
      );
      const shuffledOthers = shuffleArray(otherWords);
      const distractors = shuffledOthers.slice(0, 3).map((w) => w.mean);

      // Mix 3 distractors + 1 correct answer and shuffle randomly (equal 25% chance for each position 1, 2, 3, 4)
      const options = shuffleArray([...distractors, target.mean]);

      return {
        targetWord: target,
        options,
        correctAnswer: target.mean,
      };
    });

    return shuffleArray(generated);
  }, [words, allWords]);

  const startNewQuiz = useCallback(() => {
    const qList = buildQuestions();
    setQuestions(qList);
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setIsComplete(false);
    setAnswerHistory([]);
  }, [buildQuestions]);

  useEffect(() => {
    startNewQuiz();
  }, [startNewQuiz]);

  const currentQ = questions[currentIndex];

  const handleSelectOption = useCallback(
    (option: string) => {
      if (isAnswered || !currentQ) return;

      const isCorrect = option === currentQ.correctAnswer;
      setSelectedOption(option);
      setIsAnswered(true);

      if (isCorrect) {
        setScore((s) => s + 1);
      }

      setAnswerHistory((prev) => [
        ...prev,
        {
          question: currentQ,
          selectedOption: option,
          isCorrect,
        },
      ]);
    },
    [isAnswered, currentQ]
  );

  const handleFinishQuiz = useCallback(
    (finalScore: number) => {
      const totalQ = questions.length;
      const isFirstTime = previousBestScore === -1;
      const isNewRecord = finalScore > previousBestScore && !isFirstTime;

      let rewardExp = 0;
      let rewardBreads = 0;

      if (isFirstTime) {
        // Lần đầu hoàn thành bài: Nhận Full EXP + Bánh Mì + Tính nhiệm vụ ngày
        rewardExp = finalScore * 10;
        rewardBreads = Math.max(5, Math.round((finalScore / totalQ) * 15));
        addExp(rewardExp);
        addBreads(rewardBreads);

        if (user && finalScore > 0) {
          gamificationService.recordVocabLearned(finalScore).catch(() => {});
        }
      } else if (isNewRecord) {
        // Phá kỷ lục điểm số trước: Thưởng phần chênh lệch
        const diff = finalScore - previousBestScore;
        rewardExp = diff * 10;
        rewardBreads = Math.max(2, Math.round((diff / totalQ) * 10));
        addExp(rewardExp);
        addBreads(rewardBreads);
      } else {
        // Làm lại bài cũ / Ôn tập: Thưởng tượng trưng +2 EXP ôn tập, KHÔNG cộng dồn Bánh Mì hay từ mới
        rewardExp = 2;
        rewardBreads = 0;
        addExp(2);
      }

      // Cập nhật kỷ lục High Score
      if (isFirstTime || isNewRecord) {
        const newBest = Math.max(previousBestScore, finalScore);
        setPreviousBestScore(newBest);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(bestScoreKey, newBest.toString());
          } catch {}
        }
      }

      setRewardSummary({
        exp: rewardExp,
        breads: rewardBreads,
        isNewRecord,
        isFirstTime,
      });

      queryClient.invalidateQueries({ queryKey: ["myQuests"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
    [questions.length, previousBestScore, addExp, addBreads, user, queryClient, bestScoreKey]
  );

  const handleNext = useCallback(() => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setIsComplete(true);
      handleFinishQuiz(score);
    }
  }, [currentIndex, questions.length, score, handleFinishQuiz]);

  const playWordAudio = useCallback(
    (text?: string) => {
      const wordToPlay = text || currentQ?.targetWord.word;
      if (!wordToPlay || !("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(wordToPlay);
      utterance.lang = "en-US";
      window.speechSynthesis.speak(utterance);
    },
    [currentQ]
  );

  // Keyboard shortcut listener (1-4 for options, Enter/Space for Next, R for Audio)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isComplete) return;

      if (isAnswered) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleNext();
        }
      } else if (currentQ) {
        if (["1", "2", "3", "4"].includes(e.key)) {
          const idx = parseInt(e.key, 10) - 1;
          if (idx >= 0 && idx < currentQ.options.length) {
            e.preventDefault();
            handleSelectOption(currentQ.options[idx]);
          }
        } else if (e.key.toLowerCase() === "r") {
          e.preventDefault();
          playWordAudio();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAnswered, isComplete, currentQ, handleNext, handleSelectOption, playWordAudio]);

  if (questions.length === 0) {
    return (
      <div className="text-center py-12 font-bold text-slate-400">
        Đang chuẩn bị câu hỏi trắc nghiệm...
      </div>
    );
  }

  // ── COMPLETION SCREEN (Detailed Assessment Report) ──
  if (isComplete) {
    const accuracy = Math.round((score / questions.length) * 100);

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl mx-auto bg-white rounded-[2.5rem] border-4 border-slate-200 shadow-[0_12px_0_0_#e2e8f0] p-6 sm:p-8 text-center my-4"
      >
        {/* Header Icon */}
        <div className="w-20 h-20 rounded-full bg-amber-100 border-4 border-amber-300 mx-auto flex items-center justify-center mb-4 shadow-inner">
          <Trophy size={40} className="text-amber-500" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-slate-800 mb-1">
          Hoàn Thành Quiz!
        </h2>
        <p className="font-bold text-slate-400 text-xs sm:text-sm mb-4">
          Bài kiểm tra: <span className="text-slate-700">{lessonTitle}</span>
        </p>

        {/* New Record Banner if applicable */}
        {rewardSummary.isNewRecord && (
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-400 to-orange-400 text-amber-950 font-black text-xs px-4 py-1.5 rounded-full mb-4 shadow-sm">
            <Flame size={16} /> Kỷ Lục Mới: {score}/{questions.length} câu đúng!
          </div>
        )}

        {/* Score & Rewards Grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-sky-50 border-2 border-sky-200 rounded-2xl p-3">
            <span className="text-[10px] font-black text-sky-600 uppercase">Chính xác</span>
            <p className="text-2xl sm:text-3xl font-black text-sky-700">{accuracy}%</p>
            <span className="text-[11px] font-bold text-sky-500">
              {score}/{questions.length} câu
            </span>
          </div>

          <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-3">
            <span className="text-[10px] font-black text-purple-600 uppercase">Kinh Nghiệm</span>
            <p className="text-2xl sm:text-3xl font-black text-purple-700 flex items-center justify-center gap-1">
              +{rewardSummary.exp} <span className="text-xs">⭐</span>
            </p>
            <span className="text-[10px] font-bold text-purple-500">
              {rewardSummary.isFirstTime ? "Lần đầu" : rewardSummary.isNewRecord ? "Kỷ lục mới" : "Ôn tập"}
            </span>
          </div>

          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-3">
            <span className="text-[10px] font-black text-amber-600 uppercase">Bánh Mì</span>
            <p className="text-2xl sm:text-3xl font-black text-amber-700 flex items-center justify-center gap-1">
              +{rewardSummary.breads} <span className="text-base">🍞</span>
            </p>
            <span className="text-[10px] font-bold text-amber-500">
              {rewardSummary.breads > 0 ? "Thưởng quiz" : "Đã nhận trước đó"}
            </span>
          </div>
        </div>

        {/* Detailed Answer Review */}
        <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 mb-6 text-left">
          <h4 className="font-black text-xs text-slate-500 uppercase tracking-wider mb-3">
            Chi tiết câu trả lời ({score}/{questions.length} đúng):
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {answerHistory.map((item, idx) => (
              <div
                key={idx}
                className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                  item.isCorrect
                    ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                    : "bg-rose-50/80 border-rose-200 text-rose-900"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                      item.isCorrect ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                    }`}
                  >
                    {item.isCorrect ? <Check size={12} /> : <X size={12} />}
                  </span>
                  <div className="truncate">
                    <span className="font-extrabold">{item.question.targetWord.word}</span>:{" "}
                    <span className="opacity-80">{item.question.correctAnswer}</span>
                  </div>
                </div>
                <button
                  onClick={() => playWordAudio(item.question.targetWord.word)}
                  className="p-1 text-slate-400 hover:text-slate-700 shrink-0"
                >
                  <Volume2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button3D
            variant="orange"
            size="md"
            onClick={startNewQuiz}
            className="flex-1 flex items-center justify-center gap-2"
          >
            <RotateCcw size={18} /> Làm lại bài này
          </Button3D>
          <Button3D
            variant="white"
            size="md"
            onClick={onFinish}
            className="flex-1 flex items-center justify-center gap-2"
          >
            Quay lại Flashcard
          </Button3D>
        </div>
      </motion.div>
    );
  }

  // ── ACTIVE QUIZ VIEW ──
  return (
    <div className="max-w-2xl mx-auto pb-24 md:pb-28">
      {/* Progress & Score Bar */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex-1 bg-slate-200 h-3 rounded-full overflow-hidden border-2 border-slate-300">
          <div
            className="bg-emerald-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
        <div className="flex items-center gap-2">
          {previousBestScore >= 0 && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl">
              <Award size={12} /> Kỷ lục: {previousBestScore}/{questions.length}
            </span>
          )}
          <span className="font-black text-slate-600 text-xs sm:text-sm bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
            Câu {currentIndex + 1} / {questions.length}
          </span>
        </div>
      </div>

      {/* Question Card (Compact & High Impact) */}
      <div className="bg-white rounded-[2rem] border-4 border-slate-200 shadow-[0_8px_0_0_#e2e8f0] p-5 sm:p-6 mb-4 text-center">
        <div className="inline-flex items-center gap-2 bg-sky-50 border border-sky-200 px-3.5 py-1 rounded-full mb-2">
          <span className="text-[11px] font-black text-sky-600 uppercase tracking-wider">
            {currentQ.targetWord.type ? currentQ.targetWord.type.toUpperCase() : "TỪ VỰNG"}
          </span>
          <button
            onClick={() => playWordAudio()}
            className="text-sky-500 hover:text-sky-700 transition-colors p-0.5"
            title="Nghe phát âm (Phím R)"
          >
            <Volume2 size={16} />
          </button>
        </div>

        <h3 className="text-2xl sm:text-3xl font-black text-slate-800 mb-1 break-words max-w-full px-2">
          {currentQ.targetWord.word}
        </h3>
        <p className="font-mono text-slate-400 font-bold text-sm mb-2 break-words">
          {currentQ.targetWord.ipa}
        </p>
        <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
          Chọn nghĩa tiếng Việt chính xác:
        </p>
      </div>

      {/* Options List (2-column on tablet/desktop for compact fit, 100% unbiased random positions) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {currentQ.options.map((option, idx) => {
          let stateStyle =
            "bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-[0_3px_0_0_#cbd5e1]";

          if (isAnswered) {
            if (option === currentQ.correctAnswer) {
              stateStyle =
                "bg-emerald-50 border-2 border-emerald-500 text-emerald-800 shadow-[0_3px_0_0_#059669] font-black scale-[1.01]";
            } else if (option === selectedOption) {
              stateStyle =
                "bg-rose-50 border-2 border-rose-500 text-rose-800 shadow-[0_3px_0_0_#e11d48] font-bold";
            } else {
              stateStyle = "bg-slate-50 border-2 border-slate-200 text-slate-400 opacity-60";
            }
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelectOption(option)}
              disabled={isAnswered}
              className={`w-full min-h-[58px] p-3.5 rounded-2xl text-left font-bold text-sm sm:text-base transition-all select-none flex items-center justify-between gap-2.5 active:translate-y-[2px] active:shadow-none cursor-pointer ${stateStyle}`}
            >
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-500 text-xs font-black flex items-center justify-center shrink-0 border border-slate-200">
                  {idx + 1}
                </span>
                <span className="break-words leading-tight">{option}</span>
              </div>
              {isAnswered && option === currentQ.correctAnswer && (
                <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
              )}
              {isAnswered && option === selectedOption && option !== currentQ.correctAnswer && (
                <XCircle size={18} className="text-rose-500 shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── STICKY / FIXED BOTTOM DOCK (Duolingo Style - Never Requires Scrolling) ── */}
      <AnimatePresence>
        {isAnswered && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className={`fixed bottom-0 left-0 right-0 z-50 py-3.5 px-4 sm:px-8 border-t-4 backdrop-blur-md shadow-[0_-10px_25px_rgba(0,0,0,0.1)] ${
              selectedOption === currentQ.correctAnswer
                ? "bg-emerald-50/95 border-emerald-300"
                : "bg-rose-50/95 border-rose-300"
            }`}
          >
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
              {/* Feedback text */}
              <div className="flex items-center gap-3">
                {selectedOption === currentQ.correctAnswer ? (
                  <>
                    <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-sm shrink-0">
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <h4 className="text-base sm:text-lg font-black text-emerald-900 leading-none">
                        Chính xác! 🎉
                      </h4>
                      <p className="text-xs font-bold text-emerald-700 mt-1 hidden sm:block">
                        Tuyệt vời, bạn đã ghi nhớ từ vựng này.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-11 h-11 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-sm shrink-0">
                      <XCircle size={24} />
                    </div>
                    <div>
                      <h4 className="text-base sm:text-lg font-black text-rose-900 leading-none">
                        Chưa chính xác!
                      </h4>
                      <p className="text-xs font-bold text-rose-700 mt-1">
                        Đáp án đúng:{" "}
                        <span className="underline font-black">{currentQ.correctAnswer}</span>
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Action Button */}
              <div className="shrink-0">
                <Button3D
                  variant={selectedOption === currentQ.correctAnswer ? "green" : "orange"}
                  size="md"
                  onClick={handleNext}
                  className="px-6 py-2.5 flex items-center gap-2 font-black shadow-md cursor-pointer text-sm sm:text-base"
                >
                  {currentIndex + 1 < questions.length ? "Tiếp tục" : "Xem kết quả"}{" "}
                  <ArrowRight size={18} />
                  <span className="hidden md:inline-block text-[10px] opacity-75 bg-black/15 px-1.5 py-0.5 rounded ml-1 font-bold">
                    Enter ↵
                  </span>
                </Button3D>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
