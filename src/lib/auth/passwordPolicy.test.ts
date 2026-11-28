import assert from "node:assert/strict";
import test from "node:test";

import {
  PASSWORD_HINT,
  PASSWORD_MIN_LENGTH,
  newPasswordProblem,
  passwordMissing,
} from "./passwordPolicy.ts";

test("a new password needs 8 characters, a capital, a digit and a special character (owner 2026-11-28)", () => {
  assert.equal(PASSWORD_MIN_LENGTH, 8);
  const cases: Array<[string, string[]]> = [
    ["Abcdef1!", []],
    ["Password123!", []],
    ["BanhMi@2026", []],
    ["ABCDEFG1!", []], // no lower case is required
    ["Đẹp1234!", []], // a Vietnamese capital counts
    ["Abcdefg1", ["ký tự đặc biệt"]],
    ["Abcdefg!", ["số"]],
    ["abcdefg1!", ["chữ hoa"]],
    ["abcdefgh", ["chữ hoa", "số", "ký tự đặc biệt"]],
    ["Ab1!", ["đủ 8 ký tự"]],
    ["Abcdefg 1", ["ký tự đặc biệt"]], // a space is not special
    ["Mậtkhẩu1", ["ký tự đặc biệt"]], // accented letters are not special
    ["", ["đủ 8 ký tự", "chữ hoa", "số", "ký tự đặc biệt"]],
  ];
  for (const [password, missing] of cases) assert.deepEqual(passwordMissing(password), missing, password);
});

test("symbols such as $ + = ~ count as special, exactly 8 characters pass and 7 do not", () => {
  for (const ch of ["$", "+", "=", "~", "^", "|", "<", "€"]) assert.deepEqual(passwordMissing(`Abcdefg1${ch}`), []);
  assert.equal(newPasswordProblem("Abcde1!x"), null);
  assert.match(newPasswordProblem("Abcd1!x") ?? "", /đủ 8 ký tự/);
});

test("the message names the rule and exactly what is missing, like the API's", () => {
  assert.equal(
    newPasswordProblem("abcdefgh"),
    "Mật khẩu cần ít nhất 8 ký tự, gồm chữ hoa, số và ký tự đặc biệt (còn thiếu: chữ hoa, số, ký tự đặc biệt).",
  );
  assert.equal(
    newPasswordProblem("Abcdefg!"),
    "Mật khẩu cần ít nhất 8 ký tự, gồm chữ hoa, số và ký tự đặc biệt (còn thiếu: số).",
  );
  assert.equal(newPasswordProblem("Password123!"), null);
});

test("at most 128 characters", () => {
  assert.equal(newPasswordProblem(`A1!${"a".repeat(125)}`), null);
  assert.match(newPasswordProblem(`A1!${"a".repeat(126)}`) ?? "", /tối đa 128/);
});

test("the hint states the rule and gives no example password to copy", () => {
  assert.match(PASSWORD_HINT, /Ít nhất 8 ký tự/);
  assert.match(PASSWORD_HINT, /chữ hoa, số và ký tự đặc biệt/);
  assert.match(PASSWORD_HINT, /trình quản lý mật khẩu/);
  // The symbols are a kind of character, not a password: no quoted phrase, no "ví dụ".
  assert.doesNotMatch(PASSWORD_HINT, /["“”'‘’]/);
  assert.doesNotMatch(PASSWORD_HINT, /ví dụ/i);
});
