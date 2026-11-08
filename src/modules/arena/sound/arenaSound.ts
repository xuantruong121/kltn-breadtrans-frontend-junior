/**
 * Arena audio: short effects and two background loops, all CC0 files under
 * public/sounds/arena (see public/sounds/CREDITS.md). Browsers only allow
 * sound after the user has interacted with the page, so nothing plays until
 * `unlock()` runs from a click. Music pauses while the tab is hidden.
 * Preferences live in localStorage; a blocked storage simply keeps defaults.
 */
export type SfxName = "select" | "correct" | "wrong" | "tick" | "matchFound" | "roundStart" | "win" | "lose" | "draw";
export type MusicTrack = "lobby" | "battle";
export type SoundPrefs = { music: boolean; sfx: boolean };

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
const MUSIC_FILES: Record<MusicTrack, string> = {
  lobby: "/sounds/arena/lobby.mp3",
  battle: "/sounds/arena/battle.mp3",
};
const MUSIC_VOLUME = 0.35;
const SFX_VOLUME = 0.6;
const STORAGE_KEY = "breadtrans.arena.sound";

let prefs: SoundPrefs = { music: true, sfx: true };
let unlocked = false;
let wantedTrack: MusicTrack | null = null;
let music: HTMLAudioElement | null = null;
let musicTrack: MusicTrack | null = null;
const listeners = new Set<() => void>();

function readPrefs() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SoundPrefs>;
      prefs = { music: parsed.music !== false, sfx: parsed.sfx !== false };
    }
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
  document.addEventListener("visibilitychange", syncMusic);
}

function syncMusic() {
  const shouldPlay = unlocked && prefs.music && wantedTrack !== null && document.visibilityState === "visible";
  if (!shouldPlay) {
    music?.pause();
    return;
  }
  if (!music || musicTrack !== wantedTrack) {
    music?.pause();
    music = new Audio(MUSIC_FILES[wantedTrack!]);
    music.loop = true;
    music.volume = MUSIC_VOLUME;
    musicTrack = wantedTrack;
  }
  void music.play().catch(() => undefined);
}

function emit() {
  for (const listener of listeners) listener();
}

export const arenaSound = {
  /** Call from a click handler: the first user gesture allows audio. */
  unlock() {
    ensureStarted();
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
  /** The loop for the current screen; null stops the music. */
  setMusic(track: MusicTrack | null) {
    ensureStarted();
    wantedTrack = track;
    syncMusic();
  },
  getPrefs(): SoundPrefs {
    ensureStarted();
    return prefs;
  },
  setPrefs(next: Partial<SoundPrefs>) {
    ensureStarted();
    prefs = { ...prefs, ...next };
    savePrefs();
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
