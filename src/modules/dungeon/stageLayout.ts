/**
 * How Hầm Bánh Mì fits the screen (owner 2026-11-10: "đã cấu hình responsive
 * đầy đủ cả chưa?"). Measured on the harness at 320x568, 375x667 and a phone
 * on its side (844x390), the answers ran off the bottom of the screen and
 * the topping list covered the HUD. Pure, so it is tested without a browser.
 */

export type StageMode = {
  /** A phone on its side: the monster beside the question, not above it. */
  landscape: boolean;
  /** A short screen: answers two by two, tighter padding. */
  compact: boolean;
  /** The monster's drawn size in pixels. */
  monsterSize: number;
};

export function stageMode(width: number, height: number): StageMode {
  const landscape = height < 520 && width > height;
  const compact = landscape || height < 760;
  const monsterSize = landscape ? 104 : height < 620 ? 96 : height < 760 ? 132 : 210;
  return { landscape, compact, monsterSize };
}

export type Rect = { top: number; left: number; right: number; bottom: number };

/** Where the topping list and a chip's card may sit, in screen pixels. */
export type OverlayArea = { top: number; left: number; width: number; maxHeight: number };

const GAP = 8;
const MIN_HEIGHT = 96;

/**
 * The room left for the topping list and a chip's card: under the HUD and
 * clear of the answers. Wide screens get a column at the right edge; when
 * the answers leave a column on their left (a phone on its side), it goes
 * there; otherwise it fills the strip between the HUD and the answers.
 */
export function overlayArea(width: number, height: number, hudBottom: number, answers: Rect | null): OverlayArea {
  const top = Math.round(hudBottom + GAP);
  if (width >= 1280) {
    const w = 288;
    return { top, left: width - 16 - w, width: w, maxHeight: Math.max(MIN_HEIGHT, height - top - 16) };
  }
  if (answers && answers.left >= 220 + 2 * GAP) {
    return { top, left: GAP, width: Math.round(answers.left - 2 * GAP), maxHeight: Math.max(MIN_HEIGHT, height - top - GAP) };
  }
  const w = Math.min(width - 2 * GAP, 448);
  const below = answers ? answers.top : height;
  return { top, left: Math.round((width - w) / 2), width: w, maxHeight: Math.max(MIN_HEIGHT, Math.round(below - top - GAP)) };
}
