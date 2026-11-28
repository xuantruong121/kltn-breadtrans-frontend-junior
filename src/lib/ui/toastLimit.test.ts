import assert from "node:assert/strict";
import { test } from "node:test";
import { TOAST_LIMIT, toastsToDismiss } from "./toastLimit.ts";

const list = (n: number, hidden: number[] = []) =>
  Array.from({ length: n }, (_, i) => ({ id: `t${i + 1}`, visible: !hidden.includes(i + 1) }));

test("four toasts stay; nothing is dismissed up to the limit", () => {
  assert.equal(TOAST_LIMIT, 4);
  assert.deepEqual(toastsToDismiss([]), []);
  assert.deepEqual(toastsToDismiss(list(4)), []);
});

test("the oldest ones past the limit are dismissed, the newest four stay", () => {
  // Newest first: t1 is the newest.
  assert.deepEqual(toastsToDismiss(list(5)), ["t5"]);
  assert.deepEqual(toastsToDismiss(list(7)), ["t5", "t6", "t7"]);
});

test("a toast already fading out is neither counted nor dismissed again", () => {
  // t5 is on its way out: four are still showing, so nothing more goes.
  assert.deepEqual(toastsToDismiss(list(5, [5])), []);
  // t2 fades; t1, t3, t4, t5 show and t6 is pushed out.
  assert.deepEqual(toastsToDismiss(list(6, [2])), ["t6"]);
});

test("another limit can be asked for", () => {
  assert.deepEqual(toastsToDismiss(list(3), 1), ["t2", "t3"]);
  assert.deepEqual(toastsToDismiss(list(2), 0), ["t1", "t2"]);
});
