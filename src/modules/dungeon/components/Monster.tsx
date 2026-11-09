"use client";

import React from "react";
import { motion } from "framer-motion";
import type { MonsterKind } from "@/lib/api/services/dungeon.service";
import { spriteSrc } from "./sprites";

type Look = {
  /** Two walking frames, swapped back and forth while it waits. */
  frames: [string, string];
  /** The frame it falls on when beaten. */
  down: string;
  /** Colour change on top of the sprite's own (the Sourdough King is dough-coloured). */
  tint?: string;
  /** Bosses: a glow behind. */
  glow?: string;
  /** The Sourdough King wears a crown; the Fire Slime's flame is its own. */
  crown?: boolean;
};

// Owner 2026-11-09: the monsters are Kenney's New Platformer Pack (CC0).
const LOOKS: Record<MonsterKind, Look> = {
  moldy: { frames: ["slime_spike_walk_a", "slime_spike_walk_b"], down: "slime_spike_flat" },
  mouse: { frames: ["mouse_walk_a", "mouse_walk_b"], down: "mouse_rest" },
  ant: { frames: ["ladybug_walk_a", "ladybug_walk_b"], down: "ladybug_rest" },
  snail: { frames: ["snail_walk_a", "snail_walk_b"], down: "snail_shell" },
  sourdough_king: {
    frames: ["slime_normal_walk_a", "slime_normal_walk_b"],
    down: "slime_normal_flat",
    tint: "grayscale(1) sepia(0.6) saturate(1.5) brightness(1.3)",
    glow: "rgba(251,191,36,0.45)",
    crown: true,
  },
  flour_dragon: {
    frames: ["slime_fire_walk_a", "slime_fire_walk_b"],
    down: "slime_fire_flat",
    glow: "rgba(249,115,22,0.5)",
  },
};

/** A small gold crown, drawn rather than an icon, so it sits on a slime's head. */
function Crown() {
  return (
    <svg viewBox="0 0 40 26" className="h-full w-full drop-shadow-[0_2px_0_rgba(0,0,0,0.35)]" aria-hidden="true">
      <path d="M3 24 L5 7 L13 15 L20 3 L27 15 L35 7 L37 24 Z" fill="#FBBF24" stroke="#7C4A03" strokeWidth="2.4" strokeLinejoin="round" />
      <circle cx="20" cy="17" r="3" fill="#F43F5E" stroke="#7C4A03" strokeWidth="1.5" />
      <circle cx="10.5" cy="19" r="2" fill="#FEF3C7" />
      <circle cx="29.5" cy="19" r="2" fill="#FEF3C7" />
    </svg>
  );
}

/**
 * One monster of Hầm Bánh Mì: it walks in place while it waits, flashes and
 * jolts when hit (`hitKey` changes), and falls flat when beaten. Deeper floors
 * shift its colours a little; bosses are larger and glow, the king wears a crown.
 */
export function Monster({
  kind,
  floor,
  hitKey,
  dead,
  reduce,
  size,
}: {
  kind: MonsterKind;
  floor: number;
  hitKey: number;
  dead: boolean;
  reduce: boolean;
  size: number;
}) {
  const look = LOOKS[kind];
  const boss = Boolean(look.glow);
  const shift = floor > 10 ? ((floor - 10) * 18) % 120 : 0;
  const filter = [look.tint, shift ? `hue-rotate(${shift}deg)` : ""].filter(Boolean).join(" ") || undefined;
  // The sprites fill the lower part of their square; bosses are drawn larger.
  const art = boss ? 1 : 0.86;
  const walking = !reduce && !dead;
  return (
    <motion.div
      key={`${kind}-${floor}`}
      initial={reduce ? false : { y: -40, opacity: 0, scale: 0.8 }}
      animate={dead ? { opacity: 0, scale: 0.85, y: 24 } : { y: 0, opacity: 1, scale: 1 }}
      transition={dead ? { duration: 0.6, ease: "easeIn", delay: 0.15 } : { type: "spring", stiffness: 260, damping: 18 }}
      className="relative"
      style={{ width: size, height: size }}
    >
      {look.glow && (
        <div
          className="absolute inset-[6%] rounded-full blur-2xl"
          style={{ background: `radial-gradient(circle at 50% 65%, ${look.glow}, transparent 70%)` }}
          aria-hidden="true"
        />
      )}
      {/* its shadow on the floor */}
      <div className="absolute bottom-[3%] left-1/2 h-[7%] w-[62%] -translate-x-1/2 rounded-[50%] bg-black/45 blur-[2px]" aria-hidden="true" />
      <motion.div
        key={hitKey}
        className="absolute inset-0"
        initial={reduce || hitKey === 0 ? false : { x: 0, filter: "brightness(2.4)" }}
        animate={reduce || hitKey === 0 ? undefined : { x: [0, 10, -8, 4, 0], filter: ["brightness(2.4)", "brightness(1)"] }}
        transition={{ duration: 0.3 }}
      >
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2"
          style={{ width: `${art * 100}%`, height: `${art * 100}%` }}
        >
          {/* The tint colours the sprite only, not the crown. */}
          <div className="absolute inset-0" style={{ filter }}>
            {dead ? (
              <img src={spriteSrc(look.down)} alt="" draggable={false} className="h-full w-full" />
            ) : (
              look.frames.map((frame, i) => (
                <img
                  key={frame}
                  src={spriteSrc(frame)}
                  alt=""
                  draggable={false}
                  className={`absolute inset-0 h-full w-full ${walking ? "dungeon-sprite-frame" : i === 1 ? "opacity-0" : ""}`}
                  style={walking && i === 1 ? { animationDelay: "-0.3s" } : undefined}
                />
              ))
            )}
          </div>
          {look.crown && !dead && (
            <motion.div
              data-boss-crown
              className="absolute left-[35%] top-[22%] h-[18%] w-[30%]"
              animate={walking ? { y: [0, -3, 0], rotate: [-4, 4, -4] } : undefined}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            >
              <Crown />
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
