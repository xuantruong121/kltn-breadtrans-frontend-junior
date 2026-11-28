import assert from "node:assert/strict";
import { test } from "node:test";
import { EDGE_SLACK, fadeMask, scrollEdges } from "./scrollFade.ts";

test("nothing is hidden when the content fits, or overflows by less than the slack", () => {
  assert.deepEqual(scrollEdges(0, 500, 500), { above: false, below: false });
  assert.deepEqual(scrollEdges(0, 500 + EDGE_SLACK, 500), { above: false, below: false });
});

test("the edges with content beyond them are found", () => {
  // 300 px of content past a 500 px window.
  assert.deepEqual(scrollEdges(0, 800, 500), { above: false, below: true });
  assert.deepEqual(scrollEdges(150, 800, 500), { above: true, below: true });
  assert.deepEqual(scrollEdges(300, 800, 500), { above: true, below: false });
  // Within the slack of an edge counts as at it.
  assert.deepEqual(scrollEdges(3, 800, 500), { above: false, below: true });
  assert.deepEqual(scrollEdges(297, 800, 500), { above: true, below: false });
});

test("the mask fades only the edges that hide content", () => {
  assert.equal(fadeMask({ above: false, below: false }), undefined);
  assert.equal(
    fadeMask({ above: false, below: true }),
    "linear-gradient(to bottom, black 0, black calc(100% - 2.5rem), transparent 100%)",
  );
  assert.equal(
    fadeMask({ above: true, below: false }),
    "linear-gradient(to bottom, transparent 0, black 2.5rem, black 100%)",
  );
  assert.equal(
    fadeMask({ above: true, below: true }, "1rem"),
    "linear-gradient(to bottom, transparent 0, black 1rem, black calc(100% - 1rem), transparent 100%)",
  );
});
