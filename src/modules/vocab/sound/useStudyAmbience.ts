"use client";

import { useEffect, useSyncExternalStore } from "react";
import { DEFAULT_AMBIENCE, type AmbiencePrefs } from "./studyAmbienceLogic";
import { studySound } from "./studySound";

/** The ambience choices, kept in sync across the header panel and the settings. */
export function useAmbiencePrefs(): AmbiencePrefs {
  return useSyncExternalStore(studySound.subscribe, studySound.getPrefs, () => DEFAULT_AMBIENCE);
}

/** Which lofi track is playing (an index into TRACKS). */
export function useAmbienceTrack(): number {
  return useSyncExternalStore(studySound.subscribe, studySound.getTrack, () => 0);
}

/**
 * Plays the room's music and rain while `active` (the study room is open and
 * not finished), silent while `recording`. Sound starts at the learner's first
 * click or key, as browsers require, and stops when the room closes.
 */
export function useStudyAmbience(active: boolean, recording: boolean) {
  useEffect(() => {
    const start = () => studySound.unlock();
    window.addEventListener("pointerdown", start, { once: true });
    window.addEventListener("keydown", start, { once: true });
    return () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
    };
  }, []);
  useEffect(() => {
    studySound.setActive(active);
  }, [active]);
  useEffect(() => {
    studySound.setRecording(recording);
  }, [recording]);
  useEffect(() => () => studySound.setActive(false), []);
}
