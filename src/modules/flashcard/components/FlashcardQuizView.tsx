"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Trophy, RotateCcw, ArrowRight, Sparkles, Volume2 } from "lucide-react";
import { FlashcardWord } from "../types";
import { Button3D } from "@/components/ui";
import { useGamificationStore } from "@/stores/gamificationStore";

interface FlashcardQuizViewProps {
  words: FlashcardWord[];
  allWords: FlashcardWord[];
  onFinish: () => void;
}

interface Question {
  targetWord: FlashcardWord;
  options: string[];
  correctAnswer: string;
}

export const FlashcardQuizView: React.FC<FlashcardQuizViewProps> = ({
  words,
  allWords,
  onFinish,
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const { addBreads, addExp } = useGamificationStore();

  // Generate questions
  useEffect(() => {
    if (words.length === 0) return;

    const generated: Question[] = words.map((target) => {
      // Pick 3 distractors from allWords
      const otherWords = allWords.filter((w) => w.id !== target.id);
      const shuffledOthers = [...otherWords].sort(() => 0.5 - Math.random());
      const distractors = shuffledOthers.slice(0, 3).map((w) => w.mean);
      
      const options = [...distractors, target.mean].sort(() => 0.5 - Math.random());
      return {
        targetWord: target,
        options,
        correctAnswer: target.mean,
      };
    });

    setQuestions(generated.sort(() => 0.5 - Math.random()));
    setCurrentIndex(0);
    setScore(0);
    setIsComplete(false);
  }, [words, allWords]);

  const currentQ = questions[currentIndex];

  const handleSelectOption = (option: string) => {
    if (isAnswered) return;

    setSelectedOption(option);
    setIsAnswered(true);

    if (option === currentQ.correctAnswer) {
      setScore((s) => s + 1);
      // Reward small exp on the fly
      addExp(10);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setIsComplete(true);
      // Reward Breads at completion
      const earnedBreads = Math.max(5, score * 3);
      addBreads(earnedBreads);
      addExp(score * 20);
    }
  };

  const playWordAudio = () => {
    if (!currentQ || !("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(currentQ.targetWord.word);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  };

  if (questions.length === 0) {
    return <div className="text-center py-12 font-bold text-slate-400">Đang chuẩn bị câu hỏi...</div>;
  }

  // Completion Screen
  if (isComplete) {
    const accuracy = Math.round((score / questions.length) * 100);
    const earnedBreads = Math.max(5, score * 3);

    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto bg-white rounded-[2.5rem] border-4 border-slate-200 shadow-[0_12px_0_0_#e2e8f0] p-8 text-center"
      >
        <div className="w-24 h-24 rounded-full bg-amber-100 border-4 border-amber-300 mx-auto flex items-center justify-center mb-6 shadow-inner">
          <Trophy size={48} className="text-amber-500" />
        </div>

        <h2 className="text-3xl font-black text-slate-800 mb-2">Hoàn Thành Quiz!</h2>
        <p className="font-bold text-slate-400 mb-6">Bạn đã hoàn thành xuất sắc bài kiểm tra từ vựng.</p>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-sky-50 border-2 border-sky-200 rounded-2xl p-4">
            <span className="text-xs font-black text-sky-500 uppercase">Chính xác</span>
            <p className="text-3xl font-black text-sky-700">{accuracy}%</p>
          </div>
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
            <span className="text-xs font-black text-amber-500 uppercase">Bánh Mì Thưởng</span>
            <p className="text-3xl font-black text-amber-700 flex items-center justify-center gap-1">
              +{earnedBreads} <span className="text-lg">🍞</span>
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button3D variant="orange" size="lg" onClick={() => {
            setCurrentIndex(0);
            setSelectedOption(null);
            setIsAnswered(false);
            setScore(0);
            setIsComplete(false);
          }}>
            <RotateCcw size={20} /> Làm lại bài này
          </Button3D>
          <Button3D variant="white" size="md" onClick={onFinish}>
            Quay lại Flashcard
          </Button3D>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      {/* Progress & Score Bar */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex-1 bg-slate-200 h-4 rounded-full overflow-hidden border-2 border-slate-300">
          <div 
            className="bg-emerald-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
        <span className="font-black text-slate-600 text-sm">
          {currentIndex + 1} / {questions.length}
        </span>
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-[2rem] border-4 border-slate-200 shadow-[0_10px_0_0_#e2e8f0] p-8 mb-6 text-center">
        <div className="inline-flex items-center gap-2 bg-sky-50 border-2 border-sky-200 px-4 py-2 rounded-2xl mb-4">
          <span className="text-xs font-black text-sky-600 uppercase tracking-wider">Từ vựng</span>
          <button onClick={playWordAudio} className="text-sky-500 hover:text-sky-700">
            <Volume2 size={18} />
          </button>
        </div>

        <h3 className="text-4xl font-black text-slate-800 mb-2">
          {currentQ.targetWord.word}
        </h3>
        <p className="font-mono text-slate-400 font-bold mb-4">
          {currentQ.targetWord.ipa}
        </p>
        <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
          Chọn nghĩa tiếng Việt chính xác:
        </p>
      </div>

      {/* Options List */}
      <div className="grid grid-cols-1 gap-3.5 mb-6">
        {currentQ.options.map((option, idx) => {
          let stateStyle = "bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-[0_4px_0_0_#cbd5e1]";

          if (isAnswered) {
            if (option === currentQ.correctAnswer) {
              stateStyle = "bg-emerald-50 border-2 border-emerald-500 text-emerald-800 shadow-[0_4px_0_0_#059669] font-black";
            } else if (option === selectedOption) {
              stateStyle = "bg-rose-50 border-2 border-rose-500 text-rose-800 shadow-[0_4px_0_0_#e11d48] font-bold";
            } else {
              stateStyle = "bg-slate-50 border-2 border-slate-200 text-slate-400 opacity-60";
            }
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelectOption(option)}
              disabled={isAnswered}
              className={`w-full p-4 rounded-2xl text-left font-bold text-base transition-all select-none flex items-center justify-between active:translate-y-[2px] active:shadow-none cursor-pointer ${stateStyle}`}
            >
              <span>{option}</span>
              {isAnswered && option === currentQ.correctAnswer && (
                <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
              )}
              {isAnswered && option === selectedOption && option !== currentQ.correctAnswer && (
                <XCircle size={20} className="text-rose-500 shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Next Button */}
      {isAnswered && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-end"
        >
          <Button3D variant="orange" size="lg" onClick={handleNext} className="w-full">
            Tiếp tục <ArrowRight size={20} />
          </Button3D>
        </motion.div>
      )}
    </div>
  );
};
