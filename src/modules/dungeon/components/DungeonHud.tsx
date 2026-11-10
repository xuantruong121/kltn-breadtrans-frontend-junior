"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Backpack, Flame, Heart, LogOut } from "lucide-react";
import type { DungeonView } from "@/lib/api/services/dungeon.service";
import { SoundToggle } from "@/modules/arena/components/SoundToggle";
import { MONSTER_NAME, hpTone } from "../dungeonLogic";
import type { OverlayArea } from "../stageLayout";
import { ToppingChips, ToppingPanel } from "./HeldToppings";


function Bar({ share, tone, label }: { share: number; tone: "ok" | "low" | "critical" | "monster"; label: string }) {
  const fill =
    tone === "monster" ? "bg-gradient-to-r from-rose-600 to-orange-500" : tone === "critical" ? "bg-rose-500" : tone === "low" ? "bg-amber-400" : "bg-emerald-500";
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-black/40 ring-1 ring-white/10" role="progressbar" aria-label={label} aria-valuenow={Math.round(share * 100)} aria-valuemin={0} aria-valuemax={100}>
      <motion.div className={`h-full ${fill}`} initial={false} animate={{ width: `${share * 100}%` }} transition={{ type: "spring", stiffness: 160, damping: 22 }} />
    </div>
  );
}

/** The top of the cellar: the learner's health and floor, the toppings, sound and the way out. */
export function DungeonHud({
  view,
  reduce,
  area,
  onLeave,
}: {
  view: DungeonView;
  reduce: boolean;
  /** Where the topping list and a chip's card may sit (under the HUD, clear of the answers). */
  area: OverlayArea;
  onLeave: () => void;
}) {
  const me = hpTone(view.hp, view.maxHp);
  const [listOpen, setListOpen] = useState(false);
  const held = view.toppingsHeld ?? [];
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 px-2 pt-2 sm:px-4 sm:pt-3">
      <div data-dungeon-hud className="pointer-events-auto mx-auto flex max-w-5xl items-center gap-2 rounded-2xl border border-white/10 bg-black/55 px-3 py-2 text-white shadow-[0_8px_30px_rgba(0,0,0,0.4)] sm:gap-5 sm:px-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 text-xs font-bold">
            <span className="inline-flex items-center gap-1 whitespace-nowrap text-emerald-300">
              <Heart size={13} strokeWidth={2.5} className="fill-current" aria-hidden="true" />
              <span className="tabular-nums">
                {Math.max(0, view.hp)}/{view.maxHp}
              </span>
            </span>
            <span className="whitespace-nowrap text-amber-200">
              {/* The boss badge is on the monster's plate too; narrow phones keep only the floor. */}
              Tầng {view.floor}
              {view.monster.boss && <span className="max-[379px]:hidden"> · Boss</span>}
            </span>
          </div>
          <div className="mt-1">
            <Bar share={me.share} tone={me.tone} label="Máu của bạn" />
          </div>
          <ToppingChips held={held} area={area} />
        </div>

        <div className="flex h-9 w-12 shrink-0 items-center justify-center sm:w-16" aria-live="polite">
          <AnimatePresence>
            {view.combo >= 2 && (
              <motion.span
                key={view.combo}
                initial={reduce ? false : { scale: 1.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-1 text-sm font-extrabold tabular-nums text-amber-300 ring-1 ring-amber-400/40"
              >
                <Flame size={14} strokeWidth={2.5} aria-hidden="true" />×{view.combo}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <div className="hidden sm:block">
            <SoundToggle tone="dark" />
          </div>
          <button
            type="button"
            onClick={() => setListOpen((o) => !o)}
            aria-expanded={listOpen}
            aria-label={`Topping đang có (${held.length})`}
            title="Topping đang có"
            className={`relative inline-flex size-9 items-center justify-center rounded-lg text-white/85 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${listOpen ? "bg-white/15" : ""}`}
          >
            <Backpack size={17} strokeWidth={2.25} aria-hidden="true" />
            {held.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-amber-400 px-1 text-[10px] font-bold leading-4 text-amber-950 tabular-nums" aria-hidden="true">
                {held.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={onLeave}
            aria-label="Rời hầm"
            className="inline-flex min-h-9 min-w-9 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-white/85 transition-colors hover:bg-rose-500/20 hover:text-rose-200 sm:px-2.5"
          >
            <LogOut size={16} strokeWidth={2.25} aria-hidden="true" />
            <span className="max-[379px]:hidden">Rời hầm</span>
          </button>
        </div>
      </div>
      <div className="pointer-events-auto">
        <ToppingPanel held={held} area={area} open={listOpen} onClose={() => setListOpen(false)} />
      </div>
    </div>
  );
}

/** The monster's name plate and health, over its head. */
export function MonsterPlate({ view }: { view: DungeonView }) {
  const share = view.monster.maxHp > 0 ? Math.max(0, view.monster.hp / view.monster.maxHp) : 0;
  return (
    <div className="w-[min(18rem,80vw)] text-center">
      <p className={`text-sm font-extrabold tracking-wide ${view.monster.boss ? "text-rose-300" : "text-amber-100"}`}>
        {view.monster.boss && <span className="mr-1 rounded bg-rose-500/25 px-1.5 py-0.5 text-[11px] uppercase text-rose-200">Boss</span>}
        {MONSTER_NAME[view.monster.kind]}
      </p>
      <div className="mt-1">
        <Bar share={share} tone="monster" label={`Máu của ${MONSTER_NAME[view.monster.kind]}`} />
      </div>
      <p className="mt-0.5 text-xs font-semibold tabular-nums text-white/70">
        {Math.max(0, view.monster.hp)}/{view.monster.maxHp}
      </p>
    </div>
  );
}
