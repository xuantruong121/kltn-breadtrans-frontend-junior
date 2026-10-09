import assert from "node:assert/strict";
import test from "node:test";
import { practiceProgressPercent } from "./practiceShellLogic.ts";

test("PracticeShell progress handles empty and bounded sessions", () => {
  assert.equal(practiceProgressPercent(), 0);
  assert.equal(practiceProgressPercent(1, 4), 25);
  assert.equal(practiceProgressPercent(9, 8), 100);
});
