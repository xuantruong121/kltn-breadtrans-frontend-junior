import test from "node:test";
import assert from "node:assert/strict";
import { formatIpa } from "./phonetic.ts";

test("formatIpa wraps a phonetic in one pair of slashes", () => {
  assert.equal(formatIpa("ˈæf.ə"), "/ˈæf.ə/");
  assert.equal(formatIpa("/ˈæf.ə/"), "/ˈæf.ə/");
  assert.equal(formatIpa(" //əˈdʒen.də// "), "/əˈdʒen.də/");
});

test("formatIpa gives nothing for a missing phonetic, never a placeholder", () => {
  assert.equal(formatIpa(undefined), null);
  assert.equal(formatIpa(null), null);
  assert.equal(formatIpa("  "), null);
  assert.equal(formatIpa("//"), null);
});
