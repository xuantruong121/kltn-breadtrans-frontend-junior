import test from "node:test";
import assert from "node:assert/strict";
import { googleRedirectUrl } from "./googleRedirect.ts";

test("the full-page Google sign-in goes through the API base", () => {
  assert.equal(googleRedirectUrl("/api"), "/api/auth/google");
  assert.equal(googleRedirectUrl("/api/"), "/api/auth/google");
  assert.equal(googleRedirectUrl("http://localhost:3001"), "http://localhost:3001/auth/google");
});
