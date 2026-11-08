"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import toast from "react-hot-toast";
import { MATCH_END_QUERY_KEYS, WALLET_QUERY_KEYS } from "@/modules/arena/arenaWallet";

export type ArenaQuestionKind = "fill_blank" | "meaning_to_word" | "word_to_meaning";

export interface ArenaQuestion {
  id: number;
  /** Absent on servers older than the three-kind duel. */
  kind?: ArenaQuestionKind;
  prompt: string;
  ipa?: string;
  options: string[];
}

export interface MatchData {
  roomId: string;
  matchId: string;
  stake: number;
  player1: { userId: number; userName: string; avatar?: string };
  player2: { userId: number; userName: string; avatar?: string };
  /** Empty: each question arrives with its round. */
  questions: ArenaQuestion[];
  totalRounds: number;
  roundSeconds?: number;
}

export interface RoundStartData {
  matchId: string;
  roundIndex: number;
  totalRounds: number;
  duration: number;
  serverStartTime: number;
  question: ArenaQuestion;
}

export interface RoundResultData {
  roundIndex: number;
  correctAnswer: string;
  explanation: string;
  p1: {
    userId: number;
    selectedOption: string | null;
    isCorrect: boolean;
    addedPoints: number;
    score: number;
  };
  p2: {
    userId: number;
    selectedOption: string | null;
    isCorrect: boolean;
    addedPoints: number;
    score: number;
  };
}

export interface MatchResult {
  matchId: string;
  winnerRole: "p1" | "p2" | "draw";
  winnerUserId: number | null;
  isForfeit?: boolean;
  /** Why a forfeit happened: the loser left on purpose, or lost connection for 15 s. */
  forfeitReason?: "left" | "disconnected" | null;
  // xp: 5 per correct answer, capped at 150 Arena XP a day (xpCapped).
  p1: { userId: number; userName: string; score: number; xp?: number; xpCapped?: boolean };
  p2: { userId: number; userName: string; score: number; xp?: number; xpCapped?: boolean };
  reward: number;
  isDraw: boolean;
}

/** A match the server cancelled and refunded, e.g. after it restarted mid-match. */
export interface AbortedMatchNotice {
  matchId: string;
  refunded: number;
  reason: "server_restart" | "stale_escrow";
}

export function useArenaSocket() {
  const { user, accessToken } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);
  const queryClient = useQueryClient();

  const [isConnected, setIsConnected] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [matchData, setMatchData] = useState<MatchData | null>(null);

  // Round State
  const [currentRoundData, setCurrentRoundData] = useState<RoundStartData | null>(null);
  const [roundResult, setRoundResult] = useState<RoundResultData | null>(null);

  // Live Scores
  const [liveProgress, setLiveProgress] = useState<{
    p1: { userId: number; score: number; answered: number; hasAnsweredCurrentRound?: boolean };
    p2: { userId: number; score: number; answered: number; hasAnsweredCurrentRound?: boolean };
  } | null>(null);

  // Final Match Result
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);

  // Reconnection & Disconnect Status
  const [opponentDisconnected, setOpponentDisconnected] = useState<{
    disconnectedUserId: number;
    disconnectedUserName: string;
    gracePeriodSeconds: number;
  } | null>(null);

  const [abortedNotice, setAbortedNotice] = useState<AbortedMatchNotice | null>(null);
  // The match in progress, read by the reconnect handler without re-subscribing.
  const activeMatchRef = useRef<string | null>(null);
  const abortedSeenRef = useRef<string | null>(null);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const socket = io(`${wsUrl}/arena`, {
      transports: ["websocket", "polling"],
      auth: { token: accessToken },
      autoConnect: true,
    });

    socketRef.current = socket;
    // The server moves Bánh Mì when it escrows the stakes (match found), pays or
    // refunds them (match ended) and on a cancelled search; refresh every copy.
    const refresh = (keys: readonly (readonly string[])[]) => {
      for (const queryKey of keys) void queryClient.invalidateQueries({ queryKey: [...queryKey] });
    };

    socket.on("connect", () => {
      setIsConnected(true);
      // After a dropped connection the server keeps the match for 15 s; ask to
      // rejoin it. If the server restarted, it answers arena:match_aborted.
      if (activeMatchRef.current) socket.emit("reconnect_match", { matchId: activeMatchRef.current });
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("arena:waiting", () => {
      setIsSearching(true);
    });

    socket.on("arena:cancelled", (data: { message: string }) => {
      setIsSearching(false);
      refresh(WALLET_QUERY_KEYS);
      toast.success(data.message || "Đã hủy tìm trận.");
    });

    socket.on("arena:match_found", (data: MatchData) => {
      setIsSearching(false);
      refresh(WALLET_QUERY_KEYS);
      activeMatchRef.current = data.matchId;
      setMatchData(data);
      setMatchResult(null);
      setCurrentRoundData(null);
      setRoundResult(null);
      setOpponentDisconnected(null);
      setLiveProgress({
        p1: { userId: data.player1.userId, score: 0, answered: 0 },
        p2: { userId: data.player2.userId, score: 0, answered: 0 },
      });
      toast.success("Đã tìm thấy đối thủ! Trận đấu chuẩn bị bắt đầu!");
    });

    // Synchronized Round Start
    socket.on("arena:round_start", (data: RoundStartData) => {
      setCurrentRoundData(data);
      setRoundResult(null);
      setOpponentDisconnected(null);
    });

    // Synchronized Round Result (Reveals answer & explanation)
    socket.on("arena:round_result", (data: RoundResultData) => {
      setRoundResult(data);
      setLiveProgress((prev) => {
        if (!prev) return null;
        return {
          p1: { ...prev.p1, score: data.p1.score },
          p2: { ...prev.p2, score: data.p2.score },
        };
      });
    });

    // Live progress updates (e.g. player submitted)
    socket.on("arena:progress_update", (data: any) => {
      setLiveProgress(data);
    });

    // Opponent disconnected with 15s grace period
    socket.on("arena:opponent_disconnected", (data: any) => {
      setOpponentDisconnected({
        disconnectedUserId: data.disconnectedUserId,
        disconnectedUserName: data.disconnectedUserName || "Đối thủ",
        gracePeriodSeconds: data.gracePeriodSeconds || 15,
      });
      toast.error(data.message || "Đối thủ đang mất kết nối...");
    });

    // Opponent reconnected
    socket.on("arena:opponent_reconnected", (data: any) => {
      setOpponentDisconnected(null);
      toast.success(data.message || "Đối thủ đã kết nối lại!");
    });

    // State restoration when this client reconnected
    socket.on("arena:match_state_restored", (data: any) => {
      setIsSearching(false);
      activeMatchRef.current = data.matchId;
      setMatchData({
        roomId: data.matchId,
        matchId: data.matchId,
        stake: data.stake,
        player1: data.player1,
        player2: data.player2,
        questions: data.questions,
        totalRounds: data.totalRounds,
      });
      setLiveProgress({
        p1: { userId: data.player1.userId, score: data.p1.score, answered: data.p1.answered },
        p2: { userId: data.player2.userId, score: data.p2.score, answered: data.p2.answered },
      });
      if (data.questions && data.questions[data.currentRound]) {
        setCurrentRoundData({
          matchId: data.matchId,
          roundIndex: data.currentRound,
          totalRounds: data.totalRounds,
          duration: data.remainingSeconds || 12,
          serverStartTime: data.serverStartTime || Date.now(),
          question: data.questions[data.currentRound],
        });
      }
      toast.success("Đã khôi phục lại trận đấu đang diễn ra!");
    });

    // Match Ended
    socket.on("arena:match_ended", (data: MatchResult) => {
      activeMatchRef.current = null;
      setMatchResult(data);
      refresh(MATCH_END_QUERY_KEYS);
      setOpponentDisconnected(null);
      // The result dialog says why a forfeit happened (left or disconnected).
    });

    // The server cancelled the match and gave both stakes back. It can say so
    // twice (on connection and in answer to reconnect_match); show it once.
    socket.on("arena:match_aborted", (data: AbortedMatchNotice) => {
      refresh(MATCH_END_QUERY_KEYS);
      if (abortedSeenRef.current === data.matchId) return;
      abortedSeenRef.current = data.matchId;
      activeMatchRef.current = null;
      setMatchData(null);
      setMatchResult(null);
      setCurrentRoundData(null);
      setRoundResult(null);
      setLiveProgress(null);
      setOpponentDisconnected(null);
      setIsSearching(false);
      setAbortedNotice(data);
    });

    socket.on("arena:error", (data: { message: string }) => {
      setIsSearching(false);
      toast.error(data.message || "Lỗi đấu trường");
    });

    return () => {
      socket.disconnect();
    };
  }, [accessToken, queryClient]);

  const joinQueue = useCallback(
    (stake: number = 20) => {
      if (!socketRef.current || !user) return;
      setIsSearching(true);
      socketRef.current.emit("join_queue", {
        userId: user.id,
        userName: (user as any).profile?.fullName || (user as any).name || user.email,
        stake,
        gameId: "vocab-duel",
      });
    },
    [user]
  );

  const cancelQueue = useCallback(() => {
    if (!socketRef.current || !user) return;
    socketRef.current.emit("cancel_queue", { userId: user.id });
    setIsSearching(false);
  }, [user]);

  const submitAnswer = useCallback(
    (matchId: string, roundIndex: number, selectedOption: string) => {
      if (!socketRef.current || !user) return;
      socketRef.current.emit("submit_answer", {
        matchId,
        userId: user.id,
        roundIndex,
        selectedOption,
      });
    },
    [user]
  );

  const reconnectMatch = useCallback(
    (matchId: string) => {
      if (!socketRef.current || !user) return;
      socketRef.current.emit("reconnect_match", {
        matchId,
        userId: user.id,
      });
    },
    [user]
  );

  /** Leave the running match: the server ends it at once and the rival wins. */
  const leaveMatch = useCallback((matchId: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit("leave_match", { matchId });
  }, []);

  const dismissAbortedNotice = useCallback(() => setAbortedNotice(null), []);

  const resetMatch = useCallback(() => {
    activeMatchRef.current = null;
    setMatchData(null);
    setMatchResult(null);
    setCurrentRoundData(null);
    setRoundResult(null);
    setLiveProgress(null);
    setOpponentDisconnected(null);
    setIsSearching(false);
  }, []);

  return {
    isConnected,
    isSearching,
    matchData,
    currentRoundData,
    roundResult,
    liveProgress,
    matchResult,
    opponentDisconnected,
    abortedNotice,
    dismissAbortedNotice,
    joinQueue,
    cancelQueue,
    submitAnswer,
    reconnectMatch,
    leaveMatch,
    resetMatch,
  };
}
