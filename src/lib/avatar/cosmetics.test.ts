import test from "node:test";
import assert from "node:assert/strict";

import { cosmeticsOf } from "./cosmetics.ts";

test("the worn frame and badge come from the profile; anything else is none", () => {
  assert.deepEqual(cosmeticsOf({ avatarFrame: "frame-crown", badgeKey: "badge-star" }), {
    avatarFrame: "frame-crown",
    badgeKey: "badge-star",
  });
  assert.deepEqual(cosmeticsOf({ avatarFrame: null, badgeKey: "" }), { avatarFrame: null, badgeKey: null });
  assert.deepEqual(cosmeticsOf(undefined), { avatarFrame: null, badgeKey: null });
  assert.deepEqual(cosmeticsOf({ avatarFrame: 7 }), { avatarFrame: null, badgeKey: null });
});
