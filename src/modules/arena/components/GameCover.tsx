"use client";

import React from "react";
import { motion } from "framer-motion";
import type { ArenaGame } from "../games";
import { BreadMascot } from "./BreadMascot";
import { BreadTurret } from "@/modules/word-blaster/components/BreadTurret";
import { Monster } from "@/modules/dungeon/components/Monster";

/** Fixed spots, so the server and the browser draw the same stars. */
const STARS = Array.from({ length: 16 }, (_, i) => ({ left: (i * 37 + 9) % 100, top: (i * 23 + 7) % 60, size: i % 5 === 0 ? 3 : 2, delay: (i % 7) * 0.35 }));
const SPARKS = [
  { left: 18, top: 22 },
  { left: 82, top: 18 },
  { left: 66, top: 70 },
  { left: 30, top: 74 },
];
const BRICKS =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='16'%3E%3Cpath d='M0 .5H32M0 8.5H32M.5 0V8M16.5 8V16' stroke='%23231310' stroke-width='1.5'/%3E%3C/svg%3E\")";

/**
 * A small cover picture for each Arena game, drawn in code from the games'
 * own pieces: two bread mascots facing off, the bread turret under falling
 * words at night, a monster in the brick cellar. It moves only while `live`
 * (the card is chosen or hovered) and never with reduced motion.
 */
export function GameCover({ game, live, reduce }: { game: ArenaGame; live: boolean; reduce: boolean }) {
  return (
    <div className="h-full w-full" aria-hidden="true">
      <Cover game={game} moving={live && !reduce} />
    </div>
  );
}

function Cover({ game, moving }: { game: ArenaGame; moving: boolean }) {
  if (game === "duel")
    return (
      <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-amber-200 via-amber-100 to-orange-200 dark:from-amber-900/70 dark:via-amber-950 dark:to-orange-950">
        {SPARKS.map((s, i) => (
          <motion.span
            key={i}
            className="absolute h-1.5 w-1.5 rounded-full bg-amber-500/70"
            style={{ left: `${s.left}%`, top: `${s.top}%` }}
            animate={moving ? { opacity: [0.2, 1, 0.2], scale: [0.8, 1.3, 0.8] } : { opacity: 0.5, scale: 1 }}
            transition={moving ? { duration: 1.6, repeat: Infinity, delay: i * 0.3 } : undefined}
          />
        ))}
        <motion.div className="absolute bottom-0 left-[14%]" animate={moving ? { x: [0, 6, 0] } : { x: 0 }} transition={{ duration: 1.1, repeat: moving ? Infinity : 0 }}>
          <BreadMascot team="me" facing="right" size={64} />
        </motion.div>
        <motion.div className="absolute bottom-0 right-[14%]" animate={moving ? { x: [0, -6, 0] } : { x: 0 }} transition={{ duration: 1.1, repeat: moving ? Infinity : 0, delay: 0.15 }}>
          <BreadMascot team="rival" facing="left" size={64} />
        </motion.div>
        <motion.span
          className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 rounded-md bg-white px-1.5 py-0.5 text-sm font-black text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
          animate={moving ? { scale: [1, 1.15, 1] } : { scale: 1 }}
          transition={{ duration: 1.1, repeat: moving ? Infinity : 0 }}
        >
          VS
        </motion.span>
      </div>
    );

  if (game === "blaster")
    return (
      <div className="relative h-full w-full overflow-hidden bg-[linear-gradient(to_bottom,#060A18,#0B1430_55%,#17244A)]">
        {STARS.map((s, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full bg-white"
            style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size }}
            animate={moving ? { opacity: [0.25, 1, 0.25] } : { opacity: 0.6 }}
            transition={moving ? { duration: 1.8, repeat: Infinity, delay: s.delay } : undefined}
          />
        ))}
        {[
          { word: "budget", left: "14%", delay: 0, rest: 40 },
          { word: "renew", left: "64%", delay: 0.9, rest: 26 },
        ].map((w) => (
          <motion.span
            key={w.word}
            className="absolute rounded-md border border-amber-300/70 bg-slate-950/90 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white"
            style={{ left: w.left, top: 0 }}
            animate={moving ? { y: [-18, 56], opacity: [0, 1, 1, 0] } : { y: w.rest, opacity: 1 }}
            transition={moving ? { duration: 2.2, repeat: Infinity, delay: w.delay, ease: "linear" } : undefined}
          >
            {w.word}
          </motion.span>
        ))}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
          <BreadTurret angle={moving ? -10 : -6} size={64} flash={0} reduce />
        </div>
      </div>
    );

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#3a2219]" style={{ backgroundImage: BRICKS, backgroundSize: "32px 16px" }}>
      <motion.div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_120%,rgba(251,146,60,0.65),transparent_65%)]"
        animate={moving ? { opacity: [0.7, 1, 0.7] } : { opacity: 0.85 }}
        transition={moving ? { duration: 1.4, repeat: Infinity } : undefined}
      />
      {[10, 90].map((x) => (
        <motion.span
          key={x}
          className="absolute top-[30%] h-2 w-2 -translate-x-1/2 rounded-full bg-amber-200 shadow-[0_0_12px_6px_rgba(253,186,116,0.55)]"
          style={{ left: `${x}%` }}
          animate={moving ? { opacity: [0.6, 1, 0.75, 1] } : { opacity: 0.9 }}
          transition={moving ? { duration: 0.9, repeat: Infinity } : undefined}
        />
      ))}
      <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2">
        <Monster kind="moldy" floor={1} hitKey={0} dead={false} reduce={!moving} size={78} />
      </div>
    </div>
  );
}
