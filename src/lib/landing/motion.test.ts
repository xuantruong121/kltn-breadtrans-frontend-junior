import test from "node:test";
import assert from "node:assert/strict";
import { revealProps } from "./motion.ts";

test("reduced motion renders the final state directly", () => {
  const props = revealProps(true);
  assert.equal(props.initial, false);
  assert.equal(props.whileInView, undefined);
  assert.equal("whileInView" in props, false);
});

test("each later element starts 75ms after the one before", () => {
  const props = revealProps(false, 2);
  assert.deepEqual(props.initial, { opacity: 0, y: 24 });
  assert.deepEqual(props.whileInView, { opacity: 1, y: 0 });
  assert.equal(props.transition?.delay, 0.15);
  assert.equal(revealProps(false).transition?.delay, 0);
  assert.equal(revealProps(false, 3).transition?.delay, 0.225);
});

test("a revealed element runs once and only moves by transform and opacity", () => {
  const props = revealProps(false, 1);
  assert.equal(props.viewport?.once, true);
  for (const state of [props.initial, props.whileInView])
    assert.deepEqual(Object.keys(state || {}).sort(), ["opacity", "y"]);
});
