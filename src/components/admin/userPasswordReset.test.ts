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

test("a direct password follows the account policy of 15 characters", () => {
  assert.equal(directPasswordProblem(""), "Nhập mật khẩu mới.");
  assert.equal(directPasswordProblem("   "), "Nhập mật khẩu mới.");
  assert.match(directPasswordProblem("ngan") ?? "", /ít nhất 15 ký tự/);
  assert.equal(directPasswordProblem("mèo đen thích ăn bánh mì"), null);
});

test("the direct password is sent alone and trimmed", () => {
  assert.deepEqual(DIRECT_PASSWORD_PAYLOAD("  mèo đen thích ăn bánh mì "), {
    password: "mèo đen thích ăn bánh mì",
  });
});
