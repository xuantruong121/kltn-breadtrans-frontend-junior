"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  type PetDialogueContent,
  resolvePetDialogue,
  POKE_MESSAGES,
} from "./dialogueLogic";

export interface UsePetDialogueOptions {
  petName?: string;
  satiety?: number;
  streak?: number;
  todayQuests?: Array<{ isCompleted: boolean }>;
  enabled?: boolean;
}

export function usePetDialogue(options: UsePetDialogueOptions) {
  const { petName, satiety, streak = 0, todayQuests = [], enabled = true } = options;

  const [dialogue, setDialogue] = useState<PetDialogueContent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isBouncing, setIsBouncing] = useState(false);

  const pokeIndexRef = useRef(0);
  const lastProactiveTimeRef = useRef(0);
  const lastActivityTimeRef = useRef(0);
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearDismissTimer = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    clearDismissTimer();
    setIsVisible(false);
  }, [clearDismissTimer]);

  const showDialogue = useCallback(
    (content: PetDialogueContent, autoDismissDurationMs = 8000) => {
      clearDismissTimer();
      setDialogue(content);
      setIsVisible(true);
      dismissTimerRef.current = setTimeout(() => {
        setIsVisible(false);
      }, autoDismissDurationMs);
    },
    [clearDismissTimer],
  );

  // Trigger poke on click
  const pokePet = useCallback(() => {
    // 1. Trigger spring bounce animation
    setIsBouncing(true);
    setTimeout(() => setIsBouncing(false), 600);

    // 2. Resolve poke dialogue with rotating message
    const currentIndex = pokeIndexRef.current;
    pokeIndexRef.current = (pokeIndexRef.current + 1) % POKE_MESSAGES.length;

    const content = resolvePetDialogue({
      petName,
      forcePoke: true,
      pokeMessageIndex: currentIndex,
    });

    if (content) {
      showDialogue(content, 7000);
    }
  }, [petName, showDialogue]);

  // Track user activity to determine idle duration
  useEffect(() => {
    if (!enabled) return;
    lastActivityTimeRef.current = Date.now();
    const updateActivity = () => {
      lastActivityTimeRef.current = Date.now();
    };
    window.addEventListener("mousemove", updateActivity, { passive: true });
    window.addEventListener("keydown", updateActivity, { passive: true });
    window.addEventListener("click", updateActivity, { passive: true });
    return () => {
      window.removeEventListener("mousemove", updateActivity);
      window.removeEventListener("keydown", updateActivity);
      window.removeEventListener("click", updateActivity);
    };
  }, [enabled]);

  // Proactive dialogue loop: checks every 15s with 60s cooldown
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      const now = Date.now();
      // Enforce 60-second cooldown between proactive messages
      if (now - lastProactiveTimeRef.current < 60_000) {
        return;
      }

      const lastActivity = lastActivityTimeRef.current || now;
      const idleDurationMs = Math.max(0, now - lastActivity);
      const completedCount = todayQuests.filter((q) => q.isCompleted).length;
      const totalCount = todayQuests.length;
      const isStreakAtRisk = totalCount > 0 && completedCount === 0;

      const proactive = resolvePetDialogue({
        petName,
        satiety,
        idleDurationMs,
        streak,
        isStreakAtRisk,
        completedQuestsCount: completedCount,
        totalQuestsCount: totalCount,
      });

      if (proactive) {
        lastProactiveTimeRef.current = now;
        showDialogue(proactive, 8500);
      }
    }, 15_000);

    return () => clearInterval(interval);
  }, [enabled, petName, satiety, streak, todayQuests, showDialogue]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => clearDismissTimer();
  }, [clearDismissTimer]);

  return {
    dialogue,
    isVisible,
    isBouncing,
    pokePet,
    dismiss,
  };
}

export default usePetDialogue;
