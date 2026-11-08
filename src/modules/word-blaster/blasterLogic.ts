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
};

/** Same as the server: a shot this long after landing still counts. */
export const LANDING_GRACE_MS = 400;
export const LIVES = 3;

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

/**
 * The block the cannon points at: for "copy" and "missing" blocks the one
 * whose word fits what is typed so far; otherwise the block closest to the
 * cannon line. Meanings cannot be matched here, the answers stay on the server.
 */
export function aimTarget(live: ClientBlock[], typed: string): ClientBlock | null {
  if (live.length === 0) return null;
  const text = typed.trim().toLowerCase();
  const byLanding = [...live].sort((a, b) => landsAt(a) - landsAt(b));
  if (text) {
    const fit = byLanding.find(
      (b) => (b.kind === "copy" && b.prompt.toLowerCase().startsWith(text)) || (b.kind === "missing" && fitsPattern(b.prompt, text)),
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
