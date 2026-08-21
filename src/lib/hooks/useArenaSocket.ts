"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/stores/authStore";
import toast from "react-hot-toast";

export interface ArenaQuestion {
  id: number;
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
  questions: ArenaQuestion[];
  totalRounds: number;
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
  p1: { userId: number; userName: string; score: number };
  p2: { userId: number; userName: string; score: number };
  reward: number;
  isDraw: boolean;
}

export function useArenaSocket() {
  const { user, accessToken } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);

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

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const socket = io(`${wsUrl}/arena`, {
      transports: ["websocket", "polling"],
      auth: { token: accessToken },
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("arena:waiting", () => {
      setIsSearching(true);
    });

    socket.on("arena:cancelled", (data: { message: string }) => {
      setIsSearching(false);
      toast.success(data.message || "Đã hủy tìm trận.");
    });

    socket.on("arena:match_found", (data: MatchData) => {
      setIsSearching(false);
      setMatchData(data);
      setMatchResult(null);
      setCurrentRoundData(null);
      setRoundResult(null);
      setOpponentDisconnected(null);
      setLiveProgress({
        p1: { userId: data.player1.userId, score: 0, answered: 0 },
        p2: { userId: data.player2.userId, score: 0, answered: 0 },
      });
      toast.success("Đã tìm thấy đối thủ! Trận đấu chuẩn bị bắt đầu!", { icon: "⚔️" });
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
      toast.error(data.message || "Đối thủ đang mất kết nối...", { icon: "⚠️" });
    });

    // Opponent reconnected
    socket.on("arena:opponent_reconnected", (data: any) => {
      setOpponentDisconnected(null);
      toast.success(data.message || "Đối thủ đã kết nối lại!", { icon: "🟢" });
    });

    // State restoration when this client reconnected
    socket.on("arena:match_state_restored", (data: any) => {
      setIsSearching(false);
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
          duration: data.remainingSeconds || 15,
          serverStartTime: data.serverStartTime || Date.now(),
          question: data.questions[data.currentRound],
        });
      }
      toast.success("Đã khôi phục lại trận đấu đang diễn ra!", { icon: "⚡" });
    });

    // Match Ended
    socket.on("arena:match_ended", (data: MatchResult) => {
      setMatchResult(data);
      setOpponentDisconnected(null);
      if (data.isForfeit) {
        toast.success("Đối thủ đã bỏ cuộc sau 15s mất kết nối!", { icon: "🏆" });
      }
    });

    socket.on("arena:error", (data: { message: string }) => {
      setIsSearching(false);
      toast.error(data.message || "Lỗi đấu trường");
    });

    return () => {
      socket.disconnect();
    };
  }, [accessToken]);

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

  const resetMatch = useCallback(() => {
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
    joinQueue,
    cancelQueue,
    submitAnswer,
    reconnectMatch,
    resetMatch,
  };
}
