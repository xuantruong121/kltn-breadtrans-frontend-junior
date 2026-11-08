import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { getKnownMarketVisualSlugs, getMarketItemVisual } from "./marketVisuals.ts";

const projectRoot = resolve(process.cwd());

test("every canonical shop slug resolves to a local visual", () => {
  const slugs = getKnownMarketVisualSlugs();
  // 12 seeded products plus the old voucher slug, kept for its past orders.
  assert.equal(slugs.length, 13);
  assert.ok(slugs.includes("plus-7d"));
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
