"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { DungeonView, ToppingId } from "@/lib/api/services/dungeon.service";
import { RARITY_LABEL, heldLevelLabel, offerLevelLabel } from "../dungeonLogic";
import { TOPPING_ICON } from "./toppingIcons";

const RARITY_TONE = {
  common: "border-white/20 from-white/10 to-white/5 text-white",
  rare: "border-sky-300/60 from-sky-500/20 to-sky-500/5 text-sky-50",
  epic: "border-amber-300/80 from-amber-400/25 to-orange-500/10 text-amber-50 shadow-[0_0_30px_rgba(251,191,36,0.25)]",
} as const;

/** After a floor: three toppings dealt face down and turned over; pick one to go deeper. */
export function ToppingChoice({
  view,
  pending,
  reduce,
  onPick,
}: {
  view: DungeonView;
  pending: boolean;
  reduce: boolean;
  onPick: (id: ToppingId) => void;
}) {
  const held = view.toppingsHeld ?? [];
  return (
    <div className="w-full max-w-3xl text-center">
      <motion.h2
        initial={reduce ? false : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-extrabold text-amber-100 sm:text-3xl"
      >
        {view.monster.boss ? "Hạ boss! Chọn một topping hiếm" : "Qua tầng! Chọn một topping"}
      </motion.h2>
      <p className="mt-1 text-sm text-white/75">Topping giữ đến hết lượt chơi. Chọn lại loại đã có thì nó mạnh thêm một cấp.</p>
      {held.length > 0 && (
        <p className="mt-1 text-xs text-white/60">
          Đang có: {held.map((h) => `${h.name} (${heldLevelLabel(h).toLowerCase()})`).join(", ")}
        </p>
      )}
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {view.offers.map((offer, i) => {
          const Icon = TOPPING_ICON[offer.id];
          return (
            <motion.button
              key={offer.id}
              type="button"
              disabled={pending}
              onClick={() => onPick(offer.id)}
              initial={reduce ? false : { rotateY: 90, opacity: 0, y: 20 }}
              animate={{ rotateY: 0, opacity: 1, y: 0 }}
              transition={{ delay: reduce ? 0 : 0.15 + i * 0.12, type: "spring", stiffness: 220, damping: 20 }}
              whileHover={reduce ? undefined : { y: -4 }}
              className={`flex h-full flex-col items-center gap-2 rounded-2xl border-2 bg-gradient-to-b p-4 text-center transition-colors disabled:opacity-60 ${RARITY_TONE[offer.rarity]}`}
            >
              <span className="flex w-full items-center justify-between text-[11px] font-bold uppercase tracking-wide opacity-80">
                <span>{RARITY_LABEL[offer.rarity]}</span>
                <span className="normal-case tracking-normal">{offerLevelLabel(offer)}</span>
              </span>
              <span className="flex size-12 items-center justify-center rounded-xl bg-black/30">
                <Icon size={24} strokeWidth={2.25} aria-hidden="true" />
              </span>
              <span className="text-lg font-extrabold">{offer.name}</span>
              <span className="text-sm leading-snug opacity-95">{offer.line}</span>
              {offer.effect && (
                <span className="mt-auto w-full rounded-xl bg-black/30 px-2.5 py-2 text-xs">
                  <span className="block opacity-75">{offer.effect.label}</span>
                  <span className="mt-0.5 flex items-center justify-center gap-1.5 text-sm font-bold tabular-nums">
                    <span className="sr-only">Hiện tại</span>
                    <span className="opacity-80">{offer.effect.now}</span>
                    <ArrowRight size={14} strokeWidth={2.5} aria-hidden="true" />
                    <span className="sr-only">sau khi chọn</span>
                    <span className="text-amber-200">{offer.effect.next}</span>
                  </span>
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
