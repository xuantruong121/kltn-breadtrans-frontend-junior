import { test } from "node:test";
import assert from "node:assert/strict";

import { MAX_ZOOM, clampCrop, coverScale, initialCrop, needsCrop, sourceRect, zoomTo } from "./avatarCrop.ts";

const landscape = { width: 1200, height: 800 };
const VIEW = 300;

test("only a small square photo skips the crop frame", () => {
  assert.equal(needsCrop({ width: 256, height: 256 }), false);
  assert.equal(needsCrop({ width: 200, height: 200 }), false);
  assert.equal(needsCrop({ width: 512, height: 512 }), true);
  assert.equal(needsCrop({ width: 300, height: 200 }), true);
});

test("the photo starts centred and just covers the frame", () => {
  const start = initialCrop(landscape, VIEW);
  assert.equal(start.scale, coverScale(landscape, VIEW));
  assert.equal(start.scale, 300 / 800);
  const rect = sourceRect(landscape, VIEW, start);
  assert.equal(rect.side, 800);
  assert.equal(rect.sx, 200);
  assert.equal(rect.sy, 0);
});

test("dragging stops where the photo edge meets the frame", () => {
  const start = initialCrop(landscape, VIEW);
  const far = clampCrop(landscape, VIEW, { ...start, x: 10_000, y: 10_000 });
  // Shown width 450 px in a 300 px frame: at most 75 px either way; no room vertically.
  assert.equal(far.x, 75);
  assert.equal(far.y, 0);
  const rect = sourceRect(landscape, VIEW, far);
  assert.equal(rect.sx, 0);
});

test("zoom stays between covering and four times that", () => {
  const start = initialCrop(landscape, VIEW);
  assert.equal(clampCrop(landscape, VIEW, { ...start, scale: 0.01 }).scale, start.scale);
  assert.equal(clampCrop(landscape, VIEW, { ...start, scale: 99 }).scale, start.scale * MAX_ZOOM);
});

test("zooming keeps the middle of the frame in the middle", () => {
  const start = { ...initialCrop(landscape, VIEW), x: 40 };
  const before = sourceRect(landscape, VIEW, start);
  const zoomed = zoomTo(landscape, VIEW, start, start.scale * 2);
  const after = sourceRect(landscape, VIEW, zoomed);
  const centre = (r: { sx: number; side: number }) => r.sx + r.side / 2;
  assert.ok(Math.abs(centre(before) - centre(after)) < 1e-9);
  assert.equal(after.side, before.side / 2);
});

test("the cropped square always lies inside the photo", () => {
  const portrait = { width: 640, height: 1280 };
  for (const state of [{ scale: 2, x: -999, y: 999 }, { scale: 0.3, x: 5, y: -5 }]) {
    const r = sourceRect(portrait, VIEW, state);
    assert.ok(r.sx >= 0 && r.sy >= 0);
    assert.ok(r.sx + r.side <= portrait.width + 1e-9 && r.sy + r.side <= portrait.height + 1e-9);
  }
});
