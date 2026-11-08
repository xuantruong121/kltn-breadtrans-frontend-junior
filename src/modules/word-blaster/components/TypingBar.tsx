"use client";

import React from "react";
import { motion } from "framer-motion";
import { ChevronRight, Crosshair } from "lucide-react";

/**
 * The command line under the cannon: what is typed, large, and which block
 * the cannon is on. It is a real input, so phone keyboards and Vietnamese
 * input methods work; the game reads its value, not single keys.
 */
export function TypingBar({
  inputRef,
  value,
  lockedPrompt,
  disabled,
  shakeKey,
  reduce,
  compact,
  onChange,
  onKeyDown,
  onCompositionStart,
  onCompositionEnd,
  onFire,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  value: string;
  lockedPrompt: string | null;
  disabled: boolean;
  shakeKey: number;
  reduce: boolean;
  compact: boolean;
  onChange: (next: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onCompositionStart: () => void;
  onCompositionEnd: (value: string) => void;
  onFire: () => void;
}) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-30 px-3 pb-3 sm:pb-4">
      {/* No key here: remounting the form would drop the input's focus. Each new
          shakeKey flips the direction, so the animation runs again. */}
      <motion.form
        animate={reduce || shakeKey === 0 ? undefined : { x: shakeKey % 2 ? [0, -9, 8, -4, 0] : [0, 9, -8, 4, 0] }}
        transition={{ duration: 0.24 }}
        onSubmit={(e) => {
          e.preventDefault();
          onFire();
        }}
        className={`mx-auto flex max-w-xl items-center gap-2 rounded-2xl border bg-slate-950/85 px-3 shadow-[0_10px_30px_rgba(0,0,0,0.45)] transition-colors border-white/15 focus-within:border-amber-300/70 ${compact ? "py-1.5" : "py-2"}`}
      >
        <ChevronRight size={22} strokeWidth={2.75} className="shrink-0 text-amber-300" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            onCompositionStart={onCompositionStart}
            onCompositionEnd={(e) => onCompositionEnd(e.currentTarget.value)}
            disabled={disabled}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="send"
            aria-label="Gõ đáp án: gõ đủ chữ là tự bắn, Enter để bắn ngay, Esc để bỏ ngắm"
            placeholder="Gõ chữ đầu để ngắm…"
            className={`w-full bg-transparent font-mono font-bold tracking-wide text-amber-100 caret-amber-300 outline-none placeholder:font-sans placeholder:font-medium placeholder:tracking-normal placeholder:text-white/45 ${
              compact ? "text-lg" : "text-xl sm:text-2xl"
            }`}
          />
          <p className="truncate text-xs font-medium text-white/60" aria-live="polite">
            {lockedPrompt ? (
              <>
                <Crosshair size={12} strokeWidth={2.5} className="mr-1 inline-block align-[-2px] text-amber-300" aria-hidden="true" />
                Đang ngắm: <span className="font-semibold text-white/85">{lockedPrompt}</span>
              </>
            ) : (
              <span className="hidden sm:inline">Gõ đủ chữ là tự bắn · Enter bắn ngay · Esc bỏ ngắm</span>
            )}
          </p>
        </div>
        <button
          type="submit"
          disabled={disabled}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 font-extrabold text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
        >
          <Crosshair size={17} strokeWidth={2.5} aria-hidden="true" />
          Bắn
        </button>
      </motion.form>
    </div>
  );
}
