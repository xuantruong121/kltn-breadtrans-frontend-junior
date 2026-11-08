import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { emptyPlace, formatValue, hasPeriods, initials, leagueLine, timeAgo, valueHeading } from "./rankingLogic.ts";

describe("values", () => {
  test("each metric reads its own way", () => {
    assert.equal(formatValue("xp", 27900), "27.900 XP");
    assert.equal(formatValue("streak", 233), "233 ngày");
    assert.equal(formatValue("referral", 3356), "3.356 bạn");
    assert.equal(valueHeading("referral"), "Đã mời");
  });
  test("the streak has no period", () => {
    assert.equal(hasPeriods("streak"), false);
    assert.equal(hasPeriods("xp"), true);
  });
});

describe("timeAgo", () => {
  const now = Date.parse("2026-11-08T12:00:00Z");
  test("seconds, minutes, hours, days", () => {
    assert.equal(timeAgo("2026-11-08T11:59:30Z", now), "vừa xong");
    assert.equal(timeAgo("2026-11-08T11:56:00Z", now), "4 phút trước");
    assert.equal(timeAgo("2026-11-08T09:00:00Z", now), "3 giờ trước");
    assert.equal(timeAgo("2026-11-05T12:00:00Z", now), "3 ngày trước");
  });
});

describe("initials", () => {
  test("first and last word, or the first two letters", () => {
    assert.equal(initials("Nguyễn Ngọc Tín"), "NT");
    assert.equal(initials("Chip"), "CH");
    assert.equal(initials("  "), "?");
  });
});

describe("leagueLine", () => {
  test("promotion, top tier, demotion", () => {
    assert.equal(
      leagueLine({ tier: "Vàng", xpToPromotion: 120, inDemotionZone: false, xpToLeaveDemotion: null }),
      "Hạng Vàng · cần thêm 120 XP để vào vùng lên hạng",
    );
    assert.equal(leagueLine({ tier: "Vàng", xpToPromotion: 0, inDemotionZone: false, xpToLeaveDemotion: null }), "Hạng Vàng · đang ở vùng lên hạng tuần này");
    assert.equal(leagueLine({ tier: "Kim Cương", xpToPromotion: null, inDemotionZone: false, xpToLeaveDemotion: null }), "Hạng Kim Cương · hạng cao nhất");
    assert.equal(
      leagueLine({ tier: "Bạc", xpToPromotion: 50, inDemotionZone: true, xpToLeaveDemotion: 1200 }),
      "Hạng Bạc · đang ở vùng xuống hạng, cần thêm 1.200 XP để thoát",
    );
    assert.equal(leagueLine(null), null);
  });
  test("an empty place says what is missing", () => {
    assert.equal(emptyPlace("xp", "week"), "Chưa có XP tuần này");
    assert.equal(emptyPlace("streak", "all"), "Chưa có chuỗi ngày học");
  });
});
