import assert from "node:assert/strict";
import { test } from "node:test";
import { canConfirmPurchase, canRejectPurchase } from "./planPurchaseActions.ts";

const item = (status: string, payment: string) => ({ status, payment: { status: payment } });

test("a reported transfer can be confirmed or rejected", () => {
  assert.equal(canConfirmPurchase(item("PENDING_PAYMENT", "REPORTED")), true);
  assert.equal(canRejectPurchase(item("PENDING_PAYMENT", "REPORTED")), true);
});

test("money PayOS received after the purchase expired can be confirmed or rejected", () => {
  assert.equal(canConfirmPurchase(item("EXPIRED", "REVIEW_REQUIRED")), true);
  assert.equal(canRejectPurchase(item("EXPIRED", "REVIEW_REQUIRED")), true);
});

test("closed purchases offer no action", () => {
  for (const [status, payment] of [
    ["EXPIRED", "EXPIRED"],
    ["COMPLETED", "CONFIRMED"],
    ["REJECTED", "REJECTED"],
    ["SUPERSEDED", "SUPERSEDED"],
    ["PENDING_PAYMENT", "PENDING"],
  ]) {
    assert.equal(canConfirmPurchase(item(status, payment)), false, `${status}/${payment}`);
    assert.equal(canRejectPurchase(item(status, payment)), false, `${status}/${payment}`);
  }
});
