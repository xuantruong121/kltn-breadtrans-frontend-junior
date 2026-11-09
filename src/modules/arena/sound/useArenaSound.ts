"use client";

import { useEffect, useSyncExternalStore } from "react";
import { arenaSound, type MusicTrack, type SoundPrefs } from "./arenaSound";
import { DEFAULT_SOUND_PREFS } from "./arenaSoundLogic";

/** Sound preferences for the toggles, kept in sync across components. */
export function useSoundPrefs(): SoundPrefs {
  return useSyncExternalStore(arenaSound.subscribe, arenaSound.getPrefs, () => DEFAULT_SOUND_PREFS);
}

/** The lobby track playing now, and whether music is sounding (for the music dock). */
export function useArenaTrack(): { track: number; playing: boolean } {
  const track = useSyncExternalStore(arenaSound.subscribe, arenaSound.getTrack, () => 0);
  const playing = useSyncExternalStore(arenaSound.subscribe, arenaSound.isPlaying, () => false);
  return { track, playing };
}

/** Plays `track` while the calling screen is mounted (once audio is unlocked). */
export function useArenaMusic(track: MusicTrack | null) {
  useEffect(() => {
    arenaSound.setMusic(track);
  }, [track]);
  useEffect(() => () => arenaSound.stop(), []);
}
