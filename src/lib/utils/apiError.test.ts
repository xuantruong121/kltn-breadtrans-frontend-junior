import assert from "node:assert/strict";
import { test } from "node:test";

import { getApiErrorMessage } from "./apiError.ts";

test("a network failure is not shown as a raw axios message", () => {
  const msg = getApiErrorMessage({ code: "ERR_NETWORK", message: "Network Error" });
  assert.match(msg, /Không thể kết nối/);
});

test("rate limit, plan refusal and server errors map to Vietnamese", () => {
  assert.match(getApiErrorMessage({ response: { status: 429 } }), /quá nhanh/);
  assert.match(getApiErrorMessage({ response: { status: 403 } }), /không có quyền/);
  assert.match(getApiErrorMessage({ response: { status: 500 } }), /Máy chủ/);
});

test("a backend Vietnamese message is kept; a technical leak is replaced", () => {
  assert.equal(
    getApiErrorMessage({ response: { status: 403, data: { message: "Bài tập này yêu cầu gói PLUS." } } }),
    "Bài tập này yêu cầu gói PLUS.",
  );
  assert.equal(
    getApiErrorMessage(
      { response: { status: 500, data: { message: "PrismaClientKnownRequestError: Unique constraint" } } },
      "Không thể lưu.",
    ),
    "Không thể lưu.",
  );
});

test("an axios status message never reaches the user", () => {
  const msg = getApiErrorMessage({ message: "Request failed with status code 500", response: { status: 500 } });
  assert.doesNotMatch(msg, /Request failed/);
});

test("an English API message is replaced by Vietnamese text for its status", () => {
  assert.match(getApiErrorMessage({ response: { status: 404, data: { message: "Quiz not found" } } }), /Không tìm thấy/);
  assert.match(getApiErrorMessage({ response: { status: 400, data: { message: ["answer must be a string"] } } }), /chưa hợp lệ/);
});
