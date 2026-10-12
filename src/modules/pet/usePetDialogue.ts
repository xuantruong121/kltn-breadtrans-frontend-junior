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
  satietyState?: string;
  streak?: number;
  todayQuests?: Array<{ isCompleted: boolean }>;
  enabled?: boolean;
}

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export function usePetDialogue(options: UsePetDialogueOptions) {
  const {
    petName,
    satiety,
    satietyState,
    streak = 0,
    todayQuests = [],
    enabled = true,
  } = options;

  const [dialogue, setDialogue] = useState<PetDialogueContent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isBouncing, setIsBouncing] = useState(false);

  const pokeIndexRef = useRef(0);
  const reopenTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prevSatietyRef = useRef<number | undefined>(satiety);
  const hasInitializedRef = useRef(false);

  const clearReopenTimer = useCallback(() => {
    if (reopenTimerRef.current) {
      clearTimeout(reopenTimerRef.current);
      reopenTimerRef.current = null;
    }
  }, []);

  const resolveCurrentDialogue = useCallback(
    (forcePoke = false) => {
      const completedCount = todayQuests.filter((q) => q.isCompleted).length;
      const totalCount = todayQuests.length;
      const isStreakAtRisk = totalCount > 0 && completedCount === 0;

      return resolvePetDialogue({
        petName,
        satiety,
        idleDurationMs: 0,
        streak,
        isStreakAtRisk,
        completedQuestsCount: completedCount,
        totalQuestsCount: totalCount,
        allowGreeting: true,
        forcePoke,
        pokeMessageIndex: pokeIndexRef.current,
      });
    },
    [petName, satiety, streak, todayQuests],
  );

  const showDialogue = useCallback(
    (forcePoke = false) => {
      clearReopenTimer();
      const content = resolveCurrentDialogue(forcePoke);
      if (content) {
        setDialogue(content);
        setIsVisible(true);
      }
    },
    [clearReopenTimer, resolveCurrentDialogue],
  );

  // User actively dismisses with X button: hide and reopen after 5 minutes
  const dismiss = useCallback(() => {
    clearReopenTimer();
    setIsVisible(false);

    // Automatically reopen dialogue after 5 minutes
    reopenTimerRef.current = setTimeout(() => {
      pokeIndexRef.current = (pokeIndexRef.current + 1) % POKE_MESSAGES.length;
      showDialogue();
    }, FIVE_MINUTES_MS);
  }, [clearReopenTimer, showDialogue]);

  // 1. Automatically show dialogue when user opens web / logs in (enabled becomes true)
  useEffect(() => {
    if (!enabled) {
      hasInitializedRef.current = false;
      return;
    }

    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      showDialogue();
    }
  }, [enabled, showDialogue]);

  // 2. Hunger trigger: when pet is hungry or becomes hungry, show dialogue immediately
  useEffect(() => {
    if (!enabled) return;

    const isHungry =
      satiety !== undefined &&
      (satiety < 50 || satietyState === "HUNGRY" || satietyState === "VERY_HUNGRY");
    const wasHungry =
      prevSatietyRef.current !== undefined && prevSatietyRef.current < 50;
    prevSatietyRef.current = satiety;

    // If pet transitions to hungry while dialogue is closed, show hungry dialogue immediately
    if (isHungry && !wasHungry && !isVisible) {
      showDialogue();
    }
  }, [enabled, satiety, satietyState, isVisible, showDialogue]);

  // Trigger bounce animation when pet is poked or clicked
  const triggerBounce = useCallback(() => {
    setIsBouncing(true);
    setTimeout(() => setIsBouncing(false), 500);
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearReopenTimer();
    };
  }, [clearReopenTimer]);

  return {
    dialogue,
    isVisible,
    isBouncing,
    triggerBounce,
    pokePet: triggerBounce,
    dismiss,
    showDialogue,
  };
}

export default usePetDialogue;
