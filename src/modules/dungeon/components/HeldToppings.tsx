"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { HeldTopping, ToppingId } from "@/lib/api/services/dungeon.service";
import { TOPPING_ICON } from "./toppingIcons";
import { heldLevelLabel } from "../dungeonLogic";
import type { OverlayArea } from "../stageLayout";

/** Closes on Escape and on a press outside `ref` (owner 2026-11-10: the clock keeps running, so it must close easily). */
function useDismiss(open: boolean, ref: React.RefObject<HTMLElement | null>, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open, ref, close]);
}

/** `area` as inline style: fixed under the HUD, clear of the answers, scrolling inside if long. */
const areaStyle = (area: OverlayArea): React.CSSProperties => ({
  position: "fixed",
  top: area.top,
  left: area.left,
  width: area.width,
  maxHeight: area.maxHeight,
});

/**
 * The toppings in the HUD. Each chip is a button: a press, a hover or the
 * keyboard shows a small card under the HUD (over the cellar, never over the
 * answers) saying what it does now.
 */
export function ToppingChips({ held, area }: { held: HeldTopping[]; area: OverlayArea }) {
  const [active, setActive] = useState<ToppingId | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(active !== null, ref, () => setActive(null));
  if (held.length === 0) return null;
  const shown = held.find((h) => h.id === active) ?? null;
  return (
    <div
      ref={ref}
      className="relative mt-1.5"
      onMouseLeave={() => setActive(null)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setActive(null);
      }}
    >
      <ul className="flex flex-wrap gap-1" aria-label="Topping đang có">
        {held.map((h) => {
          const Icon = TOPPING_ICON[h.id];
          const on = h.id === active;
          return (
            <li key={h.id}>
              <button
                type="button"
                aria-expanded={on}
                aria-controls="dungeon-topping-card"
                aria-label={`${h.name}, ${heldLevelLabel(h)}`}
                // Not a toggle: the hover before a click has already opened it.
                onClick={() => setActive(h.id)}
                onMouseEnter={() => setActive(h.id)}
                onFocus={() => setActive(h.id)}
                className={`inline-flex min-h-7 items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold text-amber-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${on ? "bg-amber-400/25" : "bg-white/10 hover:bg-white/20"}`}
              >
                <Icon size={13} strokeWidth={2.5} aria-hidden="true" />
                <span className="hidden sm:inline">{h.name}</span>
                {h.level > 1 && <span className="tabular-nums">×{h.level}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <AnimatePresence>
        {shown && (
          <motion.div
            key={shown.id}
            id="dungeon-topping-card"
            role="status"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            style={{ ...areaStyle(area), width: Math.min(area.width, 288) }}
            className="z-40 overflow-y-auto rounded-xl border border-white/15 bg-[#22150f] p-3 text-left text-white shadow-[0_12px_30px_rgba(0,0,0,0.5)]"
          >
            <HeldCard h={shown} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HeldCard({ h }: { h: HeldTopping }) {
  const Icon = TOPPING_ICON[h.id];
  return (
    <>
      <p className="flex items-center gap-1.5 text-sm font-extrabold text-amber-100">
        <Icon size={15} strokeWidth={2.5} aria-hidden="true" />
        {h.name}
        <span className="ml-auto text-xs font-semibold text-white/60">{heldLevelLabel(h)}</span>
      </p>
      <p className="mt-1 text-sm leading-snug text-white/90">{h.line}</p>
      <p className="mt-1.5 text-xs text-white/70">
        {h.label}: <span className="font-bold tabular-nums text-amber-200">{h.value}</span>
      </p>
    </>
  );
}

/**
 * Every topping held, from the HUD's bag button, in `area` (stageLayout.ts):
 * a column at the right edge on wide screens, the column left of the answers
 * on a phone on its side, else the strip between the HUD and the answers.
 * The question's clock does not stop.
 */
export function ToppingPanel({ held, area, open, onClose }: { held: HeldTopping[]; area: OverlayArea; open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useDismiss(open, ref, onClose);
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          role="dialog"
          aria-modal="false"
          aria-labelledby="dungeon-topping-panel-title"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={areaStyle(area)}
          className="z-40 flex flex-col rounded-2xl border border-white/15 bg-[#22150f] text-white shadow-[0_16px_40px_rgba(0,0,0,0.55)]"
        >
          <div className="flex items-start gap-2 border-b border-white/10 px-3 py-2">
            <div className="min-w-0 flex-1">
              <h2 id="dungeon-topping-panel-title" className="text-sm font-extrabold text-amber-100">
                Topping đang có
              </h2>
              <p className="text-xs text-white/60">Đồng hồ vẫn chạy trong lúc xem.</p>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Đóng danh sách topping"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              <X size={16} strokeWidth={2.25} aria-hidden="true" />
            </button>
          </div>
          {held.length === 0 ? (
            <p className="px-3 py-3 text-sm text-white/70">Chưa có topping nào. Qua tầng đầu tiên để chọn topping.</p>
          ) : (
            <ul className="space-y-2 overflow-y-auto px-3 py-2">
              {held.map((h) => (
                <li key={h.id} className="rounded-xl bg-white/5 p-2.5">
                  <HeldCard h={h} />
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
