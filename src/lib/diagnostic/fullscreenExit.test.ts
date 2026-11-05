import assert from "node:assert/strict";
import { test } from "node:test";
import { fullscreenAfterResult } from "./fullscreenExit.ts";

test("the page's own fullscreen is left when the result shows", () => {
  assert.equal(fullscreenAfterResult({ elementFullscreen: true, browserFullscreen: true }), "EXIT");
  assert.equal(fullscreenAfterResult({ elementFullscreen: true, browserFullscreen: false }), "EXIT");
});

test("the browser's own fullscreen (F11) gets a hint, since no page can close it", () => {
  assert.equal(fullscreenAfterResult({ elementFullscreen: false, browserFullscreen: true }), "HINT_F11");
});

test("nothing to do outside fullscreen", () => {
  assert.equal(fullscreenAfterResult({ elementFullscreen: false, browserFullscreen: false }), "NONE");
});
