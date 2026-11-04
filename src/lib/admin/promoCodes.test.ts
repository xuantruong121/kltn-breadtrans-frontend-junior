import assert from "node:assert/strict";
import { test } from "node:test";
import { EMPTY_PROMO_DRAFT, promoDraftToBody, promoStatus, type AdminPromoCode } from "./promoCodes.ts";

test("promoDraftToBody builds the request from the form", () => {
  const result = promoDraftToBody({
    ...EMPTY_PROMO_DRAFT,
    code: " tet 2027 ",
    percentOff: "15",
    validTo: "2027-02-15",
    plan: "PLUS",
    maxRedemptions: "100",
    note: " Tết ",
  });
  assert.deepEqual(result, {
    ok: true,
    body: {
      code: "TET2027",
      percentOff: 15,
      validTo: "2027-02-15T16:59:59.000Z",
      planCodes: ["PLUS"],
      maxRedemptions: 100,
      note: "Tết",
    },
  });
});

test("promoDraftToBody leaves optional fields out", () => {
  assert.deepEqual(promoDraftToBody({ ...EMPTY_PROMO_DRAFT, code: "ALL20" }), {
    ok: true,
    body: { code: "ALL20", percentOff: 20 },
  });
});

test("promoDraftToBody explains a bad form", () => {
  assert.equal(promoDraftToBody({ ...EMPTY_PROMO_DRAFT, code: "a" }).ok, false);
  assert.equal(promoDraftToBody({ ...EMPTY_PROMO_DRAFT, code: "OK1", percentOff: "95" }).ok, false);
  assert.equal(promoDraftToBody({ ...EMPTY_PROMO_DRAFT, code: "OK1", maxRedemptions: "0" }).ok, false);
});

test("promoStatus", () => {
  const base: AdminPromoCode = {
    id: 1, code: "X", percentOff: 20, validFrom: null, validTo: null, planCodes: [],
    maxRedemptions: null, perUserOnce: true, source: "ADMIN", ownerEmail: null, active: true,
    note: null, redemptions: 0, discountGivenVnd: 0, createdAt: "2026-11-04T00:00:00Z",
  };
  const now = new Date("2026-11-05T00:00:00Z");
  assert.equal(promoStatus(base, now), "Còn hiệu lực");
  assert.equal(promoStatus({ ...base, active: false }, now), "Đã tắt");
  assert.equal(promoStatus({ ...base, validTo: "2026-11-04T00:00:00Z" }, now), "Hết hạn");
  assert.equal(promoStatus({ ...base, maxRedemptions: 1, redemptions: 1 }, now), "Hết lượt");
});
