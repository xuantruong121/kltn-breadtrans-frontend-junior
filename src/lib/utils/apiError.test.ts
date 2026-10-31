import assert from "node:assert/strict";
import { test } from "node:test";

import { getApiErrorMessage } from "./apiError.ts";

test("a network failure is not shown as a raw axios message", () => {
  const msg = getApiErrorMessage({ code: "ERR_NETWORK", message: "Network Error" });
  assert.match(msg, /Không thể kết nối/);
});

test("a validation array keeps only its Vietnamese rules", () => {
  const msg = getApiErrorMessage({
    response: {
      status: 400,
      data: { message: ["Email không đúng định dạng.", "password should not be empty"] },
    },
  });
  assert.equal(msg, "Email không đúng định dạng.");
});

test("a validation array with no Vietnamese rule falls back on the status", () => {
  const msg = getApiErrorMessage({
    response: { status: 400, data: { message: ["title should not be empty"] } },
  });
  assert.match(msg, /chưa hợp lệ/);
});

test("a nested message object is read", () => {
  const msg = getApiErrorMessage({
    response: { status: 401, data: { message: { message: "Mật khẩu không chính xác." } } },
  });
  assert.equal(msg, "Mật khẩu không chính xác.");
});

test("a Vietnamese error raised in the browser is kept, an English one is not", () => {
  assert.equal(getApiErrorMessage(new Error("JSON đề thi không hợp lệ."), "x"), "JSON đề thi không hợp lệ.");
  assert.equal(getApiErrorMessage(new Error("Request failed"), "Thử lại."), "Thử lại.");
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
