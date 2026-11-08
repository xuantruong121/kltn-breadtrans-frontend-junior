"use client";

import React, { useEffect, useRef, useState } from "react";
import { CloudRain, Headphones, Image as ImageIcon, Layers, Music, SkipForward } from "lucide-react";
import { TRACKS, studySound } from "../sound/studySound";
import { useAmbiencePrefs, useAmbienceTrack } from "../sound/useStudyAmbience";

/** A labelled on/off switch, the same look as the study settings' switches. */
function Switch({ on, onChange, label }: { on: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
        on ? "bg-sky-500" : "bg-slate-300 dark:bg-slate-700"
      }`}
    >
      <span className={`pointer-events-none inline-block size-5 rounded-full bg-white shadow transition duration-200 ${on ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

function Row({ icon: Icon, title, line, children }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; line?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          <Icon size={15} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</p>
          {line && <p className="truncate text-xs text-slate-600 dark:text-slate-400">{line}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function Volume({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <input
      type="range"
      min={0}
      max={100}
      value={Math.round(value * 100)}
      onChange={(e) => onChange(Number(e.target.value) / 100)}
      aria-label={label}
      className="h-1.5 w-full cursor-pointer accent-sky-500"
    />
  );
}

/**
 * The study room's ambience controls (owner 2026-11-08): lofi music with the
 * track name and a skip, rain, the forest scene and the card sounds. Shared
 * by the header's "Không gian" menu and the study settings.
 */
export function AmbienceControls() {
  const prefs = useAmbiencePrefs();
  const track = useAmbienceTrack();
  const set = studySound.setPrefs;
  return (
    <div className="space-y-3.5">
      <div className="space-y-2">
        <Row icon={Music} title="Nhạc lofi" line={prefs.music ? `Đang phát: ${TRACKS[track].title}` : "Đang tắt"}>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => studySound.nextSong()}
              disabled={!prefs.music}
              className="inline-flex size-8 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              aria-label="Bài tiếp theo"
              title="Bài tiếp theo"
            >
              <SkipForward size={15} />
            </button>
            <Switch on={prefs.music} onChange={(music) => set({ music })} label="Nhạc lofi" />
          </div>
        </Row>
        {prefs.music && <Volume value={prefs.musicVolume} onChange={(musicVolume) => set({ musicVolume })} label="Âm lượng nhạc" />}
      </div>

      <div className="space-y-2">
        <Row icon={CloudRain} title="Tiếng mưa" line="Mưa rơi đều, trộn cùng nhạc">
          <Switch on={prefs.rain} onChange={(rain) => set({ rain })} label="Tiếng mưa" />
        </Row>
        {prefs.rain && <Volume value={prefs.rainVolume} onChange={(rainVolume) => set({ rainVolume })} label="Âm lượng mưa" />}
      </div>

      <Row icon={ImageIcon} title="Cảnh rừng mưa" line="Nền động phía sau thẻ">
        <Switch on={prefs.scene} onChange={(scene) => set({ scene })} label="Cảnh rừng mưa" />
      </Row>

      <Row icon={Layers} title="Âm thanh lật thẻ" line="Lật thẻ, đúng, sai, qua bước">
        <Switch on={prefs.sfx} onChange={(sfx) => set({ sfx })} label="Âm thanh lật thẻ" />
      </Row>
    </div>
  );
}

/** The header's "Không gian" button and its drop-down. */
export function AmbienceMenu() {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", away);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
          open ? "border-sky-500/60 bg-sky-500/15 text-white" : "border-slate-700 bg-slate-800 text-slate-300 hover:text-white"
        }`}
        title="Nhạc, mưa và cảnh nền"
      >
        <Headphones size={14} className={open ? "text-sky-300" : "text-slate-500"} aria-hidden="true" />
        <span className="hidden sm:inline">Không gian</span>
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Không gian học"
          className="glass-face dark absolute right-0 top-full z-40 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-slate-700 bg-slate-900 p-4 text-left shadow-2xl"
        >
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-300">Không gian học</p>
          <AmbienceControls />
        </div>
      )}
    </div>
  );
}
