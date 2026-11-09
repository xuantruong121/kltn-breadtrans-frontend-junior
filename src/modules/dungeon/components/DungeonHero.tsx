"use client";

import React from "react";
import { spriteSrc } from "./sprites";

export type HeroPose = "idle" | "walk" | "jump" | "hit" | "front";

/**
 * The hero of Hầm Bánh Mì (owner 2026-11-09): Kenney's beige character
 * (New Platformer Pack, CC0). Walking swaps two frames; the other poses are
 * single frames.
 */
export function DungeonHero({
  pose = "idle",
  size,
  facing = "right",
  reduce = false,
}: {
  pose?: HeroPose;
  size: number;
  facing?: "left" | "right";
  reduce?: boolean;
}) {
  const frames = pose === "walk" ? ["character_beige_walk_a", "character_beige_walk_b"] : [`character_beige_${pose}`];
  const animate = frames.length === 2 && !reduce;
  return (
    <div
      className="relative"
      style={{ width: size, height: size, transform: facing === "left" ? "scaleX(-1)" : undefined }}
      aria-hidden="true"
    >
      {frames.map((frame, i) => (
        <img
          key={frame}
          src={spriteSrc(frame)}
          alt=""
          draggable={false}
          className={`absolute inset-0 h-full w-full ${animate ? "dungeon-sprite-frame" : i === 1 ? "opacity-0" : ""}`}
          style={animate && i === 1 ? { animationDelay: "-0.3s" } : undefined}
        />
      ))}
    </div>
  );
}
