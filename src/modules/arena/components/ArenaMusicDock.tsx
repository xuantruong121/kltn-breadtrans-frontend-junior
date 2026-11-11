"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, Disc3, Image as ImageIcon, Pause, Play, SkipForward, SlidersHorizontal, Volume2 } from "lucide-react";
import { arenaSound } from "../sound/arenaSound";
import { LOBBY_PLAYLIST } from "../sound/arenaSoundLogic";
import { useArenaTrack, useSoundPrefs } from "../sound/useArenaSound";

const DOCK_KEY = "breadtrans.arena.dock";

/** The saved choice; with none, folded on a phone (the open bar would cover the lobby). */
function readCollapsed(): boolean {
  try {
    const saved = window.localStorage.getItem(DOCK_KEY);
    if (saved) return saved === "collapsed";
  } catch {
    /* storage blocked */
  }
  return window.innerWidth < 640;
}

function Switch({ on, label, onChange }: { on: boolean; label: string; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${on ? "bg-amber-500" : "bg-slate-600"}`}
    >
      <span className={`inline-block size-5 rounded-full bg-white shadow transition ${on ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

/**
 * One music control for the whole Arena page (owner 2026-11-09): a small
 * record that turns while the lobby's lofi plays, the track's name, play or
 * pause, the next track, and a panel with the music volume, the sound effects
 * and the city scene. It folds into a round button; the choice is kept.
 */
export function ArenaMusicDock() {
  const reduce = Boolean(useReducedMotion());
  const prefs = useSoundPrefs();
  const { track, playing } = useArenaTrack();
  const [collapsed, setCollapsed] = useState(false);
  const [panel, setPanel] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Read after mounting: the server has no storage, and the first paint must match it.
  useEffect(() => {
    const id = window.setTimeout(() => setCollapsed(readCollapsed()), 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!panel) return;
    const away = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setPanel(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setPanel(false);
    window.addEventListener("pointerdown", away);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", esc);
    };
  }, [panel]);

  const fold = (value: boolean) => {
    setCollapsed(value);
    setPanel(false);
    try {
      window.localStorage.setItem(DOCK_KEY, value ? "collapsed" : "open");
    } catch {
      /* storage blocked */
    }
  };
  const toggleMusic = () => {
    arenaSound.unlock();
    arenaSound.setPrefs({ music: !prefs.music });
  };
  const record = (
    <Disc3
      size={22}
      strokeWidth={2}
      aria-hidden="true"
      className={`text-amber-300 ${playing && !reduce ? "animate-[spin_5s_linear_infinite]" : ""}`}
    />
  );

  return (
    <div ref={boxRef} className="fixed bottom-[5.5rem] left-3 z-40 lg:bottom-5 lg:left-[4.5rem]">
      <AnimatePresence mode="wait" initial={false}>
        {collapsed ? (
          <motion.button
            key="folded"
            type="button"
            onClick={() => fold(false)}
            initial={reduce ? false : { scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            aria-label="Mở thanh nhạc"
            title="Nhạc nền Đấu trường"
            className="flex size-12 items-center justify-center rounded-full border border-white/15 bg-slate-950/85 shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
          >
            {record}
          </motion.button>
        ) : (
          <motion.div
            key="open"
            initial={reduce ? false : { opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            role="group"
            aria-label="Nhạc nền Đấu trường"
            className="flex items-center gap-2 rounded-2xl border border-white/15 bg-slate-950/85 py-1.5 pl-2.5 pr-1.5 text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-black/40 ring-1 ring-amber-300/30">{record}</span>
            {/* The buttons take ~14rem with the gaps; the title gets what is left of the screen. */}
            <span className="w-[min(10rem,calc(100vw-16rem))] min-w-0">
              <span className="block truncate text-sm font-bold" title={LOBBY_PLAYLIST[track].title}>
                {prefs.music ? LOBBY_PLAYLIST[track].title : "Nhạc đang tắt"}
              </span>
              <span className="block text-[11px] font-medium text-white/60">Lofi · Đấu trường</span>
            </span>
            <button
              type="button"
              onClick={toggleMusic}
              aria-label={prefs.music ? "Tạm dừng nhạc" : "Phát nhạc"}
              className="flex size-9 items-center justify-center rounded-full bg-amber-500 text-white transition-colors hover:bg-amber-600"
            >
              {prefs.music ? <Pause size={16} strokeWidth={2.5} aria-hidden="true" /> : <Play size={16} strokeWidth={2.5} aria-hidden="true" />}
            </button>
            <button
              type="button"
              onClick={() => {
                arenaSound.unlock();
                arenaSound.nextSong();
              }}
              disabled={!prefs.music}
              aria-label="Bài tiếp theo"
              className="flex size-8 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
            >
              <SkipForward size={16} strokeWidth={2.25} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setPanel((v) => !v)}
              aria-expanded={panel}
              aria-label="Cài đặt âm thanh và cảnh nền"
              className={`flex size-8 items-center justify-center rounded-full transition-colors hover:bg-white/10 ${panel ? "bg-white/10 text-amber-300" : "text-white/80"}`}
            >
              <SlidersHorizontal size={15} strokeWidth={2.25} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => fold(true)}
              aria-label="Thu gọn thanh nhạc"
              className="flex size-8 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <ChevronLeft size={16} strokeWidth={2.25} aria-hidden="true" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {panel && !collapsed && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            role="dialog"
            aria-label="Âm thanh và cảnh nền"
            className="absolute bottom-full left-0 mb-2 w-72 space-y-3 rounded-2xl border border-white/15 bg-slate-950/95 p-4 text-white shadow-2xl"
          >
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-sm font-bold">
                <Volume2 size={15} strokeWidth={2.25} aria-hidden="true" />
                Âm lượng nhạc
              </p>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(prefs.musicVolume * 100)}
                onChange={(e) => arenaSound.setPrefs({ musicVolume: Number(e.target.value) / 100 })}
                aria-label="Âm lượng nhạc"
                className="h-1.5 w-full cursor-pointer accent-amber-500"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold">Hiệu ứng âm thanh</span>
              <Switch on={prefs.sfx} label="Hiệu ứng âm thanh" onChange={(sfx) => arenaSound.setPrefs({ sfx })} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-sm font-semibold">
                <ImageIcon size={15} strokeWidth={2.25} aria-hidden="true" />
                Cảnh thành phố đêm
              </span>
              <Switch on={prefs.scene} label="Cảnh thành phố đêm" onChange={(scene) => arenaSound.setPrefs({ scene })} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
