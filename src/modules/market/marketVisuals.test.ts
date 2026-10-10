import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { getKnownMarketVisualSlugs, getMarketItemVisual } from "./marketVisuals.ts";

const projectRoot = resolve(process.cwd());

test("every canonical shop slug resolves to a local visual", () => {
  const slugs = getKnownMarketVisualSlugs();
  assert.equal(slugs.length, 12);
  for (const slug of slugs) {
    const visual = getMarketItemVisual(slug);
    assert.ok(existsSync(resolve(projectRoot, "public", visual.src.slice(1))));
    assert.ok(visual.alt.length > 5);
  }
});

test("unknown items still receive a category-safe local fallback", () => {
  assert.equal(getMarketItemVisual("future-item", "PHYSICAL").src, "/images/market/gift-notebook.svg");
  assert.equal(getMarketItemVisual("future-item", "BADGE").src, "/images/market/badge-star.svg");
});
