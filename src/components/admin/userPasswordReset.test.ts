import { test } from "node:test";
import assert from "node:assert/strict";

import { DIRECT_PASSWORD_PAYLOAD, directPasswordProblem, resetLinkNotice } from "./userPasswordReset.ts";

test("each answer of the send-link call has its own message and tone", () => {
  assert.deepEqual(resetLinkNotice("SENT", "a@b.com"), {
    tone: "success",
    text: "Đã gửi email đặt lại mật khẩu tới a@b.com.",
  });
  assert.equal(resetLinkNotice("COOLDOWN", "a@b.com").tone, "warning");
  const test = resetLinkNotice("UNDELIVERABLE", "demo@breadtrans.com");
  assert.equal(test.tone, "warning");
  assert.match(test.text, /demo@breadtrans\.com là địa chỉ thử nghiệm/);
  assert.match(test.text, /Đặt mật khẩu trực tiếp/);
  assert.equal(resetLinkNotice("EMAIL_FAILED", "a@b.com").tone, "error");
});

test("an unknown answer reads as a failure, never as a success", () => {
  assert.equal(resetLinkNotice(undefined, "a@b.com").tone, "error");
  assert.equal(resetLinkNotice("OK", "a@b.com").tone, "error");
});

test("a direct password follows the account policy (8 characters, a capital, a digit, a symbol)", () => {
  assert.equal(directPasswordProblem(""), "Nhập mật khẩu mới.");
  assert.equal(directPasswordProblem("   "), "Nhập mật khẩu mới.");
  assert.match(directPasswordProblem("ngan") ?? "", /đủ 8 ký tự/);
  assert.match(directPasswordProblem("abcdefgh") ?? "", /còn thiếu: chữ hoa, số, ký tự đặc biệt/);
  assert.equal(directPasswordProblem("BanhMi@2026"), null);
});

test("the direct password is sent alone and trimmed", () => {
  assert.deepEqual(DIRECT_PASSWORD_PAYLOAD("  BanhMi@2026 "), {
    password: "BanhMi@2026",
  });
});
