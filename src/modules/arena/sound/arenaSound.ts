import { LOBBY_PLAYLIST, nextTrack, parseSoundPrefs, DEFAULT_SOUND_PREFS, type SoundPrefs } from "./arenaSoundLogic";

/**
 * Arena audio: short effects, the lobby's lofi playlist and the match loop,
 * all CC0 files (see public/sounds/CREDITS.md). Browsers only allow sound
 * after the user has interacted with the page, so nothing plays until
 * `unlock()` runs from a click. Music pauses while the tab is hidden.
 * Preferences (music, effects, music volume, the lobby scene) live in
 * localStorage; a blocked storage simply keeps defaults.
 *
 * Owner 2026-11-09: the lobby plays lofi, track after track, with one music
 * control for the whole Arena page (ArenaMusicDock); matches keep the faster
 * loop.
 */
export type SfxName = "select" | "correct" | "wrong" | "tick" | "matchFound" | "roundStart" | "win" | "lose" | "draw";
export type MusicTrack = "lobby" | "battle";
export type { SoundPrefs };

const SFX_FILES: Record<SfxName, string> = {
  select: "/sounds/arena/select.wav",
  correct: "/sounds/arena/correct.wav",
  wrong: "/sounds/arena/wrong.wav",
  tick: "/sounds/arena/tick.wav",
  matchFound: "/sounds/arena/match-found.wav",
  roundStart: "/sounds/arena/round-start.wav",
  win: "/sounds/arena/win.ogg",
  lose: "/sounds/arena/lose.ogg",
  draw: "/sounds/arena/draw.ogg",
};
const BATTLE_FILE = "/sounds/arena/battle.mp3";
const SFX_VOLUME = 0.6;
const STORAGE_KEY = "breadtrans.arena.sound";

let prefs: SoundPrefs = { ...DEFAULT_SOUND_PREFS };
let unlocked = false;
let wantedTrack: MusicTrack | null = null;
let music: HTMLAudioElement | null = null;
/** What `music` is playing: "battle", or "lobby:<index>". */
let loaded: string | null = null;
let lobbyIndex = 0;
const listeners = new Set<() => void>();

function readPrefs() {
  try {
    prefs = parseSoundPrefs(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    /* storage blocked: keep defaults */
  }
}

function savePrefs() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* storage blocked */
  }
}

let started = false;
function ensureStarted() {
  if (started || typeof window === "undefined") return;
  started = true;
  readPrefs();
  lobbyIndex = Math.floor(Math.random() * LOBBY_PLAYLIST.length);
  document.addEventListener("visibilitychange", syncMusic);
}

function emit() {
  for (const listener of listeners) listener();
}

/** Whether music is actually sounding now (for the dock's spinning record). */
const sounding = () =>
  typeof document !== "undefined" && unlocked && prefs.music && wantedTrack !== null && document.visibilityState === "visible";

function syncMusic() {
  if (!sounding()) {
    music?.pause();
    emit();
    return;
  }
  const want = wantedTrack === "battle" ? "battle" : `lobby:${lobbyIndex}`;
  if (!music || loaded !== want) {
    music?.pause();
    const file = wantedTrack === "battle" ? BATTLE_FILE : LOBBY_PLAYLIST[lobbyIndex].file;
    const el = new Audio(file);
    el.loop = wantedTrack === "battle";
    if (wantedTrack === "lobby")
      el.addEventListener("ended", () => {
        lobbyIndex = nextTrack(lobbyIndex, LOBBY_PLAYLIST.length);
        syncMusic();
      });
    music = el;
    loaded = want;
  }
  music.volume = prefs.musicVolume;
  void music.play().catch(() => undefined);
  emit();
}

export const arenaSound = {
  /** Call from a click handler: the first user gesture allows audio. */
  unlock() {
    ensureStarted();
    if (unlocked) return;
    unlocked = true;
    syncMusic();
  },
  play(name: SfxName) {
    ensureStarted();
    if (!unlocked || !prefs.sfx) return;
    const audio = new Audio(SFX_FILES[name]);
    audio.volume = SFX_VOLUME;
    void audio.play().catch(() => undefined);
  },
  /** The music for the current screen; null stops it. */
  setMusic(track: MusicTrack | null) {
    ensureStarted();
    wantedTrack = track;
    syncMusic();
  },
  /** The next lobby track (the dock's skip button). */
  nextSong() {
    ensureStarted();
    lobbyIndex = nextTrack(lobbyIndex, LOBBY_PLAYLIST.length);
    syncMusic();
    emit();
  },
  getPrefs(): SoundPrefs {
    ensureStarted();
    return prefs;
  },
  /** The lobby track now (an index into LOBBY_PLAYLIST). */
  getTrack(): number {
    ensureStarted();
    return lobbyIndex;
  },
  isPlaying(): boolean {
    return sounding();
  },
  setPrefs(next: Partial<SoundPrefs>) {
    ensureStarted();
    prefs = { ...prefs, ...next };
    savePrefs();
    if (music) music.volume = prefs.musicVolume;
    syncMusic();
    emit();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  /** Stop everything, e.g. when leaving the arena. */
  stop() {
    wantedTrack = null;
    music?.pause();
    emit();
  },
};

/** Light vibration on phones for the moments that matter; ignored elsewhere. */
export function buzz(pattern: number | number[]) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
  } catch {
    /* not supported */
  }
}
