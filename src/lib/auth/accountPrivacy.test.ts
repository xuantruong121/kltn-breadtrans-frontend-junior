import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ACCOUNT_PENDING_DELETION,
  apiErrorCode,
  canRequestDeletion,
  consentDocumentLabel,
  consentMethodLabel,
  deletionRequestBody,
  formatVnDate,
  needsConsent,
  pendingDeletionOf,
} from "./accountPrivacy.ts";

const axiosError = (data: unknown) => ({ response: { status: 403, data } });

test("reads an API code at the top or inside message", () => {
  assert.equal(apiErrorCode(axiosError({ code: "CONSENT_REQUIRED" })), "CONSENT_REQUIRED");
  assert.equal(
    apiErrorCode(axiosError({ message: { code: "ACCOUNT_LINK_REQUIRED", message: "x" } })),
    "ACCOUNT_LINK_REQUIRED",
  );
  assert.equal(apiErrorCode(axiosError({ message: "Sai mật khẩu" })), null);
  assert.equal(apiErrorCode(new Error("network")), null);
  assert.equal(apiErrorCode(null), null);
});

test("a pending-deletion refusal carries the date and the cancel token", () => {
  const offer = pendingDeletionOf(
    axiosError({
      code: ACCOUNT_PENDING_DELETION,
      message: "Tài khoản đang chờ xoá.",
      scheduledAt: "2026-11-23T10:00:00.000Z",
      cancelToken: "abc",
    }),
  );
  assert.deepEqual(offer, { scheduledAt: "2026-11-23T10:00:00.000Z", cancelToken: "abc" });
  // Without a token there is nothing to offer.
  assert.equal(pendingDeletionOf(axiosError({ code: ACCOUNT_PENDING_DELETION })), null);
  assert.equal(pendingDeletionOf(axiosError({ code: "OTHER", cancelToken: "abc" })), null);
});

test("prints dates in Vietnam time", () => {
  // 17:30 UTC on the 22nd is already the 23rd in Ho Chi Minh City.
  assert.equal(formatVnDate("2026-11-22T17:30:00.000Z"), "23/11/2026");
  assert.equal(formatVnDate(null), "");
  assert.equal(formatVnDate("not a date"), "");
});

test("asks for consent only when the backend says so", () => {
  assert.equal(needsConsent({ consentRequired: true }), true);
  assert.equal(needsConsent({ consentRequired: false }), false);
  assert.equal(needsConsent({}), false);
  assert.equal(needsConsent(null), false);
});

test("the delete button waits for every confirmation", () => {
  const base = {
    hasPassword: true,
    password: "",
    confirmEmail: "",
    accountEmail: "learner@example.com",
    understood: true,
  };
  assert.equal(canRequestDeletion(base), false);
  assert.equal(canRequestDeletion({ ...base, password: "pw" }), true);
  assert.equal(canRequestDeletion({ ...base, password: "pw", understood: false }), false);

  const google = { ...base, hasPassword: false };
  assert.equal(canRequestDeletion({ ...google, confirmEmail: "other@example.com" }), false);
  assert.equal(canRequestDeletion({ ...google, confirmEmail: " Learner@Example.com " }), true);
});

test("sends the password, or the typed e-mail for a Google-only account", () => {
  const base = {
    password: "pw",
    confirmEmail: " learner@example.com ",
    accountEmail: "learner@example.com",
    understood: true,
  };
  assert.deepEqual(deletionRequestBody({ ...base, hasPassword: true }), { password: "pw" });
  assert.deepEqual(deletionRequestBody({ ...base, hasPassword: false }), {
    confirmEmail: "learner@example.com",
  });
});

test("labels consent history in Vietnamese", () => {
  assert.equal(consentDocumentLabel("TERMS"), "Điều khoản sử dụng");
  assert.equal(consentDocumentLabel("PRIVACY"), "Chính sách bảo mật");
  assert.equal(consentMethodLabel("PROMPT"), "Khi được hỏi lại trong ứng dụng");
});
