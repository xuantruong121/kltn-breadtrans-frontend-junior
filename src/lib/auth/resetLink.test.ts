import { test } from "node:test";
import assert from "node:assert/strict";

import {
  RESET_LINK_EXPIRED,
  RESET_LINK_INCOMPLETE,
  resetCheckProblem,
  resetLinkProblem,
} from "./resetLink.ts";

const TOKEN = "994a4125823e6f9b9cedb8fc756076370db0f3e4d13625f7db0fcd3296cfc0da";

test("a link without a token is refused before any password is typed", () => {
  assert.equal(resetLinkProblem(""), RESET_LINK_INCOMPLETE);
  assert.equal(resetLinkProblem("   "), RESET_LINK_INCOMPLETE);
  assert.match(RESET_LINK_INCOMPLETE, /không đầy đủ/);
});

test("a token that is not 64 hex characters was cut or changed on the way", () => {
  assert.equal(resetLinkProblem("abc"), RESET_LINK_INCOMPLETE);
  assert.equal(resetLinkProblem(TOKEN.slice(0, 63)), RESET_LINK_INCOMPLETE);
  assert.equal(resetLinkProblem(`${TOKEN}0`), RESET_LINK_INCOMPLETE);
  assert.equal(resetLinkProblem(TOKEN.toUpperCase()), RESET_LINK_INCOMPLETE);
});

test("a 401 means the link expired or was used", () => {
  assert.equal(resetLinkProblem(TOKEN, 401), RESET_LINK_EXPIRED);
  assert.match(RESET_LINK_EXPIRED, /hết hạn hoặc đã được dùng/);
});

test("a well-formed token leaves the form in place on any other answer", () => {
  assert.equal(resetLinkProblem(TOKEN), null);
  assert.equal(resetLinkProblem(TOKEN, 400), null);
  assert.equal(resetLinkProblem(TOKEN, 500), null);
  assert.equal(resetLinkProblem(TOKEN, null), null);
});

test("the check closes the form only on a clear valid: false", () => {
  assert.equal(resetCheckProblem({ valid: false }), RESET_LINK_EXPIRED);
  assert.equal(resetCheckProblem({ valid: true }), null);
});

test("a missing or odd check answer never closes the form (old server, network error)", () => {
  assert.equal(resetCheckProblem(undefined), null);
  assert.equal(resetCheckProblem(null), null);
  assert.equal(resetCheckProblem({}), null);
  assert.equal(resetCheckProblem({ valid: "no" }), null);
  assert.equal(resetCheckProblem("<html>404</html>"), null);
});
