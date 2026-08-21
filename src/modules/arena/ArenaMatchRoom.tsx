"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ArrowRight,
  WifiOff,
  Sparkles,
  Zap
} from "lucide-react";
import { Button3D } from "@/components/ui";
import { 
  MatchData, 
  RoundStartData, 
  RoundResultData, 
  MatchResult 
} from "@/lib/hooks/useArenaSocket";
import { useAuthStore } from "@/stores/authStore";
import Confetti from "react-confetti";

interface ArenaMatchRoomProps {
  matchData: MatchData;
  currentRoundData: RoundStartData | null;
  roundResult: RoundResultData | null;
  liveProgress: any;
  matchResult: MatchResult | null;
  opponentDisconnected: {
    disconnectedUserId: number;
    disconnectedUserName: string;
    gracePeriodSeconds: number;
  } | null;
  onSubmitAnswer: (matchId: string, roundIndex: number, selectedOption: string) => void;
  onExit: () => void;
}

export default function ArenaMatchRoom({
  matchData,
  currentRoundData,
  roundResult,
  liveProgress,
  matchResult,
  opponentDisconnected,
  onSubmitAnswer,
  onExit,
}: ArenaMatchRoomProps) {
  const { user } = useAuthStore();
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(15);
  const [disconnectTimer, setDisconnectTimer] = useState(15);

  const isPlayer1 = matchData.player1.userId === user?.id;
  const myInfo = isPlayer1 ? matchData.player1 : matchData.player2;
  const opponentInfo = isPlayer1 ? matchData.player2 : matchData.player1;

  const myProgress = isPlayer1 ? liveProgress?.p1 : liveProgress?.p2;
  const opponentProgress = isPlayer1 ? liveProgress?.p2 : liveProgress?.p1;

  const currentQ = currentRoundData?.question;
  const roundIdx = currentRoundData?.roundIndex ?? 0;
  const totalRounds = matchData.totalRounds || 5;

  const selectedOption = selectedAnswers[roundIdx] || null;
  const hasSubmitted = !!selectedOption;

  // Server-authoritative timer calculation
  useEffect(() => {
    if (!currentRoundData || matchResult || roundResult) return;

    const calculateRemaining = () => {
      const serverStart = currentRoundData.serverStartTime;
      const durationMs = (currentRoundData.duration || 15) * 1000;
      const elapsed = Date.now() - serverStart;
      const remaining = Math.max(0, Math.ceil((durationMs - elapsed) / 1000));
      setTimeLeft(remaining);
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 200);
    return () => clearInterval(interval);
  }, [currentRoundData, matchResult, roundResult]);

  // Opponent disconnect countdown timer
  useEffect(() => {
    if (!opponentDisconnected) return;

    const startTime = Date.now();
    const totalDuration = (opponentDisconnected.gracePeriodSeconds || 15) * 1000;

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, Math.ceil((totalDuration - elapsed) / 1000));
      setDisconnectTimer(remaining);
    };

    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [opponentDisconnected]);

  const handleSelectOption = (option: string) => {
    if (hasSubmitted || !currentRoundData || roundResult || matchResult) return;
    setSelectedAnswers((prev) => ({ ...prev, [roundIdx]: option }));
    onSubmitAnswer(matchData.matchId, currentRoundData.roundIndex, option);
  };

  const isMeWinner = matchResult?.winnerUserId === user?.id;
  const isDraw = matchResult?.winnerRole === "draw";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* OPPONENT DISCONNECT WARNING BANNER */}
      <AnimatePresence>
        {opponentDisconnected && !matchResult && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-amber-500 text-white p-4 rounded-2xl border-4 border-amber-600 shadow-md flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 rounded-xl">
                <WifiOff size={24} className="animate-pulse" />
              </div>
              <div>
                <h4 className="font-black text-base">
                  Đối thủ ({opponentDisconnected.disconnectedUserName}) đang mất kết nối!
                </h4>
                <p className="text-xs font-bold text-amber-100">
                  Hệ thống đang chờ đối thủ kết nối lại. Nếu quá thời gian, bạn sẽ tự động được xử thắng.
                </p>
              </div>
            </div>
            <div className="px-4 py-2 bg-white text-amber-600 rounded-xl font-black text-lg shrink-0 shadow-xs flex items-center gap-1.5">
              <Clock size={18} /> {disconnectTimer}s
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER SCOREBOARD 1v1 */}
      <div className="bg-white rounded-[2.5rem] border-4 border-slate-200 shadow-[0_10px_0_0_#e2e8f0] p-6 relative overflow-hidden">
        <div className="flex items-center justify-between gap-4">
          {/* My Player Panel */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-sky-100 border-3 border-sky-400 flex items-center justify-center text-2xl font-black shadow-inner">
              {myInfo.avatar ? (
                <img src={myInfo.avatar} alt="" className="w-full h-full object-cover rounded-xl" />
              ) : (
                "🧙‍♂️"
              )}
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
            <div className="w-12 h-12 rounded-full bg-orange-500 border-4 border-orange-600 flex items-center justify-center text-white font-black shadow-md">
              VS
            </div>
            <div
              className={`flex items-center gap-1 mt-2 text-xs font-black px-3 py-1 rounded-full border transition-colors ${
                timeLeft <= 3
                  ? "bg-rose-50 border-rose-300 text-rose-600 animate-bounce"
                  : "bg-amber-50 border-amber-200 text-amber-600"
              }`}
            >
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
              {opponentInfo.avatar ? (
                <img src={opponentInfo.avatar} alt="" className="w-full h-full object-cover rounded-xl" />
              ) : (
                "🥷"
              )}
            </div>
          </div>
        </div>

        {/* Live Race Progress Bar */}
        <div className="mt-6 pt-4 border-t-2 border-slate-100">
          <div className="flex justify-between text-xs font-black text-slate-400 mb-1.5">
            <span>Tiến độ của bạn: {myProgress?.answered || 0}/{totalRounds}</span>
            <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-extrabold border border-amber-200">
              Mức cược: {matchData.stake} 🍞
            </span>
            <span>Đối thủ: {opponentProgress?.answered || 0}/{totalRounds}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden border border-slate-200">
              <div
                className="bg-sky-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${((myProgress?.answered || 0) / totalRounds) * 100}%` }}
              />
            </div>
            <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden border border-slate-200">
              <div
                className="bg-rose-500 h-full rounded-full transition-all duration-300 ml-auto"
                style={{ width: `${((opponentProgress?.answered || 0) / totalRounds) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* QUESTION CARD */}
      {!matchResult && currentQ && (
        <motion.div
          key={roundIdx}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2.5rem] border-4 border-slate-200 shadow-[0_10px_0_0_#e2e8f0] p-6 sm:p-8 space-y-6"
        >
          <div className="flex items-center justify-between">
            <span className="bg-purple-100 text-purple-800 font-extrabold text-xs px-3.5 py-1.5 rounded-full border border-purple-200 flex items-center gap-1.5">
              <Sparkles size={14} /> Hiệp {roundIdx + 1} / {totalRounds}
            </span>
            {currentQ.ipa && (
              <span className="text-slate-400 font-bold text-sm tracking-wider bg-slate-100 px-3 py-1 rounded-xl">
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
              const isCorrectOpt = roundResult?.correctAnswer === opt;

              let btnStyle = "bg-slate-50 border-slate-200 hover:border-sky-300 hover:bg-sky-50 text-slate-700";

              if (roundResult) {
                // Server revealed results
                if (isCorrectOpt) {
                  btnStyle = "bg-emerald-100 border-emerald-500 text-emerald-800 ring-2 ring-emerald-400 scale-[1.02]";
                } else if (isSelected && !isCorrectOpt) {
                  btnStyle = "bg-rose-100 border-rose-400 text-rose-800";
                } else {
                  btnStyle = "opacity-40 border-slate-200 bg-slate-50";
                }
              } else if (hasSubmitted) {
                // Waiting for round to end
                if (isSelected) {
                  btnStyle = "bg-sky-50 border-sky-400 text-sky-800 ring-2 ring-sky-300";
                } else {
                  btnStyle = "opacity-50 border-slate-200";
                }
              }

              return (
                <button
                  key={oIdx}
                  disabled={hasSubmitted || !!roundResult}
                  onClick={() => handleSelectOption(opt)}
                  className={`p-5 rounded-2xl border-3 font-bold text-left transition-all text-base flex items-center justify-between cursor-pointer ${btnStyle}`}
                >
                  <span>{opt}</span>
                  {roundResult && isCorrectOpt && (
                    <CheckCircle2 size={22} className="text-emerald-600 shrink-0" />
                  )}
                  {roundResult && isSelected && !isCorrectOpt && (
                    <XCircle size={22} className="text-rose-600 shrink-0" />
                  )}
                  {!roundResult && isSelected && hasSubmitted && (
                    <span className="text-xs bg-sky-500 text-white font-black px-2 py-0.5 rounded-md animate-pulse">
                      Đã chọn
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ROUND RESULT EXPLANATION BANNER */}
          <AnimatePresence>
            {roundResult && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-4 space-y-2 mt-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-900 font-black text-sm">
                    <Zap size={18} className="text-amber-500" />
                    {isPlayer1
                      ? roundResult.p1.isCorrect
                        ? `Tuyệt vời! +${roundResult.p1.addedPoints} Điểm (Bao gồm thưởng tốc độ)`
                        : `Chưa chính xác (0 Điểm)`
                      : roundResult.p2.isCorrect
                      ? `Tuyệt vời! +${roundResult.p2.addedPoints} Điểm (Bao gồm thưởng tốc độ)`
                      : `Chưa chính xác (0 Điểm)`}
                  </div>
                  <span className="text-xs font-bold text-indigo-500">Chuẩn bị hiệp tiếp theo...</span>
                </div>
                {roundResult.explanation && (
                  <p className="text-xs font-bold text-slate-600 leading-relaxed">
                    💡 <b>Giải thích:</b> {roundResult.explanation}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* WAITING OVERLAY IF ROUND NOT YET STARTED */}
      {!matchResult && !currentQ && (
        <div className="bg-white rounded-[2.5rem] border-4 border-slate-200 shadow-sm p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-amber-100 border-4 border-amber-300 rounded-3xl mx-auto flex items-center justify-center text-3xl animate-bounce">
            ⚔️
          </div>
          <h3 className="text-2xl font-black text-slate-800">Trận Đấu Đang Khởi Động</h3>
          <p className="text-sm font-bold text-slate-400">
            Hệ thống đang chuẩn bị câu hỏi và đồng bộ đồng hồ thi đấu với đối thủ...
          </p>
        </div>
      )}

      {/* MATCH RESULT MODAL */}
      <AnimatePresence>
        {matchResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          >
            {isMeWinner && <Confetti recycle={false} numberOfPieces={350} />}

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
                    ? matchResult.isForfeit
                      ? `Đối thủ đã bỏ cuộc sau 15s mất mạng. Bạn giành chiến thắng!`
                      : `Xuất sắc! Bạn đã đánh bại đối thủ và giành trọn ${matchResult.reward} Bánh Mì.`
                    : isDraw
                    ? `Trận đấu ngang tài ngang sức! Tiền cược đã được hoàn lại.`
                    : `Đừng nản lòng, hãy trau dồi từ vựng và phục thù ở trận sau nhé!`}
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
                  <span className="text-xs font-bold text-slate-400 uppercase">Bánh Mì</span>
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
