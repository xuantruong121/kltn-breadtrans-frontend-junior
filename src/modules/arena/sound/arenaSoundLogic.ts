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
