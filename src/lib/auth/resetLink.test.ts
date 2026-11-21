import { test } from "node:test";
import assert from "node:assert/strict";

import { resetLinkProblem } from "./resetLink.ts";

test("a link without a token is refused before any password is typed", () => {
  assert.match(resetLinkProblem("") ?? "", /không đầy đủ/);
  assert.match(resetLinkProblem("   ") ?? "", /không đầy đủ/);
});

test("a 401 means the link expired or was used", () => {
  assert.match(resetLinkProblem("abc", 401) ?? "", /hết hạn hoặc đã được dùng/);
});

test("any other answer leaves the form in place", () => {
  assert.equal(resetLinkProblem("abc"), null);
  assert.equal(resetLinkProblem("abc", 400), null);
  assert.equal(resetLinkProblem("abc", 500), null);
  assert.equal(resetLinkProblem("abc", null), null);
});
