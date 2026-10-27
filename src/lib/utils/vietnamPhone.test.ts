import test from "node:test";
import assert from "node:assert/strict";

import { isValidVietnamPhone } from "./vietnamPhone.ts";

test("accepts Vietnamese mobile numbers in local and international form", () => {
  for (const phone of ["0987654321", "+84987654321", "84987654321", "0912 345 678", "091-234-5678"]) {
    assert.equal(isValidVietnamPhone(phone), true, phone);
  }
});

test("rejects numbers the server would reject", () => {
  for (const phone of ["", "123", "0123456789", "09876543210", "+1 415 555 0100", "0912abc678"]) {
    assert.equal(isValidVietnamPhone(phone), false, phone);
  }
});
