import assert from "node:assert/strict";
import test from "node:test";

import { PASSWORD_MIN_LENGTH, newPasswordProblem } from "./passwordPolicy.ts";

test("a new password needs at least 15 characters and at most 128", () => {
  assert.equal(PASSWORD_MIN_LENGTH, 15);
  assert.match(newPasswordProblem("a".repeat(14)) ?? "", /ít nhất 15 ký tự/);
  assert.equal(newPasswordProblem("mot cum tu de nho"), null);
  assert.equal(newPasswordProblem("a".repeat(128)), null);
  assert.match(newPasswordProblem("a".repeat(129)) ?? "", /tối đa 128/);
});
