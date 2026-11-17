import assert from "node:assert/strict";
import test from "node:test";

import { PROGRESS_QUERY_KEYS } from "./progressRefresh.ts";

test("rewards applied: the streak, XP, Bánh Mì, quests and today's numbers refetch", () => {
  const keys = PROGRESS_QUERY_KEYS.map((key) => key.join("/"));
  for (const key of ["user-stats", "profile", "market-balance", "dashboard-today", "myQuests", "daily-quests", "my-pet"]) {
    assert.ok(keys.includes(key), key);
  }
});

test("each key is a prefix: one entry refreshes the query for every user id", () => {
  for (const key of PROGRESS_QUERY_KEYS) assert.equal(key.length, 1, key.join("/"));
});
