import { test } from "node:test";
import assert from "node:assert/strict";

import { avatarImageState } from "./avatarFallback.ts";

const GOOGLE = "https://lh3.googleusercontent.com/a/ACg8oc-example=s96-c";

test("a present avatar URL that has not failed shows the image", () => {
  assert.equal(avatarImageState(GOOGLE, null), "image");
  assert.equal(avatarImageState(GOOGLE, "https://other.example/a.png"), "image");
});

test("a missing or blank avatar URL shows the fallback", () => {
  assert.equal(avatarImageState(null, null), "fallback");
  assert.equal(avatarImageState(undefined, null), "fallback");
  assert.equal(avatarImageState("", null), "fallback");
  assert.equal(avatarImageState("   ", null), "fallback");
});

test("an avatar URL that failed to load shows the fallback, not a broken image", () => {
  assert.equal(avatarImageState(GOOGLE, GOOGLE), "fallback");
});

test("a failed URL is not retried; a new URL gets one try", () => {
  // Same URL after its error stays on the fallback (no error/retry loop).
  assert.equal(avatarImageState(GOOGLE, GOOGLE), "fallback");
  // The learner changes avatar: the new URL is tried once.
  assert.equal(avatarImageState("https://cdn.example/new.png", GOOGLE), "image");
});
