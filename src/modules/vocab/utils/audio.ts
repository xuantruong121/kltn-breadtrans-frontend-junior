/**
 * Audio and speech synthesis utilities for the Vocabulary Study Room
 */

import { selectSpeechVoice } from "@/lib/dictionary/dictionaryMerge";
import { studySound } from "../sound/studySound";

let activeAudio: HTMLAudioElement | null = null;
/** Each pronunciation gets a number; only the latest one lifts the music back up. */
let speaking = 0;

export type WordAudioResult =
  | "REMOTE_AUDIO"
  | "SPEECH_SYNTHESIS"
  | "UNAVAILABLE"
  | "ERROR";

export function stopCurrentAudio() {
  speaking += 1;
  studySound.setDucked(false);
  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    } catch {
      // ignore
    }
    activeAudio = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
}

/**
 * Pronounces a word. The study room's music and rain drop low while it plays
 * (owner 2026-11-08) and come back when it ends, fails or is cut off; a
 * safety timer lifts them after 8 s in any case.
 */
export function playWordAudio(
  word: string,
  audioUrl?: string,
  accent: "us" | "uk" = "us",
  playbackRate: number = 1.0
): Promise<WordAudioResult> {
  stopCurrentAudio();
  const mine = ++speaking;
  studySound.setDucked(true);
  const lift = () => {
    if (mine === speaking) studySound.setDucked(false);
  };
  const safety = setTimeout(lift, 8000);
  return pronounce(word, audioUrl, accent, playbackRate).then((result) => {
    clearTimeout(safety);
    lift();
    return result;
  });
}

function pronounce(
  word: string,
  audioUrl: string | undefined,
  accent: "us" | "uk",
  playbackRate: number
): Promise<WordAudioResult> {
  return new Promise((resolve) => {
    if (audioUrl && audioUrl.startsWith("http")) {
      const audio = new Audio(audioUrl);
      activeAudio = audio;
      audio.playbackRate = playbackRate;
      let fallbackStarted = false;
      const fallback = () => {
        if (fallbackStarted) return;
        fallbackStarted = true;
        activeAudio = null;
        fallbackSpeechSynthesis(word, accent, playbackRate).then(resolve);
      };
      audio.onended = () => {
        activeAudio = null;
        resolve("REMOTE_AUDIO");
      };
      audio.onerror = () => {
        fallback();
      };
      audio.play().catch(() => {
        fallback();
      });
    } else {
      fallbackSpeechSynthesis(word, accent, playbackRate).then(resolve);
    }
  });
}

function fallbackSpeechSynthesis(
  text: string,
  accent: "us" | "uk",
  playbackRate: number
): Promise<WordAudioResult> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve("UNAVAILABLE");
      return;
    }

    try {
      const synthesis = window.speechSynthesis;
      const voices = synthesis.getVoices();
      const speak = (availableVoices: SpeechSynthesisVoice[]) => {
        const voice = selectSpeechVoice(availableVoices, accent === "uk" ? "UK" : "US");
        if (!voice) {
          resolve("UNAVAILABLE");
          return;
        }
        synthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = voice.lang;
        utterance.voice = voice;
        utterance.rate = Math.min(2, Math.max(0.5, playbackRate));
        utterance.onend = () => resolve("SPEECH_SYNTHESIS");
        utterance.onerror = () => resolve("ERROR");
        synthesis.speak(utterance);
      };
      if (voices.length) {
        speak(voices);
        return;
      }
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        synthesis.removeEventListener("voiceschanged", finish);
        speak(synthesis.getVoices());
      };
      synthesis.addEventListener("voiceschanged", finish, { once: true });
      window.setTimeout(finish, 1200);
    } catch {
      resolve("ERROR");
    }
  });
}

/**
 * Study room sound effects (owner 2026-11-08): CC0 card and chime files
 * played through the study room's sound, so they follow its "Hiệu ứng"
 * switch. It used to synthesise each one in a new AudioContext.
 */
const CHIME_FILE = { success: "correct", error: "wrong", flip: "flip", step: "place" } as const;
export function playChime(type: "success" | "error" | "flip" | "step") {
  studySound.play(CHIME_FILE[type]);
}
