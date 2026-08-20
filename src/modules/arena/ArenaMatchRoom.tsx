"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ArrowRight
} from "lucide-react";
import { Button3D } from "@/components/ui";
import { MatchData, MatchResult } from "@/lib/hooks/useArenaSocket";
import { useAuthStore } from "@/stores/authStore";
import Confetti from "react-confetti";

interface ArenaMatchRoomProps {
  matchData: MatchData;
  liveProgress: any;
  matchResult: MatchResult | null;
  onSubmitAnswer: (roomId: string, questionIndex: number, isCorrect: boolean) => void;
  onExit: () => void;
}

export default function ArenaMatchRoom({
  matchData,
  liveProgress,
  matchResult,
  onSubmitAnswer,
  onExit,
}: ArenaMatchRoomProps) {
  const { user } = useAuthStore();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);

  const questions = matchData.questions;
  const currentQ = questions[currentIdx];

  const isPlayer1 = matchData.player1.userId === user?.id;
  const myInfo = isPlayer1 ? matchData.player1 : matchData.player2;
  const opponentInfo = isPlayer1 ? matchData.player2 : matchData.player1;

  const myProgress = isPlayer1 ? liveProgress?.p1 : liveProgress?.p2;
  const opponentProgress = isPlayer1 ? liveProgress?.p2 : liveProgress?.p1;

  const moveToNextQuestion = useCallback(() => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setTimeLeft(15);
    }
  }, [currentIdx, questions.length]);

  const handleTimeOut = useCallback(() => {
    setIsAnswered(true);
    onSubmitAnswer(matchData.roomId, currentIdx, false);
    setTimeout(() => {
      moveToNextQuestion();
    }, 1500);
  }, [matchData.roomId, currentIdx, onSubmitAnswer, moveToNextQuestion]);

  // Timer countdown per question
  useEffect(() => {
    if (matchResult || isAnswered) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentIdx, isAnswered, matchResult, handleTimeOut]);

  const handleSelectOption = (option: string) => {
    if (isAnswered || matchResult) return;
    setSelectedOption(option);
    setIsAnswered(true);

    const isCorrect = option === currentQ.correctAnswer;
    onSubmitAnswer(matchData.roomId, currentIdx, isCorrect);

    setTimeout(() => {
      moveToNextQuestion();
    }, 1200);
  };

  const isMeWinner = matchResult?.winnerUserId === user?.id;
  const isDraw = matchResult?.winnerRole === "draw";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* HEADER SCOREBOARD 1v1 */}
      <div className="bg-white rounded-[2.5rem] border-4 border-slate-200 shadow-[0_10px_0_0_#e2e8f0] p-6 relative overflow-hidden">
        <div className="flex items-center justify-between gap-4">
          {/* My Player Panel */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-sky-100 border-3 border-sky-400 flex items-center justify-center text-2xl font-black shadow-inner">
              🧙‍♂️
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-slate-800 text-lg">{myInfo.userName}</span>
                <span className="text-xs bg-sky-500 text-white font-extrabold px-2 py-0.5 rounded-md">BẠN</span>
              </div>
              <p className="font-black text-sky-600 text-2xl tracking-tight">
                {myProgress?.score || 0} <span className="text-xs text-slate-400 font-bold uppercase">Điểm</span>
              </p>
            </div>
          </div>

          {/* VS Center Badge & Timer */}
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-orange-500 border-4 border-orange-600 flex items-center justify-center text-white font-black shadow-md animate-pulse">
              VS
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
              <Clock size={13} /> {timeLeft}s
            </div>
          </div>

          {/* Opponent Panel */}
          <div className="flex items-center gap-3 text-right">
            <div>
              <div className="flex items-center justify-end gap-1.5">
                <span className="text-xs bg-rose-100 text-rose-700 font-extrabold px-2 py-0.5 rounded-md">ĐỐI THỦ</span>
                <span className="font-black text-slate-800 text-lg">{opponentInfo.userName}</span>
              </div>
              <p className="font-black text-rose-500 text-2xl tracking-tight">
                {opponentProgress?.score || 0} <span className="text-xs text-slate-400 font-bold uppercase">Điểm</span>
              </p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-rose-100 border-3 border-rose-400 flex items-center justify-center text-2xl font-black shadow-inner">
              🥷
            </div>
          </div>
        </div>

        {/* Live Race Progress Bar */}
        <div className="mt-6 pt-4 border-t-2 border-slate-100">
          <div className="flex justify-between text-xs font-black text-slate-400 mb-1.5">
            <span>Tiến độ của bạn: {myProgress?.answered || 0}/{questions.length}</span>
            <span>Cược: {matchData.stake} 🍞</span>
            <span>Đối thủ: {opponentProgress?.answered || 0}/{questions.length}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden border border-slate-200">
              <div
                className="bg-sky-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${((myProgress?.answered || 0) / questions.length) * 100}%` }}
              />
            </div>
            <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden border border-slate-200">
              <div
                className="bg-rose-500 h-full rounded-full transition-all duration-300 ml-auto"
                style={{ width: `${((opponentProgress?.answered || 0) / questions.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* QUESTION CARD */}
      {!matchResult && currentQ && (
        <motion.div
          key={currentIdx}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2.5rem] border-4 border-slate-200 shadow-[0_10px_0_0_#e2e8f0] p-8 space-y-6"
        >
          <div className="flex items-center justify-between">
            <span className="bg-purple-100 text-purple-800 font-extrabold text-xs px-3 py-1 rounded-full border border-purple-200">
              Câu hỏi {currentIdx + 1} / {questions.length}
            </span>
            {currentQ.ipa && (
              <span className="text-slate-400 font-bold text-sm tracking-wider">
                /{currentQ.ipa}/
              </span>
            )}
          </div>

          <h3 className="text-2xl font-black text-slate-800 text-center leading-relaxed py-2">
            {currentQ.prompt}
          </h3>

          {/* 4 Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {currentQ.options.map((opt, oIdx) => {
              const isSelected = selectedOption === opt;
              const isCorrectOpt = opt === currentQ.correctAnswer;

              let btnStyle = "bg-slate-50 border-slate-200 hover:border-sky-300 hover:bg-sky-50 text-slate-700";
              if (isAnswered) {
                if (isCorrectOpt) {
                  btnStyle = "bg-emerald-100 border-emerald-400 text-emerald-800 ring-2 ring-emerald-400";
                } else if (isSelected && !isCorrectOpt) {
                  btnStyle = "bg-rose-100 border-rose-400 text-rose-800";
                } else {
                  btnStyle = "opacity-40 border-slate-200";
                }
              }

              return (
                <button
                  key={oIdx}
                  disabled={isAnswered}
                  onClick={() => handleSelectOption(opt)}
                  className={`p-5 rounded-2xl border-3 font-bold text-left transition-all text-base flex items-center justify-between cursor-pointer ${btnStyle}`}
                >
                  <span>{opt}</span>
                  {isAnswered && isCorrectOpt && <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />}
                  {isAnswered && isSelected && !isCorrectOpt && <XCircle size={20} className="text-rose-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* MATCH RESULT MODAL */}
      <AnimatePresence>
        {matchResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          >
            {isMeWinner && <Confetti recycle={false} numberOfPieces={300} />}

            <div className="bg-white max-w-md w-full rounded-[2.5rem] border-4 border-slate-200 shadow-[0_12px_0_0_#cbd5e1] p-8 text-center space-y-6">
              <div className="w-24 h-24 mx-auto rounded-3xl bg-amber-100 border-4 border-amber-300 flex items-center justify-center text-5xl shadow-lg">
                {isMeWinner ? "🏆" : isDraw ? "🤝" : "💔"}
              </div>

              <div>
                <h2 className="text-3xl font-black text-slate-800">
                  {isMeWinner ? "CHIẾN THẮNG!" : isDraw ? "HÒA NHAU!" : "THUA CUỘC!"}
                </h2>
                <p className="font-bold text-slate-400 text-sm mt-1">
                  {isMeWinner
                    ? `Xuất sắc! Bạn đã đánh bại đối thủ và giành trọn phần thưởng.`
                    : isDraw
                    ? `Trận đấu ngang tài ngang sức! Tiền cược đã được hoàn lại.`
                    : `Đừng nản lòng, hãy ôn tập từ vựng thêm và phục thù nhé!`}
                </p>
              </div>

              <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 flex items-center justify-around">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Điểm của bạn</span>
                  <p className="text-2xl font-black text-sky-600">
                    {isPlayer1 ? matchResult.p1.score : matchResult.p2.score}
                  </p>
                </div>
                <div className="h-10 w-0.5 bg-amber-200" />
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Bánh Mì Thưởng</span>
                  <p className="text-2xl font-black text-amber-600">
                    {isMeWinner ? `+${matchResult.reward} 🍞` : isDraw ? `Hoàn cược` : `-${matchData.stake} 🍞`}
                  </p>
                </div>
              </div>

              <Button3D variant="orange" size="lg" className="w-full" onClick={onExit}>
                Về Sảnh Đấu Trường <ArrowRight size={18} />
              </Button3D>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
