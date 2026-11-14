import assert from "node:assert/strict";
import test from "node:test";

import { secondsLeft } from "./tokenExpiry.ts";

const jwt = (payload: object) =>
  `h.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.s`;

test("reads how long an access token still lives", () => {
  const now = Date.parse("2026-11-14T10:00:00Z");
  const exp = Math.floor(now / 1000) + 600;
  assert.equal(secondsLeft(jwt({ exp }), now), 600);
  assert.equal(secondsLeft(jwt({ exp: exp - 1200 }), now), 0);
  assert.equal(secondsLeft(jwt({ sub: 1 }), now), 0);
  assert.equal(secondsLeft("not-a-token", now), 0);
  assert.equal(secondsLeft(null, now), 0);
});
