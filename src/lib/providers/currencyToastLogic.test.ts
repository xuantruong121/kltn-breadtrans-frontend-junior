import assert from "node:assert/strict";
import test from "node:test";

import { currencyToastKind } from "./currencyToastLogic.ts";

test("Song Đấu events update the balance without a toast, whatever the amount", () => {
  assert.equal(currencyToastKind({ amount: 120, source: "arena" }), null);
  assert.equal(currencyToastKind({ amount: 50, source: "arena" }), null);
  assert.equal(currencyToastKind({ amount: -50, source: "arena" }), null);
});

test("other events get a toast by the sign of the amount", () => {
  assert.equal(currencyToastKind({ amount: 30 }), "gain");
  assert.equal(currencyToastKind({ amount: -200 }), "loss");
  assert.equal(currencyToastKind({ amount: 0 }), null);
  assert.equal(currencyToastKind({}), null);
});
