/**
 * The study room's ambience (owner 2026-11-08: lofi music, a rainy forest,
 * rain sound, card sounds), as plain values: the learner's choices, which
 * track plays next, how loud each layer is right now, and the colour shift
 * that turns the sunny CC0 forest into a rainy dusk. No DOM, no audio.
 */
export type AmbiencePrefs = {
  music: boolean;
  rain: boolean;
  sfx: boolean;
  scene: boolean;
  /** 0 to 1 */
  musicVolume: number;
  rainVolume: number;
};

export const DEFAULT_AMBIENCE: AmbiencePrefs = {
  music: true,
  rain: false,
  sfx: true,
  scene: true,
  musicVolume: 0.25,
  rainVolume: 0.35,
};

/** Music and rain drop to this share while a word is pronounced. */
export const DUCK_SHARE = 0.2;

export const clampVolume = (v: unknown, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback;

/** Saved choices, read back; anything missing or broken falls back to the defaults. */
export function parseAmbience(raw: string | null): AmbiencePrefs {
  if (!raw) return { ...DEFAULT_AMBIENCE };
  try {
    const p = JSON.parse(raw) as Partial<Record<keyof AmbiencePrefs, unknown>>;
    if (!p || typeof p !== "object") return { ...DEFAULT_AMBIENCE };
    const flag = (k: "music" | "rain" | "sfx" | "scene") => (typeof p[k] === "boolean" ? (p[k] as boolean) : DEFAULT_AMBIENCE[k]);
    return {
      music: flag("music"),
      rain: flag("rain"),
      sfx: flag("sfx"),
      scene: flag("scene"),
      musicVolume: clampVolume(p.musicVolume, DEFAULT_AMBIENCE.musicVolume),
      rainVolume: clampVolume(p.rainVolume, DEFAULT_AMBIENCE.rainVolume),
    };
  } catch {
    return { ...DEFAULT_AMBIENCE };
  }
}

/** The playlist goes round: after the last track comes the first. */
export const nextTrack = (current: number, count: number) => (count > 0 ? (current + 1) % count : 0);

/**
 * How loud a layer should be now: silent while the learner records (the
 * microphone must not hear it), lowered while a word is pronounced.
 */
export function layerVolume(base: number, state: { recording: boolean; ducked: boolean }): number {
  if (state.recording) return 0;
  return state.ducked ? base * DUCK_SHARE : base;
}

/**
 * Rainy dusk from a sunny autumn layer: every pixel darkened and cooled,
 * alpha kept. `mul` is per channel, applied in place to RGBA data.
 */
export const DUSK: [number, number, number] = [0.42, 0.45, 0.62];
export function tintPixels(data: Uint8ClampedArray, mul: [number, number, number] = DUSK) {
  for (let i = 0; i < data.length; i += 4) {
    data[i] = data[i] * mul[0];
    data[i + 1] = data[i + 1] * mul[1];
    data[i + 2] = data[i + 2] * mul[2];
  }
}
