import { create } from "zustand";

/** How long the thú ảo keeps its level-up pose after a level-up. */
export const PET_LEVEL_UP_POSE_MS = 5000;

interface LevelUpState {
  /** True for a few seconds after the thú ảo went up a level (not persisted). */
  petLevelUp: boolean;
  celebratePet: () => void;
}

let poseTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Set by LevelUpWatcher when the pet goes up a level, by feeding or by study
 * EXP alike; every pet on screen (pet page, dashboard card, floating pet)
 * reads it to take the level-up pose (owner 2026-11-24).
 */
export const useLevelUpStore = create<LevelUpState>()((set) => ({
  petLevelUp: false,
  celebratePet: () => {
    if (poseTimer) clearTimeout(poseTimer);
    set({ petLevelUp: true });
    poseTimer = setTimeout(() => {
      poseTimer = null;
      set({ petLevelUp: false });
    }, PET_LEVEL_UP_POSE_MS);
  },
}));
