"use client";

import { useEffect, useSyncExternalStore } from "react";
import { arenaSound, type MusicTrack, type SoundPrefs } from "./arenaSound";

const SERVER_PREFS: SoundPrefs = { music: true, sfx: true };

/** Sound preferences for the toggles, kept in sync across components. */
export function useSoundPrefs(): SoundPrefs {
  return useSyncExternalStore(arenaSound.subscribe, arenaSound.getPrefs, () => SERVER_PREFS);
}

/** Plays `track` while the calling screen is mounted (once audio is unlocked). */
export function useArenaMusic(track: MusicTrack | null) {
  useEffect(() => {
    arenaSound.setMusic(track);
  }, [track]);
  useEffect(() => () => arenaSound.stop(), []);
}
