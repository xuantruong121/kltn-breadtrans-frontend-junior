"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/stores/authStore";
import toast from "react-hot-toast";

export interface ArenaQuestion {
  id: number;
  prompt: string;
  ipa?: string;
  correctAnswer: string;
  options: string[];
}

export interface MatchData {
  roomId: string;
  stake: number;
  player1: { userId: number; userName: string };
  player2: { userId: number; userName: string };
  questions: ArenaQuestion[];
}

export interface MatchResult {
  winnerRole: string;
  winnerUserId: number | null;
  p1: { userId: number; score: number };
  p2: { userId: number; score: number };
  reward: number;
}

export function useArenaSocket() {
  const { user, accessToken } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [liveProgress, setLiveProgress] = useState<{
    p1: { userId: number; score: number; answered: number };
    p2: { userId: number; score: number; answered: number };
  } | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);

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
      setLiveProgress({
        p1: { userId: data.player1.userId, score: 0, answered: 0 },
        p2: { userId: data.player2.userId, score: 0, answered: 0 },
      });
      toast.success("Đã tìm thấy đối thủ! Trận đấu bắt đầu!", { icon: "⚔️" });
    });

    socket.on("arena:progress_update", (data: any) => {
      setLiveProgress(data);
    });

    socket.on("arena:match_ended", (data: MatchResult) => {
      setMatchResult(data);
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
    if (!socketRef.current) return;
    socketRef.current.emit("cancel_queue");
    setIsSearching(false);
  }, []);

  const submitAnswer = useCallback(
    (roomId: string, questionIndex: number, isCorrect: boolean) => {
      if (!socketRef.current || !user) return;
      socketRef.current.emit("submit_answer", {
        roomId,
        userId: user.id,
        questionIndex,
        isCorrect,
      });
    },
    [user]
  );

  const resetMatch = useCallback(() => {
    setMatchData(null);
    setMatchResult(null);
    setLiveProgress(null);
    setIsSearching(false);
  }, []);

  return {
    isConnected,
    isSearching,
    matchData,
    liveProgress,
    matchResult,
    joinQueue,
    cancelQueue,
    submitAnswer,
    resetMatch,
  };
}
