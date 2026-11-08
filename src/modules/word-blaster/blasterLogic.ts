/**
 * Bắn chữ rơi in the browser: where each block is, which one the cannon aims
 * at, and the lives as the server will count them. The server decides; this
 * only draws it smoothly between replies. Pure: no React, no I/O.
 */
export type ClientBlock = {
  id: number;
  kind: "copy" | "missing" | "vi_to_en" | "en_to_vi";
  prompt: string;
  spawnAtMs: number;
  fallMs: number;
  lane: number;
  hint?: string | null;
};

/** Same as the server: a shot this long after landing still counts. */
export const LANDING_GRACE_MS = 400;
export const LIVES = 3;

/** The four modes, as the lobby offers them (owner 2026-11-08: one per game). */
export const MODES: { id: ClientBlock["kind"]; name: string; line: string; sample: string }[] = [
  { id: "copy", name: "Gõ lại từ", line: "Khối hiện từ tiếng Anh, gõ lại đúng chính tả.", sample: "negotiate" },
  { id: "missing", name: "Điền chữ thiếu", line: "Từ bị ẩn vài chữ cái, gõ cả từ.", sample: "neg_ti_te" },
  { id: "vi_to_en", name: "Nghĩa → từ", line: "Khối hiện nghĩa tiếng Việt, gõ từ tiếng Anh theo số gạch chân.", sample: "đàm phán / _________" },
  { id: "en_to_vi", name: "Từ → nghĩa", line: "Khối hiện từ tiếng Anh, gõ nghĩa theo số gạch chân.", sample: "negotiate / ___ ____" },
];

export const KIND_LABEL: Record<ClientBlock["kind"], string> = {
  copy: "Gõ lại từ",
  missing: "Điền chữ thiếu",
  vi_to_en: "Gõ từ tiếng Anh",
  en_to_vi: "Gõ nghĩa tiếng Việt",
};

/** Server time minus browser time, measured when a reply arrives. */
export function clockOffset(serverNow: number, browserNow: number): number {
  return serverNow - browserNow;
}

/** Milliseconds since the game started, by the server's clock. */
export function gameTime(browserNow: number, offset: number, startedAt: number): number {
  return browserNow + offset - startedAt;
}

export const landsAt = (b: Pick<ClientBlock, "spawnAtMs" | "fallMs">) => b.spawnAtMs + b.fallMs;

/** How far a block has fallen: 0 at the top, 1 on the cannon line; null before it appears. */
export function fallProgress(b: ClientBlock, t: number): number | null {
  if (t < b.spawnAtMs) return null;
  return Math.min(1, (t - b.spawnAtMs) / b.fallMs);
}

/** Blocks to draw: appeared, not broken, not landed. */
export function liveBlocks(blocks: ClientBlock[], hits: Record<number, number>, t: number): ClientBlock[] {
  return blocks.filter((b) => hits[b.id] === undefined && t >= b.spawnAtMs && t <= landsAt(b));
}

/** Lives and progress as the server counts them (a landing costs a life). */
export function localState(blocks: ClientBlock[], hits: Record<number, number>, t: number) {
  const events = blocks
    .map((b) =>
      hits[b.id] !== undefined ? { at: hits[b.id], hit: true } : t > landsAt(b) + LANDING_GRACE_MS ? { at: landsAt(b), hit: false } : null,
    )
    .filter((e): e is { at: number; hit: boolean } => e !== null)
    .sort((a, b) => a.at - b.at);
  let destroyed = 0;
  let landed = 0;
  for (const e of events) {
    if (e.hit) destroyed += 1;
    else landed += 1;
    if (landed >= LIVES) return { destroyed, landed, livesLeft: 0, over: true };
  }
  return { destroyed, landed, livesLeft: LIVES - landed, over: destroyed + landed === blocks.length };
}

/** Does the typed text fit a prompt with "_" gaps so far ("neg_t" fits "neg"→"nego")? */
function fitsPattern(prompt: string, typed: string): boolean {
  if (typed.length > prompt.length) return false;
  for (let i = 0; i < typed.length; i += 1) {
    const p = prompt[i].toLowerCase();
    if (p !== "_" && p !== typed[i]) return false;
  }
  return true;
}

/** The hint's words as letter counts: "___ ____" → [3, 4]. */
function hintWords(hint: string): number[] {
  return hint.split(" ").filter(Boolean).map((w) => w.length);
}

function typedWords(typed: string): string[] {
  return typed.normalize("NFC").trim().split(/\s+/).filter(Boolean);
}

/** Could the typed text be this meaning: no more words, none longer than the hint's? */
export function fitsHint(hint: string, typed: string): boolean {
  const want = hintWords(hint);
  const have = typedWords(typed);
  if (have.length === 0 || have.length > want.length) return false;
  return have.every((w, i) => [...w].length <= want[i]);
}

/**
 * The hint with the typed letters in place, word by word, for the block the
 * cannon aims at: "dam ph" over "___ ____" → d a m · p h _ _.
 */
export function fillHint(hint: string, typed: string): { char: string; filled: boolean }[][] {
  const have = typedWords(typed);
  return hintWords(hint).map((length, i) => {
    const letters = [...(have[i] ?? "")];
    return Array.from({ length }, (_, j) => (letters[j] ? { char: letters[j], filled: true } : { char: "_", filled: false }));
  });
}

/**
 * The block the cannon points at: for "copy" and "missing" blocks the one
 * whose word fits what is typed so far, for a meaning the one whose hint the
 * typed words fit; otherwise the block closest to the cannon line. The
 * answers themselves stay on the server.
 */
export function aimTarget(live: ClientBlock[], typed: string): ClientBlock | null {
  if (live.length === 0) return null;
  const text = typed.trim().toLowerCase();
  const byLanding = [...live].sort((a, b) => landsAt(a) - landsAt(b));
  if (text) {
    const fit = byLanding.find(
      (b) =>
        (b.kind === "copy" && b.prompt.toLowerCase().startsWith(text)) ||
        (b.kind === "missing" && fitsPattern(b.prompt, text)) ||
        (b.kind === "en_to_vi" && Boolean(b.hint) && fitsHint(b.hint!, typed)),
    );
    if (fit) return fit;
  }
  return byLanding[0];
}

/** How far into the game, 0 to 1, by blocks that have appeared: drives the dusk and the speed-up notes. */
export function gameProgress(blocks: ClientBlock[], t: number): number {
  if (blocks.length === 0) return 0;
  return blocks.filter((b) => b.spawnAtMs <= t).length / blocks.length;
}

/**
 * The progress bar, one letter per block in the order they appear: "h" broken,
 * "l" landed (past the grace, as the server counts it), "p" still to come.
 * A block keeps its place, so a red mark never moves (owner 2026-11-08: two
 * red marks showed while a count-based bar shifted its red one along).
 */
export function blockMarks(blocks: ClientBlock[], hits: Record<number, number>, t: number): string {
  return [...blocks]
    .sort((a, b) => a.spawnAtMs - b.spawnAtMs || a.id - b.id)
    .map((b) => (hits[b.id] !== undefined ? "h" : t > landsAt(b) + LANDING_GRACE_MS ? "l" : "p"))
    .join("");
}

/** Turns the cannon toward `target` (degrees) a little each frame: about 90 % of the way in 100 ms. */
export function easeAngle(shown: number, target: number, dtMs: number): number {
  const next = shown + (target - shown) * (1 - Math.exp(-Math.max(0, dtMs) / 45));
  return Math.abs(target - next) < 0.05 ? target : next;
}
