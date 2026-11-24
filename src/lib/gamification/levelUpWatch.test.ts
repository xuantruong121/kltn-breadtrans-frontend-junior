import test from "node:test";
import assert from "node:assert/strict";

import {
  isLevelUpNotice,
  levelSeenKey,
  levelUpsToCelebrate,
  petLevelKey,
  readLevelSeen,
  writeLevelSeen,
} from "./levelUpWatch.ts";

test("the first time a user is seen, levels are recorded and nothing is announced", () => {
  const result = levelUpsToCelebrate(null, { xp: 5, pet: { key: "bready", level: 2 } });
  assert.equal(result.xp, null);
  assert.equal(result.pet, null);
  assert.equal(result.changed, true);
  assert.deepEqual(result.seen, { xp: 5, pet: { bready: 2 } });
});

test("a higher XP level is announced once", () => {
  const first = levelUpsToCelebrate({ xp: 4, pet: {} }, { xp: 5 });
  assert.equal(first.xp, 5);
  assert.equal(first.seen.xp, 5);
  const again = levelUpsToCelebrate(first.seen, { xp: 5 });
  assert.equal(again.xp, null);
  assert.equal(again.changed, false);
});

test("a jump over several levels announces the level reached", () => {
  assert.equal(levelUpsToCelebrate({ xp: 2 }, { xp: 4 }).xp, 4);
});

test("a lower level is recorded without an announcement", () => {
  const result = levelUpsToCelebrate({ xp: 6 }, { xp: 3 });
  assert.equal(result.xp, null);
  assert.equal(result.seen.xp, 3);
  assert.equal(result.changed, true);
});

test("each pet keeps its own level, so switching pets announces nothing", () => {
  const seen = { xp: 3, pet: { bready: 4 } };
  const switched = levelUpsToCelebrate(seen, { xp: 3, pet: { key: "owly", level: 1 } });
  assert.equal(switched.pet, null);
  assert.deepEqual(switched.seen.pet, { bready: 4, owly: 1 });
  const back = levelUpsToCelebrate(switched.seen, { xp: 3, pet: { key: "bready", level: 5 } });
  assert.equal(back.pet, 5);
});

test("missing data is left alone", () => {
  const result = levelUpsToCelebrate({ xp: 3 }, { xp: null, pet: null });
  assert.equal(result.changed, false);
  assert.deepEqual(result.seen, { xp: 3, pet: {} });
});

test("level-up notifications are told apart from the others", () => {
  assert.equal(isLevelUpNotice("level_up:5"), true);
  assert.equal(isLevelUpNotice("pet_level_up:3"), true);
  assert.equal(isLevelUpNotice("streak"), false);
  assert.equal(isLevelUpNotice(undefined), false);
});

test("a pet is keyed by its name", () => {
  assert.equal(petLevelKey(" Bready "), "bready");
  assert.equal(petLevelKey(""), "pet");
});

test("storage round-trips, and unreadable or blocked storage gives null", () => {
  const store = new Map<string, string>();
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
  };
  writeLevelSeen(storage, 7, { xp: 5, pet: { bready: 2 } });
  assert.deepEqual(readLevelSeen(storage, 7), { xp: 5, pet: { bready: 2 } });
  assert.equal(readLevelSeen(storage, 8), null);

  store.set(levelSeenKey(9), "{not json");
  assert.equal(readLevelSeen(storage, 9), null);
  store.set(levelSeenKey(10), JSON.stringify({ xp: "5", pet: { bready: 0, owly: 2 } }));
  assert.deepEqual(readLevelSeen(storage, 10), { pet: { owly: 2 } });

  const blocked = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
  };
  assert.equal(readLevelSeen(blocked, 7), null);
  assert.doesNotThrow(() => writeLevelSeen(blocked, 7, { xp: 1 }));
  assert.equal(readLevelSeen(null, 7), null);
});
