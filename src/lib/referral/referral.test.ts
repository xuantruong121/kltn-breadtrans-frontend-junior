import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeReferralCode, referralCodeFromSearch, referralLink } from "./referral.ts";

test("referralCodeFromSearch reads a valid ref code only", () => {
  assert.equal(referralCodeFromSearch("?ref=bt-7kq4m2"), "BT-7KQ4M2");
  assert.equal(referralCodeFromSearch("?x=1&ref=BT-7KQ4M2"), "BT-7KQ4M2");
  assert.equal(referralCodeFromSearch("?ref=<script>"), null);
  assert.equal(referralCodeFromSearch(""), null);
});

test("referralLink points to sign-up with the code", () => {
  assert.equal(referralLink("https://breadtrans.vn/", "BT-7KQ4M2"), "https://breadtrans.vn/register?ref=BT-7KQ4M2");
});

test("normalizeReferralCode", () => {
  assert.equal(normalizeReferralCode(" bt-7kq 4m2 "), "BT-7KQ4M2");
});
