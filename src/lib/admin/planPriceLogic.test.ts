import assert from "node:assert/strict";
import test from "node:test";

import {
  grantedFeatureKeys,
  pricePer30Days,
  priceWarning,
  readPriceInput,
  savingPercent,
  termRows,
  type PriceVersion,
} from "./planPriceLogic.ts";

const ents = [
  { featureKey: "PREMIUM_VOCAB", enabled: true },
  { featureKey: "PREMIUM_READING", enabled: true },
];
const v = (over: Partial<PriceVersion> & Pick<PriceVersion, "id" | "version">): PriceVersion => ({
  durationDays: 30,
  priceVnd: 69000,
  status: "PUBLISHED",
  isCurrent: true,
  publishedAt: "2026-11-04T00:00:00.000Z",
  entitlements: ents,
  ...over,
});

// Plus as it is in kltn_db on 2026-11-28 (the API lists newest version first).
const PLUS: PriceVersion[] = [
  v({ id: 107, version: 5, durationDays: 180, priceVnd: 331000, status: "RETIRED", isCurrent: false, publishedAt: null }),
  v({ id: 103, version: 4, durationDays: 180, priceVnd: 331000 }),
  v({ id: 102, version: 3, durationDays: 90, priceVnd: 186000 }),
  v({ id: 100, version: 2, durationDays: 30, priceVnd: 69000 }),
  v({ id: 21, version: 1, durationDays: 30, priceVnd: 69000, status: "RETIRED", isCurrent: false, publishedAt: "2026-10-01T00:00:00.000Z" }),
];

test("every term on sale gets a row, shortest first, not only the newest version", () => {
  const rows = termRows(PLUS);
  assert.deepEqual(rows.map((r) => r.days), [30, 90, 180]);
  assert.deepEqual(rows.map((r) => r.current?.priceVnd), [69000, 186000, 331000]);
  assert.deepEqual(rows.map((r) => r.current?.id), [100, 102, 103]);
});

test("a term that is not on sale has no row; a discarded draft is not a term", () => {
  const rows = termRows([v({ id: 1, version: 1, durationDays: 90 }), v({ id: 2, version: 2, durationDays: 365, status: "DRAFT", isCurrent: false })]);
  assert.deepEqual(rows.map((r) => r.days), [90]);
});

test("a free version without a term gives no row", () => {
  assert.deepEqual(termRows([v({ id: 1, version: 1, durationDays: null, priceVnd: 0 })]), []);
});

test("the price history of a term lists published prices, newest first, and skips what never went on sale", () => {
  const rows = termRows([
    v({ id: 110, version: 6, durationDays: 30, priceVnd: 79000, publishedAt: "2026-11-20T00:00:00.000Z" }),
    v({ id: 100, version: 2, durationDays: 30, priceVnd: 69000, status: "RETIRED", isCurrent: false, publishedAt: "2026-11-04T00:00:00.000Z" }),
    v({ id: 21, version: 1, durationDays: 30, priceVnd: 69000, status: "RETIRED", isCurrent: false, publishedAt: "2026-10-01T00:00:00.000Z" }),
    v({ id: 107, version: 5, durationDays: 180, priceVnd: 331000, status: "RETIRED", isCurrent: false, publishedAt: null }),
    v({ id: 103, version: 4, durationDays: 180, priceVnd: 331000 }),
  ]);
  const thirty = rows.find((r) => r.days === 30)!;
  assert.deepEqual(thirty.history.map((h) => [h.priceVnd, h.isCurrent]), [[79000, true], [69000, false], [69000, false]]);
  const oneEighty = rows.find((r) => r.days === 180)!;
  assert.deepEqual(oneEighty.history.map((h) => h.versionId), [103]); // v5 was never published
});

test("the price of a longer term per 30 days, rounded to the thousand", () => {
  assert.equal(pricePer30Days(186000, 90), 62000);
  assert.equal(pricePer30Days(331000, 180), 55000);
  assert.equal(pricePer30Days(69000, 30), 69000);
});

test("the saving against buying 30 days again and again", () => {
  assert.equal(savingPercent(186000, 90, 69000), 10);
  assert.equal(savingPercent(331000, 180, 69000), 20);
  assert.equal(savingPercent(715000, 180, 149000), 20);
  assert.equal(savingPercent(69000, 30, 69000), null);
  assert.equal(savingPercent(300000, 90, 69000), null); // dearer than three months of 30 days
  assert.equal(savingPercent(186000, 90, null), null);
});

test("a longer term that is not cheaper per day gets a soft warning", () => {
  const rows = termRows(PLUS);
  assert.equal(priceWarning(rows, 180, 331000), null);
  assert.match(priceWarning(rows, 180, 420000) ?? "", /mức 180 ngày không rẻ hơn mức 30 ngày/); // 2.333 a day against 2.300
  assert.match(priceWarning(rows, 90, 400000) ?? "", /mức 90 ngày không rẻ hơn mức 30 ngày/);
  assert.match(priceWarning(rows, 30, 40000) ?? "", /mức 90 ngày không rẻ hơn mức 30 ngày/); // a very cheap 30 days makes 90 days the dearer
  assert.equal(priceWarning(rows, 30, 79000), null);
  assert.match(priceWarning(rows, 90, 150000) ?? "", /mức 180 ngày không rẻ hơn mức 90 ngày/); // 1.667 a day makes 180 days (1.839) the dearer
  assert.equal(priceWarning(rows, 90, 170000), null);
});

test("what the admin types is read as a price, with a problem worded for the admin", () => {
  assert.deepEqual(readPriceInput("350000", 331000), { value: 350000, problem: null });
  assert.deepEqual(readPriceInput("350.000", 331000), { value: 350000, problem: null });
  assert.deepEqual(readPriceInput(" 350 000 ", 331000), { value: 350000, problem: null });
  assert.match(readPriceInput("", 331000).problem ?? "", /Nhập giá mới/);
  assert.match(readPriceInput("abc", 331000).problem ?? "", /chữ số/);
  assert.match(readPriceInput("12.5k", 331000).problem ?? "", /chữ số/);
  assert.match(readPriceInput("0", 331000).problem ?? "", /lớn hơn 0/);
  assert.match(readPriceInput("100000001", 331000).problem ?? "", /tối đa/);
  assert.match(readPriceInput("331000", 331000).problem ?? "", /trùng/);
  assert.equal(readPriceInput("331000", 331000).value, null);
});

test("the features a plan grants come from the version on sale", () => {
  assert.deepEqual(grantedFeatureKeys(PLUS), ["PREMIUM_VOCAB", "PREMIUM_READING"]);
  assert.deepEqual(grantedFeatureKeys([v({ id: 1, version: 1, entitlements: [{ featureKey: "A", enabled: false }, { featureKey: "B", enabled: true }] })]), ["B"]);
  assert.deepEqual(grantedFeatureKeys([]), []);
});
