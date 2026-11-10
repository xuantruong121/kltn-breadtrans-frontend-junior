/**
 * The Arena's sound choices and its lobby playlist as plain values
 * (owner 2026-11-09: one music control for the whole page, lofi in the
 * lobby). No audio, no DOM.
 */
export type SoundPrefs = {
  music: boolean;
  sfx: boolean;
  /** 0 to 1 */
  musicVolume: number;
  /** The animated city behind the lobby. */
  scene: boolean;
};

export const DEFAULT_SOUND_PREFS: SoundPrefs = { music: true, sfx: true, musicVolume: 0.3, scene: true };

/** The lobby's lofi tracks (CC0, Holizna; see public/sounds/CREDITS.md), shared with the study room. */
export const LOBBY_PLAYLIST = [
  { file: "/sounds/study/first-snow.mp3", title: "First Snow" },
  { file: "/sounds/study/snow-drift.mp3", title: "Snow Drift" },
  { file: "/sounds/study/laundry-on-the-wire.mp3", title: "Laundry On The Wire" },
  { file: "/sounds/study/everything-you-ever-dreamed.mp3", title: "Everything You Ever Dreamed" },
  { file: "/sounds/study/keeping-cool.mp3", title: "Keeping Cool" },
  { file: "/sounds/study/windows-down.mp3", title: "Windows Down" },
  { file: "/sounds/study/2-hour-delay.mp3", title: "2 Hour Delay" },
  { file: "/sounds/study/glad-to-be-stuck-inside.mp3", title: "Glad To Be Stuck Inside" },
  { file: "/sounds/study/vintage.mp3", title: "Vintage" },
  { file: "/sounds/study/morning-coffee.mp3", title: "Morning Coffee" },
  { file: "/sounds/study/a-little-shade.mp3", title: "A Little Shade" },
  { file: "/sounds/study/ghosts.mp3", title: "Ghosts" },
  { file: "/sounds/study/whatever.mp3", title: "Whatever" },
  { file: "/sounds/study/ramen.mp3", title: "Ramen" },
  { file: "/sounds/study/pretty-little-lies.mp3", title: "Pretty Little Lies" },
  { file: "/sounds/study/so-broke.mp3", title: "So Broke" },
  { file: "/sounds/study/come-again.mp3", title: "Come Again" },
  { file: "/sounds/study/something-in-the-air.mp3", title: "Something In the Air" },
  { file: "/sounds/study/waves.mp3", title: "Waves" },
  { file: "/sounds/study/creature-comforts.mp3", title: "Creature Comforts" },
  { file: "/sounds/study/foggy-headed.mp3", title: "Foggy Headed" },
] as const;

export const clampVolume = (v: unknown, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback;

/** Saved choices read back; anything missing or broken (older saves had only music and sfx) falls back. */
export function parseSoundPrefs(raw: string | null): SoundPrefs {
  if (!raw) return { ...DEFAULT_SOUND_PREFS };
  try {
    const p = JSON.parse(raw) as Partial<Record<keyof SoundPrefs, unknown>> | null;
    if (!p || typeof p !== "object") return { ...DEFAULT_SOUND_PREFS };
    return {
      music: p.music !== false,
      sfx: p.sfx !== false,
      musicVolume: clampVolume(p.musicVolume, DEFAULT_SOUND_PREFS.musicVolume),
      scene: p.scene !== false,
    };
  } catch {
    return { ...DEFAULT_SOUND_PREFS };
  }
}

/** The playlist goes round. */
export const nextTrack = (current: number, count: number) => (count > 0 ? (current + 1) % count : 0);
