import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { NO_BADGE_FACTS, badgeViews, nextBadge } from "./badges.ts";
import { MATCH_END_QUERY_KEYS, WALLET_QUERY_KEYS } from "./arenaWallet.ts";
import { arenaGameFrom } from "./games.ts";

describe("arenaGameFrom", () => {
  test("?game=blaster opens Pháo Bánh Mì; anything else the duel", () => {
    assert.equal(arenaGameFrom("blaster"), "blaster");
    assert.equal(arenaGameFrom("dungeon"), "dungeon");
    assert.equal(arenaGameFrom("duel"), "duel");
    assert.equal(arenaGameFrom(null), "duel");
    assert.equal(arenaGameFrom("chess"), "duel");
  });
});
import { roundTimer, shouldTick } from "./roundTimer.ts";
import { streakGoal, streakNote } from "./record.ts";
import { resultCopy } from "./result.ts";

describe("resultCopy", () => {
  const base = { rivalName: "Lan", stake: 50, reward: 100, xp: 35, xpCapped: false } as const;
  test("a normal win: net Bánh Mì and XP", () => {
    const c = resultCopy({ ...base, outcome: "win", forfeitReason: null });
    assert.equal(c.title, "Bạn thắng!");
    assert.equal(c.line, "Bạn đã vượt qua Lan.");
    assert.equal(c.banh, "+50");
    assert.equal(c.banhTone, "up");
    assert.equal(c.xp, "+35 XP");
    assert.equal(c.xpNote, null);
  });
  test("why a forfeit happened", () => {
    assert.equal(resultCopy({ ...base, outcome: "win", forfeitReason: "left" }).line, "Lan đã rời trận.");
    assert.equal(resultCopy({ ...base, outcome: "win", forfeitReason: "disconnected" }).line, "Lan mất kết nối quá 15 giây.");
    assert.equal(resultCopy({ ...base, outcome: "lose", forfeitReason: "disconnected" }).line, "Bạn mất kết nối quá 15 giây.");
  });
  test("a loss and a draw", () => {
    const lose = resultCopy({ ...base, outcome: "lose", forfeitReason: null, xp: 0, xpCapped: true });
    assert.equal(lose.banh, "−50");
    // The Arena plays with dictionary words only; nothing points at a review list.
    assert.equal(lose.line, "Lan nhanh hơn lần này. Phục thù ở trận sau nhé!");
    assert.equal(lose.banhTone, "down");
    assert.equal(lose.xp, "+0 XP");
    assert.equal(lose.xpNote, "Đã đủ 150 XP từ Đấu trường hôm nay.");
    const draw = resultCopy({ ...base, outcome: "draw", forfeitReason: null, xp: undefined });
    assert.equal(draw.banh, "±0");
    assert.equal(draw.xp, null);
  });
});

describe("streakNote", () => {
  test("shows the best streak only when it differs from the current one", () => {
    assert.equal(streakNote(1, 3), "dài nhất 3");
    assert.equal(streakNote(3, 3), "kỷ lục của bạn");
    assert.equal(streakNote(0, 0), "chưa có");
    assert.equal(streakNote(0, 2), "dài nhất 2");
  });

  test("streakGoal counts the current streak toward 5, done once the longest reaches 5", () => {
    assert.deepEqual(streakGoal(3, 3), { done: false, value: 3, target: 5, left: 2 });
    assert.deepEqual(streakGoal(0, 4), { done: false, value: 0, target: 5, left: 5 });
    assert.deepEqual(streakGoal(1, 6), { done: true, value: 5, target: 5, left: 0 });
  });
});

describe("roundTimer", () => {
  const start = 1_000_000;

  test("full at the start, empty at the end, never past either", () => {
    assert.deepEqual(roundTimer(start, 15, start), { remainingMs: 15_000, fraction: 1, seconds: 15, phase: "calm" });
    assert.equal(roundTimer(start, 15, start + 20_000).fraction, 0);
    assert.equal(roundTimer(start, 15, start - 500).fraction, 1);
  });

  test("amber from 7 seconds left, rose under 5", () => {
    assert.equal(roundTimer(start, 15, start + 7_999).phase, "calm");
    assert.equal(roundTimer(start, 15, start + 8_000).phase, "warn");
    assert.equal(roundTimer(start, 15, start + 10_000).phase, "warn");
    assert.equal(roundTimer(start, 15, start + 10_001).phase, "danger");
  });

  test("seconds round up, so 0.2 s left still shows 1", () => {
    assert.equal(roundTimer(start, 15, start + 14_800).seconds, 1);
  });

  test("ticks once per second in the last five", () => {
    assert.equal(shouldTick(6, 5), true);
    assert.equal(shouldTick(5, 5), false);
    assert.equal(shouldTick(7, 6), false);
    assert.equal(shouldTick(1, 0), false);
  });
});

describe("badges", () => {
  const facts = { ...NO_BADGE_FACTS, totalXp: 1250 };

  test("progress is the real number capped at the target", () => {
    const views = badgeViews(facts, []);
    assert.deepEqual(views.find((v) => v.name === "Thợ Săn")!.current, { value: 1250, target: 5000, unit: "XP", ratio: 0.25 });
    assert.equal(views.find((v) => v.name === "Tân Binh")!.current!.value, 500);
  });

  test("every badge shows progress toward the 2026-11-08 marks", () => {
    const views = badgeViews(NO_BADGE_FACTS, []);
    const targets = Object.fromEntries(views.map((v) => [v.name, v.current!.target]));
    assert.deepEqual(targets, {
      "Tân Binh": 500,
      "Thợ Săn": 5000,
      "Học Bá": 10,
      "Giọng Đọc Vàng": 10,
      "Chăm Chỉ": 7,
      "Siêu Sao": 1000,
      "Đấu Sĩ Bất Bại": 5,
      "Chuyên Gia Nuôi Thú": 3,
    });
  });

  test("an earned badge carries its awardedAt date", () => {
    const views = badgeViews(facts, [{ awardedAt: "2026-11-02T03:00:00.000Z", badge: { name: "Tân Binh" } }]);
    assert.equal(views.find((v) => v.name === "Tân Binh")!.earnedAt, "2026-11-02T03:00:00.000Z");
  });

  test("a badge in the list is earned even without a date, and is never the next badge", () => {
    const views = badgeViews(facts, [{ badge: { name: "Tân Binh" } }]);
    assert.notEqual(views.find((v) => v.name === "Tân Binh")!.earnedAt, null);
    assert.notEqual(nextBadge(views)?.name, "Tân Binh");
  });

  test("a badge already at its target is not offered as the next one", () => {
    const views = badgeViews({ ...NO_BADGE_FACTS, longestArenaWinStreak: 5 }, []);
    assert.notEqual(nextBadge(views)?.name, "Đấu Sĩ Bất Bại");
  });

  test("next badge is the unearned one closest to done", () => {
    const views = badgeViews({ ...facts, streak: 5 }, [{ awardedAt: "x", badge: { name: "Tân Binh" } }]);
    // Chăm Chỉ 5/7 beats Chuyên Gia Nuôi Thú 1/3 and Thợ Săn 1.250/5.000.
    assert.equal(nextBadge(views)!.name, "Chăm Chỉ");
  });
});

describe("arena wallet keys", () => {
  test("cover every query that shows Bánh Mì, by prefix", () => {
    assert.deepEqual(WALLET_QUERY_KEYS, [["user-stats"], ["profile"], ["market-balance"]]);
  });

  test("a finished match also refreshes the ranking, the feed, the arena record and the badges", () => {
    assert.deepEqual(MATCH_END_QUERY_KEYS.slice(-5), [["ranking"], ["ranking-activity"], ["arena-stats"], ["my-badges"], ["badge-progress"]]);
  });
});
