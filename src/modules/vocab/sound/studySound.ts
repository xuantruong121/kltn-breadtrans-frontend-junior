"use client";

import { LOBBY_PLAYLIST } from "@/modules/arena/sound/arenaSoundLogic";
import { DEFAULT_AMBIENCE, layerVolume, nextTrack, parseAmbience, type AmbiencePrefs } from "./studyAmbienceLogic";

/**
 * The study room's sound (owner 2026-11-08): a lofi playlist, a rain loop and
 * card sounds, all CC0 files under public/sounds (see public/sounds/CREDITS.md).
 * Like the Arena's sound, nothing plays before the learner has clicked or
 * typed (`unlock`), music stops while the tab is hidden, and the choices live
 * in localStorage. Two things are its own: music and rain drop low while a
 * word is pronounced (`setDucked`), and go silent while the learner records
 * (`setRecording`), so the microphone hears only the learner.
 *
 * The rain plays through Web Audio from a decoded WAV, so its loop has no gap;
 * an <audio> element would click at every turn.
 */
/** The same lofi playlist as the Arena lobby (owner 2026-11-10 asked for more tracks). */
export const TRACKS = LOBBY_PLAYLIST;
const RAIN_FILE = "/sounds/study/rain.wav";
const SFX_FILES = {
  flip: "/sounds/study/card-flip.wav",
  place: "/sounds/study/card-place.wav",
  correct: "/sounds/arena/correct.wav",
  wrong: "/sounds/arena/wrong.wav",
  done: "/sounds/arena/win.ogg",
} as const;
export type StudySfx = keyof typeof SFX_FILES;
const SFX_VOLUME = 0.45;
const STORAGE_KEY = "breadtrans.study.ambience";

let prefs: AmbiencePrefs = { ...DEFAULT_AMBIENCE };
let started = false;
let unlocked = false;
let active = false;
let ducked = false;
let recording = false;
let track = 0;
let music: HTMLAudioElement | null = null;
let musicFade = 0;
const listeners = new Set<() => void>();

let ctx: AudioContext | null = null;
let rainGain: GainNode | null = null;
let rainSource: AudioBufferSourceNode | null = null;
let rainBuffer: Promise<AudioBuffer | null> | null = null;

function ensureStarted() {
  if (started || typeof window === "undefined") return;
  started = true;
  try {
    prefs = parseAmbience(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    /* storage blocked: keep defaults */
  }
  track = Math.floor(Math.random() * TRACKS.length);
  document.addEventListener("visibilitychange", apply);
}

function save() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* storage blocked */
  }
}

const emit = () => listeners.forEach((fn) => fn());
const live = () => unlocked && active && typeof document !== "undefined" && document.visibilityState === "visible";

/** Moves the music's volume to `to` over a fifth of a second (no jump when a word plays). */
function fadeMusic(to: number) {
  if (!music) return;
  const el = music;
  const from = el.volume;
  const startAt = performance.now();
  const id = ++musicFade;
  const step = (now: number) => {
    if (id !== musicFade) return;
    const k = Math.min(1, (now - startAt) / 200);
    el.volume = Math.min(1, Math.max(0, from + (to - from) * k));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function loadTrack() {
  music?.pause();
  const el = new Audio(TRACKS[track].file);
  el.preload = "auto";
  el.volume = 0;
  el.addEventListener("ended", () => {
    track = nextTrack(track, TRACKS.length);
    loadTrack();
    apply();
    emit();
  });
  music = el;
}

function audioContext(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  rainGain = ctx.createGain();
  rainGain.gain.value = 0;
  rainGain.connect(ctx.destination);
  return ctx;
}

function startRain() {
  const ac = audioContext();
  if (!ac || rainSource) return;
  if (ac.state === "suspended") void ac.resume();
  rainBuffer ??= fetch(RAIN_FILE)
    .then((r) => r.arrayBuffer())
    .then((data) => ac.decodeAudioData(data))
    .catch(() => null);
  void rainBuffer.then((buffer) => {
    if (!buffer || rainSource || !rainGain || !(live() && prefs.rain && !recording)) return;
    const src = ac.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.connect(rainGain);
    src.start();
    rainSource = src;
    apply();
  });
}

function stopRain() {
  try {
    rainSource?.stop();
  } catch {
    /* already stopped */
  }
  rainSource = null;
}

/** Brings every layer in line with the choices and the moment. */
function apply() {
  if (typeof window === "undefined") return;
  const now = live();
  const state = { recording, ducked };

  if (now && prefs.music && !recording) {
    if (!music) loadTrack();
    void music!.play().catch(() => undefined);
    fadeMusic(layerVolume(prefs.musicVolume, state));
  } else if (music) {
    musicFade += 1;
    music.pause();
  }

  if (now && prefs.rain && !recording) {
    startRain();
    if (ctx && rainGain) rainGain.gain.setTargetAtTime(layerVolume(prefs.rainVolume, state), ctx.currentTime, 0.08);
  } else if (rainSource) {
    if (ctx && rainGain) rainGain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
    stopRain();
  }
}

export const studySound = {
  subscribe(fn: () => void) {
    ensureStarted();
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  getPrefs(): AmbiencePrefs {
    ensureStarted();
    return prefs;
  },
  getTrack(): number {
    ensureStarted();
    return track;
  },
  setPrefs(next: Partial<AmbiencePrefs>) {
    ensureStarted();
    prefs = { ...prefs, ...next };
    save();
    apply();
    emit();
  },
  /** Called from a click or a key: browsers allow sound only after one. */
  unlock() {
    ensureStarted();
    if (unlocked) return;
    unlocked = true;
    if (ctx?.state === "suspended") void ctx.resume();
    apply();
  },
  /** The study room is on screen (and not finished). */
  setActive(on: boolean) {
    ensureStarted();
    active = on;
    apply();
  },
  setRecording(on: boolean) {
    if (recording === on) return;
    recording = on;
    apply();
  },
  setDucked(on: boolean) {
    if (ducked === on) return;
    ducked = on;
    apply();
  },
  nextSong() {
    ensureStarted();
    track = nextTrack(track, TRACKS.length);
    if (music) {
      loadTrack();
      apply();
    }
    emit();
  },
  play(name: StudySfx) {
    ensureStarted();
    if (!prefs.sfx || typeof window === "undefined") return;
    try {
      const el = new Audio(SFX_FILES[name]);
      el.volume = SFX_VOLUME;
      void el.play().catch(() => undefined);
    } catch {
      /* no audio */
    }
  },
};
