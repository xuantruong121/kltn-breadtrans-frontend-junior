import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { dockStartsFolded } from "./dockLayout.ts";

describe("dockStartsFolded", () => {
  test("folds on a phone held upright", () => {
    assert.equal(dockStartsFolded(390, 844), true);
    assert.equal(dockStartsFolded(320, 568), true);
  });

  test("folds on a phone held sideways, where the open bar covered the game cards", () => {
    assert.equal(dockStartsFolded(667, 375), true);
    assert.equal(dockStartsFolded(844, 390), true);
    assert.equal(dockStartsFolded(932, 430), true);
  });

  test("stays open on a tablet or a computer", () => {
    assert.equal(dockStartsFolded(820, 1180), false);
    assert.equal(dockStartsFolded(1280, 650), false);
  });
});
