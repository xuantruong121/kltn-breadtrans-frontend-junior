import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { badgeViews, nextBadge } from "./badges.ts";
import { formatCountdown, xpToLeaveDemotion } from "./league.ts";
import { roundTimer, shouldTick } from "./roundTimer.ts";

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
  const facts = { totalXp: 250, streak: 0, petLevel: 1, arenaWins: 0 };

  test("progress is the real number capped at the target; one-off badges have none", () => {
    const views = badgeViews(facts, []);
    const hunter = views.find((v) => v.name === "Thợ Săn")!;
    assert.deepEqual(hunter.current, { value: 250, target: 1000, unit: "XP", ratio: 0.25 });
    assert.equal(views.find((v) => v.name === "Tân Binh")!.current!.value, 100);
    assert.equal(views.find((v) => v.name === "Siêu Sao")!.current, null);
  });

  test("an earned badge carries its awardedAt date", () => {
    const views = badgeViews(facts, [{ awardedAt: "2026-11-02T03:00:00.000Z", badge: { name: "Tân Binh" } }]);
    assert.equal(views.find((v) => v.name === "Tân Binh")!.earnedAt, "2026-11-02T03:00:00.000Z");
  });

  test("a badge in the list is earned even without a date, and is never the next badge", () => {
    const views = badgeViews({ ...facts, totalXp: 100 }, [{ badge: { name: "Tân Binh" } }]);
    assert.notEqual(views.find((v) => v.name === "Tân Binh")!.earnedAt, null);
    assert.notEqual(nextBadge(views)?.name, "Tân Binh");
  });

  test("next badge is the unearned one closest to done", () => {
    const views = badgeViews({ ...facts, petLevel: 1 }, [{ awardedAt: "x", badge: { name: "Tân Binh" } }]);
    // Chuyên Gia Nuôi Thú 1/2 beats Thợ Săn 250/1000.
    assert.equal(nextBadge(views)!.name, "Chuyên Gia Nuôi Thú");
  });
});

describe("league helpers", () => {
  const entries = [
    { rank: 15, weeklyExp: 120 },
    { rank: 16, weeklyExp: 90 },
    { rank: 17, weeklyExp: 40 },
  ];

  test("XP to climb out of the demotion zone", () => {
    assert.equal(xpToLeaveDemotion(17, 40, 17, entries), 51);
    assert.equal(xpToLeaveDemotion(16, 90, 17, entries), null);
    assert.equal(xpToLeaveDemotion(17, 40, null, entries), null);
  });

  test("countdown names its units: days and hours, or down to the second", () => {
    assert.equal(formatCountdown(2 * 86_400_000 + 5 * 3_600_000 + 12 * 60_000 + 30_000), "2 ngày 5 giờ");
    assert.equal(formatCountdown(13 * 3_600_000 + 28 * 60_000 + 43_000), "13 giờ 28 phút 43 giây");
    assert.equal(formatCountdown(4 * 60_000 + 9_000), "4 phút 9 giây");
    assert.equal(formatCountdown(-5), "0 phút 0 giây");
  });
});
