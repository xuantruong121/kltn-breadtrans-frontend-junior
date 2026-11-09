import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { GAME_KIND, gameStatus, isNew } from "./gameNav.ts";

describe("isNew", () => {
  test("Hầm Bánh Mì wears the tag until 15 Nov 2026 in Vietnam; the others never", () => {
    assert.equal(isNew("dungeon", new Date("2026-11-09T10:00:00+07:00")), true);
    assert.equal(isNew("dungeon", new Date("2026-11-15T23:00:00+07:00")), true);
    assert.equal(isNew("dungeon", new Date("2026-11-16T00:30:00+07:00")), false);
    assert.equal(isNew("duel", new Date("2026-11-09T10:00:00+07:00")), false);
  });
});

describe("gameStatus", () => {
  test("a guest sees what the game is, no record", () => {
    assert.deepEqual(gameStatus("duel", { isGuest: true }), { text: "Đấu thật với học viên khác", nudge: false });
    assert.equal(gameStatus("dungeon", { isGuest: true }).text, "Boss mỗi 5 tầng");
  });
  test("the duel: no match yet nudges; otherwise the win rate and a running streak", () => {
    assert.deepEqual(gameStatus("duel", { isGuest: false, duel: { played: 0, winRate: null, currentWinStreak: 0 } }), {
      text: "Chưa đấu trận nào",
      nudge: true,
    });
    assert.equal(gameStatus("duel", { isGuest: false, duel: { played: 7, winRate: 57, currentWinStreak: 0 } }).text, "Thắng 57%");
    assert.equal(gameStatus("duel", { isGuest: false, duel: { played: 7, winRate: 57, currentWinStreak: 3 } }).text, "Thắng 57% · chuỗi 3");
  });
  test("the dungeon: today's run left nudges; then today's floor; the record either way", () => {
    const me = (playedToday: boolean, dailyFloor: number | null, bestFree: number | null) => ({
      me: { playedToday, dailyFloor, bestFree, bestDaily: dailyFloor },
    });
    assert.deepEqual(gameStatus("dungeon", { isGuest: false, dungeon: me(false, null, null) }), { text: "Hôm nay còn 1 lượt", nudge: true });
    assert.equal(gameStatus("dungeon", { isGuest: false, dungeon: me(false, null, 6) }).text, "Hôm nay còn 1 lượt · kỷ lục tầng 6");
    assert.equal(gameStatus("dungeon", { isGuest: false, dungeon: me(true, 4, 6) }).text, "Hôm nay: tầng 4 · kỷ lục tầng 6");
  });
  test("every game has a kind", () => {
    assert.deepEqual(GAME_KIND, { duel: "1v1", blaster: "Solo", dungeon: "Roguelite" });
  });
});
