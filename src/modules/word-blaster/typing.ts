/**
 * Bắn chữ rơi, one key at a time (owner 2026-11-08, after ZType): the first
 * key locks the cannon on a block, each accepted letter is a shot, and the
 * answer goes to the server by itself once it has all its letters. The
 * server still decides; this only knows what the block shows. Pure.
 *
 * It works on the input's value, not on single keys, so a Vietnamese input
 * method (Telex, VNI) that rewrites "dam" into "đàm" still reads right.
 */
import { landsAt, type ClientBlock } from "./blasterLogic.ts";

/** Letters as the learner sees them: "đàm" is three. */
export function letters(text: string): string[] {
  return [...text.normalize("NFC")];
}

const lower = (text: string) => text.normalize("NFC").toLocaleLowerCase("vi-VN");

/** Word lengths of a hint: "___ ____" → [3, 4]. */
function hintShape(hint: string): number[] {
  return hint.split(" ").filter(Boolean).map((w) => w.length);
}

/** Could `typed` be the start of this block's answer, as far as the page can tell? */
export function fitsBlock(block: ClientBlock, typed: string): boolean {
  const text = lower(typed);
  if (!text || text.startsWith(" ") || text.includes("  ")) return false;
  if (block.kind === "copy") return lower(block.prompt).startsWith(text);
  if (block.kind === "missing") {
    const shown = letters(lower(block.prompt));
    const mine = letters(text);
    if (mine.length > shown.length) return false;
    return mine.every((c, i) => (shown[i] === "_" ? /\p{L}/u.test(c) : shown[i] === c));
  }
  if (!block.hint) return true;
  const shape = hintShape(block.hint);
  const words = text.split(" ");
  if (words.length > shape.length) return false;
  return words.every((w, i) => letters(w).length <= shape[i]);
}

/** Has the answer all its letters, so it can be sent without Enter? */
export function isComplete(block: ClientBlock, typed: string): boolean {
  const text = lower(typed).trim();
  if (block.kind === "copy") return text === lower(block.prompt);
  if (block.kind === "missing") return letters(text).length === letters(block.prompt).length && fitsBlock(block, text);
  if (!block.hint) return false;
  const shape = hintShape(block.hint);
  const words = text.split(" ").filter(Boolean);
  return words.length === shape.length && words.every((w, i) => letters(w).length === shape[i]);
}

/**
 * The block the cannon stays on: the locked one while the text still fits
 * it, otherwise the block closest to landing that the text fits. Nothing
 * typed, nothing locked.
 */
export function pickTarget(live: ClientBlock[], typed: string, lockedId: number | null): ClientBlock | null {
  if (!typed.trim()) return null;
  const locked = lockedId === null ? null : live.find((b) => b.id === lockedId);
  if (locked && fitsBlock(locked, typed)) return locked;
  return [...live].sort((a, b) => landsAt(a) - landsAt(b)).find((b) => fitsBlock(b, typed)) ?? null;
}

export type InputStep =
  | { accepted: true; typed: string; targetId: number | null; shots: number; complete: boolean }
  | { accepted: false; typed: string; targetId: number | null };

/**
 * One change of the answer box. Deleting is always fine. A new letter is
 * kept only if some block on screen can take it (that is the lock-on);
 * otherwise the box keeps its old text and the page shakes. `shots` is how
 * many letters were added, one bullet each.
 */
export function stepInput(live: ClientBlock[], previous: string, next: string, lockedId: number | null): InputStep {
  const before = letters(previous).length;
  const after = letters(next).length;
  if (!next.trim()) return { accepted: true, typed: "", targetId: null, shots: 0, complete: false };
  if (after < before) {
    const target = pickTarget(live, next, lockedId);
    return { accepted: true, typed: next, targetId: target?.id ?? lockedId, shots: 0, complete: false };
  }
  const target = pickTarget(live, next, lockedId);
  if (!target) return { accepted: false, typed: previous, targetId: lockedId };
  const shots = Math.max(0, letters(next.replace(/ /g, "")).length - letters(previous.replace(/ /g, "")).length);
  return { accepted: true, typed: next, targetId: target.id, shots, complete: isComplete(target, next) };
}

/**
 * The letter cell the last typed letter lands in, so its bullet flies to that
 * letter: on the word itself for copy and missing, on the hint for meanings
 * (cells counted across words, spaces left out).
 */
export function shotCell(block: ClientBlock, typed: string): number {
  const text = lower(typed);
  if (block.kind === "copy" || block.kind === "missing") return Math.max(0, letters(text).length - 1);
  if (!block.hint) return 0;
  const shape = hintShape(block.hint);
  const words = text.split(" ");
  let w = words.length - 1;
  while (w > 0 && !words[w]) w -= 1;
  const before = shape.slice(0, w).reduce((sum, n) => sum + n, 0);
  return before + Math.max(0, letters(words[w]).length - 1);
}
