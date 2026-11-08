"use client";

import React from "react";
import { Music, Music2, Volume2, VolumeX } from "lucide-react";
import { arenaSound } from "../sound/arenaSound";
import { useSoundPrefs } from "../sound/useArenaSound";

/** Two small toggles: background music and sound effects. Remembered per browser. */
export function SoundToggle({ tone = "light" }: { tone?: "light" | "dark" }) {
  const prefs = useSoundPrefs();
  const base =
    tone === "dark"
      ? "text-white/80 hover:bg-white/10 aria-pressed:text-white"
      : "text-slate-600 hover:bg-slate-100 aria-pressed:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800";
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Âm thanh">
      <button
        type="button"
        aria-pressed={prefs.music}
        onClick={() => {
          arenaSound.unlock();
          arenaSound.setPrefs({ music: !prefs.music });
        }}
        className={`rounded-lg p-2 transition-colors ${base}`}
        title={prefs.music ? "Tắt nhạc nền" : "Bật nhạc nền"}
      >
        {prefs.music ? <Music size={18} strokeWidth={2.25} /> : <Music2 size={18} strokeWidth={2.25} className="opacity-50" />}
        <span className="sr-only">{prefs.music ? "Tắt nhạc nền" : "Bật nhạc nền"}</span>
      </button>
      <button
        type="button"
        aria-pressed={prefs.sfx}
        onClick={() => {
          arenaSound.unlock();
          arenaSound.setPrefs({ sfx: !prefs.sfx });
        }}
        className={`rounded-lg p-2 transition-colors ${base}`}
        title={prefs.sfx ? "Tắt hiệu ứng âm thanh" : "Bật hiệu ứng âm thanh"}
      >
        {prefs.sfx ? <Volume2 size={18} strokeWidth={2.25} /> : <VolumeX size={18} strokeWidth={2.25} />}
        <span className="sr-only">{prefs.sfx ? "Tắt hiệu ứng âm thanh" : "Bật hiệu ứng âm thanh"}</span>
      </button>
    </div>
  );
}
