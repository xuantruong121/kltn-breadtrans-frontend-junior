import { test } from "node:test";
import assert from "node:assert/strict";

import {
  availablePlanTerms,
  getPlusPricingDisplay,
  pickPlanTerm,
  termSavingPercent,
} from "./planLogic.ts";

const v = (id: number, durationDays: number, priceVnd: number) => ({
  id,
  version: 1,
  priceVnd,
  currency: "VND",
  durationDays,
});

const catalog = [
  { code: "FREE", purchasable: false, currentVersion: null, versions: [] },
  {
    code: "PLUS",
    purchasable: true,
    currentVersion: v(1, 30, 69000),
    versions: [v(1, 30, 69000), v(2, 90, 186000), v(3, 180, 331000)],
  },
  {
    code: "PRO",
    purchasable: true,
    currentVersion: v(4, 30, 149000),
    versions: [v(4, 30, 149000), v(5, 90, 402000), v(6, 180, 715000)],
  },
];

test("availablePlanTerms lists the sold terms shortest first", () => {
  assert.deepEqual(availablePlanTerms(catalog), [30, 90, 180]);
  assert.deepEqual(availablePlanTerms(undefined), []);
});

test("pickPlanTerm returns the version of the chosen term", () => {
  assert.equal(pickPlanTerm(catalog, "PRO", 90)?.id, 5);
  assert.equal(pickPlanTerm(catalog, "PLUS", 180)?.priceVnd, 331000);
  assert.equal(pickPlanTerm(catalog, "PLUS", 365), null);
});

test("an older server without versions sells only its current 30 days", () => {
  const old = [{ code: "PLUS", purchasable: true, currentVersion: v(1, 30, 69000) }];
  assert.deepEqual(availablePlanTerms(old), [30]);
  assert.equal(pickPlanTerm(old, "PLUS", 30)?.id, 1);
  assert.equal(pickPlanTerm(old, "PLUS", 90), null);
});

test("termSavingPercent shows the owner's 10% and 20%", () => {
  assert.equal(termSavingPercent(catalog, "PLUS", 30), null);
  assert.equal(termSavingPercent(catalog, "PLUS", 90), 10);
  assert.equal(termSavingPercent(catalog, "PLUS", 180), 20);
  assert.equal(termSavingPercent(catalog, "PRO", 90), 10);
  assert.equal(termSavingPercent(catalog, "PRO", 180), 20);
});

test("a long term shows what 30 days come to", () => {
  const d = getPlusPricingDisplay({ id: 2, priceVnd: 186000, durationDays: 90, currency: "VND" });
  assert.equal(d.durationText, " / 90 ngày");
  assert.match(d.perMonthText ?? "", /^≈ 62\.000\s₫ \/ 30 ngày$/);
  assert.equal(getPlusPricingDisplay({ id: 1, priceVnd: 69000, durationDays: 30, currency: "VND" }).perMonthText, undefined);
});
