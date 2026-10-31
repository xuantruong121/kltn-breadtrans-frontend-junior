import test from "node:test";
import assert from "node:assert/strict";
import { adminListParams, pageRange } from "./adminList.ts";

test("adminListParams sends only real filters, plus the page", () => {
  assert.deepEqual(
    adminListParams(
      { q: "  họp ", status: "ALL", level: "", sort: "TITLE", mode: undefined },
      2,
      24,
    ),
    { page: 2, pageSize: 24, q: "họp", sort: "TITLE" },
  );
});

test("pageRange describes the rows on screen", () => {
  assert.equal(pageRange(1, 24, 0), "0");
  assert.equal(pageRange(2, 24, 30), "25–30 / 30");
  assert.equal(pageRange(1, 12, 100), "1–12 / 100");
});
