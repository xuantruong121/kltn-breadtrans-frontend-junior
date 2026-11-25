import { test } from "node:test";
import assert from "node:assert/strict";

import { viNumber } from "./costFormat.ts";

test("decimals use a comma and thousands a dot, as on the rest of the page (owner 2026-11-25)", () => {
  assert.equal(viNumber(2.5), "2,5");
  assert.equal(viNumber(297.5), "297,5");
  assert.equal(viNumber(755.94), "755,9");
  assert.equal(viNumber(10240), "10.240");
  assert.equal(viNumber(9.2612, 2), "9,26");
  assert.equal(viNumber(300), "300");
  assert.equal(viNumber(0), "0");
});
