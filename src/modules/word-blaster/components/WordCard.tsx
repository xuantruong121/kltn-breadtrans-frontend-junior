"use client";

import React from "react";
import { motion } from "framer-motion";
import { fillHint, type ClientBlock } from "../blasterLogic";
import { letters } from "../typing";

/**
 * One falling block as a dark glass card. Every letter is its own cell
 * (`data-letter`), so a bullet can fly to the letter just typed: on the word
 * for copy and missing, on the underscores for the two meaning modes. Only
 * the locked card shows what is typed; it gets a reticle and an amber glow,
 * and any card past three quarters of its fall turns red.
 */
export function WordCard({
  block,
  typed,
  locked,
  danger,
  reduce,
  shakeKey,
}: {
  block: ClientBlock;
  typed: string;
  locked: boolean;
  danger: boolean;
  reduce: boolean;
  /** Changes when this card refuses a letter or the server says no. */
  shakeKey: number;
}) {
  const mine = locked ? letters(typed.normalize("NFC")) : [];
  const meaning = block.kind === "vi_to_en" || block.kind === "en_to_vi";
  const frame = danger
    ? "border-rose-400/90 shadow-[0_0_0_1px_rgba(251,113,133,0.5),0_0_26px_rgba(244,63,94,0.45)]"
    : locked
      ? "border-amber-300/90 shadow-[0_0_0_1px_rgba(252,211,77,0.45),0_0_30px_rgba(251,191,36,0.4)]"
      : "border-white/15 shadow-[0_10px_28px_rgba(0,0,0,0.45)]";

  return (
    <motion.div
      data-block={block.id}
      initial={reduce ? false : { scale: 0.4, opacity: 0, y: -12 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 520, damping: 22 }}
      className="relative"
    >
      <motion.div
        key={shakeKey}
        animate={reduce || shakeKey === 0 ? undefined : { x: [0, -7, 6, -3, 0] }}
        transition={{ duration: 0.22 }}
        className={`relative max-w-[78vw] rounded-xl border bg-slate-950/90 px-3.5 py-2.5 text-center sm:max-w-sm ${frame} ${
          danger && !reduce ? "animate-pulse" : ""
        }`}
      >
        {meaning ? (
          <>
            <p className={`break-words font-bold leading-tight text-white ${block.kind === "vi_to_en" ? "text-base sm:text-lg" : "text-lg tracking-wide sm:text-xl"}`}>
              {block.prompt}
            </p>
            {block.hint && <HintCells hint={block.hint} typed={locked ? typed : ""} kind={block.kind} />}
          </>
        ) : (
          <p className="flex flex-wrap justify-center font-mono text-lg font-bold tracking-wide sm:text-xl" aria-label={block.prompt}>
            {letters(block.prompt).map((c, i) => {
              const gap = c === "_";
              const hit = i < mine.length;
              const shown = gap ? (hit ? mine[i] : " ") : c === " " ? " " : c;
              return (
                <span
                  key={i}
                  data-letter={i}
                  aria-hidden="true"
                  className={`inline-block min-w-[0.62em] transition-colors duration-75 ${gap ? "mx-px border-b-2" : ""} ${
                    hit
                      ? "text-amber-300 [text-shadow:0_0_10px_rgba(251,191,36,0.75)]" + (gap ? " border-amber-300" : "")
                      : gap
                        ? "border-white/60 text-white"
                        : "text-white"
                  }`}
                >
                  {shown}
                </span>
              );
            })}
          </p>
        )}
      </motion.div>

      {locked && (
        <motion.span
          key={`lock-${block.id}`}
          initial={reduce ? false : { opacity: 0, scale: 1.35 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
          className="pointer-events-none absolute -inset-2"
          aria-hidden="true"
        >
          {["left-0 top-0 border-l-2 border-t-2 rounded-tl-md", "right-0 top-0 border-r-2 border-t-2 rounded-tr-md", "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-md", "bottom-0 right-0 border-b-2 border-r-2 rounded-br-md"].map((pos) => (
            <span key={pos} className={`absolute h-3.5 w-3.5 border-amber-300 ${pos}`} />
          ))}
        </motion.span>
      )}
    </motion.div>
  );
}

/** One underscore per letter of the answer; the locked card fills them in as you type. */
function HintCells({ hint, typed, kind }: { hint: string; typed: string; kind: ClientBlock["kind"] }) {
  const count = hint.replace(/ /g, "").length;
  const words = fillHint(hint, typed);
  const starts = words.map((_, w) => words.slice(0, w).reduce((sum, word) => sum + word.length, 0));
  return (
    <p
      className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1.5 font-mono text-base font-bold"
      aria-label={kind === "en_to_vi" ? `Nghĩa có ${count} chữ cái` : `Từ có ${count} chữ cái`}
    >
      {words.map((word, w) => (
        <span key={w} className="inline-flex gap-[3px]">
          {word.map((c, i) => {
            return (
              <span
                key={i}
                data-letter={starts[w] + i}
                className={`inline-block w-[0.85em] border-b-2 text-center leading-6 transition-colors duration-75 ${
                  c.filled ? "border-amber-300 text-amber-200 [text-shadow:0_0_10px_rgba(251,191,36,0.7)]" : "border-white/55 text-transparent"
                }`}
              >
                {c.filled ? c.char : " "}
              </span>
            );
          })}
        </span>
      ))}
    </p>
  );
}
