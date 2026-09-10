import assert from "node:assert/strict";
import test from "node:test";
import {
  shouldInterceptLinkClick,
  shouldShowPracticeExitConfirmation,
} from "./practiceExitGuardUtils.ts";

const MOCK_LOCATION = {
  origin: "http://localhost:3000",
  pathname: "/practice/quizzes/1",
  search: "",
  href: "http://localhost:3000/practice/quizzes/1",
};

test("Link Interceptor: correctly ignores Ctrl/Cmd-click", () => {
  const result = shouldInterceptLinkClick({
    ctrlKey: true,
    button: 0,
    href: "/practice/listening",
    currentLocation: MOCK_LOCATION,
  });
  assert.equal(result.shouldIntercept, false);
});

test("Link Interceptor: correctly ignores target='_blank'", () => {
  const result = shouldInterceptLinkClick({
    button: 0,
    target: "_blank",
    href: "/terms",
    currentLocation: MOCK_LOCATION,
  });
  assert.equal(result.shouldIntercept, false);
});

test("Link Interceptor: correctly ignores download links", () => {
  const result = shouldInterceptLinkClick({
    button: 0,
    download: true,
    href: "/files/summary.pdf",
    currentLocation: MOCK_LOCATION,
  });
  assert.equal(result.shouldIntercept, false);
});

test("Link Interceptor: correctly ignores hash-only, mailto, tel links", () => {
  assert.equal(
    shouldInterceptLinkClick({
      button: 0,
      href: "#section",
      currentLocation: MOCK_LOCATION,
    }).shouldIntercept,
    false
  );
  assert.equal(
    shouldInterceptLinkClick({
      button: 0,
      href: "mailto:support@breadtrans.com",
      currentLocation: MOCK_LOCATION,
    }).shouldIntercept,
    false
  );
  assert.equal(
    shouldInterceptLinkClick({
      button: 0,
      href: "tel:0123456789",
      currentLocation: MOCK_LOCATION,
    }).shouldIntercept,
    false
  );
});

test("Link Interceptor: ignores same-page navigation clicks", () => {
  const result = shouldInterceptLinkClick({
    button: 0,
    href: "/practice/quizzes/1",
    currentLocation: MOCK_LOCATION,
  });
  assert.equal(result.shouldIntercept, false);
});

test("Link Interceptor: intercepts internal same-origin link when active", () => {
  const result = shouldInterceptLinkClick({
    button: 0,
    href: "/dashboard",
    currentLocation: MOCK_LOCATION,
  });
  assert.equal(result.shouldIntercept, true);
  assert.equal(result.isExternal, false);
  assert.equal(result.destination, "/dashboard");
});

test("Link Interceptor: intercepts external link and flags isExternal: true", () => {
  const result = shouldInterceptLinkClick({
    button: 0,
    href: "https://google.com/search",
    currentLocation: MOCK_LOCATION,
  });
  assert.equal(result.shouldIntercept, true);
  assert.equal(result.isExternal, true);
  assert.equal(result.destination, "https://google.com/search");
});

test("Mandatory Confirmation: required from question 1 before any answer exists", () => {
  const isSuccessfullySubmitted = false;
  const shouldConfirm = shouldShowPracticeExitConfirmation({
    isSuccessfullySubmitted,
    enabled: true,
  });
  assert.equal(shouldConfirm, true);
});

test("Submission Exemption: allows leaving without modal after successful submission", () => {
  const isSuccessfullySubmitted = true;
  const shouldConfirm = shouldShowPracticeExitConfirmation({
    isSuccessfullySubmitted,
    enabled: true,
  });
  assert.equal(shouldConfirm, false);
});

test("Ownership Guard: yields when enabled is false to prevent nested guard conflicts", () => {
  const isSuccessfullySubmitted = false;
  const shouldConfirm = shouldShowPracticeExitConfirmation({
    isSuccessfullySubmitted,
    enabled: false, // E.g., TakeQuizPage yielding to ListeningComprehensionWorkspace
  });
  assert.equal(shouldConfirm, false);
});
