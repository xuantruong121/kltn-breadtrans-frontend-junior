"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, WifiOff, Wheat, XCircle } from "lucide-react";
import type { ArenaQuestionKind, MatchData, MatchResult, RoundResultData, RoundStartData } from "@/lib/hooks/useArenaSocket";
import { useAuthStore } from "@/stores/authStore";
import { MatchIntro } from "./components/MatchIntro";
import { MatchResultDialog, type RoundRecord } from "./components/MatchResultDialog";
import { PlayerScoreCard, type RoundMark } from "./components/PlayerScoreCard";
import { RoundTimerBar } from "./components/RoundTimerBar";
import { SoundToggle } from "./components/SoundToggle";
import { arenaSound, buzz } from "./sound/arenaSound";

type Progress = { score: number; answered: number; hasAnsweredCurrentRound?: boolean } | undefined;

interface ArenaMatchRoomProps {
  matchData: MatchData;
  currentRoundData: RoundStartData | null;
  roundResult: RoundResultData | null;
  liveProgress: { p1?: Progress; p2?: Progress } | null;
  matchResult: MatchResult | null;
  opponentDisconnected: { disconnectedUserId: number; disconnectedUserName: string; gracePeriodSeconds: number } | null;
  onSubmitAnswer: (matchId: string, roundIndex: number, selectedOption: string) => void;
  onExit: () => void;
  onRematch: (stake: number) => void;
}

const LETTERS = ["A", "B", "C", "D"];

const KIND_LABEL: Record<ArenaQuestionKind, string> = {
  fill_blank: "Điền từ vào chỗ trống",
  meaning_to_word: "Chọn từ đúng",
  word_to_meaning: "Chọn nghĩa đúng",
};

function roundIdxOf(round: RoundStartData | null): number {
  return round?.roundIndex ?? 0;
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
  onRematch,
}: ArenaMatchRoomProps) {
  const { user } = useAuthStore();
  const reduce = Boolean(useReducedMotion());
  const [selected, setSelected] = useState<Record<number, string>>({});
  const [history, setHistory] = useState<Record<number, RoundRecord>>({});
  const [disconnectLeft, setDisconnectLeft] = useState(15);

  const isP1 = matchData.player1.userId === user?.id;
  const me = isP1 ? matchData.player1 : matchData.player2;
  const rival = isP1 ? matchData.player2 : matchData.player1;
  const myProgress = isP1 ? liveProgress?.p1 : liveProgress?.p2;
  const rivalProgress = isP1 ? liveProgress?.p2 : liveProgress?.p1;
  const totalRounds = matchData.totalRounds || 10;
  const isFinalRound = roundIdxOf(currentRoundData) === totalRounds - 1;
  const question = currentRoundData?.question;
  const roundIdx = currentRoundData?.roundIndex ?? 0;
  const mySelection = selected[roundIdx] ?? null;
  const locked = Boolean(mySelection || roundResult || matchResult);

  // Each revealed round: who was right and the points, for the dots, the pops and the summary.
  const lastRevealed = useRef<number | null>(null);
  useEffect(() => {
    if (!roundResult || lastRevealed.current === roundResult.roundIndex) return;
    lastRevealed.current = roundResult.roundIndex;
    const mine = isP1 ? roundResult.p1 : roundResult.p2;
    const theirs = isP1 ? roundResult.p2 : roundResult.p1;
    setHistory((h) => ({
      ...h,
      [roundResult.roundIndex]: {
        myCorrect: mine.isCorrect,
        myPoints: mine.addedPoints,
        rivalCorrect: theirs.isCorrect,
        rivalPoints: theirs.addedPoints,
      },
    }));
    if (mine.isCorrect) arenaSound.play("correct");
    else {
      arenaSound.play("wrong");
      buzz(60);
    }
  }, [roundResult, isP1]);

  // Sounds for a new round and for the end of the match.
  const lastRound = useRef<number | null>(null);
  useEffect(() => {
    if (!currentRoundData || lastRound.current === currentRoundData.roundIndex) return;
    lastRound.current = currentRoundData.roundIndex;
    arenaSound.play("roundStart");
  }, [currentRoundData]);

  const outcome: "win" | "lose" | "draw" | null = matchResult
    ? matchResult.winnerRole === "draw"
      ? "draw"
      : matchResult.winnerUserId === user?.id
        ? "win"
        : "lose"
    : null;
  useEffect(() => {
    if (!outcome) return;
    arenaSound.play(outcome);
    if (outcome === "win") buzz([40, 60, 40]);
  }, [outcome]);

  // Opponent reconnect window.
  useEffect(() => {
    if (!opponentDisconnected) return;
    const started = Date.now();
    const total = (opponentDisconnected.gracePeriodSeconds || 15) * 1000;
    const id = window.setInterval(() => setDisconnectLeft(Math.max(0, Math.ceil((total - (Date.now() - started)) / 1000))), 250);
    return () => window.clearInterval(id);
  }, [opponentDisconnected]);

  const choose = (option: string) => {
    if (locked || !currentRoundData) return;
    arenaSound.play("select");
    setSelected((s) => ({ ...s, [roundIdx]: option }));
    onSubmitAnswer(matchData.matchId, currentRoundData.roundIndex, option);
  };

  // Keys 1-4 or A-D pick an option.
  const chooseRef = useRef(choose);
  const optionsRef = useRef<string[]>([]);
  useEffect(() => {
    chooseRef.current = choose;
    optionsRef.current = question?.options ?? [];
  });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      const index = ["1", "2", "3", "4"].indexOf(key) >= 0 ? Number(key) - 1 : ["a", "b", "c", "d"].indexOf(key);
      const option = optionsRef.current[index];
      if (option !== undefined) chooseRef.current(option);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const marks = useMemo(() => {
    const mine: RoundMark[] = [];
    const theirs: RoundMark[] = [];
    for (let i = 0; i < totalRounds; i += 1) {
      const r = history[i];
      mine.push(r ? (r.myCorrect ? "correct" : "wrong") : null);
      theirs.push(r ? (r.rivalCorrect ? "correct" : "wrong") : null);
    }
    return { mine, theirs };
  }, [history, totalRounds]);

  const gainKey = roundResult ? roundResult.roundIndex : -1;
  const myGain = roundResult ? { key: gainKey, points: (isP1 ? roundResult.p1 : roundResult.p2).addedPoints } : null;
  const rivalGain = roundResult ? { key: gainKey, points: (isP1 ? roundResult.p2 : roundResult.p1).addedPoints } : null;
  const myResult = roundResult ? (isP1 ? roundResult.p1 : roundResult.p2) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-10">
      <div className="flex items-center justify-between gap-3">
        <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
          Cược {matchData.stake}
          <Wheat size={15} strokeWidth={2.25} aria-hidden="true" />
          <span className="sr-only">Bánh Mì</span>
          <span className="text-slate-400">·</span>
          {question ? `Câu ${roundIdx + 1}/${totalRounds}` : "Chuẩn bị"}
        </p>
        <SoundToggle />
      </div>

      <AnimatePresence>
        {opponentDisconnected && !matchResult && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role="alert"
            className="flex items-center gap-3 rounded-lg bg-amber-50 px-4 py-3 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200"
          >
            <WifiOff size={18} strokeWidth={2.25} aria-hidden="true" />
            <p className="flex-1 text-sm">
              <span className="font-bold">{opponentDisconnected.disconnectedUserName}</span> mất kết nối. Nếu không vào lại, bạn được xử thắng.
            </p>
            <span className="text-lg font-extrabold tabular-nums">{disconnectLeft}s</span>
          </motion.div>
        )}
      </AnimatePresence>

      {!question && !matchResult ? (
        <MatchIntro myName={me.userName} rivalName={rival.userName} stake={matchData.stake} />
      ) : (
        <>
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <PlayerScoreCard
              name={me.userName}
              avatar={me.avatar}
              score={myProgress?.score ?? 0}
              marks={marks.mine}
              side="me"
              answeredNow={Boolean(mySelection)}
              gain={myGain}
            />
            <span className="shrink-0 text-sm font-extrabold text-slate-400" aria-hidden="true">
              VS
            </span>
            <PlayerScoreCard
              name={rival.userName}
              avatar={rival.avatar}
              score={rivalProgress?.score ?? 0}
              marks={marks.theirs}
              side="rival"
              answeredNow={Boolean(rivalProgress?.hasAnsweredCurrentRound) && !roundResult}
              gain={rivalGain}
            />
          </div>

          {question && currentRoundData && (
            <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-7">
              <RoundTimerBar
                key={currentRoundData.roundIndex}
                serverStartTime={currentRoundData.serverStartTime}
                duration={currentRoundData.duration || 12}
                stopped={Boolean(roundResult || matchResult)}
              />

              <AnimatePresence mode="wait">
                <motion.div
                  key={roundIdx}
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, y: -12 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="mt-6 text-center">
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                      {KIND_LABEL[question.kind ?? "word_to_meaning"]}
                      {isFinalRound && <span className="ml-2 rounded-md bg-amber-100 px-2 py-0.5 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">Câu cuối · điểm ×2</span>}
                    </p>
                    {question.kind === "fill_blank" ? (
                      <h2 className="mt-2 text-xl font-bold leading-relaxed text-slate-900 dark:text-slate-100 sm:text-2xl">
                        {question.prompt.split("_____").map((part, i, parts) => (
                          <React.Fragment key={i}>
                            {part}
                            {i < parts.length - 1 && (
                              <span className="mx-1 inline-block min-w-20 border-b-2 border-slate-400 align-baseline dark:border-slate-500" aria-label="chỗ trống">
                                &nbsp;
                              </span>
                            )}
                          </React.Fragment>
                        ))}
                      </h2>
                    ) : (
                      <h2 className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-slate-100 sm:text-3xl">{question.prompt}</h2>
                    )}
                    {question.ipa && (
                      <p className="mt-1 text-base text-slate-500 dark:text-slate-400">/{question.ipa.replace(/^\/+|\/+$/g, "")}/</p>
                    )}
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {question.options.map((option, i) => {
                      const isMine = mySelection === option;
                      const isAnswer = roundResult?.correctAnswer === option;
                      let tone =
                        "border-slate-200 bg-white hover:border-sky-400 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-sky-950/40";
                      if (roundResult) {
                        tone = isAnswer
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
                          : isMine
                            ? "border-rose-400 bg-rose-50 dark:bg-rose-950/40"
                            : "border-slate-200 bg-white opacity-50 dark:border-slate-700 dark:bg-slate-900";
                      } else if (mySelection) {
                        tone = isMine ? "border-sky-500 bg-sky-50 dark:bg-sky-950/40" : "border-slate-200 bg-white opacity-60 dark:border-slate-700 dark:bg-slate-900";
                      }
                      const shake = roundResult && isMine && !isAnswer && !reduce;
                      const pop = roundResult && isAnswer && isMine && !reduce;
                      return (
                        <motion.button
                          key={i}
                          type="button"
                          disabled={locked}
                          onClick={() => choose(option)}
                          animate={shake ? { x: [0, -8, 8, -5, 5, 0] } : pop ? { scale: [1, 1.05, 1] } : undefined}
                          transition={{ duration: 0.4 }}
                          className={`flex min-h-16 items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-base font-semibold text-slate-900 transition-colors disabled:cursor-default dark:text-slate-100 ${tone}`}
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {LETTERS[i]}
                          </span>
                          <span className="flex-1 break-words">{option}</span>
                          {roundResult && isAnswer && <CheckCircle2 size={22} strokeWidth={2.25} className="shrink-0 text-emerald-600" aria-label="Đáp án đúng" />}
                          {roundResult && isMine && !isAnswer && <XCircle size={22} strokeWidth={2.25} className="shrink-0 text-rose-600" aria-label="Bạn chọn sai" />}
                        </motion.button>
                      );
                    })}
                  </div>

                  <div className="mt-5 min-h-[3.5rem]" aria-live="polite">
                    {roundResult && myResult ? (
                      <div className={`rounded-lg px-4 py-3 text-sm ${myResult.isCorrect ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200" : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"}`}>
                        <p className="font-bold">
                          {myResult.isCorrect
                            ? isFinalRound
                              ? `Đúng! +${myResult.addedPoints} điểm (câu cuối nhân đôi)`
                              : `Đúng! +${myResult.addedPoints} điểm (100 + ${myResult.addedPoints - 100} thưởng tốc độ)`
                            : mySelection
                              ? `Chưa đúng. Đáp án là "${roundResult.correctAnswer}".`
                              : `Hết giờ. Đáp án là "${roundResult.correctAnswer}".`}
                        </p>
                        {roundResult.explanation && <p className="mt-1">{roundResult.explanation}</p>}
                      </div>
                    ) : mySelection ? (
                      <p className="text-center text-sm text-slate-600 dark:text-slate-400">Đã chọn. Chờ đối thủ hoặc hết giờ…</p>
                    ) : (
                      <p className="text-center text-sm text-slate-500 dark:text-slate-400">Chọn bằng chuột hoặc phím 1–4</p>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </>
      )}

      {matchResult && outcome && (
        <MatchResultDialog
          outcome={outcome}
          forfeit={Boolean(matchResult.isForfeit)}
          myScore={isP1 ? matchResult.p1.score : matchResult.p2.score}
          rivalScore={isP1 ? matchResult.p2.score : matchResult.p1.score}
          rivalName={rival.userName}
          stake={matchData.stake}
          reward={matchResult.reward}
          rounds={Object.keys(history)
            .map(Number)
            .sort((a, b) => a - b)
            .map((k) => history[k])}
          onRematch={() => onRematch(matchData.stake)}
          onExit={onExit}
        />
      )}
    </div>
  );
}
