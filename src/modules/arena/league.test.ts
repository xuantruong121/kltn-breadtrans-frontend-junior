import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { MATCH_END_QUERY_KEYS, WALLET_QUERY_KEYS } from "./arenaWallet.ts";
import { isLeagueTier, leagueQuery, leagueZones, nextLeagueReset, xpToPromotion } from "./league.ts";

describe("arena wallet keys", () => {
  test("cover every query that shows Bánh Mì, by prefix", () => {
    assert.deepEqual(WALLET_QUERY_KEYS, [["user-stats"], ["profile"], ["market-balance"]]);
  });

  test("a finished match also refreshes the league, my place in it and the arena record", () => {
    assert.deepEqual(MATCH_END_QUERY_KEYS.slice(-5), [["leaderboard"], ["arena-snippet"], ["arena-stats"], ["my-badges"], ["badge-progress"]]);
  });
});

describe("leagueQuery", () => {
  test("sends the Vietnamese tier name the backend filters on", () => {
    assert.deepEqual(leagueQuery("Bạc"), { tier: "Bạc", scope: "tier" });
    assert.deepEqual(leagueQuery("Kim Cương"), { tier: "Kim Cương", scope: "tier" });
  });

  test("ALL asks for every tier together", () => {
    assert.deepEqual(leagueQuery("ALL"), { scope: "all" });
  });

  test("only the five stored names are tiers", () => {
    assert.equal(isLeagueTier("Vàng"), true);
    assert.equal(isLeagueTier("GOLD"), false);
  });
});

describe("leagueZones (same arithmetic as triggerWeeklyCron)", () => {
  test("20 learners in Bạc: top 4 up, ranks 17-20 down", () => {
    assert.deepEqual(leagueZones(20, "Bạc"), { promoteCount: 4, demoteFrom: 17 });
  });

  test("Đồng never demotes; Kim Cương never promotes", () => {
    assert.equal(leagueZones(20, "Đồng").demoteFrom, null);
    assert.equal(leagueZones(20, "Kim Cương").promoteCount, 0);
    assert.equal(leagueZones(20, "Kim Cương").demoteFrom, 17);
  });

  test("small tiers: one learner is promoted, nobody demoted until five", () => {
    assert.deepEqual(leagueZones(1, "Bạc"), { promoteCount: 1, demoteFrom: null });
    assert.deepEqual(leagueZones(4, "Bạc"), { promoteCount: 1, demoteFrom: null });
    assert.deepEqual(leagueZones(5, "Bạc"), { promoteCount: 1, demoteFrom: 5 });
    assert.deepEqual(leagueZones(0, "Bạc"), { promoteCount: 0, demoteFrom: null });
  });
});

describe("xpToPromotion", () => {
  const entries = [
    { rank: 1, weeklyExp: 900 },
    { rank: 2, weeklyExp: 640 },
    { rank: 3, weeklyExp: 300 },
  ];

  test("one XP more than the learner at the cut-off", () => {
    assert.equal(xpToPromotion(3, 300, 2, entries), 341);
  });

  test("zero inside the zone, null when there is no promotion", () => {
    assert.equal(xpToPromotion(2, 640, 2, entries), 0);
    assert.equal(xpToPromotion(3, 300, 0, entries), null);
  });
});

describe("nextLeagueReset", () => {
  // 2026-11-08 is a Sunday.
  test("Sunday 20:00 in Vietnam resets the next day at 00:01", () => {
    const now = Date.parse("2026-11-08T13:00:00Z"); // 20:00 VN
    assert.equal(new Date(nextLeagueReset(now)).toISOString(), "2026-11-08T17:01:00.000Z");
  });

  test("Monday 00:05 in Vietnam waits a full week", () => {
    const now = Date.parse("2026-11-08T17:05:00Z"); // Monday 00:05 VN
    assert.equal(new Date(nextLeagueReset(now)).toISOString(), "2026-11-15T17:01:00.000Z");
  });

  test("Monday 00:00 in Vietnam resets one minute later", () => {
    const now = Date.parse("2026-11-08T17:00:00Z");
    assert.equal(nextLeagueReset(now) - now, 60_000);
  });
});
